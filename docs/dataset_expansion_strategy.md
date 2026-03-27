# Dataset Expansion Strategy

## Objective

Grow the Maasai project with a dataset that is useful for both:
- core English <-> Maasai translation training
- broader Maasai cultural and instruction tuning

These goals should not share the same training view by default.

## Data Layers

### Gold

Use only rows that are:
- human translated
- explicitly reviewed by native speakers, experts, or community reviewers
- aligned English <-> Maasai pairs

Gold is the highest-trust subset.
Gold should be small, stable, and protected from noisy merges.

### Silver

Use rows that are:
- valid English <-> Maasai translation pairs
- manually authored but not yet reviewed
- glossary-driven or template-generated
- backtranslated or synthetic with good metadata

Silver is the main expansion layer.
It is allowed into MT training, but should remain traceable and easy to filter.

### Bronze

Use rows that are:
- monolingual cultural instruction data
- long-form stories, riddles, or Q&A
- loosely aligned or exploratory material
- unsupported by review metadata

Bronze should not be mixed into the core MT dataset by default.
It is for cultural grounding, instruction tuning, and future specialized models.

## Canonical Record Fields

Every row should eventually carry:
- `id`
- `task`
- `source_lang`
- `target_lang`
- `source_text`
- `target_text`
- `domain`
- `source_name`
- `source_type`
- `synthetic`
- `review_status`
- `confidence`
- `tier`
- `dialect_tag`
- `split_lock`
- `notes`

## Project Rules

1. Only `en <-> mas` rows go into the MT training view.
2. `en -> en` cultural rows stay in bronze unless repurposed for a different task.
3. Every generated row must declare provenance.
4. Review upgrades rows from silver to gold; raw generation never does.
5. Evaluation slices should be held out before large-scale synthetic expansion.

## Expansion Focus

The best near-term growth is not longer stories.
It is short, reusable, domain-balanced sentence families in:
- greetings
- kinship
- livestock
- land and water
- weather and seasons
- school
- health
- ceremonies
- governance
- markets and daily life
- numbers, dates, and time

## Recommended Workflow

1. Generate or ingest candidate rows into raw staging files.
2. Attach provenance and review metadata.
3. Run `scripts/curate_dataset_layers.py`.
4. Train MT only from `mt_train.jsonl`.
5. Reserve `mt_eval_candidates.jsonl` for review and final held-out evaluation.
6. Publish layered outputs to the gated dataset repo.

## Current Direction

This project should prioritize:
- a clean MT corpus
- a separate culture/instruction corpus
- deterministic curation
- reviewability over raw row count
