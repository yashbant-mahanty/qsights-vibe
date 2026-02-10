#!/bin/bash

###############################################################################
# QSights Production Deployment Script - BACKEND
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
BACKEND_PATH="/var/www/QSightsOrg2.0/backend"
LOCAL_BACKEND_PATH="$(pwd)/backend"
PREPROD_SERVER_IP="3.110.94.207"
PREPROD_STATE_FILE="/home/ubuntu/deployments/preprod/last_deployed_commit"
APPROVAL_FILE="release/PROD_APPROVAL.txt"

echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║           ⚠️  PRODUCTION DEPLOYMENT WARNING ⚠️               ║${NC}"
echo -e "${RED}║       This will deploy to LIVE PRODUCTION environment       ║${NC}"
echo -e "${RED}║       Server: 13.126.210.220 (PROD)                         ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Hard gate: ensure current commit was deployed to pre-prod
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}         PRE-PROD → PROD GATE (ENFORCED)                       ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"

LOCAL_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")
if [ -z "$LOCAL_COMMIT" ]; then
    echo -e "${RED}✗ Not a git repository or cannot read commit SHA${NC}"
    exit 1
fi

PREPROD_COMMIT=$(ssh -o StrictHostKeyChecking=no -i "$PEM_KEY" "$SERVER_USER@$PREPROD_SERVER_IP" "cat $PREPROD_STATE_FILE 2>/dev/null || true" | tr -d ' \n\r')
if [ -z "$PREPROD_COMMIT" ]; then
    echo -e "${RED}✗ Pre-Prod deployment state not found on $PREPROD_SERVER_IP${NC}"
    echo -e "${YELLOW}Run pre-prod deploy first: ./deploy_backend_preprod.sh and ./deploy_frontend_preprod.sh${NC}"
    exit 1
fi

if [ "$PREPROD_COMMIT" != "$LOCAL_COMMIT" ]; then
    echo -e "${RED}✗ BLOCKED: Current commit is not deployed to Pre-Prod${NC}"
    echo -e "${YELLOW}Local:   ${NC}$LOCAL_COMMIT"
    echo -e "${YELLOW}Pre-Prod:${NC} $PREPROD_COMMIT"
    echo -e "${YELLOW}Deploy this commit to Pre-Prod first, verify, then deploy to Prod.${NC}"
    exit 1
fi

if [ ! -f "$APPROVAL_FILE" ] || ! grep -q "$LOCAL_COMMIT" "$APPROVAL_FILE" 2>/dev/null; then
    echo -e "${RED}✗ BLOCKED: Approval file missing or does not match current commit${NC}"
    echo -e "${YELLOW}Generate approval after verification:${NC} ./scripts/approve_prod_release.sh"
    exit 1
fi

echo -e "${GREEN}✓ Gate passed: Pre-Prod commit matches and approval present${NC}"
echo ""

# MANDATORY: Pre-Prod verification check
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}         PRE-PRODUCTION VERIFICATION REQUIRED                  ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Before deploying to PRODUCTION, you MUST verify on Pre-Prod:${NC}"
echo ""
echo "  ✓ All features working correctly"
echo "  ✓ All modules tested"
echo "  ✓ APIs responding properly"
echo "  ✓ Reports generating correctly"
echo "  ✓ Schedulers running"
echo "  ✓ Permissions working"
echo "  ✓ Database migrations tested"
echo "  ✓ No errors in logs"
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
    echo "1. Deploy to Pre-Prod: ./deploy_backend_preprod.sh"
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
echo -e "${YELLOW}[1/9] Pre-flight Checks${NC}"

if [ ! -f "$PEM_KEY" ]; then
    echo -e "${RED}✗ PEM key not found at $PEM_KEY${NC}"
    exit 1
fi

if [ ! -d "$LOCAL_BACKEND_PATH" ]; then
    echo -e "${RED}✗ Local backend directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ PEM key found${NC}"
echo -e "${GREEN}✓ Local backend directory found${NC}"
echo ""

# Create timestamped backup
echo -e "${YELLOW}[2/9] Creating Production Backup${NC}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    sudo mkdir -p /home/ubuntu/backups/production
    sudo tar -czf /home/ubuntu/backups/production/backend_${TIMESTAMP}.tar.gz \
        -C /var/www/QSightsOrg2.0 backend \
        --exclude='vendor' --exclude='storage/logs/*' --exclude='node_modules'
    sudo chown ubuntu:ubuntu /home/ubuntu/backups/production/backend_${TIMESTAMP}.tar.gz
    ls -lh /home/ubuntu/backups/production/backend_${TIMESTAMP}.tar.gz
