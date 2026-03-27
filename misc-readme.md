
### README.md

````md
# Maasai Language Showcase
## English ↔ Maasai Translation + Maasai Speech Transcription on Hugging Face Spaces

This project builds a modern Hugging Face showcase for the **Maasai language** using:
- a **fine-tuned English ↔ Maasai translation model**
- a **Maasai speech transcription pipeline**
- a public **Hugging Face Space** for interactive demo and language preservation

The goal is not just translation. The goal is to create a serious Maasai language technology showcase that demonstrates:
- English to Maasai translation
- Maasai to English translation
- Maasai speech to text
- preservation-oriented language tooling
- a foundation for future glossary-aware and community-reviewed language systems

---

## Project Vision

This repository is designed to help build a production-grade public demo that feels modern and research-driven.

The Space should demonstrate:
1. **English → Maasai translation**
2. **Maasai → English translation**
3. **Audio upload for Maasai speech transcription**
4. optional chaining:
   - Maasai speech → transcript
   - transcript → English translation

This creates a stronger public story than a plain text translator because it showcases both:
- **language preservation**
- **language access**

---

## Why this architecture

### Translation
Microsoft's Paza release is strongest for **speech recognition in Maasai**, not direct text machine translation.  
For text translation, we will build our own model using a strong modern multilingual-capable base model.

Recommended first base:
- `google/gemma-3-4b-it`

Reason:
- modern and competitive
- practical for QLoRA fine-tuning
- realistic for open deployment and iteration
- strong enough for a serious first public model

### Speech
For Maasai ASR:
- `microsoft/paza-whisper-large-v3-turbo`

This gives the project an immediate speech component without needing to train ASR from scratch.

---

## High-Level System Design

### 1. Translation model
A fine-tuned bilingual model:
- English → Maasai
- Maasai → English

Training style:
- instruction tuning
- prompt-based translation tasks
- glossary-aware data balancing
- evaluation on both directions

### 2. Speech component
Use Microsoft Paza Maasai ASR for:
- uploaded speech
- oral-history style recordings
- classroom or phrase recordings
- live showcase examples

### 3. Hugging Face Space
A Gradio-based Space with tabs:
- `Translate`
- `Speech to Text`
- `Speech to Translation`
- `About Maasai Language Technology`

---

## Recommended Repository Layout

