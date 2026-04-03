"""
Helpers for remote CPU training orchestration using a local markdown-held SSH config.
"""

from __future__ import annotations

import os
import re
import shlex
import sys
from dataclasses import dataclass
from pathlib import Path


SSHCONFIG_BLOCK_RE = re.compile(r"```sshconfig\s*(.*?)```", re.DOTALL | re.IGNORECASE)
HOST_ALIAS_RE = re.compile(r"^\s*Host\s+([^\s]+)", re.MULTILINE)
PASSWORD_RE = re.compile(
    r"^\s*#*\s*[^#\n]*password[^:=]*[:=]\s*(.+?)\s*$",
    re.MULTILINE | re.IGNORECASE,
)

DEFAULT_DATASET_REPO = "NorthernTribe-Research/maasai-translation-corpus"
DEFAULT_MODEL_REPO = "NorthernTribe-Research/maasai-en-mt-staging"
DEFAULT_MODEL_NAME = "google/gemma-4-E4B-it"
DEFAULT_STORY_SEED_FILE = "data/raw/maasai_story_generation_seed.jsonl"


def extract_ssh_config(markdown_text: str) -> str:
    """Extract the fenced sshconfig block from a markdown file."""
    match = SSHCONFIG_BLOCK_RE.search(markdown_text)
    if not match:
        raise ValueError("No ```sshconfig``` block found in the cloud connection file.")
    config = match.group(1).strip()
    if not HOST_ALIAS_RE.search(config):
        raise ValueError("The sshconfig block does not define any Host entries.")
    return config + "\n"


def load_ssh_config_from_markdown(path: str | Path) -> str:
    """Read a markdown file and extract the SSH config payload."""
    return extract_ssh_config(Path(path).read_text(encoding="utf-8"))


def default_host_alias(ssh_config_text: str) -> str:
    """Return the first configured SSH host alias."""
    match = HOST_ALIAS_RE.search(ssh_config_text)
    if not match:
        raise ValueError("No SSH host alias found in extracted config.")
    return match.group(1).strip()


def extract_ssh_password(markdown_text: str) -> str | None:
    """Extract an optional password line from the cloud connection markdown."""
    match = PASSWORD_RE.search(markdown_text)
    if not match:
        return None
    raw = match.group(1).strip().strip("`").strip()
    return raw or None


def parse_env_flag(raw: str | None, *, default: bool = False) -> bool:
    """Parse common truthy/falsey environment-variable values."""
    if raw is None:
        return default
    normalized = raw.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default


def shell_quote_env_value(value: str) -> str:
    """Quote a value so it is safe inside an env file sourced by bash."""
    return shlex.quote(str(value))


@dataclass(frozen=True)
class CloudTrainingConfig:
    """Configuration for continuous CPU training cycles."""

    dataset_repo: str = DEFAULT_DATASET_REPO
    model_repo: str = DEFAULT_MODEL_REPO
    model_name: str = DEFAULT_MODEL_NAME
    bucket_uri: str = ""
    report_to: str = "none"
    private_model_repo: bool = False
    max_length: int = 256
    max_steps: int = 120
    save_steps: int = 60
    eval_steps: int = 60
    logging_steps: int = 10
    per_device_train_batch_size: int = 1
    per_device_eval_batch_size: int = 1
    gradient_accumulation_steps: int = 16
    warmup_ratio: float = 0.03
    weight_decay: float = 0.01
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    augment_with_generation_tasks: bool = False
    story_seed_file: str = DEFAULT_STORY_SEED_FILE
    max_bible_passages: int = 48
    bible_passage_window: int = 3

    @classmethod
    def from_env(cls) -> "CloudTrainingConfig":
        """Load cloud training configuration from environment variables."""
        report_to = os.getenv("CLOUD_REPORT_TO", "").strip() or "none"
        if report_to == "auto":
            report_to = "wandb" if os.getenv("WANDB_API_KEY") else "none"

        return cls(
            dataset_repo=os.getenv("HF_DATASET_REPO", DEFAULT_DATASET_REPO),
            model_repo=os.getenv("HF_MODEL_REPO", DEFAULT_MODEL_REPO),
            model_name=os.getenv("HF_BASE_MODEL", DEFAULT_MODEL_NAME),
            bucket_uri=os.getenv("HF_BUCKET_URI", "").strip(),
            report_to=report_to,
            private_model_repo=parse_env_flag(os.getenv("CLOUD_PRIVATE_MODEL_REPO"), default=False),
            max_length=int(os.getenv("CLOUD_MAX_LENGTH", "256")),
            max_steps=int(os.getenv("CLOUD_MAX_STEPS", "120")),
            save_steps=int(os.getenv("CLOUD_SAVE_STEPS", "60")),
            eval_steps=int(os.getenv("CLOUD_EVAL_STEPS", os.getenv("CLOUD_SAVE_STEPS", "60"))),
            logging_steps=int(os.getenv("CLOUD_LOGGING_STEPS", "10")),
            per_device_train_batch_size=int(os.getenv("CLOUD_TRAIN_BATCH_SIZE", "1")),
            per_device_eval_batch_size=int(os.getenv("CLOUD_EVAL_BATCH_SIZE", "1")),
            gradient_accumulation_steps=int(os.getenv("CLOUD_GRADIENT_ACCUMULATION_STEPS", "16")),
            warmup_ratio=float(os.getenv("CLOUD_WARMUP_RATIO", "0.03")),
            weight_decay=float(os.getenv("CLOUD_WEIGHT_DECAY", "0.01")),
            lora_r=int(os.getenv("CLOUD_LORA_R", "16")),
            lora_alpha=int(os.getenv("CLOUD_LORA_ALPHA", "32")),
            lora_dropout=float(os.getenv("CLOUD_LORA_DROPOUT", "0.05")),
            augment_with_generation_tasks=parse_env_flag(
                os.getenv("CLOUD_AUGMENT_WITH_GENERATION_TASKS"),
                default=False,
            ),
            story_seed_file=os.getenv("CLOUD_STORY_SEED_FILE", DEFAULT_STORY_SEED_FILE),
            max_bible_passages=int(os.getenv("CLOUD_MAX_BIBLE_PASSAGES", "48")),
            bible_passage_window=int(os.getenv("CLOUD_BIBLE_PASSAGE_WINDOW", "3")),
        )


