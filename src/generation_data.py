"""
Helpers for augmenting the translation corpus with Maa generation tasks.

The goal is to keep translation quality while teaching the model to compose
Maa sentences, devotional passages, and short stories from semantic prompts.
"""

from __future__ import annotations

import json
import random
import re
from pathlib import Path
from typing import Any

CONTENT_STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "he",
    "her",
    "his",
    "in",
    "is",
    "it",
    "its",
    "of",
    "on",
    "or",
    "she",
    "that",
    "the",
    "their",
    "them",
    "there",
    "they",
    "this",
    "to",
    "was",
    "were",
    "will",
    "with",
    "you",
    "your",
}

BIBLE_THEME_KEYWORDS = {
    "creation": {"beginning", "create", "created", "creation", "earth", "heaven", "light"},
    "faith": {"believe", "believed", "faith", "hope", "trust"},
    "love": {"beloved", "charity", "compassion", "love", "loved", "loving"},
    "prayer": {"ask", "asked", "pray", "prayer", "praying", "supplication"},
    "salvation": {"eternal", "grace", "redeem", "redeemed", "salvation", "save", "saved"},
    "wisdom": {"instruction", "understanding", "wise", "wisdom"},
    "peace": {"peace", "peacemaker", "rest", "shalom"},
    "mercy": {"forgive", "forgiven", "forgiveness", "mercy", "merciful"},
    "obedience": {"commandment", "commandments", "obey", "obedience"},
    "kingdom": {"glory", "king", "kingdom", "lord", "reign", "throne"},
}


def build_translation_prompt(source_text: str, source_lang: Any, target_lang: Any) -> str:
    source_lang = str(source_lang or "").strip().lower()
    target_lang = str(target_lang or "").strip().lower()
    source_text = str(source_text or "").strip()

    if source_lang == "en" and target_lang == "mas":
        return f'Translate the following English sentence to Maasai:\n"{source_text}"'
    if source_lang == "mas" and target_lang == "en":
        return f'Translate the following Maasai sentence to English:\n"{source_text}"'
    if source_lang and target_lang:
        return f'Translate from {source_lang} to {target_lang}:\n"{source_text}"'
    return f'Translate the following sentence:\n"{source_text}"'


def ensure_instruction_record(row: dict[str, Any]) -> dict[str, Any]:
    prompt = row.get("prompt")
    completion = row.get("completion")

    if prompt is None or completion is None:
        prompt = build_translation_prompt(
            source_text=row.get("source_text", ""),
            source_lang=row.get("source_lang", ""),
            target_lang=row.get("target_lang", ""),
        )
        completion = row.get("target_text", "")

    record = dict(row)
    record["task"] = str(record.get("task") or "translation")
    record["prompt"] = str(prompt).strip()
    record["completion"] = str(completion).strip()
    return record


def _word_count(text: str) -> int:
    return len(re.findall(r"\b\S+\b", text))


def _sentence_count(text: str) -> int:
    return len(re.findall(r"[.!?]+", text))


def _is_passage_text(text: str) -> bool:
    return "\n" in text or _sentence_count(text) >= 2


def _generation_shape(source_text: str, target_text: str, domain: str) -> str | None:
    source_words = _word_count(source_text)
    target_words = _word_count(target_text)
    normalized_domain = domain.strip().lower()

    if normalized_domain == "lexicon":
        return None
    if source_words <= 2 and target_words <= 2 and normalized_domain != "greetings":
        return None
    if _is_passage_text(source_text) or _is_passage_text(target_text):
        return "passage"
    return "sentence"


def _make_record(
    base: dict[str, Any],
    *,
    task: str,
    prompt: str,
    completion: str,
    source_name_suffix: str,
    notes: str,
) -> dict[str, Any]:
    record = dict(base)
    record["task"] = task
    record["prompt"] = prompt.strip()
    record["completion"] = completion.strip()
    record["source_text"] = prompt.strip()
    record["target_text"] = completion.strip()
    record["source_lang"] = "en"
    record["target_lang"] = "mas"
    record["source_name"] = f"{base.get('source_name', 'unknown')}_{source_name_suffix}"
    record["notes"] = notes
    return record


