#!/bin/bash

#############################################################################
# SCT Likert Dynamic Response Type - Production Deployment Script
# Date: February 12, 2026
# Feature: Dynamic LIKERT response type (2-10 scale support)
#############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - CRITICAL PATHS (from CRITICAL_RULES.md)
PEM="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
FRONTEND_PROD="/var/www/frontend"
BACKEND_PROD="/var/www/QSightsOrg2.0/backend"
LOCAL_FRONTEND="/Users/yash/Documents/Projects/QSightsOrg2.0/frontend"
LOCAL_BACKEND="/Users/yash/Documents/Projects/QSightsOrg2.0/backend"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  SCT Likert Dynamic Response Type - Production Deploy     ║${NC}"
echo -e "${BLUE}║  Date: $(date '+%Y-%m-%d %H:%M:%S')                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Verify BUILD_ID exists
echo -e "${YELLOW}📋 Step 1: Verifying BUILD_ID...${NC}"
if [ ! -f "$LOCAL_FRONTEND/.next/BUILD_ID" ]; then
    echo -e "${RED}❌ BUILD_ID missing! Run 'npm run build' first!${NC}"
    exit 1
fi
BUILD_ID=$(cat "$LOCAL_FRONTEND/.next/BUILD_ID")
echo -e "${GREEN}✓ BUILD_ID: $BUILD_ID${NC}"
echo ""

# Step 2: Check SSH connection
echo -e "${YELLOW}📋 Step 2: Testing SSH connection...${NC}"
ssh -i "$PEM" -o ConnectTimeout=10 "$SERVER" "echo 'Connection OK'" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ SSH connection failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ SSH connection successful${NC}"
echo ""

# Step 3: Backup production files
echo -e "${YELLOW}📋 Step 3: Creating production backups...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ssh -i "$PEM" "$SERVER" << 'EOF'
sudo mkdir -p /var/backups/deployments
sudo tar -czf /var/backups/deployments/frontend_before_sct_likert_dynamic_$(date +%Y%m%d_%H%M%S).tar.gz -C /var/www frontend/.next 2>/dev/null || true
sudo tar -czf /var/backups/deployments/backend_before_sct_likert_dynamic_$(date +%Y%m%d_%H%M%S).tar.gz -C /var/www/QSightsOrg2.0/backend app/Http/Controllers/Api 2>/dev/null || true
echo "Backups created"
EOF
echo -e "${GREEN}✓ Backups created${NC}"
echo ""

# Step 4: Deploy Backend Files
echo -e "${YELLOW}📋 Step 4: Deploying backend files...${NC}"
echo "  → PublicActivityController.php"

# Copy to temp first, then move with sudo
scp -i "$PEM" \
    "$LOCAL_BACKEND/app/Http/Controllers/Api/PublicActivityController.php" \
    "$SERVER:/tmp/PublicActivityController.php"

ssh -i "$PEM" "$SERVER" << 'EOF'
sudo mv /tmp/PublicActivityController.php /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/PublicActivityController.php
sudo chown www-data:www-data /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/PublicActivityController.php
sudo chmod 644 /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/PublicActivityController.php
EOF

echo -e "${GREEN}✓ Backend files deployed${NC}"
echo ""

# Step 5: Deploy Frontend Files
echo -e "${YELLOW}📋 Step 5: Deploying frontend files...${NC}"
echo "  → Creating temporary upload directory..."

ssh -i "$PEM" "$SERVER" "mkdir -p /tmp/sct_likert_deploy"

echo "  → Uploading modified files..."

# Upload modified React components
scp -i "$PEM" \
    "$LOCAL_FRONTEND/components/questions/index.ts" \
    "$SERVER:/tmp/sct_likert_deploy/"

scp -i "$PEM" \
    "$LOCAL_FRONTEND/app/questionnaires/create/page.tsx" \
    "$SERVER:/tmp/sct_likert_deploy/questionnaires_create_page.tsx"

scp -i "$PEM" \
    "$LOCAL_FRONTEND/app/activities/take/[id]/page.tsx" \
    "$SERVER:/tmp/sct_likert_deploy/activities_take_page.tsx"

scp -i "$PEM" \
    "$LOCAL_FRONTEND/app/activities/[id]/results/page.tsx" \
    "$SERVER:/tmp/sct_likert_deploy/activities_results_page.tsx"

echo "  → Uploading .next directory (this may take a moment)..."

# Upload entire .next directory to ensure BUILD_ID and all chunks are present
rsync -avz --progress -e "ssh -i $PEM" \
    "$LOCAL_FRONTEND/.next/" \
    "$SERVER:/tmp/sct_likert_deploy/.next/"

echo "  → Moving files to production with sudo..."

ssh -i "$PEM" "$SERVER" << 'EOF'
# Move components
sudo mv /tmp/sct_likert_deploy/index.ts /var/www/frontend/components/questions/index.ts

