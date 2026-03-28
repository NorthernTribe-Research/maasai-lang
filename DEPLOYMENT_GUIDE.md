# DEPLOYMENT GUIDE: DeepSeek-Enhanced Maasai Language Model

## 📋 Overview

This guide walks through the complete pipeline for training and deploying a production-ready Maasai-English translation model using DeepSeek best practices.

**Timeline:** ~3-5 days on single GPU, or 1-2 days on multi-GPU

---

## 🎯 Phase 1: Dataset Preparation

### Step 1a: Quality Assessment
Evaluate all existing data (Bible extracts, cultural pairs, synthetic data):

```bash
# Assess data quality, organize into tiers (Gold/Silver/Bronze)
python scripts/assess_data_quality.py

# Output:
# - data/processed/data_gold_tier.jsonl      (~1% - high confidence)
# - data/processed/data_silver_tier.jsonl    (~1% - manually authored)
# - data/processed/data_bronze_tier.jsonl    (~98% - synthetic/exploratory)
# - data/processed/quality_report.json       (detailed metrics + recommendations)
```

**Review the report:**
```bash
cat data/processed/quality_report.json | python -m json.tool
```

### Step 1b: Generate Synthetic Augmentation
Create knowledge-driven synthetic pairs to boost high-value domains:

```bash
python scripts/generate_synthetic_augmented.py

# Output: data/raw/synthetic_augmented.jsonl (70+ high-confidence pairs)
```

### Step 1c: Prepare Training Data
Merge and split data according to DeepSeek curriculum learning:

```bash
python scripts/prepare_data.py \
  --input_dir data/raw \
  --output_dir data/final_v3 \
  --train_ratio 0.85 \
  --valid_ratio 0.075 \
  --test_ratio 0.075

# Output:
# - data/final_v3/train.jsonl   (7,991 rows)
# - data/final_v3/valid.jsonl   (707 rows)
# - data/final_v3/test.jsonl    (708 rows)
```

**Verify dataset stats:**
```bash
wc -l data/final_v3/*.jsonl
head -1 data/final_v3/train.jsonl | python -m json.tool
```

---

## 🚂 Phase 2: Model Training

### Step 2a: Configure QLoRA Training
Edit training parameters in `training/lora_config.yaml`:

```yaml
r: 16                          # LoRA rank
lora_alpha: 32                 # LoRA scaling
target_modules: ["q_proj", "v_proj", "k_proj", "o_proj", "up_proj", "down_proj"]
lora_dropout: 0.05
learning_rate: 2e-4
num_train_epochs: 3
per_device_train_batch_size: 4
gradient_accumulation_steps: 2
warmup_steps: 500
weight_decay: 0.01
```

### Step 2b: Start Training (GPU Required)
```bash
bash training/run_train.sh

# Expects:
# - CUDA-capable GPU (tested on V100/A100)
# - GPU memory sized for the current Qwen QLoRA configuration
# - ~24 hours for 3 epochs on single GPU
# - Multiple GPUs supported via Hugging Face accelerate
```

**Monitor training:**
```bash
# Watch logs in real-time
tail -f training/train.log

# Check wandb dashboard (if enabled in train script)
# https://wandb.ai/your-username/maasai-training
```

### Step 2c: Evaluate Model Checkpoints
After training completes:

```bash
# Compute BLEU/chrF++ on test set
python scripts/evaluate_mt.py \
  --model_path outputs/maasai-en-mt \
  --test_file data/final_v3/test.jsonl

# Output: BLEU, chrF++, per-domain scores, error analysis
```

---

## 🚀 Phase 3: Export to GGUF (for llama.cpp)

### Step 3a: Convert to GGUF Format
```bash
# Convert LoRA-adapted model to GGUF (quantized)
python scripts/export_gguf.py \
  --model_path outputs/maasai-en-mt \
  --output_dir outputs/gguf \
  --quantization Q4_K_M

# Output: outputs/gguf/maasai-en-mt-Q4_K_M.gguf (~2.5GB)
```

