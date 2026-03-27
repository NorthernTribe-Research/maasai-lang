#!/usr/bin/env python3
"""
Download and extract massive linguistic Maasai OCR texts from Archive.org.
Includes A.C. Hollis "The Maasai: Their Language and Folklore" (1905) and 
H. Hinde "The Masai language; grammatical notes together with a vocabulary" (1901).
"""

import urllib.request
import re
import json
from pathlib import Path

urls = {
    "hollis": "https://archive.org/download/masaitheirlangua00holl/masaitheirlangua00holl_djvu.txt",
    "hinde": "https://archive.org/download/masailanguagegra00hindrich/masailanguagegra00hindrich_djvu.txt"
}

def clean_ocr(text):
    # Remove basic OCR junk and excessive page numbers
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Join broken lines where a line doesn't end in punctuation
    text = re.sub(r'([A-Za-z,;\-]+)\n([a-z])', r'\1 \2', text)
    # Remove obvious noise
    text = re.sub(r'\[[0-9]+\]', '', text)
    return text

def chunk_text(text, source_name, target_size=400):
    words = text.split(' ')
    records = []
    chunk = []
    char_count = 0
    
    for word in words:
        if not word.strip(): continue
        chunk.append(word)
        char_count += len(word) + 1
        
        # When we reach roughly target_size, end the chunk at a sentence boundary
        if char_count >= target_size and word.endswith(('.', '?', '!', '"', '”')):
            records.append({
                "source_text": "Read this linguistic text about the Maasai language and folklore:",
                "target_text": " ".join(chunk).replace('\n', ' ').strip(),
                "source_lang": "en", "target_lang": "mas",
                "domain": "culture", "source_name": source_name,
                "quality_score": 0.6
            })
            chunk = []
            char_count = 0
            
    return records

def main():
    out_path = Path("data/raw/archive_linguistics.jsonl")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    
    all_records = []
    for author, url in urls.items():
        print(f"Downloading {author} text from Archive.org...")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            text = response.read().decode('utf-8', errors='ignore')
            
        print(f"Cleaning {author} OCR text...")
        clean = clean_ocr(text)
        
        print(f"Chunking {author} text...")
        records = chunk_text(clean, f"{author}_linguistics", target_size=500)
        all_records.extend(records)
        print(f"Created {len(records)} chunks for {author}.")
        
    print(f"Writing {len(all_records)} total records to {out_path}...")
    with open(out_path, 'w', encoding='utf-8') as f:
        for r in all_records:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
            
if __name__ == "__main__":
    main()
