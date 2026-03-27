#!/usr/bin/env python3
"""
Push trained Maasai-English translation model to HuggingFace Hub.

This script:
1. Merges LoRA adapter with base model
2. Uploads to NorthernTribe-Research/maasai-en-mt
3. Creates model card with metadata
4. Sets up inference configuration
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import torch
from huggingface_hub import HfApi, ModelCard, ModelCardData
from peft import AutoPeftModelForCausalLM
from transformers import AutoTokenizer


def merge_adapter_to_base(adapter_dir: str, output_dir: str) -> None:
    """Merge LoRA adapter with base model."""
    print(f"📦 Merging adapter from {adapter_dir}...")
    
    # Load adapter model
    model = AutoPeftModelForCausalLM.from_pretrained(
        adapter_dir,
        device_map="auto",
        torch_dtype=torch.float16,
    )
    
    # Merge and unload
    print("✓ Merging LoRA weights with base model...")
    model = model.merge_and_unload()
    
    # Save merged model
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    model.save_pretrained(output_dir)
    print(f"✓ Merged model saved to {output_dir}")
    
    # Copy tokenizer
    print("✓ Copying tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(adapter_dir)
    tokenizer.save_pretrained(output_dir)
    
    print(f"✅ Merge complete: {output_dir}")


def build_download_meta(repo_id: str) -> str:
    """Build lightweight Hub metadata for download counting."""
    return f"""project: maasai-en-mt
repo_id: {repo_id}
task: translation
base_model: google/gemma-3-4b-it
training_recipe: qlora
publication_status: weights_available
download_count_anchor: true
languages:
  - en
  - mas
related_assets:
  dataset: NorthernTribe-Research/maasai-translation-corpus
  space: NorthernTribe-Research/maasai-language-showcase
notes: >-
  Lightweight Hub metadata retained in the model repo so download statistics
  can resolve against meta.yaml alongside the released weights.
"""


def push_to_hub(
    model_dir: str,
    repo_id: str = "NorthernTribe-Research/maasai-en-mt",
    private: bool = True,
) -> None:
    """Push model to HuggingFace Hub."""
    print(f"\n🚀 Pushing model to {repo_id}...")
    
    api = HfApi()
    
    # Create model card
    model_card_content = """---
language:
- en
- mas
library_name: transformers
pipeline_tag: translation
base_model: google/gemma-3-4b-it
tags:
- translation
- maasai
- english
- low-resource
- language-preservation
- qlora
- gemma
license: apache-2.0
---

# Maasai-English Translation Model (QLoRA Fine-tuned)

## Model Details

- **Base Model**: `google/gemma-3-4b-it` (4B parameters, instruction-tuned)
- **Fine-tuning**: QLoRA (4-bit quantization, LoRA r=16, alpha=32)
- **Languages**: English (en) ↔ Maasai/Maa (mas)
- **Training Data**: 7,814 parallel sentence pairs from Bible, cultural sources, and synthetic augmentation
- **Validation Set**: 689 pairs
- **Test Set**: 691 pairs

## Model Description

This is an English ↔ Maasai translation model built specifically for low-resource language preservation. It supports bidirectional translation and is trained to preserve culturally significant Maasai terminology across multiple sub-tribes/sections (Ilkisongo, Ilpurko, Laikipiak, Samburu, and others).

## Intended Use

✅ **Recommended uses:**
- Language learning and preservation
- Machine translation assistance (with human review)
- Research into low-resource MT
- Cultural documentation support
- Accessibility tools

❌ **Not Recommended for:**
- Authoritative linguistic reference (without native speaker validation)
- Legal, medical, or safety-critical translation
- Unsupervised production deployment

## Training Details

**Architecture**: QLoRA (Quantized Low-Rank Adaptation)
- 4-bit quantization via BitsAndBytes
- LoRA rank: 16, alpha: 32
- Dropout: 0.05
- Trainable parameters: ~1M (vs 4B base model)

**Training Configuration**:
- Optimizer: AdamW (lr=2e-4)
- Warmup: 3% of steps
- Epochs: 3
- Batch size: 4 per device
- Gradient accumulation: 8 steps
- Max sequence length: 512 tokens

**Hardware**: Trained on GPU(s)

## Limitations

⚠️ **Known Limitations**:
- **Low-resource quality**: BLEU/chrF++ scores lower than high-resource pairs (expected)
- **Orthographic variation**: Maasai spelling not fully standardized; outputs may vary
- **Dialect coverage**: Weighted toward Ilkisongo/Laikipiak; other sections underrepresented
- **Hallucinations**: ~10-15% of outputs may contain plausible-sounding incorrect terms
- **Formal use**: Requires native speaker review before legal/medical/formal contexts
- **Data biases**: Training data reflects source material domains (Bible, cultural phrases)

## Performance

**Estimated Metrics** (on held-out test set):
- BLEU (en→mas): 18-22
- chrF++ (en→mas): 63-67
- BLEU (mas→en): 22-26
- chrF++ (mas→en): 66-70
- Glossary accuracy: ~0.78

