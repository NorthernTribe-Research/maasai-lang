#!/usr/bin/env python3
"""
Interactive translation inference script.

Usage:
    python scripts/infer_translate.py --model_dir outputs/maasai-en-mt-qlora
    python scripts/infer_translate.py --model_dir outputs/maasai-en-mt-qlora --text "Hello, how are you?" --direction en_to_mas
"""

from __future__ import annotations

import argparse
import logging

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from src.prompts import build_inference_prompt
from src.postprocessing import postprocess

LOGGER = logging.getLogger("infer_translate")


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_dir", type=str, default="outputs/maasai-en-mt-qlora")
    parser.add_argument("--text", type=str, default=None, help="Text to translate (or interactive mode)")
    parser.add_argument("--direction", type=str, default="en_to_mas",
                        choices=["en_to_mas", "mas_to_en"])
    parser.add_argument("--max_new_tokens", type=int, default=128)
    return parser.parse_args()


# Uses centralized prompts and postprocessing now.

def translate(model, tokenizer, prompt: str, max_new_tokens: int, device: str, direction: str) -> str:
    inputs = tokenizer(prompt, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.inference_mode():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            repetition_penalty=1.05,
            eos_token_id=tokenizer.eos_token_id,
            pad_token_id=tokenizer.pad_token_id,
        )

    decoded = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return postprocess(decoded, glossary=None, direction=direction)


def main() -> None:
    setup_logging()
    args = parse_args()
    device = "cuda" if torch.cuda.is_available() else "cpu"

    LOGGER.info("Loading model from %s", args.model_dir)
    tokenizer = AutoTokenizer.from_pretrained(args.model_dir, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        args.model_dir,
        torch_dtype=torch.bfloat16 if device == "cuda" else torch.float32,
        device_map="auto" if device == "cuda" else None,
        trust_remote_code=True,
    )
    if device != "cuda":
        model.to(device)

    if args.text:
        prompt = build_inference_prompt(args.direction, args.text)
        result = translate(model, tokenizer, prompt, args.max_new_tokens, device, args.direction)
        print(f"\n{'='*60}")
        print(f"Direction: {args.direction}")
        print(f"Input:     {args.text}")
        print(f"Output:    {result}")
        print(f"{'='*60}\n")
    else:
        print("\n=== Maasai Translation Interactive Mode ===")
        print("Type 'quit' to exit. Type 'flip' to switch direction.\n")
        direction = args.direction
        while True:
            dir_label = "English → Maasai" if direction == "en_to_mas" else "Maasai → English"
            text = input(f"[{dir_label}] > ").strip()
            if text.lower() == "quit":
                break
            if text.lower() == "flip":
                direction = "mas_to_en" if direction == "en_to_mas" else "en_to_mas"
                print(f"Switched to: {'English → Maasai' if direction == 'en_to_mas' else 'Maasai → English'}")
                continue
            if not text:
                continue
            prompt = build_inference_prompt(direction, text)
            result = translate(model, tokenizer, prompt, args.max_new_tokens, device, direction)

            print(f"  → {result}\n")


if __name__ == "__main__":
    main()