def build_cycle_command(
    config: CloudTrainingConfig,
    *,
    project_root: Path,
    runtime_root: Path,
    python_executable: str | None = None,
) -> list[str]:
    """Build the train_daily_from_hf command for one remote cloud cycle."""
    story_seed_file = Path(config.story_seed_file)
    if not story_seed_file.is_absolute():
        story_seed_file = project_root / story_seed_file

    work_dir = runtime_root / "daily"
    cmd = [
        python_executable or sys.executable,
        str(project_root / "scripts" / "train_daily_from_hf.py"),
        "--dataset-repo",
        config.dataset_repo,
        "--model-repo",
        config.model_repo,
        "--model-name",
        config.model_name,
        "--work-dir",
        str(work_dir),
        "--max-length",
        str(config.max_length),
        "--max-steps",
        str(config.max_steps),
        "--save-steps",
        str(config.save_steps),
        "--eval-steps",
        str(config.eval_steps),
        "--logging-steps",
        str(config.logging_steps),
        "--per-device-train-batch-size",
        str(config.per_device_train_batch_size),
        "--per-device-eval-batch-size",
        str(config.per_device_eval_batch_size),
        "--gradient-accumulation-steps",
        str(config.gradient_accumulation_steps),
        "--warmup-ratio",
        str(config.warmup_ratio),
        "--weight-decay",
        str(config.weight_decay),
        "--lora-r",
        str(config.lora_r),
        "--lora-alpha",
        str(config.lora_alpha),
        "--lora-dropout",
        str(config.lora_dropout),
        "--hub-strategy",
        "checkpoint",
        "--report-to",
        config.report_to,
        "--bucket-uri",
        config.bucket_uri,
        "--story-seed-file",
        str(story_seed_file),
        "--max-bible-passages",
        str(config.max_bible_passages),
        "--bible-passage-window",
        str(config.bible_passage_window),
    ]
    if config.private_model_repo:
        cmd.append("--private-model-repo")
    if config.augment_with_generation_tasks:
        cmd.append("--augment-with-generation-tasks")
    else:
        cmd.append("--no-augment-with-generation-tasks")
    return cmd


