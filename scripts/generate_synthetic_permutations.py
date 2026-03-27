#!/usr/bin/env python3
"""
Generate a massive synthetic Maasai-English translation dataset using combinatorial templates.
This expands the dataset geometrically by combining subjects, verbs, and objects.

Output: data/raw/synthetic_permutations.jsonl
"""

import json
from pathlib import Path
import itertools

def write_records(records, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

# Vocabularies
ANIMALS = [
    ("cow", "olkiteng"), ("lion", "olowuaru"), ("dog", "oldia"),
    ("elephant", "oldome"), ("bird", "emotonyi"), ("goat", "enkine"),
    ("sheep", "enker"), ("hare", "enkusero"), ("hyena", "olngojine")
]

ADJECTIVES = [
    ("big", "sapuk"), ("small", "kiti"), ("beautiful", "sidai"),
    ("strong", "magil"), ("black", "narok"), ("white", "naibor"),
    ("red", "nanyokie")
]

VERBS_I_SEE = [
    ("I see the", "Adol", "idol"), # English prefix, Maasai verb, Maasai object prefix (implicit)
    ("You see the", "Idol", ""),
    ("He sees the", "Edol", ""),
    ("She sees the", "Edol", "")
]

VERBS_I_HAVE = [
    ("I have a", "Aata", ""),
    ("You have a", "Iata", ""),
    ("He has a", "Eata", ""),
    ("She has a", "Eata", "")
]

LOCATIONS = [
    ("in the field", "ti aulo"), ("near the river", "ti ewueji e nkolong"), 
    ("at home", "t enkaji"), ("in the forest", "ti entim")
]

def make_record(en, mas, domain):
    return [
        {
            "source_text": en, "target_text": mas, "source_lang": "en", "target_lang": "mas",
            "domain": domain, "source_name": "synthetic", "quality_score": 0.9, "notes": "Synthetic permutation"
        },
        {
            "source_text": mas, "target_text": en, "source_lang": "mas", "target_lang": "en",
            "domain": domain, "source_name": "synthetic", "quality_score": 0.9, "notes": "Synthetic permutation"
        }
    ]

def main():
    records = []
    
    # Template 1: [Subject Verb] [Adjective] [Animal]
    for verb_en, verb_mas, _ in VERBS_I_SEE:
        for adj_en, adj_mas in ADJECTIVES:
            for animal_en, animal_mas in ANIMALS:
                en = f"{verb_en} {adj_en} {animal_en}."
                mas = f"{verb_mas} {animal_mas} {adj_mas}."
                records.extend(make_record(en, mas, "daily_life"))
                
    # Template 2: [Subject Verb] [Adjective] [Animal] [Location]
    for verb_en, verb_mas, _ in VERBS_I_HAVE:
        for adj_en, adj_mas in ADJECTIVES:
            for animal_en, animal_mas in ANIMALS:
                for loc_en, loc_mas in LOCATIONS:
                    en = f"{verb_en} {adj_en} {animal_en} {loc_en}."
                    mas = f"{verb_mas} {animal_mas} {adj_mas} {loc_mas}."
                    records.extend(make_record(en, mas, "environment"))
                    
    # Template 3: The [Animal] is [Adjective]
    for animal_en, animal_mas in ANIMALS:
        for adj_en, adj_mas in ADJECTIVES:
            en = f"The {animal_en} is {adj_en}."
            mas = f"E{adj_mas} {animal_mas}." # Maasai predicative adjective
            records.extend(make_record(en, mas, "daily_life"))
            
    # Output
    out_path = Path("data/raw/synthetic_permutations.jsonl")
    write_records(records, out_path)
    print(f"Generated {len(records)} synthetic records into {out_path}.")

if __name__ == "__main__":
    main()
