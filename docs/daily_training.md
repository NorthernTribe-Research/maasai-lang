# Continuous Training Control Plane

This project now supports a resumable Hugging Face training loop driven from either:

- Google Colab with secrets stored in the Colab key vault
- GitHub Actions dispatching Kaggle GPU training
- A manual GitHub Actions fallback that runs directly on a self-hosted GPU runner
- A persistent remote cloud CPU machine managed from `cloud-machine-connection.md`

## Colab Flow

1. Open Colab and store `HF_TOKEN` in the left sidebar secrets panel.
2. Optionally store `WANDB_API_KEY` there as well.
3. Clone this repo and install dependencies.
4. Run:

```bash
python scripts/train_daily_from_hf.py \
  --dataset-repo NorthernTribe-Research/maasai-translation-corpus \
  --model-repo NorthernTribe-Research/maasai-en-mt \
  --max-steps 800 \
  --save-steps 100 \
  --disconnect-colab
```

What happens:

- The script authenticates with `huggingface_hub.login(...)`
- Downloads `train.jsonl` and `valid.jsonl` from the dataset repo
- Pulls the latest `checkpoint-*` folders from the model repo when they exist
- Resumes training from the newest checkpoint
- Pushes checkpoints back to the same model repo
- Optionally disconnects the Colab runtime at the end

## GitHub Flow

The repo now includes [`.github/workflows/daily-train.yml`](../.github/workflows/daily-train.yml).

Scheduled GitHub runs use a CPU runner only as the control plane. By default that is `blacksmith-4vcpu-ubuntu-2404`, and you can override it with the repository or organization variable `TRAINING_CONTROL_RUNNER_LABEL` when you need a different Blacksmith runner label. The workflow:

- authenticates to Kaggle from GitHub secrets
- builds the private Kaggle kernel package from this repo
- points the Kaggle runtime at the exact GitHub repo and branch that triggered the workflow
- embeds the HF token into that private kernel package
- checks whether the kernel is already active and skips duplicate pushes
- otherwise pushes the kernel to Kaggle and waits until training starts (or a terminal startup failure is detected)

Schedule details:

- `daily-train.yml` is now a continuous control loop on `main` every 30 minutes (`5,35 * * * *`)
- the loop is non-overlapping at the kernel level because the dispatcher uses `--skip-if-running`
- if a run is not active, the loop dispatches a fresh resumable training session

Kaggle provides the GPU, while Hugging Face remains the system of record for datasets, checkpoints, and the model repo.

Required GitHub secrets:

- `KAGGLE_USERNAME`
- `KAGGLE_KEY`
- `HF_TOKEN`
- `WANDB_API_KEY` if you want remote W&B logging

Recommended GitHub repo variables:

- `HF_DATASET_REPO`
- `HF_MODEL_REPO`
- `HF_BASE_MODEL`
- `HF_BUCKET_URI`
- `TRAINING_CONTROL_RUNNER_LABEL` if you want the Kaggle dispatch job to use a different Blacksmith runner label

The workflow falls back to the current NorthernTribe Hugging Face repos when those vars are not set, defaults the base model to `google/gemma-4-E4B-it`, and uses `NorthernTribe-Research/maasai-en-mt-staging` as the safe default model repo unless `HF_MODEL_REPO` is explicitly configured.

### Manual Self-Hosted Fallback

`workflow_dispatch` exposes a `backend` input:

- `kaggle` submits training to Kaggle
- `self-hosted` runs the original direct GPU flow on a runner labeled `self-hosted, linux, x64, gpu`

Use the self-hosted backend only when you intentionally want training to happen on your own runner instead of Kaggle.

## Freshness Guard

The repo includes [`.github/workflows/training-freshness.yml`](../.github/workflows/training-freshness.yml) to verify that continuous training has not stalled.

- it runs hourly
- it inspects recent `daily-train.yml` workflow runs on `main`
- it fails if there is no active run and no successful run in the last 3 hours

The check script is:

- `scripts/check_training_freshness.py`

## Persistent Cloud CPU Backend

The repo also supports a persistent cloud CPU training backend for situations where you want training to keep advancing outside GitHub and Kaggle.

Install it from your local machine:

```bash
HF_TOKEN=... .venv/bin/python scripts/manage_cloud_cpu_training.py install \
  --timer-minutes 45 \
  --model-name google/gemma-4-E4B-it \
  --max-steps 120 \
  --save-steps 60
```

What happens:

- the local machine reads the SSH host definition from `cloud-machine-connection.md`
- syncs the training subset and CPU requirements to the remote machine
- bootstraps a remote virtualenv
- writes a protected remote env file containing the HF token and training settings
- installs either a systemd timer or a cron fallback on the remote machine
- schedules `scripts/run_cloud_train_cycle.py`, which keeps invoking `scripts/train_daily_from_hf.py`
- stores a remote heartbeat JSON file under `runtime/state/cloud-train-heartbeat.json`

This backend stays interconnected with the rest of the project by reusing:

- `HF_DATASET_REPO` for dataset download
- `HF_MODEL_REPO` for checkpoint restore and pushback
- `HF_BUCKET_URI` for per-run bundle sync
- the same `train_daily_from_hf.py` resumable control loop used by other training backends

## Checkpoint Policy

- Frequent checkpoint upload is handled through `push_to_hub=True`
- The trainer uses `hub_strategy="checkpoint"`
- The model repo therefore acts as the durable resume point between daily sessions
- Each run also writes a `run_manifest.json` file so GitHub can retain a lightweight execution artifact even when the runner workspace is ephemeral

## Lightweight CI

The repo now also includes [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) for fast verification on `push`, `pull_request`, and manual dispatch.

That workflow is intentionally CPU-only and avoids the heavyweight training stack. It currently:

- lints workflow files with `actionlint`
- compiles Python sources under `src/`, `scripts/`, `space/`, and `kaggle/`
- generates a machine-readable dataset validation report
- runs lightweight unit tests for prompt generation, dataset validation helpers, and the Gradio app build path
- builds the Space Docker image and performs an HTTP smoke probe against the running container

The same CI workflow executes on Blacksmith by default using `blacksmith-4vcpu-ubuntu-2404`. Set `CI_RUNNER_LABEL` when you need a different supported Blacksmith runner tag.

## Repository Target

The active control-plane repository is `NorthernTribe-Research/maasai-lang`, with Hugging Face remaining the system of record for datasets, model checkpoints, and Space deployment assets.
