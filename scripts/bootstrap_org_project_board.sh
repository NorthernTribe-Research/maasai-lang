#!/usr/bin/env bash

set -euo pipefail

ORG="${1:-NorthernTribe-Research}"
REPO="${2:-NorthernTribe-Research/maasai-lang}"
PROJECT_TITLE="${3:-Maasai Lang - SOTA Delivery Board}"
MILESTONE_TITLE="${4:-SOTA Expansion Q2 2026}"

auth_status="$(gh auth status 2>/dev/null || true)"
if [[ "${auth_status}" != *"project"* || "${auth_status}" != *"read:project"* ]]; then
  echo "Missing required GitHub token scopes: project and read:project"
  echo "Run: gh auth refresh -s project,read:project,read:packages"
  exit 1
fi

echo "Creating org project in ${ORG}..."
project_number="$(
  gh project create --owner "${ORG}" --title "${PROJECT_TITLE}" --format json --jq ".number"
)"

echo "Configuring project metadata..."
gh project edit "${project_number}" \
  --owner "${ORG}" \
  --visibility PRIVATE \
  --description "Enterprise delivery board for ${REPO}. Tracks platform hardening, releases, security, and production readiness." \
  --readme "This board tracks prioritized execution for ${REPO}. Use Priority and Workstream fields to keep delivery focused."

echo "Linking repository ${REPO}..."
gh project link "${project_number}" --owner "${ORG}" --repo "${REPO}"

echo "Creating custom fields..."
gh project field-create "${project_number}" \
  --owner "${ORG}" \
  --name "Priority" \
  --data-type "SINGLE_SELECT" \
  --single-select-options "P0,P1,P2,P3" > /dev/null

gh project field-create "${project_number}" \
  --owner "${ORG}" \
  --name "Workstream" \
  --data-type "SINGLE_SELECT" \
  --single-select-options "Platform,Model,Data,Security,MLOps,Docs" > /dev/null

echo "Adding milestone issues from '${MILESTONE_TITLE}'..."
issue_urls="$(
  gh issue list -R "${REPO}" --milestone "${MILESTONE_TITLE}" --state open --json url --jq ".[].url" || true
)"

if [[ -n "${issue_urls}" ]]; then
  while IFS= read -r issue_url; do
    [[ -z "${issue_url}" ]] && continue
    gh project item-add "${project_number}" --owner "${ORG}" --url "${issue_url}" > /dev/null
    echo "  added ${issue_url}"
  done <<< "${issue_urls}"
else
  echo "  no open milestone issues found to add."
fi

echo "Project board ready:"
echo "https://github.com/orgs/${ORG}/projects/${project_number}"
