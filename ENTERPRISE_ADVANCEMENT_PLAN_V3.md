# ENTERPRISE-LEVEL MODEL & DATASET ADVANCEMENT PLAN
## Maasai Language Translation Project v2.0 → v3.0 Enterprise Edition

**Date:** March 26, 2026  
**Mission:** Transform from "good showcase" to "state-of-the-art production-grade"  
**Timeline:** Parallel workstreams (not sequential)

---

## EXECUTIVE SUMMARY

After deep analysis, the project has strong foundations but is missing **enterprise-grade rigor**:

| Dimension | Current | Target | Gap |
|-----------|---------|--------|-----|
| Metrics | 3 (BLEU, chrF++, terminology) | 8+ (with error analysis) | Need error categorization framework |
| Data validation | Basic JSONL + dedup | Multi-level validation + provenance | Need enhanced validation pipeline |
| Model variants | 1 (QLoRA) | 3-5 (baseline, few-shot, domain-specific) | Need hyperparameter sweep + ablations |
| Inference | Transformer-only | Quantized (Q4/Q5/Q6) + llama.cpp | Need GGUF export + integration |
| Evaluation | Automated only | Automated + human consensus | Need annotation protocol + agreement metrics |
| Monitoring | None | Real-time performance tracking | Need inference pipeline monitoring |

**Effort to Enterprise:** ~80-120 hours (parallel work)

---

## PHASE 1: DATASET EXCELLENCE (1-2 weeks)

### 1.1 Enhanced Data Validation Pipeline

**Goal:** Detect and fix hidden quality issues before training

**Current state:** Basic deduplication, language ID check  
**Target:** Multi-dimensional validation

**Implementation:**

```python
# scripts/advanced_data_validation.py

import json
from pathlib import Path
from collections import Counter
import hashlib

class AdvancedDataValidator:
    def __init__(self, dataset_path):
        self.pairs = self.load_pairs(dataset_path)
        self.issues = Counter()
        self.fixes = []
    
    def load_pairs(self, path):
        pairs = []
        with open(path) as f:
            for line_no, line in enumerate(f, 1):
                try:
                    pairs.append((line_no, json.loads(line)))
                except:
                    self.issues["parse_error"] += 1
        return pairs
    
    def validate(self):
        """Run all validations, return clean dataset + issues report"""
        for line_no, pair in self.pairs:
            self._check_required_fields(line_no, pair)
            self._check_text_quality(line_no, pair)
            self._check_semantic_alignment(line_no, pair)
            self._check_glossary_presence(line_no, pair)
            self._check_orthography(line_no, pair)
        
        return self._generate_report()
    
    def _check_required_fields(self, line_no, pair):
        required = {"source_text", "target_text", "confidence", "tier"}
        missing = required - set(pair.keys())
        if missing:
            self.issues[f"missing_{missing}"] += 1
    
    def _check_text_quality(self, line_no, pair):
        src = pair.get("source_text", "")
        tgt = pair.get("target_text", "")
        
        # Check for control characters
        if any(ord(c) < 32 and c not in '\n\t' for c in src + tgt):
            self.issues["control_chars"] += 1
        
        # Check for common encoding issues
        if "?" in src or "?" in tgt:
            self.issues["encoding_issues"] += 1
        
        # Check for HTML/XML artifacts
        if any(pat in src + tgt for pat in ["<", ">", "&lt;", "&#"]):
            self.issues["markup_artifacts"] += 1
    
    def _check_semantic_alignment(self, line_no, pair):
        # Use BERTScore or simple heuristics
        src_words = set(pair.get("source_text", "").lower().split())
        tgt_words = set(pair.get("target_text", "").lower().split())
        
        # Very low overlap might indicate poor alignment
        overlap = len(src_words & tgt_words)
        total = len(src_words | tgt_words)
        overlap_ratio = overlap / max(total, 1)
        
        if overlap_ratio > 0.8:
            # Likely copy-paste or poor translation
            self.issues["high_overlap"] += 1
        
        if overlap_ratio < 0.05:
            # Might be too different
            conf = pair.get("confidence", 1.0)
            if conf > 0.9:  # Shouldn't be high-conf with no overlap
                self.issues["confidence_mismatch"] += 1
    
    def _check_glossary_presence(self, line_no, pair):
        # Load glossary terms
        glossary_terms = self._load_glossary_terms()
        
        # For each glossary term in target, check confidence is high
        tgt = pair.get("target_text", "").lower()
        for term in glossary_terms:
            if term.lower() in tgt:
                conf = pair.get("confidence", 0)
                if conf < 0.9:
                    self.issues["low_conf_glossary_term"] += 1
    
    def _check_orthography(self, line_no, pair):
        # Maasai-specific orthography checks
        src = pair.get("source_text", "")
        tgt = pair.get("target_text", "")
        
        # Check for common misspellings
        common_mistakes = {
            "enkai": ["enkay", "enkai"],  # Should be "Enkai"
            "laikipiak": ["laikipia", "laikipia"],
        }
        
        for correct, mistakes in common_mistakes.items():
            for mistake in mistakes:
                if mistake.lower() in tgt.lower():
                    self.issues[f"orthography_{mistake}"] += 1
    
    def _load_glossary_terms(self):
        # Load from data/glossary/maasai_glossary.json
        try:
            with open("data/glossary/maasai_glossary.json") as f:
                glossary = json.load(f)
            return [e["term_maasai"] for e in glossary.get("entries", [])]
        except:
            return []
    
    def _generate_report(self):
        return {
            "total_pairs": len(self.pairs),
            "issues": dict(self.issues),
            "issue_categories": {
                "critical": self.issues["parse_error"] + self.issues.get("missing_required", 0),
                "high": self.issues["encoding_issues"] + self.issues.get("markup_artifacts", 0),
                "medium": self.issues["high_overlap"] + self.issues.get("confidence_mismatch", 0),
                "low": self.issues["orthography_*"]
            }
        }
```