"
echo -e "${GREEN}✓ Production backup created: backend_${TIMESTAMP}.tar.gz${NC}"
echo ""

# Upload files
echo -e "${YELLOW}[3/9] Uploading Backend Files${NC}"

echo "Creating local archive..."
cd backend
tar -czf /tmp/backend_prod_deploy.tar.gz \
    app/ routes/ config/ database/ public/ \
    composer.json composer.lock artisan \
    --exclude='storage/logs/*' --exclude='vendor' --exclude='node_modules'
cd ..

echo "Uploading to production server..."
scp -i "$PEM_KEY" /tmp/backend_prod_deploy.tar.gz "$SERVER_USER@$SERVER_IP:/tmp/"
rm /tmp/backend_prod_deploy.tar.gz

echo -e "${GREEN}✓ Files uploaded to production${NC}"
echo ""

# Extract files
echo -e "${YELLOW}[4/9] Extracting Files${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $BACKEND_PATH
    sudo tar -xzf /tmp/backend_prod_deploy.tar.gz
    sudo chown -R www-data:www-data *
    sudo rm /tmp/backend_prod_deploy.tar.gz
"
echo -e "${GREEN}✓ Files extracted${NC}"
echo ""

# Install dependencies
echo -e "${YELLOW}[5/9] Installing Dependencies${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $BACKEND_PATH
    sudo composer install --no-dev --optimize-autoloader --quiet
"
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Run migrations
echo -e "${YELLOW}[6/9] Running Database Migrations${NC}"
echo -e "${RED}⚠️  This will modify the production database${NC}"
read -p "Run migrations? (yes/no): " MIGRATE_CONFIRM

if [ "$MIGRATE_CONFIRM" = "yes" ]; then
    ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
        cd $BACKEND_PATH
        sudo php artisan migrate --force
    "
    echo -e "${GREEN}✓ Migrations completed${NC}"
else
    echo -e "${YELLOW}⊘ Migrations skipped${NC}"
fi
echo ""

# Clear caches
echo -e "${YELLOW}[7/9] Clearing and Optimizing Caches${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $BACKEND_PATH
    sudo php artisan config:clear
    sudo php artisan route:clear
    sudo php artisan view:clear
    sudo php artisan cache:clear
    sudo php artisan config:cache
    sudo php artisan route:cache
    sudo php artisan view:cache
"
echo -e "${GREEN}✓ Caches optimized${NC}"
echo ""

# Restart services
echo -e "${YELLOW}[8/9] Restarting Services${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    sudo systemctl reload php8.1-fpm
    sudo systemctl reload nginx
    sudo systemctl status php8.1-fpm --no-pager | head -5
"
echo -e "${GREEN}✓ Services restarted${NC}"
echo ""

# Health check
echo -e "${YELLOW}[9/9] Production Health Check${NC}"
echo "Waiting 5 seconds for services to stabilize..."
sleep 5

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://prod.qsights.com/api/health 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Production health check passed (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}⚠️  Health check returned HTTP $HTTP_CODE${NC}"
    echo -e "${YELLOW}Please verify production status immediately${NC}"
fi
echo ""

# Success
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         PRODUCTION DEPLOYMENT COMPLETED                      ║${NC}"
echo -e "${GREEN}║         Environment: PRODUCTION                              ║${NC}"
echo -e "${GREEN}║         Server: 13.126.210.220                               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Post-Deployment Actions:${NC}"
echo -e "1. ${YELLOW}Verify production immediately:${NC} https://prod.qsights.com"
echo -e "2. ${YELLOW}Monitor logs:${NC} ssh and run: tail -f $BACKEND_PATH/storage/logs/laravel.log"
echo -e "3. ${YELLOW}Check error rates${NC} in monitoring dashboard"
echo -e "4. ${YELLOW}Test critical user flows${NC}"
echo -e "5. ${YELLOW}Monitor PM2 processes${NC}"
echo ""
echo -e "${MAGENTA}Rollback Information:${NC}"
echo -e "Backup: ${BLUE}/home/ubuntu/backups/production/backend_${TIMESTAMP}.tar.gz${NC}"
echo -e "To rollback: ${BLUE}./rollback_backend_prod.sh backend_${TIMESTAMP}${NC}"
echo ""
echo -e "${RED}⚠️  Keep monitoring production for the next 30 minutes${NC}"
echo ""
