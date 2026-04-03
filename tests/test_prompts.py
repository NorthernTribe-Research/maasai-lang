from __future__ import annotations

import unittest

from src.modeling import is_gemma4_model
from src.prompts import build_inference_prompt, build_training_text, model_uses_chat_template


class _FakeFormatter:
    chat_template = "fake-template"

    def apply_chat_template(self, messages, tokenize=False, add_generation_prompt=False, enable_thinking=False):
        rendered = [f"{message['role']}::{message['content']}" for message in messages]
        if add_generation_prompt:
            rendered.append("assistant::")
        return "\n".join(rendered)


class PromptTests(unittest.TestCase):
    def test_model_uses_chat_template_for_gemma4(self) -> None:
        self.assertTrue(model_uses_chat_template("google/gemma-4-E4B-it"))
        self.assertTrue(is_gemma4_model("google/gemma-4-E4B-it"))
        self.assertFalse(model_uses_chat_template("Qwen/Qwen2.5-3B-Instruct"))

    def test_build_inference_prompt_uses_chat_template_for_gemma4(self) -> None:
        prompt = build_inference_prompt(
            "English → Maasai",
            "Hello, how are you?",
            model_name_or_path="google/gemma-4-E4B-it",
            formatter=_FakeFormatter(),
        )
        self.assertIn("system::", prompt)
        self.assertIn("user::", prompt)
        self.assertTrue(prompt.endswith("assistant::"))

    def test_build_training_text_uses_chat_template_for_gemma4(self) -> None:
        prompt = build_training_text(
            "Translate the following English sentence to Maasai:\n\"Hello\"",
            "Supa",
            model_name_or_path="google/gemma-4-E4B-it",
            formatter=_FakeFormatter(),
        )
        self.assertIn("assistant::Supa", prompt)
        self.assertNotIn("### Response:", prompt)


if __name__ == "__main__":
    unittest.main()
