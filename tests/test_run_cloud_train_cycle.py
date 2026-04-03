from __future__ import annotations

import json
import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from scripts import run_cloud_train_cycle
from src.cloud_cpu import CloudTrainingConfig


class RunCloudTrainCycleTests(unittest.TestCase):
    @contextmanager
    def _lock(self, acquired: bool):
        yield acquired

    def test_main_skips_when_lock_is_held(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runtime_root = Path(tmpdir) / "runtime"
            args = SimpleNamespace(project_root=tmpdir, runtime_root=str(runtime_root))
            config = CloudTrainingConfig()
            with mock.patch("scripts.run_cloud_train_cycle.parse_args", return_value=args), mock.patch(
                "scripts.run_cloud_train_cycle.CloudTrainingConfig.from_env",
                return_value=config,
            ), mock.patch(
                "scripts.run_cloud_train_cycle.build_cycle_command",
                return_value=["python", "train_daily_from_hf.py"],
            ), mock.patch(
                "scripts.run_cloud_train_cycle.hold_lock",
                side_effect=lambda path: self._lock(False),
            ), mock.patch(
                "scripts.run_cloud_train_cycle.subprocess.run",
            ) as subprocess_run:
                exit_code = run_cloud_train_cycle.main()

            self.assertEqual(exit_code, 0)
            subprocess_run.assert_not_called()
            heartbeat = json.loads((runtime_root / "state" / "cloud-train-heartbeat.json").read_text(encoding="utf-8"))
            self.assertEqual(heartbeat["state"], "skipped_locked")

    def test_main_records_successful_cycle(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runtime_root = Path(tmpdir) / "runtime"
            args = SimpleNamespace(project_root=tmpdir, runtime_root=str(runtime_root))
            config = CloudTrainingConfig(model_repo="org/model")
            with mock.patch("scripts.run_cloud_train_cycle.parse_args", return_value=args), mock.patch(
                "scripts.run_cloud_train_cycle.CloudTrainingConfig.from_env",
                return_value=config,
            ), mock.patch(
                "scripts.run_cloud_train_cycle.build_cycle_command",
                return_value=["python", "train_daily_from_hf.py", "--model-repo", "org/model"],
            ), mock.patch(
                "scripts.run_cloud_train_cycle.hold_lock",
                side_effect=lambda path: self._lock(True),
            ), mock.patch(
                "scripts.run_cloud_train_cycle.subprocess.run",
                return_value=SimpleNamespace(returncode=0),
            ):
                exit_code = run_cloud_train_cycle.main()

            self.assertEqual(exit_code, 0)
            heartbeat = json.loads((runtime_root / "state" / "cloud-train-heartbeat.json").read_text(encoding="utf-8"))
            self.assertEqual(heartbeat["state"], "success")
            self.assertEqual(heartbeat["model_repo"], "org/model")


if __name__ == "__main__":
    unittest.main()
