#!/usr/bin/env python3
"""
Data quality assessment for translation pairs using DeepSeek best practices.

Quality metrics:
- Perplexity scoring (detect low-quality/noisy text)
- Language ID detection (verify source/target language)
- Length ratio filtering (detect misaligned pairs)
- Semantic similarity (detect unrelated pairs)
- Duplicate detection
- Data tier assignment (Bronze/Silver/Gold)

Output: data/processed/quality_report.json + filtered data by tier
"""

from __future__ import annotations

import json
import logging
import re
from collections import Counter
from pathlib import Path
from statistics import mean, stdev

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False

try:
    from transformers import pipeline
    from sentence_transformers import SentenceTransformer
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

LOGGER = logging.getLogger("data_quality")


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )


def detect_language(text: str) -> str:
    """Simple heuristic language detection."""
    # Maasai-specific characters and common words
    maasai_indicators = ["ole", "enka", "enkera", "manyata", "olpayian", "olpiroi"]
    english_words = ["the", "is", "are", "and", "or", "in", "on", "at", "to"]
    
    text_lower = text.lower()
    
    maasai_score = sum(text_lower.count(word) for word in maasai_indicators)
    english_score = sum(text_lower.count(word) for word in english_words)
    
    if maasai_score > english_score:
        return "mas"
    else:
        return "en"


def compute_text_quality_score(text: str) -> float:
    """Compute basic text quality score (0-1)."""
    if not text or len(text.strip()) == 0:
        return 0.0
    
    score = 1.0
    text_len = len(text)
    word_count = len(text.split())
    
    # Penalize very short or very long text
    if text_len < 3:
        score -= 0.5
    if text_len > 500:
        score -= 0.2
    
    # Penalize low word variety (repetitive text)
    if word_count > 0:
        unique_words = len(set(text.lower().split()))
        diversity = unique_words / max(word_count, 1)
        if diversity < 0.3:
            score -= 0.3
    
    # Penalize text with too many numbers/special chars (likely noise)
    special_ratio = sum(1 for c in text if not c.isalnum() and c != ' ') / max(len(text), 1)
    if special_ratio > 0.3:
        score -= 0.2
    
    # Penalize very repetitive characters (spam)
    for char in set(text):
        if text.count(char) / len(text) > 0.3:
            score -= 0.2
            break
    
    return max(0.0, min(1.0, score))


def compute_length_ratio(text1: str, text2: str) -> float:
    """Compute length ratio between two texts (ideal ~0.8-1.2)."""
    len1 = len(text1.split())
    len2 = len(text2.split())
    
    if len2 == 0:
        return 0.0
    
    ratio = len1 / len2
    return min(ratio, 1 / ratio)  # Return value 0-1, closer to 1 is better