def build_cloud_env_file(
    config: CloudTrainingConfig,
    *,
    hf_token: str,
    runtime_root: str,
    wandb_api_key: str | None = None,
) -> str:
    """Render the remote env file for the persistent cloud training service."""
    lines = [
        f"HF_TOKEN={shell_quote_env_value(hf_token)}",
        f"HF_DATASET_REPO={shell_quote_env_value(config.dataset_repo)}",
        f"HF_MODEL_REPO={shell_quote_env_value(config.model_repo)}",
        f"HF_BASE_MODEL={shell_quote_env_value(config.model_name)}",
        f"HF_BUCKET_URI={shell_quote_env_value(config.bucket_uri)}",
        f"CLOUD_REPORT_TO={shell_quote_env_value(config.report_to)}",
        f"CLOUD_PRIVATE_MODEL_REPO={'true' if config.private_model_repo else 'false'}",
        f"CLOUD_MAX_LENGTH={config.max_length}",
        f"CLOUD_MAX_STEPS={config.max_steps}",
        f"CLOUD_SAVE_STEPS={config.save_steps}",
        f"CLOUD_EVAL_STEPS={config.eval_steps}",
        f"CLOUD_LOGGING_STEPS={config.logging_steps}",
        f"CLOUD_TRAIN_BATCH_SIZE={config.per_device_train_batch_size}",
        f"CLOUD_EVAL_BATCH_SIZE={config.per_device_eval_batch_size}",
        f"CLOUD_GRADIENT_ACCUMULATION_STEPS={config.gradient_accumulation_steps}",
        f"CLOUD_WARMUP_RATIO={config.warmup_ratio}",
        f"CLOUD_WEIGHT_DECAY={config.weight_decay}",
        f"CLOUD_LORA_R={config.lora_r}",
        f"CLOUD_LORA_ALPHA={config.lora_alpha}",
        f"CLOUD_LORA_DROPOUT={config.lora_dropout}",
        f"CLOUD_AUGMENT_WITH_GENERATION_TASKS={'true' if config.augment_with_generation_tasks else 'false'}",
        f"CLOUD_STORY_SEED_FILE={shell_quote_env_value(config.story_seed_file)}",
        f"CLOUD_MAX_BIBLE_PASSAGES={config.max_bible_passages}",
        f"CLOUD_BIBLE_PASSAGE_WINDOW={config.bible_passage_window}",
        f"CLOUD_TRAIN_RUNTIME_ROOT={shell_quote_env_value(runtime_root)}",
        "HF_HUB_DISABLE_TELEMETRY=1",
        "PYTHONUNBUFFERED=1",
    ]
    if wandb_api_key:
        lines.append(f"WANDB_API_KEY={shell_quote_env_value(wandb_api_key)}")
    else:
        lines.append("WANDB_DISABLED=true")
    return "\n".join(lines) + "\n"


def build_cloud_launcher_script(
    *,
    remote_workdir: str,
    env_file: str,
    log_file: str,
) -> str:
    """Build the remote launch wrapper used by systemd or cron."""
    return (
        "#!/usr/bin/env bash\n"
        "set -euo pipefail\n"
        f'ROOT_DIR={shell_quote_env_value(remote_workdir)}\n'
        f'ENV_FILE={shell_quote_env_value(env_file)}\n'
        f'LOG_FILE={shell_quote_env_value(log_file)}\n'
        'mkdir -p "$(dirname "$LOG_FILE")"\n'
        'if [ ! -f "$ENV_FILE" ]; then\n'
        '  echo "Missing env file: $ENV_FILE" >&2\n'
        "  exit 1\n"
        "fi\n"
        "set -a\n"
        '. "$ENV_FILE"\n'
        "set +a\n"
        'cd "$ROOT_DIR"\n'
        'echo "[$(date -Iseconds)] starting cloud training cycle" >> "$LOG_FILE"\n'
        'exec "$ROOT_DIR/.venv/bin/python" "$ROOT_DIR/scripts/run_cloud_train_cycle.py" >> "$LOG_FILE" 2>&1\n'
    )


def build_systemd_service(
    *,
    description: str,
    working_directory: str,
    launcher_path: str,
) -> str:
    """Build a systemd service unit for one training cycle."""
    return (
        "[Unit]\n"
        f"Description={description}\n"
        "After=network-online.target\n"
        "Wants=network-online.target\n\n"
        "[Service]\n"
        "Type=oneshot\n"
        f"WorkingDirectory={working_directory}\n"
        f"ExecStart={launcher_path}\n\n"
        "[Install]\n"
        "WantedBy=multi-user.target\n"
    )


def build_systemd_timer(
    *,
    description: str,
    service_name: str,
    interval_minutes: int,
) -> str:
    """Build a systemd timer for recurring training cycles."""
    if interval_minutes <= 0:
        raise ValueError("interval_minutes must be positive")
    return (
        "[Unit]\n"
        f"Description={description}\n\n"
        "[Timer]\n"
        "OnBootSec=2min\n"
        f"OnUnitActiveSec={interval_minutes}min\n"
        "Persistent=true\n"
        f"Unit={service_name}\n\n"
        "[Install]\n"
        "WantedBy=timers.target\n"
    )


def build_cron_block(*, launcher_path: str, interval_minutes: int) -> str:
    """Build a crontab block that approximates the requested interval."""
    if interval_minutes <= 0:
        raise ValueError("interval_minutes must be positive")
    if interval_minutes < 60:
        schedule = f"*/{interval_minutes} * * * *"
    elif interval_minutes % 60 == 0:
        schedule = f"0 */{interval_minutes // 60} * * *"
    else:
        raise ValueError("Cron fallback supports intervals below 60 minutes or whole-hour multiples.")
    return (
        "# BEGIN maasai-cloud-train\n"
        f"@reboot {launcher_path}\n"
        f"{schedule} {launcher_path}\n"
        "# END maasai-cloud-train\n"
    )
