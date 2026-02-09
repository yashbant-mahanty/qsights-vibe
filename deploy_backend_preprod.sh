#!/bin/bash

###############################################################################
# QSights Pre-Production Deployment Script - BACKEND
# Environment: Pre-Prod (3.110.94.207)
# Purpose: Deploy backend changes to Pre-Prod for testing
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
BACKEND_PATH="/var/www/QSightsOrg2.0/backend"
LOCAL_BACKEND_PATH="$(pwd)/backend"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       QSights Pre-Production Backend Deployment             ║${NC}"
echo -e "${BLUE}║       Environment: PRE-PROD (Staging)                        ║${NC}"
echo -e "${BLUE}║       Server: 3.110.94.207                                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Pre-flight checks
echo -e "${YELLOW}[1/8] Pre-flight Checks${NC}"

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

# Confirmation
echo -e "${YELLOW}[2/8] Deployment Confirmation${NC}"
echo -e "You are about to deploy to ${YELLOW}PRE-PRODUCTION${NC}"
echo -e "Server: ${BLUE}$SERVER_IP${NC}"
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 0
fi
echo ""

# Create backup on server
echo -e "${YELLOW}[3/8] Creating Server Backup${NC}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ssh -o StrictHostKeyChecking=no -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    sudo mkdir -p /home/ubuntu/backups/preprod
    sudo tar -czf /home/ubuntu/backups/preprod/backend_${TIMESTAMP}.tar.gz \
        -C /var/www/QSightsOrg2.0 backend \
        --exclude='vendor' --exclude='storage/logs/*' --exclude='node_modules'
    sudo chown ubuntu:ubuntu /home/ubuntu/backups/preprod/backend_${TIMESTAMP}.tar.gz
    ls -lh /home/ubuntu/backups/preprod/backend_${TIMESTAMP}.tar.gz
"
echo -e "${GREEN}✓ Backup created: backend_${TIMESTAMP}.tar.gz${NC}"
echo ""

# Upload files
echo -e "${YELLOW}[4/8] Uploading Backend Files${NC}"

# Create temporary tar
echo "Creating local archive..."
cd backend
tar -czf /tmp/backend_preprod_deploy.tar.gz \
    --exclude='storage/logs/*' --exclude='vendor' --exclude='node_modules' \
    app/ routes/ config/ database/ public/ \
    composer.json composer.lock artisan
cd ..

echo "Uploading to server..."
scp -o StrictHostKeyChecking=no -i "$PEM_KEY" /tmp/backend_preprod_deploy.tar.gz "$SERVER_USER@$SERVER_IP:/tmp/"
rm /tmp/backend_preprod_deploy.tar.gz

echo -e "${GREEN}✓ Files uploaded${NC}"
echo ""

# Extract and deploy
echo -e "${YELLOW}[5/8] Extracting Files on Server${NC}"
ssh -o StrictHostKeyChecking=no -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $BACKEND_PATH
    sudo tar -xzf /tmp/backend_preprod_deploy.tar.gz
    sudo chown -R www-data:www-data *
    sudo rm /tmp/backend_preprod_deploy.tar.gz
"
echo -e "${GREEN}✓ Files extracted${NC}"
echo ""

# Install dependencies
echo -e "${YELLOW}[6/8] Installing Dependencies${NC}"
ssh -o StrictHostKeyChecking=no -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $BACKEND_PATH
    sudo composer install --no-dev --optimize-autoloader --quiet
"
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Clear caches and optimize
echo -e "${YELLOW}[7/8] Clearing Caches${NC}"
ssh -o StrictHostKeyChecking=no -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $BACKEND_PATH
    sudo php artisan config:clear
    sudo php artisan route:clear
    sudo php artisan view:clear
    sudo php artisan cache:clear
    sudo php artisan config:cache
    sudo php artisan route:cache
"
echo -e "${GREEN}✓ Caches cleared and optimized${NC}"
echo ""

# Restart services
echo -e "${YELLOW}[8/8] Restarting Services${NC}"
ssh -o StrictHostKeyChecking=no -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    sudo systemctl reload php8.1-fpm
    sudo systemctl reload nginx
"
echo -e "${GREEN}✓ Services restarted${NC}"
echo ""

# Success
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              DEPLOYMENT SUCCESSFUL!                          ║${NC}"
echo -e "${GREEN}║              Environment: PRE-PROD                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "1. Test all features on Pre-Prod: https://preprod.qsights.com"
echo -e "2. Verify all APIs and modules"
echo -e "3. Check logs: ssh to server and run: tail -f $BACKEND_PATH/storage/logs/laravel.log"
echo -e "4. Only after successful testing, proceed to production deployment"
echo ""
echo -e "${YELLOW}Backup Location:${NC} /home/ubuntu/backups/preprod/backend_${TIMESTAMP}.tar.gz"
echo ""
