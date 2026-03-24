# Workload Identity Federation Setup for GitLab CI/CD

## Overview

Workload Identity Federation allows GitLab CI/CD to authenticate to Google Cloud without storing long-lived service account keys. This is the recommended secure authentication method for CI/CD pipelines.

## Prerequisites

- Google Cloud Project: `northerntriberesearch`
- GitLab repository with CI/CD enabled
- `gcloud` CLI installed locally
- Project Owner or Security Admin role in GCP

## Architecture

```
GitLab CI/CD Pipeline
  ↓ (OIDC Token)
Workload Identity Pool
  ↓ (Token Exchange)
Workload Identity Provider
  ↓ (Impersonation)
Service Account
  ↓ (Access)
Google Cloud Resources
```

## Setup Steps

### 1. Enable Required APIs

```bash
gcloud services enable \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project=northerntriberesearch
```

### 2. Create Workload Identity Pool

```bash
gcloud iam workload-identity-pools create "gitlab-pool" \
  --project="northerntriberesearch" \
  --location="global" \
  --display-name="GitLab CI/CD Pool"
```

Get the pool ID:
```bash
gcloud iam workload-identity-pools describe "gitlab-pool" \
  --project="northerntriberesearch" \
  --location="global" \
  --format="value(name)"
```

Output: `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/gitlab-pool`

### 3. Create Workload Identity Provider

```bash
gcloud iam workload-identity-pools providers create-oidc "gitlab-provider" \
  --project="northerntriberesearch" \
  --location="global" \
  --workload-identity-pool="gitlab-pool" \
  --display-name="GitLab OIDC Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.project_path=assertion.project_path,attribute.ref=assertion.ref,attribute.ref_type=assertion.ref_type" \
  --issuer-uri="https://gitlab.com" \
  --allowed-audiences="https://gitlab.com"
```

Get the provider ID:
```bash
gcloud iam workload-identity-pools providers describe "gitlab-provider" \
  --project="northerntriberesearch" \
  --location="global" \
  --workload-identity-pool="gitlab-pool" \
  --format="value(name)"
```

Output: `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/gitlab-pool/providers/gitlab-provider`

### 4. Create Service Account

```bash
gcloud iam service-accounts create gitlab-ci-deployer \
  --project=northerntriberesearch \
  --display-name="GitLab CI/CD Deployer" \
  --description="Service account for GitLab CI/CD deployments"
```

### 5. Grant Service Account Permissions

```bash
# Cloud Run Admin (deploy services)
gcloud projects add-iam-policy-binding northerntriberesearch \
  --member="serviceAccount:gitlab-ci-deployer@northerntriberesearch.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Service Account User (act as service account)
gcloud projects add-iam-policy-binding northerntriberesearch \
  --member="serviceAccount:gitlab-ci-deployer@northerntriberesearch.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Artifact Registry Writer (push Docker images)
gcloud projects add-iam-policy-binding northerntriberesearch \
  --member="serviceAccount:gitlab-ci-deployer@northerntriberesearch.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Cloud SQL Client (connect to database)
gcloud projects add-iam-policy-binding northerntriberesearch \
  --member="serviceAccount:gitlab-ci-deployer@northerntriberesearch.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Secret Manager Accessor (read secrets)
gcloud projects add-iam-policy-binding northerntriberesearch \
  --member="serviceAccount:gitlab-ci-deployer@northerntriberesearch.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 6. Allow Workload Identity Pool to Impersonate Service Account

```bash
gcloud iam service-accounts add-iam-policy-binding \
  gitlab-ci-deployer@northerntriberesearch.iam.gserviceaccount.com \
  --project=northerntriberesearch \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/gitlab-pool/attribute.project_path/YOUR_GITLAB_GROUP/linguamaster"
