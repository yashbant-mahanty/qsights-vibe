#!/bin/bash

# QSights 2.0 — Prod Approval Script
# Creates release/PROD_APPROVAL.txt for the current commit after pre-prod checks.

set -euo pipefail

APPROVAL_DIR="release"
APPROVAL_FILE="$APPROVAL_DIR/PROD_APPROVAL.txt"

mkdir -p "$APPROVAL_DIR"

COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || true)
if [ -z "${COMMIT_SHA}" ]; then
  echo "ERROR: run from a git checkout (cannot read commit SHA)" >&2
  exit 1
fi

echo "Running pre-prod verification..."
./scripts/verify_preprod.sh

echo ""
read -p "Approve this commit for Production? Type 'APPROVE' to continue: " CONFIRM
if [ "$CONFIRM" != "APPROVE" ]; then
  echo "Approval cancelled."
  exit 1
fi

UTC_NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
cat > "$APPROVAL_FILE" <<EOF
QSights 2.0 — Production Approval

Commit: $COMMIT_SHA
Approved (UTC): $UTC_NOW

Checklist (must be true):
- Pre-Prod deployment completed for this commit
- Auth verified
- Reports verified
- Scheduler verified (cron)
- Media /storage verified
- Notifications verified (queue + provider)
- Permissions verified

Approver: __________________________
Notes:
- 
EOF

echo ""
echo "Approval written: $APPROVAL_FILE"
echo "Next: run production deploy scripts. They will enforce this approval + pre-prod gate."
