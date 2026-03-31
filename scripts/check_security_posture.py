#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request


REQUIRED_SECURITY_FEATURES = (
    "dependabot_security_updates",
    "secret_scanning",
    "secret_scanning_push_protection",
    "secret_scanning_validity_checks",
    "secret_scanning_non_provider_patterns",
)

REQUIRED_STATUS_CHECKS = {
    "Workflow Lint",
    "Repo Validation",
    "Docker Smoke",
    "Analyze Python (python)",
}


def api_get(path: str, token: str) -> dict:
    req = urllib.request.Request(
        f"https://api.github.com{path}",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GET {path} failed with HTTP {exc.code}: {body}") from exc


def fail(message: str) -> None:
    print(f"[FAIL] {message}")


def ok(message: str) -> None:
    print(f"[OK] {message}")


def main() -> int:
    repo = os.getenv("GITHUB_REPOSITORY")
    token = os.getenv("GITHUB_TOKEN")

    if not repo:
        print("GITHUB_REPOSITORY is required (for example: NorthernTribe-Research/maasai-lang).", file=sys.stderr)
        return 2
    if not token:
        print("GITHUB_TOKEN is required to query repository security settings.", file=sys.stderr)
        return 2

    failures: list[str] = []

    repo_data = api_get(f"/repos/{repo}", token)
    security_and_analysis = repo_data.get("security_and_analysis") or {}

    for feature in REQUIRED_SECURITY_FEATURES:
        status = (security_and_analysis.get(feature) or {}).get("status", "missing")
        if status != "enabled":
            failures.append(f"security_and_analysis.{feature} is '{status}' (expected 'enabled').")
        else:
            ok(f"{feature} enabled")

    pvr = api_get(f"/repos/{repo}/private-vulnerability-reporting", token)
    if pvr.get("enabled") is not True:
        failures.append("private vulnerability reporting is disabled.")
    else:
        ok("private vulnerability reporting enabled")

    protection = api_get(f"/repos/{repo}/branches/main/protection", token)

    required_checks = ((protection.get("required_status_checks") or {}).get("contexts")) or []
    required_checks_set = set(required_checks)
    missing_checks = sorted(REQUIRED_STATUS_CHECKS - required_checks_set)
    if missing_checks:
        failures.append(f"branch protection missing required status checks: {missing_checks}")
    else:
        ok("required branch status checks configured")

    if not (protection.get("enforce_admins") or {}).get("enabled"):
        failures.append("branch protection does not enforce rules for admins.")
    else:
        ok("admins are covered by branch protection")

    reviews = protection.get("required_pull_request_reviews") or {}
    if not reviews.get("dismiss_stale_reviews"):
        failures.append("dismiss_stale_reviews is disabled.")
    if not reviews.get("require_code_owner_reviews"):
        failures.append("require_code_owner_reviews is disabled.")
    if int(reviews.get("required_approving_review_count") or 0) < 1:
        failures.append("required_approving_review_count is less than 1.")
    else:
        ok("pull request review safeguards configured")

    if not (protection.get("required_linear_history") or {}).get("enabled"):
        failures.append("required_linear_history is disabled.")
    else:
        ok("linear history required")

    if (protection.get("allow_force_pushes") or {}).get("enabled"):
        failures.append("force pushes are allowed on main.")
    else:
        ok("force pushes blocked")

    if (protection.get("allow_deletions") or {}).get("enabled"):
        failures.append("branch deletions are allowed on main.")
    else:
        ok("branch deletions blocked")

    if not (protection.get("required_conversation_resolution") or {}).get("enabled"):
        failures.append("required_conversation_resolution is disabled.")
    else:
        ok("conversation resolution required")

    if failures:
        print("\nSecurity posture checks failed:")
        for message in failures:
            fail(message)
        return 1

    print("\nAll security posture checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
