#!/bin/bash

# ============================================================================
# SCT LIKERT SCORE FIX - PRODUCTION DEPLOYMENT
# Date: February 12, 2026
# Fix: SCT Likert scores showing as 0 in Question-wise Analysis
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration - CRITICAL PATHS (from CRITICAL_RULES.md)
PEM_PATH="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER_USER="ubuntu"
SERVER_HOST="13.126.210.220"

# ⚠️ PRODUCTION PATHS - DO NOT CHANGE
FRONTEND_PROD="/var/www/frontend"           # Actual frontend location
BACKEND_PROD="/var/www/QSightsOrg2.0/backend"  # Actual backend location

LOCAL_PROJECT_DIR="/Users/yash/Documents/Projects/QSightsOrg2.0"
PM2_APP_NAME="qsights-frontend"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     SCT LIKERT SCORE FIX - PRODUCTION DEPLOYMENT                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📋 Deployment Details:${NC}"
echo "  • Fix: SCT Likert Score calculation using settings.labels"
echo "  • File: frontend/app/activities/[id]/results/page.tsx"
echo "  • Issue: Scores showing as 0 due to undefined options array"
echo "  • Server: $SERVER_HOST"
echo "  • Frontend Path: $FRONTEND_PROD"
echo ""

echo -e "${YELLOW}🔍 Changes Made:${NC}"
echo "  1. Use question.settings.labels instead of question.options for SCT Likert"
echo "  2. Changed indexOf to findIndex with string comparison"
echo "  3. Fixed participant score calculation with proper undefined handling"
echo ""

# Verify PEM file
if [ ! -f "$PEM_PATH" ]; then
    echo -e "${RED}❌ ERROR: PEM file not found at: $PEM_PATH${NC}"
    exit 1
fi
chmod 400 "$PEM_PATH"
echo -e "${GREEN}✅ PEM file verified${NC}"
echo ""

# Build frontend locally
echo -e "${YELLOW}🔨 Building frontend locally...${NC}"
cd "$LOCAL_PROJECT_DIR/frontend"

# Clean previous build
rm -rf .next
echo "  • Cleaned previous build"

# Install dependencies
echo "  • Installing dependencies..."
npm install --silent

# Build
echo "  • Building production bundle..."
npm run build

# Verify .next directory exists with BUILD_ID
if [ ! -f ".next/BUILD_ID" ]; then
    echo -e "${RED}❌ ERROR: BUILD_ID missing in .next directory!${NC}"
    exit 1
fi

BUILD_ID=$(cat .next/BUILD_ID)
echo -e "${GREEN}✅ Build completed successfully${NC}"
echo "  • BUILD_ID: $BUILD_ID"
echo ""

# Create deployment package
echo -e "${YELLOW}📦 Creating deployment package...${NC}"
cd "$LOCAL_PROJECT_DIR/frontend"

# Include only necessary files
tar -czf ../frontend-sct-fix.tar.gz \
    .next \
    package.json \
    package-lock.json \
    next.config.mjs \
    app \
    components \
    contexts \
    lib \
    api \
    .env.example \
    2>/dev/null || true

echo -e "${GREEN}✅ Package created${NC}"
echo ""

# Upload to server
echo -e "${YELLOW}📤 Uploading to production server...${NC}"
cd "$LOCAL_PROJECT_DIR"
scp -i "$PEM_PATH" -o StrictHostKeyChecking=no frontend-sct-fix.tar.gz "$SERVER_USER@$SERVER_HOST:/tmp/"
echo -e "${GREEN}✅ Upload completed${NC}"
echo ""

# Deploy on server
echo -e "${YELLOW}🚀 Deploying on production server...${NC}"
ssh -i "$PEM_PATH" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
set -e

# ⚠️ CRITICAL: Use correct production paths
FRONTEND_PROD="/var/www/frontend"
BACKUP_DIR="/home/ubuntu/backups/production/frontend_$(date +%Y%m%d_%H%M%S)"
PM2_APP_NAME="qsights-frontend"

echo "🔍 Verifying production paths..."
if [ ! -d "$FRONTEND_PROD" ]; then
    echo "❌ ERROR: Frontend production directory not found at: $FRONTEND_PROD"
    exit 1
fi

