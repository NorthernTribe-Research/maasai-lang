# Kubernetes Baseline

This directory contains the minimum Kubernetes manifests needed to run LinguaMaster on a cluster.

## Included Resources

- Namespace
- ConfigMap
- Deployment
- Service
- Horizontal Pod Autoscaler

## Quick Start

1. Create a secret from your environment values:
```bash
kubectl create namespace linguamaster
kubectl -n linguamaster create secret generic linguamaster-secrets \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=GEMINI_API_KEY='...' \
  --from-literal=OPENAI_API_KEY='...' \
  --from-literal=SESSION_SECRET='...' \
  --from-literal=JWT_SECRET='...' \
  --from-literal=STRIPE_SECRET_KEY='...'
```

2. Apply manifests:
```bash
kubectl apply -k k8s
```

3. Verify rollout:
```bash
kubectl -n linguamaster get pods,svc,hpa
kubectl -n linguamaster rollout status deployment/linguamaster-api
```

## Image Source

The deployment defaults to:

`us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster:latest`

Update `deployment.yaml` or use `kustomize edit set image` for environment-specific releases.
