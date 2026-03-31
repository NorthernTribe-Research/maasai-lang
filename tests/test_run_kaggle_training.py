from __future__ import annotations

import unittest
from pathlib import Path
from unittest import mock

from scripts.run_kaggle_training import wait_for_kernel


class RunKaggleTrainingTests(unittest.TestCase):
    def test_wait_for_kernel_accepts_sustained_running(self) -> None:
        with mock.patch(
            "scripts.run_kaggle_training.fetch_status",
            side_effect=["RUNNING", "RUNNING", "RUNNING"],
        ), mock.patch(
            "scripts.run_kaggle_training.fetch_log_text",
            return_value="",
        ), mock.patch(
            "scripts.run_kaggle_training.time.sleep",
            return_value=None,
        ):
            outcome, _ = wait_for_kernel(
                kaggle_cli="kaggle",
                root=Path("."),
                env={},
                kernel_ref="owner/kernel",
                kernel_slug="kernel",
                log_dir=Path("/tmp"),
                poll_seconds=0,
                startup_timeout_seconds=60,
            )
        self.assertEqual(outcome, "running")

    def test_wait_for_kernel_prefers_training_marker(self) -> None:
        with mock.patch(
            "scripts.run_kaggle_training.fetch_status",
            return_value="RUNNING",
        ), mock.patch(
            "scripts.run_kaggle_training.fetch_log_text",
            return_value="Starting training on dataset",
        ), mock.patch(
            "scripts.run_kaggle_training.time.sleep",
            return_value=None,
        ):
            outcome, _ = wait_for_kernel(
                kaggle_cli="kaggle",
                root=Path("."),
                env={},
                kernel_ref="owner/kernel",
                kernel_slug="kernel",
                log_dir=Path("/tmp"),
                poll_seconds=0,
                startup_timeout_seconds=60,
            )
        self.assertEqual(outcome, "training_started")

    def test_wait_for_kernel_times_out_when_never_active(self) -> None:
        with mock.patch(
            "scripts.run_kaggle_training.fetch_status",
            return_value="QUEUED",
        ), mock.patch(
            "scripts.run_kaggle_training.fetch_log_text",
            return_value="",
        ), mock.patch(
            "scripts.run_kaggle_training.time.sleep",
            return_value=None,
        ):
            outcome, _ = wait_for_kernel(
                kaggle_cli="kaggle",
                root=Path("."),
                env={},
                kernel_ref="owner/kernel",
                kernel_slug="kernel",
                log_dir=Path("/tmp"),
                poll_seconds=0,
                startup_timeout_seconds=0,
            )
        self.assertEqual(outcome, "timeout")


if __name__ == "__main__":
    unittest.main()
