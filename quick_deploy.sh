#!/bin/bash
# Quick Deploy - Copy source files and build on server
# This avoids local disk space issues

set -e

echo "🚀 Deploying Thank You Video Fix (Server-side build)"
echo "=================================================="

SERVER_USER="ubuntu"
SERVER_IP="13.126.210.220"
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
REMOTE_PATH="/var/www/QSightsOrg2.0"

# 1. Upload changed files
echo "📤 Uploading files to server..."
scp -i "$PEM_KEY" \
    "frontend/app/activities/take/[id]/page.tsx" \
    "$SERVER_USER@$SERVER_IP:/tmp/take_page.tsx"

scp -i "$PEM_KEY" \
    "frontend/app/questionnaires/[id]/page.tsx" \
    "$SERVER_USER@$SERVER_IP:/tmp/questionnaire_page.tsx"

# 2. Deploy and build on server
echo "🔨 Building on production server..."
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
    set -e
    cd /var/www/QSightsOrg2.0
    
    # Backup
    sudo cp "frontend/app/activities/take/[id]/page.tsx" \
            "frontend/app/activities/take/[id]/page.tsx.bak" 2>/dev/null || true
    sudo cp "frontend/app/questionnaires/[id]/page.tsx" \
            "frontend/app/questionnaires/[id]/page.tsx.bak" 2>/dev/null || true
    
    # Install
    sudo cp /tmp/take_page.tsx "frontend/app/activities/take/[id]/page.tsx"
    sudo cp /tmp/questionnaire_page.tsx "frontend/app/questionnaires/[id]/page.tsx"
    sudo chown -R www-data:www-data frontend/app
    
    # Build
    cd frontend
    sudo rm -rf .next
    sudo -u www-data npm run build
    
    # Restart
    pm2 restart qsights-frontend
    
    echo "✅ Done!"
ENDSSH

echo ""
echo "✅ DEPLOYED! Test now: https://prod.qsights.com/questionnaires/33"
