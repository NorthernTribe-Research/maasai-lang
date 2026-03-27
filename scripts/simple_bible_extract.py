#!/usr/bin/env python3
"""
Simple Bible text extractor using sentence-level segmentation.
Focuses on extracting authentic parallel sentences from extracted Bible PDFs.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from collections import Counter

try:
    from pypdf import PdfReader
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False


def extract_pdf_text(pdf_path: str) -> str:
    """Extract text from PDF using pypdf."""
    if not PDF_AVAILABLE:
        print(f"⚠️  pypdf not available. Skipping {pdf_path}")
        return ""
    
    try:
        text = ""
        with open(pdf_path, 'rb') as f:
            pdf_reader = PdfReader(f)
            for i, page in enumerate(pdf_reader.pages):
                if i % 100 == 0:
                    print(f"  Page {i+1}/{len(pdf_reader.pages)}", end='\r')
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        print(f"  ✓ Extracted {len(text)} characters          ")
        return text
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return ""


def clean_bible_text(text: str) -> str:
    """Clean Bible text of verse numbers and special formatting."""
    # Remove superscript numbers and special markers
    text = re.sub(r'\^[\d]+', '', text)  # Remove ^1, ^2, etc
    text = re.sub(r'[\*\†\‡]', '', text)  # Remove special symbols
    text = re.sub(r'\d+\.\d+:\d+', '', text)  # Remove reference markers like 1.3: 2 Ilkor
    text = re.sub(r'[^\w\s\.\,\!\?\'\-\(\)éèêëàâäáæûüöôòœùúñ]', ' ', text)  # Keep only letters
    text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
    return text.strip()


def extract_sentences(text: str, min_len: int = 15, max_len: int = 200) -> list:
    """Extract sentences from clean text."""
    # Split by sentence boundaries
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    # Filter and clean
    clean_sents = []
    for sent in sentences:
        sent = sent.strip()
        if min_len <= len(sent) <= max_len and sent and not sent[0].isdigit():
            clean_sents.append(sent)
    
    return clean_sents


def align_bible_texts(en_text: str, mas_text: str, chunk_size: int = 2) -> list:
    """
    Align English and Maasai Bible texts by chunking into sentences.
    Creates training pairs from sequential chunks.
    """
    pairs = []
    
    # Extract sentences
    en_sents = extract_sentences(en_text)
    mas_sents = extract_sentences(mas_text)
    
    print(f"English sentences: {len(en_sents)}")
    print(f"Maasai sentences: {len(mas_sents)}")
    
    # Create pairs by pairing roughly aligned chunks
    min_sents = min(len(en_sents), len(mas_sents))
    
    for i in range(0, min_sents - chunk_size, chunk_size):
        # Group chunk_size sentences
        en_chunk = ' '.join(en_sents[i:i+chunk_size])
        mas_chunk = ' '.join(mas_sents[i:i+chunk_size])
        
        if en_chunk and mas_chunk and len(en_chunk) > 20 and len(mas_chunk) > 20:
            pairs.append((en_chunk, mas_chunk))
    
    return pairs


def main() -> None:
    project_root = Path(__file__).resolve().parent.parent
    pdf_dir = project_root / "data" / "pdf"
    output_path = project_root / "data" / "raw" / "bible_sentences.jsonl"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("SIMPLE BIBLE SENTENCE EXTRACTION")
    print("=" * 70)

    en_bible_path = pdf_dir / "english-all-bible.pdf"
    mas_bible_path = pdf_dir / "maasai-all-bible.pdf"

    # Extract
    print("\nExtracting English Bible...")
    en_text = extract_pdf_text(str(en_bible_path)) if en_bible_path.exists() else ""
    
    print("Extracting Maasai Bible...")
    mas_text = extract_pdf_text(str(mas_bible_path)) if mas_bible_path.exists() else ""

    # Clean
    print("\nCleaning texts...")
    en_text = clean_bible_text(en_text)
    mas_text = clean_bible_text(mas_text)
    
    print(f"English (cleaned): {len(en_text)} chars")
    print(f"Maasai (cleaned): {len(mas_text)} chars")

    # Align
    print("\nAligning and creating pairs...")
    pairs = align_bible_texts(en_text, mas_text, chunk_size=2)
    print(f"Created {len(pairs)} aligned pairs")

    # Write
    print("\nWriting output...")
    records = []
    for i, (en_chunk, mas_chunk) in enumerate(pairs):
        records.append({
            "id": f"bible-en2mas-{i:05d}",
            "source_text": en_chunk,
            "target_text": mas_chunk,
            "source_lang": "en",
            "target_lang": "mas",
            "domain": "bible",
            "source_name": "bible_english_maasai",
            "quality_score": 0.95,
            "notes": "Aligned Bible sentence chunks",
        })
        records.append({
            "id": f"bible-mas2en-{i:05d}",
            "source_text": mas_chunk,
            "target_text": en_chunk,
            "source_lang": "mas",
            "target_lang": "en",
            "domain": "bible",
            "source_name": "bible_english_maasai",
            "quality_score": 0.95,
            "notes": "Aligned Bible sentence chunks (reverse)",
        })

    with output_path.open("w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(f"✓ Wrote {len(records)} records to {output_path}")
    print(f"Total pairs: {len(pairs)}")
    print("=" * 70)


if __name__ == "__main__":
    main()
