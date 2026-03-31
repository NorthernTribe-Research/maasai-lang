# Security Policy

## Scope

This repository handles application code, workflow automation, training orchestration, and operational integrations with external platforms such as GitHub Actions, Kaggle, Hugging Face, and optional W&B services. Security issues in any of those surfaces should be treated seriously.

## Supported Branches

| Branch | Security Support | Notes |
| --- | --- | --- |
| `main` | Primary | Security fixes are made and validated here first. |
| release tags derived from `main` | Best effort | Tags are immutable snapshots; urgent mitigations are shipped through new tagged releases. |
| non-main feature branches | No direct support | Rebase or merge into `main` for security remediation. |

## Reporting A Vulnerability

Do not open a public GitHub issue for exploitable vulnerabilities, leaked credentials, or security-sensitive workflow flaws.

Preferred reporting path:

1. Use GitHub Private Vulnerability Reporting or the repository Security tab if it is enabled.
2. If that path is unavailable, contact the NorthernTribe-Research maintainers through an approved private channel and include:
   - affected file paths, workflow names, or services
   - clear reproduction steps
   - impact assessment
   - whether credentials or personal data may be exposed

## What To Report

Examples include:

- exposed secrets or credential-handling flaws
- unsafe GitHub Actions permissions or workflow injection paths
- insecure publication or model push behavior
- vulnerable dependencies in shipped or CI-facing environments
- data exposure in logs, artifacts, or public model/dataset outputs

## Response Expectations

- We aim to acknowledge private reports within 3 business days.
- We will triage confirmed reports as quickly as possible.
- We may request a private proof of concept or remediation guidance.
- We will coordinate disclosure timing once a fix or mitigation exists.

## Repository Security Baseline

This repository is aligned to GitHub Security Overview controls within current project scope:

- Code scanning: `CodeQL` workflow on `push`, `pull_request`, and schedule.
- Dependency review: dependency diff checks on pull requests.
- Dependabot security updates: enabled in repository security settings.
- Secret scanning + push protection: enabled in repository security settings.
- Private vulnerability reporting: enabled in repository security settings.
- Branch protection on `main`: required status checks, required code-owner review, stale-review dismissal, admin enforcement, linear history, and conversation resolution.
- Continuous control validation: `Security Posture` workflow executes `scripts/check_security_posture.py` daily and on demand.

## Operational Hygiene

- Never commit `huggingface-api-key.json`, `kaggle.json`, `wandb-keys.json`, `.env`, or similar credentials.
- Use repository secrets, variables, Kaggle secrets, or other approved secret stores instead of plaintext config.
- Redact workflow logs and runtime traces before sharing them publicly.
