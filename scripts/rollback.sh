#!/bin/bash

###############################################################################
# Rollback Script for LinguaMaster Cloud Run Deployment
#
# This script performs a quick rollback to a previous deployment version.
# Target: Complete rollback within 5 minutes
#
# Usage:
#   ./scripts/rollback.sh [OPTIONS]
#
# Options:
#   -e, --environment ENV    Environment to rollback (staging|production)
#   -v, --version VERSION    Specific version to rollback to (optional)
#   -r, --reason REASON      Reason for rollback (required)
#   -h, --help               Show this help message
#
# Examples:
#   ./scripts/rollback.sh -e production -r "High error rate detected"
#   ./scripts/rollback.sh -e staging -v a1b2c3d-12345 -r "Failed smoke tests"
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="northerntriberesearch"
REGION="us-central1"
SERVICE_NAME="linguamaster"
ARTIFACT_REGISTRY="us-central1-docker.pkg.dev"
REPOSITORY="linguamaster"
IMAGE_NAME="linguamaster"

# Default values
ENVIRONMENT=""
VERSION=""
REASON=""
DRY_RUN=false

###############################################################################
# Helper Functions
###############################################################################

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
  head -n 25 "$0" | tail -n 20
  exit 0
}

###############################################################################
# Parse Arguments
###############################################################################

while [[ $# -gt 0 ]]; do
  case $1 in
    -e|--environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    -v|--version)
      VERSION="$2"
      shift 2
      ;;
    -r|--reason)
      REASON="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      show_help
      ;;
    *)
      log_error "Unknown option: $1"
      show_help
      ;;
  esac
done

###############################################################################
# Validation
###############################################################################

if [[ -z "$ENVIRONMENT" ]]; then
  log_error "Environment is required. Use -e staging or -e production"
  exit 1
fi

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  log_error "Environment must be 'staging' or 'production'"
  exit 1
fi

if [[ -z "$REASON" ]]; then
  log_error "Rollback reason is required. Use -r 'reason for rollback'"
  exit 1
fi

# Set service name based on environment
if [[ "$ENVIRONMENT" == "staging" ]]; then
  FULL_SERVICE_NAME="${SERVICE_NAME}-staging"
else
  FULL_SERVICE_NAME="$SERVICE_NAME"
fi

###############################################################################
# Pre-Rollback Checks
###############################################################################

log_info "Starting rollback process for $ENVIRONMENT environment"
log_info "Reason: $REASON"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  log_error "gcloud CLI is not installed"
  exit 1
fi

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
  log_error "Not authenticated to gcloud. Run: gcloud auth login"
  exit 1
fi

# Set project
log_info "Setting GCP project to $PROJECT_ID"
gcloud config set project "$PROJECT_ID" --quiet

###############################################################################
# Get Current and Previous Versions
###############################################################################

log_info "Fetching current deployment information..."

# Get current revision
CURRENT_REVISION=$(gcloud run services describe "$FULL_SERVICE_NAME" \
  --region="$REGION" \
  --format="value(status.latestReadyRevisionName)" 2>/dev/null || echo "")

if [[ -z "$CURRENT_REVISION" ]]; then
  log_error "Could not find current revision for service $FULL_SERVICE_NAME"
  exit 1
fi

log_info "Current revision: $CURRENT_REVISION"

# Get current image
CURRENT_IMAGE=$(gcloud run services describe "$FULL_SERVICE_NAME" \
  --region="$REGION" \
  --format="value(spec.template.spec.containers[0].image)" 2>/dev/null || echo "")

log_info "Current image: $CURRENT_IMAGE"

# Get all revisions (sorted by creation time, newest first)
log_info "Fetching revision history..."
REVISIONS=$(gcloud run revisions list \
  --service="$FULL_SERVICE_NAME" \
  --region="$REGION" \
  --format="value(metadata.name)" \
  --sort-by="~metadata.creationTimestamp" \
  --limit=10)

# Convert to array
REVISION_ARRAY=()
while IFS= read -r line; do
  REVISION_ARRAY+=("$line")
done <<< "$REVISIONS"

