#!/bin/bash

###############################################################################
# QSights Production Deployment Script - FRONTEND
# Environment: PRODUCTION (13.126.210.220)
# WARNING: This deploys to LIVE PRODUCTION environment
# REQUIREMENT: Must have Pre-Prod approval before running
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER_IP="13.126.210.220"
SERVER_USER="ubuntu"
FRONTEND_PATH="/var/www/frontend"
LOCAL_FRONTEND_PATH="$(pwd)/frontend"

echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║           ⚠️  PRODUCTION DEPLOYMENT WARNING ⚠️               ║${NC}"
echo -e "${RED}║       This will deploy to LIVE PRODUCTION environment       ║${NC}"
echo -e "${RED}║       Server: 13.126.210.220 (PROD)                         ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# MANDATORY: Pre-Prod verification check
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}         PRE-PRODUCTION VERIFICATION REQUIRED                  ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Before deploying to PRODUCTION, you MUST verify on Pre-Prod:${NC}"
echo ""
echo "  ✓ All UI changes working correctly"
echo "  ✓ All pages loading properly"
echo "  ✓ No console errors"
echo "  ✓ API integrations working"
echo "  ✓ Forms submitting correctly"
echo "  ✓ Reports displaying properly"
echo "  ✓ Authentication working"
echo "  ✓ Mobile responsiveness tested"
echo ""
echo -e "${RED}Have you completed testing on Pre-Prod (3.110.94.207)?${NC}"
read -p "Type 'VERIFIED' to confirm: " PREPROD_CONFIRM

if [ "$PREPROD_CONFIRM" != "VERIFIED" ]; then
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║              DEPLOYMENT BLOCKED                              ║${NC}"
    echo -e "${RED}║   Pre-Prod verification is MANDATORY before production      ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Required Steps:${NC}"
    echo "1. Deploy to Pre-Prod: ./deploy_frontend_preprod.sh"
    echo "2. Test thoroughly on https://preprod.qsights.com"
    echo "3. Verify all checklist items"
    echo "4. Only then proceed with production deployment"
    exit 1
fi
echo ""

# Final production confirmation
echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${RED}           FINAL PRODUCTION CONFIRMATION                       ${NC}"
echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}You are about to deploy to LIVE PRODUCTION${NC}"
echo -e "Server: ${RED}$SERVER_IP${NC}"
echo -e "Environment: ${RED}PRODUCTION${NC}"
echo -e "Impact: ${RED}AFFECTS ALL LIVE USERS${NC}"
echo ""
read -p "Type 'DEPLOY-TO-PRODUCTION' to continue: " PROD_CONFIRM

if [ "$PROD_CONFIRM" != "DEPLOY-TO-PRODUCTION" ]; then
    echo -e "${RED}Production deployment cancelled${NC}"
    exit 0
fi
echo ""

# Pre-flight checks
echo -e "${YELLOW}[1/10] Pre-flight Checks${NC}"

if [ ! -f "$PEM_KEY" ]; then
    echo -e "${RED}✗ PEM key not found at $PEM_KEY${NC}"
    exit 1
fi

if [ ! -d "$LOCAL_FRONTEND_PATH" ]; then
    echo -e "${RED}✗ Local frontend directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ PEM key found${NC}"
echo -e "${GREEN}✓ Local frontend directory found${NC}"
echo ""

# Build for production
echo -e "${YELLOW}[2/10] Building Frontend for Production${NC}"
cd "$LOCAL_FRONTEND_PATH"

# Set Production environment variables
export NEXT_PUBLIC_API_URL="https://prod.qsights.com/api"
export NEXT_PUBLIC_APP_URL="https://prod.qsights.com"
export NODE_ENV="production"

echo "Running production build..."
npm run build

if [ ! -d ".next" ]; then
    echo -e "${RED}✗ Build failed - .next directory not found${NC}"
    exit 1
fi

BUILD_ID=$(cat .next/BUILD_ID)
echo -e "${GREEN}✓ Production build completed${NC}"
echo -e "${BLUE}BUILD_ID: $BUILD_ID${NC}"
cd ..
echo ""

# Create backup
echo -e "${YELLOW}[3/10] Creating Production Backup${NC}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    sudo mkdir -p /home/ubuntu/backups/production
    if [ -d $FRONTEND_PATH/.next ]; then
        sudo tar -czf /home/ubuntu/backups/production/frontend_${TIMESTAMP}.tar.gz \
            -C $FRONTEND_PATH .next package.json
        sudo chown ubuntu:ubuntu /home/ubuntu/backups/production/frontend_${TIMESTAMP}.tar.gz
        ls -lh /home/ubuntu/backups/production/frontend_${TIMESTAMP}.tar.gz
    fi
