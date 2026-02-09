#!/bin/bash

###############################################################################
# QSights Frontend Production Rollback Script
# 
# Purpose: Quickly rollback frontend to a previous backup
# Usage: ./rollback_frontend_prod.sh frontend_20260207_143000
# 
# This script will:
# 1. Verify backup exists
# 2. Create pre-rollback backup of current state
# 3. Stop PM2 process
# 4. Restore from specified backup
# 5. Verify BUILD_ID
# 6. Restart PM2
# 7. Verify deployment
#
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROD_SERVER="13.126.210.220"
PROD_USER="ubuntu"
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
FRONTEND_PATH="/var/www/frontend"
BACKUP_DIR="/home/ubuntu/backups/production"
PM2_PROCESS="qsights-frontend"

# Check arguments
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Error: No backup filename provided${NC}"
    echo ""
    echo "Usage: $0 <backup_filename>"
    echo ""
    echo "Example: $0 frontend_20260207_143000"
    echo ""
    echo "Available backups:"
    ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" "ls -lh $BACKUP_DIR/frontend_*.tar.gz" 2>/dev/null || echo "  (Unable to list backups)"
    exit 1
fi

BACKUP_NAME="$1"
BACKUP_FILE="${BACKUP_NAME}.tar.gz"

# Add .tar.gz if not provided
if [[ ! "$BACKUP_FILE" == *.tar.gz ]]; then
    BACKUP_FILE="${BACKUP_NAME}.tar.gz"
fi

echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
echo -e "${RED}   ⚠️  PRODUCTION FRONTEND ROLLBACK WARNING ⚠️${NC}"
echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Server:${NC} $PROD_SERVER"
echo -e "${YELLOW}Target Backup:${NC} $BACKUP_FILE"
echo -e "${YELLOW}Path:${NC} $FRONTEND_PATH"
echo ""
echo -e "${RED}This will REPLACE the current production frontend!${NC}"
echo -e "${RED}Current frontend will be backed up before rollback.${NC}"
echo ""
read -p "Type 'ROLLBACK' to confirm: " CONFIRM

if [ "$CONFIRM" != "ROLLBACK" ]; then
    echo -e "${YELLOW}Rollback cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Starting Rollback Process...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Verify backup exists
