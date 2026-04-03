#!/usr/bin/env python3
"""
Check whether a local model candidate is ready for promotion/publication.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.readiness import (
    ReadinessThresholds,
    build_model_readiness_report,
    write_model_readiness_report,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate local Maa model readiness.")
    parser.add_argument("--model-dir", type=str, default="outputs/maasai-en-mt-qlora")
    parser.add_argument("--eval-file", type=str, default=None)
    parser.add_argument("--output-file", type=str, default=None)
    parser.add_argument("--json", action="store_true", help="Print the full JSON report.")
    parser.add_argument("--min-bleu", type=float, default=10.0)
    parser.add_argument("--min-chrf", type=float, default=25.0)
    parser.add_argument("--min-term-recall", type=float, default=0.50)
    parser.add_argument("--max-english-leakage-rate", type=float, default=0.35)
    parser.add_argument("--min-eval-samples", type=int, default=50)
    return parser.parse_args()


def print_text_report(report: dict) -> None:
    status = "READY" if report["ready"] else "NOT READY"
    print("=" * 72)
    print(f"MODEL READINESS: {status}")
    print("=" * 72)
    print(f"Model dir: {report['model_dir']}")
    print(f"Eval file: {report['eval_file']}")
    print(f"Artifact state: {report['artifact_state']}")
    print(f"Base model: {report.get('base_model_name') or 'unknown'}")

    print("\nChecks")
    for name, payload in report["checks"].items():
        marker = "OK " if payload["ok"] else "FAIL"
        print(f"- {marker} {name}: {payload['detail']}")

    if report["reasons"]:
        print("\nBlocking reasons")
        for reason in report["reasons"]:
            print(f"- {reason}")


def main() -> int:
    args = parse_args()
    model_dir = Path(args.model_dir).resolve()
    eval_file = Path(args.eval_file).resolve() if args.eval_file else None
    thresholds = ReadinessThresholds(
        min_bleu=args.min_bleu,
        min_chrf=args.min_chrf,
        min_term_recall=args.min_term_recall,
        max_english_leakage_rate=args.max_english_leakage_rate,
        min_eval_samples=args.min_eval_samples,
    )
    report = build_model_readiness_report(
        model_dir,
        eval_file=eval_file,
        thresholds=thresholds,
    )

    if args.output_file:
        write_model_readiness_report(Path(args.output_file).resolve(), report)

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print_text_report(report)

    return 0 if report["ready"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
