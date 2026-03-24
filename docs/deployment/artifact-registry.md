# Google Artifact Registry Integration

## Overview

Google Artifact Registry is a fully managed container registry service that stores and manages Docker images for the LinguaMaster platform. It replaces the deprecated Google Container Registry (GCR) and provides enhanced security, vulnerability scanning, and access control.

## Configuration

### Project Details
- **Project ID**: `northerntriberesearch`
- **Region**: `us-central1`
- **Repository Name**: `linguamaster`
- **Repository Format**: Docker
- **Full Path**: `us-central1-docker.pkg.dev/northerntriberesearch/linguamaster`

## Setup

### 1. Enable Artifact Registry API

```bash
gcloud services enable artifactregistry.googleapis.com \
  --project=northerntriberesearch
```

### 2. Create Docker Repository

```bash
gcloud artifacts repositories create linguamaster \
  --repository-format=docker \
  --location=us-central1 \
  --description="LinguaMaster Docker images" \
  --project=northerntriberesearch
```

### 3. Configure Repository Settings

```bash
# Enable vulnerability scanning
gcloud artifacts repositories update linguamaster \
  --location=us-central1 \
  --enable-vulnerability-scanning \
  --project=northerntriberesearch

# Set cleanup policies (keep last 10 versions)
gcloud artifacts repositories set-cleanup-policies linguamaster \
  --location=us-central1 \
  --policy=keep-minimum-versions \
  --keep-minimum-versions=10 \
  --project=northerntriberesearch
```

### 4. Grant Access to Service Accounts

```bash
# GitLab CI/CD deployer (write access)
gcloud artifacts repositories add-iam-policy-binding linguamaster \
  --location=us-central1 \
  --member="serviceAccount:gitlab-ci-deployer@northerntriberesearch.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=northerntriberesearch

# Cloud Run service account (read access)
gcloud artifacts repositories add-iam-policy-binding linguamaster \
  --location=us-central1 \
  --member="serviceAccount:linguamaster-runner@northerntriberesearch.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader" \
  --project=northerntriberesearch
```

## Image Tagging Strategy

### Tag Format

Images are tagged with multiple identifiers for flexibility and rollback capability:

1. **Version Tag** (Primary): `{commit-sha}-{pipeline-id}`
   - Example: `a1b2c3d-12345`
   - Used for deployments
   - Unique per build

2. **Git Commit SHA**: `{commit-sha}`
   - Example: `a1b2c3d`
   - Links image to source code
   - Useful for debugging

3. **Branch Name**: `{branch-slug}`
   - Example: `main`, `develop`, `feature-auth`
   - Tracks latest build per branch

4. **Latest**: `latest`
   - Always points to most recent main branch build
   - Used for quick testing

### Example Tags for a Single Build

```
us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster:a1b2c3d-12345
us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster:a1b2c3d
us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster:main
us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster:latest
```

## Local Development

### Authenticate Docker

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### Build and Push Image

```bash
# Build image
docker build -t us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster:local .

# Push image
docker push us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster:local
```

### Pull Image

```bash
docker pull us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster:latest
```

## CI/CD Integration

### GitLab CI/CD Configuration

The `.gitlab-ci.yml` file includes Artifact Registry integration:

```yaml
build:
  stage: build
  image: docker:27.0.3
  services:
    - docker:27.0.3-dind
  before_script:
    # Authenticate to Artifact Registry
    - gcloud auth configure-docker us-central1-docker.pkg.dev --quiet
  script:
    # Build and push with multiple tags
    - docker build -t "$IMAGE_URI" .
    - docker push "$IMAGE_URI"
    - docker tag "$IMAGE_URI" "us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster:latest"
    - docker push "us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster:latest"
```

## Image Management

### List Images

```bash
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster \
  --project=northerntriberesearch
```

### List Tags for an Image

```bash
gcloud artifacts docker tags list \
  us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster \
  --project=northerntriberesearch
```

### Delete Specific Tag

```bash
gcloud artifacts docker images delete \
  us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster:TAG \
  --project=northerntriberesearch \
  --delete-tags
```

### Delete Old Images (Cleanup)

```bash
# Delete images older than 90 days
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster \
  --filter="createTime<$(date -d '90 days ago' --iso-8601)" \
  --format="value(package)" \
  --project=northerntriberesearch | \
  xargs -I {} gcloud artifacts docker images delete {} --quiet --project=northerntriberesearch
```

## Vulnerability Scanning

### Enable Scanning

Vulnerability scanning is automatically enabled for all images pushed to Artifact Registry.

### View Scan Results

```bash
# List vulnerabilities for an image
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster \
  --show-occurrences \
  --project=northerntriberesearch

# Get detailed vulnerability report
gcloud artifacts docker images describe \
  us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster:TAG \
  --show-all-metadata \
  --project=northerntriberesearch
```

### Vulnerability Severity Levels

- **CRITICAL**: Immediate action required
- **HIGH**: Fix within 7 days
- **MEDIUM**: Fix within 30 days
- **LOW**: Fix when convenient
- **MINIMAL**: Informational only

### Automated Scanning in CI/CD

The GitLab pipeline includes Trivy scanning before pushing to Artifact Registry:

```yaml
security:docker:
  stage: security-scan
  script:
    - trivy image --severity HIGH,CRITICAL --exit-code 0 "$IMAGE_NAME:test"
```

## Retention Policies

### Current Policy

