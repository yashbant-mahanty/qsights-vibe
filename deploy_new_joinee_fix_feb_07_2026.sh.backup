#!/bin/bash

# New Joinee UX Fix Deployment Script
# Date: February 7, 2026
# Fixes: 1) Reporting Manager field always visible 2) Triggered Evaluations auto-refresh

set -e

echo "🚀 Deploying New Joinee UX Fixes - February 7, 2026"
echo "===================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PEM="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
FRONTEND_DIR="/var/www/frontend"
LOCAL_BUILD="./frontend/.next"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}📋 Changes Summary:${NC}"
echo "1. ✅ Moved Reporting Manager field outside New Joinee section (always visible)"
echo "2. ✅ Added auto-refresh for Triggered Evaluations after new joinee creation"
echo ""

# Step 1: Verify PEM file
echo -e "${BLUE}🔐 Step 1: Verifying PEM file...${NC}"
if [ ! -f "$PEM" ]; then
    echo -e "${RED}❌ PEM file not found at $PEM${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PEM file verified${NC}"
echo ""

# Step 2: Verify build exists
echo -e "${BLUE}🔍 Step 2: Verifying local build...${NC}"
if [ ! -d "$LOCAL_BUILD" ]; then
    echo -e "${YELLOW}Build not found. Building now...${NC}"
    cd frontend && npm run build && cd ..
fi

if [ ! -f "$LOCAL_BUILD/BUILD_ID" ]; then
    echo -e "${RED}❌ BUILD_ID missing! Rebuilding...${NC}"
    cd frontend && rm -rf .next && npm run build && cd ..
fi
echo -e "${GREEN}✅ Build verified with BUILD_ID: $(cat $LOCAL_BUILD/BUILD_ID)${NC}"
echo ""

# Step 3: Check for localhost in .env (warning only)
echo -e "${BLUE}🔍 Step 3: Checking .env files...${NC}"
if grep -qi "localhost" frontend/.env.local 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Warning: localhost found in frontend/.env.local${NC}"
fi
echo -e "${GREEN}✅ .env check complete${NC}"
echo ""

# Step 4: Create tarball of build
echo -e "${BLUE}📦 Step 4: Creating build archive...${NC}"
cd frontend
tar -czf ../.next-new-joinee-fix-$TIMESTAMP.tar.gz .next
cd ..
echo -e "${GREEN}✅ Archive created: .next-new-joinee-fix-$TIMESTAMP.tar.gz${NC}"
echo ""

# Step 5: Upload to server
echo -e "${BLUE}⬆️  Step 5: Uploading to production server...${NC}"
scp -i "$PEM" .next-new-joinee-fix-$TIMESTAMP.tar.gz $SERVER:/tmp/
echo -e "${GREEN}✅ Upload complete${NC}"
echo ""

# Step 6: Deploy on server
echo -e "${BLUE}🚀 Step 6: Deploying on production server...${NC}"
ssh -i "$PEM" $SERVER << 'ENDSSH'
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FRONTEND_DIR="/var/www/frontend"

echo -e "${BLUE}🔍 Verifying production paths...${NC}"
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Frontend directory not found at $FRONTEND_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Production path verified: $FRONTEND_DIR${NC}"

echo -e "${BLUE}💾 Backing up current build...${NC}"
if [ -d "$FRONTEND_DIR/.next" ]; then
    sudo mv "$FRONTEND_DIR/.next" "$FRONTEND_DIR/.next.backup.$TIMESTAMP"
    echo -e "${GREEN}✅ Backup created: .next.backup.$TIMESTAMP${NC}"
else
    echo -e "${YELLOW}⚠️  No existing .next directory to backup${NC}"
fi

echo -e "${BLUE}📦 Extracting new build...${NC}"
cd /tmp
ARCHIVE=$(ls -t .next-new-joinee-fix-*.tar.gz | head -1)
if [ -z "$ARCHIVE" ]; then
    echo -e "${RED}❌ Archive not found in /tmp${NC}"
    exit 1
fi
echo "Found archive: $ARCHIVE"
sudo tar -xzf $ARCHIVE -C $FRONTEND_DIR/
sudo chown -R www-data:www-data $FRONTEND_DIR/.next
echo -e "${GREEN}✅ New build extracted and permissions set${NC}"

echo -e "${BLUE}🔍 Verifying BUILD_ID...${NC}"
if [ -f "$FRONTEND_DIR/.next/BUILD_ID" ]; then
    BUILD_ID=$(cat $FRONTEND_DIR/.next/BUILD_ID)
    echo -e "${GREEN}✅ BUILD_ID verified: $BUILD_ID${NC}"
else
    echo -e "${RED}❌ BUILD_ID missing after extraction!${NC}"
    echo "Restoring backup..."
    sudo rm -rf $FRONTEND_DIR/.next
    sudo mv "$FRONTEND_DIR/.next.backup.$TIMESTAMP" "$FRONTEND_DIR/.next"
    exit 1
fi

echo -e "${BLUE}▶️  Restarting PM2...${NC}"
pm2 restart qsights-frontend
sleep 3
echo -e "${GREEN}✅ PM2 restarted${NC}"

echo -e "${BLUE}🔍 Checking PM2 status...${NC}"
pm2 list | grep qsights-frontend

echo -e "${BLUE}📝 Recent logs:${NC}"
pm2 logs qsights-frontend --lines 20 --nostream

echo ""
echo -e "${GREEN}✅ Deployment Complete on Server!${NC}"
echo ""
echo -e "${BLUE}📍 Deployment Details:${NC}"
echo "   Frontend Path: $FRONTEND_DIR"
echo "   BUILD_ID: $BUILD_ID"
echo "   Backup: .next.backup.$TIMESTAMP"
ENDSSH

echo ""
echo -e "${GREEN}✅ Full Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}🧪 Next Steps - Manual Testing:${NC}"
echo "1. Visit: https://prod.qsights.com"
echo "2. Login as: bq-evaluation.evaladmin@qsights.com"
echo "3. Go to: Evaluation System → Staff Management"
echo "4. Click: Add Staff"
echo "5. Verify: Reporting Manager field visible after Employee ID"
echo "6. Check: New Joinee checkbox"
echo "7. Verify: Asterisk (*) appears in Reporting Manager label"
echo "8. Add: New joinee with manager selected"
echo "9. Check: Triggered Evaluations tab auto-refreshes"
echo "10. Verify: 'Trainee Evaluation - NJ' appears immediately"
echo ""
echo -e "${YELLOW}⚠️  Don't forget to test in browser DevTools console for errors!${NC}"
echo ""

# Cleanup local archive
rm -f .next-new-joinee-fix-$TIMESTAMP.tar.gz
echo -e "${GREEN}✅ Local cleanup complete${NC}"