```text
maasai-language-showcase/
├── README.md
├── todo.md
├── mcp.json
├── requirements.txt
├── .env.example
├── data/
│   ├── raw/
│   ├── interim/
│   ├── processed/
│   ├── glossary/
│   └── eval/
├── notebooks/
│   ├── 01_data_exploration.ipynb
│   ├── 02_translation_eval.ipynb
│   └── 03_error_analysis.ipynb
├── scripts/
│   ├── prepare_data.py
│   ├── build_glossary.py
│   ├── train_qlora.py
│   ├── merge_adapter.py
│   ├── evaluate_mt.py
│   ├── infer_translate.py
│   └── infer_asr.py
├── src/
│   ├── config.py
│   ├── prompts.py
│   ├── preprocessing.py
│   ├── postprocessing.py
│   ├── glossary.py
│   ├── metrics.py
│   └── utils.py
├── space/
│   ├── app.py
│   ├── style.css
│   └── examples/
│       └── sample_prompts.json
├── training/
│   ├── ds_config.json
│   ├── lora_config.yaml
│   └── run_train.sh
└── docs/
    ├── dataset_card.md
    ├── model_card.md
    ├── evaluation_plan.md
    └── deployment.md
````

---

## Data Strategy

### Primary data source

Use public Maasai parallel data where available.

Expected sources:

* AfriMMT-East Africa Maasai slice
* additional Maasai-aligned parallel corpora if found
* curated glossary pairs
* manually created domain mini-sets

### Speech source

Use Microsoft Paza-compatible Maasai speech data and public benchmark references for Maasai ASR showcase integration.

### Custom data you should create

Create high-value translation pairs in these domains:

* greetings
* school/classroom expressions
* health terms
* livestock vocabulary
* land/environment
* daily conversation
* cultural phrases
* numbers, time, dates
* community/public service phrases

### Glossary

Build a dedicated Maasai glossary JSON with:

* canonical term
* English translation
* part of speech
* domain
* notes
* alternate spellings
* preserve flag

Example:

```json
{
  "term_maasai": "enkang",
  "term_english": "homestead",
  "domain": "culture",
  "preserve": true,
  "notes": "Do not flatten to generic village if context indicates Maasai cultural homestead."
}
```

---

## Training Plan

## Stage 1: Baseline

Train a QLoRA adapter on:

* English → Maasai
* Maasai → English

Prompt format:

```text
Translate the following English sentence to Maasai:
"{sentence}"
```

and

```text
Translate the following Maasai sentence to English:
"{sentence}"
```

### Stage 2: Glossary-aware oversampling

Increase sampling weight for:

* culturally important terms
* lexical preservation terms
* ambiguous translation pairs
* ecological and livestock vocabulary

### Stage 3: Synthetic expansion

Use a stronger teacher workflow to generate additional candidate examples, but filter them using:

* duplicate checks
* length-ratio checks
* glossary consistency checks
* manual validation spot checks

### Stage 4: Preference tuning

Rank candidate translations based on:

* naturalness
* terminology preservation
* orthographic consistency
* faithfulness

---

## Evaluation Plan

Evaluate with:

* BLEU
* chrF++
* COMET if feasible
* terminology accuracy
* human review by Maasai speakers

### Human review dimensions

Score outputs for:

* faithfulness
* fluency
* cultural appropriateness
* terminology correctness
* spelling consistency

### Important note

For low-resource language projects, **human review and terminology accuracy** matter more than BLEU alone.

---

## Inference Behavior

The model should:

* preserve culturally important Maasai terms where appropriate
* avoid over-normalizing unique Maasai concepts into generic English
* avoid hallucinating vocabulary
* prefer faithful translation over decorative phrasing
* keep names, places, and clan-relevant terms stable

Optional post-processing:

* punctuation normalization
* quote normalization
* glossary-aware replacement checks
* protected term preservation

---

## Hugging Face Space Requirements

### Main UI features

* text input
* translation direction selector
* output panel
* example prompts
* optional glossary notes panel
* audio upload
* ASR output
* speech-to-translation output

### Suggested tabs

1. `Translate`
2. `Speech`
3. `Examples`
4. `About`

### Suggested demo examples

* "Hello, how are you?"
* "Where are the cattle?"
* "The children are going to school."
* "Please bring water."
* "This land is important to our community."

---

## Space UX Guidance

The Space should feel like a serious language technology showcase.

### Tone

* clean
* research-grade
* preservation-oriented
* professional

### Avoid

* gimmicky design
* too many colors
* toy-style demo feel

### Good additions

* examples panel
* brief note on language preservation
* note that outputs should be reviewed by native speakers for formal public use
* transparent model limitations section

---

## Deployment Plan

### Model artifacts

You will likely maintain:

* adapter weights
* merged model checkpoint if needed
* tokenizer/config files
* evaluation outputs
* glossary assets

### Hugging Face repos

Recommended:

* `NorthernTribe-Research/maasai-en-mt`
* `NorthernTribe-Research/maasai-language-space`
* `NorthernTribe-Research/maasai-glossary`
* optional:

  * `NorthernTribe-Research/maasai-translation-corpus`

---

## Minimum Viable Milestones

### Milestone 1

* dataset collected
* cleaned train/dev/test split
* glossary created

### Milestone 2

* baseline QLoRA fine-tune complete
* first offline eval complete

### Milestone 3

* Gradio Space working with translation tab

### Milestone 4

* speech transcription tab integrated

### Milestone 5

* public model card, dataset card, and demo release

---

## Risks

### 1. Data scarcity

Maasai machine translation data may be limited.

Mitigation:

* high-quality cleaning
* domain-targeted manual additions
* glossary-aware training
* synthetic expansion with strong filtering

### 2. Orthography inconsistency

There may be spelling variation.

Mitigation:

* create normalization rules
* preserve alternates in glossary
* track spelling policy explicitly

### 3. Cultural flattening

The model may collapse important Maasai concepts into generic English approximations.

Mitigation:

* protected glossary terms
* manual eval rubric
* preference tuning around culturally important vocabulary

### 4. Public demo overclaiming

Avoid presenting the system as authoritative.

Mitigation:

* include model limitations
* note need for speaker review
* describe it as an assistive language technology showcase

---

## Recommended Immediate Next Steps

1. create repo
2. add project scaffold
3. gather parallel data
4. build glossary
5. prepare prompt-formatted dataset
6. run first QLoRA fine-tune
7. evaluate
8. build Space
9. integrate ASR
10. publish cards and demo

---

## Suggested First Deliverables

* `requirements.txt`
* `prepare_data.py`
* `train_qlora.py`
* `evaluate_mt.py`
* `space/app.py`
* `docs/model_card.md`
* `docs/dataset_card.md`

---

## Project Positioning

A good one-line positioning statement:

**A modern English ↔ Maasai translation and Maasai speech showcase built for language preservation, accessibility, and low-resource AI research.**

---

## Final Principle

Do not build this as a generic translator only.

Build it as:

* a translation model
* a speech-enabled language showcase
* a preservation-oriented AI system
* a foundation for future Maasai digital tools

````

---

### todo.md
```md
# TODO - Maasai Language Showcase

