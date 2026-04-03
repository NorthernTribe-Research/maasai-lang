from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest import mock

from scripts import manage_cloud_cpu_training
from src.cloud_cpu import CloudTrainingConfig


class ManageCloudCpuTrainingTests(unittest.TestCase):
    def test_upload_remote_text_file_streams_content_over_ssh(self) -> None:
        with tempfile.NamedTemporaryFile(delete=False) as handle:
            ssh_config = Path(handle.name)
        try:
            with mock.patch(
                "scripts.manage_cloud_cpu_training.ssh_base",
                return_value=["ssh", "-F", str(ssh_config), "maasai-cloud"],
            ), mock.patch(
                "scripts.manage_cloud_cpu_training.subprocess.run",
            ) as subprocess_run:
                manage_cloud_cpu_training.upload_remote_text_file(
                    ssh_config,
                    "maasai-cloud",
                    "/opt/maasai-lang-cpu/runtime/cloud-training.env",
                    "HF_TOKEN=hf_secret\n",
                    mode=0o600,
                    askpass_script=None,
                    dry_run=False,
                    redact_contents=True,
                )

            subprocess_run.assert_called_once()
            _, kwargs = subprocess_run.call_args
            self.assertEqual(kwargs["input"], "HF_TOKEN=hf_secret\n")
            self.assertTrue(kwargs["text"])
            self.assertTrue(kwargs["check"])
        finally:
            ssh_config.unlink(missing_ok=True)

    def test_upload_control_files_keeps_secret_env_out_of_rsync_stage(self) -> None:
        with tempfile.NamedTemporaryFile(delete=False) as handle:
            ssh_config = Path(handle.name)
        try:
            config = CloudTrainingConfig(
                dataset_repo="org/dataset",
                model_repo="org/model",
                model_name="google/gemma-4-E4B-it",
            )
            with mock.patch(
                "scripts.manage_cloud_cpu_training.upload_remote_text_file",
            ) as upload_remote_text_file, mock.patch(
                "scripts.manage_cloud_cpu_training.run_cmd",
            ) as run_cmd, mock.patch(
                "scripts.manage_cloud_cpu_training.remote_shell",
            ):
                manage_cloud_cpu_training.upload_control_files(
                    ssh_config,
                    "maasai-cloud",
                    "/opt/maasai-lang-cpu",
                    config=config,
                    hf_token="hf_secret",
                    wandb_api_key="wandb_secret",
                    timer_minutes=45,
                    askpass_script=None,
                    dry_run=True,
                )

            upload_remote_text_file.assert_called_once()
            args, kwargs = upload_remote_text_file.call_args
            self.assertEqual(args[2], "/opt/maasai-lang-cpu/runtime/cloud-training.env")
            self.assertIn("HF_TOKEN=hf_secret", args[3])
            self.assertTrue(kwargs["redact_contents"])

            rsync_cmd = run_cmd.call_args.args[0]
            self.assertNotIn("./runtime/cloud-training.env", rsync_cmd)
            self.assertIn("./ops/maasai-cloud-train-launch.sh", rsync_cmd)
        finally:
            ssh_config.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
