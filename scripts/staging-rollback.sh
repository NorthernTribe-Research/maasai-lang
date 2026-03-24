#!/usr/bin/env bash

set -euo pipefail

CURRENT_IMAGE_FILE=".staging-current-image"
PREVIOUS_IMAGE_FILE=".staging-previous-image"
CONFIG_FILE=".staging-config"

if [[ ! -f "$PREVIOUS_IMAGE_FILE" ]]; then
  echo "No previous image metadata found at $PREVIOUS_IMAGE_FILE"
  exit 1
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Missing staging config file: $CONFIG_FILE"
  exit 1
fi

# shellcheck disable=SC1090
source "$CONFIG_FILE"

RUNTIME_ENV_FILE="$(mktemp /tmp/linguamaster-staging-env.XXXXXX)"
cp "$ENV_FILE" "$RUNTIME_ENV_FILE"
if grep -q '^DATABASE_URL=' "$RUNTIME_ENV_FILE"; then
  sed -i 's/@localhost:/@127.0.0.1:/g; s/@\[::1\]:/@127.0.0.1:/g' "$RUNTIME_ENV_FILE"
fi
trap 'rm -f "$RUNTIME_ENV_FILE"' EXIT

ROLLBACK_IMAGE="$(cat "$PREVIOUS_IMAGE_FILE")"
CURRENT_IMAGE=""
if [[ -f "$CURRENT_IMAGE_FILE" ]]; then
  CURRENT_IMAGE="$(cat "$CURRENT_IMAGE_FILE")"
fi

if ! docker image inspect "$ROLLBACK_IMAGE" >/dev/null 2>&1; then
  echo "Rollback image not available locally: $ROLLBACK_IMAGE"
  exit 1
fi

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "[rollback] Stopping current container $CONTAINER_NAME"
  docker stop "$CONTAINER_NAME" >/dev/null || true
  docker rm "$CONTAINER_NAME" >/dev/null || true
fi

echo "[rollback] Starting rollback image: $ROLLBACK_IMAGE"
docker run -d \
  --name "$CONTAINER_NAME" \
  --network host \
  --env-file "$RUNTIME_ENV_FILE" \
  -e NODE_ENV=production \
  -e PORT="$PORT" \
  "$ROLLBACK_IMAGE" >/dev/null

echo "[rollback] Waiting for health endpoint on http://127.0.0.1:${PORT}/api/health"
START_TIME=$(date +%s)
TIMEOUT_SECONDS=90
while true; do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/api/health" || true)"
  if [[ "$CODE" == "200" ]]; then
    break
  fi

  NOW=$(date +%s)
  ELAPSED=$((NOW - START_TIME))
  if (( ELAPSED > TIMEOUT_SECONDS )); then
    echo "[rollback] Health check timed out (last status: ${CODE:-none})"
    docker logs --tail 200 "$CONTAINER_NAME" || true
    exit 1
  fi
  sleep 2
done

if [[ -n "$CURRENT_IMAGE" ]]; then
  echo "$CURRENT_IMAGE" > "$PREVIOUS_IMAGE_FILE"
fi
echo "$ROLLBACK_IMAGE" > "$CURRENT_IMAGE_FILE"

echo "[rollback] Rollback successful to $ROLLBACK_IMAGE"