**Quantization options:**
- `fp16`: Full precision, ~7.5GB, best quality
- `Q6_K`: ~4GB, high quality, slower
- `Q5_K_M`: ~3.5GB, good balance (recommended)
- `Q4_K_M`: ~2.5GB, fast, minimal quality loss (for deployment)

### Step 3b: Test GGUF Model Locally
```bash
# Single translation test
python scripts/infer_llama_cpp_optimized.py \
  --model_path outputs/gguf/maasai-en-mt-Q4_K_M.gguf \
  --text "How are you?" \
  --direction en_to_mas \
  --temperature 0.3 \
  --gpu_layers -1

# Interactive mode
python scripts/infer_llama_cpp_optimized.py \
  --model_path outputs/gguf/maasai-en-mt-Q4_K_M.gguf \
  --interactive \
  --gpu_layers 35  # Offload 35 layers to GPU
```

**Expected latency:**
- CPU only: 150-300ms per translation
- GPU offload (35/40 layers): 30-50ms per translation
- Batch (8x): 400-600ms per batch

---

## 📊 Phase 4: Inference at Scale

### Step 4a: Batch Translation
Translate large files efficiently:

```bash
# Prepare input file (JSONL format)
cat > test_batch.jsonl << EOF
{"id": 1, "text": "Hello, how are you?", "direction": "en_to_mas"}
{"id": 2, "text": "The weather is beautiful today", "direction": "en_to_mas"}
{"id": 3, "text": "Sopa habari", "direction": "mas_to_en"}
EOF

# Run batch inference
python scripts/infer_llama_cpp_optimized.py \
  --model_path outputs/gguf/maasai-en-mt-Q4_K_M.gguf \
  --batch_file test_batch.jsonl \
  --output_file test_batch_output.jsonl \
  --batch_size 8 \
  --gpu_layers -1

# Check results
cat test_batch_output.jsonl | head -1 | python -m json.tool
```

### Step 4b: Performance Benchmarking
```bash
# Generate benchmark dataset
python -c "
import json
texts = [
    'Hello world' * 10,  # 20 tokens
    'The quick brown fox jumps over the lazy dog' * 20,  # 80 tokens
    'Maasai wisdom teaches patience and respect for all life' * 5  # 50 tokens
] * 10

with open('benchmark.jsonl', 'w') as f:
    for i, text in enumerate(texts):
        f.write(json.dumps({'id': i, 'text': text[:100], 'direction': 'en_to_mas'}) + '\n')
"

# Benchmark
time python scripts/infer_llama_cpp_optimized.py \
  --model_path outputs/gguf/maasai-en-mt-Q4_K_M.gguf \
  --batch_file benchmark.jsonl \
  --batch_size 16 \
  --gpu_layers -1
```

---

## 📱 Phase 5: Deploy to Hugging Face Space

### Step 5a: Update Space Application
```bash
# Copy optimized inference to space
cp scripts/infer_llama_cpp_optimized.py space/inference.py

# Update space/app.py to use new inference pipeline
# (See space/app.py comments for integration points)
```

### Step 5b: Push to HF Space
```bash
# Login to Hugging Face
huggingface-cli login

# Push updated space (with GGUF model + inference script)
cd space
git add -A
git commit -m "Integrate DeepSeek-optimized inference pipeline"
git push

# Space will build and deploy automatically (~5 mins)
# Visit: https://huggingface.co/spaces/NorthernTribe-Research/maasai-language-showcase
```

### Step 5c: Update Dataset + Model Cards
```bash
# Update dataset documentation
cat > data_card_update.md << EOF
## Updates (v2)
- Total pairs: 13,670 (expanded from 3,010)
- Gold tier: 82 high-confidence pairs
- Silver tier: 64 manually authored pairs
- Bronze tier: 13,524 exploratory/synthetic pairs
- Quality assessment: See quality_report.json
EOF

# Update model documentation
cat >> model_card.md << EOF

## Inference Optimization
- Quantization: Q4_K_M (2.5GB, 2-3x speedup)
- Batch inference supported (4-32 sequences)
- llama.cpp integration for CPU/GPU deployment
- Temperature tuned for deterministic translation (0.3)
EOF
```

---

