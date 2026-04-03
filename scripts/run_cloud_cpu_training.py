#!/usr/bin/env python3
"""
Run a remote CPU-only training session using the local cloud connection markdown file.

This script:
1. Extracts an ssh config block from `cloud-machine-connection.md`
2. Syncs the minimal training project subset to the remote host
3. Bootstraps a remote venv and installs dependencies
4. Runs a conservative CPU training command remotely
5. Optionally syncs the output adapter artifacts back to the local machine
"""

from __future__ import annotations

import argparse
import os
import shlex
import subprocess
import sys
import tempfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.cloud_cpu import default_host_alias, extract_ssh_config, extract_ssh_password

DEFAULT_MODEL_NAME = os.getenv("TRANSLATION_BASE_MODEL", "google/gemma-4-E4B-it")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Dispatch a CPU training run to the configured cloud machine")
    parser.add_argument("--connection-file", default="cloud-machine-connection.md")
    parser.add_argument("--host", default=None, help="Optional SSH host alias from the connection file")
    parser.add_argument("--remote-workdir", default="/opt/maasai-lang-cpu")
    parser.add_argument("--python-bin", default="python3")
    parser.add_argument("--requirements-file", default="requirements-cloud-cpu.txt")
    parser.add_argument("--model-name", default=DEFAULT_MODEL_NAME)
    parser.add_argument("--train-file", default="data/final_v3/train.jsonl")
    parser.add_argument("--valid-file", default="data/final_v3/valid.jsonl")
    parser.add_argument("--story-seed-file", default="data/raw/maasai_story_generation_seed.jsonl")
    parser.add_argument("--output-dir", default="outputs/maasai-en-mt-qlora-cloud-cpu")
    parser.add_argument("--max-length", type=int, default=256)
    parser.add_argument("--learning-rate", type=float, default=2e-4)
    parser.add_argument("--num-train-epochs", type=float, default=1.0)
    parser.add_argument("--max-steps", type=int, default=120)
    parser.add_argument("--save-steps", type=int, default=60)
    parser.add_argument("--eval-steps", type=int, default=60)
    parser.add_argument("--logging-steps", type=int, default=10)
    parser.add_argument("--save-total-limit", type=int, default=2)
    parser.add_argument("--per-device-train-batch-size", type=int, default=1)
    parser.add_argument("--per-device-eval-batch-size", type=int, default=1)
    parser.add_argument("--gradient-accumulation-steps", type=int, default=16)
    parser.add_argument("--warmup-ratio", type=float, default=0.03)
    parser.add_argument("--weight-decay", type=float, default=0.01)
    parser.add_argument("--lora-r", type=int, default=16)
    parser.add_argument("--lora-alpha", type=int, default=32)
    parser.add_argument("--lora-dropout", type=float, default=0.05)
    parser.add_argument("--max-train-samples", type=int, default=512)
    parser.add_argument("--max-eval-samples", type=int, default=128)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--prepare-only", action="store_true")
    parser.add_argument("--pull-only", action="store_true")
    parser.add_argument("--skip-install", action="store_true")
    parser.add_argument("--skip-sync-back", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def run_cmd(cmd: list[str], *, dry_run: bool = False, cwd: Path | None = None) -> None:
    rendered = " ".join(shlex.quote(part) for part in cmd)
    print(f"$ {rendered}")
    if dry_run:
        return
    subprocess.run(cmd, cwd=cwd, check=True)


def shell_join(parts: list[str]) -> str:
    return " ".join(shlex.quote(part) for part in parts if part)


def write_temp_ssh_config(config_text: str) -> Path:
    handle = tempfile.NamedTemporaryFile("w", prefix="bb-cloud-", suffix=".sshconf", delete=False)
    try:
        handle.write(config_text)
        handle.flush()
    finally:
        handle.close()
    return Path(handle.name)


def write_temp_askpass_script(password: str | None) -> Path | None:
    if not password:
        return None
    handle = tempfile.NamedTemporaryFile("w", prefix="bb-cloud-", suffix=".askpass", delete=False)
    try:
        handle.write("#!/bin/sh\n")
        handle.write(f"printf '%s\\n' {shlex.quote(password)}\n")
        handle.flush()
    finally:
        handle.close()
    path = Path(handle.name)
    path.chmod(0o700)
    return path


def ssh_base(ssh_config: Path, host: str, askpass_script: Path | None = None) -> list[str]:
    if askpass_script is None:
        return ["ssh", "-F", str(ssh_config), host]
    return [
        "env",
        f"SSH_ASKPASS={askpass_script}",
        "SSH_ASKPASS_REQUIRE=force",
        "DISPLAY=localhost:0",
        "setsid",
        "-w",
        "ssh",
        "-o",
        "BatchMode=no",
        "-o",
        "PreferredAuthentications=password,keyboard-interactive,publickey",
        "-o",
        "PasswordAuthentication=yes",
        "-o",
        "KbdInteractiveAuthentication=yes",
        "-o",
        "PubkeyAuthentication=no",
        "-F",
        str(ssh_config),
        host,
    ]


def rsync_base(ssh_config: Path, askpass_script: Path | None = None) -> list[str]:
    if askpass_script is None:
        remote_shell = f"ssh -F {shlex.quote(str(ssh_config))}"
    else:
        remote_shell = (
            "env "
            f"SSH_ASKPASS={shlex.quote(str(askpass_script))} "
            "SSH_ASKPASS_REQUIRE=force "
            "DISPLAY=localhost:0 "
            "setsid -w "
            "ssh "
            "-o BatchMode=no "
            "-o PreferredAuthentications=password,keyboard-interactive,publickey "
            "-o PasswordAuthentication=yes "
            "-o KbdInteractiveAuthentication=yes "
            "-o PubkeyAuthentication=no "
            f"-F {shlex.quote(str(ssh_config))}"
        )
    return ["rsync", "-az", "--relative", "-e", remote_shell]


def sync_project_subset(
    ssh_config: Path,
    host: str,
    remote_workdir: str,
    *,
    askpass_script: Path | None,
    dry_run: bool,
) -> None:
    remote_root = f"{host}:{remote_workdir}/"
    sources = [
        "./.env.example",
        "./requirements.txt",
        "./requirements-cloud-cpu.txt",
        "./README.md",
        "./scripts",
        "./src",
        "./training",
        "./data/final_v3",
        "./data/glossary",
        "./data/raw/maasai_story_generation_seed.jsonl",
    ]
    cmd = rsync_base(ssh_config, askpass_script) + sources + [remote_root]
    run_cmd(cmd, dry_run=dry_run, cwd=PROJECT_ROOT)


def bootstrap_remote_env(
    ssh_config: Path,
    host: str,
    remote_workdir: str,
    python_bin: str,
    requirements_file: str,
    *,
    askpass_script: Path | None,
    dry_run: bool,
) -> None:
    remote_cmd = shell_join(
        [
            "bash",
            "-lc",
            (
                f"set -euo pipefail; mkdir -p {shlex.quote(remote_workdir)}; "
                f"cd {shlex.quote(remote_workdir)}; "
                f"{shlex.quote(python_bin)} -m venv .venv; "
                ". .venv/bin/activate; "
                "python -m pip install --upgrade pip; "
                f"pip install -r {shlex.quote(requirements_file)}"
            ),
        ]
    )
    run_cmd(ssh_base(ssh_config, host, askpass_script) + [remote_cmd], dry_run=dry_run)


def run_remote_training(args: argparse.Namespace, ssh_config: Path, host: str, askpass_script: Path | None) -> None:
    remote_output_dir = f"{args.remote_workdir}/{args.output_dir}"
    train_cmd = [
        "set -euo pipefail",
        f"cd {shlex.quote(args.remote_workdir)}",
        ". .venv/bin/activate",
        "export WANDB_DISABLED=true",
        "export OMP_NUM_THREADS=$(nproc)",
        "export MKL_NUM_THREADS=$(nproc)",
        (
            "python scripts/train_qlora.py "
            f"--model_name {shlex.quote(args.model_name)} "
            f"--train_file {shlex.quote(args.train_file)} "
            f"--valid_file {shlex.quote(args.valid_file)} "
            f"--output_dir {shlex.quote(remote_output_dir)} "
            f"--max_length {args.max_length} "
            f"--learning_rate {args.learning_rate} "
            f"--num_train_epochs {args.num_train_epochs} "
            f"--per_device_train_batch_size {args.per_device_train_batch_size} "
            f"--per_device_eval_batch_size {args.per_device_eval_batch_size} "
            f"--gradient_accumulation_steps {args.gradient_accumulation_steps} "
            f"--warmup_ratio {args.warmup_ratio} "
            f"--weight_decay {args.weight_decay} "
            f"--logging_steps {args.logging_steps} "
            f"--eval_steps {args.eval_steps} "
            f"--save_steps {args.save_steps} "
            f"--save_total_limit {args.save_total_limit} "
            f"--max_steps {args.max_steps} "
            f"--lora_r {args.lora_r} "
            f"--lora_alpha {args.lora_alpha} "
            f"--lora_dropout {args.lora_dropout} "
            f"--max_train_samples {args.max_train_samples} "
            f"--max_eval_samples {args.max_eval_samples} "
            f"--seed {args.seed} "
            f"--story_seed_file {shlex.quote(args.story_seed_file)}"
        ),
    ]
    remote_cmd = shell_join(["bash", "-lc", "; ".join(train_cmd)])
    run_cmd(ssh_base(ssh_config, host, askpass_script) + [remote_cmd], dry_run=args.dry_run)


def sync_outputs_back(args: argparse.Namespace, ssh_config: Path, host: str, askpass_script: Path | None) -> None:
    local_output_dir = PROJECT_ROOT / args.output_dir
    local_output_dir.parent.mkdir(parents=True, exist_ok=True)
    remote_output_dir = f"{host}:{args.remote_workdir}/{args.output_dir}/"
    cmd = rsync_base(ssh_config, askpass_script) + [remote_output_dir, str(local_output_dir) + "/"]
    run_cmd(cmd, dry_run=args.dry_run)


def main() -> int:
    args = parse_args()
    connection_path = (PROJECT_ROOT / args.connection_file).resolve()
    connection_markdown = connection_path.read_text(encoding="utf-8")
    ssh_config_text = extract_ssh_config(connection_markdown)
    host = args.host or default_host_alias(ssh_config_text)
    password = extract_ssh_password(connection_markdown)
    ssh_config = write_temp_ssh_config(ssh_config_text)
    askpass_script = write_temp_askpass_script(password)
    try:
        try:
            print(f"Using connection file: {connection_path}")
            print(f"Resolved SSH host alias: {host}")
            print(f"Remote workdir: {args.remote_workdir}")
            print(f"Remote model base: {args.model_name}")
            print(f"Remote requirements file: {args.requirements_file}")
            print(
                "CPU profile: this path is intended for conservative adapter training and smoke runs. "
                "For full-scale Gemma retraining, GPU backends remain the recommended path."
            )

            if not args.pull_only:
                run_cmd(
                    ssh_base(ssh_config, host, askpass_script) + ["bash -lc " + shlex.quote(f"mkdir -p {args.remote_workdir}")],
                    dry_run=args.dry_run,
                )
                sync_project_subset(
                    ssh_config,
                    host,
                    args.remote_workdir,
                    askpass_script=askpass_script,
                    dry_run=args.dry_run,
                )
                if not args.skip_install:
                    bootstrap_remote_env(
                        ssh_config,
                        host,
                        args.remote_workdir,
                        args.python_bin,
                        args.requirements_file,
                        askpass_script=askpass_script,
                        dry_run=args.dry_run,
                    )

            if not args.prepare_only and not args.pull_only:
                run_remote_training(args, ssh_config, host, askpass_script)

            if not args.skip_sync_back and (args.pull_only or not args.prepare_only):
                sync_outputs_back(args, ssh_config, host, askpass_script)

            return 0
        except subprocess.CalledProcessError as exc:
            print(
                f"Remote command failed for host {host} (exit={exc.returncode}). "
                "SSH authentication or remote command execution is not currently succeeding.",
                file=sys.stderr,
            )
            return exc.returncode or 1
    finally:
        ssh_config.unlink(missing_ok=True)
        if askpass_script is not None:
            askpass_script.unlink(missing_ok=True)


if __name__ == "__main__":
    raise SystemExit(main())
