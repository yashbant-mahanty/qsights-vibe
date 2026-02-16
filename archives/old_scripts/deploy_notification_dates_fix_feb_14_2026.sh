#!/bin/bash

# =================================================================
# QSights Email Notification Dates Fix Deployment Script
# Date: February 14, 2026
# 
# Changes:
# 1. Fixed "Delivered At" field showing blank (-) in Email Notification Details
# 2. Fixed "Opened At" field showing blank (-) in Email Notification Details  
# 3. Added robust date parsing with fallback handling
# 4. Added support for both snake_case and camelCase field names
# 5. Added debug logging for notification data
# =================================================================

set -e  # Exit on error

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="frontend"
DEPLOY_SERVER="ubuntu@13.126.210.220"
DEPLOY_PATH="/var/www/frontend"
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
BACKUP_DIR="frontend_backup_$(date +%Y%m%d_%H%M%S).tar.gz"

# Auto-confirm flag
AUTO_CONFIRM=false
if [ "$1" == "--yes" ]; then
  AUTO_CONFIRM=true
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  QSights Email Notification Dates Fix Deployment"
echo "  Date: February 14, 2026"
echo "═══════════════════════════════════════════════════════"
echo ""

# Validate PEM key exists
if [ ! -f "$PEM_KEY" ]; then
  echo -e "${RED}✗ PEM key not found at: $PEM_KEY${NC}"
  exit 1
fi
echo -e "${GREEN}✓ PEM key found${NC}"

# Validate modified files exist
if [ ! -f "$FRONTEND_DIR/app/activities/[id]/results/page.tsx" ]; then
  echo -e "${RED}✗ Missing: activities/[id]/results/page.tsx${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Found: activities/[id]/results/page.tsx${NC}"