if [[ ${#REVISION_ARRAY[@]} -lt 2 ]]; then
  log_error "Not enough revisions to rollback. Need at least 2 revisions."
  exit 1
fi

# If version not specified, use previous revision
if [[ -z "$VERSION" ]]; then
  PREVIOUS_REVISION="${REVISION_ARRAY[1]}"
  log_info "No version specified, using previous revision: $PREVIOUS_REVISION"
else
  # Find revision with specified version
  PREVIOUS_REVISION=""
  for rev in "${REVISION_ARRAY[@]}"; do
    if [[ "$rev" == *"$VERSION"* ]]; then
      PREVIOUS_REVISION="$rev"
      break
    fi
  done
  
  if [[ -z "$PREVIOUS_REVISION" ]]; then
    log_error "Could not find revision with version: $VERSION"
    log_info "Available revisions:"
    printf '%s\n' "${REVISION_ARRAY[@]}"
    exit 1
  fi
  
  log_info "Found revision for version $VERSION: $PREVIOUS_REVISION"
fi

# Get previous image
PREVIOUS_IMAGE=$(gcloud run revisions describe "$PREVIOUS_REVISION" \
  --region="$REGION" \
  --format="value(spec.containers[0].image)" 2>/dev/null || echo "")

if [[ -z "$PREVIOUS_IMAGE" ]]; then
  log_error "Could not get image for revision: $PREVIOUS_REVISION"
  exit 1
fi

log_info "Previous image: $PREVIOUS_IMAGE"

###############################################################################
# Confirmation
###############################################################################

echo ""
log_warning "=== ROLLBACK SUMMARY ==="
echo "Environment:       $ENVIRONMENT"
echo "Service:           $FULL_SERVICE_NAME"
echo "Current Revision:  $CURRENT_REVISION"
echo "Current Image:     $CURRENT_IMAGE"
echo "Rollback To:       $PREVIOUS_REVISION"
echo "Rollback Image:    $PREVIOUS_IMAGE"
echo "Reason:            $REASON"
echo ""

if [[ "$DRY_RUN" == true ]]; then
  log_info "DRY RUN MODE - No changes will be made"
  exit 0
fi

if [[ "$ENVIRONMENT" == "production" ]]; then
  log_warning "This will rollback PRODUCTION environment!"
  read -p "Type 'ROLLBACK' to confirm: " CONFIRM
  if [[ "$CONFIRM" != "ROLLBACK" ]]; then
    log_error "Rollback cancelled"
    exit 1
  fi
fi

###############################################################################
# Execute Rollback
###############################################################################

ROLLBACK_START=$(date +%s)

log_info "Starting rollback..."

# Update service to use previous revision's image
log_info "Updating service to previous image..."
gcloud run services update "$FULL_SERVICE_NAME" \
  --region="$REGION" \
  --image="$PREVIOUS_IMAGE" \
  --quiet

log_success "Service updated to previous image"

# Wait for deployment to complete
log_info "Waiting for deployment to stabilize..."
sleep 10

# Verify new revision is ready
NEW_REVISION=$(gcloud run services describe "$FULL_SERVICE_NAME" \
  --region="$REGION" \
  --format="value(status.latestReadyRevisionName)")

log_info "New active revision: $NEW_REVISION"

###############################################################################
# Health Check
###############################################################################

log_info "Performing health check..."

SERVICE_URL=$(gcloud run services describe "$FULL_SERVICE_NAME" \
  --region="$REGION" \
  --format="value(status.url)")

HEALTH_URL="${SERVICE_URL}/api/health"

# Try health check up to 5 times
HEALTH_CHECK_PASSED=false
for i in {1..5}; do
  log_info "Health check attempt $i/5..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
  
  if [[ "$HTTP_CODE" == "200" ]]; then
    HEALTH_CHECK_PASSED=true
    log_success "Health check passed (HTTP $HTTP_CODE)"
    break
  else
    log_warning "Health check failed (HTTP $HTTP_CODE), retrying in 5 seconds..."
    sleep 5
  fi
done

if [[ "$HEALTH_CHECK_PASSED" == false ]]; then
  log_error "Health check failed after 5 attempts"
  log_error "Service may be unhealthy. Manual intervention required."
  exit 1
fi

###############################################################################
# Traffic Routing
###############################################################################

log_info "Routing 100% traffic to rolled back revision..."

gcloud run services update-traffic "$FULL_SERVICE_NAME" \
  --region="$REGION" \
  --to-latest \
  --quiet

log_success "Traffic routed to rolled back revision"

###############################################################################
# Logging and Notification
###############################################################################

ROLLBACK_END=$(date +%s)
ROLLBACK_DURATION=$((ROLLBACK_END - ROLLBACK_START))

# Log rollback event
ROLLBACK_LOG_FILE="rollback-$(date +%Y%m%d-%H%M%S).log"
cat > "$ROLLBACK_LOG_FILE" <<EOF
Rollback Event Log
==================
Timestamp:         $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Environment:       $ENVIRONMENT
Service:           $FULL_SERVICE_NAME
Region:            $REGION
Reason:            $REASON
Duration:          ${ROLLBACK_DURATION}s

Previous State:
  Revision:        $CURRENT_REVISION
  Image:           $CURRENT_IMAGE

Rolled Back To:
  Revision:        $NEW_REVISION
  Image:           $PREVIOUS_IMAGE

Health Check:      PASSED
Status:            SUCCESS
EOF

log_info "Rollback log saved to: $ROLLBACK_LOG_FILE"

# Send notification (if webhook configured)
if [[ -n "${ROLLBACK_WEBHOOK_URL:-}" ]]; then
  log_info "Sending rollback notification..."
  curl -X POST "$ROLLBACK_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"text\": \"🔄 Rollback Completed\",
      \"environment\": \"$ENVIRONMENT\",
      \"service\": \"$FULL_SERVICE_NAME\",
      \"reason\": \"$REASON\",
      \"duration\": \"${ROLLBACK_DURATION}s\",
      \"from_revision\": \"$CURRENT_REVISION\",
      \"to_revision\": \"$NEW_REVISION\",
      \"status\": \"success\"
    }" \
    --silent --output /dev/null || log_warning "Failed to send notification"
fi

###############################################################################
# Summary
###############################################################################

echo ""
log_success "=== ROLLBACK COMPLETED SUCCESSFULLY ==="
echo "Environment:       $ENVIRONMENT"
echo "Service URL:       $SERVICE_URL"
echo "Duration:          ${ROLLBACK_DURATION}s"
echo "Previous Revision: $CURRENT_REVISION"
echo "Current Revision:  $NEW_REVISION"
echo "Health Check:      PASSED"
echo ""
log_info "Monitor the service for the next 15-30 minutes to ensure stability"
log_info "Check logs: gcloud run services logs read $FULL_SERVICE_NAME --region=$REGION"
echo ""

exit 0
