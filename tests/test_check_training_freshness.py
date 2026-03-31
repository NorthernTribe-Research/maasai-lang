from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone

from scripts.check_training_freshness import evaluate_freshness


def iso_utc(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class TrainingFreshnessTests(unittest.TestCase):
    def test_active_run_is_healthy(self) -> None:
        now = datetime.now(timezone.utc)
        runs = [
            {
                "head_branch": "main",
                "status": "in_progress",
                "updated_at": iso_utc(now - timedelta(minutes=20)),
            }
        ]
        ok, _ = evaluate_freshness(runs, lookback_hours=3)
        self.assertTrue(ok)

    def test_recent_success_is_healthy(self) -> None:
        now = datetime.now(timezone.utc)
        runs = [
            {
                "head_branch": "main",
                "status": "completed",
                "conclusion": "success",
                "updated_at": iso_utc(now - timedelta(hours=1, minutes=10)),
            }
        ]
        ok, _ = evaluate_freshness(runs, lookback_hours=3)
        self.assertTrue(ok)

    def test_stale_success_is_unhealthy(self) -> None:
        now = datetime.now(timezone.utc)
        runs = [
            {
                "head_branch": "main",
                "status": "completed",
                "conclusion": "success",
                "updated_at": iso_utc(now - timedelta(hours=7)),
            }
        ]
        ok, message = evaluate_freshness(runs, lookback_hours=3)
        self.assertFalse(ok)
        self.assertIn("Stale", message)

    def test_non_main_runs_do_not_count(self) -> None:
        now = datetime.now(timezone.utc)
        runs = [
            {
                "head_branch": "feature-branch",
                "status": "in_progress",
                "updated_at": iso_utc(now - timedelta(minutes=10)),
            }
        ]
        ok, message = evaluate_freshness(runs, lookback_hours=3)
        self.assertFalse(ok)
        self.assertIn("main branch", message)


if __name__ == "__main__":
    unittest.main()
