# Cloud CPU Training

This project now includes two cloud CPU paths:

- A one-shot remote training helper for direct experimentation
- A persistent cloud training manager for continuous resumable cycles

## Persistent Continuous Training

Install the persistent cloud backend:

```bash
HF_TOKEN=... .venv/bin/python scripts/manage_cloud_cpu_training.py install
```

Useful follow-up commands:

```bash
.venv/bin/python scripts/manage_cloud_cpu_training.py status
.venv/bin/python scripts/manage_cloud_cpu_training.py logs
.venv/bin/python scripts/manage_cloud_cpu_training.py stop
.venv/bin/python scripts/manage_cloud_cpu_training.py start
```

The persistent path uses:

- `scripts/manage_cloud_cpu_training.py` on the local machine
- `scripts/run_cloud_train_cycle.py` on the remote machine
- `scripts/train_daily_from_hf.py` for durable checkpoint restore and pushback
- Hugging Face model repos as the persistent resume layer between cycles

It installs either a remote systemd timer or a cron fallback. Each scheduled cycle acquires a lock, writes a heartbeat file, downloads the latest dataset and checkpoint state from Hugging Face, runs a bounded CPU training session, then pushes checkpoints back again.

## One-Shot Remote Training

The repo also keeps the one-shot helper for direct CPU experiments:

```bash
.venv/bin/python scripts/run_cloud_cpu_training.py --prepare-only
.venv/bin/python scripts/run_cloud_cpu_training.py
.venv/bin/python scripts/run_cloud_cpu_training.py --pull-only
```

## What it uses

- The local markdown file `cloud-machine-connection.md`
- The fenced `sshconfig` block inside that file
- A conservative CPU training profile built on `scripts/train_qlora.py`

The helper does **not** commit or publish any secrets. It extracts only the SSH config block, writes a temporary local SSH config, syncs the minimal training subset to the remote machine, bootstraps a virtualenv, runs training, and syncs adapter outputs back.

By default it installs `requirements-cloud-cpu.txt` instead of the full project dependency set. That keeps the remote bootstrap focused on the libraries needed for training rather than Space/UI extras.

## Default CPU Profile

The default remote run is intentionally conservative:

- `google/gemma-4-E4B-it`
- `max_length=256`
- `per_device_train_batch_size=1`
- `gradient_accumulation_steps=16`
- `max_train_samples=512`
- `max_eval_samples=128`
- `max_steps=120`

That profile is meant for smoke runs, adapter validation, and CPU-bound experimentation. Full Gemma retraining is still better suited to Kaggle, Colab, or self-hosted GPU runs.

If the remote machine has limited RAM, pass a smaller model explicitly:

```bash
.venv/bin/python scripts/run_cloud_cpu_training.py \
  --model-name google/gemma-3-1b-it \
  --max-train-samples 256 \
  --max-steps 80
```

## Common Commands

Prepare the remote machine and sync code only:

```bash
.venv/bin/python scripts/run_cloud_cpu_training.py --prepare-only
```

Run a larger CPU experiment:

```bash
.venv/bin/python scripts/run_cloud_cpu_training.py \
  --max-train-samples 1500 \
  --max-eval-samples 250 \
  --max-steps 300 \
  --output-dir outputs/maasai-en-mt-qlora-cloud-cpu-long
```

Pull artifacts back without rerunning training:

```bash
.venv/bin/python scripts/run_cloud_cpu_training.py --pull-only
```

Preview all SSH/rsync/train commands without executing them:

```bash
.venv/bin/python scripts/run_cloud_cpu_training.py --dry-run
```

## Notes

- The script expects SSH auth to already work from the local machine.
- The persistent manager stores `HF_TOKEN` in a permission-restricted remote env file so scheduled cycles can keep resuming and pushing checkpoints.
- The persistent manager writes heartbeat state to `runtime/state/cloud-train-heartbeat.json` on the remote machine.
- The persistent manager uses `train_daily_from_hf.py`, so the cloud CPU backend stays aligned with the same Hugging Face checkpoint lifecycle as Colab, Kaggle, and self-hosted flows.
- The remote machine still needs Hugging Face access for Gemma downloads. If the model is not cached already, make sure that machine has Hub credentials or prior access configured.
- It syncs only the subset needed for training:
  - `src/`
  - `scripts/`
  - `data/raw/maasai_story_generation_seed.jsonl`
- Remote outputs are synced back into the local output directory you pass via `--output-dir`.
