#!/usr/bin/env python3
"""Thin wrapper around the unified Hugging Face publisher for dataset publication."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    project_root = Path(__file__).resolve().parent.parent
    publisher = project_root / "scripts" / "publish_to_hf.py"
    cmd = [
        sys.executable,
        str(publisher),
        "--skip-space",
        "--skip-model",
        "--execute",
        *sys.argv[1:],
    ]
    return subprocess.run(cmd, cwd=project_root, check=False).returncode


if __name__ == "__main__":
    raise SystemExit(main())
