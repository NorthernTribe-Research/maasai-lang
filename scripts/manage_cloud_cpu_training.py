#!/usr/bin/env python3
"""
Install and manage persistent cloud CPU training on the remote machine.
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

from src.cloud_cpu import (
    CloudTrainingConfig,
    build_cloud_env_file,
    build_cloud_launcher_script,
    build_cron_block,
    build_systemd_service,
    build_systemd_timer,
    default_host_alias,
    extract_ssh_config,
    extract_ssh_password,
    load_ssh_config_from_markdown,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Manage persistent remote cloud CPU training")
    subparsers = parser.add_subparsers(dest="action", required=True)

    def add_common(subparser: argparse.ArgumentParser) -> None:
        subparser.add_argument("--connection-file", default="cloud-machine-connection.md")
        subparser.add_argument("--host", default=None)
        subparser.add_argument("--remote-workdir", default="/opt/maasai-lang-cpu")
        subparser.add_argument("--python-bin", default="python3")

    install = subparsers.add_parser("install", help="Sync code and install persistent training")
    add_common(install)
    install.add_argument("--requirements-file", default="requirements-cloud-cpu.txt")
    install.add_argument("--timer-minutes", type=int, default=45)
    install.add_argument("--hf-token", default=os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN") or os.getenv("HF_API_KEY"))
    install.add_argument("--wandb-api-key", default=os.getenv("WANDB_API_KEY"))
    install.add_argument("--dataset-repo", default=os.getenv("HF_DATASET_REPO", "NorthernTribe-Research/maasai-translation-corpus"))
    install.add_argument("--model-repo", default=os.getenv("HF_MODEL_REPO", "NorthernTribe-Research/maasai-en-mt-staging"))
    install.add_argument("--model-name", default=os.getenv("HF_BASE_MODEL", "google/gemma-4-E4B-it"))
    install.add_argument("--bucket-uri", default=os.getenv("HF_BUCKET_URI", ""))
    install.add_argument("--report-to", default="auto", choices=["auto", "none", "wandb"])
    install.add_argument("--private-model-repo", action="store_true")
    install.add_argument("--max-length", type=int, default=256)
    install.add_argument("--max-steps", type=int, default=120)
    install.add_argument("--save-steps", type=int, default=60)
    install.add_argument("--eval-steps", type=int, default=60)
    install.add_argument("--logging-steps", type=int, default=10)
    install.add_argument("--per-device-train-batch-size", type=int, default=1)
    install.add_argument("--per-device-eval-batch-size", type=int, default=1)
    install.add_argument("--gradient-accumulation-steps", type=int, default=16)
    install.add_argument("--warmup-ratio", type=float, default=0.03)
    install.add_argument("--weight-decay", type=float, default=0.01)
    install.add_argument("--lora-r", type=int, default=16)
    install.add_argument("--lora-alpha", type=int, default=32)
    install.add_argument("--lora-dropout", type=float, default=0.05)
    install.add_argument("--augment-with-generation-tasks", action="store_true")
    install.add_argument("--story-seed-file", default="data/raw/maasai_story_generation_seed.jsonl")
    install.add_argument("--max-bible-passages", type=int, default=48)
    install.add_argument("--bible-passage-window", type=int, default=3)
    install.add_argument("--skip-install", action="store_true")
    install.add_argument("--dry-run", action="store_true")

    for action in ("status", "stop", "start", "logs", "sync"):
        subparser = subparsers.add_parser(action, help=f"{action.capitalize()} the remote cloud trainer")
        add_common(subparser)
        if action == "logs":
            subparser.add_argument("--lines", type=int, default=80)
        if action in {"status", "stop", "start", "sync"}:
            subparser.add_argument("--dry-run", action="store_true")

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
        "./requirements-cloud-cpu.txt",
        "./scripts",
        "./src",
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


def build_training_config(args: argparse.Namespace) -> CloudTrainingConfig:
    report_to = args.report_to
    if report_to == "auto":
        report_to = "wandb" if args.wandb_api_key else "none"
    return CloudTrainingConfig(
        dataset_repo=args.dataset_repo,
        model_repo=args.model_repo,
        model_name=args.model_name,
        bucket_uri=args.bucket_uri,
        report_to=report_to,
        private_model_repo=args.private_model_repo,
        max_length=args.max_length,
        max_steps=args.max_steps,
        save_steps=args.save_steps,
        eval_steps=args.eval_steps,
        logging_steps=args.logging_steps,
        per_device_train_batch_size=args.per_device_train_batch_size,
        per_device_eval_batch_size=args.per_device_eval_batch_size,
        gradient_accumulation_steps=args.gradient_accumulation_steps,
        warmup_ratio=args.warmup_ratio,
        weight_decay=args.weight_decay,
        lora_r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        augment_with_generation_tasks=args.augment_with_generation_tasks,
        story_seed_file=args.story_seed_file,
        max_bible_passages=args.max_bible_passages,
        bible_passage_window=args.bible_passage_window,
    )


def upload_control_files(
    ssh_config: Path,
    host: str,
    remote_workdir: str,
    *,
    config: CloudTrainingConfig,
    hf_token: str,
    wandb_api_key: str | None,
    timer_minutes: int,
    askpass_script: Path | None,
    dry_run: bool,
) -> None:
    runtime_root = f"{remote_workdir}/runtime"
    ops_root = f"{remote_workdir}/ops"
    env_text = build_cloud_env_file(
        config,
        hf_token=hf_token,
        runtime_root=runtime_root,
        wandb_api_key=wandb_api_key,
    )
    launcher_text = build_cloud_launcher_script(
        remote_workdir=remote_workdir,
        env_file=f"{runtime_root}/cloud-training.env",
        log_file=f"{runtime_root}/logs/cloud-train.log",
    )
    service_text = build_systemd_service(
        description="Maasai cloud CPU training cycle",
        working_directory=remote_workdir,
        launcher_path=f"{ops_root}/maasai-cloud-train-launch.sh",
    )
    timer_text = build_systemd_timer(
        description="Recurring Maasai cloud CPU training timer",
        service_name="maasai-cloud-train.service",
        interval_minutes=timer_minutes,
    )
    cron_text = build_cron_block(
        launcher_path=f"{ops_root}/maasai-cloud-train-launch.sh",
        interval_minutes=timer_minutes,
    )

    upload_remote_text_file(
        ssh_config,
        host,
        f"{runtime_root}/cloud-training.env",
        env_text,
        mode=0o600,
        askpass_script=askpass_script,
        dry_run=dry_run,
        redact_contents=True,
    )

    with tempfile.TemporaryDirectory(prefix="cloud-train-") as tmpdir:
        tmp = Path(tmpdir)
        ops_dir = tmp / "ops"
        ops_dir.mkdir(parents=True, exist_ok=True)
        launcher_path = ops_dir / "maasai-cloud-train-launch.sh"
        launcher_path.write_text(launcher_text, encoding="utf-8")
        service_path = ops_dir / "maasai-cloud-train.service"
        service_path.write_text(service_text, encoding="utf-8")
        timer_path = ops_dir / "maasai-cloud-train.timer"
        timer_path.write_text(timer_text, encoding="utf-8")
        cron_path = ops_dir / "maasai-cloud-train.cron"
        cron_path.write_text(cron_text, encoding="utf-8")

        run_cmd(
            rsync_base(ssh_config, askpass_script)
            + [
                "./ops/maasai-cloud-train-launch.sh",
                "./ops/maasai-cloud-train.service",
                "./ops/maasai-cloud-train.timer",
                "./ops/maasai-cloud-train.cron",
                f"{host}:{remote_workdir}/",
            ],
            dry_run=dry_run,
            cwd=tmp,
        )

    remote_script = f"""
