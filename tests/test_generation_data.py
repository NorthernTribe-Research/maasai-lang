from __future__ import annotations

import unittest
from pathlib import Path

from src.generation_data import (
    build_bible_cross_reference_records,
    build_instruction_mixture,
    build_translation_prompt,
    ensure_instruction_record,
)


class GenerationDataTests(unittest.TestCase):
    def test_build_translation_prompt_for_known_direction(self) -> None:
        prompt = build_translation_prompt("Where are the cattle?", "en", "mas")
        self.assertIn("English sentence to Maasai", prompt)
        self.assertIn("Where are the cattle?", prompt)

    def test_ensure_instruction_record_backfills_prompt_and_completion(self) -> None:
        record = ensure_instruction_record(
            {
                "source_text": "Hello",
                "target_text": "Supa",
                "source_lang": "en",
                "target_lang": "mas",
            }
        )

        self.assertEqual(record["task"], "translation")
        self.assertEqual(record["completion"], "Supa")
        self.assertIn("Translate the following English sentence to Maasai", record["prompt"])

    def test_build_bible_cross_reference_records_uses_related_context(self) -> None:
        rows = [
            {
                "id": "row-1",
                "reference": "John 3:16",
                "source_text": "For God so loved the world that he gave his only Son.",
                "target_text": "Metaa Enkai etoning'o enkop sidai nabo netii ilayiok lenyena.",
                "source_lang": "en",
                "target_lang": "mas",
                "domain": "bible",
                "source_name": "bible_english_maasai_aligned",
            },
            {
                "id": "row-2",
                "reference": "1 John 4:9",
                "source_text": "God showed his love by sending his Son into the world.",
                "target_text": "Enkai eishoru ening'oto enye te sidai pee etum ilayiok lenyena enkop.",
                "source_lang": "en",
                "target_lang": "mas",
                "domain": "bible",
                "source_name": "bible_english_maasai_aligned",
            },
            {
                "id": "row-3",
                "reference": "Romans 5:8",
                "source_text": "God proves his love for us in that Christ died for us.",
                "target_text": "Enkai eton eitu ening'oto enyena te nena Kristo aitobiraki iyiook.",
                "source_lang": "en",
                "target_lang": "mas",
                "domain": "bible",
                "source_name": "bible_english_maasai_aligned",
            },
        ]

        records = build_bible_cross_reference_records(rows, max_records=2, related_window=2)

        self.assertEqual(len(records), 2)
        first = records[0]
        self.assertEqual(first["task"], "maasai_biblical_cross_reference_generation")
        self.assertIn("Primary verse (John 3:16)", first["prompt"])
        self.assertIn("Related verses for context", first["prompt"])
        self.assertIn("1 John 4:9", first["prompt"])
        self.assertIn("Romans 5:8", first["prompt"])
        self.assertEqual(first["completion"], rows[0]["target_text"])

    def test_build_instruction_mixture_includes_cross_reference_tasks(self) -> None:
        rows = [
            {
                "id": "row-1",
                "reference": "Psalm 23:1",
                "source_text": "The Lord is my shepherd; I shall not want.",
                "target_text": "Olaitoriani naa oltung'ani lai; matonyokino.",
                "source_lang": "en",
                "target_lang": "mas",
                "domain": "bible",
                "source_name": "bible_english_maasai_aligned",
            },
            {
                "id": "row-2",
                "reference": "John 10:11",
                "source_text": "I am the good shepherd. The good shepherd lays down his life for the sheep.",
                "target_text": "Anake oltung'ani sidai. Oltung'ani sidai eton eitu enkishui enye pee etum sipolio.",
                "source_lang": "en",
                "target_lang": "mas",
                "domain": "bible",
                "source_name": "bible_english_maasai_aligned",
            },
            {
                "id": "row-3",
                "reference": "Hebrews 13:20",
                "source_text": "Our Lord Jesus, the great shepherd of the sheep, brought peace through the blood of the eternal covenant.",
                "target_text": "Olaitoriani lenye Yesu, oltung'ani kitok oo sipolio, eitu emayianata te sidai.",
                "source_lang": "en",
                "target_lang": "mas",
                "domain": "bible",
                "source_name": "bible_english_maasai_aligned",
            },
        ]

        mixture = build_instruction_mixture(
            rows,
            "train",
            story_seed_file=Path("data/raw/does-not-exist.jsonl"),
            max_bible_passages=0,
            bible_passage_window=3,
            seed=7,
            max_bible_cross_reference_records=2,
        )
        tasks = {row["task"] for row in mixture}

        self.assertIn("translation", tasks)
        self.assertIn("maasai_biblical_cross_reference_generation", tasks)


if __name__ == "__main__":
    unittest.main()
