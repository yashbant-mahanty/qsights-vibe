#!/bin/bash

# Critical Fixes Deployment Script
# Date: February 6, 2026
# Fixes: Program Edit Dates, Program Status Display, Event Edit Program Auto-populate

set -e

echo "🚀 Deploying Critical Fixes - February 6, 2026"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="/var/www/frontend"
LOCAL_BUILD="./frontend/.next"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}📋 Changes Summary:${NC}"
echo "1. ✅ Fixed Program Edit Modal - Start/End Date not showing"
echo "2. ✅ Fixed Program Status Display (showing draft instead of Active)"
echo "3. ✅ Fixed Event Edit - auto-populate Program field"
echo ""

# Step 1: Verify build exists
echo -e "${BLUE}🔍 Step 1: Verifying local build...${NC}"
if [ ! -d "$LOCAL_BUILD" ]; then
    echo -e "${YELLOW}Build not found. Building now...${NC}"
    cd frontend && npm run build && cd ..
fi
echo -e "${GREEN}✅ Build verified${NC}"
echo ""

# Step 2: Stop PM2
echo -e "${BLUE}⏸️  Step 2: Stopping PM2 process...${NC}"
pm2 stop qsights-frontend
echo -e "${GREEN}✅ PM2 stopped${NC}"
echo ""

# Step 3: Backup current build
echo -e "${BLUE}💾 Step 3: Backing up current build...${NC}"
if [ -d "$FRONTEND_DIR/.next" ]; then
    sudo mv "$FRONTEND_DIR/.next" "$FRONTEND_DIR/.next.backup.$TIMESTAMP"
    echo -e "${GREEN}✅ Backup created: .next.backup.$TIMESTAMP${NC}"
else
    echo -e "${YELLOW}⚠️  No existing build to backup${NC}"
fi
echo ""

# Step 4: Copy new build
echo -e "${BLUE}📦 Step 4: Copying new build to production...${NC}"
sudo cp -r "$LOCAL_BUILD" "$FRONTEND_DIR/"
sudo chown -R www-data:www-data "$FRONTEND_DIR/.next"
echo -e "${GREEN}✅ New build deployed${NC}"
echo ""

# Step 5: Restart PM2
echo -e "${BLUE}▶️  Step 5: Restarting PM2...${NC}"
pm2 restart qsights-frontend
sleep 3
echo -e "${GREEN}✅ PM2 restarted${NC}"
echo ""

# Step 6: Check status
echo -e "${BLUE}🔍 Step 6: Checking application status...${NC}"
pm2 list | grep qsights-frontend
echo ""

# Step 7: Show recent logs
echo -e "${BLUE}📝 Step 7: Recent logs (last 20 lines):${NC}"
pm2 logs qsights-frontend --lines 20 --nostream
echo ""

echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}🌐 Application URLs:${NC}"
echo "   Production: https://prod.qsights.com"
echo "   Dashboard:  https://prod.qsights.com/programs"
echo ""
echo -e "${BLUE}📊 Testing Checklist:${NC}"
echo "   1. Test Program Edit - verify dates show in edit modal"
echo "   2. Test Program Status - verify correct status badges"
echo "   3. Test Event Edit - verify program dropdown is pre-selected"
echo ""
echo -e "${YELLOW}💡 Rollback command (if needed):${NC}"
echo "   sudo rm -rf $FRONTEND_DIR/.next"
echo "   sudo mv $FRONTEND_DIR/.next.backup.$TIMESTAMP $FRONTEND_DIR/.next"
echo "   pm2 restart qsights-frontend"
echo ""
