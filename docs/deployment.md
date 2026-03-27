# Deployment Guide

## Local Development

```bash
# Clone repo
git clone <repo-url>
cd maasai-language-showcase

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env
# Edit .env with your HF token
```

## Data Pipeline

```bash
# 1. Generate cultural training pairs
python scripts/generate_cultural_pairs.py

# 2. Validate glossary
python scripts/build_glossary.py

# 3. Prepare training data
python scripts/prepare_data.py --input_dir data/raw --output_dir data/processed
```

## Training

```bash
# Run QLoRA fine-tuning
bash training/run_train.sh

# Or with custom params
python scripts/train_qlora.py --model_name google/gemma-3-4b-it --num_train_epochs 5
```

## Evaluation

```bash
python scripts/evaluate_mt.py \
    --model_dir outputs/maasai-en-mt-qlora \
    --test_file data/processed/test.jsonl \
    --glossary_file data/glossary/maasai_glossary.json
```

## Inference

```bash
# Single translation
python scripts/infer_translate.py --text "Hello, how are you?" --direction en_to_mas

# Interactive mode
python scripts/infer_translate.py --model_dir outputs/maasai-en-mt-qlora

# Speech transcription
python scripts/infer_asr.py --audio_file path/to/maasai_audio.wav
```

## Hugging Face Space Deployment

1. Create a new Space on Hugging Face
2. Upload `space/app.py` as the main app
3. Set environment variables:
   - `TRANSLATION_MODEL_ID`: Your model repo ID
   - `ASR_MODEL_ID`: `microsoft/paza-whisper-large-v3-turbo`
4. Add `requirements.txt` to the Space

## Hugging Face Model/Dataset Publishing

```bash
# Login
huggingface-cli login

# Push model
huggingface-cli upload NorthernTribe-Research/maasai-en-mt outputs/maasai-en-mt-qlora/

# Push dataset
huggingface-cli upload NorthernTribe-Research/maasai-translation-corpus data/processed/
```