set -euo pipefail
mkdir -p {shlex.quote(runtime_root)}/logs {shlex.quote(runtime_root)}/state {shlex.quote(ops_root)}
chmod 600 {shlex.quote(runtime_root)}/cloud-training.env
chmod 750 {shlex.quote(ops_root)}/maasai-cloud-train-launch.sh
if command -v systemctl >/dev/null 2>&1 && [ "$(id -u)" -eq 0 ]; then
  cp {shlex.quote(ops_root)}/maasai-cloud-train.service /etc/systemd/system/maasai-cloud-train.service
  cp {shlex.quote(ops_root)}/maasai-cloud-train.timer /etc/systemd/system/maasai-cloud-train.timer
  systemctl daemon-reload
  systemctl enable --now maasai-cloud-train.timer
  systemctl start maasai-cloud-train.service || true
  printf '%s\\n' systemd > {shlex.quote(ops_root)}/install-mode.txt
else
  tmp_cron="$(mktemp)"
  (crontab -l 2>/dev/null || true) | awk '
    BEGIN {{ skip=0 }}
    /^# BEGIN maasai-cloud-train$/ {{ skip=1; next }}
    /^# END maasai-cloud-train$/ {{ skip=0; next }}
    skip == 0 {{ print }}
  ' > "$tmp_cron"
  cat {shlex.quote(ops_root)}/maasai-cloud-train.cron >> "$tmp_cron"
  crontab "$tmp_cron"
  rm -f "$tmp_cron"
  {shlex.quote(ops_root)}/maasai-cloud-train-launch.sh || true
  printf '%s\\n' cron > {shlex.quote(ops_root)}/install-mode.txt
