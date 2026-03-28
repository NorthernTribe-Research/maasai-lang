# QUICK START: DeepSeek-Enhanced Maasai Translation

## 📦 What's New (v2)

### New Tools
1. **`scripts/assess_data_quality.py`** — Tier all data (Gold/Silver/Bronze)
2. **`scripts/infer_llama_cpp_optimized.py`** — Fast CPU/GPU inference with batching
3. **`scripts/generate_synthetic_augmented.py`** — Knowledge-driven synthetic pairs
4. **`scripts/simple_bible_extract.py`** — Extract Bible sentence pairs
5. **`DEPLOYMENT_GUIDE.md`** — Complete 7-phase deployment pipeline

### Enhanced Documentation
- Updated `SKILLS.md` with DeepSeek best practices (Section 2)
- New `DEPLOYMENT_GUIDE.md` with step-by-step pipeline
- This `QUICKSTART.md` guide

---

## 🚀 One-Command Execution

### Assess & Prepare Data
```bash
cd /home/ntr/Documents/huggingface/maasai-lang

# 1. Assess data quality (merge + tier)
.venv/bin/python3 scripts/assess_data_quality.py

# Output:
# ✓ Gold tier:   82 pairs (0.6%)
# ✓ Silver tier: 64 pairs (0.5%)
# ✓ Bronze tier: 13,524 pairs (98.9%)
# ✓ Report: data/processed/quality_report.json
```

### Generate Synthetic Data
```bash
# 2. Generate high-confidence synthetic pairs
.venv/bin/python3 scripts/generate_synthetic_augmented.py

# Output: 70 knowledge-driven pairs to data/raw/synthetic_augmented.jsonl
```

### Test Inference (after training)
```bash
# 3. Test inference with llama.cpp
.venv/bin/python3 scripts/infer_llama_cpp_optimized.py \
  --model_path outputs/gguf/model.gguf \
  --text "Hello, how are you?" \
  --direction en_to_mas \
  --temperature 0.3 \
  --gpu_layers -1

# For batch processing:
.venv/bin/python3 scripts/infer_llama_cpp_optimized.py \
  --model_path outputs/gguf/model.gguf \
  --batch_file inputs.jsonl \
  --output_file outputs.jsonl \
  --batch_size 8
```

---

## 📊 Current Dataset Status

```
Total Unique Pairs: 13,670

Source Breakdown:
  • Bible sentences (simple_bible_extract.py):     4,222 pairs
  • Cultural pairs (generate_cultural_pairs.py):     690 pairs  
  • Knowledge-driven synthetic (generate_synthetic_augmented.py): 70 pairs
  • Other raw data:                                 8,988 pairs

Quality Tiers:
  • Gold tier:   82 pairs (human-validated, production-ready)
  • Silver tier: 64 pairs (manually authored, not yet reviewed)
  • Bronze tier: 13,524 pairs (synthetic/exploratory, for curriculum learning)

Recommendation:
  Phase 2 training: Use Gold (82) + Silver (64) + sample of authentic Bronze (100-200)
  = ~250-350 high-confidence pairs as foundation
  Then gradually add more Bronze tier data with curriculum learning
```

---

## 🔧 Key Configuration Parameters

### For Training (`training/lora_config.yaml`)
```yaml
# DeepSeek-recommended settings for low-resource MT:
learning_rate: 2e-4              # Lower = more stable
num_train_epochs: 3              # Avoid overfitting with small data
per_device_train_batch_size: 4   # Small batches, longer training
gradient_accumulation_steps: 2   # Effective batch = 8
warmup_steps: 500                # Gradual warmup
weight_decay: 0.01               # L2 regularization
```

### For Inference  (`infer_llama_cpp_optimized.py`)
```bash
--temperature 0.3                # Lower = deterministic (good for translation)
--top_p 0.95                     # Nucleus sampling
--repetition_penalty 1.1         # Reduce hallucinations
--max_tokens 512                 # Conservative for translation
--quantization Q4_K_M            # 2-3x speedup, minimal quality loss
--gpu_layers -1                  # Auto-detect (CPU = -1 for auto)
```

---

## 📈 Performance Expectations

### After Phase 2 Training
| Metric | Expected | Notes |
|--------|----------|-------|
| BLEU | 30-40 | Realistic for low-resource MT |
| chrF++ | 55-65 | Better for morphologically rich languages |
| Training time | 24-48 hrs | Single GPU, 3 epochs |
| Model size | 2.5 GB (Q4) | ~7.5 GB full precision |

### Inference Speeds (llama.cpp)
| Hardware | Speed | Batch Size | Throughput |
|----------|-------|-----------|-----------|
| CPU (Ryzen 7) | 150-300ms | 1 | 3-7 tx/s |
| GPU (T4) | 50-100ms | 1 | 10-20 tx/s |
| GPU (V100) | 30-50ms | 8 | 20-30 tx/s |

