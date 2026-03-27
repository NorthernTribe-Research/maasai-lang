#!/usr/bin/env python3
"""
Curate Maasai dataset layers for translation and instruction tuning.

This script is intentionally conservative:
- Only true English <-> Maasai rows are promoted into the MT training view.
- Monolingual cultural rows are preserved, but kept in the bronze layer.
- Unreviewed manual and synthetic translation rows default to silver.
- Gold is reserved for explicitly reviewed human translations.

Outputs:
- gold.jsonl
- silver.jsonl
- bronze.jsonl
- mt_train.jsonl
- mt_eval_candidates.jsonl
- summary.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

SUPPORTED_LANGS = {"en", "mas"}
TRANSLATION_SOURCE_TYPES = {
    "manual",
    "human_translated",
    "community_reviewed",
    "template_generated",
    "glossary_generated",
    "llm_generated",
    "backtranslated",
    "external_parallel",
}
SYNTHETIC_SOURCE_TYPES = {
    "template_generated",
    "glossary_generated",
    "llm_generated",
    "backtranslated",
}
HIGH_REVIEW_STATUSES = {"native_reviewed", "expert_reviewed", "community_reviewed"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Layer Maasai data into gold, silver, and bronze views")
    parser.add_argument("inputs", nargs="+", help="Input JSONL files")
    parser.add_argument("--output-dir", default="data/interim/layered_dataset", help="Output directory")
    parser.add_argument("--eval-ratio", type=float, default=0.1, help="Approximate eval holdout ratio")
    parser.add_argument(
        "--max-eval-per-domain",
        type=int,
        default=25,
        help="Upper bound on eval candidates per domain",
    )
    parser.add_argument(
        "--max-train-chars",
        type=int,
        default=400,
        help="Maximum source/target length for MT training view",
    )
    parser.add_argument(
        "--seed",
        default="maasai-layering-v1",
        help="Stable seed for deterministic holdout selection",
    )
    return parser.parse_args()


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = re.sub(r"\s+", " ", text)
    return text


def normalize_lang(value: Any) -> str:
    return normalize_text(value).lower()


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def infer_source_type(row: dict[str, Any]) -> str:
    explicit = normalize_text(row.get("source_type"))
    if explicit:
        return explicit

    source_name = normalize_text(row.get("source_name")).lower()
    notes = normalize_text(row.get("notes")).lower()
    blob = f"{source_name} {notes}"

    if any(token in blob for token in ("template", "permutation")):
        return "template_generated"
    if any(token in blob for token in ("glossary", "lexicon")):
        return "glossary_generated"
    if any(token in blob for token in ("synthetic", "llm", "generated")):
        return "llm_generated"
    if any(token in blob for token in ("manual", "curated", "cultural_manual")):
        return "manual"
    if any(token in blob for token in ("parallel", "external", "corpus")):
        return "external_parallel"
    return "unknown"


def infer_review_status(row: dict[str, Any], source_type: str) -> str:
    explicit = normalize_text(row.get("review_status"))
    if explicit:
        return explicit
    if source_type == "community_reviewed":
        return "community_reviewed"
    if source_type in {"manual", "human_translated"}:
        return "unreviewed_manual"
    if source_type in SYNTHETIC_SOURCE_TYPES:
        return "synthetic_unreviewed"
    return "unreviewed"


def infer_confidence(row: dict[str, Any], source_type: str, review_status: str) -> float:
    explicit = row.get("confidence")
    if explicit is not None:
        try:
            return max(0.0, min(1.0, float(explicit)))
        except (TypeError, ValueError):
            pass

    if review_status in HIGH_REVIEW_STATUSES:
        return 0.98
    if source_type in {"manual", "human_translated"}:
        return 0.82
    if source_type in SYNTHETIC_SOURCE_TYPES:
        return 0.68
    if source_type == "external_parallel":
        return 0.75
    return 0.55


def infer_domain(row: dict[str, Any]) -> str:
    domain = normalize_text(row.get("domain")).lower()
    return domain or "general"


def stable_hash(seed: str, payload: str) -> str:
    return hashlib.sha256(f"{seed}:{payload}".encode("utf-8")).hexdigest()


def make_record_id(seed: str, row: dict[str, Any]) -> str:
    existing = normalize_text(row.get("id"))
    if existing:
        return existing
    payload = "|".join(
        [
            normalize_lang(row.get("source_lang")),
            normalize_lang(row.get("target_lang")),
            normalize_text(row.get("source_text")),
            normalize_text(row.get("target_text")),
            infer_domain(row),
            normalize_text(row.get("source_name")),
        ]
    )
    return f"layered-{stable_hash(seed, payload)[:16]}"


def is_translation_pair(row: dict[str, Any]) -> bool:
    source_lang = normalize_lang(row.get("source_lang"))
    target_lang = normalize_lang(row.get("target_lang"))
    if source_lang not in SUPPORTED_LANGS or target_lang not in SUPPORTED_LANGS:
        return False
    if source_lang == target_lang:
        return False
    source_text = normalize_text(row.get("source_text"))
    target_text = normalize_text(row.get("target_text"))
    if not source_text or not target_text:
        return False
    if source_text == target_text:
        return False
    return True


def fits_mt_training(row: dict[str, Any], max_train_chars: int) -> bool:
    if not is_translation_pair(row):
        return False
    source_text = normalize_text(row.get("source_text"))
    target_text = normalize_text(row.get("target_text"))
    return len(source_text) <= max_train_chars and len(target_text) <= max_train_chars


def classify_tier(row: dict[str, Any], source_type: str, review_status: str) -> str:
    if not is_translation_pair(row):
        return "bronze"
    if source_type in {"manual", "human_translated", "community_reviewed"} and review_status in HIGH_REVIEW_STATUSES:
        return "gold"
    if source_type in TRANSLATION_SOURCE_TYPES:
        return "silver"
    return "bronze"


def canonicalize_row(seed: str, row: dict[str, Any]) -> dict[str, Any]:
    source_type = infer_source_type(row)
    review_status = infer_review_status(row, source_type)
    confidence = infer_confidence(row, source_type, review_status)
    synthetic = bool(row.get("synthetic", source_type in SYNTHETIC_SOURCE_TYPES))
    tier = classify_tier(row, source_type, review_status)

    record = dict(row)
    record["id"] = make_record_id(seed, row)
    record["source_text"] = normalize_text(row.get("source_text"))
    record["target_text"] = normalize_text(row.get("target_text"))
    record["source_lang"] = normalize_lang(row.get("source_lang"))
    record["target_lang"] = normalize_lang(row.get("target_lang"))
    record["domain"] = infer_domain(row)
    record["source_name"] = normalize_text(row.get("source_name")) or "unknown"
    record["notes"] = normalize_text(row.get("notes"))
    record["task"] = normalize_text(row.get("task")) or "translate"
    record["source_type"] = source_type
    record["review_status"] = review_status
    record["confidence"] = round(confidence, 4)
    record["synthetic"] = synthetic
    record["tier"] = tier
    record["dialect_tag"] = normalize_text(row.get("dialect_tag"))
    record["split_lock"] = normalize_text(row.get("split_lock")).lower()
    record["usable_for_mt"] = fits_mt_training(record, max_train_chars=400)
    return record


def dedupe_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    best_by_key: dict[tuple[str, ...], dict[str, Any]] = {}
    tier_rank = {"gold": 3, "silver": 2, "bronze": 1}

    for row in rows:
        key = (
            row["source_lang"],
            row["target_lang"],
            row["source_text"].lower(),
            row["target_text"].lower(),
        )
        current = best_by_key.get(key)
        if current is None:
            best_by_key[key] = row
            continue

        current_rank = (
            tier_rank.get(current["tier"], 0),
            float(current.get("confidence", 0.0)),
        )
        new_rank = (
            tier_rank.get(row["tier"], 0),
            float(row.get("confidence", 0.0)),
        )
        if new_rank > current_rank:
            best_by_key[key] = row

    return list(best_by_key.values())


def deterministic_bucket(seed: str, row: dict[str, Any]) -> float:
    key = stable_hash(seed, row["id"])
    return int(key[:8], 16) / float(0xFFFFFFFF)


def split_mt_views(
    rows: list[dict[str, Any]],
    seed: str,
    eval_ratio: float,
    max_eval_per_domain: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    by_domain: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        by_domain[row["domain"]].append(row)

    train_rows: list[dict[str, Any]] = []
    eval_rows: list[dict[str, Any]] = []

    for domain, domain_rows in by_domain.items():
        locked_eval = [r for r in domain_rows if r.get("split_lock") == "eval"]
        gold_rows = [r for r in domain_rows if r["tier"] == "gold" and r not in locked_eval]
        silver_rows = [r for r in domain_rows if r["tier"] == "silver" and r not in locked_eval]
        fallback_pool = gold_rows if gold_rows else silver_rows

        target_eval = min(max_eval_per_domain, max(1, math.ceil(len(domain_rows) * eval_ratio)))
        if not fallback_pool:
            target_eval = len(locked_eval)

        ranked_pool = sorted(
            fallback_pool,
            key=lambda row: (deterministic_bucket(seed, row), row["id"]),
        )
        selected_eval_ids = {row["id"] for row in locked_eval}
        for row in ranked_pool:
            if len(selected_eval_ids) >= target_eval:
                break
            selected_eval_ids.add(row["id"])

        for row in domain_rows:
            if row["id"] in selected_eval_ids:
                eval_rows.append(row)
            else:
                train_rows.append(row)

    train_rows.sort(key=lambda row: row["id"])
    eval_rows.sort(key=lambda row: row["id"])
    return train_rows, eval_rows


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def summarize(rows: list[dict[str, Any]], mt_train: list[dict[str, Any]], mt_eval: list[dict[str, Any]]) -> dict[str, Any]:
    summary: dict[str, Any] = {
        "total_rows": len(rows),
        "tiers": defaultdict(int),
        "domains": defaultdict(int),
        "mt_rows": sum(1 for row in rows if row["usable_for_mt"]),
        "mt_train_rows": len(mt_train),
        "mt_eval_candidate_rows": len(mt_eval),
    }

    for row in rows:
        summary["tiers"][row["tier"]] += 1
        summary["domains"][row["domain"]] += 1

    summary["tiers"] = dict(sorted(summary["tiers"].items()))
    summary["domains"] = dict(sorted(summary["domains"].items()))
    return summary


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir)

    loaded_rows: list[dict[str, Any]] = []
    for input_path in args.inputs:
        loaded_rows.extend(load_jsonl(Path(input_path)))

    canonical_rows = [canonicalize_row(args.seed, row) for row in loaded_rows]
    canonical_rows = dedupe_rows(canonical_rows)

    gold_rows = [row for row in canonical_rows if row["tier"] == "gold"]
    silver_rows = [row for row in canonical_rows if row["tier"] == "silver"]
    bronze_rows = [row for row in canonical_rows if row["tier"] == "bronze"]

    mt_pool = [row for row in canonical_rows if row["usable_for_mt"] and row["tier"] in {"gold", "silver"}]
    mt_train, mt_eval = split_mt_views(
        mt_pool,
        seed=args.seed,
        eval_ratio=args.eval_ratio,
        max_eval_per_domain=args.max_eval_per_domain,
    )

    write_jsonl(output_dir / "gold.jsonl", gold_rows)
    write_jsonl(output_dir / "silver.jsonl", silver_rows)
    write_jsonl(output_dir / "bronze.jsonl", bronze_rows)
    write_jsonl(output_dir / "mt_train.jsonl", mt_train)
    write_jsonl(output_dir / "mt_eval_candidates.jsonl", mt_eval)

    summary = summarize(canonical_rows, mt_train, mt_eval)
    (output_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
