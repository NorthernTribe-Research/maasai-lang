#!/usr/bin/env bash
# Setup Google Cloud resources for LinguaMaster deployment
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-northerntriberesearch}"
REGION="${REGION:-us-central1}"
REPOSITORY="${REPOSITORY:-linguamaster}"
SERVICE_ACCOUNT_NAME="${SERVICE_ACCOUNT_NAME:-gitlab-linguamaster-deployer}"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "[*] Setting up Google Cloud resources for LinguaMaster"
echo "[*] Project: ${PROJECT_ID}"
echo "[*] Region: ${REGION}"

# Set project
gcloud config set project "${PROJECT_ID}"

# Enable required APIs
echo "[*] Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudbuild.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudresourcemanager.googleapis.com

# Create Artifact Registry repository
echo "[*] Creating Artifact Registry repository..."
gcloud artifacts repositories create "${REPOSITORY}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Container images for LinguaMaster" || echo "Repository already exists"

# Create service account for GitLab CI/CD
echo "[*] Creating service account for GitLab CI/CD..."
gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" \
  --display-name="GitLab LinguaMaster Deployer" || echo "Service account already exists"

# Grant necessary permissions
echo "[*] Granting permissions to service account..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

echo ""
echo "[+] Base resources created successfully!"
echo ""
echo "[i] Next steps:"
echo "    1. Configure Workload Identity Federation provider for GitLab"
echo "    2. Set the following GitLab CI/CD variables:"
echo "       GCP_PROJECT_ID=${PROJECT_ID}"
echo "       GCP_REGION=${REGION}"
echo "       GCP_WIF_PROVIDER=projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID"
echo "       GCP_SERVICE_ACCOUNT=${SERVICE_ACCOUNT_EMAIL}"
echo "    3. Create secrets in Google Secret Manager:"
echo "       - DATABASE_URL"
echo "       - GEMINI_API_KEY"
echo "       - OPENAI_API_KEY"
echo "       - SESSION_SECRET"
echo "       - JWT_SECRET"
echo "       - STRIPE_SECRET_KEY (optional)"
echo ""
