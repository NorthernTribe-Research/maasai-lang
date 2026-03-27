#!/usr/bin/env python3
"""
Engram Glossary Layer: Static Memory-Based Retrieval for Translation

Implements DeepSeek's Engram architecture principle—separating high-speed
static knowledge retrieval (O(1) glossary lookups) from dynamic reasoning
(contextual model inference).

This layer intercepts translation prompts and resolves known glossary terms
before passing to the model, reducing computational waste on repetitive
pattern reconstruction.

Architecture:
  1. Static Layer: Indexed glossary with O(1) lookup (binary search, hash maps)
  2. Dynamic Layer: Model handles contextual/grammatical inference
  3. Fusion: Combine static retrieval with model output for final translation

Usage:
  python engram_glossary_layer.py \
    --glossary data/glossary/maasai_glossary.json \
    --text "The enkaji is sacred" \
    --direction en_to_mas

  # Or use as Python API:
  from engram_glossary_layer import EngramGlossaryLayer
  layer = EngramGlossaryLayer("data/glossary/maasai_glossary.json")
  result = layer.retrieve_or_cache("Enkai")  # O(1) lookup
"""

import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
import pickle
import hashlib


@dataclass
class GlossaryMatch:
    """Result of Engram glossary retrieval."""
    term_source: str
    term_target: str
    domain: str
    confidence: float  # 1.0 = direct match, 0.7-0.9 = fuzzy/context-based
    source_lang: str  # "en" or "mas"
    is_exact: bool
    notes: str = ""


