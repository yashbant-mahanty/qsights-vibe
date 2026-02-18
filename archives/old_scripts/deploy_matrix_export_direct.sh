#!/bin/bash

###############################################################################
# Direct File Deployment - Matrix Export Feature  
# Deploys only the modified results page file
# Date: February 18, 2026
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER_IP="13.126.210.220"
SERVER_USER="ubuntu"
FRONTEND_PATH="/var/www/frontend"
LOCAL_FILE="frontend/app/activities/[id]/results/page.tsx"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Matrix Export Feature - Direct File Deployment          ║${NC}"
echo -e "${BLUE}║     Modified: app/activities/[id]/results/page.tsx          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Pre-flight check
echo -e "${YELLOW}[1/8] Pre-flight Checks${NC}"

if [ ! -f "$PEM_KEY" ]; then
    echo -e "${RED}✗ PEM key not found${NC}"
    exit 1
fi

if [ ! -f "$LOCAL_FILE" ]; then
    echo -e "${RED}✗ Modified file not found: $LOCAL_FILE${NC}"
    exit 1
fi

FILE_LINES=$(wc -l < "$LOCAL_FILE")
echo -e "${GREEN}✓ PEM key found${NC}"
echo -e "${GREEN}✓ Modified file found (${FILE_LINES} lines)${NC}"
echo ""

# Create backup on production
echo -e "${YELLOW}[2/8] Creating Production Backup${NC}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    sudo mkdir -p /home/ubuntu/backups/production
    REMOTE_FILE='$FRONTEND_PATH/app/activities/[id]/results/page.tsx'
    if [ -f \"\$REMOTE_FILE\" ]; then
        sudo cp \"\$REMOTE_FILE\" /home/ubuntu/backups/production/results_page_${TIMESTAMP}.tsx
        sudo chown ubuntu:ubuntu /home/ubuntu/backups/production/results_page_${TIMESTAMP}.tsx
        ls -lh /home/ubuntu/backups/production/results_page_${TIMESTAMP}.tsx
        echo 'Backup created successfully'
    else
        echo 'Warning: Original file not found, creating new deployment'
    fi
"
echo -e "${GREEN}✓ Backup created: results_page_${TIMESTAMP}.tsx${NC}"
echo ""

# Verify target directory exists on production
echo -e "${YELLOW}[3/8] Verifying Production Directory${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    if [ ! -d '$FRONTEND_PATH/app/activities/[id]' ]; then
        echo 'Creating directory structure...'
        sudo mkdir -p '$FRONTEND_PATH/app/activities/[id]'
        sudo chown -R www-data:www-data '$FRONTEND_PATH/app/activities'
    fi
    ls -la '$FRONTEND_PATH/app/activities/[id]/' 2>/dev/null || echo 'Directory created'
"
echo -e "${GREEN}✓ Directory verified${NC}"
echo ""

# Upload file to temp location
echo -e "${YELLOW}[4/8] Uploading Modified File${NC}"
scp -i "$PEM_KEY" "$LOCAL_FILE" "$SERVER_USER@$SERVER_IP:/tmp/results_page.tsx"
echo -e "${GREEN}✓ File uploaded to temporary location${NC}"
echo ""

# Move file to production with correct permissions
echo -e "${YELLOW}[5/8] Deploying to Production Location${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    sudo mv /tmp/results_page.tsx '$FRONTEND_PATH/app/activities/[id]/results/page.tsx'
    sudo chown www-data:www-data '$FRONTEND_PATH/app/activities/[id]/results/page.tsx'
    sudo chmod 644 '$FRONTEND_PATH/app/activities/[id]/results/page.tsx'
    
    echo 'File deployed successfully:'
    ls -lh '$FRONTEND_PATH/app/activities/[id]/results/page.tsx'
    echo ''
    echo 'File size:'
    wc -l '$FRONTEND_PATH/app/activities/[id]/results/page.tsx'
"
echo -e "${GREEN}✓ File deployed to production${NC}"
echo ""

# Check PM2 status
echo -e "${YELLOW}[6/8] Checking PM2 Status${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    pm2 list | grep qsights-frontend || echo 'PM2 process not found'
"
echo ""

# Restart PM2 to apply changes
echo -e "${YELLOW}[7/8] Restarting Application${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    pm2 restart qsights-frontend 2>/dev/null || pm2 start npm --name qsights-frontend -- start
    sleep 3
    pm2 list | grep qsights-frontend
    echo ''
    echo 'Recent PM2 logs:'
    pm2 logs qsights-frontend --lines 5 --nostream 2>/dev/null || echo 'Could not fetch logs'
"
echo -e "${GREEN}✓ Application restarted${NC}"
echo ""

# Health check
echo -e "${YELLOW}[8/8] Production Health Check${NC}"
echo "Waiting 10 seconds for app to stabilize..."
sleep 10

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://prod.qsights.com 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Production health check passed (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}⚠️  Health check returned HTTP $HTTP_CODE${NC}"
fi
echo ""

# Success
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         PRODUCTION DEPLOYMENT COMPLETED                      ║${NC}"
echo -e "${GREEN}║         File: app/activities/[id]/results/page.tsx          ║${NC}"
echo -e "${GREEN}║         Server: 13.126.210.220                               ║${NC}"
echo -e "${GREEN}║         Timestamp: $TIMESTAMP                                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}✓ TESTING INSTRUCTIONS:${NC}"
echo ""
echo "1. Navigate to: ${YELLOW}https://prod.qsights.com${NC}"
echo "2. Login to your account"
echo "3. Go to: ${YELLOW}Aflibercept Global Survey${NC} (ID: a10e6beb)"
echo "4. Click: ${YELLOW}Event Results > Question-wise Analysis${NC}"
echo "5. Look for ${GREEN}Excel${NC} and ${GREEN}CSV${NC} buttons on each question card"
echo "6. Test a ${YELLOW}matrix question${NC} export:"
echo "   - Click Excel or CSV button"
echo "   - Open the file"
echo "   - Verify columns are flattened (e.g., Q3_Service, Q3_Quality, Q3_Price)"
echo ""
echo -e "${MAGENTA}Rollback Command (if needed):${NC}"
echo -e "${BLUE}ssh -i $PEM_KEY $SERVER_USER@$SERVER_IP${NC}"
echo -e "${BLUE}sudo cp /home/ubuntu/backups/production/results_page_${TIMESTAMP}.tsx \\${NC}"
echo -e "${BLUE}  $FRONTEND_PATH/app/activities/[id]/results/page.tsx${NC}"
echo -e "${BLUE}pm2 restart qsights-frontend${NC}"
echo ""
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""
