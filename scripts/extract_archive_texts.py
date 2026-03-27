#!/usr/bin/env python3
"""
Extract reusable Maasai training data from public/open sources.

This script intentionally avoids the old behavior of chunking English OCR
prose and mislabeling it as Maasai. Instead it produces conservative,
traceable records from:

- A.C. Hollis, "The Masai: their language and folklore" (1905, public domain)
- ASJP Maasai wordlist (CC BY 4.0)

The Hinde grammar text is cached for future work, but not automatically
converted into MT pairs here because the OCR layout needs more careful
parsing than a first-pass ingest should attempt.
"""

from __future__ import annotations

import argparse
import json
import re
import urllib.request
from pathlib import Path
from typing import Any


HOLLIS_URL = "https://archive.org/download/masaitheirlangua00holluoft/masaitheirlangua00holluoft_djvu.txt"
HINDE_URL = "https://archive.org/download/masailanguagegra00hindrich/masailanguagegra00hindrich_djvu.txt"
ASJP_URL = "https://asjp.clld.org/languages/MAASAI.json"

DEFAULT_HOLLIS_CACHE = Path("data/external_hollis_maasai_1905.txt")
DEFAULT_HINDE_CACHE = Path("data/external_hinde_maasai_1901.txt")
DEFAULT_ASJP_CACHE = Path("data/external_asjp_maasai.json")

HOLLIS_OUTPUT = Path("data/raw/public_domain_hollis_proverbs.jsonl")
ASJP_OUTPUT = Path("data/raw/open_asjp_maasai_wordlist.jsonl")
MANIFEST_OUTPUT = Path("data/raw/open_source_manifest.json")

HOLLIS_SOURCE_NAME = "hollis_1905_public_domain"
ASJP_SOURCE_NAME = "asjp_maasai_cc_by_4"

ENGLISH_STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "be",
    "because",
    "do",
    "for",
    "from",
    "has",
    "have",
    "he",
    "her",
    "him",
    "his",
    "how",
    "i",
    "if",
    "in",
    "is",
    "it",
    "like",
    "my",
    "not",
    "of",
    "or",
    "our",
    "she",
    "that",
    "the",
    "their",
    "there",
    "they",
    "this",
    "to",
    "was",
    "we",
    "what",
    "when",
    "why",
    "with",
    "you",
    "your",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract open Maasai source material into JSONL")
    parser.add_argument("--hollis-cache", type=Path, default=DEFAULT_HOLLIS_CACHE)
    parser.add_argument("--hinde-cache", type=Path, default=DEFAULT_HINDE_CACHE)
    parser.add_argument("--asjp-cache", type=Path, default=DEFAULT_ASJP_CACHE)
    parser.add_argument("--hollis-output", type=Path, default=HOLLIS_OUTPUT)
    parser.add_argument("--asjp-output", type=Path, default=ASJP_OUTPUT)
    parser.add_argument("--manifest-output", type=Path, default=MANIFEST_OUTPUT)
    parser.add_argument("--timeout", type=int, default=60)
    return parser.parse_args()


def fetch_text(url: str, cache_path: Path, timeout: int) -> str:
    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8", errors="ignore")

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        text = response.read().decode("utf-8", errors="ignore")
    cache_path.write_text(text, encoding="utf-8")
    return text


