#!/bin/bash

# Deploy Edit Page Likert Scale Fix - February 2026
# This script deploys the fix for missing Likert Scale button on Edit questionnaire page

set -e

echo "🚀 Starting Edit Page Likert Scale Fix Deployment..."
echo "=================================================="

# Configuration
PEM_FILE="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
LOCAL_FRONTEND="/Users/yash/Documents/Projects/QSightsOrg2.0/frontend"
REMOTE_FRONTEND="/var/www/frontend"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verify build exists
echo -e "${YELLOW}📦 Verifying build...${NC}"
if [ ! -d "$LOCAL_FRONTEND/.next" ]; then
    echo -e "${RED}❌ Error: .next directory not found. Please run 'npm run build' first.${NC}"
    exit 1
fi

# Get BUILD_ID
BUILD_ID=$(cat "$LOCAL_FRONTEND/.next/BUILD_ID")
echo -e "${GREEN}✅ Build ID: $BUILD_ID${NC}"

# Upload .next directory
echo -e "${YELLOW}📤 Uploading .next directory to production...${NC}"
rsync -avz --delete \
    -e "ssh -i $PEM_FILE" \
    "$LOCAL_FRONTEND/.next/" \
    "$SERVER:$REMOTE_FRONTEND/.next/"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ .next directory uploaded successfully${NC}"
else
    echo -e "${RED}❌ Failed to upload .next directory${NC}"
    exit 1
fi

# Verify BUILD_ID on server
echo -e "${YELLOW}🔍 Verifying BUILD_ID on production...${NC}"
REMOTE_BUILD_ID=$(ssh -i "$PEM_FILE" "$SERVER" "cat $REMOTE_FRONTEND/.next/BUILD_ID")
echo -e "${GREEN}Remote BUILD_ID: $REMOTE_BUILD_ID${NC}"

if [ "$BUILD_ID" = "$REMOTE_BUILD_ID" ]; then
    echo -e "${GREEN}✅ BUILD_ID matches!${NC}"
else
    echo -e "${RED}❌ BUILD_ID mismatch!${NC}"
    echo "Local: $BUILD_ID"
    echo "Remote: $REMOTE_BUILD_ID"
    exit 1
fi

# Restart PM2
echo -e "${YELLOW}🔄 Restarting PM2...${NC}"
ssh -i "$PEM_FILE" "$SERVER" "cd $REMOTE_FRONTEND && pm2 restart all"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PM2 restarted successfully${NC}"
else
    echo -e "${RED}❌ Failed to restart PM2${NC}"
    exit 1
fi

# Verify PM2 status
echo -e "${YELLOW}📊 Checking PM2 status...${NC}"
ssh -i "$PEM_FILE" "$SERVER" "pm2 status"

echo ""
echo -e "${GREEN}=================================================="
echo -e "✅ Deployment Completed Successfully!"
echo -e "=================================================="
echo -e "BUILD_ID: $BUILD_ID"
echo -e "URL: https://prod.qsights.com"
echo ""
echo "Changes Deployed:"
echo "  • Edit questionnaire page now shows 3 response type buttons"
echo "  • Likert Scale button visible with full configuration panel"
echo "  • Symmetric scoring support for 2-10 scale"
echo "  • Conditional score configuration for Likert type"
echo -e "==================================================${NC}"