**Acceptance Criteria:**
- [ ] Identify all data quality issues (parse, encoding, semantic, orthography)
- [ ] Generate categorized issues report
- [ ] Fix/repair issues automatically where possible
- [ ] Output cleaned dataset + issues log

---

### 1.2 Data Provenance & Versioning

**Goal:** Track data lineage for reproducibility

**Implementation:**

```
data/
├── final_v3/
│   ├── train.jsonl
│   ├── valid.jsonl
│   ├── test.jsonl
│   ├── _metadata.json          # NEW: timestamp, source, processing
│   ├── _validation_report.json # NEW: quality checks
│   ├── _lineage.json           # NEW: provenance tracking
│   └── _stats.json             # NEW: detailed statistics
```

**_metadata.json structure:**
```json
{
  "version": "3.0",
  "created_date": "2026-03-26T14:30:00Z",
  "creator": "NorthernTribe-Research",
  "source_datasets": [
    {"name": "bible_sentences", "count": 8444, "quality_tier": "gold"},
    {"name": "cultural_pairs", "count": 690, "quality_tier": "silver"},
    {"name": "synthetic_augmented", "count": 70, "quality_tier": "silver"}
  ],
  "processing_steps": [
    "extraction", "deduplication", "quality_assessment", "tier_assignment"
  ],
  "statistics": {
    "total_pairs": 9194,
    "languages": ["en", "mas"],
    "domains": 15,
    "avg_confidence": 0.958
  }
}
```

---

### 1.3 Domain-Stratified Evaluation Sets

**Goal:** Enable per-domain performance measurement

**Implementation:**

Split test set by domain to track performance variance

```python
# scripts/create_domain_eval_sets.py

from collections import defaultdict
import json

def create_domain_eval_sets():
    test_pairs = json.load(open("data/final_v3/test.jsonl"))
    
    by_domain = defaultdict(list)
    for pair in test_pairs:
        domain = pair.get("domain", "unknown")
        by_domain[domain].append(pair)
    
    # Save per-domain eval sets
    for domain, pairs in by_domain.items():
        output_file = f"data/eval/test_domain_{domain}.jsonl"
        with open(output_file, "w") as f:
            for pair in pairs:
                f.write(json.dumps(pair) + "\n")
        
        print(f"✓ {domain}: {len(pairs)} pairs")
    
    # Also create minimal test sets for quick evaluation
    # (sample 50 pairs per domain for faster feedback loops)
    for domain, pairs in by_domain.items():
        sample = pairs[:min(50, len(pairs))]
        output_file = f"data/eval/test_domain_{domain}_mini.jsonl"
        with open(output_file, "w") as f:
            for pair in sample:
                f.write(json.dumps(pair) + "\n")
```

