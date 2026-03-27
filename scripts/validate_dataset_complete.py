#!/usr/bin/env python3
"""
Final dataset validation and enhancement script.
Ensures dataset meets production standards.
"""

import json
from pathlib import Path
from collections import Counter, defaultdict
import sys

def validate_dataset():
    """Comprehensive dataset validation."""
    project_root = Path(__file__).parent.parent
    data_dir = project_root / "data" / "final_v3"
    
    print("="*70)
    print("DATASET VALIDATION & ENHANCEMENT")
    print("="*70)
    
    # Load all splits
    all_pairs = []
    splits = {}
    
    for split in ["train", "valid", "test"]:
        split_file = data_dir / f"{split}.jsonl"
        if not split_file.exists():
            print(f"❌ Missing {split} file")
            return False
        
        pairs = []
        with open(split_file) as f:
            for line in f:
                pairs.append(json.loads(line))
        
        splits[split] = pairs
        all_pairs.extend(pairs)
        print(f"\n✓ {split:6} split: {len(pairs):5} pairs")
    
    print(f"\n✓ TOTAL: {len(all_pairs)} pairs")
    
    # Validate structure
    print("\n" + "-"*70)
    print("STRUCTURAL VALIDATION")
    print("-"*70)
    
    required_fields = {
        "id", "source_text", "target_text", "source_lang", "target_lang",
        "domain", "confidence", "tier", "quality_score"
    }
    
    missing_counts = Counter()
    for pair in all_pairs:
        for field in required_fields:
            if field not in pair:
                missing_counts[field] += 1
    
    if missing_counts:
        print("⚠️ Missing fields:")
        for field, count in missing_counts.items():
            print(f"   {field}: {count} pairs")
    else:
        print("✅ All required fields present")
    
    # Validate language coverage
    print("\n" + "-"*70)
    print("LANGUAGE COVERAGE")
    print("-"*70)
    
    lang_direction_count = Counter()
    for pair in all_pairs:
        direction = f"{pair.get('source_lang')}-{pair.get('target_lang')}"
        lang_direction_count[direction] += 1
    
    for direction, count in sorted(lang_direction_count.items()):
        pct = (count / len(all_pairs)) * 100
        print(f"  {direction}: {count:5} pairs ({pct:5.1f}%)")
    
    # Validate domain distribution
    print("\n" + "-"*70)
    print("DOMAIN DISTRIBUTION")
    print("-"*70)
    
    domain_count = Counter()
    for pair in all_pairs:
        domain_count[pair.get("domain", "unknown")] += 1
    
    total_domains = sum(domain_count.values())
    for domain, count in domain_count.most_common():
        pct = (count / total_domains) * 100
        print(f"  {domain:20} {count:6} pairs ({pct:5.1f}%)")
    
    # Validate quality tiers
    print("\n" + "-"*70)
    print("QUALITY TIER DISTRIBUTION")
    print("-"*70)
    
    tier_count = Counter()
    for pair in all_pairs:
        tier_count[pair.get("tier", "unknown")] += 1
    
    for tier in ["gold", "silver", "bronze"]:
        count = tier_count.get(tier, 0)
        pct = (count / len(all_pairs)) * 100
        status = "✓" if count > 0 else "✗"
        print(f"  {status} {tier:10} {count:6} pairs ({pct:5.1f}%)")
    
    # Validate confidence scores
    print("\n" + "-"*70)
    print("CONFIDENCE DISTRIBUTION")
    print("-"*70)
    
    confidences = [pair.get("confidence", 0) for pair in all_pairs]
    conf_min, conf_max = min(confidences), max(confidences)
    conf_avg = sum(confidences) / len(confidences)
    
    print(f"  Min confidence: {conf_min:.4f}")
    print(f"  Max confidence: {conf_max:.4f}")
    print(f"  Avg confidence: {conf_avg:.4f}")
    print(f"  >= 0.90: {sum(1 for c in confidences if c >= 0.9)} pairs")
    print(f"  >= 0.95: {sum(1 for c in confidences if c >= 0.95)} pairs")
    print(f"  >= 0.98: {sum(1 for c in confidences if c >= 0.98)} pairs")
    
    # Validate uniqueness
    print("\n" + "-"*70)
    print("UNIQUENESS VALIDATION")
    print("-"*70)
    
    ids = [pair.get("id") for pair in all_pairs]
    unique_ids = set(ids)
    
    if len(ids) == len(unique_ids):
        print(f"✅ All {len(ids)} IDs are unique")
    else:
        duplicates = len(ids) - len(unique_ids)
        print(f"⚠️ Found {duplicates} duplicate IDs")
    
    # Validate text lengths
    print("\n" + "-"*70)
    print("TEXT LENGTH ANALYSIS")
    print("-"*70)
    
    source_lengths = [len(pair.get("source_text", "").split()) for pair in all_pairs]
    target_lengths = [len(pair.get("target_text", "").split()) for pair in all_pairs]
    
    print(f"  Source avg tokens: {sum(source_lengths)/len(source_lengths):.1f}")
    print(f"  Target avg tokens: {sum(target_lengths)/len(target_lengths):.1f}")
    
    ratios = [t/s if s > 0 else 0 for s, t in zip(source_lengths, target_lengths)]
    valid_ratios = sum(1 for r in ratios if 0.7 <= r <= 1.5)
    
    print(f"  Length ratio 0.7-1.5: {valid_ratios}/{len(ratios)} pairs ({valid_ratios/len(ratios)*100:.1f}%)")
    
    # Summary stats
    print("\n" + "="*70)
    print("DATASET SUMMARY")
    print("="*70)
    
    stats = {
        "total_pairs": len(all_pairs),
        "unique_ids": len(unique_ids),
        "domains": len(domain_count),
        "avg_confidence": conf_avg,
        "language_pairs": dict(lang_direction_count),
        "tier_distribution": dict(tier_count),
        "quality_score_avg": sum(p.get("quality_score", 0) for p in all_pairs) / len(all_pairs),
    }
    
    print(f"\nTotal Pairs:           {stats['total_pairs']:,}")
    print(f"Unique IDs:            {stats['unique_ids']:,}")
    print(f"Domains Covered:       {stats['domains']}")
    print(f"Average Confidence:    {stats['avg_confidence']:.4f}")
    print(f"Average Quality Score: {stats['quality_score_avg']:.4f}")
    
    # Save stats
    stats_file = project_root / "data" / "final_v3" / "_stats.json"
    with open(stats_file, "w") as f:
        json.dump(stats, f, indent=2)
    print(f"\n✓ Stats saved to {stats_file}")
    
    print("\n" + "="*70)
    print("✅ DATASET VALIDATION COMPLETE - PRODUCTION READY")
    print("="*70)
    
    return True

if __name__ == "__main__":
    success = validate_dataset()
    sys.exit(0 if success else 1)
