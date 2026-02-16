#!/bin/bash
set -e

# ============================================================================
# CRITICAL FIX DEPLOYMENT - Radio Button & Gender Field Options
# Date: February 13, 2026 - Time: Evening
# Issue: Gender and Radio button fields couldn't display/edit options
# Fix: Added "gender" type to options editor condition in registration-form-builder.tsx
# ============================================================================

echo "========================================"
echo "🔴 CRITICAL FIX: Radio & Gender Fields"
echo "========================================"
echo ""

# Server details
SERVER="ubuntu@13.126.210.220"
PEM_FILE="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
FRONTEND_PATH="/var/www/frontend"

echo "📦 Step 1: Uploading fixed component to temp directory..."
scp -i "$PEM_FILE" \
  frontend/components/registration-form-builder.tsx \
  $SERVER:/tmp/registration-form-builder.tsx

echo ""
echo "🔧 Step 2: Deploying to production frontend..."
ssh -i "$PEM_FILE" $SERVER << 'ENDSSH'
  set -e
  
  echo "   → Moving file to production..."
  sudo cp /tmp/registration-form-builder.tsx /var/www/frontend/components/registration-form-builder.tsx
  sudo chown www-data:www-data /var/www/frontend/components/registration-form-builder.tsx
  
  echo "   → Fixing permissions on .next directory..."
  cd /var/www/frontend
  sudo rm -rf .next
  sudo mkdir -p .next
  sudo chown -R www-data:www-data .next
  
  echo "   → Rebuilding frontend..."
  sudo -u www-data npm run build
  
  echo "   → Restarting PM2 process..."
  sudo pm2 restart qsights-frontend
  
  echo "   → Checking PM2 status..."
  sudo pm2 list
  
  echo ""
  echo "✅ Deployment complete!"
  
ENDSSH

echo ""
echo "========================================"
echo "✅ CRITICAL FIX DEPLOYED SUCCESSFULLY"
echo "========================================"
echo ""
echo "🔍 What was fixed:"
echo "   • Gender field options now visible and editable"
echo "   • Radio button fields working correctly"
echo "   • Options editor now shows for radio, select, AND gender fields"
echo ""
echo "🎯 Demo Ready!"
echo ""
