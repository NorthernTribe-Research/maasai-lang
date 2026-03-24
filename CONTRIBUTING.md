# Contributing Guide

Thank you for contributing to LinguaMaster.

This document defines the minimum contribution workflow for code quality, security, and release stability.

## Prerequisites

- Node.js 18 or later
- npm 8 or later
- PostgreSQL
- Required environment variables configured in `.env`

## Local Development

1. Install dependencies:
```bash
npm install
```
2. Configure environment:
```bash
cp .env.example .env
```
3. Apply schema updates:
```bash
npm run db:push
```
4. Start development server:
```bash
npm run dev
```

## Branching and Commits

- Create feature branches from `main`.
- Keep pull requests focused on a single concern.
- Use clear commit messages in imperative form.
- Rebase or merge latest `main` before opening a pull request.

Recommended commit format:

```text
type(scope): short summary
```

Examples:

```text
feat(api): add ai metrics endpoint
fix(auth): handle expired session token
docs(readme): refine deployment guidance
```

## Validation Checklist

Before opening a pull request, run:

```bash
npm run check
npm run test
npm run build
```

For integration-sensitive changes, also run:

```bash
npm run test:integration
```

## Pull Request Requirements

- Describe the problem and the solution.
- Include rollout or migration notes when relevant.
- Add or update tests for behavior changes.
- Update docs for user-facing, API, or operational changes.
- Avoid unrelated formatting-only edits in large files.

## Security and Secrets

- Never commit credentials, API keys, or production secrets.
- Use environment variables or secret managers.
- Report vulnerabilities privately to project maintainers.

## Documentation Standards

- Keep operational docs in `docs/runbooks/`.
- Keep deployment docs in `docs/deployment/`.
- Keep legal and compliance docs in `docs/legal/` and `docs/compliance/`.

## Code of Conduct

Contributors are expected to communicate respectfully, review constructively, and collaborate professionally.
