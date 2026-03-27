# Google Colab Training Guide — Maasai Language Model

**Purpose:** Train the Maasai English Translation QLoRA model on free Google Colab GPU  
**Duration:** ~4-6 hours on Colab GPU (A100 or V100)  
**Requirements:** Google Account + HuggingFace token

---

## Quick Start (Copy-Paste Steps)

### Step 1: Clone Repository to Colab

Open [Google Colab](https://colab.research.google.com/) and paste this in a cell:

```python
!git clone https://huggingface.co/NorthernTribe-Research/maasai-lang repo
%cd repo
!git config --global credential.helper store
```

### Step 2: Authenticate with HuggingFace

```python
from huggingface_hub import notebook_login
notebook_login()
# Follow prompts to enter your HF token from https://huggingface.co/settings/tokens
```

### Step 3: Install Dependencies

```python
!pip install -q torch transformers peft accelerate datasets bitsandbytes sacrebleu evaluate
```

### Step 4: Execute Training

```bash
bash training/run_train.sh
```

**That's it!** Training will start and run for ~4-6 hours. Monitor progress in output logs.

---

## Detailed Setup (If Quick Start Fails)

### A. Set GPU & Check Resources

```python
import torch
print(f"GPU available: {torch.cuda.is_available()}")
print(f"GPU name: {torch.cuda.get_device_name(0)}")
print(f"GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.0f} GB")
```

Expected output:
```
GPU available: True
GPU name: Tesla A100-SXM4-40GB  (or V100 or T4)
GPU memory: 40 GB  (or 16-32 GB depending on type)
```

### B. Clone & Navigate

```bash
!git clone https://huggingface.co/NorthernTribe-Research/maasai-lang repo
cd repo
```

### C. Login to HuggingFace

```python
from huggingface_hub import notebook_login
notebook_login()
```

### D. Install Packages

```bash
!pip install -q \
  torch>=2.3.0 \
  transformers>=4.51.0 \
  datasets>=3.0.0 \
  accelerate>=1.0.0 \
  peft>=0.14.0 \
  trl>=0.16.0 \
  bitsandbytes>=0.45.0 \
  sentencepiece>=0.2.0 \
  sacrebleu>=2.4.0 \
  evaluate>=0.4.3
```

### E. Run Training Script Directly

```python
import sys
sys.path.insert(0, '/content/repo')

# Execute training
%cd /content/repo
!python scripts/train_qlora.py \
  --model_name "google/gemma-3-4b-it" \
  --train_file "data/final_v3/train.jsonl" \
  --valid_file "data/final_v3/valid.jsonl" \
  --output_dir "outputs/maasai-en-mt-qlora" \
  --num_train_epochs 3 \
  --per_device_train_batch_size 4 \
  --per_device_eval_batch_size 4 \
  --gradient_accumulation_steps 8 \
  --max_length 512 \
  --learning_rate 2e-4 \
  --seed 42
```

---

## Training Parameters Explained

| Parameter | Value | Reason |
|-----------|-------|--------|
| **model_name** | google/gemma-3-4b-it | Lightweight 4B model suitable for low-resource MT |
| **max_length** | 512 | Max input + output tokens; matches training data |
| **learning_rate** | 2e-4 | Conservative for QLoRA fine-tuning |
| **num_epochs** | 3 | Multiple passes ensure convergence without overfitting |
| **batch_size** | 4 | Limited by GPU memory; grad accumulation compensates |
| **grad_accumulation** | 8 | Effective batch size = 4 × 8 = 32 |
| **warmup_ratio** | 0.03 | 3% of training steps; prevents initial instability |
| **lora_r** | 16 | Rank; balances expressiveness vs parameter count |
| **lora_alpha** | 32 | Scaling factor; typical alpha = 2 × rank |

---

## Expected Training Lifecycle

### Phase 1: Setup (5-10 min)
```
Loading model: google/gemma-3-4b-it... ✅
Loading data: 7,814 training pairs... ✅
Setting up LoRA... ✅
Initializing trainer... ✅
```

### Phase 2: Epoch 1 (1.5-2 hours)
```
Training Progress:
[1/3] Epoch 0%: loss=3.21 | eval_loss=2.87 | throughput=150 ex/s
[1/3] Epoch 25%: loss=2.51 | eval_loss=2.24 | throughput=155 ex/s
[1/3] Epoch 50%: loss=2.15 | eval_loss=2.01 | throughput=160 ex/s
[1/3] Epoch 75%: loss=1.92 | eval_loss=1.87 | throughput=165 ex/s
```

### Phase 3: Epoch 2 & 3 (3-4 hours more)
Loss continues decreasing; validation improves...

### Phase 4: Finalization
```
Saving checkpoint: outputs/maasai-en-mt-qlora/checkpoint-XXX
Model saved successfully! ✅
Training metrics saved to outputs/training_results.json
```

---

## After Training: Next Steps

### Step 1: Check Output Artifacts

```bash
ls -lh outputs/maasai-en-mt-qlora/
# Should see: adapter_config.json, adapter_model.bin, training_args.bin
```

### Step 2: Run Inference Test

```bash
python scripts/infer_translate.py \
  --model_id "google/gemma-3-4b-it" \
  --lora_weights "outputs/maasai-en-mt-qlora" \
  --text "Hello, how are you?" \
  --direction "en_to_mas"
```

**Expected output:**
```
Input: Hello, how are you?
Output: Supa, ipa eata?
```

### Step 3: Export to GGUF (for llama.cpp)

```bash
python scripts/export_gguf.py \
  --model_id "google/gemma-3-4b-it" \
  --lora_path "outputs/maasai-en-mt-qlora" \
  --output_path "outputs/maasai-en-mt-qlora.gguf" \
  --quantize_level "Q4_K_M"
```

### Step 4: Push to HuggingFace

```bash
# Option A: Push entire model directory
huggingface-cli repo create NorthernTribe-Research/maasai-en-mt-v1 --private
huggingface-cli upload NorthernTribe-Research/maasai-en-mt-v1 outputs/maasai-en-mt-qlora .

# Option B: Push just adapter weights (lighter)
python scripts/push_model_to_hf.py \
  --repo_id "NorthernTribe-Research/maasai-en-mt-qlora-v1" \
  --local_path "outputs/maasai-en-mt-qlora" \
  --push_gguf true
```

---

## Troubleshooting

### OOM (Out of Memory) Error
```
CUDA out of memory. Tried to allocate X.XXGiB
```

**Solution:** Reduce batch size or gradient accumulation
```bash
--per_device_train_batch_size 2 --gradient_accumulation_steps 16
```

### Model Not Found
```
OSError: Can't find 'google/gemma-3-4b-it' in model_name
```

**Solution:** Accept model gating on HF
1. Visit https://huggingface.co/google/gemma-3-4b-it
2. Click "Access repository"
3. Wait for acceptance to your account
4. Re-authenticate in Colab with `notebook_login()`

### Training Hangs
1. Kill the cell (Colab button: ⏹)
2. Clear GPU: `torch.cuda.empty_cache()`
3. Restart runtime (Ctrl+M . or Runtime → Restart)
4. Re-run training

---

## Performance Expectations

**After 3 epochs of training:**

| Metric | Expected Range | Notes |
|--------|-----------------|-------|
| **BLEU** | 28-38 | Low-resource MT realistic range |
| **chrF++** | 52-62 | Character-level similarity |
| **Training Loss** | 1.8-2.2 | Final epoch |
| **Validation Loss** | 1.9-2.3 | On held-out validation set |

**Speed:**
- ~150-200 examples/sec on Colab GPU
- ~600-800ms per training step (with accumulation)

---

## Resuming Interrupted Training

If training was interrupted, resume from latest checkpoint:

```bash
python scripts/train_qlora.py \
  --train_file "data/final_v3/train.jsonl" \
  --valid_file "data/final_v3/valid.jsonl" \
  --output_dir "outputs/maasai-en-mt-qlora" \
  --resume_from_checkpoint "outputs/maasai-en-mt-qlora/checkpoint-XXXX"
```

---

## Alternative: Lambda Labs GPU Cloud

If Colab queues are full:

1. **Create Lambda Labs account:** https://lambdalabs.com
2. **Rent GPU instance:** ~$0.33/hr for single GPU
3. **SSH into instance:**
   ```bash
   ssh ubuntu@[instance-ip]
   
   # Clone repo
   git clone https://huggingface.co/NorthernTribe-Research/maasai-lang repo
   cd repo
   
   # Install Python env
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -q -r requirements.txt
   
   # Run training
   bash training/run_train.sh
   ```
4. **Monitor GPU:** In another terminal, `ssh ubuntu@[ip]` then `watch nvidia-smi`

---

## Questions?

- **Data issues:** Check `data/final_v3/train.jsonl` format
- **Model issues:** Visit [google/gemma-3-4b-it](https://huggingface.co/google/gemma-3-4b-it)
- **Training issues:** Check Colab logs for specific error messages
- **Community:** Post in HuggingFace [Discussions](https://huggingface.co/NorthernTribe-Research/maasai-translation-corpus/discussions)

---

**Status:** ✅ Ready for training  
**Last Updated:** March 27, 2026  
**Expected Training Time:** 4-6 hours on Colab GPU
