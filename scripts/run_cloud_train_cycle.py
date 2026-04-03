#!/usr/bin/env python3
"""
Run one persistent cloud CPU training cycle with overlap protection and heartbeats.
"""

from __future__ import annotations

import argparse
import fcntl
import json
import os
import subprocess
import sys
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.cloud_cpu import CloudTrainingConfig, build_cycle_command


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run one cloud CPU training cycle")
    parser.add_argument(
        "--project-root",
        default=str(PROJECT_ROOT),
        help="Project root that contains scripts/train_daily_from_hf.py",
    )
    parser.add_argument(
        "--runtime-root",
        default=os.getenv("CLOUD_TRAIN_RUNTIME_ROOT", str(PROJECT_ROOT / "runtime")),
        help="Runtime directory for state, logs, and resumable training artifacts.",
    )
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_json(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


@contextmanager
def hold_lock(lock_path: Path) -> Iterator[bool]:
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with lock_path.open("a+", encoding="utf-8") as handle:
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            yield False
            return
        handle.seek(0)
        handle.truncate()
        handle.write(f"pid={os.getpid()}\nstarted_at={utc_now()}\n")
        handle.flush()
        try:
            yield True
        finally:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def build_status_payload(
    *,
    config: CloudTrainingConfig,
    command: list[str],
    runtime_root: Path,
    state: str,
    started_at: str | None = None,
    finished_at: str | None = None,
    exit_code: int | None = None,
) -> dict[str, object]:
    return {
        "state": state,
        "started_at": started_at,
        "finished_at": finished_at,
        "exit_code": exit_code,
        "dataset_repo": config.dataset_repo,
        "model_repo": config.model_repo,
        "model_name": config.model_name,
        "runtime_root": str(runtime_root),
        "command": command,
    }


def main() -> int:
    args = parse_args()
    project_root = Path(args.project_root).resolve()
    runtime_root = Path(args.runtime_root).resolve()
    state_dir = runtime_root / "state"
    heartbeat_path = state_dir / "cloud-train-heartbeat.json"
    lock_path = state_dir / "cloud-train.lock"

    config = CloudTrainingConfig.from_env()
    command = build_cycle_command(
        config,
        project_root=project_root,
        runtime_root=runtime_root,
        python_executable=sys.executable,
    )

    with hold_lock(lock_path) as acquired:
        if not acquired:
            write_json(
                heartbeat_path,
                build_status_payload(
                    config=config,
                    command=command,
                    runtime_root=runtime_root,
                    state="skipped_locked",
                    finished_at=utc_now(),
                    exit_code=0,
                ),
            )
            print("Skipping cloud training cycle because another cycle is already running.")
            return 0

        started_at = utc_now()
        write_json(
            heartbeat_path,
            build_status_payload(
                config=config,
                command=command,
                runtime_root=runtime_root,
                state="running",
                started_at=started_at,
            ),
        )

        print("Launching persistent cloud training cycle:")
        print(" ".join(command))
        result = subprocess.run(command, cwd=project_root, check=False)

        finished_at = utc_now()
        state = "success" if result.returncode == 0 else "failed"
        write_json(
            heartbeat_path,
            build_status_payload(
                config=config,
                command=command,
                runtime_root=runtime_root,
                state=state,
                started_at=started_at,
                finished_at=finished_at,
                exit_code=result.returncode,
            ),
        )
        return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
