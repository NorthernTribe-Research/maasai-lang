# Maasai Language Platform

[![Daily Training](https://github.com/NorthernTribe-Research/maasai-lang/actions/workflows/daily-train.yml/badge.svg)](https://github.com/NorthernTribe-Research/maasai-lang/actions/workflows/daily-train.yml)
[![Python](https://img.shields.io/badge/python-3.11+-0f4c81.svg)](#environment)
[![Hugging Face Space](https://img.shields.io/badge/Hugging%20Face-Space-f9d95c.svg)](https://huggingface.co/spaces/NorthernTribe-Research/maasai-language-showcase)

Production-oriented repository for English <-> Maasai translation, Maasai speech transcription, culturally grounded language tooling, and the MLOps workflows required to train, publish, monitor, and operate those assets across GitHub, Hugging Face, Kaggle, and self-hosted GPU infrastructure.

> Status
> Active development. This repository is proprietary and all rights reserved. See `LICENSE` for the governing terms.

## Executive Summary

This project is an end-to-end low-resource language AI platform focused on Maasai language preservation, accessibility, and operational delivery.

It combines:

- A user-facing Gradio application for translation, speech transcription, glossary-backed exploration, and curated cultural content.
- A QLoRA fine-tuning stack for English <-> Maasai machine translation and optional Maa generation-oriented tasks.
- A Hub-centric publication model where Hugging Face stores the canonical dataset, model artifacts, Space bundle, and resumable training checkpoints.
- A control-plane architecture where GitHub Actions orchestrates scheduled training while Kaggle or self-hosted runners provide GPU execution.

## Platform Scope

### Core Capabilities

- Bidirectional English -> Maasai and Maasai -> English translation.
- Maasai speech transcription using a dedicated ASR model.
- Transcribe-then-translate workflows inside the same application surface.
- Glossary-aware and culturally grounded user experiences for language preservation workflows.
- Repeatable publication of model, dataset, and Space assets to Hugging Face.
- Resumable daily training that restores checkpoints from Hugging Face and pushes updated checkpoints back during execution.

### Operating Model

This repository follows a clear control-plane and data-plane split:

- GitHub is the automation and source-control control plane.
- Hugging Face is the durable system of record for dataset, model, Space, and optional run artifacts.
- Kaggle and self-hosted GPU runners are execution backends for training workloads.
- Optional Weights & Biases integration is used for remote experiment tracking.

## System Architecture

| Layer | Primary Components | Responsibility |
| --- | --- | --- |
| Experience Layer | `space/app.py`, `space/style.css` | End-user translation, speech, glossary, and research UI |
| Data Layer | `data/final_v3`, `data/glossary`, `data/registry` | Parallel corpus, glossary assets, and source-traceable data governance |
| Training Layer | `scripts/train_qlora.py`, `training/run_train.sh`, `scripts/train_daily_from_hf.py` | QLoRA fine-tuning, resumable checkpoint restore, and Hub pushback |
| Packaging Layer | `scripts/publish_to_hf.py`, `scripts/push_kaggle_kernel.py` | Space, dataset, model, and Kaggle kernel packaging |
| Orchestration Layer | `.github/workflows/daily-train.yml`, `scripts/run_kaggle_training.py` | Scheduled dispatch, retry behavior, and training monitoring |
| Monitoring Layer | `scripts/check_space_health.py`, run manifests, optional W&B | Health checks, execution visibility, and operational traceability |

## Managed Assets

| Asset Type | Canonical Target |
| --- | --- |
| GitHub repository | `NorthernTribe-Research/maasai-lang` |
| Hugging Face Space | `NorthernTribe-Research/maasai-language-showcase` |
| Hugging Face dataset | `NorthernTribe-Research/maasai-translation-corpus` |
| Hugging Face model repo | `NorthernTribe-Research/maasai-en-mt` |
| Daily training fallback model repo | `NorthernTribe-Research/maasai-en-mt-staging` |
| Base translation model | `Qwen/Qwen2.5-3B-Instruct` |
| ASR model | `microsoft/paza-whisper-large-v3-turbo` |

## Version Snapshot

As of **March 31, 2026**, the active versions and runtime targets are:

| Component | Current Version / Target | Source |
| --- | --- | --- |
| Python automation runtime | `3.11` | `.github/workflows/ci.yml`, `.github/workflows/daily-train.yml` |
| Space SDK | `gradio` `6.10.0` | `space/README.md` |
| Gradio dependency | `>=6.10.0,<7.0.0` | `requirements.txt`, `space/requirements.txt`, `requirements-ci.txt` |
| Transformers | `>=4.51.0` | `requirements.txt` |
| PyTorch | `>=2.3.0` | `requirements.txt` |
| Base translation model | `Qwen/Qwen2.5-3B-Instruct` | `README.md`, workflow defaults |
| ASR model | `microsoft/paza-whisper-large-v3-turbo` | `README.md`, `.env.example` |

## Dataset Snapshot

The current public corpus described in this repository is a governed English <-> Maasai parallel dataset with:

- 9,910 total pairs.
- 8,434 training rows, 738 validation rows, and 738 test rows.
- Balanced translation directions across English and Maasai.
- Mixed provenance from Bible-derived content, curated cultural examples, proverb material, lexicon sources, and vetted open-language resources.

The dataset card lives in `docs/dataset_card.md`, and the project maintains an explicit source inventory in `docs/open_source_maasai_inventory.md` to avoid ungoverned ingestion.

## Quick Start

### Environment

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
```

### Run The Space Locally

```bash
python space/app.py
```

### Run The Space With Docker

Build and run the production container image:

```bash
docker build -t maasai-space:local .
docker run --rm -p 7860:7860 \
  -e GRADIO_SERVER_NAME=0.0.0.0 \
  -e PORT=7860 \
  -e GRADIO_ANALYTICS_ENABLED=False \
  -e HF_HUB_DISABLE_TELEMETRY=1 \
  maasai-space:local
```

Or use Docker Compose:

```bash
docker compose up --build
```

### Train A Local Baseline

```bash
bash training/run_train.sh
```

### Evaluate A Checkpoint

```bash
python scripts/evaluate_mt.py \
  --model_dir outputs/maasai-en-mt-qlora \
  --test_file data/final_v3/test.jsonl \
  --glossary_file data/glossary/maasai_glossary.json
```

## Training Workflows

### Local Or Research Training

The standard local training entrypoint is:

```bash
bash training/run_train.sh
```

For direct control over the fine-tuning job:

```bash
python scripts/train_qlora.py \
  --model_name Qwen/Qwen2.5-3B-Instruct \
  --train_file data/final_v3/train.jsonl \
  --valid_file data/final_v3/valid.jsonl \
  --output_dir outputs/maasai-en-mt-qlora
```

### Resumable Daily Training From Hugging Face

This path restores the latest checkpoint from the model repo, trains for a bounded session, then pushes updated checkpoints back to Hugging Face.

```bash
python scripts/train_daily_from_hf.py \
  --dataset-repo NorthernTribe-Research/maasai-translation-corpus \
  --model-repo NorthernTribe-Research/maasai-en-mt \
  --max-steps 800 \
  --save-steps 100
```

### Kaggle Execution

Use the retrying wrapper when you want GitHub or a local machine to submit the private Kaggle kernel and automatically retry unsupported GPU assignments.

```bash
KAGGLE_CONFIG_DIR="$PWD" .venv/bin/python scripts/run_kaggle_training.py \
  --max-attempts 5 \
  --report-to wandb \
  --embed-local-hf-token
```

### GitHub Actions Control Plane

The repository includes a scheduled and manually dispatchable GitHub Actions workflow:

- Workflow file: `.github/workflows/daily-train.yml`
- Scheduled backend: Kaggle submission via a control-plane runner (`blacksmith-4vcpu-ubuntu-2404` by default, or `TRAINING_CONTROL_RUNNER_LABEL` when configured)
- Manual backends: `kaggle` or `self-hosted`
- Primary responsibilities: validate secrets, package the training job, dispatch execution, and upload run artifacts

## Hugging Face Publishing

The maintained publication path is `scripts/publish_to_hf.py`.

Preview the full publish plan:

```bash
python scripts/publish_to_hf.py
```

Export publish-ready bundles locally:

```bash
python scripts/publish_to_hf.py \
  --export-dir dist/hf_publish \
  --create-model-repo
```

Execute publication:

```bash
python scripts/publish_to_hf.py \
  --execute \
  --create-model-repo
```

This workflow can publish:

- The Gradio Space bundle from `space/`
- The governed dataset bundle from `data/final_v3/`
- The model repo contents from `outputs/maasai-en-mt-qlora/`
- A metadata-first scaffold when real trained weights are not yet available

## Monitoring And Operations

### Space Health Checks

Probe the live Hugging Face Space:

```bash
.venv/bin/python scripts/check_space_health.py
```

Emit machine-readable output:

```bash
.venv/bin/python scripts/check_space_health.py --json
```

### Run Artifacts

Daily training writes structured run manifests and can optionally sync per-run bundles to Hugging Face buckets. This provides lightweight execution traceability even when the compute environment is ephemeral.

### CI Container Validation

`CI` includes a `Docker Smoke` job that builds the Space runtime container and probes the served HTTP endpoint on Blacksmith runners. This keeps local Docker behavior and GitHub Actions behavior aligned.

### GitHub Packages (GHCR)

The repository publishes container images to GitHub Container Registry using [`.github/workflows/publish-container.yml`](.github/workflows/publish-container.yml).

- Runtime image: `ghcr.io/northerntribe-research/maasai-lang-space`
- Source-intelligence image: `ghcr.io/northerntribe-research/maasai-lang-source-intel`
- Primary tags: `latest`, branch refs, and short commit SHA tags
- Trigger paths: Docker/runtime files, discovery scripts, and registry updates

Pull and run:

```bash
docker pull ghcr.io/northerntribe-research/maasai-lang-space:latest
docker run --rm -p 7860:7860 ghcr.io/northerntribe-research/maasai-lang-space:latest

docker pull ghcr.io/northerntribe-research/maasai-lang-source-intel:latest
docker run --rm ghcr.io/northerntribe-research/maasai-lang-source-intel:latest
```

### Org Project Board Bootstrap

To create a team-ready organization Project and auto-seed milestone issues:

```bash
gh auth refresh -s project,read:project,read:packages
./scripts/bootstrap_org_project_board.sh
```

Default target:
- Org: `NorthernTribe-Research`
- Repo: `NorthernTribe-Research/maasai-lang`
- Milestone seed: `SOTA Expansion Q2 2026`

## Security And Secrets

This repository uses external platforms extensively. Secrets management is therefore part of the operating model, not an afterthought.

Required or commonly used credentials include:

- `HF_TOKEN`
- `KAGGLE_USERNAME`
- `KAGGLE_KEY`
- `WANDB_API_KEY`
- `TRANSLATION_MODEL_ID`
- `ASR_MODEL_ID`

Secret delivery depends on the execution path:

- Local development: environment variables or local key files such as `huggingface-api-key.json` and `kaggle.json`
- GitHub Actions: repository secrets and repository variables
- Kaggle runtime: Kaggle notebook secrets
- Colab-style execution: Colab secret store when applicable

Important constraints:

- Kaggle packaging can embed Hugging Face and W&B credentials into a private kernel package when explicitly requested.
- The code blocks secret embedding for public Kaggle kernels.
- Secrets should never be committed into the repository or bundled into public artifacts.

## Data Governance

The project is designed to avoid indiscriminate ingestion. Source traceability is explicit.

Governance artifacts include:

- `docs/open_source_maasai_inventory.md`
- `docs/maasai_preservation_operations.md`
- `data/registry/maasai_vetted_web_sources.json`
- `data/registry/maasai_candidate_media_sources.json`
- `data/registry/maasai_media_intelligence_candidates.json`
- `scripts/discover_vetted_maasai_sources.py`
- `scripts/discover_maasai_media_intelligence.py`
- `.github/workflows/source-intelligence.yml`

Operationally, the intended pattern is:

- ingest only sources with clear reuse rights
- keep unclear, gated, or copyrighted material out of automated training
- separate training-approved, permission-required, and reference-only sources
- run API-based discovery continuously and promote leads only after rights/community review

## Evaluation And Quality

The evaluation plan is documented in `docs/evaluation_plan.md`.

The current approach combines:

- BLEU
- chrF++
- glossary-sensitive terminology checks
- human review by native Maa speakers where possible

Quality expectations should remain realistic:

- Maasai is a low-resource language.
- Orthography and dialect usage are not fully standardized.
- Cultural and domain coverage are uneven.
- Human review remains necessary for formal, public-facing, legal, medical, or otherwise sensitive use.

## Repository Layout

```text
.
|-- .github/workflows/        GitHub Actions automation
|-- data/                     Corpora, glossary assets, registry, and evaluation data
|-- docs/                     Dataset, model, deployment, and operations documentation
|-- kaggle/                   Kaggle runtime entrypoints and requirements
|-- outputs/                  Local training artifacts and checkpoints
|-- scripts/                  Training, publishing, monitoring, and utility commands
|-- space/                    Gradio application bundle for Hugging Face Space deployment
|-- src/                      Shared Python modules for prompts, metrics, preprocessing, and config
`-- training/                 Shell-based local training entrypoints
```

## Key Documentation

- `docs/deployment.md`
- `docs/daily_training.md`
- `docs/kaggle_training.md`
- `docs/dataset_card.md`
- `docs/model_card.md`
- `docs/evaluation_plan.md`

## Governance

- `CONTRIBUTING.md`
- `SECURITY.md`
- `SUPPORT.md`
- `CODE_OF_CONDUCT.md`
- `.github/CODEOWNERS`
- `.github/workflows/security-posture.yml`
- `.github/workflows/source-intelligence.yml`

## Limitations

- This repository is production-oriented in structure, but it is still an actively evolving research and delivery platform.
- The translation and speech outputs should not be treated as authoritative without qualified human review.
- Coverage across dialects, domains, and orthographic variants is incomplete.
- Code and bundled assets are proprietary and all rights reserved under `LICENSE`.

## Acknowledgment

Built by NorthernTribe-Research to support Maasai language preservation, accessibility, and practical low-resource language AI operations.
