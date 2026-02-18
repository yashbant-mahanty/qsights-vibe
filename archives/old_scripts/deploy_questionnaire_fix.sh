#!/bin/bash

###############################################################################
# Emergency Fix - Questionnaire Page Duplicate Menu Bug
# Server: PRODUCTION (13.126.210.220)
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER_IP="13.126.210.220"
SERVER_USER="ubuntu"
FRONTEND_PATH="/var/www/frontend"

echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  EMERGENCY FIX: Questionnaire Page Duplicate Menu Bug        ${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Deploy the fixed file
echo -e "${YELLOW}📤 Deploying fixed questionnaires/page.tsx...${NC}"
scp -i "$PEM_KEY" \
    /Users/yash/Documents/Projects/QSightsOrg2.0/frontend/app/questionnaires/page.tsx \
    "$SERVER_USER@$SERVER_IP:$FRONTEND_PATH/app/questionnaires/"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ File deployed successfully${NC}"
else
    echo -e "${RED}✗ File deployment failed${NC}"
    exit 1
fi

# Step 2: Rebuild and restart
echo ""
echo -e "${YELLOW}🔨 Building and restarting frontend...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
cd /var/www/frontend
echo "Running npm run build..."
npm run build
if [ $? -eq 0 ]; then
    echo "✓ Build successful"
    echo "Restarting PM2..."
    pm2 restart qsights-frontend
    echo "✓ PM2 restarted"
else
    echo "✗ Build failed"
    exit 1
fi
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build and restart completed${NC}"
else
    echo -e "${RED}✗ Build or restart failed${NC}"
    exit 1
fi

# Step 3: Health check
echo ""
echo -e "${YELLOW}🏥 Performing health check...${NC}"
sleep 3

RESPONSE=$(curl -s -o /dev/null -w '%{http_code}' https://prod.qsights.com)
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Production site is healthy (HTTP $RESPONSE)${NC}"
else
    echo -e "${RED}✗ Production site returned HTTP $RESPONSE${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ EMERGENCY FIX DEPLOYED SUCCESSFULLY                        ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Please test the Questionnaires page to verify:"
echo -e "  • Navigation menu appears only ONCE"
echo -e "  • No duplicate headers/sidebars"
echo -e "  • Page loads correctly with no errors"
echo ""
