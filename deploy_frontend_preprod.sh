#!/bin/bash

###############################################################################
# QSights Pre-Production Deployment Script - FRONTEND
# Environment: Pre-Prod (3.110.94.207)
# Purpose: Deploy frontend changes to Pre-Prod for testing
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER_IP="3.110.94.207"
SERVER_USER="ubuntu"
FRONTEND_PATH="/var/www/frontend"
LOCAL_FRONTEND_PATH="$(pwd)/frontend"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       QSights Pre-Production Frontend Deployment            ║${NC}"
echo -e "${BLUE}║       Environment: PRE-PROD (Staging)                        ║${NC}"
echo -e "${BLUE}║       Server: 3.110.94.207                                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Pre-flight checks
echo -e "${YELLOW}[1/9] Pre-flight Checks${NC}"

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

# Confirmation
echo -e "${YELLOW}[2/9] Deployment Confirmation${NC}"
echo -e "You are about to deploy to ${YELLOW}PRE-PRODUCTION${NC}"
echo -e "Server: ${BLUE}$SERVER_IP${NC}"
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 0
fi
echo ""

# Build locally
echo -e "${YELLOW}[3/9] Building Frontend Locally${NC}"
cd "$LOCAL_FRONTEND_PATH"

# Set Pre-Prod environment variables
export NEXT_PUBLIC_API_URL="https://preprod.qsights.com/api"
export NEXT_PUBLIC_APP_URL="https://preprod.qsights.com"
export NODE_ENV="production"

echo "Running npm build..."
npm run build

if [ ! -d ".next" ]; then
    echo -e "${RED}✗ Build failed - .next directory not found${NC}"
    exit 1
fi

BUILD_ID=$(cat .next/BUILD_ID)
echo -e "${GREEN}✓ Build completed successfully${NC}"
echo -e "${BLUE}BUILD_ID: $BUILD_ID${NC}"
cd ..
echo ""

# Create backup on server
echo -e "${YELLOW}[4/9] Creating Server Backup${NC}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    sudo mkdir -p /home/ubuntu/backups/preprod
    if [ -d $FRONTEND_PATH/.next ]; then
        sudo tar -czf /home/ubuntu/backups/preprod/frontend_${TIMESTAMP}.tar.gz \
            -C $FRONTEND_PATH .next package.json
        sudo chown ubuntu:ubuntu /home/ubuntu/backups/preprod/frontend_${TIMESTAMP}.tar.gz
        ls -lh /home/ubuntu/backups/preprod/frontend_${TIMESTAMP}.tar.gz
    else
        echo 'No existing build to backup'
    fi
"
echo -e "${GREEN}✓ Backup created: frontend_${TIMESTAMP}.tar.gz${NC}"
echo ""

# Create deployment package
echo -e "${YELLOW}[5/9] Creating Deployment Package${NC}"
cd "$LOCAL_FRONTEND_PATH"
tar -czf /tmp/frontend_preprod_deploy.tar.gz .next package.json
cd ..
echo -e "${GREEN}✓ Package created${NC}"
echo ""

# Upload to server
echo -e "${YELLOW}[6/9] Uploading to Server${NC}"
scp -i "$PEM_KEY" /tmp/frontend_preprod_deploy.tar.gz "$SERVER_USER@$SERVER_IP:/tmp/"
rm /tmp/frontend_preprod_deploy.tar.gz
echo -e "${GREEN}✓ Package uploaded${NC}"
echo ""

# Stop PM2
echo -e "${YELLOW}[7/9] Stopping PM2 Process${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    pm2 stop qsights-frontend-preprod 2>/dev/null || pm2 stop qsights-frontend 2>/dev/null || echo 'No PM2 process to stop'
"
echo -e "${GREEN}✓ PM2 stopped${NC}"
echo ""

# Extract files
echo -e "${YELLOW}[8/9] Extracting Files${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $FRONTEND_PATH
    sudo rm -rf .next
    sudo tar -xzf /tmp/frontend_preprod_deploy.tar.gz
    sudo chown -R www-data:www-data .next package.json
    sudo rm /tmp/frontend_preprod_deploy.tar.gz
    cat .next/BUILD_ID
"
echo -e "${GREEN}✓ Files extracted${NC}"
echo ""

# Restart PM2
echo -e "${YELLOW}[9/9] Restarting PM2${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    pm2 restart qsights-frontend-preprod 2>/dev/null || pm2 restart qsights-frontend || pm2 start npm --name qsights-frontend-preprod -- start
    pm2 save
    sleep 2
    pm2 list | grep qsights-frontend
"
echo -e "${GREEN}✓ PM2 restarted${NC}"
echo ""

# Success
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              DEPLOYMENT SUCCESSFUL!                          ║${NC}"
echo -e "${GREEN}║              Environment: PRE-PROD                           ║${NC}"
echo -e "${GREEN}║              BUILD_ID: $BUILD_ID                             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "1. Access Pre-Prod: https://preprod.qsights.com"
echo -e "2. Test all features and UI changes"
echo -e "3. Check browser console for errors"
echo -e "4. Verify API integrations"
echo -e "5. Check PM2 logs: ssh and run: pm2 logs qsights-frontend-preprod"
echo -e "6. Only after successful testing, proceed to production deployment"
echo ""
echo -e "${YELLOW}Backup Location:${NC} /home/ubuntu/backups/preprod/frontend_${TIMESTAMP}.tar.gz"
echo ""
