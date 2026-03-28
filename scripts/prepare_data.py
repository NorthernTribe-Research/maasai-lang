#!/usr/bin/env python3
"""
Prepare English <-> Maasai translation data for instruction tuning.

Input:
- CSV/JSONL files placed in data/raw/
- Expected columns or keys:
    source_text, target_text, source_lang, target_lang
  Optional:
    domain, source_name, quality_score, notes

Output:
- data/final_v3/train.jsonl
- data/final_v3/valid.jsonl
- data/final_v3/test.jsonl
"""

from __future__ import annotations

import argparse
import json
import logging
import random
import re
from collections import Counter
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

import pandas as pd
from sklearn.model_selection import train_test_split


LOGGER = logging.getLogger("prepare_data")
DEFAULT_ALLOWED_LANGS = ("en", "mas")
DEFAULT_EXCLUDED_SOURCES = (
    "bible_genesis_monolingual",
    "hinde_linguistics",
    "hollis_linguistics",
)


@dataclass
class ParallelRecord:
    id: str
    task: str
    source_lang: str
    target_lang: str
    source_text: str
    target_text: str
    domain: str = "general"
    source_name: str = "unknown"
    quality_score: float = 1.0
    notes: str = ""


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input_dir", type=str, default="data/raw")
    parser.add_argument("--output_dir", type=str, default="data/final_v3")
    parser.add_argument("--test_size", type=float, default=0.05)
    parser.add_argument("--valid_size", type=float, default=0.05)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--min_chars", type=int, default=2)
    parser.add_argument("--max_chars", type=int, default=4000)
    parser.add_argument("--min_length_ratio", type=float, default=0.15)
    parser.add_argument("--max_length_ratio", type=float, default=20.0)
    parser.add_argument(
        "--allowed_langs",
        type=str,
        default=",".join(DEFAULT_ALLOWED_LANGS),
        help="Comma-separated language codes allowed in the MT build",
    )
    parser.add_argument(
        "--exclude_source_names",
        type=str,
        default=",".join(DEFAULT_EXCLUDED_SOURCES),
        help="Comma-separated source_name values to exclude from the MT build",
    )
    parser.add_argument(
        "--min_quality_score",
        type=float,
        default=0.0,
        help="Minimum quality_score to keep after normalization",
    )
    return parser.parse_args()


def normalize_text(text: Any) -> str:
    """Light normalization without being destructive to orthography."""
    if text is None:
        return ""
    text = str(text).strip()
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = re.sub(r"\s+", " ", text)
    return text


def load_csv(path: Path) -> pd.DataFrame:
    return pd.read_csv(path)


def load_jsonl(path: Path) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return pd.DataFrame(rows)