---

### 1.4 Data Augmentation via Back-Translation

**Goal:** Expand dataset using low-quality initial model

**Implementation:**

```python
# scripts/backtranslation_augmentation.py

"""
Back-translation augmentation:
1. Use base model to translate maasai→english→maasai
2. Keep only if semantic similarity > threshold
3. Use as additional training pairs (lower confidence)

This creates synthetic pairs from monolingual data automatically.
"""

def backtranslate_augment(
    maasai_text: str,
    model_en_to_mas,
    model_mas_to_en,
    similarity_threshold: float = 0.85
) -> Optional[dict]:
    """Single back-translation iteration."""
    from sentence_transformers import util
    
    # Round 1: Maasai → English
    english_pred = model_mas_to_en(maasai_text)
    
    # Round 2: English → Maasai
    maasai_pred = model_en_to_mas(english_pred)
    
    # Check semantic similarity to original
    similarity = util.pytorch_cos_sim(
        encode(maasai_text),
        encode(maasai_pred)
    )[0][0].item()
    
    if similarity > similarity_threshold:
        return {
            "source_text": english_pred,
            "target_text": maasai_pred,
            "source_lang": "en",
            "target_lang": "mas",
            "synthetic": True,
            "confidence": similarity * 0.8,  # Discount for synthetic
            "tier": "bronze",
            "augmentation_method": "back-translation",
            "notes": f"Back-translation (similarity={similarity:.3f})"
        }
    
    return None
```

---

## PHASE 2: MODEL TRAINING & EVALUATION (2-3 weeks)

### 2.1 Hyperparameter Sweep

**Goal:** Find optimal LoRA settings

**Current:** r=16, alpha=32 (fixed)  
**Target:** Test 9 configurations

```python
# scripts/hyperparameter_sweep.py

CONFIGS = [
    {"r": 8, "alpha": 16, "dropout": 0.05},
    {"r": 16, "alpha": 32, "dropout": 0.05},  # Current
    {"r": 32, "alpha": 64, "dropout": 0.05},
    {"r": 16, "alpha": 32, "dropout": 0.01},
    {"r": 16, "alpha": 32, "dropout": 0.1},
    # ... more combinations
]

def run_sweep():
    """Run all configs, track best BLEU on validation set."""
    results = []
    
    for config in CONFIGS:
        print(f"Training with r={config['r']}, alpha={config['alpha']}")
        
        # Train
        model = train_with_config(config)
        
        # Evaluate
        bleu, chrf = evaluate(model)
        
        results.append({
            "config": config,
            "bleu": bleu,
            "chrf": chrf,
            "checkpoint": f"outputs/sweep_r{config['r']}_alpha{config['alpha']}"
        })
        
        print(f"  BLEU: {bleu:.2f}, chrF++: {chrf:.2f}")
    
    # Save results + rank
    best = max(results, key=lambda x: x["bleu"])
    print(f"\nBest: r={best['config']['r']}, alpha={best['config']['alpha']}")
    print(f"BLEU: {best['bleu']:.2f}")
    
    with open("data/eval/hyperparameter_sweep_results.json", "w") as f:
        json.dump(results, f, indent=2)
```

---

### 2.2 Comprehensive Evaluation Suite

**Goal:** Measure quality across 8+ metrics

```python
# scripts/comprehensive_evaluation.py

def comprehensive_eval(model, test_file, glossary_file):
    """Full evaluation with automated error analysis."""
    
    predictions = []
    references = []
    
    for pair in load_pairs(test_file):
        src = pair["source_text"]
        ref = pair["target_text"]
        pred = model.translate(src)
        
        predictions.append(pred)
        references.append(ref)
    
    results = {
        # Automatic metrics
        "bleu": compute_bleu(predictions, references),
        "chrf": compute_chrf(predictions, references),
        "bertscore": compute_bertscore(predictions, references),
        "rouge": compute_rouge(predictions, references),
        "meteor": compute_meteor(predictions, references),
        
        # Terminology metrics
        "glossary_recall": measure_glossary_recall(predictions, references, glossary),
        "glossary_precision": measure_glossary_precision(predictions, references, glossary),
        
        # Length metrics
        "length_ratio": avg_length_ratio(predictions, references),
        
        # Error analysis
        "errors": categorize_errors(predictions, references),
        
        # Per-domain breakdown
        "by_domain": eval_by_domain(predictions, references),
        
        # Confidence calibration
        "calibration": measure_calibration(predictions, references),
    }
    
    return results
```