# Verify PM2 is running from correct location
PM2_CWD=$(pm2 jlist | grep -o '"cwd":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ "$PM2_CWD" != "$FRONTEND_PROD" ]; then
    echo "⚠️  WARNING: PM2 running from: $PM2_CWD"
    echo "⚠️  Expected: $FRONTEND_PROD"
    echo "⚠️  This might cause issues. Proceeding with correct path..."
fi

# Create backup
echo "📦 Creating backup..."
mkdir -p "$BACKUP_DIR"
if [ -d "$FRONTEND_PROD/.next" ]; then
    sudo cp -r "$FRONTEND_PROD/.next" "$BACKUP_DIR/"
    echo "✅ Backup created at: $BACKUP_DIR"
else
    echo "⚠️  No existing .next directory to backup"
fi

# Extract to temp directory first (avoid permission issues)
echo "📂 Extracting deployment package..."
TMP_DEPLOY="/tmp/frontend-deploy-$$"
mkdir -p "$TMP_DEPLOY"
cd "$TMP_DEPLOY"
tar -xzf /tmp/frontend-sct-fix.tar.gz

# Verify BUILD_ID in extracted package
if [ ! -f ".next/BUILD_ID" ]; then
    echo "❌ ERROR: BUILD_ID missing in deployment package!"
    rm -rf "$TMP_DEPLOY"
    exit 1
fi

NEW_BUILD_ID=$(cat .next/BUILD_ID)
echo "✅ Package extracted (BUILD_ID: $NEW_BUILD_ID)"

# Stop PM2
echo "⏸️  Stopping PM2 process..."
sudo pm2 stop "$PM2_APP_NAME" || echo "Process not running"

# Deploy files with sudo
echo "📥 Deploying files..."
sudo rm -rf "$FRONTEND_PROD/.next"
sudo cp -r .next "$FRONTEND_PROD/"
sudo cp -r app "$FRONTEND_PROD/" || true
sudo cp -r components "$FRONTEND_PROD/" || true
sudo cp -r contexts "$FRONTEND_PROD/" || true
sudo cp -r lib "$FRONTEND_PROD/" || true

# Set permissions
echo "🔐 Setting permissions..."
sudo chown -R www-data:www-data "$FRONTEND_PROD"
sudo chmod -R 755 "$FRONTEND_PROD"

# Restart PM2 (not stop/start, just restart)
echo "▶️  Restarting PM2 process..."
cd "$FRONTEND_PROD"
sudo pm2 restart "$PM2_APP_NAME"
sudo pm2 save

# Verify deployment
DEPLOYED_BUILD_ID=""
if [ -f "$FRONTEND_PROD/.next/BUILD_ID" ]; then
    DEPLOYED_BUILD_ID=$(sudo cat "$FRONTEND_PROD/.next/BUILD_ID")
fi

if [ "$DEPLOYED_BUILD_ID" = "$NEW_BUILD_ID" ]; then
    echo "✅ Deployment verified (BUILD_ID matches: $DEPLOYED_BUILD_ID)"
else
    echo "❌ WARNING: BUILD_ID mismatch!"
    echo "   Expected: $NEW_BUILD_ID"
    echo "   Got: $DEPLOYED_BUILD_ID"
fi

# Cleanup
echo "🧹 Cleaning up..."
rm -rf "$TMP_DEPLOY"
rm -f /tmp/frontend-sct-fix.tar.gz

echo "✅ Server deployment completed"
echo "📦 Backup location: $BACKUP_DIR"
ENDSSH

echo -e "${GREEN}✅ Deployment completed on server${NC}"
echo ""

# Cleanup local files
echo -e "${YELLOW}🧹 Cleaning up local files...${NC}"
rm -f "$LOCAL_PROJECT_DIR/frontend-sct-fix.tar.gz"
echo -e "${GREEN}✅ Cleanup completed${NC}"
echo ""

# Wait for application to stabilize
echo -e "${YELLOW}⏳ Waiting for application to start (20 seconds)...${NC}"
sleep 20
echo ""

# Health checks
echo -e "${YELLOW}🔍 Running health checks...${NC}"

# Check PM2 status
echo "  • Checking PM2 status..."
PM2_STATUS=$(ssh -i "$PEM_PATH" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null" || echo "unknown")
if [ "$PM2_STATUS" = "online" ]; then
    echo -e "    ${GREEN}✅ PM2: online${NC}"
else
    echo -e "    ${RED}❌ PM2: $PM2_STATUS${NC}"
fi

# Check HTTP status
echo "  • Checking HTTP status..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://prod.qsights.com 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "    ${GREEN}✅ HTTP Status: 200${NC}"
else
    echo -e "    ${RED}❌ HTTP Status: $HTTP_STATUS${NC}"
fi

echo ""

# Display PM2 status
echo -e "${YELLOW}📊 PM2 Status:${NC}"
ssh -i "$PEM_PATH" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "sudo pm2 list"
echo ""

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  🎉 DEPLOYMENT SUCCESSFUL!                       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🧪 TESTING CHECKLIST:${NC}"
echo ""
echo "1. Open: https://prod.qsights.com/activities/a10e5460-cff2-4ad4-b79a-cabdc2727521/results"
echo "2. Click on 'Question-wise Analysis' tab"
echo "3. Select any SCT Likert question (SCT 01, SCT 02, or SCT 03)"
echo ""
echo "✅ VERIFY:"
echo "   • Average Score shows correct value (not 0)"
echo "   • Total Score shows sum of all scores"
echo "   • Score Range shows min-max values"
echo "   • Response Distribution shows correct point values"
echo "   • Each participant's score is displayed in the table"
echo ""
echo -e "${YELLOW}📝 Expected Results for SCT Activity:${NC}"
echo "   • SCT 01 (5-point scale): Responses for 'Disagree' and 'Strongly Agree'"  
echo "   • SCT 02 (3-point scale): Responses for 'Agree'"
echo "   • SCT 03 (7-point scale): Responses for 'Agree' and 'Strongly Agree'"
echo ""

echo -e "${YELLOW}🔄 ROLLBACK (if needed):${NC}"
echo "   ssh -i $PEM_PATH $SERVER_USER@$SERVER_HOST"
echo "   sudo pm2 stop $PM2_APP_NAME"
echo "   sudo rm -rf $FRONTEND_PROD/.next"
echo "   sudo cp -r [BACKUP_DIR]/.next $FRONTEND_PROD/"
echo "   sudo pm2 restart $PM2_APP_NAME"
echo ""

echo -e "${YELLOW}📊 MONITOR:${NC}"
echo "   • PM2 logs: sudo pm2 logs $PM2_APP_NAME"
echo "   • Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "   • Browser console for 404 or ChunkLoadError"
echo ""

echo -e "${GREEN}✅ Deployment script completed!${NC}"
