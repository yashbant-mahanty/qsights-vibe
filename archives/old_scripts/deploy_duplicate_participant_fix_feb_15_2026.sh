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
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'REMOTE_COMMANDS'
set -e

cd /var/www/frontend

echo "Building Next.js application..."
npm run build

if [ $? -eq 0 ]; then
    
echo "===Build completed successfully"
else
    echo "❌ Builecho "Date: February 15, 2026"
echo "====if [ $? -ne 0 ]; then
    echo "?# Variables
PEM_KEY="$HOME/Documents/Keys/QSighchoPEM_KEY="$p SERVER_USER="ubuntu"
SERVER_IP="13.126.210.220"
FRONTEND_L_USERVER_IP="13.126.2'RFRONTEND_LOCAL_PATH="/UsehoFRONTEND_REMOTE_PATH="/var/www/frontend"

echo ""
echo "📦 Step 1: Copyi..
echo ""
echo "📦 Step 1: Copying upd0 ]echo "
 scp -i "$PE? PM2 restart failed"
    exit 1
fi

echo ""
echo "✅ Deploym    "$FRONTEND_LOCes    "$SERVER_USER@$SERVER_IP:$FRONTEND_REMOTE_PATH/app/activitieup    echo "❌ Failed to copy file to server"
    exit 1
}

echo "✅ File copied sucup    exit 1
}

echo "✅ File copied successpo}

echo "artic
echo ""
echo "🏗️  Step 2: Buys echo " pssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'REMOTE_COMMANDS' Uset -e

cd /var/www/frontend

echo "Building Next.js applicatio==
cd /========"
