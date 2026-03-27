#!/usr/bin/env python3
"""
Maasai speech-to-text inference using Microsoft Paza ASR.

Usage:
    python scripts/infer_asr.py --audio_file path/to/audio.wav
"""

from __future__ import annotations

import argparse
import logging
import os
import tempfile

import librosa
import soundfile as sf
import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline

LOGGER = logging.getLogger("infer_asr")


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_id", type=str, default="microsoft/paza-whisper-large-v3-turbo")
    parser.add_argument("--audio_file", type=str, required=True)
    parser.add_argument("--language", type=str, default="mas", help="Language code for Maasai")
    return parser.parse_args()


def prepare_audio(audio_path: str) -> str:
    """Normalize audio to mono 16kHz WAV."""
    waveform, sr = librosa.load(audio_path, sr=16000, mono=True)
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    sf.write(tmp.name, waveform, 16000)
    return tmp.name


def main() -> None:
    setup_logging()
    args = parse_args()
    device = "cuda" if torch.cuda.is_available() else "cpu"

    LOGGER.info("Loading ASR model: %s", args.model_id)
    processor = AutoProcessor.from_pretrained(args.model_id)
    model = AutoModelForSpeechSeq2Seq.from_pretrained(
        args.model_id,
        torch_dtype=torch.bfloat16 if device == "cuda" else torch.float32,
        low_cpu_mem_usage=True,
        use_safetensors=True,
    )

    if device == "cuda":
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

    LOGGER.info("Preparing audio: %s", args.audio_file)
    prepared = prepare_audio(args.audio_file)

    try:
        result = asr_pipe(
            prepared,
            generate_kwargs={"language": args.language, "task": "transcribe"}
        )
        if isinstance(result, dict):
            transcript = result.get("text", "").strip()
        else:
            transcript = str(result).strip()

        print(f"\n{'='*60}")
        print(f"Audio:      {args.audio_file}")
        print(f"Transcript: {transcript}")
        print(f"{'='*60}\n")
    finally:
        try:
            os.remove(prepared)
        except OSError:
            pass


if __name__ == "__main__":
    main()
