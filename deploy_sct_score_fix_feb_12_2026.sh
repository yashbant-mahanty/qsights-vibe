#!/bin/bash

# SCT Likert Score Fix Deployment Script
# Date: February 12, 2026
# Fix: SCT Likert scores showing as 0 in Event Results - Question-wise Analysis

set -e

echo "🚀 Starting deployment of SCT Likert Score fix..."
echo "================================================"

# Configuration
FRONTEND_DIR="/var/www/qsights-frontend"
BACKUP_DIR="/var/www/backups/frontend-$(date +%Y%m%d-%H%M%S)"
PM2_APP_NAME="qsights-frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Deployment Details:${NC}"
echo "  - Fix: SCT Likert Score calculation using settings.labels"
echo "  - File: frontend/app/activities/[id]/results/page.tsx"
echo "  - Issue: Scores showing as 0 due to null options field"
echo ""

# Backup current frontend
echo -e "${YELLOW}📦 Creating backup of current frontend...${NC}"
sudo mkdir -p "$BACKUP_DIR"
sudo cp -r "$FRONTEND_DIR" "$BACKUP_DIR/"
echo -e "${GREEN}✅ Backup created at: $BACKUP_DIR${NC}"
echo ""

# Navigate to project directory
cd /Users/yash/Documents/Projects/QSightsOrg2.0

# Pull latest changes (if using git)
echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
if [ -d ".git" ]; then
    git pull origin main || echo "No git repository or already up to date"
fi
echo ""

# Build frontend
echo -e "${YELLOW}🔨 Building frontend with SCT score fix...${NC}"
cd frontend
npm install
npm run build
echo -e "${GREEN}✅ Frontend build completed${NC}"
echo ""

# Stop PM2 process
echo -e "${YELLOW}⏸️  Stopping PM2 frontend process...${NC}"
sudo pm2 stop "$PM2_APP_NAME" || echo "Process not running"
echo ""

# Copy built files to production
echo -e "${YELLOW}📤 Deploying to production directory...${NC}"
sudo rm -rf "$FRONTEND_DIR"
sudo mkdir -p "$FRONTEND_DIR"
sudo cp -r .next "$FRONTEND_DIR/"
sudo cp -r public "$FRONTEND_DIR/"
sudo cp -r node_modules "$FRONTEND_DIR/"
sudo cp package*.json "$FRONTEND_DIR/"
sudo cp next.config.js "$FRONTEND_DIR/"
echo -e "${GREEN}✅ Files copied to production${NC}"
echo ""

# Set proper permissions
echo -e "${YELLOW}🔐 Setting permissions...${NC}"
sudo chown -R www-data:www-data "$FRONTEND_DIR"
sudo chmod -R 755 "$FRONTEND_DIR"
echo -e "${GREEN}✅ Permissions set${NC}"
echo ""

# Start PM2 process
echo -e "${YELLOW}▶️  Starting PM2 frontend process...${NC}"
cd "$FRONTEND_DIR"
sudo pm2 start npm --name "$PM2_APP_NAME" -- start
sudo pm2 save
echo -e "${GREEN}✅ Frontend started${NC}"
echo ""

# Wait for application to start
echo -e "${YELLOW}⏳ Waiting for application to start (30 seconds)...${NC}"
sleep 30
echo ""

# Check if application is running
echo -e "${YELLOW}🔍 Checking application status...${NC}"
if sudo pm2 list | grep -q "$PM2_APP_NAME.*online"; then
    echo -e "${GREEN}✅ Application is running successfully${NC}"
else
    echo -e "${RED}❌ Application failed to start${NC}"
    echo -e "${YELLOW}📋 PM2 logs:${NC}"
    sudo pm2 logs "$PM2_APP_NAME" --lines 50 --nostream
    exit 1
fi
echo ""

# Display PM2 status
echo -e "${YELLOW}📊 PM2 Status:${NC}"
sudo pm2 list
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
echo "  1. Navigate to Event Results for SCT activity"
echo "  2. Go to Question-wise Analysis tab"
echo "  3. Select an SCT Likert question"
echo "  4. Verify scores are now displayed correctly:"
echo "     - Average Score should show calculated value (not 0)"
echo "     - Total Score should show sum of all scores"
echo "     - Score Range should show min-max values"
echo "     - Response Distribution should show correct point values"
echo ""
echo -e "${YELLOW}📦 Backup Location:${NC}"
echo "  $BACKUP_DIR"
echo ""
echo -e "${YELLOW}🔄 Rollback command (if needed):${NC}"
echo "  sudo pm2 stop $PM2_APP_NAME"
echo "  sudo rm -rf $FRONTEND_DIR"
echo "  sudo cp -r $BACKUP_DIR/qsights-frontend $FRONTEND_DIR"
echo "  sudo pm2 start $PM2_APP_NAME"
echo ""
