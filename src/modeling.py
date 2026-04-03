"""
Model-loading helpers shared across training and evaluation scripts.
"""

from __future__ import annotations

from typing import Any


def is_gemma4_model(model_name_or_path: str | None) -> bool:
    """Return whether the identifier points to a Gemma 4 model or adapter."""
    name = str(model_name_or_path or "").strip().lower()
    return "gemma-4" in name


def load_text_formatter(
    model_name_or_path: str,
    *,
    use_fast: bool = True,
    trust_remote_code: bool = True,
    local_files_only: bool = False,
) -> tuple[Any, Any]:
    """
    Load the text formatter for a model.

    For Gemma 4, this is an AutoProcessor because the official prompt path uses
    chat templating through the processor. For text-only CausalLM models, the
    tokenizer remains the formatter.
    """
    from transformers import AutoProcessor, AutoTokenizer

    if is_gemma4_model(model_name_or_path):
        processor = AutoProcessor.from_pretrained(
            model_name_or_path,
            trust_remote_code=trust_remote_code,
            local_files_only=local_files_only,
        )
        tokenizer = getattr(processor, "tokenizer", None)
        if tokenizer is None:
            raise ValueError(
                f"Gemma 4 formatter for {model_name_or_path} did not expose a tokenizer."
            )
        return processor, tokenizer

    tokenizer = AutoTokenizer.from_pretrained(
        model_name_or_path,
        use_fast=use_fast,
        trust_remote_code=trust_remote_code,
        local_files_only=local_files_only,
    )
    return tokenizer, tokenizer


def save_text_formatter(formatter: Any, tokenizer: Any, output_dir: str) -> None:
    """Persist whichever formatter object should be reloaded later."""
    save_pretrained = getattr(formatter, "save_pretrained", None)
    if callable(save_pretrained):
        save_pretrained(output_dir)
        return
    tokenizer.save_pretrained(output_dir)