fi
"""
    remote_shell(ssh_config, host, remote_script, askpass_script=askpass_script, dry_run=dry_run)


def upload_remote_text_file(
    ssh_config: Path,
    host: str,
    remote_path: str,
    content: str,
    *,
    mode: int,
    askpass_script: Path | None,
    dry_run: bool,
    redact_contents: bool = False,
) -> None:
    parent_dir = str(Path(remote_path).parent)
    remote_cmd = (
        "set -euo pipefail; "
        f"mkdir -p {shlex.quote(parent_dir)}; "
        f"cat > {shlex.quote(remote_path)}; "
        f"chmod {mode:o} {shlex.quote(remote_path)}"
    )
    cmd = ssh_base(ssh_config, host, askpass_script) + ["bash", "-lc", remote_cmd]
    rendered = " ".join(shlex.quote(part) for part in cmd)
    print(f"$ {rendered}")
    if dry_run:
        print(f"# upload -> {remote_path} (content omitted)")
        return
    subprocess.run(
        cmd,
        input=content,
        text=True,
        check=True,
    )


def remote_shell(
    ssh_config: Path,
    host: str,
    script_text: str,
    *,
    askpass_script: Path | None,
    dry_run: bool,
) -> None:
    rendered = " ".join(shlex.quote(part) for part in (ssh_base(ssh_config, host, askpass_script) + ["bash -s"]))
    print(f"$ {rendered}")
    if dry_run:
        print(script_text.strip())
        return
    subprocess.run(
        ssh_base(ssh_config, host, askpass_script) + ["bash -s"],
        input=script_text,
        text=True,
        check=True,
    )


def install(args: argparse.Namespace, ssh_config: Path, host: str, askpass_script: Path | None) -> None:
    if not args.hf_token:
        raise RuntimeError("HF_TOKEN (or --hf-token) is required to install persistent cloud training.")

    config = build_training_config(args)
    print(f"Installing persistent cloud training on host: {host}")
    print(f"Remote workdir: {args.remote_workdir}")
    print(f"Model repo: {config.model_repo}")
    print(f"Dataset repo: {config.dataset_repo}")
    print(f"Base model: {config.model_name}")
    print(f"Timer cadence: every {args.timer_minutes} minutes")

    remote_prep = (
        f"set -euo pipefail; mkdir -p {shlex.quote(args.remote_workdir)}/runtime/logs "
        f"{shlex.quote(args.remote_workdir)}/runtime/state {shlex.quote(args.remote_workdir)}/ops"
    )
    run_cmd(ssh_base(ssh_config, host, askpass_script) + ["bash -lc " + shlex.quote(remote_prep)], dry_run=args.dry_run)
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
    upload_control_files(
        ssh_config,
        host,
        args.remote_workdir,
        config=config,
        hf_token=args.hf_token,
        wandb_api_key=args.wandb_api_key,
        timer_minutes=args.timer_minutes,
        askpass_script=askpass_script,
        dry_run=args.dry_run,
    )
    status_args = argparse.Namespace(
        remote_workdir=args.remote_workdir,
        dry_run=args.dry_run,
    )
    show_status(status_args, ssh_config, host, askpass_script)


def show_status(args: argparse.Namespace, ssh_config: Path, host: str, askpass_script: Path | None) -> None:
    script = f"""
