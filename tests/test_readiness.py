from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from src.readiness import ReadinessThresholds, build_model_readiness_report


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


class ModelReadinessTests(unittest.TestCase):
    def test_placeholder_qwen_adapter_is_not_ready(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            model_dir = Path(tmpdir)
            write_json(
                model_dir / "adapter_config.json",
                {"base_model_name_or_path": "Qwen/Qwen2.5-3B-Instruct"},
            )
            (model_dir / "adapter_model.bin").write_text("PLACEHOLDER", encoding="utf-8")

            report = build_model_readiness_report(model_dir)

            self.assertFalse(report["ready"])
            self.assertEqual(report["artifact_state"], "placeholder")
            self.assertIn("real_artifacts", report["checks"])
            self.assertIn("gemma4_lineage", report["checks"])
            self.assertTrue(any("artifact_state=placeholder" in reason for reason in report["reasons"]))

    def test_real_gemma_checkpoint_with_eval_is_ready(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            model_dir = Path(tmpdir)
            write_json(
                model_dir / "adapter_config.json",
                {"base_model_name_or_path": "google/gemma-4-E4B-it"},
            )
            (model_dir / "adapter_model.safetensors").write_bytes(b"0" * 4096)
            write_json(
                model_dir / "eval_results.json",
                {
                    "bleu": 18.4,
                    "chrf++": 42.1,
                    "num_samples": 80,
                    "terminology": {"term_recall": 0.72},
                    "details": [
                        {
                            "source_text": "The children are going to school",
                            "target_lang": "mas",
                            "hypothesis": "Inkera ia enkisoma",
                        },
                        {
                            "source_text": "Thank you very much",
                            "target_lang": "mas",
                            "hypothesis": "Ashe oleng",
                        },
                    ]
                        * 40,
                },
            )

            report = build_model_readiness_report(model_dir)

            self.assertTrue(report["ready"])
            self.assertEqual(report["artifact_state"], "real")
            self.assertEqual(report["base_model_name"], "google/gemma-4-E4B-it")
            self.assertEqual(report["english_leakage"]["leaked_samples"], 0)

    def test_english_leakage_blocks_readiness(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            model_dir = Path(tmpdir)
            write_json(
                model_dir / "adapter_config.json",
                {"base_model_name_or_path": "google/gemma-4-E4B-it"},
            )
            (model_dir / "adapter_model.safetensors").write_bytes(b"0" * 4096)
            write_json(
                model_dir / "eval_results.json",
                {
                    "bleu": 18.4,
                    "chrf++": 42.1,
                    "num_samples": 80,
                    "terminology": {"term_recall": 0.72},
                    "details": [
                        {
                            "source_text": "The children are going to school",
                            "target_lang": "mas",
                            "hypothesis": "The children are going to school",
                        }
                    ]
                        * 80,
                },
            )

            report = build_model_readiness_report(
                model_dir,
                thresholds=ReadinessThresholds(max_english_leakage_rate=0.10),
            )

            self.assertFalse(report["ready"])
            self.assertAlmostEqual(report["english_leakage"]["rate"], 1.0)
            self.assertTrue(
                any("english_leakage_threshold" in reason for reason in report["reasons"])
            )


if __name__ == "__main__":
    unittest.main()
