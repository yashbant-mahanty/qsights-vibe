#!/bin/bash

# Critical Fixes Deployment Script
# This script deploys the 4 critical fixes to production
# Date: January 15, 2026

set -e  # Exit on any error

echo "=========================================="
echo "QSights Critical Fixes Deployment"
echo "=========================================="
echo ""
echo "Fixes included:"
echo "1. Question-wise Analysis - Display response data correctly"
echo "2. Notification Bell - Color indicator for unread notifications"
echo "3. Contact Us - UUID validation fix"
echo "4. Reminders Button - Hide when not enabled"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
LOCAL_DIR="/Users/yash/Documents/Projects/QSightsOrg2.0/frontend"
REMOTE_USER="ubuntu"
REMOTE_HOST="localhost"
REMOTE_PORT="3399"
REMOTE_DIR="/var/www/frontend"
SSH_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
BACKUP_DIR="/var/www/qsights/backups/frontend_backup_$(date +%Y%m%d_%H%M%S)"

echo -e "${YELLOW}Step 1: Building frontend locally...${NC}"
cd "$LOCAL_DIR"
if npm run build; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed! Deployment aborted.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Creating backup on production server...${NC}"
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $BACKUP_DIR"
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "cp -r $REMOTE_DIR/app $BACKUP_DIR/" || true
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "cp -r $REMOTE_DIR/components $BACKUP_DIR/" || true
echo -e "${GREEN}✓ Backup created at $BACKUP_DIR${NC}"

echo ""
echo -e "${YELLOW}Step 3: Deploying fixed files to production...${NC}"

# First copy files to temp location, then move with sudo
echo "  - Deploying results page (Question-wise Analysis fix)..."
scp -i "$SSH_KEY" -P "$REMOTE_PORT" \
    "$LOCAL_DIR/app/activities/[id]/results/page.tsx" \
    "$REMOTE_USER@$REMOTE_HOST:/tmp/"
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" \
    "sudo mv /tmp/page.tsx $REMOTE_DIR/app/activities/[id]/results/page.tsx"

echo "  - Deploying notification bell (Color indicator fix)..."
scp -i "$SSH_KEY" -P "$REMOTE_PORT" \
    "$LOCAL_DIR/components/notification-bell.tsx" \
    "$REMOTE_USER@$REMOTE_HOST:/tmp/"
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" \
    "sudo mv /tmp/notification-bell.tsx $REMOTE_DIR/components/notification-bell.tsx"

echo "  - Deploying EventContactModal (UUID validation fix)..."
scp -i "$SSH_KEY" -P "$REMOTE_PORT" \
    "$LOCAL_DIR/components/EventContactModal.tsx" \
    "$REMOTE_USER@$REMOTE_HOST:/tmp/"
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" \
    "sudo mv /tmp/EventContactModal.tsx $REMOTE_DIR/components/EventContactModal.tsx"

echo "  - Deploying take page (Reminders button fix)..."
scp -i "$SSH_KEY" -P "$REMOTE_PORT" \
    "$LOCAL_DIR/app/activities/take/[id]/page.tsx" \
    "$REMOTE_USER@$REMOTE_HOST:/tmp/take-page.tsx"
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" \
    "sudo mv /tmp/take-page.tsx $REMOTE_DIR/app/activities/take/[id]/page.tsx"

echo -e "${GREEN}✓ Files deployed${NC}"

echo ""
echo -e "${YELLOW}Step 4: Building on production server...${NC}"
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
    cd /var/www/frontend
    echo "Running npm install (if needed)..."
    sudo npm install --legacy-peer-deps > /dev/null 2>&1 || true
    echo "Building application..."
    if sudo npm run build; then
        echo "Build successful"
    else
        echo "Build failed!"
        exit 1
    fi
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Production build successful${NC}"
else
    echo -e "${RED}✗ Production build failed! Rolling back...${NC}"
    ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" \
        "cp -r $BACKUP_DIR/app/* $REMOTE_DIR/app/ && cp -r $BACKUP_DIR/components/* $REMOTE_DIR/components/"
    echo -e "${YELLOW}Rolled back to backup. Please check the errors.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 5: Restarting PM2 processes...${NC}"
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
    sudo pm2 restart qsights-frontend
    sudo pm2 save
ENDSSH
echo -e "${GREEN}✓ PM2 restarted${NC}"

echo ""
echo -e "${GREEN}=========================================="
echo "Deployment completed successfully!"
echo "==========================================${NC}"
echo ""
echo "Backup location: $BACKUP_DIR"
echo ""
echo "Please verify the following:"
echo "1. Visit the activity results page and check Question-wise Analysis tab"
echo "2. Check notification bell icon changes color when there are unread notifications"
echo "3. Test Contact Us form from participant page"
echo "4. Verify Reminders Off button is hidden when reminders are disabled"
echo ""
echo -e "${YELLOW}If you encounter any issues, rollback with:${NC}"
echo "ssh -i $SSH_KEY -p $REMOTE_PORT $REMOTE_USER@$REMOTE_HOST 'cp -r $BACKUP_DIR/* $REMOTE_DIR/ && cd $REMOTE_DIR && npm run build && pm2 restart qsights-frontend'"
echo ""
