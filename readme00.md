Below is the full scaffold.

## requirements.txt

```txt
torch>=2.3.0
transformers>=4.51.0
datasets>=3.0.0
accelerate>=1.0.0
peft>=0.14.0
trl>=0.16.0
bitsandbytes>=0.45.0
sentencepiece>=0.2.0
sacrebleu>=2.4.0
evaluate>=0.4.3
gradio>=5.23.0
librosa>=0.10.2
soundfile>=0.12.1
numpy>=1.26.0
pandas>=2.2.0
scikit-learn>=1.5.0
pyyaml>=6.0.2
python-dotenv>=1.0.1
huggingface_hub>=0.30.0
```

---

## scripts/prepare_data.py

```python
#!/usr/bin/env python3
"""
Prepare English <-> Maasai translation data for instruction tuning.

Input:
- CSV/JSONL files placed in data/raw/
- Expected columns or keys:
    source_text, target_text, source_lang, target_lang
  Optional:
    domain, source_name, quality_score, notes

Output:
- data/final_v3/train.jsonl
- data/final_v3/valid.jsonl
- data/final_v3/test.jsonl

Usage:
python scripts/prepare_data.py \
  --input_dir data/raw \
  --output_dir data/processed \
  --test_size 0.05 \
  --valid_size 0.05 \
  --min_chars 2 \
  --max_chars 400
"""

from __future__ import annotations

import argparse
import json
import logging
import random
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

import pandas as pd
from sklearn.model_selection import train_test_split


LOGGER = logging.getLogger("prepare_data")


@dataclass
class ParallelRecord:
    id: str
    task: str
    source_lang: str
    target_lang: str
    source_text: str
    target_text: str
    domain: str = "general"
    source_name: str = "unknown"
    quality_score: float = 1.0
    notes: str = ""


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input_dir", type=str, default="data/raw")
    parser.add_argument("--output_dir", type=str, default="data/processed")
    parser.add_argument("--test_size", type=float, default=0.05)
    parser.add_argument("--valid_size", type=float, default=0.05)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--min_chars", type=int, default=2)
    parser.add_argument("--max_chars", type=int, default=400)
    parser.add_argument("--min_length_ratio", type=float, default=0.15)
    parser.add_argument("--max_length_ratio", type=float, default=6.0)
    return parser.parse_args()


def normalize_text(text: Any) -> str:
    """Light normalization without being destructive to orthography."""
    if text is None:
        return ""
    text = str(text).strip()
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = re.sub(r"\s+", " ", text)
    return text


def load_csv(path: Path) -> pd.DataFrame:
    return pd.read_csv(path)


def load_jsonl(path: Path) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return pd.DataFrame(rows)


def load_any(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return load_csv(path)
    if suffix in {".jsonl", ".json"}:
        return load_jsonl(path)
    raise ValueError(f"Unsupported file format: {path}")


def standardize_columns(df: pd.DataFrame, source_name: str) -> pd.DataFrame:
    """Map likely column aliases into the expected schema."""
    df = df.copy()

    alias_map = {
        "source_text": ["source_text", "src", "source", "english", "en", "text_en"],
        "target_text": ["target_text", "tgt", "target", "maasai", "mas", "text_mas"],
        "source_lang": ["source_lang", "src_lang", "lang_source"],
        "target_lang": ["target_lang", "tgt_lang", "lang_target"],
        "domain": ["domain", "topic"],
        "quality_score": ["quality_score", "score"],
        "notes": ["notes", "comment"],
    }

    resolved: dict[str, str] = {}
    for canonical, aliases in alias_map.items():
        for alias in aliases:
            if alias in df.columns:
                resolved[canonical] = alias
                break

    required = {"source_text", "target_text"}
    missing = required - set(resolved)
    if missing:
        raise ValueError(
            f"Missing required columns {missing} in file from source '{source_name}'. "
            f"Found columns: {list(df.columns)}"
        )

    out = pd.DataFrame()
    out["source_text"] = df[resolved["source_text"]]
    out["target_text"] = df[resolved["target_text"]]
    out["source_lang"] = df[resolved["source_lang"]] if "source_lang" in resolved else "en"
    out["target_lang"] = df[resolved["target_lang"]] if "target_lang" in resolved else "mas"
    out["domain"] = df[resolved["domain"]] if "domain" in resolved else "general"
    out["quality_score"] = df[resolved["quality_score"]] if "quality_score" in resolved else 1.0
    out["notes"] = df[resolved["notes"]] if "notes" in resolved else ""
    out["source_name"] = source_name
    return out


def clean_dataframe(
    df: pd.DataFrame,
    min_chars: int,
    max_chars: int,
    min_length_ratio: float,
    max_length_ratio: float,
) -> pd.DataFrame:
    df = df.copy()

    for column in ["source_text", "target_text", "source_lang", "target_lang", "domain", "notes", "source_name"]:
        df[column] = df[column].apply(normalize_text)

    df["quality_score"] = pd.to_numeric(df["quality_score"], errors="coerce").fillna(1.0)

    # Basic length filters
    df = df[
        df["source_text"].str.len().between(min_chars, max_chars)
        & df["target_text"].str.len().between(min_chars, max_chars)
    ]

    # Remove exact self-copies
    df = df[df["source_text"] != df["target_text"]]

    # Length ratio filter
    src_len = df["source_text"].str.len().clip(lower=1)
    tgt_len = df["target_text"].str.len().clip(lower=1)
    ratio = tgt_len / src_len
    df = df[ratio.between(min_length_ratio, max_length_ratio)]

    # Remove obvious broken rows
    df = df[
        ~df["source_text"].str.fullmatch(r"[\W_]+", na=False)
        & ~df["target_text"].str.fullmatch(r"[\W_]+", na=False)
    ]

    # Deduplicate exact pairs
    df = df.drop_duplicates(subset=["source_text", "target_text", "source_lang", "target_lang"])

    # Assign ids
    df = df.reset_index(drop=True)
    df["id"] = [f"pair-{i:07d}" for i in range(len(df))]
    df["task"] = "translate"

    columns = [
        "id",
        "task",
        "source_lang",
        "target_lang",
        "source_text",
        "target_text",
        "domain",
        "source_name",
        "quality_score",
        "notes",
    ]
    return df[columns]


def to_instruction_record(row: pd.Series) -> dict[str, Any]:
    source_lang = row["source_lang"].strip().lower()
    target_lang = row["target_lang"].strip().lower()

    if source_lang == "en" and target_lang == "mas":
        prompt = f'Translate the following English sentence to Maasai:\n"{row["source_text"]}"'
    elif source_lang == "mas" and target_lang == "en":
        prompt = f'Translate the following Maasai sentence to English:\n"{row["source_text"]}"'
    else:
        prompt = f'Translate from {source_lang} to {target_lang}:\n"{row["source_text"]}"'

    return {
        **row.to_dict(),
        "prompt": prompt,
        "completion": row["target_text"],
    }


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def main() -> None:
    setup_logging()
    args = parse_args()
    random.seed(args.seed)

    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)

    if not input_dir.exists():
        raise FileNotFoundError(f"Input directory does not exist: {input_dir}")

    files = sorted([p for p in input_dir.iterdir() if p.is_file() and p.suffix.lower() in {".csv", ".jsonl", ".json"}])
    if not files:
        raise FileNotFoundError(f"No input files found in {input_dir}")

    frames: list[pd.DataFrame] = []
    for file_path in files:
        LOGGER.info("Loading %s", file_path)
        df = load_any(file_path)
        df = standardize_columns(df, source_name=file_path.stem)
        frames.append(df)

    merged = pd.concat(frames, ignore_index=True)
    LOGGER.info("Loaded %d raw rows", len(merged))

    cleaned = clean_dataframe(
        merged,
        min_chars=args.min_chars,
        max_chars=args.max_chars,
        min_length_ratio=args.min_length_ratio,
        max_length_ratio=args.max_length_ratio,
    )
    LOGGER.info("Retained %d cleaned rows", len(cleaned))

    if len(cleaned) < 50:
        LOGGER.warning("Very small dataset after cleaning: %d rows", len(cleaned))

    train_df, test_df = train_test_split(cleaned, test_size=args.test_size, random_state=args.seed, shuffle=True)
    train_df, valid_df = train_test_split(
        train_df,
        test_size=args.valid_size / max(1e-8, (1.0 - args.test_size)),
        random_state=args.seed,
        shuffle=True,
    )

    splits = {
        "train": train_df.reset_index(drop=True),
        "valid": valid_df.reset_index(drop=True),
        "test": test_df.reset_index(drop=True),
    }

    summary: dict[str, Any] = {"total_rows": int(len(cleaned)), "splits": {}}
    for split_name, split_df in splits.items():
        rows = [to_instruction_record(row) for _, row in split_df.iterrows()]
        out_path = output_dir / f"{split_name}.jsonl"
        write_jsonl(out_path, rows)
        summary["splits"][split_name] = len(rows)
        LOGGER.info("Wrote %s with %d rows", out_path, len(rows))

    summary_path = output_dir / "summary.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    LOGGER.info("Wrote summary to %s", summary_path)


if __name__ == "__main__":
    main()
```