## Phase 0 - Project Setup
- [ ] Create root repository
- [ ] Add README.md
- [ ] Add todo.md
- [ ] Add mcp.json
- [ ] Add `.gitignore`
- [ ] Add `requirements.txt`
- [ ] Add `.env.example`
- [ ] Create folder structure:
  - [ ] `data/raw`
  - [ ] `data/interim`
  - [ ] `data/processed`
  - [ ] `data/glossary`
  - [ ] `data/eval`
  - [ ] `scripts`
  - [ ] `src`
  - [ ] `space`
  - [ ] `training`
  - [ ] `docs`
  - [ ] `notebooks`

---

## Phase 1 - Research and Data Collection
- [ ] Identify all usable Maasai text translation datasets
- [ ] Identify Maasai parallel corpora for English ↔ Maasai
- [ ] Identify additional Maasai lexical resources
- [ ] Identify public Maasai phrasebooks / educational materials
- [ ] Document speech resources for Maasai
- [ ] Confirm Microsoft Paza Maasai ASR integration path
- [ ] Define usage rights and licenses for each dataset
- [ ] Create `docs/dataset_inventory.md`

### Data quality checks
- [ ] Check for duplicates
- [ ] Check for noisy alignments
- [ ] Check for broken Unicode
- [ ] Check for inconsistent punctuation
- [ ] Check for sentence length anomalies
- [ ] Check for mixed-language examples
- [ ] Check for malformed rows
- [ ] Check orthography variation patterns

---

## Phase 2 - Data Preparation
- [ ] Write `scripts/prepare_data.py`
- [ ] Standardize schema for all datasets
- [ ] Merge all parallel corpora into one common format
- [ ] Normalize whitespace
- [ ] Normalize quotes and punctuation
- [ ] Remove duplicate pairs
- [ ] Remove low-quality or suspicious pairs
- [ ] Create train/dev/test split
- [ ] Save processed outputs to `data/processed`

### Training schema
- [ ] Create JSONL format for instruction tuning
- [ ] Add task field
- [ ] Add source language field
- [ ] Add target language field
- [ ] Add source text field
- [ ] Add target text field
- [ ] Add domain field
- [ ] Add quality/source metadata

---

