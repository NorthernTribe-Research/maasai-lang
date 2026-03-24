#!/usr/bin/env bash
# Create secrets in Google Secret Manager for LinguaMaster
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-northerntriberesearch}"

echo "[*] Creating secrets in Google Secret Manager"
echo "[*] Project: ${PROJECT_ID}"

gcloud config set project "${PROJECT_ID}"

# Function to create or update secret
create_secret() {
  local SECRET_NAME=$1
  local SECRET_VALUE=$2
  
  # Check if secret exists
  if gcloud secrets describe "${SECRET_NAME}" &>/dev/null; then
    echo "[*] Updating existing secret: ${SECRET_NAME}"
    echo -n "${SECRET_VALUE}" | gcloud secrets versions add "${SECRET_NAME}" --data-file=-
  else
    echo "[*] Creating new secret: ${SECRET_NAME}"
    echo -n "${SECRET_VALUE}" | gcloud secrets create "${SECRET_NAME}" --data-file=-
  fi
}

# Generate secure secrets if not provided
generate_secret() {
  openssl rand -base64 32
}

# Prompt for secrets or use environment variables
echo ""
echo "Enter secrets (or press Enter to use environment variables):"
echo ""

read -p "DATABASE_URL [${DATABASE_URL}]: " INPUT_DATABASE_URL
DATABASE_URL="${INPUT_DATABASE_URL:-${DATABASE_URL}}"

read -p "GEMINI_API_KEY [${GEMINI_API_KEY}]: " INPUT_GEMINI_API_KEY
GEMINI_API_KEY="${INPUT_GEMINI_API_KEY:-${GEMINI_API_KEY}}"

read -p "OPENAI_API_KEY [${OPENAI_API_KEY}]: " INPUT_OPENAI_API_KEY
OPENAI_API_KEY="${INPUT_OPENAI_API_KEY:-${OPENAI_API_KEY}}"

# Generate SESSION_SECRET if not provided
if [ -z "${SESSION_SECRET:-}" ]; then
  echo "[*] Generating SESSION_SECRET..."
  SESSION_SECRET=$(generate_secret)
fi

# Generate JWT_SECRET if not provided
if [ -z "${JWT_SECRET:-}" ]; then
  echo "[*] Generating JWT_SECRET..."
  JWT_SECRET=$(generate_secret)
fi

read -p "STRIPE_SECRET_KEY (optional) [${STRIPE_SECRET_KEY:-}]: " INPUT_STRIPE_SECRET_KEY
STRIPE_SECRET_KEY="${INPUT_STRIPE_SECRET_KEY:-${STRIPE_SECRET_KEY:-}}"

# Create secrets
echo ""
echo "[*] Creating secrets..."

if [ -n "${DATABASE_URL}" ]; then
  create_secret "DATABASE_URL" "${DATABASE_URL}"
fi

if [ -n "${GEMINI_API_KEY}" ]; then
  create_secret "GEMINI_API_KEY" "${GEMINI_API_KEY}"
fi

if [ -n "${OPENAI_API_KEY}" ]; then
  create_secret "OPENAI_API_KEY" "${OPENAI_API_KEY}"
fi

create_secret "SESSION_SECRET" "${SESSION_SECRET}"
create_secret "JWT_SECRET" "${JWT_SECRET}"

if [ -n "${STRIPE_SECRET_KEY}" ]; then
  create_secret "STRIPE_SECRET_KEY" "${STRIPE_SECRET_KEY}"
fi

echo ""
echo "[+] Secrets created successfully!"
echo ""
echo "[i] Generated secrets (save these securely):"
echo "    SESSION_SECRET=${SESSION_SECRET}"
echo "    JWT_SECRET=${JWT_SECRET}"
echo ""
