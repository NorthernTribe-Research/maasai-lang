#!/bin/bash
# High-speed Bucket Creation and Sync using the official `hf` Xet-based CLI
# Reference: https://github.com/huggingface/hf-mount

BUCKET_NAME=$1
SYNC_DIR=$2

if [ -z "$BUCKET_NAME" ] || [ -z "$SYNC_DIR" ]; then
  echo "Usage: ./hf_sync_bucket.sh <bucket-namespace/bucket-name> <local-directory-to-sync>"
  echo "Example: ./hf_sync_bucket.sh NorthernTribe-Research/maasai-checkpoints ./outputs/"
  exit 1
fi

echo "Creating Hugging Face Storage Bucket: $BUCKET_NAME"
# Creates the storage bucket via the new fast `hf` CLI
if ! command -v hf >/dev/null 2>&1; then
  echo "The \`hf\` CLI is not installed."
  echo "Fallback: python scripts/create_hf_bucket.py \"$BUCKET_NAME\" --source-dir \"$SYNC_DIR\" --execute"
  exit 1
fi
hf buckets create "$BUCKET_NAME"

echo "Syncing local directory $SYNC_DIR to hf://buckets/$BUCKET_NAME"
# Syncs massive datasets/checkpoints using smart Xet deduplication
hf sync "$SYNC_DIR" "hf://buckets/$BUCKET_NAME"

echo "Done!"
