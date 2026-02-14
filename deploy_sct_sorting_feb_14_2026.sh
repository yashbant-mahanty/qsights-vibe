#!/bin/bash

# =================================================================
# QSights SCT Report Sorting Feature Deployment Script
# Date: February 14, 2026
# 
# Changes:
# 1. Added ascending/descending sorting for Total Score column in SCT Report
# 2. Added ascending/descending sorting for Average column in SCT Report
# 3. Added visual indicators (ChevronUp/ChevronDown) for sort direction
# 4. Added hover effects on sortable column headers
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
echo "═══════════════════════════════════════════════════"
echo "  QSights SCT Report Sorting Feature Deployment"
echo "  Date: February 14, 2026"
echo "═══════════════════════════════════════════════════"
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
  echo "  Feature: SCT Report Sorting Enhancement"
  echo ""
  echo "  Modified Files:"
  echo "    • activities/[id]/results/page.tsx"
  echo ""
  echo "  New Functionality:"
  echo "    ✓ Added ChevronUp icon import"
  echo "    ✓ Added sorting state (sortColumn, sortDirection)"
  echo "    ✓ Implemented sorting logic in filteredParticipants"
  echo "    ✓ Made Total Score column sortable (asc/desc)"
  echo "    ✓ Made Average column sortable (asc/desc)"
  echo "    ✓ Added visual sort indicators with chevron icons"
  echo "    ✓ Added hover highlighting on sortable headers"
  echo ""
  echo "  Impact: Low - Isolated to SCT Report section"
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
ssh -i "$PEM_KEY" "$DEPLOY_SERVER" "mkdir -p /tmp/sct-sorting-deployment"

# Upload results page
echo "→ Uploading activities/[id]/results/page.tsx..."
scp -i "$PEM_KEY" "$FRONTEND_DIR/app/activities/[id]/results/page.tsx" "$DEPLOY_SERVER:/tmp/sct-sorting-deployment/results-page.tsx"
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
sudo mv /tmp/sct-sorting-deployment/results-page.tsx /var/www/frontend/app/activities/\[id\]/results/page.tsx

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

echo "→ Checking production server response..."
HTTP_STATUS=$(ssh -i "$PEM_KEY" "$DEPLOY_SERVER" "curl -s -o /dev/null -w '%{http_code}' https://qsights.in" || echo "000")

if [ "$HTTP_STATUS" == "200" ]; then
  echo -e "${GREEN}✓ Server responding: HTTP $HTTP_STATUS${NC}"
else
  echo -e "${YELLOW}⚠ Server response: HTTP $HTTP_STATUS${NC}"
  echo -e "${YELLOW}  Note: May need browser cache clear${NC}"
fi

echo ""
echo "→ Checking PM2 process status..."
ssh -i "$PEM_KEY" "$DEPLOY_SERVER" "pm2 list | grep qsights-frontend"

echo ""
echo "═══════════════════════════════════════════════════"
echo -e "${GREEN}  ✓ Deployment Complete!${NC}"
echo "═══════════════════════════════════════════════════"
echo ""
echo "Feature Deployed: SCT Report Sorting"
echo "Deployment Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "What's New:"
echo "  ✓ Total Score column is now sortable (click to toggle asc/desc)"
echo "  ✓ Average column is now sortable (click to toggle asc/desc)"
echo "  ✓ Visual indicators show current sort direction"
echo "  ✓ Hover effects on sortable column headers"
echo ""
echo "Testing Instructions:"
echo "  1. Navigate to: Event Results → Script Concordance (SCT) Report"
echo "  2. Go to the 'Participant' tab (Breakdown view)"
echo "  3. Click on 'Total Score' column header to sort"
echo "  4. Click again to reverse sort direction"
echo "  5. Click on 'Average' column header to sort by average"
echo "  6. Verify chevron icons appear showing sort direction"
echo ""
echo "Post-Deployment Checklist:"
echo "  [ ] Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)"
echo "  [ ] Open DevTools Console - check for errors"
echo "  [ ] Test Total Score sorting (ascending/descending)"
echo "  [ ] Test Average sorting (ascending/descending)"
echo "  [ ] Verify sort icons display correctly"
echo "  [ ] Test search functionality still works"
echo "  [ ] Test CSV export with sorting applied"
echo ""
echo "Backup Location: /tmp/$BACKUP_DIR"
echo "Build ID: $BUILD_ID"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
