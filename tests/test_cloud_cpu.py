from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest import mock

from src.cloud_cpu import (
    CloudTrainingConfig,
    build_cloud_env_file,
    build_cloud_launcher_script,
    build_cron_block,
    build_cycle_command,
    build_systemd_service,
    build_systemd_timer,
    default_host_alias,
    extract_ssh_config,
    extract_ssh_password,
    load_ssh_config_from_markdown,
    parse_env_flag,
)


class CloudCpuHelpersTests(unittest.TestCase):
    def test_parse_env_flag_understands_common_values(self) -> None:
        self.assertTrue(parse_env_flag("true"))
        self.assertTrue(parse_env_flag("1"))
        self.assertFalse(parse_env_flag("false", default=True))
        self.assertFalse(parse_env_flag(None))

    def test_extract_ssh_config_returns_fenced_block(self) -> None:
        markdown = """
# Cloud connection

```sshconfig
Host maasai-cloud
  HostName example.internal
  User ubuntu
```
"""
        config = extract_ssh_config(markdown)
        self.assertIn("Host maasai-cloud", config)
        self.assertTrue(config.endswith("\n"))

    def test_extract_ssh_password_returns_optional_password(self) -> None:
        markdown = """
```sshconfig
Host maasai-cloud
  HostName example.internal
```

password: hunter2
"""
        self.assertEqual(extract_ssh_password(markdown), "hunter2")

    def test_extract_ssh_config_rejects_missing_block(self) -> None:
        with self.assertRaises(ValueError):
            extract_ssh_config("# no ssh config here")

    def test_default_host_alias_returns_first_host(self) -> None:
        config = "Host maasai-cloud\n  HostName example.internal\n\nHost backup\n  HostName backup.internal\n"
        self.assertEqual(default_host_alias(config), "maasai-cloud")

    def test_load_ssh_config_from_markdown_reads_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "cloud.md"
            path.write_text(
                "```sshconfig\nHost cpu-box\n  HostName example.internal\n```\n",
                encoding="utf-8",
            )
            self.assertIn("Host cpu-box", load_ssh_config_from_markdown(path))

    def test_build_cycle_command_targets_train_daily_from_hf(self) -> None:
        config = CloudTrainingConfig(
            dataset_repo="org/dataset",
            model_repo="org/model",
            model_name="google/gemma-4-E4B-it",
        )
        command = build_cycle_command(
            config,
            project_root=Path("/project"),
            runtime_root=Path("/runtime"),
            python_executable="/venv/bin/python",
        )
        self.assertEqual(command[0], "/venv/bin/python")
        self.assertIn("/project/scripts/train_daily_from_hf.py", command)
        self.assertIn("/runtime/daily", command)
        self.assertIn("--no-augment-with-generation-tasks", command)

    def test_build_cloud_env_file_contains_expected_values(self) -> None:
        config = CloudTrainingConfig(
            dataset_repo="org/dataset",
            model_repo="org/model",
            model_name="google/gemma-4-E4B-it",
            report_to="wandb",
            augment_with_generation_tasks=True,
        )
        env_text = build_cloud_env_file(
            config,
            hf_token="hf_secret",
            runtime_root="/opt/maasai/runtime",
            wandb_api_key="wandb_secret",
        )
        self.assertIn("HF_TOKEN=hf_secret", env_text)
        self.assertIn("HF_DATASET_REPO=org/dataset", env_text)
        self.assertIn("CLOUD_REPORT_TO=wandb", env_text)
        self.assertIn("CLOUD_AUGMENT_WITH_GENERATION_TASKS=true", env_text)
        self.assertIn("WANDB_API_KEY=wandb_secret", env_text)

    def test_build_cloud_launcher_script_runs_cycle_wrapper(self) -> None:
        launcher = build_cloud_launcher_script(
            remote_workdir="/opt/maasai-lang-cpu",
            env_file="/opt/maasai-lang-cpu/runtime/cloud-training.env",
            log_file="/opt/maasai-lang-cpu/runtime/logs/cloud-train.log",
        )
        self.assertIn("run_cloud_train_cycle.py", launcher)
        self.assertIn("cloud-training.env", launcher)
        self.assertIn("cloud-train.log", launcher)

    def test_build_systemd_units_and_cron_block(self) -> None:
        service = build_systemd_service(
            description="Maasai train",
            working_directory="/opt/maasai-lang-cpu",
            launcher_path="/opt/maasai-lang-cpu/ops/maasai-cloud-train-launch.sh",
        )
        timer = build_systemd_timer(
            description="Maasai timer",
            service_name="maasai-cloud-train.service",
            interval_minutes=45,
        )
        cron = build_cron_block(
            launcher_path="/opt/maasai-lang-cpu/ops/maasai-cloud-train-launch.sh",
            interval_minutes=45,
        )
        self.assertIn("ExecStart=/opt/maasai-lang-cpu/ops/maasai-cloud-train-launch.sh", service)
        self.assertIn("OnUnitActiveSec=45min", timer)
        self.assertIn("@reboot /opt/maasai-lang-cpu/ops/maasai-cloud-train-launch.sh", cron)

    def test_config_from_env_reads_cloud_settings(self) -> None:
        with mock.patch.dict(
            "os.environ",
            {
                "HF_DATASET_REPO": "org/dataset",
                "HF_MODEL_REPO": "org/model",
                "HF_BASE_MODEL": "google/gemma-4-E4B-it",
                "HF_BUCKET_URI": "hf://bucket/path",
                "CLOUD_REPORT_TO": "wandb",
                "CLOUD_AUGMENT_WITH_GENERATION_TASKS": "true",
                "CLOUD_MAX_STEPS": "240",
            },
            clear=False,
        ):
            config = CloudTrainingConfig.from_env()
        self.assertEqual(config.dataset_repo, "org/dataset")
        self.assertEqual(config.model_repo, "org/model")
        self.assertEqual(config.bucket_uri, "hf://bucket/path")
        self.assertEqual(config.report_to, "wandb")
        self.assertTrue(config.augment_with_generation_tasks)
        self.assertEqual(config.max_steps, 240)


if __name__ == "__main__":
    unittest.main()
