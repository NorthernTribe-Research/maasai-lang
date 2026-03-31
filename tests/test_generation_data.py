from __future__ import annotations

import unittest

from src.generation_data import build_translation_prompt, ensure_instruction_record


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


if __name__ == "__main__":
    unittest.main()
