#!/bin/bash

echo "=========================================="
echo "Deploying Duplicate Participant Fix"
echo "Date: February 15, 2026"
echo "=========================================="

# Variables
PEM_KEY="$HOME/Documents/Keys/QSights-Mumbai-12Aug2019.pem"
SERVER_USER="ubuntu"
SERVER_IP="13.126.210.220"
FRONTEND_LOCAL_PATH="/Users/yash/Documents/Projects/QSightsOrg2.0/frontend"
FRONTEND_REMOTE_PATH="/var/www/frontend"

echo ""
echo "📦 Step 1: Copying updated results page to production server..."
scp -i "$PEM_KEY" \
    "$FRONTEND_LOCAL_PATH/app/activities/[id]/results/page.tsx" \
    "$SERVER_USER@$SERVER_IP:$FRONTEND_REMOTE_PATH/app/activities/[id]/results/" || {
    echo "❌ Failed to copy file to server"
    exit 1
}

echo "✅ File copied successfully"

echo ""
echo "🏗️  Step 2: Building frontend on production server..."
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "cd /var/www/frontend && npm run build"

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "🔄 Step 3: Restarting PM2 processes..."
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "pm2 restart all && pm2 list"

if [ $? -ne 0 ]; then
    echo "❌ PM2 restart failed"
    exit 1
fi

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Changes Applied:"
echo "   - Fixed duplicate participant entries in Per-Participant Response Details"
echo "   - Added deduplication logic to keep only most recent response per participant"
echo "   - Updated React keys to use participantId for better rendering"
echo ""
echo "🌐 Production URL: https://prod.qsights.com"
echo "=========================================="
