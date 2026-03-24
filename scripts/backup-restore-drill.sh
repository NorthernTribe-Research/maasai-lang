#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required"
  exit 1
fi

if [[ -z "${DRILL_DATABASE_URL:-}" ]]; then
  echo "DRILL_DATABASE_URL is required"
  exit 1
fi

BACKUP_PATH="$(DATABASE_URL="$DATABASE_URL" bash scripts/backup-db.sh | tail -n1 | awk '{print $NF}')"

if [[ -z "$BACKUP_PATH" || ! -f "$BACKUP_PATH" ]]; then
  echo "Backup drill failed: backup artifact not found"
  exit 1
fi

bash scripts/restore-db.sh "$BACKUP_PATH" "$DRILL_DATABASE_URL"

TABLE_COUNT="$(psql "$DRILL_DATABASE_URL" -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")"
if [[ -z "$TABLE_COUNT" || "$TABLE_COUNT" == "0" ]]; then
  echo "Backup drill failed: restored database appears empty"
  exit 1
fi

echo "[drill] Backup/restore drill complete. Public table count: $TABLE_COUNT"
