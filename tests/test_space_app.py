from __future__ import annotations

import os
import unittest

os.environ.setdefault("GRADIO_ANALYTICS_ENABLED", "False")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")

from space import app as space_app


class _FakeCuda:
    def __init__(self, available: bool) -> None:
        self._available = available

    def is_available(self) -> bool:
        return self._available


class _FakeMps:
    def __init__(self, available: bool) -> None:
        self._available = available

    def is_available(self) -> bool:
        return self._available


class _FakeBackends:
    def __init__(self, mps_available: bool) -> None:
        self.mps = _FakeMps(mps_available)


class _FakeTorch:
    float16 = "float16"
    float32 = "float32"

    def __init__(self, *, cuda_available: bool, mps_available: bool = False) -> None:
        self.cuda = _FakeCuda(cuda_available)
        self.backends = _FakeBackends(mps_available)


class SpaceAppTests(unittest.TestCase):
    def test_runtime_status_mentions_configured_models(self) -> None:
        markup = space_app.render_runtime_status()
        self.assertIn(space_app.TRANSLATION_MODEL_ID, markup)
        self.assertIn(space_app.ASR_MODEL_ID, markup)

    def test_glossary_matching_avoids_target_language_false_positive(self) -> None:
        matches = space_app.find_glossary_matches("Hello, how are you?", "English → Maasai")
        matched_terms = {item["matched_on"].lower() for item in matches}
        self.assertNotIn("are", matched_terms)

    def test_translation_loader_uses_cpu_safe_defaults(self) -> None:
        kwargs = space_app.build_translation_model_load_kwargs(
            _FakeTorch(cuda_available=False, mps_available=False)
        )
        self.assertEqual(kwargs["torch_dtype"], "float32")
        self.assertTrue(kwargs["low_cpu_mem_usage"])
        self.assertNotIn("device_map", kwargs)

    def test_translation_loader_uses_accelerated_defaults_on_cuda(self) -> None:
        kwargs = space_app.build_translation_model_load_kwargs(
            _FakeTorch(cuda_available=True, mps_available=False)
        )
        self.assertEqual(kwargs["torch_dtype"], "float16")
        self.assertEqual(kwargs["device_map"], "auto")

    def test_space_strips_reasoning_artifacts_from_output(self) -> None:
        cleaned = space_app.clean_generated_output(
            "<thinking>plan the translation</thinking>\nFinal Answer: Supa oleng"
        )
        self.assertEqual(cleaned, "Supa oleng")

    def test_space_flags_english_leakage_for_maasai_target_output(self) -> None:
        self.assertTrue(
            space_app.has_english_leakage(
                "The children are going to school",
                source_text="The children are going to school",
                direction="English → Maasai",
            )
        )

    def test_space_allows_maasai_like_output(self) -> None:
        self.assertFalse(
            space_app.has_english_leakage(
                "Inkera ia enkisoma",
                source_text="The children are going to school",
                direction="English → Maasai",
            )
        )

    def test_space_builds_maa_repair_prompt(self) -> None:
        prompt = space_app.build_maasai_repair_prompt(
            "The children are going to school",
            "The children are going to school",
        )
        self.assertIn("Rewrite the translation as fluent natural Maa.", prompt)
        self.assertIn("Return only the final Maa translation.", prompt)


if __name__ == "__main__":
    unittest.main()