def build_sentence_generation_record(row: dict[str, Any]) -> dict[str, Any] | None:
    source_lang = str(row.get("source_lang", "")).strip().lower()
    target_lang = str(row.get("target_lang", "")).strip().lower()
    if source_lang != "en" or target_lang != "mas":
        return None

    source_text = str(row.get("source_text", "")).strip()
    target_text = str(row.get("target_text", "")).strip()
    if not source_text or not target_text:
        return None

    domain = str(row.get("domain", "general")).strip().lower()
    shape = _generation_shape(source_text, target_text, domain)
    if shape is None:
        return None

    prompt = f'Write one natural Maa sentence that conveys this meaning:\n"{source_text}"'
    task = "maasai_sentence_generation"
    notes = "Derived Maa sentence-generation instruction from aligned translation data."

    if shape == "passage":
        prompt = f'Write a short Maa passage that conveys this meaning:\n"{source_text}"'
        task = "maasai_passage_generation"
        notes = "Derived Maa passage-generation instruction from aligned translation data."

    if domain in {"bible", "religion"}:
        if shape == "passage":
            prompt = f'Write a short Maa devotional passage in a Biblical register about this theme:\n"{source_text}"'
            task = "maasai_biblical_passage_generation_direct"
            notes = "Derived Biblical-register Maa passage-generation instruction from aligned scripture data."
        else:
            prompt = f'Write one Maa sentence in a Biblical register that conveys this idea:\n"{source_text}"'
            task = "maasai_biblical_sentence_generation"
            notes = "Derived Biblical-register Maa generation instruction from aligned scripture data."
    elif domain in {"greetings"}:
        if shape == "passage":
            prompt = f'Write a short Maa greeting message about this situation:\n"{source_text}"'
            task = "maasai_greeting_message_generation"
        else:
            prompt = f'Compose a short Maa greeting that means:\n"{source_text}"'
            task = "maasai_greeting_generation"
    elif domain in {"proverbs", "philosophy"}:
        if shape == "passage":
            prompt = f'Write a short Maa reflection that expresses this lesson:\n"{source_text}"'
            task = "maasai_reflection_generation"
        else:
            prompt = f'Express this lesson as one natural Maa sentence:\n"{source_text}"'
            task = "maasai_wisdom_generation"
    elif domain in {"culture", "ceremony", "education", "governance", "kinship"}:
        if shape == "passage":
            prompt = f'Write a short culturally grounded Maa passage about this theme:\n"{source_text}"'
            task = "maasai_cultural_passage_generation"
        else:
            prompt = f'Write one culturally grounded Maa sentence about this idea:\n"{source_text}"'
            task = "maasai_cultural_generation"
    elif domain in {"environment", "livestock", "daily_life", "health"}:
        if shape == "passage":
            prompt = f'Write a short Maa passage about this situation:\n"{source_text}"'
            task = "maasai_descriptive_passage_generation"
        else:
            prompt = f'Write one natural Maa sentence about this situation:\n"{source_text}"'
            task = "maasai_descriptive_generation"

    return _make_record(
        row,
        task=task,
        prompt=prompt,
        completion=target_text,
        source_name_suffix="generation",
        notes=notes,
    )


def _id_sort_key(row: dict[str, Any]) -> tuple[int, str]:
    raw_id = str(row.get("id", ""))
    match = re.search(r"(\d+)$", raw_id)
    suffix = int(match.group(1)) if match else -1
    return suffix, raw_id


def build_bible_passage_records(
    rows: list[dict[str, Any]],
    *,
    window: int,
    max_records: int,
) -> list[dict[str, Any]]:
    if window < 2 or max_records <= 0:
        return []

    bible_rows = [
        row
        for row in rows
        if str(row.get("source_lang", "")).strip().lower() == "en"
        and str(row.get("target_lang", "")).strip().lower() == "mas"
        and str(row.get("domain", "")).strip().lower() in {"bible", "religion"}
        and float(row.get("quality_score", 0.0) or 0.0) >= 0.9
        and row.get("id")
    ]
    bible_rows.sort(key=_id_sort_key)

    records: list[dict[str, Any]] = []
    for idx in range(0, len(bible_rows) - window + 1, window):
        chunk = bible_rows[idx:idx + window]
        if len(chunk) < window:
            continue

        prompt_lines = "\n".join(f"- {str(item.get('source_text', '')).strip()}" for item in chunk)
        completion = "\n\n".join(str(item.get("target_text", "")).strip() for item in chunk)
        if not prompt_lines.strip() or not completion.strip():
            continue

        base = dict(chunk[0])
        base["id"] = f"{chunk[0].get('id', 'bible')}-passage"
        records.append(
            _make_record(
                base,
                task="maasai_biblical_passage_generation",
                prompt=(
                    "Render these related Biblical ideas in Maa as one connected short devotional passage.\n"
                    "Preserve their order and keep a Biblical register:\n"
                    f"{prompt_lines}"
                ),
                completion=completion,
                source_name_suffix="passage_generation",
                notes="Derived multi-sentence Maa passage-generation task from aligned Biblical context windows.",
            )
        )
        if len(records) >= max_records:
            break

    return records


