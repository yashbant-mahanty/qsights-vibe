#!/bin/bash

# Deploy Notification Stats Fix
# Date: 18 January 2026
# Fix: Use stats from API response instead of separate analytics endpoint

set -e

PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SSH_PORT="3389"
SERVER="127.0.0.1"

echo "🚀 Deploying notification stats fix..."
echo ""

# Deploy Frontend File
echo "📦 Deploying frontend analytics page..."
scp -P ${SSH_PORT} -i ${PEM_KEY} \
  /Users/yash/Documents/Projects/QSightsOrg2.0/frontend/app/analytics/page.tsx \
  ubuntu@${SERVER}:/tmp/analytics_page.tsx

ssh -p ${SSH_PORT} -i ${PEM_KEY} ubuntu@${SERVER} \
  "sudo mv /tmp/analytics_page.tsx /var/www/QSightsOrg2.0/frontend/app/analytics/page.tsx && \
   sudo chown ubuntu:ubuntu /var/www/QSightsOrg2.0/frontend/app/analytics/page.tsx"

echo "✅ Frontend file deployed"
echo ""

# Build Frontend on Production
echo "🏗️  Building frontend on production..."
ssh -p ${SSH_PORT} -i ${PEM_KEY} ubuntu@${SERVER} \
  "cd /var/www/QSightsOrg2.0/frontend && npm run build"

echo "✅ Frontend built"
echo ""

# Clear Next.js Cache
echo "🧹 Clearing Next.js cache..."
ssh -p ${SSH_PORT} -i ${PEM_KEY} ubuntu@${SERVER} \
  "cd /var/www/QSightsOrg2.0/frontend && rm -rf .next/cache"

echo "✅ Next.js cache cleared"
echo ""

# Restart PM2
echo "🔄 Restarting PM2..."
ssh -p ${SSH_PORT} -i ${PEM_KEY} ubuntu@${SERVER} "pm2 restart qsights-frontend"

echo "✅ PM2 restarted"
echo ""

# Verify Services
echo "🔍 Verifying services..."
ssh -p ${SSH_PORT} -i ${PEM_KEY} ubuntu@${SERVER} "pm2 status"

echo ""
echo "✅ ✅ ✅ DEPLOYMENT SUCCESSFUL! ✅ ✅ ✅"
echo ""
echo "📝 Changes deployed:"
echo "   ✓ Reports & Analytics now uses stats from notification logs API"
echo "   ✓ Sent, Delivered, Opened, Read counts should now display correctly"
echo ""
echo "🌐 Verify at: https://prod.qsights.com/analytics (Notifications tab)"
echo ""
