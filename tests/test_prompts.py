from __future__ import annotations

import unittest

from src.modeling import is_gemma4_model
from src.postprocessing import postprocess
from src.prompts import (
    build_generation_prompt_from_user_prompt,
    build_inference_prompt,
    build_training_text,
    model_uses_chat_template,
    should_enable_inference_thinking,
)


class _FakeFormatter:
    chat_template = "fake-template"

    def __init__(self) -> None:
        self.last_enable_thinking = None

    def apply_chat_template(self, messages, tokenize=False, add_generation_prompt=False, enable_thinking=False):
        self.last_enable_thinking = enable_thinking
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
        formatter = _FakeFormatter()
        prompt = build_inference_prompt(
            "English → Maasai",
            "Hello, how are you?",
            model_name_or_path="google/gemma-4-E4B-it",
            formatter=formatter,
        )
        self.assertIn("system::", prompt)
        self.assertIn("user::", prompt)
        self.assertTrue(prompt.endswith("assistant::"))
        self.assertTrue(formatter.last_enable_thinking)

    def test_build_training_text_uses_chat_template_for_gemma4(self) -> None:
        formatter = _FakeFormatter()
        prompt = build_training_text(
            "Translate the following English sentence to Maasai:\n\"Hello\"",
            "Supa",
            model_name_or_path="google/gemma-4-E4B-it",
            formatter=formatter,
        )
        self.assertIn("assistant::Supa", prompt)
        self.assertNotIn("### Response:", prompt)
        self.assertFalse(formatter.last_enable_thinking)

    def test_generation_prompt_can_disable_thinking_explicitly(self) -> None:
        formatter = _FakeFormatter()
        build_generation_prompt_from_user_prompt(
            "Translate the following English sentence to Maasai:\n\"Hello\"",
            model_name_or_path="google/gemma-4-E4B-it",
            formatter=formatter,
            enable_thinking=False,
        )
        self.assertFalse(formatter.last_enable_thinking)

    def test_should_enable_inference_thinking_defaults_to_gemma4(self) -> None:
        self.assertTrue(should_enable_inference_thinking("google/gemma-4-E4B-it"))
        self.assertFalse(should_enable_inference_thinking("Qwen/Qwen2.5-3B-Instruct"))
        self.assertFalse(should_enable_inference_thinking("google/gemma-4-E4B-it", requested=False))

    def test_postprocess_strips_reasoning_artifacts(self) -> None:
        text = "<thinking>reason through the sentence</thinking>\nFinal Answer: Supa sidai"
        self.assertEqual(postprocess(text), "Supa sidai")


if __name__ == "__main__":
    unittest.main()