def load_any(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return load_csv(path)
    if suffix in {".jsonl", ".json"}:
        return load_jsonl(path)
    raise ValueError(f"Unsupported file format: {path}")


def parse_csv_list(raw: str) -> set[str]:
    return {item.strip().lower() for item in raw.split(",") if item.strip()}


def standardize_columns(df: pd.DataFrame, source_name: str) -> pd.DataFrame:
    """Map likely column aliases into the expected schema."""
    df = df.copy()

    alias_map = {
        "source_text": ["source_text", "src", "source", "english", "en", "text_en"],
        "target_text": ["target_text", "tgt", "target", "maasai", "mas", "text_mas"],
        "source_lang": ["source_lang", "src_lang", "lang_source"],
        "target_lang": ["target_lang", "tgt_lang", "lang_target"],
        "domain": ["domain", "topic"],
        "quality_score": ["quality_score", "score"],
        "notes": ["notes", "comment"],
        "source_name": ["source_name", "provenance"],
    }

    resolved: dict[str, str] = {}
    for canonical, aliases in alias_map.items():
        for alias in aliases:
            if alias in df.columns:
                resolved[canonical] = alias
                break

    required = {"source_text", "target_text"}
    missing = required - set(resolved)
    if missing:
        raise ValueError(
            f"Missing required columns {missing} in file from source '{source_name}'. "
            f"Found columns: {list(df.columns)}"
        )

    out = pd.DataFrame()
    out["source_text"] = df[resolved["source_text"]]
    out["target_text"] = df[resolved["target_text"]]
    out["source_lang"] = df[resolved["source_lang"]] if "source_lang" in resolved else "en"
    out["target_lang"] = df[resolved["target_lang"]] if "target_lang" in resolved else "mas"
    out["domain"] = df[resolved["domain"]] if "domain" in resolved else "general"
    out["quality_score"] = df[resolved["quality_score"]] if "quality_score" in resolved else 1.0
    out["notes"] = df[resolved["notes"]] if "notes" in resolved else ""
    if "source_name" in resolved:
        out["source_name"] = df[resolved["source_name"]].fillna(source_name)
    else:
        out["source_name"] = source_name
    return out


def clean_dataframe(
    df: pd.DataFrame,
    min_chars: int,
    max_chars: int,
    min_length_ratio: float,
    max_length_ratio: float,
    allowed_langs: set[str],
    excluded_source_names: set[str],
    min_quality_score: float,
) -> pd.DataFrame:
    df = df.copy()

    for column in ["source_text", "target_text", "source_lang", "target_lang", "domain", "notes", "source_name"]:
        df[column] = df[column].apply(normalize_text)

    df["source_lang"] = df["source_lang"].str.lower()
    df["target_lang"] = df["target_lang"].str.lower()
    df["source_name"] = df["source_name"].str.lower()
    df["quality_score"] = pd.to_numeric(df["quality_score"], errors="coerce").fillna(1.0)

    # This script builds the core MT view only.
    df = df[
        df["source_lang"].isin(allowed_langs)
        & df["target_lang"].isin(allowed_langs)
        & (df["source_lang"] != df["target_lang"])
    ]

    if excluded_source_names:
        df = df[~df["source_name"].isin(excluded_source_names)]

    df = df[df["quality_score"] >= min_quality_score]

    # Basic length filters
    df = df[
        df["source_text"].str.len().between(min_chars, max_chars)
        & df["target_text"].str.len().between(min_chars, max_chars)
    ]

    # Remove exact self-copies
    df = df[df["source_text"] != df["target_text"]]

    # Length ratio filter
    src_len = df["source_text"].str.len().clip(lower=1)
    tgt_len = df["target_text"].str.len().clip(lower=1)
    ratio = tgt_len / src_len
    df = df[ratio.between(min_length_ratio, max_length_ratio)]

    # Remove obvious broken rows
    df = df[
        ~df["source_text"].str.fullmatch(r"[\W_]+", na=False)
        & ~df["target_text"].str.fullmatch(r"[\W_]+", na=False)
    ]

    # Deduplicate exact pairs
    df = df.drop_duplicates(subset=["source_text", "target_text", "source_lang", "target_lang"])

    # Assign ids
    df = df.reset_index(drop=True)
    df["id"] = [f"pair-{i:07d}" for i in range(len(df))]
    df["task"] = "translate"

    columns = [
        "id",
        "task",
        "source_lang",
        "target_lang",
        "source_text",
        "target_text",
        "domain",
        "source_name",
        "quality_score",
        "notes",
    ]
    return df[columns]


def build_summary(cleaned: pd.DataFrame, splits: dict[str, pd.DataFrame]) -> dict[str, Any]:
    lang_pairs = Counter(zip(cleaned["source_lang"], cleaned["target_lang"], strict=False))
    source_names = Counter(cleaned["source_name"])
    domains = Counter(cleaned["domain"])

    return {
        "total_rows": int(len(cleaned)),
        "splits": {name: int(len(frame)) for name, frame in splits.items()},
        "lang_pairs": {f"{src}->{tgt}": count for (src, tgt), count in sorted(lang_pairs.items())},
        "top_source_names": dict(source_names.most_common(10)),
        "top_domains": dict(domains.most_common(10)),
    }


def to_instruction_record(row: pd.Series) -> dict[str, Any]:
    source_lang = row["source_lang"].strip().lower()
    target_lang = row["target_lang"].strip().lower()

    if source_lang == "en" and target_lang == "mas":
        prompt = f'Translate the following English sentence to Maasai:\n"{row["source_text"]}"'
    elif source_lang == "mas" and target_lang == "en":
        prompt = f'Translate the following Maasai sentence to English:\n"{row["source_text"]}"'
    else:
        prompt = f'Translate from {source_lang} to {target_lang}:\n"{row["source_text"]}"'

    return {
        **row.to_dict(),
        "prompt": prompt,
        "completion": row["target_text"],
    }


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def main() -> None:
    setup_logging()
    args = parse_args()
    random.seed(args.seed)
    allowed_langs = parse_csv_list(args.allowed_langs)
    excluded_source_names = parse_csv_list(args.exclude_source_names)

    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)

    if not input_dir.exists():
        raise FileNotFoundError(f"Input directory does not exist: {input_dir}")

    files = sorted([p for p in input_dir.iterdir() if p.is_file() and p.suffix.lower() in {".csv", ".jsonl", ".json"}])
    if not files:
        raise FileNotFoundError(f"No input files found in {input_dir}")

    frames: list[pd.DataFrame] = []
    for file_path in files:
        LOGGER.info("Loading %s", file_path)
        df = load_any(file_path)
        df = standardize_columns(df, source_name=file_path.stem)
        frames.append(df)

    merged = pd.concat(frames, ignore_index=True)
    LOGGER.info("Loaded %d raw rows", len(merged))

    cleaned = clean_dataframe(
        merged,
        min_chars=args.min_chars,
        max_chars=args.max_chars,
        min_length_ratio=args.min_length_ratio,
        max_length_ratio=args.max_length_ratio,
        allowed_langs=allowed_langs,
        excluded_source_names=excluded_source_names,
        min_quality_score=args.min_quality_score,
    )
    LOGGER.info("Retained %d cleaned rows", len(cleaned))

    if len(cleaned) < 50:
        LOGGER.warning("Very small dataset after cleaning: %d rows", len(cleaned))

    train_df, test_df = train_test_split(cleaned, test_size=args.test_size, random_state=args.seed, shuffle=True)
    train_df, valid_df = train_test_split(
        train_df,
        test_size=args.valid_size / max(1e-8, (1.0 - args.test_size)),
        random_state=args.seed,
        shuffle=True,
    )

    splits = {
        "train": train_df.reset_index(drop=True),
        "valid": valid_df.reset_index(drop=True),
        "test": test_df.reset_index(drop=True),
    }

    summary = build_summary(cleaned, splits)
    for split_name, split_df in splits.items():
        rows = [to_instruction_record(row) for _, row in split_df.iterrows()]
        out_path = output_dir / f"{split_name}.jsonl"
        write_jsonl(out_path, rows)
        LOGGER.info("Wrote %s with %d rows", out_path, len(rows))

    summary_path = output_dir / "summary.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    LOGGER.info("Wrote summary to %s", summary_path)


if __name__ == "__main__":
    main()
