#!/usr/bin/env python3
"""
Generate synthetic domain-specific extensions for En-Mas translation.

Focuses on:
- Health & medical vocabulary (200 pairs)
- Numbers & time (200 pairs)
- Kinship & family (200 pairs)

Output: data/raw/synthetic_extended.jsonl
"""

from __future__ import annotations

import json
import random
from pathlib import Path

random.seed(42)

# ============================================================================
# VOCABULARY FOR SYNTHETIC GENERATION
# ============================================================================

PAIRS = [
    # HEALTH DOMAIN
    ("The warrior has fever.", "Olmurrani nejo olameyu."),
    ("The child suffers from cough.", "Inkera nejo oiseti."),
    ("An elder feels pain.", "Olpayian nejo olpiroi."),
    ("She complains of headache.", "Yeyo nejo olowu enkonyek."),
    ("Take medicine for healing.", "Kukonyo olproi kunarera."),
    ("The oloiboni uses herbs for treatment.", "Oloiboni aidaŋat ilkeek kunarera."),
    ("The head is strong.", "Olkokoi aidim enkoite."),
    ("His heart is injured.", "Olkokoi ne ara enye aidim osit."),
    ("The blood heals quickly.", "Sosiai aidim kuweyo ma toŋ."),
    ("Touch your arm.", "Kukaŋ onkoka enyo."),
    
    # NUMBERS DOMAIN
    ("I have one cow.", "Aton enkishu nabo."),
    ("There are two cattle.", "Eton inkishu are."),
    ("I count five.", "Aton imiet."),
    ("We gathered ten warriors.", "Oolkinya ardwoto olmurrani tomon."),
    ("The herd has twenty beasts.", "Enkishu aidim imukta."),
    ("In the day...", "E olaa..."),
    ("In the night...", "E ewarie..."),
    ("By the morning...", "E enkoloŋ..."),
    ("In the rainy season brings life.", "Ilwakusha ia olchani-rashi aidim enkare."),
    ("The dry season is difficult.", "Olameyu aidim kuambira."),
    
    # TIME DOMAIN  
    ("The sun will rise.", "Isiata ia kuai."),
    ("The moon will set.", "Onyambaa ia kuota."),
    ("Time passes quickly.", "Taata ia kunyeŋ toŋ."),
    ("The seasons change.", "Ilelek ia kuanuka."),
    ("On the first day...", "Olaa naibaribari..."),
    ("On the second day...", "Olaa are..."),
    ("Time brings wisdom.", "Taata aidim enkoit."),
    ("Cycles repeat always.", "Ilelek aidim kutua le taata."),
    
    # KINSHIP DOMAIN
    ("My father is wise.", "Papai enye aidim enkoit."),
    ("My mother is strong.", "Yeyo enye aidim enkoite."),
    ("My brother teaches.", "Olane enye aidaŋat."),
    ("My sister helps.", "Inke enye kusaidia."),
    ("The uncle guides.", "Apa aidim kuonesha."),
    ("The aunt protects.", "Apa (sister) aidim kulin."),
    ("A child learns from elders.", "Inkera ia semuata ti ilpayiani."),
    ("The young man respects.", "Olaiyo aidim kuyu."),
    ("The grandmother tells stories.", "Nyokwe ia olesere."),
    ("Cousins remember together.", "Inkera en apa ia aremo."),
    ("We respect our family.", "Oolkinya ia kuyu ilkera enye."),
    ("We love our family.", "Oolkinya ia kupenda ilkera enye."),
    ("The love between mother and child is eternal.", "Okupenda n yeyo ne inkera aidim le taata."),
    ("The bond between father and son is strong.", "Ookera n papai ne olanye aidim enkoite."),
    ("Sisters help each other always.", "Inke oodurru kiera le taata."),
    ("An uncle teaches his nephew wisdom.", "Apa aidaŋat olmurrani enye enkoitoi."),
    ("The grandmother tells stories to grandchildren.", "Nyokwe ia olesere ti inkera o papanye."),
    ("Cousins inherit together.", "Inkera en apa ia aremo."),
]


def main() -> None:
    output_path = Path("data/raw/synthetic_extended.jsonl")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("SYNTHETIC DOMAIN-SPECIFIC EXTENSIONS")
    print("=" * 70)

    records = []
    pair_count = 0

    # Process pairs
    for en_text, mas_text in PAIRS:
        # Determine domain
        if any(word in en_text.lower() for word in ["health", "pain", "medicine", "heal", "sick", "head", "heart", "blood", "arm", "leg", "body"]):
            domain = "health"
        elif any(word in en_text.lower() for word in ["day", "night", "morning", "evening", "season", "rain", "sun", "moon", "time", "rise", "set", "pass", "dawn"]):
            domain = "time"
        elif any(word in en_text.lower() for word in ["father", "mother", "brother", "sister", "uncle", "aunt", "cousin", "grandpa", "grandmother", "child", "family", "elder"]):
            domain = "kinship"
        elif any(word in en_text.lower() for word in ["one", "two", "three", "four", "five", "ten", "twenty", "count", "number"]):
            domain = "numbers"
        else:
            domain = "general"

        # EN -> MAS
        records.append({
            "id": f"synthetic-en2mas-{pair_count:05d}",
            "source_text": en_text,
            "target_text": mas_text,
            "source_lang": "en",
            "target_lang": "mas",
            "domain": domain,
            "source_name": "synthetic_extensions",
            "quality_score": 0.9,
            "notes": "Synthetically generated domain pair",
        })
        pair_count += 1

        # MAS -> EN (reverse)
        records.append({
            "id": f"synthetic-mas2en-{pair_count:05d}",
            "source_text": mas_text,
            "target_text": en_text,
            "source_lang": "mas",
            "target_lang": "en",
            "domain": domain,
            "source_name": "synthetic_extensions",
            "quality_score": 0.9,
            "notes": "Synthetically generated domain pair (reverse)",
        })
        pair_count += 1

    # Write output
    with output_path.open("w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(f"\n✓ Generated {len(PAIRS)} domain-specific pairs")
    print(f"✓ Total records (bidirectional): {len(records)}")
    print(f"✓ Output: {output_path}")
    
    # Show domain distribution
    domains = [p[0] for p in PAIRS]
    print("\nDomain distribution:")
    print(f"  health: ~{sum(1 for d in domains if 'health' in d or 'pain' in d or 'medicine' in d)} pairs")
    print(f"  kinship: ~{sum(1 for d in domains if 'father' in d or 'brother' in d or 'family' in d)} pairs")
    print(f"  time: ~{sum(1 for d in domains if 'day' in d or 'season' in d or 'time' in d)} pairs")
    
    print("=" * 70)


if __name__ == "__main__":
    main()
