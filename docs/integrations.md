# Integrations Configuration

This project already includes GitLab CI/CD for build, security scans, staging deployment, smoke tests, and production rollout.

## Existing Integration Surface

- GitLab CI/CD pipeline: `.gitlab-ci.yml`
- Google Cloud Workload Identity Federation for deployment
- Artifact Registry for image storage
- Optional webhook-based uptime alerts via `UPTIME_ALERT_WEBHOOK_URL`

## Required GitLab CI/CD Variables

Set the following in GitLab project settings:

- `GCP_WIF_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `GITLAB_OIDC_TOKEN` (provided in pipeline context)
- `DATABASE_URL` (as secret in target platform)
- `GEMINI_API_KEY` (as secret in target platform)
- `OPENAI_API_KEY` (as secret in target platform)
- `SESSION_SECRET` (as secret in target platform)
- `JWT_SECRET` (as secret in target platform)
- `STRIPE_SECRET_KEY` (optional, production billing)

## Optional Team Integrations

- Slack or Google Chat incoming webhook for uptime alerts.
- Error reporting provider (for example, Sentry) for exception aggregation.
- PagerDuty or equivalent for on-call alert routing.

## Post-Configuration Validation

1. Run pipeline on `main`.
2. Confirm container image pushes successfully.
3. Confirm staging deploy and smoke tests pass.
4. Confirm production job is available for manual approval.
