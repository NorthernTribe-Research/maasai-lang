#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-file> [target-database-url]"
  exit 1
fi

BACKUP_FILE="$1"
TARGET_DATABASE_URL="${2:-${DATABASE_URL:-}}"

if [[ -z "$TARGET_DATABASE_URL" ]]; then
  echo "Target database URL is required (arg2 or DATABASE_URL)"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "[restore] Restoring $BACKUP_FILE"
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" \
    | sed '/^SET transaction_timeout = 0;$/d' \
    | psql "$TARGET_DATABASE_URL"
else
  sed '/^SET transaction_timeout = 0;$/d' "$BACKUP_FILE" | psql "$TARGET_DATABASE_URL"
fi

echo "[restore] Restore complete"
