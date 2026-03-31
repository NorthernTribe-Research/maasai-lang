# Security Policy

## Scope

This repository handles application code, workflow automation, training orchestration, and operational integrations with external platforms such as GitHub Actions, Kaggle, Hugging Face, and optional W&B services. Security issues in any of those surfaces should be treated seriously.

## Supported Branches

Security fixes are prioritized for:

- `main`
- the currently deployed Space and workflow configuration
- active automation under `.github/workflows/`

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

- We will triage confirmed reports as quickly as possible.
- We may request a private proof of concept or remediation guidance.
- We will coordinate disclosure timing once a fix or mitigation exists.

## Operational Hygiene

- Never commit `huggingface-api-key.json`, `kaggle.json`, `wandb-keys.json`, `.env`, or similar credentials.
- Use repository secrets, variables, Kaggle secrets, or other approved secret stores instead of plaintext config.
- Redact workflow logs and runtime traces before sharing them publicly.
