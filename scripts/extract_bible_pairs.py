#!/usr/bin/env python3
"""
Extract and align Bible verses from PDF/text sources to create high-quality 
parallel training pairs.

Leverages:
- English Bible PDF
- Maasai Bible PDF
- Maasai Genesis raw text

Outputs: data/raw/bible_aligned_pairs.jsonl
Expected: 2,000+ high-quality authentic parallel pairs
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from collections import defaultdict
from typing import Optional

try:
    from pypdf import PdfReader
    PDF_AVAILABLE = True
except ImportError:
    print("Warning: pypdf not installed. Install with: pip install pypdf")
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
            print(f"  Extracting from {Path(pdf_path).name}... ({len(pdf_reader.pages)} pages)")
            for i, page in enumerate(pdf_reader.pages):
                if i % 50 == 0:
                    print(f"    Page {i+1}/{len(pdf_reader.pages)}")
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        print(f"  ✓ Extracted {len(text)} characters")
        return text
    except Exception as e:
        print(f"  ✗ Error extracting {pdf_path}: {e}")
        return ""


def parse_bible_verses(text: str, language: str = "en") -> dict:
    """
    Parse Bible text into structured verses.
    
    Handles formats like:
    - "John 3:16 In the beginning..."
    - "Genesis 1:1 Hapo..."
    """
    verses = defaultdict(lambda: defaultdict(str))
    
    # Bible book order (common across English and Maasai Bibles)
    books_order = [
        "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
        "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
        "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
        "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
        "Ecclesiastes", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel",
        "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah",
        "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
        "Matthew", "Mark", "Luke", "John", "Acts", "Romans",
        "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
        "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
        "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews",
        "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
        "Jude", "Revelation"
    ]
    
    # Also try Maasai book names (transliterations/translations)
    maasai_books = {
        "Jenisi": "Genesis",
        "Eksoto": "Exodus",
        "Levitiko": "Leviticus",
        "Nambari": "Numbers",
        "Deuteronomi": "Deuteronomy",
        "Yosua": "Joshua",
        "Mahakimu": "Judges",
        "Ruto": "Ruth",
        "1 Samweli": "1 Samuel",
        "2 Samweli": "2 Samuel",
        "Mfalme": "Kings",
        "Ayubu": "Job",
        "Zaburi": "Psalms",
        "Mithali": "Proverbs",
        "Isaiha": "Isaiah",
        "Yeremia": "Jeremiah",
        "Mathayo": "Matthew",
        "Marko": "Mark",
        "Luka": "Luke",
        "Yohana": "John",
        "Matendo": "Acts",
        "Warumi": "Romans",
    }
    
    # Split into lines
    lines = text.split('\n')
    current_book = None
    current_chapter = None
    
    for line in lines:
        line = line.strip()
        if not line or len(line) < 3:
            continue
        
        # Try to detect book:chapter:verse format
        # E.g., "Genesis 1:1", "Jenisi 1:1"
        match = re.match(r'([A-Za-z0-9\s]+?)\s*(\d+):(\d+)\s+(.*)', line)
        if match:
            book_name = match.group(1).strip()
            chapter = match.group(2)
            verse_num = match.group(3)
            verse_text = match.group(4)
            
            # Normalize book name
            if book_name in maasai_books:
                book_name = maasai_books[book_name]
            
            if book_name in books_order or any(b.startswith(book_name) for b in books_order):
                current_book = book_name
                current_chapter = chapter
                key = f"{book_name} {chapter}:{verse_num}"
                verses[key][language] = verse_text
        
        # Also capture continuation of previous verse
        elif current_book and current_chapter and len(line) > 10:
            # If line doesn't have verse marker but we're in a book, continue previous verse
            if not re.match(r'\d+:\d+', line):
                last_key = list(verses.keys())[-1] if verses else None
                if last_key:
                    verses[last_key][language] += " " + line
    
    return verses


def align_bible_verses(en_verses: dict, mas_verses: dict) -> list:
    """
    Align English and Maasai verses by book:chapter:verse keys.
    Returns list of (english_text, maasai_text, "bible_aligned") tuples.
    """
    pairs = []
    
    for key in en_verses:
        if key in mas_verses:
            en_text = en_verses[key].get("en", "").strip()
            mas_text = mas_verses[key].get("mas", "").strip()
            
            # Sanity checks
            if en_text and mas_text and len(en_text) > 5 and len(mas_text) > 5:
                # Skip if too short or obviously corrupted
                if len(en_text) < 200 and len(mas_text) < 200:
                    pairs.append((en_text, mas_text, "bible_aligned"))
    
    return pairs


def extract_from_raw_text(txt_path: str) -> list:
    """Extract verses from raw text file."""
    pairs = []
    try:
        with open(txt_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Try to parse structured verses
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if len(line) > 20 and not line.startswith('#'):
                # This is a potential verse or segment
                pairs.append((line, "", "bible_raw"))
    except Exception as e:
        print(f"Error reading {txt_path}: {e}")
    
    return pairs


def segment_long_verses(text: str, max_len: int = 150) -> list:
    """
    Split long verses into sentences for better training.
    E.g., "In the beginning God created... And God said..." 
    becomes two separate training examples.
    """
    sentences = re.split(r'(?<=[.!?])\s+', text)
    segments = []
    current = ""
    
    for sent in sentences:
        if len(current) + len(sent) < max_len:
            current += " " + sent
        else:
            if current.strip():
                segments.append(current.strip())
            current = sent
    
    if current.strip():
        segments.append(current.strip())
    
    return [s for s in segments if len(s) > 10]


def main() -> None:
    project_root = Path(__file__).resolve().parent.parent
    pdf_dir = project_root / "data" / "pdf"
    output_path = project_root / "data" / "raw" / "bible_aligned_pairs.jsonl"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("BIBLE EXTRACTION & ALIGNMENT FOR PARALLEL DATA")
    print("=" * 70)

    en_bible_path = pdf_dir / "english-all-bible.pdf"
    mas_bible_path = pdf_dir / "maasai-all-bible.pdf"
    genesis_raw_path = pdf_dir / "maasai_genesis_raw.txt"

    # Step 1: Extract PDFs
    print("\nStep 1: Extracting Bible PDFs...")
    print("-" * 70)
    
    en_text = ""
    mas_text = ""
    
    if en_bible_path.exists():
        print(f"✓ English Bible found: {en_bible_path}")
        en_text = extract_pdf_text(str(en_bible_path))
    else:
        print(f"✗ English Bible not found: {en_bible_path}")
    
    if mas_bible_path.exists():
        print(f"✓ Maasai Bible found: {mas_bible_path}")
        mas_text = extract_pdf_text(str(mas_bible_path))
    else:
        print(f"✗ Maasai Bible not found: {mas_bible_path}")

    # Step 2: Parse into verses
    print("\nStep 2: Parsing Bible verses...")
    print("-" * 70)
    
    en_verses = {}
    mas_verses = {}
    
    if en_text:
        print("Parsing English verses...")
        en_verses = parse_bible_verses(en_text, language="en")
        print(f"  Extracted {len(en_verses)} English verses")
    
    if mas_text:
        print("Parsing Maasai verses...")
        mas_verses = parse_bible_verses(mas_text, language="mas")
        print(f"  Extracted {len(mas_verses)} Maasai verses")

    # Step 3: Align verses
    print("\nStep 3: Aligning English and Maasai verses...")
    print("-" * 70)
    
    aligned_pairs = align_bible_verses(en_verses, mas_verses)
    print(f"Aligned {len(aligned_pairs)} parallel verse pairs")

    # Step 4: Segment long verses
    print("\nStep 4: Segmenting long verses into sentences...")
    print("-" * 70)
    
    segmented_pairs = []
    for en_text, mas_text, source in aligned_pairs:
        en_segments = segment_long_verses(en_text, max_len=150)
        mas_segments = segment_long_verses(mas_text, max_len=150)
        
        # Align segments if counts match, otherwise keep originals
        if len(en_segments) == len(mas_segments):
            for en_seg, mas_seg in zip(en_segments, mas_segments):
                segmented_pairs.append((en_seg, mas_seg, source))
        else:
            segmented_pairs.append((en_text, mas_text, source))
    
    print(f"After segmentation: {len(segmented_pairs)} pairs")

    # Step 5: Check raw text
    print("\nStep 5: Checking raw genesis text...")
    print("-" * 70)
    
    if genesis_raw_path.exists():
        raw_pairs = extract_from_raw_text(str(genesis_raw_path))
        print(f"Found {len(raw_pairs)} potential pairs in raw text")
        # These are reference; don't add to final set if we have aligned pairs

    # Step 6: Write output JSONL
    print("\nStep 6: Writing output JSONL...")
    print("-" * 70)
    
    records = []
    for i, (en_text, mas_text, source_type) in enumerate(segmented_pairs):
        # English -> Maasai
        records.append({
            "id": f"bible-{source_type}-{i:05d}",
            "source_text": en_text,
            "target_text": mas_text,
            "source_lang": "en",
            "target_lang": "mas",
            "domain": "bible",
            "source_name": f"bible_{source_type}",
            "quality_score": 0.95,  # High quality (authoritative translation)
            "notes": f"Bible verse pair from {source_type}",
        })
        
        # Maasai -> English
        records.append({
            "id": f"bible-{source_type}-rev-{i:05d}",
            "source_text": mas_text,
            "target_text": en_text,
            "source_lang": "mas",
            "target_lang": "en",
            "domain": "bible",
            "source_name": f"bible_{source_type}",
            "quality_score": 0.95,
            "notes": f"Bible verse pair from {source_type} (reverse)",
        })

    with output_path.open("w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(f"✓ Wrote {len(records)} records to {output_path}")
    print(f"  Total bidirectional pairs: {len(segmented_pairs)}")
    print(f"  Estimated quality impact: HIGH (authoritative Bible translation)")

    # Summary statistics
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"English Bible: {len(en_text)} characters extracted")
    print(f"Maasai Bible: {len(mas_text)} characters extracted")
    print(f"English verses parsed: {len(en_verses)}")
    print(f"Maasai verses parsed: {len(mas_verses)}")
    print(f"Aligned pairs: {len(aligned_pairs)}")
    print(f"Final segmented pairs: {len(segmented_pairs)}")
    print(f"Output file: {output_path}")
    print(f"Output records: {len(records)}")
    print("=" * 70)


if __name__ == "__main__":
    main()
