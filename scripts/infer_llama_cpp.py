#!/usr/bin/env python3
"""
Inference using llama.cpp (GGUF format) for fast CPU/GPU translation.

Supports both interactive mode and single-text mode.

Usage:
    python scripts/infer_llama_cpp.py --model_path outputs/gguf/maasai-en-mt-Q4_K_M.gguf
    python scripts/infer_llama_cpp.py --model_path outputs/gguf/maasai-en-mt-Q4_K_M.gguf --text "Hello" --direction en_to_mas
"""

from __future__ import annotations

import argparse
import logging
import sys

LOGGER = logging.getLogger("infer_llama_cpp")


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="llama.cpp GGUF inference for Maasai translation")
    parser.add_argument("--model_path", type=str, required=True,
                        help="Path to the GGUF model file")
    parser.add_argument("--text", type=str, default=None,
                        help="Text to translate (omit for interactive mode)")
    parser.add_argument("--direction", type=str, default="en_to_mas",
                        choices=["en_to_mas", "mas_to_en"],
                        help="Translation direction")
    parser.add_argument("--n_ctx", type=int, default=2048,
                        help="Context window size")
    parser.add_argument("--n_gpu_layers", type=int, default=-1,
                        help="GPU layers to offload (-1 = all, 0 = CPU only)")
    parser.add_argument("--temperature", type=float, default=0.3,
                        help="Sampling temperature")
    parser.add_argument("--max_tokens", type=int, default=256,
                        help="Maximum output tokens")
    return parser.parse_args()


def build_prompt(text: str, direction: str) -> str:
    """Build instruction prompt for translation."""
    if direction == "en_to_mas":
        return (
            "You are an expert English-to-Maasai translator. Translate the following English text "
            "into natural Maasai (Maa language). Preserve cultural terms and use authentic local dialect. "
            "Only output the translation, nothing else.\n\n"
            f"English: {text}\nMaasai:"
        )
    else:
        return (
            "You are an expert Maasai-to-English translator. Translate the following Maasai (Maa) text "
            "into clear, natural English. Preserve cultural terms where appropriate. "
            "Only output the translation, nothing else.\n\n"
            f"Maasai: {text}\nEnglish:"
        )


def load_model(model_path: str, n_ctx: int, n_gpu_layers: int):
    """Load GGUF model via llama-cpp-python."""
    try:
        from llama_cpp import Llama
    except ImportError:
        LOGGER.error(
            "llama-cpp-python is not installed. Install with:\n"
            "  pip install llama-cpp-python\n"
            "For GPU support:\n"
            "  CMAKE_ARGS='-DGGML_CUDA=on' pip install llama-cpp-python"
        )
        sys.exit(1)

    LOGGER.info("Loading GGUF model: %s", model_path)
    llm = Llama(
        model_path=model_path,
        n_ctx=n_ctx,
        n_gpu_layers=n_gpu_layers,
        verbose=False,
    )
    LOGGER.info("Model loaded successfully")
    return llm


def translate(llm, text: str, direction: str, temperature: float, max_tokens: int) -> str:
    """Perform translation using the loaded GGUF model."""
    prompt = build_prompt(text, direction)
    output = llm(
        prompt,
        max_tokens=max_tokens,
        temperature=temperature,
        stop=["\n\n", "English:", "Maasai:", "\nNote:"],
        echo=False,
    )
    return output["choices"][0]["text"].strip()


def interactive_mode(llm, args) -> None:
    """Interactive translation REPL."""
    print("\n🛡️  Maasai Language Translator (llama.cpp)")
    print("=" * 50)
    print(f"Direction: {'English → Maasai' if args.direction == 'en_to_mas' else 'Maasai → English'}")
    print("Type 'quit' to exit, 'switch' to change direction\n")

    direction = args.direction

    while True:
        try:
            src_label = "English" if direction == "en_to_mas" else "Maasai"
            tgt_label = "Maasai" if direction == "en_to_mas" else "English"

            text = input(f"[{src_label}] > ").strip()

            if text.lower() == "quit":
                print("Ashe oleng! (Thank you very much!)")
                break
            elif text.lower() == "switch":
                direction = "mas_to_en" if direction == "en_to_mas" else "en_to_mas"
                print(f"Switched to {'English → Maasai' if direction == 'en_to_mas' else 'Maasai → English'}")
                continue
            elif not text:
                continue

            result = translate(llm, text, direction, args.temperature, args.max_tokens)
            print(f"[{tgt_label}] > {result}\n")

        except (KeyboardInterrupt, EOFError):
            print("\nAshe oleng!")
            break


def main() -> None:
    setup_logging()
    args = parse_args()

    llm = load_model(args.model_path, args.n_ctx, args.n_gpu_layers)

    if args.text:
        result = translate(llm, args.text, args.direction, args.temperature, args.max_tokens)
        direction_label = "English → Maasai" if args.direction == "en_to_mas" else "Maasai → English"
        print(f"\n[{direction_label}]")
        print(f"Input:  {args.text}")
        print(f"Output: {result}")
    else:
        interactive_mode(llm, args)


if __name__ == "__main__":
    main()