## Phase 3 - Glossary and Terminology Layer
- [ ] Create `data/glossary/maasai_glossary.json`
- [ ] Add culturally important terms
- [ ] Add livestock vocabulary
- [ ] Add ecological vocabulary
- [ ] Add place/land/community terminology
- [ ] Add school/education phrases
- [ ] Add health vocabulary
- [ ] Add time/date/number expressions
- [ ] Add preserve flags for protected terms
- [ ] Write `scripts/build_glossary.py`

### Glossary quality
- [ ] Mark ambiguous English terms
- [ ] Track alternate Maasai spellings
- [ ] Add notes for culturally loaded concepts
- [ ] Create test sentences for glossary coverage

---

## Phase 4 - Baseline Model Training
- [ ] Select base model
- [ ] Default base: `google/gemma-3-4b-it`
- [ ] Prepare tokenizer and formatting pipeline
- [ ] Create `training/lora_config.yaml`
- [ ] Create `scripts/train_qlora.py`
- [ ] Create `training/run_train.sh`
- [ ] Run first baseline QLoRA fine-tune
- [ ] Save adapter
- [ ] Log hyperparameters
- [ ] Log training loss curves
- [ ] Track token counts and dataset version

### Baseline training targets
- [ ] English → Maasai
- [ ] Maasai → English

---

## Phase 5 - Inference and Validation
- [ ] Create `scripts/infer_translate.py`
- [ ] Run offline validation on test set
- [ ] Sample translations for manual review
- [ ] Measure BLEU
- [ ] Measure chrF++
- [ ] Add terminology accuracy metric
- [ ] Create error analysis notes
- [ ] Create `docs/evaluation_plan.md`
- [ ] Create `docs/error_analysis.md`

### Error analysis categories
- [ ] Hallucinated vocabulary
- [ ] Omitted content
- [ ] Over-literal phrasing
- [ ] Cultural term flattening
- [ ] Wrong lexical choice
- [ ] Spelling inconsistency
- [ ] Number/date mistakes
- [ ] Named-entity handling issues

---

## Phase 6 - Data Improvement Loop
- [ ] Identify weakest domains from first eval
- [ ] Create targeted correction set
- [ ] Add glossary-heavy examples
- [ ] Oversample difficult terminology
- [ ] Add synthetic pairs cautiously
- [ ] Filter synthetic outputs
- [ ] Retrain improved adapter
- [ ] Compare against baseline

---

## Phase 7 - Speech Integration
- [ ] Create `scripts/infer_asr.py`
- [ ] Integrate Microsoft Paza Maasai ASR
- [ ] Test audio upload flow
- [ ] Add sample audio files
- [ ] Add transcript post-processing
- [ ] Connect ASR transcript to translation pipeline
- [ ] Validate audio → transcript → translation flow

### Speech demo checks
- [ ] Short phrase audio
- [ ] Longer speech clip
- [ ] Noisy audio clip
- [ ] Different speakers if available
- [ ] Clear error message handling

---

## Phase 8 - Hugging Face Space
- [ ] Create `space/app.py`
- [ ] Create `space/style.css`
- [ ] Create sample examples file
- [ ] Add translation UI
- [ ] Add direction selector
- [ ] Add audio upload
- [ ] Add transcript output
- [ ] Add translated output
- [ ] Add examples panel
- [ ] Add limitations section
- [ ] Add preservation-oriented project description

### Space tabs
- [ ] Translate
- [ ] Speech
- [ ] Examples
- [ ] About

### UI polish
- [ ] Clear headings
- [ ] Professional tone
- [ ] Good placeholder examples
- [ ] Error handling
- [ ] Loading states
- [ ] Copy output button
- [ ] Clean mobile layout if possible

---

## Phase 9 - Documentation
- [ ] Write model card
- [ ] Write dataset card
- [ ] Write deployment doc
- [ ] Write evaluation summary
- [ ] Write limitations section
- [ ] Add ethical considerations
- [ ] Add intended-use section
- [ ] Add non-intended-use section

