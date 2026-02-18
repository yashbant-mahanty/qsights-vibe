#!/bin/bash
# EMERGENCY FIX - Deploy to CORRECT production path: /var/www/frontend

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVER_USER="ubuntu"
SERVER_HOST="13.126.210.220"
PEM_FILE="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
CORRECT_FRONTEND_DIR="/var/www/frontend"
LOCAL_FRONTEND="/Users/yash/Documents/Projects/QSightsOrg2.0/frontend"

echo -e "${RED}========================================${NC}"
echo -e "${RED}EMERGENCY VIDEO FIX - CORRECT PATH${NC}"
echo -e "${RED}========================================${NC}"
echo -e "${YELLOW}Deploying to: /var/www/frontend (ACTUAL PM2 location)${NC}"
echo ""

# Step 1: Backup
echo -e "${BLUE}[1/4] Creating Backup${NC}"
ssh -i "$PEM_FILE" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
sudo mkdir -p /var/www/frontend/backups
if [ -f "/var/www/frontend/app/activities/take/[id]/page.tsx" ]; then
    sudo cp "/var/www/frontend/app/activities/take/[id]/page.tsx" \
        "/var/www/frontend/backups/page.tsx.emergency.$(date +%Y%m%d_%H%M%S)"
    echo "✓ Backup created"
else
    echo "⚠ No existing file - proceeding"
fi
ENDSSH
echo ""

# Step 2: Copy file
echo -e "${BLUE}[2/4] Deploying Fixed File${NC}"
ssh -i "$PEM_FILE" "$SERVER_USER@$SERVER_HOST" \
    "sudo mkdir -p /var/www/frontend/app/activities/take/[id]/"

scp -i "$PEM_FILE" \
    "$LOCAL_FRONTEND/app/activities/take/[id]/page.tsx" \
    "$SERVER_USER@$SERVER_HOST:/tmp/page.tsx"

ssh -i "$PEM_FILE" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
sudo mv /tmp/page.tsx "/var/www/frontend/app/activities/take/[id]/page.tsx"
sudo chown -R root:root "/var/www/frontend/app/activities/take/[id]/page.tsx"
ENDSSH
echo -e "${GREEN}✓ File deployed to /var/www/frontend${NC}"
echo ""

# Step 3: Build
echo -e "${BLUE}[3/4] Building Frontend${NC}"
ssh -i "$PEM_FILE" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /var/www/frontend
echo "→ Building Next.js..."
sudo npm run build 2>&1 | grep -E "(Compiled|Route|✓|Error)" | tail -20
echo "✓ Build complete"
ENDSSH
echo ""

# Step 4: Restart PM2
echo -e "${BLUE}[4/4] Restarting PM2${NC}"
ssh -i "$PEM_FILE" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
sudo pm2 restart qsights-frontend
sleep 2
sudo pm2 list | grep qsights-frontend
ENDSSH

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ EMERGENCY FIX DEPLOYED${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}Test immediately:${NC} https://prod.qsights.com/activities/take/a10e5460-cff2-4ad4-b79a-cabdc2727521?token=..."
echo ""
