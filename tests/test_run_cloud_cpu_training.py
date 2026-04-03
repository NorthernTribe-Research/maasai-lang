from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from scripts import run_cloud_cpu_training


class RunCloudCpuTrainingTests(unittest.TestCase):
    def make_args(self, **overrides: object) -> SimpleNamespace:
        args = {
            "connection_file": "cloud-machine-connection.md",
            "host": None,
            "remote_workdir": "/opt/maasai-lang-cpu",
            "python_bin": "python3",
            "requirements_file": "requirements-cloud-cpu.txt",
            "model_name": "google/gemma-4-E4B-it",
            "train_file": "data/final_v3/train.jsonl",
            "valid_file": "data/final_v3/valid.jsonl",
            "story_seed_file": "data/raw/maasai_story_generation_seed.jsonl",
            "output_dir": "outputs/maasai-en-mt-qlora-cloud-cpu",
            "max_length": 256,
            "learning_rate": 2e-4,
            "num_train_epochs": 1.0,
            "max_steps": 120,
            "save_steps": 60,
            "eval_steps": 60,
            "logging_steps": 10,
            "save_total_limit": 2,
            "per_device_train_batch_size": 1,
            "per_device_eval_batch_size": 1,
            "gradient_accumulation_steps": 16,
            "warmup_ratio": 0.03,
            "weight_decay": 0.01,
            "lora_r": 16,
            "lora_alpha": 32,
            "lora_dropout": 0.05,
            "max_train_samples": 512,
            "max_eval_samples": 128,
            "seed": 42,
            "prepare_only": False,
            "pull_only": False,
            "skip_install": False,
            "skip_sync_back": False,
            "dry_run": False,
        }
        args.update(overrides)
        return SimpleNamespace(**args)

    def test_prepare_only_skips_training_and_sync_back(self) -> None:
        args = self.make_args(prepare_only=True)
        with tempfile.NamedTemporaryFile(delete=False) as handle:
            ssh_config = Path(handle.name)
        try:
            with mock.patch("scripts.run_cloud_cpu_training.parse_args", return_value=args), mock.patch(
                "scripts.run_cloud_cpu_training.Path.read_text",
                return_value="```sshconfig\nHost maasai-cloud\n  HostName example.internal\n```\n",
            ), mock.patch(
                "scripts.run_cloud_cpu_training.extract_ssh_config",
                return_value="Host maasai-cloud\n  HostName example.internal\n",
            ), mock.patch(
                "scripts.run_cloud_cpu_training.extract_ssh_password",
                return_value=None,
            ), mock.patch(
                "scripts.run_cloud_cpu_training.default_host_alias",
                return_value="maasai-cloud",
            ), mock.patch(
                "scripts.run_cloud_cpu_training.write_temp_ssh_config",
                return_value=ssh_config,
            ), mock.patch(
                "scripts.run_cloud_cpu_training.run_cmd",
            ), mock.patch(
                "scripts.run_cloud_cpu_training.sync_project_subset",
            ), mock.patch(
                "scripts.run_cloud_cpu_training.bootstrap_remote_env",
            ) as bootstrap_remote_env, mock.patch(
                "scripts.run_cloud_cpu_training.run_remote_training",
            ) as run_remote_training, mock.patch(
                "scripts.run_cloud_cpu_training.sync_outputs_back",
            ) as sync_outputs_back:
                exit_code = run_cloud_cpu_training.main()

            self.assertEqual(exit_code, 0)
            bootstrap_remote_env.assert_called_once()
            run_remote_training.assert_not_called()
            sync_outputs_back.assert_not_called()
            self.assertFalse(ssh_config.exists())
        finally:
            ssh_config.unlink(missing_ok=True)

    def test_pull_only_syncs_outputs_without_bootstrap(self) -> None:
        args = self.make_args(pull_only=True)
        with tempfile.NamedTemporaryFile(delete=False) as handle:
            ssh_config = Path(handle.name)
        try:
            with mock.patch("scripts.run_cloud_cpu_training.parse_args", return_value=args), mock.patch(
                "scripts.run_cloud_cpu_training.Path.read_text",
                return_value="```sshconfig\nHost maasai-cloud\n  HostName example.internal\n```\n",
            ), mock.patch(
                "scripts.run_cloud_cpu_training.extract_ssh_config",
                return_value="Host maasai-cloud\n  HostName example.internal\n",
            ), mock.patch(
                "scripts.run_cloud_cpu_training.extract_ssh_password",
                return_value=None,
            ), mock.patch(
                "scripts.run_cloud_cpu_training.default_host_alias",
                return_value="maasai-cloud",
            ), mock.patch(
                "scripts.run_cloud_cpu_training.write_temp_ssh_config",
                return_value=ssh_config,
            ), mock.patch(
                "scripts.run_cloud_cpu_training.run_cmd",
            ) as run_cmd, mock.patch(
                "scripts.run_cloud_cpu_training.sync_project_subset",
            ) as sync_project_subset, mock.patch(
                "scripts.run_cloud_cpu_training.bootstrap_remote_env",
            ) as bootstrap_remote_env, mock.patch(
                "scripts.run_cloud_cpu_training.run_remote_training",
            ) as run_remote_training, mock.patch(
                "scripts.run_cloud_cpu_training.sync_outputs_back",
            ) as sync_outputs_back:
                exit_code = run_cloud_cpu_training.main()

            self.assertEqual(exit_code, 0)
            run_cmd.assert_not_called()
            sync_project_subset.assert_not_called()
            bootstrap_remote_env.assert_not_called()
            run_remote_training.assert_not_called()
            sync_outputs_back.assert_called_once()
            self.assertFalse(ssh_config.exists())
        finally:
            ssh_config.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
