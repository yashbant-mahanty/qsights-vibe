#!/bin/bash

# =================================================================
# QSights Filter Layout Fix Deployment Script
# Date: February 14, 2026
# 
# Changes:
# - Fixed Event Breakdown filter layout to prevent wrapping
# - Moved all filters below the title/subtitle section
# =================================================================

set -e  # Exit on error

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
FRONTEND_DIR="frontend"
DEPLOY_SERVER="ubuntu@13.126.210.220"
DEPLOY_PATH="/var/www/frontend"
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
BACKUP_DIR="/tmp/frontend_backup_$(date +%Y%m%d_%H%M%S).tar.gz"

# Auto-confirm flag
AUTO_CONFIRM=false
if [ "$1" == "--yes" ]; then
  AUTO_CONFIRM=true
fi

echo ""
echo "═══════════════════════════════════════════"
echo "  QSights Filter Layout Fix Deployment"
echo "═══════════════════════════════════════════"
echo ""

# Validate PEM key exists
if [ ! -f "$PEM_KEY" ]; then
  echo -e "${RED}✗ PEM key not found at: $PEM_KEY${NC}"
  exit 1
fi
echo -e "${GREEN}✓ PEM key found${NC}"

# Validate modified file exists
if [ ! -f "$FRONTEND_DIR/app/dashboard/page.tsx" ]; then
  echo -e "${RED}✗ Missing: dashboard/page.tsx${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Found: dashboard/page.tsx${NC}"

# Confirm deployment
if [ "$AUTO_CONFIRM" = false ]; then
  echo ""
  echo -e "${YELLOW}Changes to deploy:${NC}"
  echo "  - Fixed Event Breakdown filter layout to prevent breaking"
  echo "  - All filters now display below title section"
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
echo "  Step 1: Building Frontend"
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
echo "  Step 2: Creating Backup on Production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh -i "$PEM_KEY" "$DEPLOY_SERVER" "sudo tar -czf $BACKUP_DIR $DEPLOY_PATH" 2>/dev/null || true
echo -e "${GREEN}✓ Backup created: $BACKUP_DIR${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 3: Uploading Modified File"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh -i "$PEM_KEY" "$DEPLOY_SERVER" "mkdir -p /tmp/layout-fix"

echo "→ Uploading dashboard/page.tsx..."
scp -i "$PEM_KEY" "$FRONTEND_DIR/app/dashboard/page.tsx" "$DEPLOY_SERVER:/tmp/layout-fix/dashboard-page.tsx"
echo -e "${GREEN}✓ Uploaded dashboard page${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 4: Deploying to Production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh -i "$PEM_KEY" "$DEPLOY_SERVER" << 'ENDSSH'
set -e

echo "→ Moving file to production..."
sudo mv /tmp/layout-fix/dashboard-page.tsx /var/www/frontend/app/dashboard/page.tsx

echo "→ Setting permissions..."
sudo chown www-data:www-data /var/www/frontend/app/dashboard/page.tsx

echo "→ Rebuilding frontend on production..."
cd /var/www/frontend
sudo -u www-data npm run build

if [ $? -ne 0 ]; then
  echo "✗ Production build failed"
  exit 1
fi

NEW_BUILD_ID=$(cat .next/BUILD_ID 2>/dev/null || echo "unknown")
echo "✓ New BUILD_ID: $NEW_BUILD_ID"

echo "→ Restarting Next.js..."
sudo pkill -9 -f next || true
sleep 2

echo "→ Starting PM2..."
sudo pm2 delete qsights-frontend 2>/dev/null || true
sudo pm2 start npm --name qsights-frontend -- start
sudo pm2 save

echo ""
echo "✅ Deployment complete!"
ENDSSH

if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Deployment failed${NC}"
  echo ""
  echo "To rollback, run on production server:"
  echo "  sudo tar -xzf $BACKUP_DIR -C /"
  echo "  cd $DEPLOY_PATH && sudo -u www-data npm run build"
  echo "  sudo pm2 restart qsights-frontend"
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════"
echo -e "${GREEN}✅ DEPLOYMENT SUCCESS${NC}"
echo "═══════════════════════════════════════════"
echo ""
echo "🔍 POST-DEPLOYMENT CHECKLIST:"
echo "   1. Visit: https://prod.qsights.com/dashboard"
echo "   2. Navigate to Revenue & Subscriptions tab"
echo "   3. Verify filters are now below the title"
echo "   4. Check that all 5 filters display correctly"
echo "   5. Verify no layout breaking/wrapping"
echo ""
echo "⚠️  If any issues occur:"
echo "   • Check browser console (F12) for errors"
echo "   • Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo "   • Rollback if needed from: $BACKUP_DIR"
echo ""
echo "Happy Testing! 🎉"
echo ""