### Documentation focus
- [ ] Low-resource setting transparency
- [ ] Human review note
- [ ] Preservation framing
- [ ] Language/community respect
- [ ] Clear benchmark reporting

---

## Phase 10 - Release
- [ ] Create Hugging Face dataset repo
- [ ] Create Hugging Face model repo
- [ ] Create Hugging Face Space repo
- [ ] Push first dataset version
- [ ] Push adapter/model
- [ ] Deploy Space
- [ ] Test public inference
- [ ] Verify README rendering
- [ ] Verify examples
- [ ] Verify model card and dataset card visibility

---

## Stretch Goals
- [ ] Add glossary highlighting in UI
- [ ] Add confidence or uncertainty note
- [ ] Add back-translation check
- [ ] Add domain selector
- [ ] Add prompt presets
- [ ] Add educational mode for learners
- [ ] Add downloadable example sentences
- [ ] Add simple Maasai phrasebook section
- [ ] Add evaluation dashboard
- [ ] Add pronunciation assets later
- [ ] Add text-to-speech later if viable

---

## Quality Bar Before Public Release
- [ ] No obviously broken outputs in common phrases
- [ ] Core glossary terms handled consistently
- [ ] Speech transcription tab works
- [ ] Translation directions both tested
- [ ] Clear limitations visible
- [ ] Documentation complete
- [ ] Demo visually polished
- [ ] Public examples safe and accurate

---

## Non-Negotiables
- [ ] Do not overclaim model quality
- [ ] Do not release without limitations
- [ ] Do not ignore terminology preservation
- [ ] Do not rely on automatic metrics only
- [ ] Do not ship culturally sensitive terms without review
- [ ] Do not use noisy synthetic data unchecked
````

---

### mcp.json