**Error categorization:**
```python
def categorize_errors(predictions, references):
    """Automatic error analysis."""
    errors = {
        "hallucination": [],      # Content not in source
        "omission": [],           # Missing content from source
        "mistranslation": [],     # Wrong sense
        "glossary_violation": [], # Protected term not preserved
        "orthography": [],        # Spelling issues
        "grammar": [],            # Grammatical errors
        "style": [],              # Awkward phrasing
    }
    
    for pred, ref in zip(predictions, references):
        # Use multiple heuristics to categorize
        if measure_n_gram_overlap(pred, ref) < 0.1:
            errors["hallucination"].append((pred, ref))
        elif len(pred) << len(ref):
            errors["omission"].append((pred, ref))
        # ... more categorizations
    
    return {k: len(v) for k, v in errors.items()}
```

---

### 2.3 Domain-Specific Variants

**Goal:** Train separate models for high-value domains

**Target Domains:**
- Religious & Spiritual (main)
- Philosophy & Governance
- Ceremony & Culture
- Health & Environment

**Implementation:**

```bash
# Create curriculum: start with religious (high-quality), then add others

# Variant 1: Religious Only (domain-focused)
python scripts/train_qlora.py \
  --train_file data/eval/train_domain_religious.jsonl

# Variant 2: Multi-domain with curriculum
python scripts/train_qlora.py \
  --train_file data/final_v3/train.jsonl \
  --curriculum_by_domain true
```

---

### 2.4 GGUF Quantization & Export

**Goal:** Create quantized models for deployment

```python
# scripts/export_multiple_quantizations.py

QUANTIZATIONS = ["Q4_K_M", "Q5_K_M", "Q6_K", "fp32"]

def export_quantizations():
    """Export trained model to multiple GGUF formats."""
    
    model_path = "outputs/maasai-en-mt-qlora"
    output_dir = "outputs/gguf"
    
    for quant in QUANTIZATIONS:
        print(f"Exporting {quant}...")
        
        result = subprocess.run([
            "python", "-m", "llama_cpp.server",
            "--model", model_path,
            "--quantization", quant,
            "--output", f"{output_dir}/model_{quant}.gguf"
        ])
        
        # Verify size/performance
        size_mb = os.path.getsize(f"{output_dir}/model_{quant}.gguf") / (1024**2)
        print(f"  Size: {size_mb:.1f}MB")
```

---

## PHASE 3: INFERENCE & DEPLOYMENT (1-2 weeks)

### 3.1 Advanced Prompt Engineering

**Goal:** Improve translation quality via smarter prompts

```python
# scripts/advanced_prompting.py

class AdvancedPromptGenerator:
    def __init__(self, glossary_file):
        self.glossary = load_glossary(glossary_file)
    
    def generate_prompt_zero_shot(self, text: str, direction: str) -> str:
        """Basic prompt without examples."""
        if direction == "en_to_mas":
            return f"""Translate the following English text to Maasai (Maa language).
Preserve cultural terms using the glossary provided.
Output ONLY the translation without explanation.

English: {text}
Maasai:"""
        else:
            return f"""Translate the following Maasai text to English.
Preserve the original meaning and cultural context.
Output ONLY the translation without explanation.

Maasai: {text}
English:"""
    
    def generate_prompt_few_shot(self, text: str, direction: str) -> str:
        """Few-shot with 2-3 high-confidence examples."""
        examples = self._get_few_shot_examples(direction, n=3)
        
        prompt = "Translate the following text using these examples:\n\n"
        
        for ex_src, ex_tgt in examples:
            prompt += f"- {ex_src} → {ex_tgt}\n"
        
        prompt += f"\n{text} →"
        return prompt
    
    def generate_prompt_with_glossary(self, text: str, direction: str) -> str:
        """Prompt with glossary terms highlighted."""
        # Extract terms from text
        terms_in_text = self._extract_glossary_terms(text, direction)
        
        prompt = "Translate the following text:\n"
        
        if terms_in_text:
            prompt += "\nGlossary hints:\n"
            for term_src, term_tgt in terms_in_text:
                prompt += f"- {term_src} = {term_tgt}\n"
        
        prompt += f"\n{text}\n\nTranslation:"
        return prompt
    
    def generate_prompt_chain_of_thought(self, text: str, direction: str) -> str:
        """Let model think step-by-step."""
        return f"""Translate the English text to Maasai following these steps:
1. Identify key concepts and terms
2. Check glossary for cultural terms
3. Ensure grammatical agreement
4. Output natural-sounding translation

Text: {text}

Step 1 (Concepts):
Step 2 (Glossary):
Step 3 (Grammar):
Step 4 (Translation):"""
```

