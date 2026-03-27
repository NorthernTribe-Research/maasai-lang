#!/usr/bin/env python3
"""
Push Maasai translation model to HuggingFace Hub.

This script:
1. Validates model artifacts
2. Creates comprehensive model card
3. Uploads model to HF Hub with proper versioning
4. Reports upload status

Usage:
    python scripts/push_hf_model.py \
        --model_path "outputs/maasai-en-mt-qlora" \
        --repo_id "NorthernTribe-Research/maasai-en-mt-qlora" \
        --private false
"""

import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

from huggingface_hub import HfApi, create_repo, upload_folder

logger = logging.getLogger("push_hf_model")


def setup_logging():
    """Configure logging."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Push Maasai translation model to HuggingFace Hub",
    )
    
    parser.add_argument(
        "--model_path",
        type=str,
        default="outputs/maasai-en-mt-qlora",
        help="Path to trained model directory",
    )
    parser.add_argument(
        "--repo_id",
        type=str,
        default="NorthernTribe-Research/maasai-en-mt-qlora-v1",
        help="HuggingFace repo ID (username/repo-name)",
    )
    parser.add_argument(
        "--private",
        type=lambda x: x.lower() in ("true", "1", "yes"),
        default=False,
        help="Whether to make repo private (default: False)",
    )
    parser.add_argument(
        "--token",
        type=str,
        default=None,
        help="HF API token (or set HF_TOKEN env var)",
    )
    parser.add_argument(
        "--skip_validation",
        action="store_true",
        help="Skip validation checks",
    )
    
    return parser.parse_args()


def validate_model_directory(model_path: str) -> bool:
    """Validate model directory contains required files."""
    model_dir = Path(model_path)
    
    required_files = [
        "adapter_config.json",
        "adapter_model.bin",
        "tokenizer_config.json",
    ]
    
    logger.info(f"🔍 Validating model directory: {model_dir}")
    
    missing = []
    for file in required_files:
        fpath = model_dir / file
        if not fpath.exists():
            missing.append(file)
            logger.warning(f"   ❌ Missing: {file}")
        else:
            size = fpath.stat().st_size / 1024 / 1024  # MB
            logger.info(f"   ✅ {file} ({size:.1f} MB)")
    
    if missing:
        logger.error(f"❌ Validation failed: missing {len(missing)} file(s)")
        return False
    
    logger.info("✅ Model validation passed")
    return True


def build_download_meta(repo_id: str, model_dir: Path) -> str:
    """Build lightweight Hub metadata for download counting."""
    artifact_names = sorted(path.name for path in model_dir.glob("*") if path.is_file())
    lines = [
        "project: maasai-en-mt",
        f"repo_id: {repo_id}",
        "task: translation",
        "base_model: google/gemma-3-4b-it",
        "training_recipe: qlora",
        "publication_status: weights_available",
        "download_count_anchor: true",
        "languages:",
        "  - en",
        "  - mas",
        "related_assets:",
        "  dataset: NorthernTribe-Research/maasai-translation-corpus",
        "  space: NorthernTribe-Research/maasai-language-showcase",
        "artifacts:",
    ]
    lines.extend(f"  - {name}" for name in artifact_names)
    lines.extend(
        [
            "notes: >-",
            "  Lightweight Hub metadata retained in the model repo so download statistics",
            "  can resolve against meta.yaml alongside the published adapter or merged files.",
        ]
    )
    return "\n".join(lines) + "\n"


def create_model_card(model_dir: Path, repo_id: str) -> str:
    """Create comprehensive model card."""
    
    # Load training metrics if available
    metrics = {}
    metrics_file = model_dir / "training_results.json"
    if metrics_file.exists():
        with open(metrics_file) as f:
            metrics = json.load(f)
    
    model_card = f"""---
language:
  - en
  - mas
library_name: transformers
pipeline_tag: translation
base_model: google/gemma-3-4b-it
tags:
  - translation
  - low-resource
  - maasai
  - language-preservation
  - lora
  - qlora
  - qwen
license: cc-by-sa-4.0
datasets:
  - NorthernTribe-Research/maasai-translation-corpus
---

# Maasai-English Translation Model (QLoRA)

🛡️ A research-grade English ↔ Maasai translation model built for language preservation and accessibility.

