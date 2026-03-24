#!/usr/bin/env bash
# Manual deployment script for LinguaMaster to Google Cloud Run
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-northerntriberesearch}"
REGION="${REGION:-us-central1}"
REPOSITORY="${REPOSITORY:-linguamaster}"
SERVICE="${SERVICE:-linguamaster}"
IMAGE_NAME="${IMAGE_NAME:-linguamaster}"
TAG="${TAG:-manual-$(date +%Y%m%d-%H%M%S)}"
ENVIRONMENT="${ENVIRONMENT:-production}"

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}:${TAG}"

echo "[*] LinguaMaster Manual Deployment"
echo "[*] Project: ${PROJECT_ID}"
echo "[*] Region: ${REGION}"
echo "[*] Environment: ${ENVIRONMENT}"
echo "[*] Image: ${IMAGE_URI}"
echo ""

# Set project
gcloud config set project "${PROJECT_ID}"

# Configure Docker authentication
echo "[*] Configuring Docker authentication..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# Build Docker image
echo "[*] Building Docker image..."
docker build -t "${IMAGE_URI}" .

# Push to Artifact Registry
echo "[*] Pushing image to Artifact Registry..."
docker push "${IMAGE_URI}"

# Also tag as latest
docker tag "${IMAGE_URI}" "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}:latest"
docker push "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}:latest"

# Deploy to Cloud Run
echo "[*] Deploying to Cloud Run..."

if [ "${ENVIRONMENT}" = "production" ]; then
  SERVICE_NAME="${SERVICE}"
  PRIMARY_DOMAIN="linguamaster.ai"
  SECONDARY_DOMAIN="linguamaster.ntr-kenya.com"
  MIN_INSTANCES=1
  MAX_INSTANCES=10
  MEMORY="2Gi"
  CPU=2
else
  SERVICE_NAME="${SERVICE}-staging"
  PRIMARY_DOMAIN="staging.linguamaster.ai"
  SECONDARY_DOMAIN="staging.linguamaster.ntr-kenya.com"
  MIN_INSTANCES=0
  MAX_INSTANCES=5
  MEMORY="1Gi"
  CPU=1
fi

gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_URI}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory "${MEMORY}" \
  --cpu "${CPU}" \
  --min-instances "${MIN_INSTANCES}" \
  --max-instances "${MAX_INSTANCES}" \
  --timeout 300 \
  --set-env-vars NODE_ENV="${ENVIRONMENT}" \
  --set-env-vars PRIMARY_DOMAIN="${PRIMARY_DOMAIN}" \
  --set-env-vars SECONDARY_DOMAIN="${SECONDARY_DOMAIN}" \
  --set-env-vars APP_NAME=LinguaMaster \
  --set-secrets DATABASE_URL=DATABASE_URL:latest \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-secrets OPENAI_API_KEY=OPENAI_API_KEY:latest \
  --set-secrets SESSION_SECRET=SESSION_SECRET:latest \
  --set-secrets JWT_SECRET=JWT_SECRET:latest \
  --set-secrets STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest

# Get service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --format 'value(status.url)')

echo ""
echo "[+] Deployment complete!"
echo "[i] Service URL: ${SERVICE_URL}"
echo "[i] Image: ${IMAGE_URI}"
echo ""
echo "[i] Test the deployment:"
echo "    curl ${SERVICE_URL}/api/health"
echo ""