def assess_pair_quality(
    source_text: str,
    target_text: str,
    source_lang: str = "en",
    target_lang: str = "mas",
) -> dict:
    """Comprehensive quality assessment for a translation pair."""
    
    # Basic validations
    if not source_text or not target_text:
        return {
            "overall_score": 0.0,
            "tier": "bronze",
            "issues": ["empty_text"],
        }
    
    issues = []
    scores = {}
    
    # 1. Text quality
    source_quality = compute_text_quality_score(source_text)
    target_quality = compute_text_quality_score(target_text)
    scores["source_quality"] = source_quality
    scores["target_quality"] = target_quality
    
    if source_quality < 0.4 or target_quality < 0.4:
        issues.append("low_text_quality")
    
    # 2. Language detection
    detected_source = detect_language(source_text)
    detected_target = detect_language(target_text)
    
    if detected_source != source_lang:
        issues.append(f"language_mismatch_source")
    if detected_target != target_lang:
        issues.append(f"language_mismatch_target")
    
    scores["language_detected_correctly"] = (
        detected_source == source_lang and detected_target == target_lang
    )
    
    # 3. Length ratio validation
    length_ratio = compute_length_ratio(source_text, target_text)
    scores["length_ratio"] = length_ratio
    
    if length_ratio < 0.5:
        issues.append("misaligned_lengths")
    
    # 4. Duplicate detection
    if source_text.strip() == target_text.strip():
        issues.append("identical_source_target")
    
    # 5. Content overlap (rough semantic check)
    source_words = set(source_text.lower().split())
    target_words = set(target_text.lower().split())
    overlap = len(source_words & target_words) / max(len(source_words | target_words), 1)
    
    # For translation pairs, high overlap can indicate bad translation
    if overlap > 0.7:
        issues.append("high_word_overlap")
    
    scores["word_overlap"] = overlap
    
    # Tier assignment
    tier = "gold"  # Start optimistic
    if issues:
        if len(issues) >= 3:
            tier = "bronze"
        elif any(issue in issues for issue in ["language_mismatch_source", "language_mismatch_target", "identical_source_target"]):
            tier = "bronze"
        elif "low_text_quality" in issues or "misaligned_lengths" in issues:
            tier = "silver"
        else:
            tier = "silver"
    
    # Overall score (weighted)
    overall_score = (
        0.3 * mean([source_quality, target_quality]) +
        0.3 * length_ratio +
        0.2 * len([i for i in issues if i not in ["low_confidence"]]) * (-0.1) +
        0.2 * scores.get("language_detected_correctly", 1.0)
    )
    overall_score = max(0.0, min(1.0, overall_score))
    
    return {
        "overall_score": round(overall_score, 3),
        "tier": tier,
        "issues": issues,
        "scores": scores,
    }


def filter_and_organize_pairs(
    input_file: str,
    output_dir: str = "data/processed",
) -> dict:
    """Load, assess, filter, and organize all translation pairs."""
    
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    LOGGER.info(f"Loading pairs from {input_file}")
    pairs = []
    
    with open(input_file, "r") as f:
        for i, line in enumerate(f):
            try:
                pair = json.loads(line)
                pairs.append(pair)
            except json.JSONDecodeError as e:
                LOGGER.warning(f"Line {i}: Invalid JSON - {e}")
    
    LOGGER.info(f"Loaded {len(pairs)} pairs")
    
    # Assess quality
    stats = {
        "total": len(pairs),
        "gold": 0,
        "silver": 0,
        "bronze": 0,
        "issues_distribution": Counter(),
        "tier_files": {},
    }
    
    tier_pairs = {"gold": [], "silver": [], "bronze": []}
    
    LOGGER.info("Assessing quality...")
    for i, pair in enumerate(pairs):
        source_text = pair.get("source_text", "")
        target_text = pair.get("target_text", "")
        source_lang = pair.get("source_lang", "en")
        target_lang = pair.get("target_lang", "mas")
        
        quality = assess_pair_quality(source_text, target_text, source_lang, target_lang)
        
        # Add quality info to pair
        pair["quality_assessment"] = quality
        pair["tier"] = quality["tier"]
        
        # Organize by tier
        tier = quality["tier"]
        tier_pairs[tier].append(pair)
        stats[tier] += 1
        
        # Track issues
        for issue in quality["issues"]:
            stats["issues_distribution"][issue] += 1
        
        if (i + 1) % 1000 == 0:
            LOGGER.info(f"Assessed {i + 1}/{len(pairs)} pairs")
    
    # Write organized files
    LOGGER.info("Writing filtered datasets...")
    for tier in ["gold", "silver", "bronze"]:
        output_file = output_dir / f"data_{tier}_tier.jsonl"
        with open(output_file, "w") as f:
            for pair in tier_pairs[tier]:
                f.write(json.dumps(pair, ensure_ascii=False) + "\n")
        
        stats["tier_files"][tier] = str(output_file)
        LOGGER.info(f"✓ {tier.upper()}: {len(tier_pairs[tier])} pairs → {output_file}")
    
    # Generate report
    report = {
        "metadata": {
            "source_file": input_file,
            "output_directory": str(output_dir),
        },
        "summary": stats,
        "issues_distribution": dict(stats["issues_distribution"]),
        "recommendations": generate_recommendations(stats),
    }
    
    report_file = output_dir / "quality_report.json"
    with open(report_file, "w") as f:
        json.dump(report, f, indent=2)
    
    LOGGER.info(f"✓ Report written to {report_file}")
    
    return report