- **Keep Minimum Versions**: 10
- **Keep Tagged Images**: Yes
- **Delete Untagged Images**: After 30 days

### Update Retention Policy

```bash
gcloud artifacts repositories set-cleanup-policies linguamaster \
  --location=us-central1 \
  --policy=keep-minimum-versions \
  --keep-minimum-versions=15 \
  --project=northerntriberesearch
```

## Access Control

### Repository-Level Permissions

| Role | Permissions | Use Case |
|------|-------------|----------|
| `artifactregistry.reader` | Pull images | Cloud Run, developers |
| `artifactregistry.writer` | Push and pull images | CI/CD pipelines |
| `artifactregistry.repoAdmin` | Full repository management | DevOps team |

### Grant Access to User

```bash
gcloud artifacts repositories add-iam-policy-binding linguamaster \
  --location=us-central1 \
  --member="user:developer@example.com" \
  --role="roles/artifactregistry.reader" \
  --project=northerntriberesearch
```

### Grant Access to Service Account

```bash
gcloud artifacts repositories add-iam-policy-binding linguamaster \
  --location=us-central1 \
  --member="serviceAccount:SERVICE_ACCOUNT@northerntriberesearch.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=northerntriberesearch
```

## Monitoring and Logging

### View Repository Metrics

```bash
# Storage usage
gcloud artifacts repositories describe linguamaster \
  --location=us-central1 \
  --project=northerntriberesearch

# Image count
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster \
  --project=northerntriberesearch | wc -l
```

### Audit Logs

View who pushed/pulled images:

```bash
gcloud logging read "resource.type=artifact_registry_repository AND resource.labels.repository_id=linguamaster" \
  --project=northerntriberesearch \
  --limit=50 \
  --format=json
```

### Set Up Alerts

Create alert for failed image pushes:

```bash
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Artifact Registry Push Failures" \
  --condition-display-name="Push failure rate > 5%" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s \
  --project=northerntriberesearch
```

## Cost Optimization

### Storage Costs

- **Storage**: $0.10 per GB per month
- **Network Egress**: Varies by region
- **Vulnerability Scanning**: Included

### Reduce Costs

1. **Implement Cleanup Policies**: Delete old unused images
2. **Use Multi-Stage Builds**: Reduce final image size
3. **Compress Layers**: Use Alpine base images
4. **Delete Untagged Images**: Remove intermediate build artifacts

### Monitor Costs

```bash
# View storage usage
gcloud artifacts repositories describe linguamaster \
  --location=us-central1 \
  --format="value(sizeBytes)" \
  --project=northerntriberesearch
```

## Disaster Recovery

### Backup Strategy

1. **Multi-Region Replication**: Not available in Artifact Registry (use Cloud Storage for backups)
2. **Export Images**: Periodically export critical images to Cloud Storage
3. **Tag Protection**: Never delete production tags

### Export Image to Cloud Storage

```bash
# Pull image
docker pull us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster:TAG

# Save to tar
docker save us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster:TAG -o linguamaster-TAG.tar

# Upload to Cloud Storage
gsutil cp linguamaster-TAG.tar gs://northerntriberesearch-backups/docker-images/
```

### Restore from Backup

```bash
# Download from Cloud Storage
gsutil cp gs://northerntriberesearch-backups/docker-images/linguamaster-TAG.tar .

# Load image
docker load -i linguamaster-TAG.tar

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster:TAG
```

## Troubleshooting

### Error: "Permission denied"

**Cause**: Insufficient permissions to push/pull images.

**Solution**:
```bash
# Check current permissions
gcloud artifacts repositories get-iam-policy linguamaster \
  --location=us-central1 \
  --project=northerntriberesearch

# Grant required permission
gcloud artifacts repositories add-iam-policy-binding linguamaster \
  --location=us-central1 \
  --member="user:YOUR_EMAIL" \
  --role="roles/artifactregistry.writer" \
  --project=northerntriberesearch
```

### Error: "Repository not found"

**Cause**: Repository doesn't exist or wrong region.

**Solution**:
```bash
# List repositories
gcloud artifacts repositories list \
  --location=us-central1 \
  --project=northerntriberesearch

# Create repository if missing
gcloud artifacts repositories create linguamaster \
  --repository-format=docker \
  --location=us-central1 \
  --project=northerntriberesearch
```

### Error: "Authentication failed"

**Cause**: Docker not authenticated to Artifact Registry.

**Solution**:
```bash
# Re-authenticate
gcloud auth configure-docker us-central1-docker.pkg.dev

# Verify authentication
docker pull us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster:latest
```

## Best Practices

1. **Always Tag Images**: Never rely solely on `latest` tag
2. **Use Semantic Versioning**: Tag releases with version numbers (v1.0.0)
3. **Scan Before Deploy**: Run vulnerability scans in CI/CD
4. **Implement Cleanup**: Regularly delete old unused images
5. **Monitor Storage**: Set up alerts for storage usage
6. **Audit Access**: Review IAM permissions quarterly
7. **Document Tags**: Maintain a changelog of image versions

## References

- [Artifact Registry Documentation](https://cloud.google.com/artifact-registry/docs)
- [Docker Image Management](https://cloud.google.com/artifact-registry/docs/docker)
- [Vulnerability Scanning](https://cloud.google.com/artifact-registry/docs/analysis)
- [IAM Permissions](https://cloud.google.com/artifact-registry/docs/access-control)

---

**Last Updated**: January 2024
**Maintained By**: DevOps Team
**Review Schedule**: Quarterly
