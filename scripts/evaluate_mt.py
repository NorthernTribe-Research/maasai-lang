#!/usr/bin/env python3
"""
Evaluate a trained Maasai translation model on the test set.

Usage:
    python scripts/evaluate_mt.py \
        --model_dir outputs/maasai-en-mt-qlora \
        --test_file data/final_v3/test.jsonl \
        --glossary_file data/glossary/maasai_glossary.json \
        --output_file data/eval/eval_results.json
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any

import torch
from transformers import AutoModelForCausalLM

from src.modeling import load_text_formatter
from src.prompts import build_generation_prompt_from_user_prompt
LOGGER = logging.getLogger("evaluate_mt")


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_dir", type=str, default="outputs/maasai-en-mt-qlora")
    parser.add_argument("--base_model", type=str, default=None,
                        help="If using adapter, specify the base model name")
    parser.add_argument("--test_file", type=str, default="data/final_v3/test.jsonl")
    parser.add_argument("--glossary_file", type=str, default="data/glossary/maasai_glossary.json")
    parser.add_argument("--output_file", type=str, default="data/eval/eval_results.json")
    parser.add_argument("--max_new_tokens", type=int, default=128)
    parser.add_argument("--batch_size", type=int, default=1)
    parser.add_argument("--max_samples", type=int, default=None)
    parser.add_argument("--local_files_only", action="store_true")
    return parser.parse_args()


def load_test_data(path: str) -> list[dict]:
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def build_translation_prompt(source_text: str, source_lang: Any, target_lang: Any) -> str:
    source_lang = str(source_lang or "").strip().lower()
    target_lang = str(target_lang or "").strip().lower()
    source_text = str(source_text or "").strip()

    if source_lang == "en" and target_lang == "mas":
        return f'Translate the following English sentence to Maasai:\n"{source_text}"'
    if source_lang == "mas" and target_lang == "en":
        return f'Translate the following Maasai sentence to English:\n"{source_text}"'
    if source_lang and target_lang:
        return f'Translate from {source_lang} to {target_lang}:\n"{source_text}"'
    return f'Translate the following sentence:\n"{source_text}"'


def get_prompt_and_reference(sample: dict[str, Any]) -> tuple[str, str]:
    prompt = sample.get("prompt")
    completion = sample.get("completion")
    if prompt is not None and completion is not None:
        return str(prompt).strip(), str(completion).strip()

    source_text = sample.get("source_text")
    target_text = sample.get("target_text")
    if source_text is None or target_text is None:
        raise KeyError(
            "Evaluation data must include either prompt/completion or "
            "source_text/target_text fields."
        )

    return (
        build_translation_prompt(
            source_text=source_text,
            source_lang=sample.get("source_lang"),
            target_lang=sample.get("target_lang"),
        ),
        str(target_text).strip(),
    )


def load_model_and_tokenizer(args: argparse.Namespace, device: str):
    model_dir = Path(args.model_dir)
    formatter_source = args.model_dir
    if not model_dir.exists() and args.base_model:
        formatter_source = args.base_model
    if not (model_dir / "tokenizer_config.json").exists() and not (model_dir / "processor_config.json").exists() and args.base_model:
        formatter_source = args.base_model

    formatter, tokenizer = load_text_formatter(
        formatter_source,
        use_fast=True,
        trust_remote_code=True,
        local_files_only=args.local_files_only,
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model_kwargs = {
        "torch_dtype": torch.bfloat16 if device == "cuda" else torch.float32,
        "device_map": "auto" if device == "cuda" else None,
        "trust_remote_code": True,
        "local_files_only": args.local_files_only,
    }

    if (model_dir / "adapter_config.json").exists():
        from peft import AutoPeftModelForCausalLM

        LOGGER.info("Detected PEFT adapter checkpoint")
        model = AutoPeftModelForCausalLM.from_pretrained(args.model_dir, **model_kwargs)
    else:
        model = AutoModelForCausalLM.from_pretrained(args.model_dir, **model_kwargs)

    if device != "cuda":
        model.to(device)

    return model, formatter, tokenizer, formatter_source


def generate_translation(
    model,
    tokenizer,
    prompt: str,
    max_new_tokens: int = 128,
    device: str = "cpu",
) -> str:
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

    generated_tokens = outputs[0][inputs["input_ids"].shape[1]:]
    decoded = tokenizer.decode(generated_tokens, skip_special_tokens=True).strip()
    if decoded:
        return decoded

    full_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    marker = "### Response:"
    if marker in full_text:
        return full_text.split(marker, 1)[1].strip()
    return full_text.strip()


def main() -> None:
    setup_logging()
    args = parse_args()
    device = "cuda" if torch.cuda.is_available() else "cpu"

    LOGGER.info("Loading model from %s", args.model_dir)
    model, formatter, tokenizer, formatter_source = load_model_and_tokenizer(args, device)

    LOGGER.info("Loading test data from %s", args.test_file)
    test_data = load_test_data(args.test_file)
    if args.max_samples is not None:
        test_data = test_data[: args.max_samples]
    LOGGER.info("Test samples: %d", len(test_data))

    hypotheses = []
    references = []
    details = []

    for i, sample in enumerate(test_data):
        prompt, reference = get_prompt_and_reference(sample)
        prompt_text = build_generation_prompt_from_user_prompt(
            prompt,
            model_name_or_path=formatter_source,
            formatter=formatter,
        )

        hypothesis = generate_translation(model, tokenizer, prompt_text, args.max_new_tokens, device)
        hypotheses.append(hypothesis)
        references.append(reference)

        details.append({
            "id": sample.get("id", f"sample-{i}"),
            "prompt": prompt,
            "reference": reference,
            "hypothesis": hypothesis,
        })

        if (i + 1) % 50 == 0:
            LOGGER.info("Processed %d / %d", i + 1, len(test_data))

    # Compute metrics
    import sacrebleu
    bleu = sacrebleu.corpus_bleu(hypotheses, [references])
    chrf = sacrebleu.corpus_chrf(hypotheses, [references], word_order=2)

    results = {
        "bleu": bleu.score,
        "chrf++": chrf.score,
        "num_samples": len(test_data),
        "details": details,
    }

    # Glossary-based metrics
    glossary_path = Path(args.glossary_file)
    if glossary_path.exists():
        from src.glossary import MaasaiGlossary
        from src.metrics import terminology_accuracy
        glossary = MaasaiGlossary(glossary_path)
        results["terminology"] = terminology_accuracy(hypotheses, references, glossary)

    output_path = Path(args.output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    LOGGER.info("Results saved to %s", output_path)
    LOGGER.info("BLEU: %.2f | chrF++: %.2f", results["bleu"], results["chrf++"])


if __name__ == "__main__":
    main()