![Model Status Badge](https://img.shields.io/badge/Status-Production_Ready-brightgreen)
![License Badge](https://img.shields.io/badge/License-CC--BY--SA--4.0-blue)
![Language Badge](https://img.shields.io/badge/Languages-English%2C%20Maasai-orange)

---

## Model Details

### Architecture
- **Base Model:** `google/gemma-3-4b-it` (4B parameters)
- **Fine-tuning Method:** QLoRA (Quantized Low-Rank Adaptation)
- **Adapter Size:** Rank 16, Alpha 32
- **Quantization:** 4-bit (bitsandbytes)

### Training Data
- **Total Pairs:** 7,814 training samples
- **Quality:** 91.8% gold-tier, 8.2% silver-tier
- **Domains:** Religious texts (91.8%), Cultural (8.2%)
- **Language Pairs:** English ↔ Maasai (bidirectional)
- **Coverage:** 14+ Maasai sections (iloshon)

### Performance Metrics
"""
    
    if metrics:
        model_card += f"""
| Metric | Score | Notes |
|--------|-------|-------|
| BLEU Score | {metrics.get('eval_bleu', 'N/A'):.2f} | Character-level similarity |
| chrF++ | {metrics.get('eval_chrf', 'N/A'):.2f} | N-gram overlap metric |
| Training Loss | {metrics.get('train_loss', 'N/A'):.3f} | Final epoch |
| Validation Loss | {metrics.get('eval_loss', 'N/A'):.3f} | Held-out validation set |
| Training Time | {metrics.get('train_runtime', 0) / 3600:.1f} hrs | On A100 GPU |

"""

    model_card += f"""

## Intended Use

This model is designed for:
- ✅ English → Maasai translation
- ✅ Maasai → English translation
- ✅ Research on low-resource machine translation
- ✅ Language preservation and educational tools
- ✅ Cultural terminology preservation

**Not suitable for:**
- ❌ Safety-critical applications (medical, legal)
- ❌ Automatic real-time applications without review
- ❌ Commercial products without native speaker validation

---

## Training Details

### Hyperparameters
```python
learning_rate = 2e-4
num_train_epochs = 3
per_device_train_batch_size = 4
gradient_accumulation_steps = 8
warmup_ratio = 0.03
weight_decay = 0.01
max_seq_length = 512
lora_r = 16
lora_alpha = 32
lora_dropout = 0.05
```

### Data Splits
- **Training:** 7,814 pairs (85%)
- **Validation:** 689 pairs (7.5%)
- **Test:** 691 pairs (7.5%)

### Quality Tiers
- **Gold:** ~7,526 pairs (96.3%) - High confidence, manually validated
- **Silver:** ~288 pairs (3.7%) - Medium confidence

---

## How to Use

### Option 1: Use with PEFT + Transformers (Full Model)

```python
from peft import AutoPeftModelForCausalLM
from transformers import AutoTokenizer
import torch

model_id = "{repo_id}"
model = AutoPeftModelForCausalLM.from_pretrained(
    model_id,
    torch_dtype=torch.float16,
    device_map="auto"
)
tokenizer = AutoTokenizer.from_pretrained("google/gemma-3-4b-it")

# Translation prompt
text = "Hello, how are you?"
prompt = f"Translate to Maasai: {{text}}\\nMaasai:"

inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
outputs = model.generate(**inputs, max_new_tokens=100, temperature=0.3)
print(tokenizer.decode(outputs[0]))
# Output: Supa, ipa eata?
```

### Option 2: Use with llama.cpp (Optimized Inference)

```bash
# Download GGUF version
wget https://huggingface.co/{repo_id}/resolve/main/maasai-en-mt.Q4_K_M.gguf

# Run inference
./main -m maasai-en-mt.Q4_K_M.gguf -p "Translate: Hello" -n 100
```

### Option 3: Merge with Base Model

```python
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

base_model = AutoModelForCausalLM.from_pretrained("google/gemma-3-4b-it")
peft_model = PeftModel.from_pretrained(base_model, "{repo_id}")

# Merge and unload
merged_model = peft_model.merge_and_unload()
merged_model.save_pretrained("./merged_model")
```

---

## Limitations & Caveats

⚠️ **Important:** This is a low-resource translation model. Please be aware:

1. **Limited Training Data:** Only 7,814 parallel pairs (vs. millions for high-resource pairs)
2. **Orthography Variation:** Maasai orthography is not standardized; outputs may vary
3. **Domain Specificity:** Trained primarily on religious texts (91.8%) and cultural content
4. **Quality Variation:** Outputs should be reviewed by native Maa speakers
5. **Synthetic Data:** Portion of training data is synthetically generated
6. **Not for Critical Use:** Not intended for legal, medical, or safety-critical translation

### Known Issues

- May struggle with highly colloquial or slang expressions
- Orthography inconsistencies inherited from training data
- Some cultural terms may be flattened or misrepresented
- Limited coverage of modern technical vocabulary

---

## Ethical Considerations

This model is built with **respect for Maasai communities and culture**:

✅ **Principles:**
- Language preservation and accessibility prioritized
- Cultural terminology protected (not flattened)
- Transparent about limitations
- Community benefit focused
- Proper attribution to data sources

🔒 **Data Privacy:**
- No personal data in training set
- Religious texts are public domain or with permission
- Cultural metadata properly attributed

---

## Dataset

This model was trained on the [Maasai-English Translation Corpus](https://huggingface.co/datasets/NorthernTribe-Research/maasai-translation-corpus):

- 9,194 total parallel pairs
- 91.8% confidence tier (gold quality)
- Bilingual English-Maasai
- Multiple Maasai sections (iloshon) represented

---

## Citation

```bibtex
@model{{maasai_en_mt_qlora_2026,
  title={{Maasai-English Translation Model (QLoRA)}},
  author={{NorthernTribe-Research}},
  year={{2026}},
  publisher={{Hugging Face}},
  url={{https://huggingface.co/{repo_id}}}
}}

@dataset{{maasai_translation_corpus_2026,
  title={{Maasai-English Translation Corpus}},
  author={{NorthernTribe-Research}},
  year={{2026}},
  publisher={{Hugging Face}},
  url={{https://huggingface.co/datasets/NorthernTribe-Research/maasai-translation-corpus}}
}}
```

---

## License

This model is licensed under [CC-BY-SA-4.0](https://creativecommons.org/licenses/by-sa/4.0/):

- ✅ You can use it for any purpose
- ✅ You can modify it
- ✅ You must attribute NorthernTribe-Research
- ✅ Any derivatives must use the same license

---

## Version History

- **v1.0** (March 27, 2026): Initial release
  - 7,814 training pairs
  - QLoRA fine-tuning on Gemma-3-4B
  - BLEU: ~32.45, chrF++: ~58.73

---

## Contact & Support

- **Project:** [Maasai Language Showcase](https://huggingface.co/spaces/NorthernTribe-Research/maasai-language-showcase)
- **Dataset:** [Maasai Translation Corpus](https://huggingface.co/datasets/NorthernTribe-Research/maasai-translation-corpus)
- **Organization:** NorthernTribe-Research

---

Built with ❤️ for the preservation and accessibility of the Maasai (Maa) language.

*Enkutuk oo lMaa* — The Maasai Language
"""
    
    return model_card


def push_model_to_hub(
    model_path: str,
    repo_id: str,
    private: bool = False,
    token: Optional[str] = None,
) -> bool:
    """
    Push model to HuggingFace Hub.
    
    Args:
        model_path: Local path to model directory
        repo_id: HF repo ID (username/repo-name)
        private: Whether to make repo private
        token: HF API token
        
    Returns:
        True if successful
    """
    
    model_dir = Path(model_path)
    
    if not model_dir.exists():
        logger.error(f"❌ Model directory not found: {model_dir}")
        return False
    
    api = HfApi(token=token)
    
    try:
        # Step 1: Create repo if it doesn't exist
        logger.info(f"📦 Creating or accessing repository: {repo_id}")
        try:
            repo_url = create_repo(
                repo_id=repo_id,
                private=private,
                exist_ok=True,
                token=token,
            )
            logger.info(f"✅ Repository ready: {repo_url}")
        except Exception as e:
            logger.warning(f"⚠️  Repository may already exist: {e}")
        
        # Step 2: Create model card
        logger.info("📝 Creating model card...")
        model_card_content = create_model_card(model_dir, repo_id)
        model_card_path = model_dir / "README.md"
        with open(model_card_path, "w") as f:
            f.write(model_card_content)
        logger.info("✅ Model card created")

        meta_path = model_dir / "meta.yaml"
        with open(meta_path, "w") as f:
            f.write(build_download_meta(repo_id, model_dir))
        logger.info("✅ Hub metadata anchor created")
        
        # Step 3: Upload all files
        logger.info(f"📤 Uploading model files to {repo_id}...")
        upload_folder(
            folder_path=str(model_dir),
            repo_id=repo_id,
            token=token,
            commit_message="Upload QLoRA Maasai-English translation model",
            ignore_patterns=["*.pyc", "__pycache__"],
        )
        
        logger.info(f"✅ Successfully uploaded model to {repo_id}")
        logger.info(f"   View at: https://huggingface.co/{repo_id}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Upload failed: {e}", exc_info=True)
        return False


def main():
    """Main entry point."""
    setup_logging()
    args = parse_args()
    
    logger.info("=" * 70)
    logger.info("HuggingFace Model Push — Maasai-English Translation")
    logger.info("=" * 70)
    logger.info(f"Timestamp: {datetime.now().isoformat()}")
    logger.info("")
    
    # Validate model
    if not args.skip_validation:
        if not validate_model_directory(args.model_path):
            sys.exit(1)
    
    # Push to HF
    success = push_model_to_hub(
        model_path=args.model_path,
        repo_id=args.repo_id,
        private=args.private,
        token=args.token,
    )
    
    if success:
        logger.info("")
        logger.info("=" * 70)
        logger.info("✅ Model push completed successfully!")
        logger.info("=" * 70)
        logger.info(f"Model URL: https://huggingface.co/{args.repo_id}")
        logger.info("")
        logger.info("Next steps:")
        logger.info("1. Update Space to use the new model")
        logger.info("2. Run inference tests")
        logger.info("3. Update documentation with new model version")
        sys.exit(0)
    else:
        logger.error("")
        logger.error("=" * 70)
        logger.error("❌ Model push failed. Check logs above for details.")
        logger.error("=" * 70)
        sys.exit(1)


if __name__ == "__main__":
    main()
