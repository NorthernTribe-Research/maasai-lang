# Continual Learning Strategy

## Goal

The goal is not to make the system "scrape everything and learn on its own."
The goal is to make the project learn Maa in a controlled loop:

- start from a Gemma 4 base model
- train on trusted English <-> Maa pairs
- expand with Maa composition tasks
- use Bible context to teach meaning, not only memorized verse translation
- keep every new data source traceable and rights-aware
- only promote improvements that pass evaluation

## Base Model

`google/gemma-4-E4B-it` is the active base-model direction for this repository.

Why it fits this project:

- Gemma 4 is current and openly available enough for project integration
- `E4B` is the smallest practical Gemma 4 instruction variant for lightweight QLoRA-style adaptation
- it aligns with the repo's existing Kaggle, Hugging Face, and CPU fallback constraints better than larger Gemma 4 variants

Primary sources used for this decision:

- Gemma 4 announcement: `https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/`
- Gemma tuning docs: `https://ai.google.dev/gemma/docs/tune`
- Gemma 4 model card: `https://ai.google.dev/gemma/docs/core/model_card_4`

## What "Self-Train" Means Here

In this project, "self-train" means a continual training loop with guardrails:

1. pull the latest governed dataset from Hugging Face
2. resume from the latest model checkpoint
3. augment with curated Maa generation tasks
4. train for a bounded session
5. evaluate and checkpoint
6. publish only if the run remains healthy and traceable

That is different from uncontrolled self-learning from raw web text.

## Bible-Centered Semantic Curriculum

The Bible matters in this project because it gives a large, coherent body of English <-> Maa meaning pairs.
It should not remain a flat translation table.

The repo now uses three Bible-oriented learning shapes:

- verse translation: direct English <-> Maa pairs
- passage generation: short Maa devotional passages built from related verse windows
- cross-reference generation: a primary verse is translated with semantically related verses supplied as context

The cross-reference path is important because it teaches the model to preserve meaning with supporting context.
That is closer to fluent Maa composition than memorizing isolated sentence pairs.

## DeepSeek / Open-R1 Methods We Can Use

The open-source pieces worth borrowing are methodology, not brand imitation.

- DeepSeek-V3 reinforces the value of strong data curation, efficient training, and staged capability building rather than one monolithic pass.
- DeepSeek-R1 and Open-R1 reinforce a staged recipe: supervised grounding first, then higher-order reasoning or self-improvement loops later.
- For this repo, the safe translation analogue is:
  - gold/silver supervised MT first
  - Maa composition and cross-reference tasks second
  - backtranslation / self-distillation third
  - checkpoint promotion only after evaluation

Primary sources:

- DeepSeek-V3 repo: `https://github.com/deepseek-ai/DeepSeek-V3`
- DeepSeek-R1 paper: `https://arxiv.org/abs/2501.12948`
- Open-R1 repo: `https://github.com/huggingface/open-r1`

## Engram Layer

The repo already contains an Engram-inspired glossary layer in `scripts/engram_glossary_layer.py`.
It is useful for low-resource Maa because it separates:

- fast lexical retrieval for known terms
- model reasoning for syntax, agreement, and context

That means the model does not need to relearn every glossary item from scratch during generation.

## Claude Code Open-Source Lessons

The recently public `anthropics/claude-code` repository is useful here mainly as an operations pattern:

- agentic workflows are explicit
- commands and tools are documented
- health, automation, and iteration loops are first-class

That is relevant to this repo's engineering process, not because Claude Code contains a Maa-language training method.

Relevant repos:

- `https://github.com/anthropics/claude-code`
- `https://github.com/anthropics/claude-agent-sdk-python`

## Open-Source Data Direction

High-value Maa data lanes currently look like this:

- approved / easiest next:
  - public-domain Hollis and Hinde material
  - ASJP Maasai wordlist
  - University of Iowa Maasai speech samples
- review before broad ingest:
  - BibleNLP Maa material because rights metadata is mixed per file
  - Global Storybooks and African Storybook because story-level licenses vary
- permission or gated access:
  - ANV Maasai speech
  - University of Oregon Maa language project

See also:

- `docs/open_source_maasai_inventory.md`
- `data/registry/maasai_vetted_web_sources.json`

## Continuous Learning Loop

The intended loop is:

1. refresh vetted source registry and newly approved data
2. curate gold / silver / bronze layers
3. rebuild the instruction mixture with translation, generation, and Bible cross-reference tasks
4. run bounded Gemma 4 QLoRA training
5. evaluate held-out MT and Maa generation quality
6. publish only improving checkpoints
7. expose the best checkpoint through the Space

## Guardrails

- do not auto-ingest copyrighted or unclear-rights sources
- do not treat Bible fluency as general Maa fluency
- do not publish synthetic or self-distilled data without provenance
- do not promote checkpoints that regress on held-out evaluation
- do not claim autonomous Maa mastery without native-speaker review