def _content_tokens(text: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[A-Za-z']+", text.lower())
        if len(token) > 2 and token not in CONTENT_STOPWORDS
    }


def _bible_themes(text: str) -> set[str]:
    tokens = _content_tokens(text)
    return {
        theme
        for theme, keywords in BIBLE_THEME_KEYWORDS.items()
        if tokens & keywords
    }


def _row_reference_label(row: dict[str, Any]) -> str:
    for key in ("reference", "verse_ref", "verse_reference"):
        value = str(row.get(key, "")).strip()
        if value:
            return value

    book = str(row.get("book", "")).strip()
    chapter = str(row.get("chapter", "")).strip()
    verse = str(row.get("verse", "")).strip()
    if book and chapter and verse:
        return f"{book} {chapter}:{verse}"
    return str(row.get("id", "unknown-reference")).strip() or "unknown-reference"


def _related_bible_rows(
    primary: dict[str, Any],
    candidates: list[dict[str, Any]],
    *,
    limit: int,
) -> list[dict[str, Any]]:
    primary_text = str(primary.get("source_text", "")).strip()
    primary_tokens = _content_tokens(primary_text)
    primary_themes = _bible_themes(primary_text)
    primary_book = str(primary.get("book", "")).strip().lower()

    scored: list[tuple[float, dict[str, Any]]] = []
    for candidate in candidates:
        if candidate is primary:
            continue

        candidate_text = str(candidate.get("source_text", "")).strip()
        candidate_tokens = _content_tokens(candidate_text)
        if not candidate_tokens:
            continue

        overlap = len(primary_tokens & candidate_tokens)
        theme_overlap = len(primary_themes & _bible_themes(candidate_text))
        same_book = 1 if primary_book and primary_book == str(candidate.get("book", "")).strip().lower() else 0
        score = float(theme_overlap * 10 + overlap * 3 + same_book)
        if score <= 0:
            continue
        scored.append((score, candidate))

    scored.sort(
        key=lambda item: (
            -item[0],
            _row_reference_label(item[1]),
            str(item[1].get("id", "")),
        )
    )
    return [candidate for _, candidate in scored[:limit]]


def build_bible_cross_reference_records(
    rows: list[dict[str, Any]],
    *,
    max_records: int,
    related_window: int = 2,
) -> list[dict[str, Any]]:
    if max_records <= 0 or related_window <= 0:
        return []

    bible_rows = [
        row
        for row in rows
        if str(row.get("source_lang", "")).strip().lower() == "en"
        and str(row.get("target_lang", "")).strip().lower() == "mas"
        and str(row.get("domain", "")).strip().lower() in {"bible", "religion"}
        and str(row.get("source_text", "")).strip()
        and str(row.get("target_text", "")).strip()
    ]
    bible_rows.sort(key=_id_sort_key)

    records: list[dict[str, Any]] = []
    seen_signatures: set[tuple[str, tuple[str, ...]]] = set()

    for primary in bible_rows:
        related = _related_bible_rows(primary, bible_rows, limit=related_window)
        if len(related) < related_window:
            continue

        related_refs = tuple(_row_reference_label(row) for row in related)
        signature = (_row_reference_label(primary), related_refs)
        if signature in seen_signatures:
            continue
        seen_signatures.add(signature)

        primary_ref = _row_reference_label(primary)
        context_lines = "\n".join(
            f'- {_row_reference_label(row)}: "{str(row.get("source_text", "")).strip()}"'
            for row in related
        )
        prompt = (
            "Translate the primary Biblical idea into Maa using the cross-reference context to keep the meaning clear.\n"
            f'Primary verse ({primary_ref}): "{str(primary.get("source_text", "")).strip()}"\n'
            "Related verses for context:\n"
            f"{context_lines}\n"
            "Keep a Biblical register and preserve the meaning of the primary verse."
        )

        base = dict(primary)
        base["id"] = f"{str(primary.get('id', 'bible'))}-crossref"
        records.append(
            _make_record(
                base,
                task="maasai_biblical_cross_reference_generation",
                prompt=prompt,
                completion=str(primary.get("target_text", "")).strip(),
                source_name_suffix="cross_reference",
                notes="Derived Bible cross-reference generation task with semantically related verse context.",
            )
        )
        if len(records) >= max_records:
            break

    return records


def _story_opening_and_remainder(text: str) -> tuple[str | None, str | None]:
    paragraphs = [part.strip() for part in text.split("\n\n") if part.strip()]
    if len(paragraphs) >= 2:
        opening = paragraphs[0]
        remainder = "\n\n".join(paragraphs[1:]).strip()
        return (opening, remainder) if remainder else (None, None)

    sentence_parts = re.split(r"(?<=[.!?])\s+", text.strip(), maxsplit=1)
    if len(sentence_parts) == 2:
        opening, remainder = sentence_parts
        return opening.strip(), remainder.strip()
    return None, None


def load_story_seed_records(path: Path, split_name: str) -> list[dict[str, Any]]:
    if not path.exists():
        return []

    records: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            split = str(row.get("split", "train")).strip().lower()
            if split != split_name:
                continue

            base = dict(row)
            base.setdefault("source_name", "story_generation_seed")
            base.setdefault("quality_score", 1.0)
            base.setdefault("domain", "story_generation")
            base.setdefault("notes", "Seed Maa story generation prompt.")

            prompt = str(base.get("prompt", "")).strip()
            completion = str(base.get("completion", "")).strip()
            if not prompt or not completion:
                continue

            full_record = {
                **base,
                "task": "maasai_story_generation",
                "source_lang": "en",
                "target_lang": "mas",
                "source_text": prompt,
                "target_text": completion,
                "prompt": prompt,
                "completion": completion,
            }
            records.append(full_record)

            opening, remainder = _story_opening_and_remainder(completion)
            if opening and remainder:
                records.append(
                    {
                        **base,
                        "task": "maasai_story_continuation",
                        "source_lang": "mas",
                        "target_lang": "mas",
                        "source_text": opening,
                        "target_text": remainder,
                        "prompt": f'Continue this Maa story naturally after this opening:\n"{opening}"',
                        "completion": remainder,
                        "source_name": f"{base['source_name']}_continuation",
                        "notes": "Derived Maa story-continuation task from story-generation seed.",
                    }
                )

    return records


def repeat_records(records: list[dict[str, Any]], factor: int) -> list[dict[str, Any]]:
    if factor <= 1:
        return [dict(record) for record in records]

    repeated: list[dict[str, Any]] = []
    for copy_idx in range(factor):
        for record in records:
            clone = dict(record)
            if copy_idx:
                clone["notes"] = f"{clone.get('notes', '')} Repeated for generation weighting.".strip()
            repeated.append(clone)
    return repeated


def build_instruction_mixture(
    rows: list[dict[str, Any]],
    split_name: str,
    *,
    story_seed_file: Path | None,
    max_bible_passages: int,
    bible_passage_window: int,
    seed: int,
    max_bible_cross_reference_records: int = 24,
) -> list[dict[str, Any]]:
    mixture = [ensure_instruction_record(row) for row in rows]

    generation_rows = [
        record
        for row in rows
        for record in [build_sentence_generation_record(row)]
        if record is not None
    ]
    mixture.extend(generation_rows)
    mixture.extend(
        build_bible_passage_records(
            rows,
            window=bible_passage_window,
            max_records=max_bible_passages,
        )
    )
    mixture.extend(
        build_bible_cross_reference_records(
            rows,
            max_records=max_bible_cross_reference_records if split_name == "train" else max(1, max_bible_cross_reference_records // 4),
            related_window=2,
        )
    )

    if story_seed_file is not None:
        story_records = load_story_seed_records(story_seed_file, split_name)
        story_repeat_factor = 16 if split_name == "train" else 8
        mixture.extend(repeat_records(story_records, story_repeat_factor))

    rng = random.Random(seed + (0 if split_name == "train" else 10_000))
    rng.shuffle(mixture)
    return mixture
