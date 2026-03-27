"""
Glossary loader and utilities for Maasai terminology preservation.

The glossary ensures culturally significant terms are never flattened
into generic English during translation.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class GlossaryEntry:
    term_maasai: str
    term_english: str
    domain: str
    part_of_speech: str = ""
    alternate_spellings: list[str] | None = None
    preserve: bool = True
    notes: str = ""
    subtribe: str = ""  # e.g. "Laikipiak", "Samburu", etc.

    def to_dict(self) -> dict:
        return {
            "term_maasai": self.term_maasai,
            "term_english": self.term_english,
            "domain": self.domain,
            "part_of_speech": self.part_of_speech,
            "alternate_spellings": self.alternate_spellings or [],
            "preserve": self.preserve,
            "notes": self.notes,
            "subtribe": self.subtribe,
        }


class MaasaiGlossary:
    """Load and query the Maasai glossary."""

    def __init__(self, path: Optional[Path] = None):
        self.entries: list[GlossaryEntry] = []
        self._by_maasai: dict[str, GlossaryEntry] = {}
        self._by_english: dict[str, list[GlossaryEntry]] = {}
        if path and path.exists():
            self.load(path)

    def load(self, path: Path) -> None:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)

        for item in data:
            entry = GlossaryEntry(**item)
            self.entries.append(entry)
            self._by_maasai[entry.term_maasai.lower()] = entry
            eng_key = entry.term_english.lower()
            self._by_english.setdefault(eng_key, []).append(entry)

    def lookup_maasai(self, term: str) -> Optional[GlossaryEntry]:
        return self._by_maasai.get(term.lower())

    def lookup_english(self, term: str) -> list[GlossaryEntry]:
        return self._by_english.get(term.lower(), [])

    def protected_terms(self) -> list[GlossaryEntry]:
        return [e for e in self.entries if e.preserve]

    def terms_by_domain(self, domain: str) -> list[GlossaryEntry]:
        return [e for e in self.entries if e.domain == domain]

    def terms_by_subtribe(self, subtribe: str) -> list[GlossaryEntry]:
        return [e for e in self.entries if e.subtribe.lower() == subtribe.lower()]

    def __len__(self) -> int:
        return len(self.entries)
