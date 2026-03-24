#!/usr/bin/env bash

set -euo pipefail

IMAGE_TAG="linguamaster:staging-$(date +%Y%m%d%H%M%S)"
CONTAINER_NAME="linguamaster-staging"
ENV_FILE=".env"
PORT="5001"
SKIP_BUILD="false"
RUN_MIGRATIONS="true"
TIMEOUT_SECONDS="90"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image)
      IMAGE_TAG="$2"
      shift 2
      ;;
    --container)
      CONTAINER_NAME="$2"
      shift 2
      ;;
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD="true"
      shift
      ;;
    --skip-migrations)
      RUN_MIGRATIONS="false"
      shift
      ;;
    --timeout)
      TIMEOUT_SECONDS="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE"
  exit 1
fi

RUNTIME_ENV_FILE="$(mktemp /tmp/linguamaster-staging-env.XXXXXX)"
cp "$ENV_FILE" "$RUNTIME_ENV_FILE"
if grep -q '^DATABASE_URL=' "$RUNTIME_ENV_FILE"; then
  sed -i 's/@localhost:/@127.0.0.1:/g; s/@\[::1\]:/@127.0.0.1:/g' "$RUNTIME_ENV_FILE"
fi
trap 'rm -f "$RUNTIME_ENV_FILE"' EXIT

DATABASE_URL_VALUE="$(grep -E '^DATABASE_URL=' "$RUNTIME_ENV_FILE" | head -n1 | cut -d'=' -f2- || true)"

CURRENT_IMAGE_FILE=".staging-current-image"
PREVIOUS_IMAGE_FILE=".staging-previous-image"
CONFIG_FILE=".staging-config"

if [[ "$SKIP_BUILD" != "true" ]]; then
  echo "[staging] Building image $IMAGE_TAG"
  docker build -t "$IMAGE_TAG" .
else
  echo "[staging] Skipping build, using existing image $IMAGE_TAG"
fi

if ! docker image inspect "$IMAGE_TAG" >/dev/null 2>&1; then
  echo "Image not found: $IMAGE_TAG"
  exit 1
fi

if [[ -f "$CURRENT_IMAGE_FILE" ]]; then
  CURRENT_IMAGE="$(cat "$CURRENT_IMAGE_FILE")"
  if docker image inspect "$CURRENT_IMAGE" >/dev/null 2>&1; then
    echo "$CURRENT_IMAGE" > "$PREVIOUS_IMAGE_FILE"
    echo "[staging] Saved previous image: $CURRENT_IMAGE"
  fi
fi

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "[staging] Stopping existing container $CONTAINER_NAME"
  docker stop "$CONTAINER_NAME" >/dev/null || true
  docker rm "$CONTAINER_NAME" >/dev/null || true
fi

if [[ "$RUN_MIGRATIONS" == "true" ]]; then
  if [[ -z "$DATABASE_URL_VALUE" ]]; then
    echo "[staging] DATABASE_URL is missing; cannot run migrations"
    exit 1
  fi
  echo "[staging] Running database migrations"
  DATABASE_URL="$DATABASE_URL_VALUE" npm run db:push >/dev/null
fi

echo "[staging] Starting container $CONTAINER_NAME from $IMAGE_TAG"
docker run -d \
  --name "$CONTAINER_NAME" \
  --network host \
  --env-file "$RUNTIME_ENV_FILE" \
  -e NODE_ENV=production \
  -e PORT="$PORT" \
  "$IMAGE_TAG" >/dev/null

echo "CONTAINER_NAME=$CONTAINER_NAME" > "$CONFIG_FILE"
echo "ENV_FILE=$ENV_FILE" >> "$CONFIG_FILE"
echo "PORT=$PORT" >> "$CONFIG_FILE"

echo "[staging] Waiting for health endpoint on http://127.0.0.1:${PORT}/api/health"
START_TIME=$(date +%s)
while true; do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/api/health" || true)"
  if [[ "$CODE" == "200" ]]; then
    break
  fi

  NOW=$(date +%s)
  ELAPSED=$((NOW - START_TIME))
  if (( ELAPSED > TIMEOUT_SECONDS )); then
    echo "[staging] Health check timed out (last status: ${CODE:-none})"
    docker logs --tail 200 "$CONTAINER_NAME" || true
    exit 1
  fi
  sleep 2
done

echo "$IMAGE_TAG" > "$CURRENT_IMAGE_FILE"
echo "[staging] Deploy successful: $IMAGE_TAG"
