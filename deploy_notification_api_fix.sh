#!/bin/bash

# CRITICAL FIX: Correct API endpoint paths for notification logs
# Date: 18 January 2026
# Issue: Frontend was calling /notification-logs but backend expects /notifications/logs

set -e

PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SSH_PORT="3389"
SERVER="127.0.0.1"

echo "🚨 CRITICAL FIX: Correcting notification API endpoints..."
echo ""

# Deploy api.ts file
echo "📦 Deploying api.ts..."
scp -P ${SSH_PORT} -i ${PEM_KEY} \
  /Users/yash/Documents/Projects/QSightsOrg2.0/frontend/lib/api.ts \
  ubuntu@${SERVER}:/tmp/api.ts

ssh -p ${SSH_PORT} -i ${PEM_KEY} ubuntu@${SERVER} \
  "sudo mv /tmp/api.ts /var/www/QSightsOrg2.0/frontend/lib/api.ts && \
   sudo chown ubuntu:ubuntu /var/www/QSightsOrg2.0/frontend/lib/api.ts"

echo "✅ API file deployed"
echo ""

# Build Frontend
echo "🏗️  Building frontend..."
ssh -p ${SSH_PORT} -i ${PEM_KEY} ubuntu@${SERVER} \
  "cd /var/www/QSightsOrg2.0/frontend && npm run build"

echo "✅ Frontend built"
echo ""

# Clear Cache
echo "🧹 Clearing cache..."
ssh -p ${SSH_PORT} -i ${PEM_KEY} ubuntu@${SERVER} \
  "cd /var/www/QSightsOrg2.0/frontend && rm -rf .next/cache"

# Restart PM2
echo "🔄 Restarting PM2..."
ssh -p ${SSH_PORT} -i ${PEM_KEY} ubuntu@${SERVER} "pm2 restart qsights-frontend"

echo ""
echo "✅ ✅ ✅ CRITICAL FIX DEPLOYED! ✅ ✅ ✅"
echo ""
echo "🔧 Fixed:"
echo "   ❌ Was calling: /notification-logs"
echo "   ✅ Now calling: /notifications/logs"
echo ""
echo "🌐 Verify at:"
echo "   - https://prod.qsights.com/analytics (Notifications tab)"
echo "   - https://prod.qsights.com/events (Any event → Notification Reports)"
echo ""