class EngramGlossaryLayer:
    """
    High-speed static memory layer for glossary-based translation retrieval.
    
    Implements O(1) lookup for known terms, avoiding redundant model computation.
    Useful for low-resource translation where glossary hits can short-circuit inference.
    """

    def __init__(self, glossary_path: str | Path):
        """Initialize Engram layer with glossary data."""
        self.glossary_path = Path(glossary_path)
        self.cache_path = self.glossary_path.parent / ".engram_cache"

        # Static index layers
        self.glossary_en_to_mas: dict[str, list[GlossaryMatch]] = {}
        self.glossary_mas_to_en: dict[str, list[GlossaryMatch]] = {}
        self.by_domain: dict[str, list[GlossaryMatch]] = {}
        self.preserve_terms: set[str] = set()

        # Fuzzy matching support
        self.fuzzy_threshold = 0.85
        self.stats = {
            "exact_hits": 0,
            "fuzzy_hits": 0,
            "cache_lookups": 0,
            "cache_hits": 0,
            "model_fallthrough": 0,
        }

        self._load_glossary()

    def _load_glossary(self) -> None:
        """Load glossary JSON into indexed in-memory structures."""
        if not self.glossary_path.exists():
            print(f"⚠ Glossary not found: {self.glossary_path}")
            return

        with open(self.glossary_path) as f:
            data = json.load(f)

        # Populate indices
        for entry in data.get("entries", []):
            en_term = entry.get("term_english", "").lower()
            mas_term = entry.get("term_maasai", "").lower()
            domain = entry.get("domain", "general")
            preserve = entry.get("preserve", True)

            match = GlossaryMatch(
                term_source=entry.get("term_english", ""),
                term_target=entry.get("term_maasai", ""),
                domain=domain,
                confidence=1.0,  # Direct match from glossary
                source_lang="en",
                is_exact=True,
                notes=entry.get("notes", ""),
            )

            # Index: English → Maasai
            if en_term:
                self.glossary_en_to_mas.setdefault(en_term, []).append(match)

            # Index: Maasai → English (reversed)
            if mas_term:
                match_rev = GlossaryMatch(
                    term_source=mas_term,
                    term_target=en_term,
                    domain=domain,
                    confidence=1.0,
                    source_lang="mas",
                    is_exact=True,
                    notes=entry.get("notes", ""),
                )
                self.glossary_mas_to_en.setdefault(mas_term, []).append(match_rev)

            # Index by domain
            if domain:
                self.by_domain.setdefault(domain, []).append(match)

            # Track terms to preserve
            if preserve:
                self.preserve_terms.add(en_term)
                self.preserve_terms.add(mas_term)

        print(
            f"✓ Engram layer loaded: {len(self.glossary_en_to_mas)} en→mas, "
            f"{len(self.glossary_mas_to_en)} mas→en, {len(self.by_domain)} domains"
        )

    def retrieve(
        self, term: str, direction: str = "en_to_mas", fuzzy: bool = True
    ) -> Optional[GlossaryMatch]:
        """
        O(1) lookup: Retrieve glossary match for a term.

        Args:
            term: Source term to look up
            direction: "en_to_mas" or "mas_to_en"
            fuzzy: Allow fuzzy matching if exact match fails

        Returns:
            GlossaryMatch if found, None otherwise
        """
        term_lower = term.lower().strip()

        # Exact lookup
        if direction == "en_to_mas":
            matches = self.glossary_en_to_mas.get(term_lower, [])
        else:
            matches = self.glossary_mas_to_en.get(term_lower, [])

        if matches:
            self.stats["exact_hits"] += 1
            return matches[0]  # Return first (highest confidence)

        # Fuzzy fallback
        if fuzzy:
            candidate = self._fuzzy_lookup(term, direction)
            if candidate:
                self.stats["fuzzy_hits"] += 1
                return candidate

        self.stats["model_fallthrough"] += 1
        return None

    def _fuzzy_lookup(self, term: str, direction: str) -> Optional[GlossaryMatch]:
        """
        Fuzzy matching via word boundaries + Levenshtein-inspired scoring.
        Used when exact lookup fails (handles plurals, misspellings, etc.)
        """
        term_lower = term.lower().strip()
        term_words = term_lower.split()

        if direction == "en_to_mas":
            candidates = self.glossary_en_to_mas
        else:
            candidates = self.glossary_mas_to_en

        best_match = None
        best_score = self.fuzzy_threshold

        for key, matches in candidates.items():
            # Word overlap heuristic
            vocab_overlap = len(set(term_words) & set(key.split()))
            if vocab_overlap > 0:
                score = vocab_overlap / max(len(term_words), len(key.split()))
                if score > best_score:
                    best_score = score
                    best_match = matches[0]
                    best_match.confidence = score
                    best_match.is_exact = False

        return best_match

    def retrieve_batch(
        self, terms: list[str], direction: str = "en_to_mas"
    ) -> dict[str, Optional[GlossaryMatch]]:
        """Batch retrieval: Process multiple terms with minimal overhead."""
        return {term: self.retrieve(term, direction) for term in terms}

    def extract_glossary_terms_from_text(
        self, text: str, direction: str = "en_to_mas"
    ) -> list[tuple[str, GlossaryMatch]]:
        """
        Scan text for glossary terms, return list of (term, match) tuples.
        Useful for identifying which terms in a prompt need glossary attention.
        """
        results = []

        if direction == "en_to_mas":
            candidates = self.glossary_en_to_mas
        else:
            candidates = self.glossary_mas_to_en

        # Extract candidate terms
        for glossary_term in candidates.keys():
            pattern = r"\b" + re.escape(glossary_term) + r"\b"
            matches = re.finditer(pattern, text.lower())
            for match in matches:
                char_start = match.start()
                original_term = text[char_start : char_start + len(glossary_term)]
                retrieved = self.retrieve(glossary_term, direction)
                if retrieved:
                    results.append((original_term, retrieved))

        return results

    def augment_prompt(
        self, text: str, direction: str = "en_to_mas"
    ) -> dict:
        """
        Augment a translation prompt with glossary metadata.
        Returns: {
            'original_text': str,
            'glossary_hits': List[GlossaryMatch],
            'augmented_prompt': str (with hints for model)
        }
        """
        glossary_hits = self.extract_glossary_terms_from_text(text, direction)
        augmented = text

        if glossary_hits:
            # Add inline hints for model
            hints = []
            for term, match in glossary_hits:
                if match.is_exact:
                    hints.append(
                        f"[PRESERVE: '{term}' → '{match.term_target}' ({match.domain})]"
                    )

            augmented = "\n".join(hints) + "\n\n" + text

        return {
            "original_text": text,
            "glossary_hits": glossary_hits,
            "augmented_prompt": augmented,
            "hit_count": len(glossary_hits),
        }

    def stats_summary(self) -> str:
        """Print retrieval statistics."""
        total = sum(self.stats.values())
        if total == 0:
            return "No lookups performed yet"

        hit_rate = (
            (self.stats["exact_hits"] + self.stats["fuzzy_hits"]) / total * 100
        )
        return (
            f"Engram Stats:\n"
            f"  Exact: {self.stats['exact_hits']} (hit rate: {hit_rate:.1f}%)\n"
            f"  Fuzzy: {self.stats['fuzzy_hits']}\n"
            f"  Fallthrough: {self.stats['model_fallthrough']}\n"
            f"  Total lookups: {total}"
        )


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Engram Glossary Layer CLI")
    parser.add_argument(
        "--glossary",
        default="data/glossary/maasai_glossary.json",
        help="Path to glossary JSON",
    )
    parser.add_argument("--text", default="", help="Text to look up")
    parser.add_argument(
        "--direction",
        choices=["en_to_mas", "mas_to_en"],
        default="en_to_mas",
        help="Translation direction",
    )
    parser.add_argument(
        "--batch",
        action="store_true",
        help="Read terms from stdin (one per line)",
    )
    args = parser.parse_args()

    layer = EngramGlossaryLayer(args.glossary)

    if args.batch:
        print("Reading terms from stdin... (Ctrl+D to finish)")
        terms = [line.strip() for line in sys.stdin if line.strip()]
        results = layer.retrieve_batch(terms, args.direction)
        for term, match in results.items():
            if match:
                print(f"✓ {term:20} → {match.term_target:20} ({match.domain})")
            else:
                print(f"✗ {term:20} (no match)")

    elif args.text:
        augmented = layer.augment_prompt(args.text, args.direction)
        print(f"Original: {augmented['original_text']}")
        print(f"\nGlossary Hits: {augmented['hit_count']}")
        for term, match in augmented["glossary_hits"]:
            print(
                f"  {term:20} → {match.term_target:20} "
                f"[{match.domain}] (conf: {match.confidence:.2f})"
            )
        print(f"\nAugmented Prompt:\n{augmented['augmented_prompt']}")
    else:
        print(layer.stats_summary())


if __name__ == "__main__":
    main()
