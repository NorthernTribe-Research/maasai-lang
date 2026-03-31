from __future__ import annotations

import unittest

from scripts.check_pages_health import evaluate_health, normalize_base_url


class PagesHealthTests(unittest.TestCase):
    def test_normalize_base_url_requires_https(self) -> None:
        with self.assertRaises(ValueError):
            normalize_base_url("http://example.com")

    def test_normalize_base_url_trims_trailing_slash(self) -> None:
        self.assertEqual(
            normalize_base_url("https://northerntribe-research.github.io/maasai-lang/"),
            "https://northerntribe-research.github.io/maasai-lang",
        )

    def test_evaluate_health_healthy(self) -> None:
        status, _ = evaluate_health({"ok": True}, {"ok": True})
        self.assertEqual(status, "healthy")

    def test_evaluate_health_degraded(self) -> None:
        status, _ = evaluate_health({"ok": True}, {"ok": False})
        self.assertEqual(status, "degraded")

    def test_evaluate_health_down(self) -> None:
        status, _ = evaluate_health({"ok": False}, {"ok": False})
        self.assertEqual(status, "down")


if __name__ == "__main__":
    unittest.main()