"
echo -e "${GREEN}✓ Production backup created: frontend_${TIMESTAMP}.tar.gz${NC}"
echo ""

# Create deployment package
echo -e "${YELLOW}[4/10] Creating Deployment Package${NC}"
cd "$LOCAL_FRONTEND_PATH"
tar -czf /tmp/frontend_prod_deploy.tar.gz .next package.json
PACKAGE_SIZE=$(du -h /tmp/frontend_prod_deploy.tar.gz | cut -f1)
echo -e "${BLUE}Package size: $PACKAGE_SIZE${NC}"
cd ..
echo -e "${GREEN}✓ Package created${NC}"
echo ""

# Upload to server
echo -e "${YELLOW}[5/10] Uploading to Production Server${NC}"
scp -i "$PEM_KEY" /tmp/frontend_prod_deploy.tar.gz "$SERVER_USER@$SERVER_IP:/tmp/"
rm /tmp/frontend_prod_deploy.tar.gz
echo -e "${GREEN}✓ Package uploaded${NC}"
echo ""

# Stop PM2
echo -e "${YELLOW}[6/10] Stopping PM2 Process${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    pm2 stop qsights-frontend 2>/dev/null || echo 'PM2 process already stopped'
"
echo -e "${GREEN}✓ PM2 stopped${NC}"
echo ""

# Extract files
echo -e "${YELLOW}[7/10] Extracting Files${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $FRONTEND_PATH
    sudo rm -rf .next
    sudo tar -xzf /tmp/frontend_prod_deploy.tar.gz
    sudo chown -R www-data:www-data .next package.json
    sudo rm /tmp/frontend_prod_deploy.tar.gz
    echo 'Extracted BUILD_ID:'
    cat .next/BUILD_ID
"
echo -e "${GREEN}✓ Files extracted${NC}"
echo ""

# Restart PM2
echo -e "${YELLOW}[8/10] Restarting PM2${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    pm2 restart qsights-frontend
    pm2 save
    sleep 3
    pm2 list | grep qsights-frontend
"
echo -e "${GREEN}✓ PM2 restarted${NC}"
echo ""

# Wait for stabilization
echo -e "${YELLOW}[9/10] Waiting for Application to Stabilize${NC}"
echo "Waiting 10 seconds..."
sleep 10
echo -e "${GREEN}✓ Stabilization period completed${NC}"
echo ""

# Health check
echo -e "${YELLOW}[10/10] Production Health Check${NC}"

# Check if BUILD_ID is being served
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://prod.qsights.com 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Production health check passed (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}⚠️  Health check returned HTTP $HTTP_CODE${NC}"
    echo -e "${YELLOW}Please verify production status immediately${NC}"
fi

# Verify BUILD_ID
SERVED_BUILD=$(curl -s https://prod.qsights.com 2>/dev/null | grep -o '"buildId":"[^"]*"' | cut -d'"' -f4 || echo "")
if [ "$SERVED_BUILD" = "$BUILD_ID" ]; then
    echo -e "${GREEN}✓ Correct BUILD_ID being served: $BUILD_ID${NC}"
else
    echo -e "${YELLOW}⚠️  BUILD_ID mismatch - Expected: $BUILD_ID, Got: $SERVED_BUILD${NC}"
fi
echo ""

# Success
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         PRODUCTION DEPLOYMENT COMPLETED                      ║${NC}"
echo -e "${GREEN}║         Environment: PRODUCTION                              ║${NC}"
echo -e "${GREEN}║         BUILD_ID: $BUILD_ID                                  ║${NC}"
echo -e "${GREEN}║         Server: 13.126.210.220                               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Post-Deployment Actions:${NC}"
echo -e "1. ${YELLOW}Access production:${NC} https://prod.qsights.com"
echo -e "2. ${YELLOW}Test critical user flows immediately${NC}"
echo -e "3. ${YELLOW}Check browser console${NC} for JavaScript errors"
echo -e "4. ${YELLOW}Verify API calls${NC} in Network tab"
echo -e "5. ${YELLOW}Monitor PM2:${NC} ssh and run: pm2 logs qsights-frontend"
echo -e "6. ${YELLOW}Test on mobile devices${NC}"
echo ""
echo -e "${MAGENTA}Rollback Information:${NC}"
echo -e "Backup: ${BLUE}/home/ubuntu/backups/production/frontend_${TIMESTAMP}.tar.gz${NC}"
echo -e "To rollback: ${BLUE}./rollback_frontend_prod.sh frontend_${TIMESTAMP}${NC}"
echo ""
echo -e "${RED}⚠️  Keep monitoring production for the next 30 minutes${NC}"
echo ""