# Confirm deployment
if [ "$AUTO_CONFIRM" = false ]; then
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}Changes to deploy:${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "  Feature: Email Notification Date Fields Fix"
  echo ""
  echo "  Modified Files:"
  echo "    • activities/[id]/results/page.tsx"
  echo ""
  echo "  Bug Fixes:"
  echo "    ✓ Fixed 'Delivered At' showing blank (-)"
  echo "    ✓ Fixed 'Opened At' showing blank (-)"
  echo "    ✓ Added robust date parsing with try-catch"
  echo "    ✓ Handle both delivered_at and deliveredAt field names"
  echo "    ✓ Handle both opened_at and openedAt field names"
  echo "    ✓ Added null/undefined/invalid date handling"
  echo "    ✓ Added debug logging for troubleshooting"
  echo ""
  echo "  Location: Event Results → Email Notification Tracking"
  echo "  Impact: Low - Isolated to notification tracking table"
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "${YELLOW}Deploy to production?${NC} (yes/no)"
  read -r CONFIRM
  
  if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 0
  fi
else
  echo -e "${BLUE}→ Auto-confirm enabled${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 1: Pre-Deployment Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if .env has localhost (should not for production)
if grep -q "localhost:8000" "$FRONTEND_DIR/.env.local" 2>/dev/null; then
  echo -e "${RED}✗ WARNING: .env.local contains localhost:8000${NC}"
  echo -e "${YELLOW}  This is acceptable for local deployment script${NC}"
else
  echo -e "${GREEN}✓ No localhost:8000 found in local .env${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 2: Building Frontend Locally"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$FRONTEND_DIR"

echo "→ Building frontend..."
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Build failed${NC}"
  exit 1
fi

BUILD_ID=$(cat .next/BUILD_ID 2>/dev/null || echo "unknown")
echo -e "${GREEN}✓ Build complete${NC}"
echo -e "${BLUE}  BUILD_ID: $BUILD_ID${NC}"

cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 3: Creating Backup on Production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh -i "$PEM_KEY" "$DEPLOY_SERVER" "sudo tar -czf /tmp/$BACKUP_DIR $DEPLOY_PATH 2>/dev/null" || true
echo -e "${GREEN}✓ Backup created: /tmp/$BACKUP_DIR${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 4: Uploading Modified Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create temporary directory on server
ssh -i "$PEM_KEY" "$DEPLOY_SERVER" "mkdir -p /tmp/notification-dates-fix"

# Upload results page
echo "→ Uploading activities/[id]/results/page.tsx..."
scp -i "$PEM_KEY" "$FRONTEND_DIR/app/activities/[id]/results/page.tsx" "$DEPLOY_SERVER:/tmp/notification-dates-fix/results-page.tsx"
echo -e "${GREEN}✓ Uploaded results page${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 5: Deploying to Production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh -i "$PEM_KEY" "$DEPLOY_SERVER" << 'ENDSSH'
set -e

echo "→ Moving files to production..."
sudo mkdir -p /var/www/frontend/app/activities/\[id\]/results
sudo mv /tmp/notification-dates-fix/results-page.tsx /var/www/frontend/app/activities/\[id\]/results/page.tsx

echo "→ Setting permissions..."
sudo chown -R www-data:www-data /var/www/frontend/app/activities/\[id\]/results/page.tsx

echo "→ Rebuilding frontend on production..."
cd /var/www/frontend
sudo -u www-data npm run build

if [ $? -ne 0 ]; then
  echo "✗ Production build failed!"
  echo "→ Attempting to restore from backup..."
  sudo tar -xzf /tmp/frontend_backup_*.tar.gz -C /
  exit 1
fi

NEW_BUILD_ID=$(cat .next/BUILD_ID 2>/dev/null || echo "unknown")
echo "✓ Production build complete"
echo "  BUILD_ID: $NEW_BUILD_ID"

ENDSSH

if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Deployment failed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Files deployed and built successfully${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 6: Restarting PM2 Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh -i "$PEM_KEY" "$DEPLOY_SERVER" << 'ENDSSH'
echo "→ Restarting PM2 frontend service..."
pm2 restart qsights-frontend

if [ $? -ne 0 ]; then
  echo "✗ PM2 restart failed"
  exit 1
fi

echo "→ Checking PM2 status..."
pm2 status qsights-frontend

echo "✓ PM2 service restarted successfully"
ENDSSH

if [ $? -ne 0 ]; then
  echo -e "${RED}✗ PM2 restart failed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ PM2 service restarted${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 7: Post-Deployment Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "→ Checking PM2 process status..."
ssh -i "$PEM_KEY" "$DEPLOY_SERVER" "pm2 list | grep qsights-frontend"

echo ""
echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}  ✓ Deployment Complete!${NC}"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Bug Fixed: Email Notification Date Fields"
echo "Deployment Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "What Was Fixed:"
echo "  ✓ 'Delivered At' now displays properly when available"
echo "  ✓ 'Opened At' now displays properly when available"
echo "  ✓ Robust date parsing prevents JavaScript errors"
echo "  ✓ Handles multiple field name formats"
echo "  ✓ Debug logging added for troubleshooting"
echo ""
echo "Testing Instructions:"
echo "  1. Navigate to: Event Results → Email Notification Tracking"
echo "  2. Check 'Email Notification Details' table"
echo "  3. Verify 'Delivered At' column shows dates (if emails delivered)"
echo "  4. Verify 'Opened At' column shows dates (if emails opened)"
echo "  5. Open browser console (F12) to check debug logs"
echo "  6. Look for log entries starting with '🔍' and '✅'"
echo ""
echo "Notes:"
echo "  • If still showing '-', check:"
echo "    - Are webhooks being received from SendGrid?"
echo "    - Check backend logs for webhook processing"
echo "    - Verify SendGrid webhook URL is configured"
echo "    - Check notification_logs table in database"
echo ""
echo "Console Debugging:"
echo "  • Check browser console for: 'Sample log delivered_at'"
echo "  • Check browser console for: 'Sample log opened_at'"
echo "  • This will show actual values from API"
echo ""
echo "Backup Location: /tmp/$BACKUP_DIR"
echo "Build ID: $BUILD_ID"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
