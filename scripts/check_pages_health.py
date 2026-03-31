#!/usr/bin/env python3
"""
Check GitHub Pages health for the Maasai Language Platform docs gateway.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from urllib import error, request


DEFAULT_BASE_URL = "https://northerntribe-research.github.io/maasai-lang"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate GitHub Pages docs gateway health.")
    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help="GitHub Pages base URL.",
    )
    parser.add_argument(
        "--timeout-seconds",
        type=float,
        default=15.0,
        help="HTTP timeout in seconds.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit machine-readable JSON output.",
    )
    return parser.parse_args()


def normalize_base_url(base_url: str) -> str:
    value = base_url.strip().rstrip("/")
    if not value:
        raise ValueError("base URL must not be empty.")
    if not value.startswith("https://"):
        raise ValueError("base URL must use HTTPS.")
    return value


def probe(url: str, *, timeout_seconds: float) -> dict[str, object]:
    req = request.Request(
        url,
        headers={
            "Accept": "text/html,*/*;q=0.8",
            "User-Agent": "maasai-pages-healthcheck/1.0",
        },
    )
    try:
        with request.urlopen(req, timeout=timeout_seconds) as response:
            status = int(response.status)
            final_url = response.geturl()
            content_type = response.headers.get("Content-Type", "")
    except error.HTTPError as exc:
        return {
            "ok": False,
            "status": int(exc.code),
            "url": url,
            "final_url": exc.geturl() if hasattr(exc, "geturl") else url,
            "content_type": "",
            "error": f"HTTP {exc.code}",
        }
    except Exception as exc:  # pragma: no cover - network/runtime dependent
        return {
            "ok": False,
            "status": None,
            "url": url,
            "final_url": url,
            "content_type": "",
            "error": str(exc),
        }

    return {
        "ok": 200 <= status < 400,
        "status": status,
        "url": url,
        "final_url": final_url,
        "content_type": content_type,
        "error": "",
    }


def evaluate_health(root_probe: dict[str, object], docs_probe: dict[str, object]) -> tuple[str, str]:
    root_ok = bool(root_probe.get("ok"))
    docs_ok = bool(docs_probe.get("ok"))
    if root_ok and docs_ok:
        return "healthy", "Root and docs hub endpoints returned successful responses."
    if root_ok or docs_ok:
        return "degraded", "Only one of the GitHub Pages endpoints is healthy."
    return "down", "Both GitHub Pages probes failed."


def main() -> int:
    args = parse_args()
    if args.timeout_seconds <= 0:
        print("--timeout-seconds must be positive.", file=sys.stderr)
        return 2

    try:
        base_url = normalize_base_url(args.base_url)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    root_url = f"{base_url}/"
    docs_url = f"{base_url}/docs/"

    root_probe = probe(root_url, timeout_seconds=args.timeout_seconds)
    docs_probe = probe(docs_url, timeout_seconds=args.timeout_seconds)
    overall_status, summary = evaluate_health(root_probe, docs_probe)

    report = {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "base_url": base_url,
        "overall_status": overall_status,
        "summary": summary,
        "probes": {
            "root": root_probe,
            "docs": docs_probe,
        },
    }

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f"Checked at:      {report['checked_at']}")
        print(f"Base URL:        {base_url}")
        print(f"Overall status:  {overall_status.upper()}")
        print(f"Summary:         {summary}")
        print()
        print(
            "Root probe:      "
            f"{root_probe.get('status')} {root_probe.get('content_type') or ''} {root_probe.get('final_url')}"
        )
        if root_probe.get("error"):
            print(f"Root error:      {root_probe.get('error')}")
        print(
            "Docs probe:      "
            f"{docs_probe.get('status')} {docs_probe.get('content_type') or ''} {docs_probe.get('final_url')}"
        )
        if docs_probe.get("error"):
            print(f"Docs error:      {docs_probe.get('error')}")

    if overall_status == "healthy":
        return 0
    if overall_status == "degraded":
        return 2
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
