#!/bin/bash

# SCT Report Scoring Fix Deployment Script
# Date: February 12, 2026
# Fix: Correct answer field names (value/value_array) and label-to-score mapping

set -e  # Exit on any error

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Production server details
PROD_SERVER="ubuntu@13.126.210.220"
PEM_FILE="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
REMOTE_PATH="/var/www/frontend"
LOCAL_BUILD_PATH="/Users/yash/Documents/Projects/QSightsOrg2.0/frontend/.next"

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}   SCT REPORT SCORING FIX DEPLOYMENT${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Fix Details:${NC}"
echo "  - Corrected answer field: answer.answer → answer.value"
echo "  - Added label-to-score mapping for single/multi select"
echo "  - Fixed value_array handling for multi-select"
echo "  - Added fallback for numeric indexes"
echo ""

# Get local BUILD_ID
LOCAL_BUILD_ID=$(cat ${LOCAL_BUILD_PATH}/BUILD_ID)
echo -e "${GREEN}✓ Local BUILD_ID: ${LOCAL_BUILD_ID}${NC}"

# Upload .next directory
echo -e "${BLUE}📤 Uploading .next directory to production...${NC}"
rsync -avz --delete \
  -e "ssh -i ${PEM_FILE} -o StrictHostKeyChecking=no" \
  ${LOCAL_BUILD_PATH}/ \
  ${PROD_SERVER}:${REMOTE_PATH}/.next/

echo -e "${GREEN}✅ .next directory uploaded successfully${NC}"

# Verify BUILD_ID on server
REMOTE_BUILD_ID=$(ssh -i ${PEM_FILE} ${PROD_SERVER} "cat ${REMOTE_PATH}/.next/BUILD_ID")
echo -e "${YELLOW}Remote BUILD_ID: ${REMOTE_BUILD_ID}${NC}"

if [ "${LOCAL_BUILD_ID}" == "${REMOTE_BUILD_ID}" ]; then
    echo -e "${GREEN}✅ BUILD_ID matches!${NC}"
else
    echo -e "${RED}❌ BUILD_ID mismatch! Deployment may have failed.${NC}"
    exit 1
fi

# Fix ownership
echo -e "${BLUE}🔧 Fixing file ownership...${NC}"
ssh -i ${PEM_FILE} ${PROD_SERVER} "sudo chown -R www-data:www-data ${REMOTE_PATH}/.next"

# Restart PM2
echo -e "${BLUE}🔄 Restarting PM2...${NC}"
ssh -i ${PEM_FILE} ${PROD_SERVER} "pm2 restart qsights-frontend"

sleep 3

# Check PM2 status
PM2_STATUS=$(ssh -i ${PEM_FILE} ${PROD_SERVER} "pm2 jlist" | jq -r '.[0] | "\(.pm2_env.status) (restart \(.pm2_env.restart_time))"')
echo -e "${GREEN}✅ PM2 restarted successfully${NC}"
echo -e "   PM2 Status: ${PM2_STATUS}"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ Deployment Completed Successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Deployment Details:${NC}"
echo "  Build ID: ${LOCAL_BUILD_ID}"
echo "  Server: ${PROD_SERVER}"
echo "  URL: https://prod.qsights.com"
echo "  Feature: SCT Report Scoring Fix"
echo ""
echo -e "${YELLOW}Testing Instructions:${NC}"
echo "  1. Go to: Event Results → SCT Report"
echo "  2. Verify scores now show correct values"
echo "  3. Check both Participant Breakdown and Leaderboard tabs"
echo "  4. Verify Total Score and Average calculations"
echo ""