---

## 🎯 Next Steps (Recommended Order)

1. **✅ Data Quality Assessment** (DONE)
   ```bash
   .venv/bin/python3 scripts/assess_data_quality.py
   ```
   → Generates Gold/Silver/Bronze tiers

2. **✅ Generate Synthetic Data** (DONE)
   ```bash
   .venv/bin/python3 scripts/generate_synthetic_augmented.py
   ```
   → Creates 70+ knowledge-driven pairs

3. **⏳ Prepare Training Data**
   ```bash
   .venv/bin/python3 scripts/prepare_data.py \
     --input_dir data/raw \
     --output_dir data/final_v3 \
     --train_ratio 0.85
   ```
   → Splits into train/valid/test

4. **⏳ Train Model** (requires GPU)
   ```bash
   bash training/run_train.sh
   ```
   → QLoRA training on the default Qwen base model

5. **⏳ Export to GGUF**
   ```bash
   .venv/bin/python3 scripts/export_gguf.py \
     --quantization Q4_K_M
   ```
   → Creates deployment-ready GGUF

6. **⏳ Test & Deploy**
   ```bash
   .venv/bin/python3 scripts/infer_llama_cpp_optimized.py \
     --model_path outputs/gguf/model.gguf \
     --interactive
   ```
   → Interactive translation testing

---

## 📚 Reading Guide

| Document | Purpose |
|----------|---------|
| [SKILLS.md](SKILLS.md) | Strategic roadmap (Sections 2 = DeepSeek practices) |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Step-by-step deployment pipeline (7 phases) |
| [QUICKSTART.md](QUICKSTART.md) | This file (quick reference) |
| [docs/model_card.md](docs/model_card.md) | Model documentation |
| [docs/dataset_card.md](docs/dataset_card.md) | Dataset documentation |
| [README.md](README.md) | Project overview |

---

## 🔍 Files Modified/Created (This Session)

**New Scripts:**
- ✅ `scripts/infer_llama_cpp_optimized.py` — Optimized inference
- ✅ `scripts/assess_data_quality.py` — Quality assessment
- ✅ `scripts/generate_synthetic_augmented.py` — Synthetic generation
- ✅ `scripts/simple_bible_extract.py` — Bible extraction (sentence-level)

**New Guides:**
- ✅ `DEPLOYMENT_GUIDE.md` — Complete deployment pipeline
- ✅ `QUICKSTART.md` — This file

**Enhanced Documentation:**
- ✅ `SKILLS.md` — Added Section 2 (DeepSeek practices)
- ✅ `SKILLS.md` — Updated intro with "NEW" note

**Data Generated:**
- ✅ `data/raw/bible_sentences.jsonl` — 4,222 Bible sentence pairs
- ✅ `data/raw/synthetic_augmented.jsonl` — 70 knowledge-driven pairs
- ✅ `data/processed/all_merged.jsonl` — 13,670 merged unique pairs
- ✅ `data/processed/data_gold_tier.jsonl` — 82 gold-tier pairs
- ✅ `data/processed/data_silver_tier.jsonl` — 64 silver-tier pairs
- ✅ `data/processed/data_bronze_tier.jsonl` — 13,524 bronze-tier pairs
- ✅ `data/processed/quality_report.json` — Quality metrics + recommendations

---

## 💡 Key Takeaways

### What DeepSeek Teaches Us
1. **Quality > Quantity**: Focus on gold/silver tiers, not raw volume
2. **Curriculum Learning**: Start easy, gradually increase difficulty
3. **Transparency**: Always report metrics + limitations
4. **Efficiency**: Quantization + batching make deployment practical
5. **Iteration**: Small improvements compound over time

### For Maasai Project
1. ✅ **82 gold-tier pairs** provide foundation for reliable training
2. ✅ **Tiered data** enables curriculum learning (easy→hard)
3. ✅ **Synthetic augmentation** strategically boosts low-resource domains
4. ✅ **llama.cpp** enables CPU deployment for community accessibility
5. ✅ **DeepSeek practices** proven at scale (for much larger models)

---

## 🤝 Next Conversation

**Recommended:** "Train the model with the prepared data and then deploy to Space"
- Will execute Phase 2 (training)
- Then Phase 3-4 (GGUF export + inference optimization)
- Then Phase 5 (Space deployment)

Or ask for:
- More synthetic data generation (e.g., knowledge discovery from Maasai texts)
- User feedback integration pipeline
- Evaluation benchmarking vs other MT systems
- Community contribution workflows

---

**Version:** 1.0  
**Date:** March 26, 2026  
**Status:** ✅ Ready for Phase 2 Training  
