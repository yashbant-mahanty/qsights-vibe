#!/bin/bash

# SCT Likert Score Fix Deployment Script via SSH
# Date: February 12, 2026
# Fix: SCT Likert scores showing as 0 in Event Results - Question-wise Analysis

set -e

echo "🚀 Starting deployment of SCT Likert Score fix..."
echo "================================================"

# Configuration
PEM_PATH="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER_USER="ubuntu"
SERVER_HOST="13.126.210.220"
FRONTEND_DIR="/var/www/qsights-frontend"
BACKUP_DIR="/var/www/backups/frontend-$(date +%Y%m%d-%H%M%S)"
PM2_APP_NAME="qsights-frontend"
LOCAL_PROJECT_DIR="/Users/yash/Documents/Projects/QSightsOrg2.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Deployment Details:${NC}"
echo "  - Fix: SCT Likert Score calculation using settings.labels"
echo "  - File: frontend/app/activities/[id]/results/page.tsx"
echo "  - Issue: Scores showing as 0 due to null options field"
echo "  - Server: $SERVER_HOST"
echo ""

# Verify PEM file exists
if [ ! -f "$PEM_PATH" ]; then
    echo -e "${RED}❌ PEM file not found at: $PEM_PATH${NC}"
    exit 1
fi

# Set correct permissions for PEM file
chmod 400 "$PEM_PATH"
echo -e "${GREEN}✅ PEM file permissions verified${NC}"
echo ""

# Build frontend locally
echo -e "${YELLOW}🔨 Building frontend locally with SCT score fix...${NC}"
cd "$LOCAL_PROJECT_DIR/frontend"
npm install
npm run build
echo -e "${GREEN}✅ Frontend build completed${NC}"
echo ""

# Create a tarball of the built files
echo -e "${YELLOW}📦 Creating deployment package...${NC}"
cd "$LOCAL_PROJECT_DIR/frontend"
tar -czf ../frontend-build.tar.gz .next package.json package-lock.json next.config.js public
cd "$LOCAL_PROJECT_DIR"
echo -e "${GREEN}✅ Deployment package created${NC}"
echo ""

# Upload the tarball to the server
echo -e "${YELLOW}📤 Uploading to production server...${NC}"
scp -i "$PEM_PATH" -o StrictHostKeyChecking=no frontend-build.tar.gz "$SERVER_USER@$SERVER_HOST:/tmp/"
echo -e "${GREEN}✅ Upload completed${NC}"
echo ""

# Deploy on the server
echo -e "${YELLOW}🚀 Deploying on production server...${NC}"
ssh -i "$PEM_PATH" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
set -e

FRONTEND_DIR="/var/www/qsights-frontend"
BACKUP_DIR="/var/www/backups/frontend-$(date +%Y%m%d-%H%M%S)"
PM2_APP_NAME="qsights-frontend"

echo "📦 Creating backup..."
sudo mkdir -p "$BACKUP_DIR"
if [ -d "$FRONTEND_DIR" ]; then
    sudo cp -r "$FRONTEND_DIR" "$BACKUP_DIR/"
    echo "✅ Backup created at: $BACKUP_DIR"
fi

echo "⏸️  Stopping PM2 process..."
sudo pm2 stop "$PM2_APP_NAME" || echo "Process not running"

echo "📂 Preparing deployment directory..."
sudo rm -rf "$FRONTEND_DIR/.next"
sudo mkdir -p "$FRONTEND_DIR"

echo "📥 Extracting deployment package..."
cd "$FRONTEND_DIR"
sudo tar -xzf /tmp/frontend-build.tar.gz

echo "📦 Installing production dependencies..."
sudo npm install --production

echo "🔐 Setting permissions..."
sudo chown -R www-data:www-data "$FRONTEND_DIR"
sudo chmod -R 755 "$FRONTEND_DIR"

echo "▶️  Starting PM2 process..."
sudo pm2 start npm --name "$PM2_APP_NAME" -- start || sudo pm2 restart "$PM2_APP_NAME"
sudo pm2 save

echo "🧹 Cleaning up..."
rm -f /tmp/frontend-build.tar.gz

echo "✅ Deployment completed on server"
ENDSSH

echo -e "${GREEN}✅ Server deployment completed${NC}"
echo ""

# Clean up local tarball
echo -e "${YELLOW}🧹 Cleaning up local files...${NC}"
rm -f frontend-build.tar.gz
echo -e "${GREEN}✅ Cleanup completed${NC}"
echo ""

# Wait for application to start
echo -e "${YELLOW}⏳ Waiting for application to start (30 seconds)...${NC}"
sleep 30
echo ""

# Check if application is running
echo -e "${YELLOW}🔍 Checking application status...${NC}"
ssh -i "$PEM_PATH" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "sudo pm2 list | grep '$PM2_APP_NAME'" && \
    echo -e "${GREEN}✅ Application is running successfully${NC}" || \
    echo -e "${RED}❌ Application may not be running properly${NC}"
echo ""

# Display PM2 status
echo -e "${YELLOW}📊 PM2 Status:${NC}"
ssh -i "$PEM_PATH" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "sudo pm2 list"
echo ""

echo "================================================"
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📝 What was fixed:${NC}"
echo "  1. Updated calculateSctLikertScores to use question.settings.labels"
echo "  2. Changed indexOf to findIndex with string comparison"
echo "  3. Fixed participant score calculation to handle undefined properly"
echo ""
echo -e "${YELLOW}🧪 Testing Instructions:${NC}"
echo "  1. Navigate to: https://prod.qsights.com/activities/a10e5460-cff2-4ad4-b79a-cabdc2727521/results"
echo "  2. Go to Question-wise Analysis tab"
echo "  3. Select SCT 01, SCT 02, or SCT 03 question"
echo "  4. Verify scores are now displayed correctly:"
echo "     - Average Score should show calculated value (not 0)"
echo "     - Total Score should show sum of all scores"
echo "     - Score Range should show min-max values"
echo "     - Response Distribution should show correct point values"
echo ""
echo -e "${YELLOW}🔄 Rollback command (if needed):${NC}"
echo "  ssh -i $PEM_PATH $SERVER_USER@$SERVER_HOST"
echo "  sudo pm2 stop $PM2_APP_NAME"
echo "  sudo rm -rf $FRONTEND_DIR"
echo "  sudo cp -r [BACKUP_DIR]/qsights-frontend $FRONTEND_DIR"
echo "  sudo pm2 start $PM2_APP_NAME"
echo ""
