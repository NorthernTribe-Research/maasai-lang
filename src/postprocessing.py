"""
Post-processing utilities for model outputs.
"""

from __future__ import annotations

import re
from typing import Optional

from src.glossary import MaasaiGlossary


def strip_response_marker(text: str) -> str:
    """Remove the ### Response: marker from generated text."""
    marker = "### Response:"
    if marker in text:
        return text.split(marker, 1)[1].strip()
    return text.strip()


def strip_reasoning_artifacts(text: str) -> str:
    """Remove common reasoning wrappers when inference exposes them."""
    cleaned = text.strip()
    tag_patterns = [
        r"<thinking>.*?</thinking>",
        r"<thought>.*?</thought>",
        r"<reasoning>.*?</reasoning>",
    ]
    for pattern in tag_patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE | re.DOTALL)

    prefix_patterns = [
        r"^\s*(final answer|answer|translation)\s*:\s*",
    ]
    for pattern in prefix_patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def normalize_output_whitespace(text: str) -> str:
    """Clean up whitespace in generated output."""
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)
    return text.strip()


def truncate_at_eos(text: str) -> str:
    """Remove anything after common EOS patterns in generated text."""
    # Stop at double newline followed by another prompt-like pattern
    patterns = [
        r"\n\nTranslate the following",
        r"\n\n###",
        r"\n\n---",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            text = text[:match.start()]
    return text.strip()


def apply_glossary_corrections(
    text: str,
    glossary: Optional[MaasaiGlossary] = None,
    direction: str = "en_to_mas",
) -> str:
    """
    Apply glossary-based post-processing corrections.

    For en_to_mas: check that protected Maasai terms appear correctly.
    For mas_to_en: ensure cultural terms are preserved with context.
    """
    if glossary is None:
        return text

    # This is a simple implementation; more sophisticated matching
    # would use tokenization and fuzzy matching
    for entry in glossary.protected_terms():
        if direction == "mas_to_en":
            # If the English approximation appears but the Maasai original
            # is culturally important, add it in parentheses
            eng = entry.term_english
            mas = entry.term_maasai
            if eng.lower() in text.lower() and mas.lower() not in text.lower():
                text = re.sub(
                    re.escape(eng),
                    f"{eng} ({mas})",
                    text,
                    count=1,
                    flags=re.IGNORECASE,
                )
    return text


def postprocess(
    text: str,
    glossary: Optional[MaasaiGlossary] = None,
    direction: str = "en_to_mas",
) -> str:
    """Full post-processing pipeline."""
    text = strip_response_marker(text)
    text = strip_reasoning_artifacts(text)
    text = truncate_at_eos(text)
    text = normalize_output_whitespace(text)
    text = apply_glossary_corrections(text, glossary, direction)
    return text
