#!/usr/bin/env python3
"""
Create and optionally populate a Hugging Face storage bucket fallback repo.

Native HF buckets are not exposed uniformly across environments, so this script
uses a normal Hub repo as the portable fallback and can upload a local folder
into it. Preview mode is the default; pass --execute to perform network calls.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from huggingface_hub import HfApi


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create and optionally populate an HF bucket/repo")
    parser.add_argument("bucket_id", help="Namespace/name of the target bucket or fallback repo")
    parser.add_argument(
        "--repo-type",
        default="dataset",
        choices=["dataset", "model", "space"],
        help="Fallback repo type when native buckets are unavailable",
    )
    parser.add_argument("--source-dir", type=str, default=None, help="Local directory to upload into the bucket/repo")
    parser.add_argument("--token", type=str, default=None, help="HF token override")
    parser.add_argument("--private", action="store_true", help="Make the bucket/repo private")
    parser.add_argument("--execute", action="store_true", help="Actually create/upload instead of previewing")
    return parser.parse_args()


def load_keyfile(project_root: Path) -> dict:
    key_path = project_root / "huggingface-api-key.json"
    if not key_path.exists():
        return {}
    try:
        return json.loads(key_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def load_token(args: argparse.Namespace, key_info: dict) -> str:
    if args.token:
        return args.token
    for env_var in ("HF_TOKEN", "HUGGINGFACE_TOKEN"):
        value = os.getenv(env_var)
        if value:
            return value
    key_value = key_info.get("key")
    if key_value:
        return str(key_value)
    raise RuntimeError("No Hugging Face token found. Set HF_TOKEN, pass --token, or provide huggingface-api-key.json.")


def main() -> None:
    args = parse_args()
    project_root = Path(__file__).resolve().parent.parent
    key_info = load_keyfile(project_root)
    source_dir = None

    if args.source_dir:
        source_dir = Path(args.source_dir)
        if not source_dir.is_absolute():
            source_dir = (project_root / source_dir).resolve()
        if not source_dir.exists() or not source_dir.is_dir():
            raise FileNotFoundError(f"Missing source directory: {source_dir}")

    print("\n=== HF Bucket/Repo Plan ===")
    print(f"Target:   {args.bucket_id}")
    print(f"Type:     {args.repo_type}")
    print(f"Private:  {args.private}")
    if source_dir is not None:
        print(f"Populate: {source_dir}")
    else:
        print("Populate: no local directory selected")

    if not args.execute:
        print("\nPreview mode only. Re-run with --execute to create/populate the repo.")
        return

    token = load_token(args, key_info)
    api = HfApi()

    create_kwargs = {
        "repo_id": args.bucket_id,
        "repo_type": args.repo_type,
        "private": args.private,
        "exist_ok": True,
        "token": token,
    }
    if args.repo_type == "space":
        create_kwargs["space_sdk"] = "gradio"

    api.create_repo(**create_kwargs)
    print(f"Created or found existing target: {args.bucket_id}")

    if source_dir is not None:
        api.upload_folder(
            repo_id=args.bucket_id,
            repo_type=args.repo_type,
            folder_path=str(source_dir),
            commit_message=f"Populate {args.bucket_id} from local bundle",
            token=token,
        )
        print(f"Uploaded contents from: {source_dir}")

    print("\nCompleted.")


if __name__ == "__main__":
    main()
