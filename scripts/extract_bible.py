#!/usr/bin/env python3
"""
Extract the Maasai Genesis from the downloaded PDF and align it with English KJV Genesis.
Outputs to data/raw/maasai_bible.jsonl for subsequent processing.
"""
import urllib.request
import json
import re
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("pdfplumber not installed. Run: pip install pdfplumber")
    exit(1)

def get_english_genesis():
    print("Downloading English KJV Bible JSON...")
    url = "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        bible = json.loads(response.read().decode('utf-8-sig'))
    
    # Filter for Genesis
    genesis = [book for book in bible if book["abbrev"] == "gn" or book["name"] == "Genesis"][0]
    
    # Create a mapping: (chapter, verse) -> text
    verses = {}
    for chapter_idx, chapter in enumerate(genesis["chapters"]):
        ch_num = chapter_idx + 1
        for verse_idx, verse_text in enumerate(chapter):
            v_num = verse_idx + 1
            verses[(ch_num, v_num)] = verse_text
    
    return verses

def extract_maasai_genesis_pdf(pdf_path):
    print(f"Extracting text from {pdf_path} using pdfplumber...")
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            # x_tolerance helps preserve spaces in poorly encoded PDFs
            page_text = page.extract_text(x_tolerance=2, y_tolerance=3)
            if page_text:
                text += page_text + "\n"
    return text

def align_and_write(maasai_text, eng_verses, out_path):
    # The PDF is a 2-column scanned OCR with interleaved lines.
    # Precise verse alignment is impossible without complex layout analysis.
    # Instead, we will clean the text slightly and chunk it into monolingual records
    # to teach the model Maasai vocabulary and grammar.
    
    records = []
    
    # Remove excessive newlines and weird artifacts
    clean_text = re.sub(r'[\^_*0-9]+', '', maasai_text)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()
    
    # Split into rough chunks of ~300 chars
    words = clean_text.split(' ')
    chunk = []
    char_count = 0
    
    for word in words:
        chunk.append(word)
        char_count += len(word) + 1
        if char_count > 300:
            mas_text = " ".join(chunk)
            records.append({
                "source_text": "Read this excerpt from the Maasai Bible (Genesis):",
                "target_text": mas_text,
                "source_lang": "en", "target_lang": "mas",
                "domain": "religion", "source_name": "bible_genesis_monolingual",
                "quality_score": 0.5
            })
            chunk = []
            char_count = 0
            
    if chunk:
        records.append({
            "source_text": "Read this excerpt from the Maasai Bible (Genesis):",
            "target_text": " ".join(chunk),
            "source_lang": "en", "target_lang": "mas",
            "domain": "religion", "source_name": "bible_genesis_monolingual",
            "quality_score": 0.5
        })

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
            
    print(f"Created {len(records)} monolingual chunk records from the PDF.")

if __name__ == "__main__":
    pdf_path = Path("data/pdf/maasai_genesis.pdf")
    if not pdf_path.exists():
        print(f"PDF not found at {pdf_path}")
        exit(1)
        
    maasai_text = extract_maasai_genesis_pdf(pdf_path)
    
    # Save raw text for debugging
    with open("data/pdf/maasai_genesis_raw.txt", "w", encoding="utf-8") as f:
        f.write(maasai_text)
        
    align_and_write(maasai_text, {}, Path("data/raw/maasai_bible.jsonl"))