set -euo pipefail
MODE_FILE={shlex.quote(args.remote_workdir)}/ops/install-mode.txt
if [ -f "$MODE_FILE" ]; then
  echo "mode=$(cat "$MODE_FILE")"
else
  echo "mode=unknown"
fi
if [ -f {shlex.quote(args.remote_workdir)}/runtime/state/cloud-train-heartbeat.json ]; then
  echo "--- heartbeat ---"
  cat {shlex.quote(args.remote_workdir)}/runtime/state/cloud-train-heartbeat.json
fi
if command -v systemctl >/dev/null 2>&1 && [ -f /etc/systemd/system/maasai-cloud-train.timer ]; then
  echo "--- systemd timer ---"
  systemctl status maasai-cloud-train.timer --no-pager || true
  echo "--- systemd service ---"
  systemctl status maasai-cloud-train.service --no-pager || true
else
  echo "--- crontab ---"
  crontab -l 2>/dev/null | awk '
    BEGIN {{ show=0 }}
    /^# BEGIN maasai-cloud-train$/ {{ show=1 }}
    show == 1 {{ print }}
    /^# END maasai-cloud-train$/ {{ show=0 }}
  ' || true
fi
"""
    remote_shell(ssh_config, host, script, askpass_script=askpass_script, dry_run=args.dry_run)


def start(args: argparse.Namespace, ssh_config: Path, host: str, askpass_script: Path | None) -> None:
    script = f"""
set -euo pipefail
if command -v systemctl >/dev/null 2>&1 && [ -f /etc/systemd/system/maasai-cloud-train.timer ]; then
  systemctl enable --now maasai-cloud-train.timer
  systemctl start maasai-cloud-train.service || true
else
  {shlex.quote(args.remote_workdir)}/ops/maasai-cloud-train-launch.sh || true
fi
"""
    remote_shell(ssh_config, host, script, askpass_script=askpass_script, dry_run=args.dry_run)


def stop(args: argparse.Namespace, ssh_config: Path, host: str, askpass_script: Path | None) -> None:
    script = f"""
set -euo pipefail
if command -v systemctl >/dev/null 2>&1 && [ -f /etc/systemd/system/maasai-cloud-train.timer ]; then
  systemctl disable --now maasai-cloud-train.timer || true
  systemctl stop maasai-cloud-train.service || true
fi
tmp_cron="$(mktemp)"
(crontab -l 2>/dev/null || true) | awk '
  BEGIN {{ skip=0 }}
  /^# BEGIN maasai-cloud-train$/ {{ skip=1; next }}
  /^# END maasai-cloud-train$/ {{ skip=0; next }}
  skip == 0 {{ print }}
' > "$tmp_cron"
crontab "$tmp_cron" || true
rm -f "$tmp_cron"
"""
    remote_shell(ssh_config, host, script, askpass_script=askpass_script, dry_run=args.dry_run)


def show_logs(args: argparse.Namespace, ssh_config: Path, host: str, askpass_script: Path | None) -> None:
    cmd = ssh_base(ssh_config, host, askpass_script) + [
        "bash",
        "-lc",
        f"tail -n {int(args.lines)} {shlex.quote(args.remote_workdir)}/runtime/logs/cloud-train.log",
    ]
    run_cmd(cmd, dry_run=False)


def sync(args: argparse.Namespace, ssh_config: Path, host: str, askpass_script: Path | None) -> None:
    print(f"Resyncing project subset to host: {host}")
    sync_project_subset(
        ssh_config,
        host,
        args.remote_workdir,
        askpass_script=askpass_script,
        dry_run=args.dry_run,
    )


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
            if args.action == "install":
                install(args, ssh_config, host, askpass_script)
            elif args.action == "status":
                show_status(args, ssh_config, host, askpass_script)
            elif args.action == "stop":
                stop(args, ssh_config, host, askpass_script)
            elif args.action == "start":
                start(args, ssh_config, host, askpass_script)
            elif args.action == "logs":
                show_logs(args, ssh_config, host, askpass_script)
            elif args.action == "sync":
                sync(args, ssh_config, host, askpass_script)
            else:
                raise ValueError(f"Unsupported action: {args.action}")
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