echo -e "${BLUE}Step 1/7:${NC} Verifying backup exists..."
BACKUP_EXISTS=$(ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" "[ -f $BACKUP_DIR/$BACKUP_FILE ] && echo 'yes' || echo 'no'")

if [ "$BACKUP_EXISTS" != "yes" ]; then
    echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
    echo ""
    echo "Available backups:"
    ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" "ls -lh $BACKUP_DIR/frontend_*.tar.gz"
    exit 1
fi

BACKUP_SIZE=$(ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" "du -h $BACKUP_DIR/$BACKUP_FILE | cut -f1")
echo -e "${GREEN}✅ Backup found: $BACKUP_FILE ($BACKUP_SIZE)${NC}"

# Step 2: Create pre-rollback backup
echo ""
echo -e "${BLUE}Step 2/7:${NC} Creating pre-rollback backup of current state..."
PRE_ROLLBACK_BACKUP="frontend_pre_rollback_$(date +%Y%m%d_%H%M%S).tar.gz"

ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" << ENDSSH
    cd /var/www/frontend
    sudo tar -czf /home/ubuntu/backups/production/$PRE_ROLLBACK_BACKUP .next/ package.json 2>/dev/null || true
    sudo chown ubuntu:ubuntu /home/ubuntu/backups/production/$PRE_ROLLBACK_BACKUP
ENDSSH

echo -e "${GREEN}✅ Pre-rollback backup created: $PRE_ROLLBACK_BACKUP${NC}"

# Step 3: Stop PM2 process
echo ""
echo -e "${BLUE}Step 3/7:${NC} Stopping PM2 process..."
ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" "pm2 stop $PM2_PROCESS 2>/dev/null || pm2 stop qsights-frontend 2>/dev/null || true"
echo -e "${GREEN}✅ PM2 process stopped${NC}"

# Step 4: Move current .next
echo ""
echo -e "${BLUE}Step 4/7:${NC} Moving current frontend build..."
FAILED_BACKUP=".next_failed_$(date +%Y%m%d_%H%M%S)"
ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" "cd $FRONTEND_PATH && sudo mv .next $FAILED_BACKUP 2>/dev/null || true"
echo -e "${GREEN}✅ Current build moved to: $FAILED_BACKUP${NC}"

# Step 5: Extract backup
echo ""
echo -e "${BLUE}Step 5/7:${NC} Extracting backup..."
ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" << ENDSSH
    cd $FRONTEND_PATH
    sudo tar -xzf $BACKUP_DIR/$BACKUP_FILE
    sudo chown -R www-data:www-data .next/
    sudo chown www-data:www-data package.json
ENDSSH
echo -e "${GREEN}✅ Backup extracted and permissions set${NC}"

# Step 6: Verify BUILD_ID
echo ""
echo -e "${BLUE}Step 6/7:${NC} Verifying BUILD_ID..."
DEPLOYED_BUILD_ID=$(ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" "cat $FRONTEND_PATH/.next/BUILD_ID 2>/dev/null || echo 'not-found'")

if [ "$DEPLOYED_BUILD_ID" != "not-found" ]; then
    echo -e "${GREEN}✅ BUILD_ID found: $DEPLOYED_BUILD_ID${NC}"
else
    echo -e "${RED}⚠️  Warning: BUILD_ID not found in backup${NC}"
fi

# Step 7: Restart PM2
echo ""
echo -e "${BLUE}Step 7/7:${NC} Restarting PM2 process..."
ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" << 'ENDSSH'
    pm2 restart qsights-frontend 2>/dev/null || pm2 restart qsights-frontend-preprod 2>/dev/null || {
        cd /var/www/frontend
        pm2 start npm --name qsights-frontend -- start
    }
    pm2 save
    sleep 3
    pm2 list
ENDSSH
echo -e "${GREEN}✅ PM2 restarted${NC}"

# Health Checks
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Running Health Checks...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

sleep 5

# Check if site is accessible
echo "Checking site accessibility..."
HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" https://prod.qsights.com)

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ Site Health Check: PASSED (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${RED}⚠️  Site Health Check: WARNING (HTTP $HTTP_STATUS)${NC}"
    echo "   Please check PM2 logs immediately!"
fi

# Check BUILD_ID
if [ "$DEPLOYED_BUILD_ID" != "not-found" ]; then
    echo ""
    echo "Checking BUILD_ID in served page..."
    SERVED_BUILD_ID=$(curl -s https://prod.qsights.com | grep -o '"buildId":"[^"]*"' | cut -d'"' -f4 || echo "")
    
    if [ -n "$SERVED_BUILD_ID" ]; then
        if [ "$SERVED_BUILD_ID" == "$DEPLOYED_BUILD_ID" ]; then
            echo -e "${GREEN}✅ BUILD_ID Match: Correct version is live${NC}"
        else
            echo -e "${YELLOW}⚠️  BUILD_ID Mismatch:${NC}"
            echo "   Deployed: $DEPLOYED_BUILD_ID"
            echo "   Served: $SERVED_BUILD_ID"
            echo "   (PM2 may need more time to reload)"
        fi
    else
        echo -e "${YELLOW}⚠️  Could not extract served BUILD_ID${NC}"
    fi
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ ROLLBACK COMPLETED${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Rollback Details:${NC}"
echo "  • Rolled back to: $BACKUP_FILE"
echo "  • Pre-rollback backup: $PRE_ROLLBACK_BACKUP"
echo "  • Failed deployment saved as: $FAILED_BACKUP"
if [ "$DEPLOYED_BUILD_ID" != "not-found" ]; then
    echo "  • BUILD_ID: $DEPLOYED_BUILD_ID"
fi
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Test the site: https://prod.qsights.com"
echo "  2. Check PM2 logs:"
echo "     ssh to server → pm2 logs qsights-frontend"
echo "  3. Verify all pages load correctly"
echo "  4. Monitor for 15-30 minutes"
echo "  5. Investigate what went wrong in the failed deployment"
echo ""
echo -e "${YELLOW}If rollback failed, you can restore from:${NC}"
echo "  • Pre-rollback backup: $PRE_ROLLBACK_BACKUP"
echo "  • Or use: ./rollback_frontend_prod.sh <another_backup>"
echo ""
echo -e "${YELLOW}Check PM2 status:${NC}"
echo "  ssh to server"
echo "  pm2 list"
echo "  pm2 logs qsights-frontend --lines 50"
echo ""

exit 0