---

### 3.2 Space Optimization

**Goal:** Integrate quantized models + advanced prompting into Space

```python
# Updated space/app.py

class MaasaiSpaceApp:
    def __init__(self):
        # Load multiple models
        self.model_full = load_model("outputs/gguf/model_fp32.gguf")
        self.model_q4 = load_model("outputs/gguf/model_q4_k_m.gguf")  # Default
        self.glossary = load_glossary()
        self.prompt_gen = AdvancedPromptGenerator()
    
    def translate(self, text, direction, model_size="q4", prompt_style="glossary"):
        """Advanced inference with options."""
        
        # Select model
        model = self.model_full if model_size == "full" else self.model_q4
        
        # Generate prompt
        if prompt_style == "zero_shot":
            prompt = self.prompt_gen.generate_prompt_zero_shot(text, direction)
        elif prompt_style == "few_shot":
            prompt = self.prompt_gen.generate_prompt_few_shot(text, direction)
        else:  # glossary
            prompt = self.prompt_gen.generate_prompt_with_glossary(text, direction)
        
        # Inference
        output = model.generate(prompt, max_tokens=256, temperature=0.3)
        
        # Post-process with Engram correction
        output = self.glossary.apply_corrections(output, direction)
        
        return output
```

**Space UI improvements:**
- [ ] Model size selector (Q4/Q5/FP32)
- [ ] Prompt style selector (Zero-shot/Few-shot/Glossary/CoT)
- [ ] Temperature slider (0.1-1.0)
- [ ] Glossary reference panel
- [ ] Per-token confidence display
- [ ] Error rate metrics display
- [ ] Inference latency tracking

---

### 3.3 Inference Latency Monitoring

**Goal:** Track performance in production

```python
# scripts/inference_monitoring.py

import time
from pathlib import Path

class InferenceMonitor:
    def __init__(self, log_file="data/eval/inference_metrics.jsonl"):
        self.log_file = log_file
    
    def log_inference(self, text, output, model, latency_ms, tokens):
        """Log inference metrics."""
        record = {
            "timestamp": datetime.now().isoformat(),
            "input_length": len(text),
            "output_length": len(output),
            "model": model,
            "latency_ms": latency_ms,
            "tokens_per_second": tokens / (latency_ms / 1000),
        }
        
        with open(self.log_file, "a") as f:
            f.write(json.dumps(record) + "\n")
    
    def generate_report(self):
        """Analyze monitored metrics."""
        records = []
        with open(self.log_file) as f:
            records = [json.loads(line) for line in f]
        
        return {
            "avg_latency_ms": sum(r["latency_ms"] for r in records) / len(records),
            "avg_throughput": sum(r["tokens_per_second"] for r in records) / len(records),
            "p95_latency": np.percentile([r["latency_ms"] for r in records], 95),
            "p99_latency": np.percentile([r["latency_ms"] for r in records], 99),
        }
```

---

## PHASE 4: HUMAN EVALUATION PROTOCOL (1-2 weeks)

### 4.1 Annotation Framework

```
data/eval/
├── human_evaluation_guideline.md
├── annotation_template.json
├── evaluators/
│   ├── evaluator_001_responses.jsonl
│   ├── evaluator_002_responses.jsonl
│   └── inter_annotator_agreement.json
└── analysis/
    ├── confusion_matrix.json
    ├── per_category_scores.json
    └── flaws_by_domain.json
```

