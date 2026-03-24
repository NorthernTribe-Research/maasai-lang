#!/usr/bin/env bash

set -euo pipefail

HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:5000/api/health}"
WEBHOOK_URL="${UPTIME_ALERT_WEBHOOK_URL:-}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-5}"

HTTP_CODE="$(curl -s -m "$TIMEOUT_SECONDS" -o /tmp/linguamaster_uptime_body.json -w '%{http_code}' "$HEALTH_URL" || true)"

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "[uptime] healthy ($HEALTH_URL)"
  exit 0
fi

ALERT_MSG="[uptime] unhealthy: ${HEALTH_URL} returned ${HTTP_CODE:-none} at $(date -Iseconds)"
echo "$ALERT_MSG"

if [[ -n "$WEBHOOK_URL" ]]; then
  curl -s -X POST "$WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"$ALERT_MSG\"}" >/dev/null || true
fi

exit 1
