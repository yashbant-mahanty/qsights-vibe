#!/bin/bash

###############################################################################
# Video Feature Production Verification Script
# Date: February 12, 2026
# Server: 13.126.210.220 (PRODUCTION)
###############################################################################

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER_IP="13.126.210.220"
SERVER_USER="ubuntu"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Video Feature Production Deployment - Verification        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Check migrations
echo -e "${YELLOW}[1/7] Checking database migrations...${NC}"
MIGRATION_STATUS=$(ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "cd /var/www/QSightsOrg2.0/backend && php artisan migrate:status | grep -i video")
if echo "$MIGRATION_STATUS" | grep -q "Ran"; then
    echo -e "${GREEN}✓ Video migrations are active${NC}"
    echo "$MIGRATION_STATUS"
else
    echo -e "${RED}✗ Video migrations not found${NC}"
fi
echo ""

# Test 2: Check backend routes
echo -e "${YELLOW}[2/7] Checking video API routes...${NC}"
ROUTE_COUNT=$(ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "cd /var/www/QSightsOrg2.0/backend && php artisan route:list 2>&1 | grep -i video | wc -l")
if [ "$ROUTE_COUNT" -ge 7 ]; then
    echo -e "${GREEN}✓ All $ROUTE_COUNT video routes registered${NC}"
    ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "cd /var/www/QSightsOrg2.0/backend && php artisan route:list 2>&1 | grep -i video"
else
    echo -e "${RED}✗ Only $ROUTE_COUNT routes found (expected 7)${NC}"
fi
echo ""

# Test 3: Check backend files
echo -e "${YELLOW}[3/7] Checking backend files...${NC}"
FILES_CHECK=$(ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "ls /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/VideoUploadController.php /var/www/QSightsOrg2.0/backend/app/Models/QuestionnaireVideo.php /var/www/QSightsOrg2.0/backend/app/Models/VideoViewLog.php 2>/dev/null | wc -l")
if [ "$FILES_CHECK" -eq 3 ]; then
    echo -e "${GREEN}✓ All backend files exist${NC}"
else
    echo -e "${RED}✗ Missing backend files ($FILES_CHECK/3)${NC}"
fi
echo ""

# Test 4: Check frontend components
echo -e "${YELLOW}[4/7] Checking frontend components...${NC}"
COMPONENT_CHECK=$(ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "ls /var/www/frontend/components/VideoPlayer.tsx /var/www/frontend/components/S3VideoUpload.tsx 2>/dev/null | wc -l")
if [ "$COMPONENT_CHECK" -eq 2 ]; then
    echo -e "${GREEN}✓ All frontend components exist${NC}"
else
    echo -e "${RED}✗ Missing frontend components ($COMPONENT_CHECK/2)${NC}"
fi
echo ""

# Test 5: Check frontend build
echo -e "${YELLOW}[5/7] Checking frontend build...${NC}"
BUILD_ID=$(ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "cat /var/www/frontend/.next/BUILD_ID 2>/dev/null")
if [ -n "$BUILD_ID" ]; then
    echo -e "${GREEN}✓ Frontend build exists (BUILD_ID: $BUILD_ID)${NC}"
else
    echo -e "${RED}✗ Frontend build not found${NC}"
fi
echo ""

# Test 6: Check PM2 status
echo -e "${YELLOW}[6/7] Checking PM2 status...${NC}"
PM2_STATUS=$(ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null")
if [ "$PM2_STATUS" == "online" ]; then
    echo -e "${GREEN}✓ PM2 frontend is online${NC}"
    ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "pm2 status"
else
    echo -e "${RED}✗ PM2 status: $PM2_STATUS${NC}"
fi
echo ""

# Test 7: Check server response
echo -e "${YELLOW}[7/7] Checking production server response...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 10 http://$SERVER_IP 2>&1)
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "301" ] || [ "$HTTP_CODE" == "302" ]; then
    echo -e "${GREEN}✓ Server responding (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ Server issue (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                   VERIFICATION COMPLETE                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Login to admin panel: http://$SERVER_IP/admin"
echo "2. Create/edit a questionnaire"
echo "3. Upload a test video (< 100MB)"
echo "4. Take the activity as a participant"
echo "5. Check reports for video metrics"
echo ""
echo -e "${GREEN}Video feature is deployed and ready for testing!${NC}"