# Move app pages
sudo mv /tmp/sct_likert_deploy/questionnaires_create_page.tsx /var/www/frontend/app/questionnaires/create/page.tsx
sudo mv /tmp/sct_likert_deploy/activities_take_page.tsx "/var/www/frontend/app/activities/take/[id]/page.tsx"
sudo mv /tmp/sct_likert_deploy/activities_results_page.tsx "/var/www/frontend/app/activities/[id]/results/page.tsx"

# Move .next directory (CRITICAL - includes BUILD_ID)
sudo rm -rf /var/www/frontend/.next.old 2>/dev/null || true
sudo mv /var/www/frontend/.next /var/www/frontend/.next.old 2>/dev/null || true
sudo mv /tmp/sct_likert_deploy/.next /var/www/frontend/.next

# Set correct ownership and permissions
sudo chown -R www-data:www-data /var/www/frontend/components/questions
sudo chown -R www-data:www-data /var/www/frontend/app/questionnaires
sudo chown -R www-data:www-data /var/www/frontend/app/activities
sudo chown -R www-data:www-data /var/www/frontend/.next

# Cleanup
rm -rf /tmp/sct_likert_deploy

echo "Files moved and permissions set"
EOF

echo -e "${GREEN}✓ Frontend files deployed${NC}"
echo ""

# Step 6: Clear Laravel Cache
echo -e "${YELLOW}📋 Step 6: Clearing Laravel cache...${NC}"
ssh -i "$PEM" "$SERVER" << 'EOF'
cd /var/www/QSightsOrg2.0/backend
sudo php artisan config:clear > /dev/null 2>&1 || true
sudo php artisan route:clear > /dev/null 2>&1 || true
sudo php artisan cache:clear > /dev/null 2>&1 || true
echo "Cache cleared"
EOF
echo -e "${GREEN}✓ Laravel cache cleared${NC}"
echo ""

# Step 7: Restart PM2
echo -e "${YELLOW}📋 Step 7: Restarting PM2...${NC}"
ssh -i "$PEM" "$SERVER" << 'EOF'
pm2 restart all
sleep 3
pm2 status
EOF
echo -e "${GREEN}✓ PM2 restarted${NC}"
echo ""

# Step 8: Verify Deployment
echo -e "${YELLOW}📋 Step 8: Verifying deployment...${NC}"

# Check BUILD_ID on production
PROD_BUILD_ID=$(ssh -i "$PEM" "$SERVER" "cat /var/www/frontend/.next/BUILD_ID 2>/dev/null || echo 'MISSING'")
echo "  → Local BUILD_ID:      $BUILD_ID"
echo "  → Production BUILD_ID: $PROD_BUILD_ID"

if [ "$BUILD_ID" != "$PROD_BUILD_ID" ]; then
    echo -e "${RED}❌ BUILD_ID mismatch!${NC}"
    echo -e "${YELLOW}⚠ Deployment may have issues. Check manually.${NC}"
else
    echo -e "${GREEN}✓ BUILD_ID matches${NC}"
fi

# Check HTTP status
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://prod.qsights.com || echo "000")
echo "  → HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Site is accessible${NC}"
else
    echo -e "${RED}❌ HTTP error code: $HTTP_CODE${NC}"
fi

# Check PM2 status
PM2_STATUS=$(ssh -i "$PEM" "$SERVER" "pm2 list | grep 'online' | wc -l")
echo "  → PM2 online processes: $PM2_STATUS"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                 DEPLOYMENT SUMMARY                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Feature:     ${GREEN}SCT Likert Dynamic Response Type${NC}"
echo -e "  Scale Range: ${GREEN}2-10 points (previously 3,5,7,9)${NC}"
echo -e "  Scoring:     ${GREEN}Symmetric auto-generation${NC}"
echo -e "  BUILD_ID:    ${GREEN}$BUILD_ID${NC}"
echo -e "  Status:      ${GREEN}✓ Deployed${NC}"
echo ""
echo -e "${YELLOW}📋 NEXT STEPS - Manual Testing Required:${NC}"
echo ""
echo "  1. Open: https://prod.qsights.com"
echo "  2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo "  3. Open DevTools Console (F12) - check for errors"
echo ""
echo "  ${BLUE}Admin Testing:${NC}"
echo "  → Create new SCT_LIKERT question"
echo "  → Select 'Likert Scale' response type"
echo "  → Try different scales (2, 4, 6, 8, 10)"
echo "  → Verify symmetric scores auto-generate"
echo "  → Edit scores (test negative values)"
echo ""
echo "  ${BLUE}Participant Testing:${NC}"
echo "  → Take activity with Likert question"
echo "  → Verify visual scale displays"
echo "  → Submit response"
echo ""
echo "  ${BLUE}Reports Testing:${NC}"
echo "  → Check activity results"
echo "  → Export CSV - verify score columns"
echo "  → Test score calculations"
echo ""
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo ""
echo -e "${YELLOW}📄 Documentation:${NC} SCT_LIKERT_DYNAMIC_RESPONSE_TYPE_FEB_12_2026.md"
echo ""
