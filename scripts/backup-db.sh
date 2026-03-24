#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required"
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT_FILE="${BACKUP_DIR}/linguamaster_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[backup] Creating backup at $OUTPUT_FILE"
pg_dump "$DATABASE_URL" --format=plain --no-owner --no-privileges | gzip > "$OUTPUT_FILE"

echo "[backup] Pruning backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -name 'linguamaster_*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "[backup] Complete: $OUTPUT_FILE"