**annotation_template.json:**
```json
{
  "pair_id": "test_001",
  "source_text": "...",
  "reference_text": "....",
  "model_output": "...",
  "evaluator_id": "eval_001",
  "timestamp": "2026-03-26T14:30:00Z",
  "scores": {
    "fluency": 1-5,
    "adequacy": 1-5,
    "terminology_preserv ation": 1-5,
    "cultural_sensitivity": 1-5
  },
  "error_categories": ["hallucination", "omission", ...],
  "notes": "Free-form comments"
}
```

### 4.2 Inter-Annotator Agreement

```python
# scripts/compute_iaa.py

def compute_inter_annotator_agreement(eval_dir):
    """Compute Krippendorff's alpha."""
    
    from krippendorff import krippendorff_alpha
    
    evaluators = {}
    for eval_file in Path(eval_dir).glob("evaluator_*"):
        eval_id = eval_file.stem
        evaluators[eval_id] = load_evaluations(eval_file)
    
    # Compute IAA per score dimension
    dimensions = ["fluency", "adequacy", "terminology", "sensitivity"]
    
    results = {}
    for dim in dimensions:
        scores = [
            [eval[pair_id].get(dim, 0) 
             for eval in evaluators.values()]
            for pair_id in evaluators[list(evaluators.keys())[0]]
        ]
        
        alpha = krippendorff_alpha(scores)
        results[dim] = alpha
        
        consensus = "substantial" if alpha > 0.61 else "moderate" if alpha > 0.41 else "fair"
        print(f"{dim}: {alpha:.3f} ({consensus})")
    
    return results
```

---

## PHASE 5: MONITORING & PRODUCTION (Ongoing)

### 5.1 Performance Dashboard

```python
# scripts/create_performance_dashboard.py

def create_dashboard():
    """Generate HTML dashboard with key metrics."""
    
    metrics = {
        "dataset": load_dataset_stats(),
        "model_training": load_training_metrics(),
        "inference": load_inference_metrics(),
        "human_eval": load_human_eval_results(),
    }
    
    html = generate_html_dashboard(metrics)
    
    with open("data/eval/dashboard.html", "w") as f:
        f.write(html)
```

---

## IMPLEMENTATION CHECKLIST

### Week 1-2: Data Excellence
- [ ] Run advanced_data_validation.py (identify all issues)
- [ ] Fix identified data quality issues
- [ ] Add _metadata.json, _lineage.json, _stats.json
- [ ] Create domain-stratified evaluation sets
- [ ] Run backtranslation augmentation (generate synthetic pairs)
- [ ] Update dataset_README_v3.md with new statistics

### Week 2-3: Model Training & Evaluation
- [ ] Run hyperparameter sweep (9 configurations)
- [ ] Train best-performing variant
- [ ] Run comprehensive_evaluation.py (track all metrics)
- [ ] Analyze per-domain performance
- [ ] Generate error analysis report
- [ ] Export GGUF quantizations (Q4, Q5, Q6, fp32)
- [ ] Save all checkpoints + metrics to data/eval/

### Week 3-4: Inference & Deployment
- [ ] Implement AdvancedPromptGenerator
- [ ] Integrate into Space with model/prompt selectors
- [ ] Add InferenceMonitor to Space
- [ ] Create inference_metrics.jsonl logs
- [ ] Generate latency/throughput reports
- [ ] Push updated Space to HF