def normalize_space(text: str) -> str:
    text = text.replace("\u00a0", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def looks_like_gloss(line: str) -> bool:
    tokens = line.split()
    if not tokens:
        return False
    hyphenated = sum(1 for token in tokens if "-" in token)
    return hyphenated >= 1 and hyphenated >= max(1, len(tokens) // 3)


def looks_like_comment(line: str) -> bool:
    return line.startswith("[")


def looks_like_english_free_translation(line: str) -> bool:
    if not line or looks_like_gloss(line) or looks_like_comment(line):
        return False
    if line.startswith("Also"):
        return False

    words = re.findall(r"[A-Za-z']+", line)
    if len(words) < 3:
        return False

    if any(word.lower() in ENGLISH_STOPWORDS for word in words[:3]):
        return True
    return line[0].isupper()


def clean_maa_text(text: str) -> str:
    text = normalize_space(text)
    text = re.sub(r"\s+\d+(?=[.?!]?$)", "", text)
    return text


def clean_english_text(text: str) -> str:
    text = normalize_space(text)
    text = text.replace(" ,", ",").replace(" .", ".")
    text = text.replace(" ?", "?").replace(" !", "!")
    return text


def build_bidirectional_record(
    *,
    source_text: str,
    target_text: str,
    source_lang: str,
    target_lang: str,
    domain: str,
    source_name: str,
    quality_score: float,
    notes: str,
) -> dict[str, Any]:
    return {
        "source_text": source_text,
        "target_text": target_text,
        "source_lang": source_lang,
        "target_lang": target_lang,
        "domain": domain,
        "source_name": source_name,
        "quality_score": quality_score,
        "notes": notes,
    }


def make_bidirectional_pair_records(
    maa_text: str,
    english_text: str,
    *,
    domain: str,
    source_name: str,
    quality_score: float,
    notes: str,
) -> list[dict[str, Any]]:
    return [
        build_bidirectional_record(
            source_text=maa_text,
            target_text=english_text,
            source_lang="mas",
            target_lang="en",
            domain=domain,
            source_name=source_name,
            quality_score=quality_score,
            notes=notes,
        ),
        build_bidirectional_record(
            source_text=english_text,
            target_text=maa_text,
            source_lang="en",
            target_lang="mas",
            domain=domain,
            source_name=source_name,
            quality_score=quality_score,
            notes=notes,
        ),
    ]


def extract_hollis_proverbs(text: str) -> list[dict[str, Any]]:
    start_match = re.search(r"No\.\s+1\.", text)
    end_match = re.search(r"ILLUSTRATIVE\s+PROVERBS\s+AND\s+SAYINGS", text)
    if not start_match or not end_match or start_match.start() >= end_match.start():
        raise RuntimeError("Could not locate Hollis proverb section")

    proverb_section = text[start_match.start():end_match.start()]
    blocks = [
        block
        for block in re.split(r"(?=No\.\s+\d+\.)", proverb_section)
        if block.strip()
    ]

    records: list[dict[str, Any]] = []
    for block in blocks:
        number_match = re.match(r"No\.\s+(\d+)\.", block)
        proverb_number = number_match.group(1) if number_match else "unknown"
        body = re.sub(r"^No\.\s+\d+\.\s*", "", block).strip()

        subblocks: list[str] = []
        current: list[str] = []
        for raw_line in body.splitlines():
            line = raw_line.strip()
            if line.startswith("Also") and current:
                subblocks.append("\n".join(current))
                current = [line]
            else:
                current.append(line)
        if current:
            subblocks.append("\n".join(current))

        for variant_index, subblock in enumerate(subblocks, start=1):
            lines = [normalize_space(line) for line in subblock.splitlines() if normalize_space(line)]
            if not lines:
                continue

            if lines[0].startswith("Also"):
                parts = lines[0].split(":", 1)
                lines[0] = normalize_space(parts[1]) if len(parts) == 2 else ""
                lines = [line for line in lines if line]
                if not lines:
                    continue

            free_translation_index = None
            for index, line in enumerate(lines):
                if looks_like_english_free_translation(line):
                    free_translation_index = index
                    break

            if free_translation_index is None:
                continue

            maa_lines = lines[:free_translation_index:2]
            english_lines: list[str] = []
            for line in lines[free_translation_index:]:
                if looks_like_comment(line):
                    break
                english_lines.append(line)

            maa_text = clean_maa_text(" ".join(maa_lines))
            english_text = clean_english_text(" ".join(english_lines))
            if not maa_text or not english_text:
                continue

            # Drop OCR-corrupted rows that still include page headers or gloss junk.
            if "MASAI PROVERBS AND SAYINGS" in english_text:
                continue
            if english_text.count("(") >= 2:
                continue

            notes = (
                f"Public-domain proverb pair from Hollis 1905, proverb {proverb_number}"
                f"{'' if variant_index == 1 else f' variant {variant_index}'}."
            )
            records.extend(
                make_bidirectional_pair_records(
                    maa_text=maa_text,
                    english_text=english_text,
                    domain="proverbs",
                    source_name=HOLLIS_SOURCE_NAME,
                    quality_score=0.94,
                    notes=notes,
                )
            )

    # Deduplicate exact pairs while preserving order.
    deduped: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str, str]] = set()
    for record in records:
        key = (
            record["source_lang"],
            record["target_lang"],
            record["source_text"],
            record["target_text"],
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(record)
    return deduped


def extract_asjp_wordlist(raw_json: str) -> list[dict[str, Any]]:
    payload = json.loads(raw_json)
    txt = str(payload.get("txt", ""))
    records: list[dict[str, Any]] = []

    for line in txt.splitlines():
        line = line.strip()
        if not line or "\t" not in line:
            continue
        match = re.match(r"\d+\s+(.+?)\t(.+?)\s*//\s*$", line)
        if not match:
            continue

        english_gloss = clean_english_text(match.group(1))
        maa_forms = clean_maa_text(match.group(2))
        if not english_gloss or not maa_forms:
            continue

        notes = "ASJP Maasai lexical pair (CC BY 4.0) derived from the published wordlist."
        records.extend(
            make_bidirectional_pair_records(
                maa_text=maa_forms,
                english_text=english_gloss,
                domain="lexicon",
                source_name=ASJP_SOURCE_NAME,
                quality_score=0.92,
                notes=notes,
            )
        )

    deduped: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str, str]] = set()
    for record in records:
        key = (
            record["source_lang"],
            record["target_lang"],
            record["source_text"],
            record["target_text"],
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(record)
    return deduped


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def write_manifest(path: Path) -> None:
    manifest = {
        "sources": [
            {
                "id": HOLLIS_SOURCE_NAME,
                "title": "The Masai: their language and folklore",
                "year": 1905,
                "license": "Public domain",
                "url": HOLLIS_URL,
                "usage": "Bidirectional proverb translation pairs",
            },
            {
                "id": "hinde_1901_public_domain_reference",
                "title": "The Masai language: grammatical notes together with a vocabulary",
                "year": 1901,
                "license": "Public domain",
                "url": HINDE_URL,
                "usage": "Cached for future vocabulary extraction; not auto-ingested in this first pass",
            },
            {
                "id": ASJP_SOURCE_NAME,
                "title": "ASJP Maasai wordlist",
                "license": "CC BY 4.0",
                "url": ASJP_URL,
                "usage": "Bidirectional lexical translation pairs",
            },
        ]
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def main() -> None:
    args = parse_args()

    hollis_text = fetch_text(HOLLIS_URL, args.hollis_cache, args.timeout)
    fetch_text(HINDE_URL, args.hinde_cache, args.timeout)
    asjp_json = fetch_text(ASJP_URL, args.asjp_cache, args.timeout)

    hollis_records = extract_hollis_proverbs(hollis_text)
    asjp_records = extract_asjp_wordlist(asjp_json)

    write_jsonl(args.hollis_output, hollis_records)
    write_jsonl(args.asjp_output, asjp_records)
    write_manifest(args.manifest_output)

    print(f"Wrote {len(hollis_records)} records to {args.hollis_output}")
    print(f"Wrote {len(asjp_records)} records to {args.asjp_output}")
    print(f"Wrote manifest to {args.manifest_output}")


if __name__ == "__main__":
    main()
