#!/bin/bash

###############################################################################
# ⚠️  DEPRECATION WARNING ⚠️
#
# This script uses the OLD deployment workflow.
#
# NEW MANDATORY WORKFLOW (as of Feb 7, 2026):
#   1. Deploy to Pre-Prod first: ./deploy_backend_preprod.sh
#   2. Test on Pre-Prod for 24+ hours
#   3. Then deploy to Production: ./deploy_backend_prod.sh
#
# This script is kept for reference only.
# For new deployments, use the new workflow scripts.
#
# Documentation:
#   - DEPLOYMENT_CHECKLIST.md
#   - DEPLOYMENT_WORKFLOW_GUIDE.md
#   - DEPLOYMENT_QUICK_REFERENCE.md
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "⚠️  DEPRECATION WARNING"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "This script uses the OLD deployment workflow."
echo ""
echo "NEW MANDATORY WORKFLOW (as of Feb 7, 2026):"
echo "  1. Deploy to Pre-Prod: ./deploy_backend_preprod.sh or ./deploy_frontend_preprod.sh"
echo "  2. Test for 24+ hours"
echo "  3. Deploy to Production: ./deploy_backend_prod.sh or ./deploy_frontend_prod.sh"
echo ""
echo "Read: DEPLOYMENT_QUICK_REFERENCE.md for quick guide"
echo ""
read -p "Do you want to continue with this OLD script? (yes/no): " CONTINUE

if [ "$CONTINUE" != "yes" ]; then
    echo "Deployment cancelled. Please use new workflow scripts."
    exit 0
fi

echo ""
echo "Proceeding with OLD deployment script..."
echo ""
sleep 2

###############################################################################
# Original script continues below
###############################################################################



# Critical Fixes Deployment Script (SSH Version)
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
SERVER="ubuntu@13.126.210.220"
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

# Step 2: Create tarball of build
echo -e "${BLUE}📦 Step 2: Creating build archive...${NC}"
cd frontend
tar -czf ../.next-critical-fixes-$TIMESTAMP.tar.gz .next
cd ..
echo -e "${GREEN}✅ Archive created${NC}"
echo ""

# Step 3: Upload to server
echo -e "${BLUE}⬆️  Step 3: Uploading to production server...${NC}"
scp .next-critical-fixes-$TIMESTAMP.tar.gz $SERVER:/tmp/
echo -e "${GREEN}✅ Upload complete${NC}"
echo ""

# Step 4: Deploy on server
echo -e "${BLUE}🚀 Step 4: Deploying on production server...${NC}"
ssh $SERVER << 'ENDSSH'
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FRONTEND_DIR="/var/www/frontend"

echo -e "${BLUE}⏸️  Stopping PM2...${NC}"
pm2 stop qsights-frontend || true

echo -e "${BLUE}💾 Backing up current build...${NC}"
if [ -d "$FRONTEND_DIR/.next" ]; then
    sudo mv "$FRONTEND_DIR/.next" "$FRONTEND_DIR/.next.backup.$TIMESTAMP"
    echo -e "${GREEN}✅ Backup created${NC}"
fi

echo -e "${BLUE}📦 Extracting new build...${NC}"
cd /tmp
ARCHIVE=$(ls -t .next-critical-fixes-*.tar.gz | head -1)
sudo tar -xzf $ARCHIVE -C $FRONTEND_DIR/
sudo chown -R www-data:www-data $FRONTEND_DIR/.next
echo -e "${GREEN}✅ New build extracted${NC}"

echo -e "${BLUE}▶️  Restarting PM2...${NC}"
pm2 restart qsights-frontend
sleep 3
echo -e "${GREEN}✅ PM2 restarted${NC}"

echo -e "${BLUE}🔍 Checking status...${NC}"
pm2 list | grep qsights-frontend

echo -e "${BLUE}📝 Recent logs:${NC}"
pm2 logs qsights-frontend --lines 15 --nostream

echo ""
echo -e "${GREEN}✅ Deployment Complete on Server!${NC}"
ENDSSH

echo ""
echo -e "${GREEN}✅ Full Deployment Complete!${NC}"
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

# Cleanup
echo -e "${BLUE}🧹 Cleaning up local archive...${NC}"
rm .next-critical-fixes-$TIMESTAMP.tar.gz
echo -e "${GREEN}✅ Cleanup complete${NC}"
echo ""
