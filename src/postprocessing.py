"""
Post-processing utilities for model outputs.
"""

from __future__ import annotations

import re
from typing import Optional

from src.glossary import MaasaiGlossary

ENGLISH_FUNCTION_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "do",
    "for",
    "from",
    "how",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "their",
    "there",
    "they",
    "this",
    "to",
    "was",
    "were",
    "what",
    "when",
    "where",
    "who",
    "why",
    "with",
    "you",
    "your",
}

MAASAI_SIGNAL_WORDS = {
    "ajo",
    "aji",
    "enkai",
    "enkang",
    "enkop",
    "inkera",
    "inkishu",
    "iyie",
    "iyiook",
    "kake",
    "metaa",
    "nabo",
    "oleng",
    "oltau",
    "pee",
    "sidai",
    "supa",
    "taata",
}

MAASAI_SIGNAL_PREFIXES = (
    "enk",
    "ink",
    "olt",
    "olo",
    "olp",
    "ilm",
    "eme",
    "nai",
)


def lexical_tokens(text: str) -> list[str]:
    """Split text into normalized alphabetic tokens."""
    return re.findall(r"[A-Za-z']+", text.lower())


def maasai_signal_score(text: str) -> int:
    """Count lightweight Maa lexical cues in the text."""
    score = 0
    for token in lexical_tokens(text):
        if token in MAASAI_SIGNAL_WORDS:
            score += 2
        elif token.startswith(MAASAI_SIGNAL_PREFIXES):
            score += 1
    return score


def english_function_word_score(text: str) -> int:
    """Count lightweight English function-word cues in the text."""
    return sum(1 for token in lexical_tokens(text) if token in ENGLISH_FUNCTION_WORDS)


def source_overlap_ratio(source_text: str, output_text: str) -> float:
    """Measure how much the output repeats the source lexical content."""
    source_tokens = {token for token in lexical_tokens(source_text) if len(token) > 2}
    output_tokens = {token for token in lexical_tokens(output_text) if len(token) > 2}
    if not output_tokens:
        return 0.0
    return len(source_tokens & output_tokens) / len(output_tokens)


def has_english_leakage(
    output_text: str,
    *,
    source_text: str = "",
    direction: str = "en_to_mas",
) -> bool:
    """Heuristic check for English-heavy output where Maa is expected."""
    if direction not in {"en_to_mas", "English → Maasai"}:
        return False

    output_text = output_text.strip()
    if not output_text:
        return True

    english_score = english_function_word_score(output_text)
    maasai_score = maasai_signal_score(output_text)
    overlap_ratio = source_overlap_ratio(source_text, output_text) if source_text else 0.0

    if overlap_ratio >= 0.55:
        return True
    if english_score >= 3 and maasai_score == 0:
        return True
    if english_score >= max(3, maasai_score + 2):
        return True
    return False


def build_language_repair_prompt(source_text: str, draft_text: str, *, direction: str = "en_to_mas") -> str:
    """Build a repair prompt when translation output is too English-heavy."""
    if direction in {"en_to_mas", "English → Maasai"}:
        return (
            "Rewrite the translation as fluent natural Maa.\n"
            "Do not explain your reasoning.\n"
            "Do not repeat the English source text.\n"
            "Return only the final Maa translation.\n\n"
            f'English source:\n"{source_text.strip()}"\n\n'
            f'Weak draft:\n"{draft_text.strip()}"'
        )

    return (
        "Rewrite the translation so it is natural and faithful.\n"
        "Return only the final translation.\n\n"
        f'Source:\n"{source_text.strip()}"\n\n'
        f'Draft:\n"{draft_text.strip()}"'
    )


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