---

## scripts/train_qlora.py

```python
#!/usr/bin/env python3
"""
QLoRA fine-tuning script for English <-> Maasai translation.

Expected input:
- data/final_v3/train.jsonl
- data/final_v3/valid.jsonl

Usage:
python scripts/train_qlora.py \
  --model_name Qwen/Qwen2.5-3B-Instruct \
  --train_file data/final_v3/train.jsonl \
  --valid_file data/final_v3/valid.jsonl \
  --output_dir outputs/maasai-en-mt-qlora
"""

from __future__ import annotations

import argparse
import logging
import os
from dataclasses import dataclass

import torch
from datasets import load_dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    DataCollatorForLanguageModeling,
    Trainer,
    TrainingArguments,
)


LOGGER = logging.getLogger("train_qlora")


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_name", type=str, default="Qwen/Qwen2.5-3B-Instruct")
    parser.add_argument("--train_file", type=str, default="data/final_v3/train.jsonl")
    parser.add_argument("--valid_file", type=str, default="data/final_v3/valid.jsonl")
    parser.add_argument("--output_dir", type=str, default="outputs/maasai-en-mt-qlora")
    parser.add_argument("--max_length", type=int, default=512)
    parser.add_argument("--learning_rate", type=float, default=2e-4)
    parser.add_argument("--num_train_epochs", type=int, default=3)
    parser.add_argument("--per_device_train_batch_size", type=int, default=4)
    parser.add_argument("--per_device_eval_batch_size", type=int, default=4)
    parser.add_argument("--gradient_accumulation_steps", type=int, default=8)
    parser.add_argument("--warmup_ratio", type=float, default=0.03)
    parser.add_argument("--weight_decay", type=float, default=0.01)
    parser.add_argument("--logging_steps", type=int, default=20)
    parser.add_argument("--eval_steps", type=int, default=200)
    parser.add_argument("--save_steps", type=int, default=200)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--lora_r", type=int, default=16)
    parser.add_argument("--lora_alpha", type=int, default=32)
    parser.add_argument("--lora_dropout", type=float, default=0.05)
    return parser.parse_args()


def load_data(train_file: str, valid_file: str):
    data_files = {
        "train": train_file,
        "validation": valid_file,
    }
    return load_dataset("json", data_files=data_files)


def build_prompt(prompt: str, completion: str) -> str:
    return f"{prompt}\n\n### Response:\n{completion}"


def tokenize_examples(examples, tokenizer, max_length: int):
    texts = [build_prompt(p, c) for p, c in zip(examples["prompt"], examples["completion"])]
    tokenized = tokenizer(
        texts,
        truncation=True,
        max_length=max_length,
        padding=False,
    )
    tokenized["labels"] = tokenized["input_ids"].copy()
    return tokenized


def main() -> None:
    setup_logging()
    args = parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    LOGGER.info("Loading dataset")
    dataset = load_data(args.train_file, args.valid_file)

    LOGGER.info("Loading tokenizer: %s", args.model_name)
    tokenizer = AutoTokenizer.from_pretrained(args.model_name, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    LOGGER.info("Loading 4-bit base model")
    quant_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
    )

    model = AutoModelForCausalLM.from_pretrained(
        args.model_name,
        quantization_config=quant_config,
        torch_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
        device_map="auto",
        trust_remote_code=True,
    )

    model.config.use_cache = False
    model = prepare_model_for_kbit_training(model)

    lora_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        target_modules=[
            "q_proj",
            "k_proj",
            "v_proj",
            "o_proj",
            "gate_proj",
            "up_proj",
            "down_proj",
        ],
        lora_dropout=args.lora_dropout,
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    LOGGER.info("Tokenizing dataset")
    tokenized = dataset.map(
        lambda x: tokenize_examples(x, tokenizer, args.max_length),
        batched=True,
        remove_columns=dataset["train"].column_names,
        desc="Tokenizing",
    )

    data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

    training_args = TrainingArguments(
        output_dir=args.output_dir,
        overwrite_output_dir=True,
        learning_rate=args.learning_rate,
        num_train_epochs=args.num_train_epochs,
        per_device_train_batch_size=args.per_device_train_batch_size,
        per_device_eval_batch_size=args.per_device_eval_batch_size,
        gradient_accumulation_steps=args.gradient_accumulation_steps,
        warmup_ratio=args.warmup_ratio,
        weight_decay=args.weight_decay,
        logging_steps=args.logging_steps,
        eval_strategy="steps",
        eval_steps=args.eval_steps,
        save_steps=args.save_steps,
        save_total_limit=2,
        bf16=torch.cuda.is_available(),
        fp16=False,
        gradient_checkpointing=True,
        report_to="none",
        seed=args.seed,
        dataloader_num_workers=2,
        load_best_model_at_end=False,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["validation"],
        data_collator=data_collator,
        processing_class=tokenizer,
    )

    LOGGER.info("Starting training")
    trainer.train()

    LOGGER.info("Saving adapter and tokenizer to %s", args.output_dir)
    trainer.model.save_pretrained(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)

    LOGGER.info("Done")


if __name__ == "__main__":
    main()
```

