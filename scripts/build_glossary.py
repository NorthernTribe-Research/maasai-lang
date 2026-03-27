#!/usr/bin/env python3
"""
Build and validate the Maasai glossary from the JSON source.

Usage:
    python scripts/build_glossary.py --input data/glossary/maasai_glossary.json
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from collections import Counter

LOGGER = logging.getLogger("build_glossary")


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=str, default="data/glossary/maasai_glossary.json")
    return parser.parse_args()


def main() -> None:
    setup_logging()
    args = parse_args()

    path = Path(args.input)
    if not path.exists():
        LOGGER.error("Glossary file not found: %s", path)
        return

    with path.open("r", encoding="utf-8") as f:
        entries = json.load(f)

    LOGGER.info("Loaded %d glossary entries", len(entries))

    # Validation
    issues = []
    seen_terms = set()
    for i, entry in enumerate(entries):
        term = entry.get("term_maasai", "")
        if not term:
            issues.append(f"Entry {i}: missing term_maasai")
        if term.lower() in seen_terms:
            issues.append(f"Entry {i}: duplicate term '{term}'")
        seen_terms.add(term.lower())

        if not entry.get("term_english"):
            issues.append(f"Entry {i} ({term}): missing term_english")
        if not entry.get("domain"):
            issues.append(f"Entry {i} ({term}): missing domain")

    if issues:
        LOGGER.warning("Found %d issues:", len(issues))
        for issue in issues:
            LOGGER.warning("  %s", issue)
    else:
        LOGGER.info("No validation issues found")

    # Stats
    domain_counts = Counter(e.get("domain", "unknown") for e in entries)
    pos_counts = Counter(e.get("part_of_speech", "unknown") for e in entries)
    subtribe_counts = Counter(e.get("subtribe", "") for e in entries if e.get("subtribe"))
    preserve_count = sum(1 for e in entries if e.get("preserve", False))

    LOGGER.info("\n=== Glossary Statistics ===")
    LOGGER.info("Total entries: %d", len(entries))
    LOGGER.info("Protected terms: %d", preserve_count)
    LOGGER.info("\nBy domain:")
    for domain, count in domain_counts.most_common():
        LOGGER.info("  %s: %d", domain, count)
    LOGGER.info("\nBy part of speech:")
    for pos, count in pos_counts.most_common():
        LOGGER.info("  %s: %d", pos, count)
    if subtribe_counts:
        LOGGER.info("\nBy sub-tribe:")
        for st, count in subtribe_counts.most_common():
            LOGGER.info("  %s: %d", st, count)


if __name__ == "__main__":
    main()
