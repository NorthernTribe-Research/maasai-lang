#!/usr/bin/env python3
"""
Final dataset validation and reporting for the governed Maasai corpus.

The default mode prints a human-readable summary and exits successfully even
when warnings are detected. Use ``--strict`` when validation warnings should
fail CI or other automation.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

SPLITS = ("train", "valid", "test")
REQUIRED_FIELDS = (
    "id",
    "source_text",
    "target_text",
    "source_lang",
    "target_lang",
    "domain",
    "confidence",
    "tier",
    "quality_score",
)


def is_blank(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    return False


def load_splits(data_dir: Path) -> tuple[dict[str, list[dict[str, Any]]], list[dict[str, Any]]]:
    splits: dict[str, list[dict[str, Any]]] = {}
    all_pairs: list[dict[str, Any]] = []

    for split in SPLITS:
        split_file = data_dir / f"{split}.jsonl"
        if not split_file.exists():
            raise FileNotFoundError(f"Missing required split file: {split_file}")

        rows: list[dict[str, Any]] = []
        with split_file.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                rows.append(json.loads(line))

        splits[split] = rows
        all_pairs.extend(rows)

    return splits, all_pairs


def summarize_missing_fields(rows: list[dict[str, Any]]) -> Counter[str]:
    missing_counts: Counter[str] = Counter()
    for row in rows:
        for field in REQUIRED_FIELDS:
            if field == "id":
                continue
            if field not in row or is_blank(row.get(field)):
                missing_counts[field] += 1
    return missing_counts


def summarize_id_integrity(rows: list[dict[str, Any]]) -> dict[str, Any]:
    present_ids: list[str] = []
    missing_count = 0

    for row in rows:
        row_id = row.get("id")
        if is_blank(row_id):
            missing_count += 1
            continue
        present_ids.append(str(row_id).strip())

    duplicate_counts = {
        row_id: count
        for row_id, count in Counter(present_ids).items()
        if count > 1
    }

    return {
        "missing_count": missing_count,
        "present_count": len(present_ids),
        "unique_present_count": len(set(present_ids)),
        "duplicate_id_values": duplicate_counts,
        "duplicate_row_count": sum(count - 1 for count in duplicate_counts.values()),
    }


def build_report(project_root: Path) -> dict[str, Any]:
    data_dir = project_root / "data" / "final_v3"
    splits, all_pairs = load_splits(data_dir)

    missing_fields = summarize_missing_fields(all_pairs)
    id_integrity = summarize_id_integrity(all_pairs)

    lang_direction_count: Counter[str] = Counter()
    domain_count: Counter[str] = Counter()
    tier_count: Counter[str] = Counter()

    confidences: list[float] = []
    quality_scores: list[float] = []
    source_lengths: list[int] = []
    target_lengths: list[int] = []

    for row in all_pairs:
        lang_direction = f"{row.get('source_lang')}-{row.get('target_lang')}"
        lang_direction_count[lang_direction] += 1
        domain_count[str(row.get("domain", "unknown"))] += 1
        tier_count[str(row.get("tier", "unknown"))] += 1
        confidences.append(float(row.get("confidence", 0) or 0))
        quality_scores.append(float(row.get("quality_score", 0) or 0))
        source_lengths.append(len(str(row.get("source_text", "")).split()))
        target_lengths.append(len(str(row.get("target_text", "")).split()))

    ratios = [
        target / source
        for source, target in zip(source_lengths, target_lengths)
        if source > 0
    ]

    warnings: list[str] = []
    if missing_fields:
        warnings.append(
            "Missing required non-ID fields detected: "
            + ", ".join(f"{field}={count}" for field, count in sorted(missing_fields.items()))
        )
    if id_integrity["missing_count"]:
        warnings.append(f"{id_integrity['missing_count']} rows are missing IDs.")
    if id_integrity["duplicate_row_count"]:
        warnings.append(
            f"{id_integrity['duplicate_row_count']} rows reuse an existing ID across "
            f"{len(id_integrity['duplicate_id_values'])} duplicated ID values."
        )

    stats = {
        "total_pairs": len(all_pairs),
        "unique_ids": id_integrity["unique_present_count"],
        "present_ids": id_integrity["present_count"],
        "missing_id_count": id_integrity["missing_count"],
        "duplicate_id_row_count": id_integrity["duplicate_row_count"],
        "domains": len(domain_count),
        "avg_confidence": sum(confidences) / len(confidences),
        "language_pairs": dict(lang_direction_count),
        "tier_distribution": dict(tier_count),
        "quality_score_avg": sum(quality_scores) / len(quality_scores),
        "validation_warnings": warnings,
    }

    return {
        "project_root": str(project_root),
        "data_dir": str(data_dir),
        "splits": {split: len(rows) for split, rows in splits.items()},
        "total_pairs": len(all_pairs),
        "missing_fields": dict(missing_fields),
        "id_integrity": id_integrity,
        "language_pairs": dict(lang_direction_count),
        "domain_distribution": dict(domain_count),
        "tier_distribution": dict(tier_count),
        "confidence": {
            "min": min(confidences),
            "max": max(confidences),
            "avg": sum(confidences) / len(confidences),
            "gte_090": sum(1 for value in confidences if value >= 0.90),
            "gte_095": sum(1 for value in confidences if value >= 0.95),
            "gte_098": sum(1 for value in confidences if value >= 0.98),
        },
        "text_lengths": {
            "source_avg_tokens": sum(source_lengths) / len(source_lengths),
            "target_avg_tokens": sum(target_lengths) / len(target_lengths),
            "ratio_0_7_to_1_5_count": sum(1 for ratio in ratios if 0.7 <= ratio <= 1.5),
            "ratio_0_7_to_1_5_pct": (sum(1 for ratio in ratios if 0.7 <= ratio <= 1.5) / len(ratios) * 100),
        },
        "stats": stats,
        "warnings": warnings,
        "strict_ready": not warnings,
    }


def write_stats(stats_path: Path, report: dict[str, Any]) -> None:
    stats_path.write_text(
        json.dumps(report["stats"], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def print_text_report(report: dict[str, Any]) -> None:
    print("=" * 70)
    print("DATASET VALIDATION")
    print("=" * 70)

    for split in SPLITS:
        count = report["splits"][split]
        print(f"\n✓ {split:6} split: {count:5} pairs")

    print(f"\n✓ TOTAL: {report['total_pairs']} pairs")

    print("\n" + "-" * 70)
    print("STRUCTURAL VALIDATION")
    print("-" * 70)

    if report["missing_fields"]:
        print("⚠️ Missing required non-ID fields:")
        for field, count in sorted(report["missing_fields"].items()):
            print(f"   {field}: {count} rows")
    else:
        print("✅ All required non-ID fields present")

    print("\n" + "-" * 70)
    print("LANGUAGE COVERAGE")
    print("-" * 70)
    for direction, count in sorted(report["language_pairs"].items()):
        pct = (count / report["total_pairs"]) * 100
        print(f"  {direction}: {count:5} pairs ({pct:5.1f}%)")

    print("\n" + "-" * 70)
    print("DOMAIN DISTRIBUTION")
    print("-" * 70)
    total_domains = sum(report["domain_distribution"].values())
    for domain, count in sorted(
        report["domain_distribution"].items(),
        key=lambda item: item[1],
        reverse=True,
    ):
        pct = (count / total_domains) * 100
        print(f"  {domain:20} {count:6} pairs ({pct:5.1f}%)")

    print("\n" + "-" * 70)
    print("QUALITY TIER DISTRIBUTION")
    print("-" * 70)
    for tier in ("gold", "silver", "bronze"):
        count = report["tier_distribution"].get(tier, 0)
        pct = (count / report["total_pairs"]) * 100
        status = "✓" if count > 0 else "✗"
        print(f"  {status} {tier:10} {count:6} pairs ({pct:5.1f}%)")

    confidence = report["confidence"]
    print("\n" + "-" * 70)
    print("CONFIDENCE DISTRIBUTION")
    print("-" * 70)
    print(f"  Min confidence: {confidence['min']:.4f}")
    print(f"  Max confidence: {confidence['max']:.4f}")
    print(f"  Avg confidence: {confidence['avg']:.4f}")
    print(f"  >= 0.90: {confidence['gte_090']} pairs")
    print(f"  >= 0.95: {confidence['gte_095']} pairs")
    print(f"  >= 0.98: {confidence['gte_098']} pairs")

    id_integrity = report["id_integrity"]
    print("\n" + "-" * 70)
    print("ID INTEGRITY")
    print("-" * 70)
    if id_integrity["missing_count"]:
        print(f"⚠️ Missing IDs: {id_integrity['missing_count']} rows")
    else:
        print("✅ Every row has an ID")

    if id_integrity["duplicate_row_count"]:
        print(
            f"⚠️ Duplicate ID rows: {id_integrity['duplicate_row_count']} "
            f"across {len(id_integrity['duplicate_id_values'])} duplicated IDs"
        )
    else:
        print(f"✅ All {id_integrity['present_count']} present IDs are unique")

    text_lengths = report["text_lengths"]
    print("\n" + "-" * 70)
    print("TEXT LENGTH ANALYSIS")
    print("-" * 70)
    print(f"  Source avg tokens: {text_lengths['source_avg_tokens']:.1f}")
    print(f"  Target avg tokens: {text_lengths['target_avg_tokens']:.1f}")
    print(
        "  Length ratio 0.7-1.5: "
        f"{text_lengths['ratio_0_7_to_1_5_count']}/{report['total_pairs']} pairs "
        f"({text_lengths['ratio_0_7_to_1_5_pct']:.1f}%)"
    )

    stats = report["stats"]
    print("\n" + "=" * 70)
    print("DATASET SUMMARY")
    print("=" * 70)
    print(f"\nTotal Pairs:           {stats['total_pairs']:,}")
    print(f"Present IDs:           {stats['present_ids']:,}")
    print(f"Unique Present IDs:    {stats['unique_ids']:,}")
    print(f"Missing IDs:           {stats['missing_id_count']:,}")
    print(f"Duplicate ID Rows:     {stats['duplicate_id_row_count']:,}")
    print(f"Domains Covered:       {stats['domains']}")
    print(f"Average Confidence:    {stats['avg_confidence']:.4f}")
    print(f"Average Quality Score: {stats['quality_score_avg']:.4f}")

    if report["warnings"]:
        print("\nWarnings:")
        for warning in report["warnings"]:
            print(f"- {warning}")

    print("\n" + "=" * 70)
    if report["strict_ready"]:
        print("✅ DATASET VALIDATION COMPLETE")
    else:
        print("⚠️ DATASET VALIDATION COMPLETE WITH WARNINGS")
    print("=" * 70)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--project-root",
        type=Path,
        default=Path(__file__).resolve().parent.parent,
        help="Project root containing data/final_v3.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit the full validation report as JSON.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit non-zero when validation warnings are detected.",
    )
    return parser.parse_args()


def validate_dataset() -> bool:
    report = build_report(Path(__file__).resolve().parent.parent)
    write_stats(Path(report["data_dir"]) / "_stats.json", report)
    return report["strict_ready"]


def main() -> int:
    args = parse_args()
    report = build_report(args.project_root)
    stats_path = args.project_root / "data" / "final_v3" / "_stats.json"
    write_stats(stats_path, report)

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print_text_report(report)
        print(f"\n✓ Stats saved to {stats_path}")

    if args.strict and report["warnings"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
