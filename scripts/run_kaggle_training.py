#!/usr/bin/env python3
"""
Push the Kaggle training kernel and automatically retry when Kaggle assigns
an unsupported GPU architecture such as Tesla P100 / sm_60.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path


UNSUPPORTED_GPU_MARKERS = (
    "does not support the assigned GPU",
    "Tesla P100-PCIE-16GB",
    "sm_60",
)

TRAINING_PROGRESS_MARKERS = (
    "Starting training",
    "Tokenizing dataset",
    "trainable params",
)

ACTIVE_KERNEL_STATUSES = (
    "RUNNING",
    "QUEUED",
    "PENDING",
    "PREPARING",
)

TERMINAL_KERNEL_STATUSES = (
    "ERROR",
    "FAILED",
    "COMPLETE",
    "CANCELED",
    "CANCELLED",
    "CANCEL_ACKNOWLEDGED",
    "TERMINATED",
)

PUSH_FAILURE_MARKERS = (
    "maximum weekly gpu quota",
    "kernel push error:",
)


def parse_args() -> tuple[argparse.Namespace, list[str]]:
    parser = argparse.ArgumentParser(description="Push and monitor the Maasai Kaggle training kernel")
    parser.add_argument("--max-attempts", type=int, default=5)
    parser.add_argument("--poll-seconds", type=int, default=25)
    parser.add_argument("--startup-timeout-seconds", type=int, default=420)
    parser.add_argument("--log-dir", default="/tmp/maasai_kaggle_monitor")
    parser.add_argument("--kernel-slug", default="maasai-daily-hf-training")
    parser.add_argument("--no-retry-unsupported-gpu", action="store_true")
    parser.add_argument(
        "--skip-if-running",
        action="store_true",
        help="Return success without pushing a new kernel when an active kernel already exists.",
    )
    return parser.parse_known_args()


def project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def resolve_python(root: Path) -> str:
    venv_python = root / ".venv" / "bin" / "python"
    if venv_python.exists():
        return str(venv_python)
    return sys.executable


def resolve_kaggle_cli(root: Path) -> str:
    venv_cli = root / ".venv" / "bin" / "kaggle"
    if venv_cli.exists():
        return str(venv_cli)
    return "kaggle"


def kaggle_env(root: Path) -> dict[str, str]:
    env = os.environ.copy()
    env["KAGGLE_CONFIG_DIR"] = str(root)
    return env


def load_kaggle_username(root: Path) -> str:
    username = str(os.getenv("KAGGLE_USERNAME", "")).strip()
    if username:
        return username

    with (root / "kaggle.json").open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    username = str(payload.get("username", "")).strip()
    if not username:
        raise RuntimeError("Kaggle username is missing. Set KAGGLE_USERNAME or provide kaggle.json.")
    return username


def run_capture(cmd: list[str], *, cwd: Path, env: dict[str, str], check: bool = True) -> subprocess.CompletedProcess[str]:
    print("+", " ".join(cmd))
    result = subprocess.run(
        cmd,
        cwd=str(cwd),
        env=env,
        text=True,
        capture_output=True,
    )
    if check and result.returncode != 0:
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        raise subprocess.CalledProcessError(result.returncode, cmd, result.stdout, result.stderr)
    return result


def detect_push_failure(push_output: str) -> str | None:
    lowered = push_output.lower()
    if not any(marker in lowered for marker in PUSH_FAILURE_MARKERS):
        return None

    quota_match = re.search(r"Maximum weekly GPU quota[^\n]*", push_output, flags=re.IGNORECASE)
    if quota_match:
        return quota_match.group(0).strip()

    generic_match = re.search(r"Kernel push error:[^\n]*", push_output, flags=re.IGNORECASE)
    if generic_match:
        return generic_match.group(0).strip()

    return "Kaggle kernel push failed."


def parse_kernel_status(text: str) -> str:
    match = re.search(r"KernelWorkerStatus\.([A-Za-z_]+)", text)
    if match:
        return match.group(1).upper()
    for status in (
        "RUNNING",
        "QUEUED",
        "PENDING",
        "PREPARING",
        "ERROR",
        "COMPLETE",
        "CANCELED",
    ):
        if re.search(rf"\b{status}\b", text, flags=re.IGNORECASE):
            return status
    return text.strip().upper()


def fetch_status(
    kaggle_cli: str,
    root: Path,
    env: dict[str, str],
    kernel_ref: str,
    *,
    allow_failure: bool = False,
) -> str:
    result = run_capture(
        [kaggle_cli, "kernels", "status", kernel_ref],
        cwd=root,
        env=env,
        check=not allow_failure,
    )
    if allow_failure and result.returncode != 0:
        return ""
    text = (result.stdout or result.stderr).strip()
    print(text)
    return parse_kernel_status(text)


def fetch_log_text(kaggle_cli: str, root: Path, env: dict[str, str], kernel_ref: str, log_dir: Path, kernel_slug: str) -> str:
    log_dir.mkdir(parents=True, exist_ok=True)
    run_capture(
        [
            kaggle_cli,
            "kernels",
            "output",
            kernel_ref,
            "-p",
            str(log_dir),
            "-o",
            "--file-pattern",
            rf"{kernel_slug}\.log",
        ],
        cwd=root,
        env=env,
        check=False,
    )
    log_path = log_dir / f"{kernel_slug}.log"
    if not log_path.exists():
        return ""
    return log_path.read_text(encoding="utf-8", errors="replace")


def has_any_marker(text: str, markers: tuple[str, ...]) -> bool:
    return any(marker in text for marker in markers)


def wait_for_kernel(
    *,
    kaggle_cli: str,
    root: Path,
    env: dict[str, str],
    kernel_ref: str,
    kernel_slug: str,
    log_dir: Path,
    poll_seconds: int,
    startup_timeout_seconds: int,
) -> tuple[str, str]:
    deadline = time.time() + startup_timeout_seconds
    last_log = ""
    running_streak = 0

    while time.time() < deadline:
        status = fetch_status(kaggle_cli, root, env, kernel_ref)
        log_text = fetch_log_text(kaggle_cli, root, env, kernel_ref, log_dir, kernel_slug)
        if log_text:
            last_log = log_text

        if status == "RUNNING":
            running_streak += 1
        else:
            running_streak = 0

        if status in ACTIVE_KERNEL_STATUSES and has_any_marker(last_log, TRAINING_PROGRESS_MARKERS):
            return "training_started", last_log

        # Some Kaggle runs stream logs slowly. If the kernel is RUNNING for several
        # consecutive polls, treat this as a healthy startup and let freshness checks
        # enforce continued liveness.
        if running_streak >= 3:
            return "running", last_log

        if status in TERMINAL_KERNEL_STATUSES:
            if status == "COMPLETE":
                return "complete", last_log
            if has_any_marker(last_log, UNSUPPORTED_GPU_MARKERS):
                return "unsupported_gpu", last_log
            return "terminal_failure", last_log

        time.sleep(poll_seconds)

    return "timeout", last_log


def ensure_push_flags(extra_args: list[str]) -> list[str]:
    final_args = list(extra_args)
    if "--execute" not in final_args:
        final_args.append("--execute")
    if "--status" not in final_args:
        final_args.append("--status")
    return final_args


def main() -> int:
    args, extra_args = parse_args()
    root = project_root()
    env = kaggle_env(root)
    kaggle_cli = resolve_kaggle_cli(root)
    python_bin = resolve_python(root)
    username = load_kaggle_username(root)
    kernel_ref = f"{username}/{args.kernel_slug}"
    push_args = ensure_push_flags(extra_args)
    if "--kernel-slug" not in push_args:
        push_args.extend(["--kernel-slug", args.kernel_slug])
    monitor_log_dir = Path(args.log_dir)

    if args.skip_if_running:
        current_status = fetch_status(
            kaggle_cli,
            root,
            env,
            kernel_ref,
            allow_failure=True,
        )
        if current_status in ACTIVE_KERNEL_STATUSES:
            print(
                f"Kaggle kernel {kernel_ref} is already active ({current_status}). "
                "Skipping new push to keep a single continuous training stream."
            )
            return 0

    for attempt in range(1, args.max_attempts + 1):
        print(f"=== Kaggle attempt {attempt}/{args.max_attempts} ===")
        push_result = run_capture(
            [python_bin, str(root / "scripts" / "push_kaggle_kernel.py"), *push_args],
            cwd=root,
            env=env,
            check=False,
        )
        if push_result.stdout:
            print(push_result.stdout.strip())
        if push_result.stderr:
            print(push_result.stderr.strip(), file=sys.stderr)
        if push_result.returncode != 0:
            print(
                f"Kaggle kernel push command failed with exit code {push_result.returncode}.",
                file=sys.stderr,
            )
            return 1

        push_failure = detect_push_failure(f"{push_result.stdout}\n{push_result.stderr}")
        if push_failure:
            print(push_failure, file=sys.stderr)
            return 1

        outcome, log_text = wait_for_kernel(
            kaggle_cli=kaggle_cli,
            root=root,
            env=env,
            kernel_ref=kernel_ref,
            kernel_slug=args.kernel_slug,
            log_dir=monitor_log_dir / f"attempt_{attempt}",
            poll_seconds=args.poll_seconds,
            startup_timeout_seconds=args.startup_timeout_seconds,
        )

        if outcome in {"training_started", "running", "complete"}:
            print(f"Kaggle kernel reached state: {outcome}")
            return 0

        if outcome == "unsupported_gpu" and not args.no_retry_unsupported_gpu and attempt < args.max_attempts:
            print("Unsupported Kaggle GPU detected. Retrying with a fresh kernel run.")
            continue

        if log_text:
            print("\n=== Final Kaggle Log Tail ===")
            tail_lines = log_text.splitlines()[-60:]
            print("\n".join(tail_lines))

        if outcome == "unsupported_gpu":
            print("Kaggle kept assigning unsupported GPUs across the allowed attempts.", file=sys.stderr)
        elif outcome == "timeout":
            print("Kaggle kernel did not reach training or terminal failure within the startup timeout.", file=sys.stderr)
        elif outcome == "terminal_failure":
            print("Kaggle kernel reached a terminal failure state before training startup.", file=sys.stderr)
        else:
            print(f"Kaggle kernel ended with outcome: {outcome}", file=sys.stderr)
        return 1

    print("Exhausted all Kaggle attempts without reaching a usable training run.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
