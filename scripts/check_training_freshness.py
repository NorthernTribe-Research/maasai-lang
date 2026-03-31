#!/usr/bin/env python3
"""
Fail when continuous training appears stale.

This guard checks recent GitHub Actions runs for a training workflow and exits
non-zero when there has not been a healthy run in the allowed freshness window.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib import error, parse, request


ACTIVE_STATUSES = {
    "queued",
    "in_progress",
    "waiting",
    "requested",
    "pending",
    "action_required",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate that training runs are fresh.")
    parser.add_argument(
        "--repository",
        default=os.getenv("GITHUB_REPOSITORY", ""),
        help="GitHub repository in owner/name format.",
    )
    parser.add_argument(
        "--workflow-file",
        default="daily-train.yml",
        help="Workflow file name to inspect.",
    )
    parser.add_argument(
        "--lookback-hours",
        type=float,
        default=3.0,
        help="Maximum allowed age in hours for the latest healthy training run.",
    )
    parser.add_argument(
        "--max-runs",
        type=int,
        default=30,
        help="How many recent workflow runs to inspect.",
    )
    return parser.parse_args()


def parse_utc(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def fetch_workflow_runs(
    repository: str,
    workflow_file: str,
    *,
    token: str,
    per_page: int,
) -> list[dict[str, Any]]:
    encoded_workflow = parse.quote(workflow_file, safe="")
    url = (
        f"https://api.github.com/repos/{repository}/actions/workflows/"
        f"{encoded_workflow}/runs?per_page={per_page}"
    )
    req = request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "User-Agent": "maasai-training-freshness-check/1.0",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    with request.urlopen(req, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return list(payload.get("workflow_runs") or [])


def run_age_hours(now: datetime, run: dict[str, Any]) -> float:
    reference_time = (
        parse_utc(run.get("updated_at"))
        or parse_utc(run.get("run_started_at"))
        or parse_utc(run.get("created_at"))
    )
    if reference_time is None:
        return float("inf")
    return max(0.0, (now - reference_time).total_seconds() / 3600.0)


def branch_main(run: dict[str, Any]) -> bool:
    return str(run.get("head_branch") or "").strip() == "main"


def evaluate_freshness(runs: list[dict[str, Any]], *, lookback_hours: float) -> tuple[bool, str]:
    now = datetime.now(timezone.utc)
    lookback = timedelta(hours=lookback_hours)
    main_runs = [run for run in runs if branch_main(run)]
    if not main_runs:
        return False, "No recent workflow runs found on the main branch."

    for run in main_runs:
        status = str(run.get("status") or "").strip().lower()
        if status in ACTIVE_STATUSES:
            age = run_age_hours(now, run)
            return True, f"Healthy: active training run detected (status={status}, age_hours={age:.2f})."

    successful_runs = [
        run
        for run in main_runs
        if str(run.get("status") or "").strip().lower() == "completed"
        and str(run.get("conclusion") or "").strip().lower() == "success"
    ]
    if not successful_runs:
        return False, "No successful completed training runs found on the main branch."

    latest_success = max(
        successful_runs,
        key=lambda run: parse_utc(run.get("updated_at")) or datetime.fromtimestamp(0, tz=timezone.utc),
    )
    latest_success_time = parse_utc(latest_success.get("updated_at"))
    if latest_success_time is None:
        return False, "Latest successful run is missing updated_at timestamp."

    age = now - latest_success_time
    age_hours = age.total_seconds() / 3600.0
    if age <= lookback:
        return True, f"Healthy: latest successful training run is {age_hours:.2f}h old."
    return False, f"Stale: latest successful training run is {age_hours:.2f}h old (limit={lookback_hours:.2f}h)."


def main() -> int:
    args = parse_args()
    if not args.repository:
        print("GITHUB_REPOSITORY is required.", file=sys.stderr)
        return 2
    if args.lookback_hours <= 0:
        print("--lookback-hours must be positive.", file=sys.stderr)
        return 2

    token = os.getenv("GITHUB_TOKEN")
    if not token:
        print("GITHUB_TOKEN is required.", file=sys.stderr)
        return 2

    try:
        runs = fetch_workflow_runs(
            args.repository,
            args.workflow_file,
            token=token,
            per_page=max(1, min(args.max_runs, 100)),
        )
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        print(f"GitHub API HTTP error {exc.code}: {body}", file=sys.stderr)
        return 2
    except Exception as exc:  # pragma: no cover - network/runtime dependent
        print(f"GitHub API request failed: {exc}", file=sys.stderr)
        return 2

    ok, message = evaluate_freshness(runs, lookback_hours=args.lookback_hours)
    print(message)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
