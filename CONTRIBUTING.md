# Contributing

This repository is operated by NorthernTribe-Research as a production-oriented language AI platform. Contributions should improve the codebase without weakening data governance, operational safety, or cultural stewardship.

## Before You Start

- Use Python 3.11 for contributor-facing automation and CI parity.
- Treat the repository as proprietary and all rights reserved under `LICENSE`.
- Do not contribute content, datasets, or terminology you are not authorized to share.
- Never commit secrets, Kaggle credentials, Hugging Face tokens, or private run artifacts.

## Local Setup

For full project work:

```bash
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

For lightweight repository checks only:

```bash
pip install -r requirements-ci.txt
```

## Required Validation Before Opening A PR

Run the lightweight checks locally whenever your change touches repository code, data metadata, or workflow automation:

```bash
python -m compileall src scripts space kaggle
python scripts/validate_dataset_complete.py
python -m unittest discover -s tests -v
python -c "import space.app as app; demo = app.build_app(); print(type(demo).__name__)"
```

Use heavier flows only when your change requires them:

- `python space/app.py` for interactive Space checks
- `bash training/run_train.sh` for local training
- `python scripts/train_daily_from_hf.py ...` for resumable training validation in an approved GPU environment

## Contribution Expectations

- Keep pull requests focused and reviewable.
- Update documentation when workflow inputs, runtime assumptions, or public behavior change.
- Preserve dataset traceability. If you add or modify corpus assets, also update the relevant governance docs such as `docs/dataset_card.md` and `docs/open_source_maasai_inventory.md` when needed.
- Call out operational implications for GitHub Actions, Kaggle, Hugging Face, Blacksmith, or self-hosted runners.
- Prefer deterministic validation steps over ad hoc manual testing.

## Pull Request Standards

- Use the pull request template and complete the validation and governance sections.
- Include exact commands you ran.
- Mention any required secrets, repository variables, or environment configuration changes.
- For model, training, or publication changes, describe rollback considerations and artifact impacts.

## Data And Cultural Stewardship

- Do not add ungoverned web-scraped material.
- Preserve culturally significant Maasai terminology and avoid flattening protected concepts.
- Flag uncertain translations, dialect-specific variations, and synthetic examples clearly in code or documentation where relevant.

## Security Reporting

For vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening a public bug report.
