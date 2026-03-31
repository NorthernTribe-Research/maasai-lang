from __future__ import annotations

import unittest

from scripts.validate_dataset_complete import summarize_id_integrity


class ValidateDatasetTests(unittest.TestCase):
    def test_missing_ids_do_not_count_as_duplicates(self) -> None:
        summary = summarize_id_integrity(
            [
                {"id": "alpha"},
                {"id": "beta"},
                {"id": None},
                {"id": ""},
            ]
        )

        self.assertEqual(summary["missing_count"], 2)
        self.assertEqual(summary["duplicate_row_count"], 0)
        self.assertEqual(summary["unique_present_count"], 2)

    def test_duplicate_ids_are_counted_from_present_values(self) -> None:
        summary = summarize_id_integrity(
            [
                {"id": "alpha"},
                {"id": "alpha"},
                {"id": "beta"},
            ]
        )

        self.assertEqual(summary["missing_count"], 0)
        self.assertEqual(summary["duplicate_row_count"], 1)
        self.assertEqual(summary["duplicate_id_values"], {"alpha": 2})


if __name__ == "__main__":
    unittest.main()
