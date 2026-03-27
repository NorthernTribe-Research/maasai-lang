"""
Text preprocessing utilities for Maasai and English text.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any


def normalize_unicode(text: str) -> str:
    """Normalize to NFC form to stabilize Maasai diacritics."""
    return unicodedata.normalize("NFC", text)


def normalize_whitespace(text: str) -> str:
    """Collapse multiple whitespace to single space, strip edges."""
    return re.sub(r"\s+", " ", text).strip()


def normalize_quotes(text: str) -> str:
    """Standardize smart quotes to ASCII equivalents."""
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    return text


def normalize_punctuation(text: str) -> str:
    """Light punctuation normalization."""
    # Standardize dashes
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    # Remove zero-width characters
    text = re.sub(r"[\u200b\u200c\u200d\ufeff]", "", text)
    return text


def clean_text(text: Any) -> str:
    """Full cleaning pipeline for a text string."""
    if text is None:
        return ""
    text = str(text)
    text = normalize_unicode(text)
    text = normalize_quotes(text)
    text = normalize_punctuation(text)
    text = normalize_whitespace(text)
    return text


def is_valid_pair(
    source: str,
    target: str,
    min_chars: int = 2,
    max_chars: int = 400,
    min_ratio: float = 0.15,
    max_ratio: float = 6.0,
) -> bool:
    """Check if a source-target pair passes quality filters."""
    if not source or not target:
        return False
    if len(source) < min_chars or len(target) < min_chars:
        return False
    if len(source) > max_chars or len(target) > max_chars:
        return False
    if source == target:
        return False
    ratio = len(target) / max(len(source), 1)
    if ratio < min_ratio or ratio > max_ratio:
        return False
    # Reject strings that are only punctuation/whitespace
    if re.fullmatch(r"[\W_]+", source) or re.fullmatch(r"[\W_]+", target):
        return False
    return True