## 🧪 Phase 6: Quality Assurance & Testing

### Step 6a: Manual Translation Review
Sample translations from test set and review culturally:

```bash
python -c "
import json
testfile = 'data/final_v3/test.jsonl'
samples = []
with open(testfile) as f:
    for i, line in enumerate(f):
        if i in [0, 10, 50, 100, 150]:  # Sample diverse points
            samples.append(json.loads(line))
            
for s in samples:
    print(f'EN: {s[\"source_text\"]}')
    print(f'Expected MA: {s[\"target_text\"]}')
    print('---')
"
```

**Review checklist:**
- [ ] Cultural terms preserved correctly
- [ ] Orthography consistent (not anglicized)
- [ ] Grammar/syntax natural to Maasai speakers
- [ ] No unauthorized modifications to sacred terms
- [ ] Glossary terms used appropriately

### Step 6b: Automated Eval (Zero-Shot)
```bash
# BLEU/chrF++ scores on held-out test set
python scripts/evaluate_mt.py \
  --model_path outputs/gguf/maasai-en-mt-Q4_K_M.gguf \
  --test_file data/final_v3/test.jsonl \
  --report eval_report.json

cat eval_report.json | python -m json.tool
```

### Step 6c: Error Analysis
```bash
# Identify failure patterns
python -c "
import json
with open('eval_report.json') as f:
    report = json.load(f)
    
print('Failed translations by domain:')
for domain, data in report.get('by_domain', {}).items():
    print(f'{domain}: {data.get(\"failures\", 0)} failures')
"
```

---

## 📈 Phase 7: Monitoring & Iteration

### Metrics to Track
| Metric | Target | Actual |
|--------|--------|--------|
| BLEU (test set) | 30-40 | — |
| chrF++ (test set) | 55-65 | — |
| Inference latency (CPU) | <300ms | — |
| Inference latency (GPU) | <50ms | — |
| Batch throughput | 4-8 tx/s CPU | — |
| Model size (Q4_K_M) | ~2.5GB | — |
| Memory (during inference) | <2GB | — |

### Continuous Improvement Cycle
1. **Collect user feedback** from Space (translations that fail)
2. **Analyze error patterns** (hallucinations, OOV, orthography)
3. **Add problematic examples** to training data (Gold/Silver tier)
4. **Retrain with new data** (no need for full retrain with LoRA)
5. **Deploy v1.1 model** to Space
6. **Repeat quarterly**

---

## 🆘 Troubleshooting

### Training Issues
**Error: CUDA out of memory**
- Reduce batch size: `per_device_train_batch_size: 2`
- Increase gradient accumulation: `gradient_accumulation_steps: 4`
- Use 8-bit quantization: `load_in_8bit: true`

**Error: Very high loss after epoch 1**
- Learning rate too high: try `1e-4`
- Data poisoned: re-enable `assess_data_quality.py`
- Check for duplicate pairs: `sort data/*.jsonl | uniq -d`

### Inference Issues
**Model loading fails (llama.cpp)**
- Ensure GGUF conversion succeeded
- Check file exists: `file outputs/gguf/*.gguf`
- Verify llama-cpp-python installed: `pip show llama-cpp-python`

**Slow inference (CPU)**
- Expected: 150-300ms is normal for 4B model on CPU
- Reduce context: `--n_ctx 512` instead of 2048
- Offload to GPU: `--gpu_layers -1`

**GPU memory exhausted**
- Reduce batch size: `--batch_size 2`
- Reduce context: `--n_ctx 1024`
- Use Q4_K_M quantization

---

## 📚 References

- **DeepSeek V3/R1 Papers**: https://github.com/deepseek-ai
- **llama.cpp Optimization**: https://github.com/ggerganov/llama.cpp
- **HuggingFace Spaces Deployment**: https://huggingface.co/docs/hub/spaces
- **Low-Resource MT Best Practices**: Findings from DeepSeek, Qwen, and other open-source projects

---

**Version:** 1.0  
**Last Updated:** March 26, 2026  
**Maintainer:** NorthernTribe-Research  
**License:** MIT (deployment guide); see model/dataset cards for artifact licenses
