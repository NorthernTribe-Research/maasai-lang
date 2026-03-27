#!/usr/bin/env python3
"""
Export a fine-tuned model to GGUF format for llama.cpp inference.

This enables fast, CPU-compatible inference on HuggingFace Spaces and edge devices.

Usage:
    python scripts/export_gguf.py --model_dir outputs/maasai-en-mt-qlora --output_dir outputs/gguf
"""

from __future__ import annotations

import argparse
import logging
import subprocess
import sys
from pathlib import Path

LOGGER = logging.getLogger("export_gguf")


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export fine-tuned model to GGUF for llama.cpp")
    parser.add_argument("--model_dir", type=str, required=True,
                        help="Path to the fine-tuned model (merged, not adapter-only)")
    parser.add_argument("--output_dir", type=str, default="outputs/gguf",
                        help="Directory for GGUF output")
    parser.add_argument("--quantization", type=str, default="Q4_K_M",
                        choices=["Q4_0", "Q4_K_M", "Q5_K_M", "Q6_K", "Q8_0", "F16"],
                        help="GGUF quantization level (Q4_K_M is good balance of quality/size)")
    parser.add_argument("--model_name", type=str, default="maasai-en-mt",
                        help="Name for the output GGUF file")
    return parser.parse_args()


def merge_lora_adapter(base_model: str, adapter_dir: str, merged_dir: str) -> str:
    """Merge LoRA adapter weights into the base model for GGUF conversion."""
    LOGGER.info("Merging LoRA adapter into base model...")

    try:
        from peft import PeftModel
        from transformers import AutoModelForCausalLM, AutoTokenizer
        import torch

        # Load base model
        base = AutoModelForCausalLM.from_pretrained(
            base_model,
            torch_dtype=torch.float16,
            device_map="cpu",
            trust_remote_code=True,
        )
        tokenizer = AutoTokenizer.from_pretrained(base_model, trust_remote_code=True)

        # Load and merge adapter
        model = PeftModel.from_pretrained(base, adapter_dir)
        merged = model.merge_and_unload()

        # Save merged model
        merged_path = Path(merged_dir)
        merged_path.mkdir(parents=True, exist_ok=True)
        merged.save_pretrained(merged_path)
        tokenizer.save_pretrained(merged_path)

        LOGGER.info("Merged model saved to: %s", merged_path)
        return str(merged_path)

    except ImportError as e:
        LOGGER.error("Missing dependency for merge: %s. Install peft and transformers.", e)
        sys.exit(1)


def convert_to_gguf(model_dir: str, output_dir: str, quantization: str, model_name: str) -> None:
    """Convert a HuggingFace model to GGUF format using llama.cpp tools."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    fp16_path = output_path / f"{model_name}-f16.gguf"
    quant_path = output_path / f"{model_name}-{quantization}.gguf"

    # Step 1: Convert to FP16 GGUF
    LOGGER.info("Step 1: Converting to FP16 GGUF...")
    try:
        subprocess.run([
            sys.executable, "-m", "llama_cpp.convert",
            "--outfile", str(fp16_path),
            "--outtype", "f16",
            str(model_dir),
        ], check=True, capture_output=True, text=True)
        LOGGER.info("FP16 GGUF created: %s", fp16_path)
    except (subprocess.CalledProcessError, FileNotFoundError):
        # Fallback: try llama.cpp convert script directly
        LOGGER.info("Trying alternative conversion method...")
        try:
            subprocess.run([
                sys.executable, "convert_hf_to_gguf.py",
                "--outfile", str(fp16_path),
                "--outtype", "f16",
                str(model_dir),
            ], check=True, capture_output=True, text=True)
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            LOGGER.error(
                "GGUF conversion requires llama.cpp tools. Install with:\n"
                "  pip install llama-cpp-python\n"
                "Or clone llama.cpp and use convert_hf_to_gguf.py\n"
                "Error: %s", e
            )
            sys.exit(1)

    # Step 2: Quantize
    if quantization != "F16":
        LOGGER.info("Step 2: Quantizing to %s...", quantization)
        try:
            subprocess.run([
                "llama-quantize", str(fp16_path), str(quant_path), quantization,
            ], check=True, capture_output=True, text=True)
            LOGGER.info("Quantized GGUF created: %s", quant_path)
        except FileNotFoundError:
            LOGGER.warning(
                "llama-quantize not found. The FP16 GGUF is ready at: %s\n"
                "To quantize, install llama.cpp and run:\n"
                "  llama-quantize %s %s %s",
                fp16_path, fp16_path, quant_path, quantization,
            )
    else:
        LOGGER.info("Skipping quantization (F16 requested). Output: %s", fp16_path)


def main() -> None:
    setup_logging()
    args = parse_args()

    model_path = Path(args.model_dir)

    # Check if this is an adapter-only checkpoint (has adapter_config.json)
    adapter_config = model_path / "adapter_config.json"
    if adapter_config.exists():
        import json
        with adapter_config.open() as f:
            config = json.load(f)
        base_model = config.get("base_model_name_or_path", "google/gemma-3-4b-it")
        merged_dir = str(model_path.parent / f"{model_path.name}-merged")
        LOGGER.info("Detected LoRA adapter. Base model: %s", base_model)
        model_dir = merge_lora_adapter(base_model, str(model_path), merged_dir)
    else:
        model_dir = str(model_path)

    convert_to_gguf(model_dir, args.output_dir, args.quantization, args.model_name)

    LOGGER.info("\n=== Export Complete ===")
    LOGGER.info("Output directory: %s", args.output_dir)
    LOGGER.info("\nTo use with llama-cpp-python:")
    LOGGER.info("  from llama_cpp import Llama")
    LOGGER.info("  llm = Llama(model_path='%s/%s-%s.gguf')",
                args.output_dir, args.model_name, args.quantization)
    LOGGER.info("  output = llm('Translate to Maasai: Hello')")


if __name__ == "__main__":
    main()
