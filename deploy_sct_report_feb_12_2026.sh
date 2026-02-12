#!/bin/bash

# Deploy SCT Report Feature - February 12, 2026
# This script deploys the new Script Concordance (SCT) Report tab to Event Results

set -e

echo "🚀 Starting SCT Report Feature Deployment..."
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

# Change ownership for rsync
echo -e "${YELLOW}🔧 Preparing server for upload...${NC}"
ssh -i "$PEM_FILE" "$SERVER" "sudo chown -R ubuntu:ubuntu $REMOTE_FRONTEND/.next"

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

# Restore ownership
echo -e "${YELLOW}🔧 Restoring permissions...${NC}"
ssh -i "$PEM_FILE" "$SERVER" "sudo chown -R www-data:www-data $REMOTE_FRONTEND/.next"

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
ssh -i "$PEM_FILE" "$SERVER" "cd $REMOTE_FRONTEND && pm2 restart qsights-frontend"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PM2 restarted successfully${NC}"
else
    echo -e "${RED}❌ Failed to restart PM2${NC}"
    exit 1
fi

# Verify PM2 status
echo -e "${YELLOW}📊 Checking PM2 status...${NC}"
ssh -i "$PEM_FILE" "$SERVER" "pm2 list"

echo ""
echo -e "${GREEN}=================================================="
echo -e "✅ Deployment Completed Successfully!"
echo -e "=================================================="
echo -e "BUILD_ID: $BUILD_ID"
echo -e "URL: https://prod.qsights.com"
echo ""
echo "Feature Deployed: Script Concordance (SCT) Report"
echo ""
echo "Changes:"
echo "  ✔ Added new tab 'Script Concordance (SCT) Report' under Event Results"
echo "  ✔ Tab visible only when SCT questions exist"
echo "  ✔ Supports SCT Single Choice, Multi Select, Likert, and Likert Visual"
echo "  ✔ Participant Breakdown table with question-wise scores"
echo "  ✔ Leaderboard with ranking and total scores"
echo "  ✔ Handles negative scoring correctly"
echo "  ✔ Anonymous participant support"
echo "  ✔ CSV export for both breakdown and leaderboard"
echo "  ✔ Search functionality for participant breakdown"
echo ""
echo -e "==================================================${NC}"