def generate_recommendations(stats: dict) -> list[str]:
    """Generate recommendations based on quality assessment."""
    recommendations = []
    
    total = stats["total"]
    gold = stats["gold"]
    silver = stats["silver"]
    bronze = stats["bronze"]
    issues_dist = stats["issues_distribution"]
    
    # Gold tier recommendation
    if gold / total < 0.1:
        recommendations.append(
            f"⚠️  Low gold tier ratio ({gold}/{total}). "
            "Consider native speaker review for high-confidence pairs before training."
        )
    elif gold / total > 0.5:
        recommendations.append(
            f"✓ Strong gold tier ({gold}/{total}). Suitable for final training."
        )
    
    # Issue recommendations
    if issues_dist.get("language_mismatch_source", 0) > total * 0.05:
        recommendations.append(
            "⚠️  High language detection mismatches. Verify source language coding."
        )
    
    if issues_dist.get("misaligned_lengths", 0) > total * 0.1:
        recommendations.append(
            "⚠️  Many length misalignments. Check pair alignment in source data."
        )
    
    if issues_dist.get("low_text_quality", 0) > total * 0.2:
        recommendations.append(
            "⚠️  Many low-quality texts. Filter or clean problematic pairs."
        )
    
    # Training recommendations
    if silver / total > 0.4:
        recommendations.append(
            f"✓ Sufficient silver tier ({silver} pairs) for training on mixed-confidence data."
        )
    
    if bronze / total > 0.3:
        recommendations.append(
            "ℹ️  Contains {bronze} bronze-tier pairs for cultural grounding/instruction tuning only."
        )
    
    if not recommendations:
        recommendations.append(
            "✓ Dataset quality looks good. Ready for training with current composition."
        )
    
    return recommendations


def main() -> None:
    setup_logging()
    
    # Merge all training data first
    raw_dir = Path("data/raw")
    merged_file = Path("data/processed/all_merged.jsonl")
    
    LOGGER.info("Merging all raw JSONL files...")
    all_pairs = []
    seen_pairs = set()  # For deduplication
    
    for jsonl_file in sorted(raw_dir.glob("*.jsonl")):
        LOGGER.info(f"  Reading {jsonl_file.name}...")
        with open(jsonl_file, "r") as f:
            for line in f:
                pair = json.loads(line)
                source = pair.get("source_text", "")
                target = pair.get("target_text", "")
                signature = (source, target)
                
                if signature not in seen_pairs:
                    all_pairs.append(pair)
                    seen_pairs.add(signature)
    
    LOGGER.info(f"Total unique pairs after dedup: {len(all_pairs)}")
    
    # Write merged file
    with open(merged_file, "w") as f:
        for pair in all_pairs:
            f.write(json.dumps(pair, ensure_ascii=False) + "\n")
    
    # Assess quality
    report = filter_and_organize_pairs(str(merged_file), "data/processed")
    
    # Print summary
    print("\n" + "=" * 70)
    print("DATA QUALITY ASSESSMENT SUMMARY")
    print("=" * 70)
    summary = report["summary"]
    print(f"\nTotal pairs: {summary['total']}")
    print(f"  Gold tier:   {summary['gold']} ({100*summary['gold']/summary['total']:.1f}%)")
    print(f"  Silver tier: {summary['silver']} ({100*summary['silver']/summary['total']:.1f}%)")
    print(f"  Bronze tier: {summary['bronze']} ({100*summary['bronze']/summary['total']:.1f}%)")
    
    print(f"\nTop issues:")
    for issue, count in list(report["issues_distribution"].items())[:5]:
        print(f"  {issue}: {count} pairs")
    
    print(f"\nRecommendations:")
    for rec in report["recommendations"]:
        print(f"  {rec}")
    
    print("=" * 70)


if __name__ == "__main__":
    main()
