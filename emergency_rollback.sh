#!/bin/bash
# EMERGENCY ROLLBACK - Super Admin Login Fix
# Date: 2026-02-10
# Backup: /var/www/frontend/.next.backup_20260210_154452
# Previous BUILD_ID: 9v14g-w2CmUPRNt5xWNl_

set -e

PEM="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
PROD="ubuntu@13.126.210.220"

echo "🔄 EMERGENCY ROLLBACK INITIATED"
echo "================================"
echo ""

ssh -i "$PEM" "$PROD" 'bash -s' <<'EOF'
set -e
LIVE=/var/www/frontend
TS=$(date +%Y%m%d_%H%M%S)

echo "Step 1: Finding backup..."
BACKUP=/var/www/frontend/.next.backup_20260210_154452

if [ ! -d "$BACKUP" ]; then
  echo "❌ ERROR: Backup not found at $BACKUP"
  echo "Available backups:"
  ls -1d $LIVE/.next.backup* $LIVE/.next.prev_* 2>/dev/null || echo "  None found"
  exit 1
fi

BACKUP_BUILD=$(cat "$BACKUP/BUILD_ID" 2>/dev/null || echo "unknown")
echo "✓ Found backup with BUILD_ID: $BACKUP_BUILD"

echo ""
echo "Step 2: Moving current build aside..."
if [ -d "$LIVE/.next" ]; then
  sudo mv "$LIVE/.next" "$LIVE/.next.failed_${TS}"
  echo "✓ Moved to .next.failed_${TS}"
fi

echo ""
echo "Step 3: Restoring backup..."
sudo mv "$BACKUP" "$LIVE/.next"
echo "✓ Backup restored"

echo ""
echo "Step 4: Fixing permissions..."
sudo chown -R ubuntu:ubuntu "$LIVE/.next"
sudo find "$LIVE/.next" -type d -exec chmod u+rwx,go+rx {} + 2>/dev/null
echo "✓ Permissions fixed"

echo ""
echo "Step 5: Restarting PM2..."
pm2 restart qsights-frontend
sleep 3
echo "✓ PM2 restarted"

echo ""
echo "================================"
echo "✅ ROLLBACK COMPLETE"
echo "================================"
echo ""
echo "Live BUILD_ID: $(cat $LIVE/.next/BUILD_ID)"
echo ""
echo "Status Checks:"
echo -n "  HTTP /: "
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/ || echo "FAILED"
echo -n "  HTTP /dashboard: "
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/dashboard || echo "FAILED"
echo ""
pm2 list | grep qsights-frontend || true
echo ""
echo "⚠️  TEST NOW: https://prod.qsights.com"
EOF

echo ""
echo "================================"
echo "Rollback executed successfully!"
echo "Please test the site immediately."
echo "================================"
