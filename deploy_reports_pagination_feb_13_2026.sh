#!/bin/bash
set -e

# ============================================================================
# PAGINATION ENHANCEMENT - Reports & Analytics Participant-wise Tab
# Date: February 13, 2026
# Enhancement: Added empty state and conditional pagination display
# ============================================================================

echo "========================================"
echo "📊 Reports Pagination Enhancement"
echo "========================================"
echo ""

# Server details
SERVER="ubuntu@13.126.210.220"
PEM_FILE="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
FRONTEND_PATH="/var/www/frontend"

echo "📦 Step 1: Uploading enhanced reports page to temp directory..."
scp -i "$PEM_FILE" \
  frontend/app/reports/page.tsx \
  $SERVER:/tmp/page.tsx

echo ""
echo "🔧 Step 2: Deploying to production frontend..."
ssh -i "$PEM_FILE" $SERVER << 'ENDSSH'
  set -e
  
  echo "   → Moving file to production..."
  sudo cp /tmp/page.tsx /var/www/frontend/app/reports/page.tsx
  sudo chown www-data:www-data /var/www/frontend/app/reports/page.tsx
  
  echo "   → Fixing permissions on .next directory..."
  cd /var/www/frontend
  sudo rm -rf .next
  sudo mkdir -p .next
  sudo chown -R www-data:www-data .next
  
  echo "   → Rebuilding frontend..."
  sudo -u www-data npm run build
  
  echo "   → Restarting PM2 process..."
  pm2 restart qsights-frontend
  pm2 save
  
  echo "   → Checking PM2 status..."
  pm2 list
  
  echo ""
  echo "✅ Deployment complete!"
  
ENDSSH

echo ""
echo "========================================"
echo "✅ PAGINATION ENHANCEMENT DEPLOYED"
echo "========================================"
echo ""
echo "🔍 What was enhanced:"
echo "   • Added empty state for participant-wise tab"
echo "   • Pagination now conditionally shown only with data"
echo "   • Matches Event Results page style exactly"
echo "   • Better UX with clear messaging"
echo ""
echo "🎯 Ready for use!"
echo ""
