# Observability Guide

LinguaMaster includes baseline observability features in the application and deployment workflows.

## Implemented Capabilities

- Structured request and application logging.
- Health endpoints:
  - `GET /api/health`
  - `GET /api/health/live`
  - `GET /api/health/ready`
- Metrics endpoints:
  - `GET /api/metrics` (Prometheus format)
  - `GET /api/metrics/json`
  - `GET /api/metrics/summary`
- Uptime alert script: `scripts/uptime-check.sh`

## Kubernetes Readiness

The Kubernetes deployment in `k8s/deployment.yaml` includes:

- Liveness probe against `/api/health/live`
- Readiness probe against `/api/health/ready`
- Prometheus scrape annotations for `/api/metrics`

## Operational Checks

Use these commands after deployment:

```bash
curl -fsS https://linguamaster.ai/api/health | jq
curl -fsS https://linguamaster.ai/api/metrics/summary | jq
```

For local or containerized checks:

```bash
HEALTH_URL=http://127.0.0.1:5000/api/health npm run monitor:uptime
```

## Recommended Next Integrations

- Centralized log sink (for example, Cloud Logging or ELK).
- Metrics dashboarding (for example, Managed Prometheus + Grafana).
- Incident alert routing through a paging provider.