### Week 4-5: Human Evaluation
- [ ] Create annotation_guideline.md (score definitions)
- [ ] Recruit 2-3 evaluators (Maasai speakers if possible)
- [ ] Run annotation on 200-300 test pairs
- [ ] Compute inter-annotator agreement (Krippendorff's alpha)
- [ ] Generate high-confidence/low-confidence analysis
- [ ] Identify systematic model failures

### Week 5-6: Monitoring & Documentation
- [ ] Set up performance dashboard
- [ ] Create monitoring alerts
- [ ] Document entire pipeline
- [ ] Create model_card_v3.md (with all new metrics)
- [ ] Create dataset_card_v3.md (with provenance tracking)
- [ ] Publish final report to GitHub

---

## SUCCESS METRICS (v3.0 Enterprise Edition)

| Metric | Current | Target | By Week |
|--------|---------|--------|---------|
| BLEU | TBD | 35-45 | 3 |
| chrF++ | TBD | 60-70 | 3 |
| Glossary Recall | TBD | >95% | 3 |
| Evaluation Metrics | 3 | 8+ | 3 |
| Data Quality Checks | Basic | Multi-dimensional | 2 |
| Model Variants | 1 | 5+ | 3 |
| Quantization Options | 0 | 4 (Q4/Q5/Q6/FP32) | 4 |
| Human Eval IAA | None | >0.60 (substantial) | 5 |
| Inference Latency | Unknown | <300ms (CPU) | 4 |
| Documentation | Partial | Comprehensive | 6 |
| Error Analysis | None | Categorized breakdown | 3 |
| Per-domain Tracking | No | Full breakdown | 2 |

---

## Parallel Work Streams

```
Week 1-2:
├─ Data Validation (Parallel)
├─ Hyperparameter Sweep (Parallel, can start immediately)
└─ Human Eval Setup (Parallel)

Week 3-4:
├─ GGUF Export & quantization
├─ Space Optimization
└─ Inference Monitoring

Week 5-6:
├─ Error Analysis & Reporting
├─ Final Documentation
└─ Deployment & Monitoring Setup
```

---

## File Structure (Final)

```
maasai-lang/
├── data/
│   ├── raw/
│   ├── processed/
│   ├── final_v3/
│   │   ├── train.jsonl
│   │   ├── valid.jsonl
│   │   ├── test.jsonl
│   │   ├── _metadata.json          ✨ NEW
│   │   ├── _lineage.json           ✨ NEW
│   │   └── _stats.json             ✨ NEW
│   └── eval/
│       ├── test_domain_*.jsonl     ✨ NEW
│       ├── human_evaluation_*      ✨ NEW
│       ├── hyperparameter_sweep_results.json ✨ NEW
│       ├── comprehensive_eval_results.json ✨ NEW
│       ├── inference_metrics.jsonl ✨ NEW
│       ├── dashboard.html          ✨ NEW
│       └── error_analysis.json     ✨ NEW
├── scripts/
│   ├── advanced_data_validation.py     ✨ NEW
│   ├── create_domain_eval_sets.py      ✨ NEW
│   ├── backtranslation_augmentation.py ✨ NEW
│   ├── hyperparameter_sweep.py         ✨ NEW
│   ├── comprehensive_evaluation.py     ✨ NEW
│   ├── export_multiple_quantizations.py ✨ NEW
│   ├── advanced_prompting.py           ✨ NEW
│   ├── inference_monitoring.py         ✨ NEW
│   ├── compute_iaa.py                  ✨ NEW
│   └── create_performance_dashboard.py ✨ NEW
├── outputs/
│   ├── maasai-en-mt-qlora/           (final trained model)
│   ├── sweep_results/                (hyperparameter sweep)
│   └── gguf/
│       ├── model_q4_k_m.gguf         ✨ NEW
│       ├── model_q5_k_m.gguf         ✨ NEW
│       ├── model_q6_k.gguf           ✨ NEW
│       └── model_fp32.gguf           ✨ NEW
└── docs/
    ├── DATASET_README_V3.md          ✨ NEW (updated)
    ├── MODEL_CARD_V3.md              ✨ NEW (updated)
    ├── EVALUATION_REPORT_V3.md       ✨ NEW
    ├── ERROR_ANALYSIS_BREAKDOWN.md   ✨ NEW
    ├── HUMAN_EVAL_PROTOCOL.md        ✨ NEW
    └── MONITORING_SETUP.md           ✨ NEW
```

---

## Next Immediate Steps

1. **Week 1 (Now):**
   - [ ] Implement `advanced_data_validation.py`
   - [ ] Run validation on final_v3/ dataset
   - [ ] Fix any issues found
   - [ ] Prepare for GPU training (Colab setup)

2. **Week 2 (Post-Training):**
   - [ ] Execute hyperparameter sweep
   - [ ] Run comprehensive evaluation
   - [ ] Export GGUF models
   - [ ] Create domain-stratified eval sets

3. **Week 3-4 (Integration):**
   - [ ] Update Space with advanced prompting
   - [ ] Add inference monitoring
   - [ ] Integrate human evaluation
   - [ ] Generate dashboards

---

**This enterprise plan transforms the project from "good showcase" to "production-grade" research infrastructure.**

**Effort estimate:** 80-120 hours (parallel work)  
**ROI:** 10x improvement in evaluation rigor, documentation, and production readiness
