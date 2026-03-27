"""
Evaluation metrics for Maasai translation quality.
"""

from __future__ import annotations

import re
from typing import Optional

import sacrebleu

from src.glossary import MaasaiGlossary


def compute_bleu(hypotheses: list[str], references: list[str]) -> float:
    """Compute corpus-level BLEU score."""
    result = sacrebleu.corpus_bleu(hypotheses, [references])
    return result.score


def compute_chrf(hypotheses: list[str], references: list[str]) -> float:
    """Compute corpus-level chrF++ score."""
    result = sacrebleu.corpus_chrf(hypotheses, [references], word_order=2)
    return result.score


def terminology_accuracy(
    hypotheses: list[str],
    references: list[str],
    glossary: MaasaiGlossary,
) -> dict[str, float]:
    """
    Measure how well protected glossary terms are preserved.

    Returns:
        dict with 'term_recall' and 'term_precision' and per-term stats.
    """
    protected = glossary.protected_terms()
    if not protected:
        return {"term_recall": 1.0, "term_precision": 1.0}

    total_expected = 0
    total_found = 0

    for hyp, ref in zip(hypotheses, references):
        hyp_lower = hyp.lower()
        ref_lower = ref.lower()

        for entry in protected:
            # Check if the term should appear (present in reference)
            term = entry.term_maasai.lower()
            if term in ref_lower:
                total_expected += 1
                if term in hyp_lower:
                    total_found += 1

    recall = total_found / max(total_expected, 1)
    return {
        "term_recall": round(recall, 4),
        "terms_expected": total_expected,
        "terms_found": total_found,
    }


def length_ratio_stats(
    hypotheses: list[str],
    references: list[str],
) -> dict[str, float]:
    """Compute length ratio statistics between hyp and ref."""
    ratios = []
    for hyp, ref in zip(hypotheses, references):
        ref_len = max(len(ref), 1)
        ratios.append(len(hyp) / ref_len)

    if not ratios:
        return {"mean_ratio": 0.0, "min_ratio": 0.0, "max_ratio": 0.0}

    return {
        "mean_ratio": round(sum(ratios) / len(ratios), 4),
        "min_ratio": round(min(ratios), 4),
        "max_ratio": round(max(ratios), 4),
    }


def full_evaluation(
    hypotheses: list[str],
    references: list[str],
    glossary: Optional[MaasaiGlossary] = None,
) -> dict[str, any]:
    """Run the full evaluation suite."""
    results = {
        "bleu": compute_bleu(hypotheses, references),
        "chrf++": compute_chrf(hypotheses, references),
        "length_ratios": length_ratio_stats(hypotheses, references),
        "num_samples": len(hypotheses),
    }

    if glossary is not None:
        results["terminology"] = terminology_accuracy(hypotheses, references, glossary)

    return results
