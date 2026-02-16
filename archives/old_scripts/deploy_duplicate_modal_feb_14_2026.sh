#!/bin/bash

###############################################################################
# Duplicate Modal Enhancement Deployment - February 14, 2026
# 
# FEATURE: Standardized duplicate confirmation modal for Questionnaires
# FILES:
#   - frontend/components/duplicate-confirmation-modal.tsx (Updated)
#   - frontend/app/questionnaires/page.tsx (Updated)
#
# PRODUCTION PATHS:
#   Frontend: /var/www/frontend
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
LOCAL_FRONTEND="/Users/yash/Documents/Projects/QSightsOrg2.0/frontend"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Duplicate Modal Enhancement - Feb 14, 2026             ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Verify PEM file
if [ ! -f "$PEM_KEY" ]; then
    echo -e "${RED}✗ PEM key not found at $PEM_KEY${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PEM key found${NC}"

# Verify local files exist
echo -e "${BLUE}Verifying modified files...${NC}"
FILES_TO_CHECK=(
    "$LOCAL_FRONTEND/components/duplicate-confirmation-modal.tsx"
    "$LOCAL_FRONTEND/app/questionnaires/page.tsx"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}✗ File not found: $file${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Found: $(basename $file)${NC}"
done
echo ""

# Feature description
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}FEATURE DETAILS:${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""
echo "✨ ENHANCEMENTS:"
echo "   • Standardized duplicate confirmation modal"
echo "   • QSights-style alert box for Questionnaires"
echo "   • Matches Event list page duplicate modal design"
echo ""
echo "📝 CHANGES:"
echo "   • duplicate-confirmation-modal.tsx - Added itemType prop for dynamic content"
echo "   • questionnaires/page.tsx - Integrated DuplicateConfirmationModal component"
echo ""
echo "🎯 WHAT USERS GET:"
echo "   • Professional confirmation dialog for duplicating questionnaires"
echo "   • Clear information about what will be copied"
echo "   • Consistent UX across Events and Questionnaires"
echo ""

# Check for auto-confirm flag
AUTO_CONFIRM="${1:-no}"
if [ "$AUTO_CONFIRM" != "--yes" ] && [ "$AUTO_CONFIRM" != "-y" ]; then
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deployment cancelled${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}✓ Auto-confirm enabled - proceeding with deployment${NC}"
fi
echo ""

# Build frontend
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 1: Building Frontend${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""
cd "$LOCAL_FRONTEND"

# Check if .env.local exists and doesn't have localhost
if [ -f ".env.local" ]; then
    if grep -q "localhost:8000" .env.local; then
        echo -e "${RED}✗ .env.local contains 'localhost:8000'${NC}"
        echo -e "${YELLOW}Please update API_URL before building${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}Building frontend...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build complete${NC}"

BUILD_ID=$(cat "$LOCAL_FRONTEND/.next/BUILD_ID" 2>/dev/null || echo "unknown")
echo -e "${GREEN}✓ BUILD_ID: $BUILD_ID${NC}"
echo ""

# Backup production
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 2: Backup Production${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo "Creating backup: frontend_backup_${BACKUP_TIMESTAMP}.tar.gz"

ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << ENDSSH
    set -e
    cd /var/www
    sudo tar -czf /tmp/frontend_backup_${BACKUP_TIMESTAMP}.tar.gz \
        frontend/components/duplicate-confirmation-modal.tsx \
        frontend/app/questionnaires/page.tsx \
        2>/dev/null || echo "Some files may not exist in backup"
    echo "✓ Backup created: /tmp/frontend_backup_${BACKUP_TIMESTAMP}.tar.gz"
ENDSSH

echo -e "${GREEN}✓ Backup complete${NC}"
echo ""

# Upload files to temp directory
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 3: Uploading Files${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

echo "Uploading duplicate-confirmation-modal.tsx..."
scp -i "$PEM_KEY" \
    "$LOCAL_FRONTEND/components/duplicate-confirmation-modal.tsx" \
    "$SERVER_USER@$SERVER_IP:/tmp/duplicate-confirmation-modal.tsx"

echo "Uploading questionnaires/page.tsx..."
scp -i "$PEM_KEY" \
    "$LOCAL_FRONTEND/app/questionnaires/page.tsx" \
    "$SERVER_USER@$SERVER_IP:/tmp/questionnaires-page.tsx"

echo -e "${GREEN}✓ Files uploaded${NC}"
echo ""

# Deploy to production
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 4: Deploying to Production${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
    set -e
    
    echo "→ Moving files to production..."
    sudo cp /tmp/duplicate-confirmation-modal.tsx /var/www/frontend/components/duplicate-confirmation-modal.tsx
    sudo cp /tmp/questionnaires-page.tsx /var/www/frontend/app/questionnaires/page.tsx
    
    echo "→ Setting permissions..."
    sudo chown www-data:www-data /var/www/frontend/components/duplicate-confirmation-modal.tsx
    sudo chown www-data:www-data /var/www/frontend/app/questionnaires/page.tsx
    
    echo "→ Cleaning .next directory..."
    cd /var/www/frontend
    sudo rm -rf .next
    sudo mkdir -p .next
    sudo chown -R www-data:www-data .next
    
    echo "→ Rebuilding frontend..."
    sudo -u www-data npm run build
    
    if [ ! -f .next/BUILD_ID ]; then
        echo "✗ Build failed - BUILD_ID not found"
        exit 1
    fi
    
    NEW_BUILD_ID=$(cat .next/BUILD_ID)
    echo "✓ New BUILD_ID: $NEW_BUILD_ID"
    
    echo "→ Restarting PM2..."
    pm2 restart qsights-frontend
    pm2 save
    
    echo ""
    echo "→ PM2 Status:"
    pm2 list | grep qsights-frontend
    
    echo ""
    echo "✅ Deployment complete!"
ENDSSH

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DEPLOYMENT SUCCESS${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo "🔍 POST-DEPLOYMENT CHECKLIST:"
echo "   1. Visit: https://prod.qsights.com/questionnaires"
echo "   2. Click duplicate button on any questionnaire"
echo "   3. Verify QSights-style modal appears"
echo "   4. Check modal shows questionnaire name"
echo "   5. Verify 'What will be copied' section displays correctly"
echo "   6. Test Cancel and Duplicate buttons"
echo ""
echo "⚠️  If any issues occur:"
echo "   • Check browser console (F12) for errors"
echo "   • Verify PM2 status: ssh and run 'pm2 list'"
echo "   • Rollback if needed from: /tmp/frontend_backup_${BACKUP_TIMESTAMP}.tar.gz"
echo ""
echo -e "${BLUE}Happy Testing! 🎉${NC}"
echo ""