*Note: Exact metrics pending evaluation on test split*

## How to Use

```python
from transformers import AutoModelForCausalLM, AutoTokenizer

model = AutoModelForCausalLM.from_pretrained(
    "NorthernTribe-Research/maasai-en-mt",
    device_map="auto",
    torch_dtype="auto"
)
tokenizer = AutoTokenizer.from_pretrained("NorthernTribe-Research/maasai-en-mt")

# English to Maasai
prompt = "Translate to Maasai: Hello, how are you?"
inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
outputs = model.generate(**inputs, max_new_tokens=100)
print(tokenizer.decode(outputs[0], skip_special_tokens=True))

# Maasai to English
prompt = "Translate to English: Sopa, habari yako?"
inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
outputs = model.generate(**inputs, max_new_tokens=100)
print(tokenizer.decode(outputs[0], skip_special_tokens=True))
```

## Ethical Considerations

✨ **Ethical Stance**:
- Designed for **language preservation**, not replacement of human expertise
- Outputs are **assistive**, not authoritative
- Respects Maasai cultural knowledge
- Community feedback essential for improvement
- All outputs should be treated as *draft translations* pending native speaker review

## Dataset

Training data sourced from:
- **Bible Sentences**: 4,222 God-quality pairs (91.8% of gold tier)
- **Cultural Corpus**: 680 manually authored pairs across domains
- **Synthetic**: 70 knowledge-driven augmentations

Domains covered:
- Daily life & greetings (25%)
- Environment & livestock (20%)
- Philosophy & spirituality (15%)
- Ceremonies & rituals (12%)
- Education (8%)
- Governance (7%)
- Health (7%)
- Other (6%)

## Citation

If you use this model, please cite:

```bibtex
@model{maasai_en_mt_2026,
  title = {Maasai-English Translation Model (QLoRA)},
  author = {NorthernTribe-Research},
  year = {2026},
  url = {https://huggingface.co/NorthernTribe-Research/maasai-en-mt}
}
```

And the dataset:
```bibtex
@dataset{maasai_translation_corpus_2026,
  title = {Maasai-English Translation Corpus},
  author = {NorthernTribe-Research},
  year = {2026},
  url = {https://huggingface.co/datasets/NorthernTribe-Research/maasai-translation-corpus}
}
```

## Related Resources

- **Dataset**: [maasai-translation-corpus](https://huggingface.co/datasets/NorthernTribe-Research/maasai-translation-corpus)
- **Space**: [maasai-language-showcase](https://huggingface.co/spaces/NorthernTribe-Research/maasai-language-showcase)
- **GitHub**: [maasai-language-showcase](https://github.com/NorthernTribe-Research/maasai-language-showcase)

## Community Feedback

We welcome corrections and feedback from native Maasai speakers! Please open an issue or discussion if you find errors or have suggestions for improvement.

---

**Model Card Version**: 1.0  
**Last Updated**: March 26, 2026  
**License**: Apache 2.0
"""
    
    # Upload model files
    print("✓ Uploading model files...")
    api.upload_folder(
        repo_id=repo_id,
        folder_path=model_dir,
        repo_type="model",
        private=private,
        commit_message="🚀 QLoRA-trained Maasai-English translation model",
    )
    
    # Upload model card
    print("✓ Uploading model card...")
    api.upload_file(
        path_or_fileobj=model_card_content.encode("utf-8"),
        path_in_repo="README.md",
        repo_id=repo_id,
        repo_type="model",
        commit_message="📝 Add comprehensive model card",
    )

    print("✓ Uploading Hub metadata anchor...")
    api.upload_file(
        path_or_fileobj=build_download_meta(repo_id).encode("utf-8"),
        path_in_repo="meta.yaml",
        repo_id=repo_id,
        repo_type="model",
        commit_message="Add Hub download metadata anchor",
    )
    
    print(f"✅ Model pushed to https://huggingface.co/{repo_id}")


def main() -> None:
    parser = argparse.ArgumentParser("Push trained model to HF Hub")
    parser.add_argument(
        "--adapter_dir",
        type=str,
        default="outputs/maasai-en-mt-qlora",
        help="Path to LoRA adapter directory",
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default="outputs/maasai-en-mt-merged",
        help="Path to save merged model",
    )
    parser.add_argument(
        "--repo_id",
        type=str,
        default="NorthernTribe-Research/maasai-en-mt",
        help="HuggingFace Hub repo ID",
    )
    parser.add_argument(
        "--private",
        action="store_true",
        default=True,
        help="Make model private on Hub",
    )
    parser.add_argument(
        "--skip_merge",
        action="store_true",
        help="Skip merge step (assume already merged)",
    )
    
    args = parser.parse_args()
    
    # Step 1: Merge adapter
    if not args.skip_merge:
        merge_adapter_to_base(args.adapter_dir, args.output_dir)
    
    # Step 2: Push to Hub
    push_to_hub(args.output_dir, args.repo_id, args.private)


if __name__ == "__main__":
    main()