```

**Note**: Replace `PROJECT_NUMBER` with your actual GCP project number and `YOUR_GITLAB_GROUP` with your GitLab group/username.

### 7. Configure GitLab CI/CD Variables

In your GitLab repository, go to **Settings > CI/CD > Variables** and add:

| Variable | Value | Protected | Masked |
|----------|-------|-----------|--------|
| `GCP_WIF_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/gitlab-pool/providers/gitlab-provider` | ✓ | ✗ |
| `GCP_SERVICE_ACCOUNT` | `gitlab-ci-deployer@northerntriberesearch.iam.gserviceaccount.com` | ✓ | ✗ |

**Note**: Replace `PROJECT_NUMBER` with your actual GCP project number.

## Verification

### Test Authentication in GitLab CI/CD

Create a test job in `.gitlab-ci.yml`:

```yaml
test:wif:
  stage: test
  script:
    - gcloud auth list
    - gcloud projects describe northerntriberesearch
    - echo "✓ Workload Identity Federation working"
  only:
    - main
```

Run the pipeline and verify the job succeeds.

### Test Docker Push

```yaml
test:docker-push:
  stage: test
  image: docker:27.0.3
  services:
    - docker:27.0.3-dind
  script:
    - gcloud auth configure-docker us-central1-docker.pkg.dev
    - docker build -t us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/test:latest .
    - docker push us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/test:latest
    - echo "✓ Docker push working"
  only:
    - main
```

## Security Best Practices

### 1. Principle of Least Privilege
- Grant only the minimum required permissions
- Use separate service accounts for different environments (staging, production)

### 2. Attribute Conditions
Restrict access to specific GitLab projects:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  gitlab-ci-deployer@northerntriberesearch.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/gitlab-pool/attribute.project_path/YOUR_GITLAB_GROUP/linguamaster" \
  --condition='expression=assertion.ref == "refs/heads/main",title=main-branch-only'
```

### 3. Audit Logging
Enable audit logs for service account usage:

```bash
gcloud logging read "protoPayload.authenticationInfo.principalEmail=gitlab-ci-deployer@northerntriberesearch.iam.gserviceaccount.com" \
  --project=northerntriberesearch \
  --limit=50
```

### 4. Regular Review
- Review service account permissions quarterly
- Rotate service accounts annually
- Monitor for unauthorized access attempts

## Troubleshooting

### Error: "Permission denied"

**Cause**: Service account lacks required permissions.

**Solution**:
```bash
# Check current permissions
gcloud projects get-iam-policy northerntriberesearch \
  --flatten="bindings[].members" \
  --filter="bindings.members:gitlab-ci-deployer@northerntriberesearch.iam.gserviceaccount.com"

# Add missing permission
gcloud projects add-iam-policy-binding northerntriberesearch \
  --member="serviceAccount:gitlab-ci-deployer@northerntriberesearch.iam.gserviceaccount.com" \
  --role="roles/REQUIRED_ROLE"
```

### Error: "Invalid JWT token"

**Cause**: Workload Identity Provider configuration mismatch.

**Solution**:
1. Verify issuer URI: `https://gitlab.com`
2. Verify audience matches GitLab configuration
3. Check attribute mapping includes required fields

### Error: "Service account impersonation failed"

**Cause**: Workload Identity Pool not authorized to impersonate service account.

**Solution**:
```bash
gcloud iam service-accounts add-iam-policy-binding \
  gitlab-ci-deployer@northerntriberesearch.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/gitlab-pool/*"
```

## Migration from Service Account Keys

If you're currently using service account keys:

1. Set up Workload Identity Federation (steps above)
2. Test WIF in a separate branch
3. Once verified, update main branch
4. Delete service account keys from GitLab variables
5. Disable or delete the old service account key

```bash
# List keys
gcloud iam service-accounts keys list \
  --iam-account=gitlab-ci-deployer@northerntriberesearch.iam.gserviceaccount.com

# Delete key
gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=gitlab-ci-deployer@northerntriberesearch.iam.gserviceaccount.com
```

## References

- [Google Cloud Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [GitLab CI/CD with Google Cloud](https://docs.gitlab.com/ee/ci/cloud_deployment/)
- [Configuring Workload Identity Federation](https://cloud.google.com/iam/docs/configuring-workload-identity-federation)

## Support

For issues with Workload Identity Federation:
1. Check GitLab CI/CD logs for detailed error messages
2. Verify all configuration steps completed
3. Review GCP audit logs for authentication attempts
4. Contact DevOps team or create support ticket

---

**Last Updated**: January 2024
**Maintained By**: DevOps Team
**Review Schedule**: Quarterly