---

## space/app.py

```python
from __future__ import annotations

import os
import tempfile
from typing import Optional

import gradio as gr
import librosa
import soundfile as sf
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoModelForSpeechSeq2Seq,
    AutoProcessor,
    AutoTokenizer,
    pipeline,
)

# =========================
# Configuration
# =========================
TRANSLATION_MODEL_ID = os.getenv("TRANSLATION_MODEL_ID", "NorthernTribe-Research/maasai-en-mt")
ASR_MODEL_ID = os.getenv("ASR_MODEL_ID", "microsoft/paza-whisper-large-v3-turbo")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

TITLE = "Maasai Language Showcase"
DESCRIPTION = """
A modern English ↔ Maasai translation and Maasai speech transcription showcase.

This demo is designed for language access, preservation, and low-resource AI research.
Outputs should be reviewed by native speakers for formal or public-facing use.
"""

EXAMPLES = [
    ["English → Maasai", "Hello, how are you?"],
    ["English → Maasai", "Please bring water."],
    ["English → Maasai", "The children are going to school."],
    ["English → Maasai", "Where are the cattle?"],
    ["Maasai → English", "Supat pee?"],
]

translation_tokenizer: Optional[AutoTokenizer] = None
translation_model: Optional[AutoModelForCausalLM] = None
asr_pipe = None


# =========================
# Model loading
# =========================
def load_translation_components():
    global translation_tokenizer, translation_model

    if translation_model is not None and translation_tokenizer is not None:
        return

    translation_tokenizer = AutoTokenizer.from_pretrained(TRANSLATION_MODEL_ID, use_fast=True)
    if translation_tokenizer.pad_token is None:
        translation_tokenizer.pad_token = translation_tokenizer.eos_token

    translation_model = AutoModelForCausalLM.from_pretrained(
        TRANSLATION_MODEL_ID,
        torch_dtype=torch.bfloat16 if DEVICE == "cuda" else torch.float32,
        device_map="auto" if DEVICE == "cuda" else None,
        trust_remote_code=True,
    )

    if DEVICE != "cuda":
        translation_model.to(DEVICE)


def load_asr_pipeline():
    global asr_pipe

    if asr_pipe is not None:
        return

    processor = AutoProcessor.from_pretrained(ASR_MODEL_ID)
    model = AutoModelForSpeechSeq2Seq.from_pretrained(
        ASR_MODEL_ID,
        torch_dtype=torch.bfloat16 if DEVICE == "cuda" else torch.float32,
        low_cpu_mem_usage=True,
        use_safetensors=True,
    )

    if DEVICE == "cuda":
        model.to("cuda")
        pipe_device = 0
    else:
        model.to("cpu")
        pipe_device = -1

    asr_pipe = pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor,
        device=pipe_device,
    )


# =========================
# Translation logic
# =========================
def build_prompt(direction: str, text: str) -> str:
    if direction == "English → Maasai":
        return f'Translate the following English sentence to Maasai:\n"{text}"\n\n### Response:\n'
    return f'Translate the following Maasai sentence to English:\n"{text}"\n\n### Response:\n'


def postprocess_generation(full_text: str) -> str:
    marker = "### Response:"
    if marker in full_text:
        return full_text.split(marker, 1)[1].strip()
    return full_text.strip()


@torch.inference_mode()
def translate_text(direction: str, text: str) -> str:
    if not text or not text.strip():
        return "Please enter some text."

    load_translation_components()
    assert translation_model is not None
    assert translation_tokenizer is not None

    prompt = build_prompt(direction, text.strip())
    inputs = translation_tokenizer(prompt, return_tensors="pt")

    if DEVICE == "cuda":
        inputs = {k: v.to("cuda") for k, v in inputs.items()}
    else:
        inputs = {k: v.to("cpu") for k, v in inputs.items()}

    outputs = translation_model.generate(
        **inputs,
        max_new_tokens=128,
        do_sample=False,
        temperature=None,
        top_p=None,
        repetition_penalty=1.05,
        eos_token_id=translation_tokenizer.eos_token_id,
        pad_token_id=translation_tokenizer.pad_token_id,
    )

    decoded = translation_tokenizer.decode(outputs[0], skip_special_tokens=True)
    return postprocess_generation(decoded)


# =========================
# Audio logic
# =========================
def prepare_audio(audio_path: str) -> str:
    """
    Normalize incoming audio to mono 16 kHz wav.
    """
    waveform, sr = librosa.load(audio_path, sr=16000, mono=True)
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    sf.write(tmp.name, waveform, 16000)
    return tmp.name


def transcribe_audio(audio_file) -> str:
    if audio_file is None:
        return "Please upload an audio file."

    load_asr_pipeline()
    prepared_path = prepare_audio(audio_file)

    try:
        result = asr_pipe(prepared_path)
        if isinstance(result, dict):
            return result.get("text", "").strip() or "No transcript produced."
        return str(result).strip()
    finally:
        try:
            os.remove(prepared_path)
        except OSError:
            pass


def speech_to_translation(audio_file) -> tuple[str, str]:
    transcript = transcribe_audio(audio_file)
    if transcript.startswith("Please upload") or transcript.startswith("No transcript"):
        return transcript, ""

    translation = translate_text("Maasai → English", transcript)
    return transcript, translation


# =========================
# UI
# =========================
custom_css = """
.gradio-container {
    max-width: 1100px !important;
}
.hero-note {
    font-size: 0.95rem;
    opacity: 0.9;
}
"""


with gr.Blocks(css=custom_css, title=TITLE) as demo:
    gr.Markdown(f"# {TITLE}")
    gr.Markdown(DESCRIPTION)
    gr.Markdown(
        """
<div class="hero-note">
This system is intended as an assistive showcase for Maasai language technology.
For educational, cultural, or public publication use, native-speaker review is recommended.
</div>
        """
    )

    with gr.Tabs():
        with gr.Tab("Translate"):
            with gr.Row():
                with gr.Column(scale=1):
                    direction = gr.Dropdown(
                        choices=["English → Maasai", "Maasai → English"],
                        value="English → Maasai",
                        label="Direction",
                    )
                    text_input = gr.Textbox(
                        lines=6,
                        label="Input Text",
                        placeholder="Enter text to translate...",
                    )
                    translate_btn = gr.Button("Translate", variant="primary")
                with gr.Column(scale=1):
                    translation_output = gr.Textbox(
                        lines=8,
                        label="Output",
                        placeholder="Translation will appear here...",
                    )

            translate_btn.click(
                fn=translate_text,
                inputs=[direction, text_input],
                outputs=translation_output,
            )

            gr.Examples(
                examples=EXAMPLES,
                inputs=[direction, text_input],
            )

        with gr.Tab("Speech"):
            with gr.Row():
                with gr.Column(scale=1):
                    audio_input = gr.Audio(
                        type="filepath",
                        label="Upload Maasai Audio",
                    )
                    transcribe_btn = gr.Button("Transcribe")
                    transcript_output = gr.Textbox(
                        lines=6,
                        label="Transcript",
                        placeholder="Transcript will appear here...",
                    )

                with gr.Column(scale=1):
                    speech_translate_btn = gr.Button("Transcribe + Translate to English", variant="primary")
                    speech_translation_output = gr.Textbox(
                        lines=6,
                        label="English Translation",
                        placeholder="Translation from speech transcript will appear here...",
                    )

            transcribe_btn.click(
                fn=transcribe_audio,
                inputs=audio_input,
                outputs=transcript_output,
            )

            speech_translate_btn.click(
                fn=speech_to_translation,
                inputs=audio_input,
                outputs=[transcript_output, speech_translation_output],
            )

        with gr.Tab("Examples"):
            gr.Markdown(
                """
### Suggested Demo Prompts

**English → Maasai**
- Hello, how are you?
- Please bring water.
- The children are going to school.
- Where are the cattle?
- This land is important to our community.

**Maasai → English**
- Add verified Maasai examples after native-speaker review.

### Good public demo themes
- greetings
- education
- environment
- livestock
- daily life
                """
            )

        with gr.Tab("About"):
            gr.Markdown(
                """
### About this project

This showcase combines:
- a fine-tuned English ↔ Maasai translation model
- Maasai speech transcription support
- a preservation-oriented language technology interface

### Intended use
- language access
- research demos
- educational exploration
- preservation-oriented AI prototyping

### Limitations
- low-resource language quality may vary
- terminology may require manual review
- outputs should not be treated as culturally authoritative without speaker validation
                """
            )

if __name__ == "__main__":
    demo.launch()
```

A couple of important notes before you run this:

1. `space/app.py` assumes you will publish a translation model at:

```txt
NorthernTribe-Research/maasai-en-mt
```

Change `TRANSLATION_MODEL_ID` if needed.

2. If you are pushing only a **LoRA adapter** first, the Space app should load the base model plus adapter separately. The current `app.py` expects a directly loadable model repo. I can give you the adapter-aware version next.

3. For Hugging Face Spaces, you will also want these next:

* `scripts/evaluate_mt.py`
* `scripts/infer_translate.py`
* `scripts/infer_asr.py`
* `training/lora_config.yaml`
* `space/style.css`
* `.env.example`