```json
{
  "project": {
    "name": "maasai-language-showcase",
    "version": "0.1.0",
    "description": "English ↔ Maasai translation and Maasai speech transcription showcase for Hugging Face Spaces.",
    "owner": "NorthernTribe-Research",
    "license": "TBD",
    "status": "planning"
  },
  "goals": {
    "primary": [
      "Build a strong English to Maasai translation model",
      "Support Maasai to English translation",
      "Integrate Maasai speech transcription using Microsoft Paza ASR",
      "Deploy a polished public Hugging Face Space"
    ],
    "secondary": [
      "Create a reusable Maasai glossary layer",
      "Build a preservation-oriented language technology demo",
      "Establish a future foundation for Maasai language AI"
    ]
  },
  "models": {
    "translation_base": {
      "provider": "google",
      "model_id": "google/gemma-3-4b-it",
      "purpose": "Instruction-tuned base for English ↔ Maasai translation fine-tuning",
      "train_strategy": "QLoRA",
      "target_artifact": "adapter-first"
    },
    "speech_asr": {
      "provider": "microsoft",
      "model_id": "microsoft/paza-whisper-large-v3-turbo",
      "purpose": "Maasai speech transcription for Hugging Face Space integration",
      "train_strategy": "inference-only-initially"
    }
  },
  "datasets": {
    "parallel_text": [
      {
        "name": "AfriMMT-East-Africa-Maasai",
        "role": "primary_parallel_seed",
        "status": "to_collect",
        "notes": "Use Maasai-aligned English translation pairs where licensing permits."
      }
    ],
    "speech": [
      {
        "name": "Microsoft-Paza-Maasai-ASR-related-assets",
        "role": "speech_showcase",
        "status": "to_integrate",
        "notes": "Used for Maasai transcription demo, not the main MT fine-tune source."
      }
    ],
    "custom": [
      {
        "name": "maasai_glossary",
        "role": "terminology_control",
        "status": "to_build"
      },
      {
        "name": "manual_domain_pairs",
        "role": "quality_boost",
        "status": "to_build"
      }
    ]
  },
  "data_schema": {
    "parallel_record": {
      "id": "string",
      "task": "translate",
      "source_lang": "en|mas",
      "target_lang": "mas|en",
      "source_text": "string",
      "target_text": "string",
      "domain": "general|education|health|culture|livestock|environment|daily_life",
      "source_name": "string",
      "quality_score": "float",
      "notes": "string"
    },
    "glossary_record": {
      "term_maasai": "string",
      "term_english": "string",
      "domain": "string",
      "part_of_speech": "string",
      "alternate_spellings": [
        "string"
      ],
      "preserve": true,
      "notes": "string"
    }
  },
  "training": {
    "formatting": {
      "instruction_template_en_to_mas": "Translate the following English sentence to Maasai:\\n\"{source_text}\"",
      "instruction_template_mas_to_en": "Translate the following Maasai sentence to English:\\n\"{source_text}\""
    },
    "baseline": {
      "epochs": 3,
      "learning_rate": 0.0002,
      "warmup_ratio": 0.03,
      "weight_decay": 0.01,
      "max_seq_length": 512,
      "per_device_train_batch_size": 4,
      "gradient_accumulation_steps": 8,
      "eval_steps": 200,
      "save_steps": 200,
      "logging_steps": 20,
      "bf16": true,
      "gradient_checkpointing": true
    },
    "lora": {
      "r": 16,
      "alpha": 32,
      "dropout": 0.05,
      "target_modules": [
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj"
      ]
    },
    "improvement_stages": [
      "baseline_supervised_finetune",
      "glossary_oversampling",
      "synthetic_expansion_with_filtering",
      "preference_or_ranked_tuning"
    ]
  },
  "evaluation": {
    "automatic_metrics": [
      "bleu",
      "chrf++"
    ],
    "optional_metrics": [
      "comet"
    ],
    "custom_metrics": [
      "terminology_accuracy",
      "protected_term_preservation",
      "length_ratio_stability"
    ],
    "human_review": {
      "dimensions": [
        "faithfulness",
        "fluency",
        "cultural_appropriateness",
        "terminology_correctness",
        "orthographic_consistency"
      ],
      "required_before_public_claims": true
    }
  },
  "space": {
    "framework": "gradio",
    "tabs": [
      "Translate",
      "Speech",
      "Examples",
      "About"
    ],
    "features": [
      "English to Maasai translation",
      "Maasai to English translation",
      "Audio upload for Maasai transcription",
      "Speech transcript to translation flow",
      "Example prompts",
      "Model limitations section"
    ],
    "style": {
      "tone": "professional",
      "theme": "clean_research_showcase",
      "avoid": [
        "toy_demo_feel",
        "overly_bright_colors",
        "overclaiming"
      ]
    }
  },
  "docs": {
    "required": [
      "README.md",
      "todo.md",
      "docs/model_card.md",
      "docs/dataset_card.md",
      "docs/evaluation_plan.md",
      "docs/deployment.md"
    ],
    "must_include": [
      "intended_use",
      "limitations",
      "language_preservation_positioning",
      "human_review_note",
      "data_sources",
      "benchmark_results"
    ]
  },
  "release": {
    "huggingface": {
      "dataset_repo": "NorthernTribe-Research/maasai-translation-corpus",
      "model_repo": "NorthernTribe-Research/maasai-en-mt",
      "space_repo": "NorthernTribe-Research/maasai-language-space"
    },
    "minimum_quality_bar": [
      "working translation in both directions",
      "speech tab functional",
      "glossary terms reasonably preserved",
      "limitations documented",
      "public examples verified"
    ]
  },
  "next_files_to_generate": [
    "requirements.txt",
    "scripts/prepare_data.py",
    "scripts/train_qlora.py",
    "scripts/evaluate_mt.py",
    "scripts/infer_translate.py",
    "scripts/infer_asr.py",
    "space/app.py",
    "training/lora_config.yaml",
    "docs/model_card.md",
    "docs/dataset_card.md"
  ]
}
```

