#!/bin/bash

###############################################################################
# QSights Backend Production Rollback Script
# 
# Purpose: Quickly rollback backend to a previous backup
# Usage: ./rollback_backend_prod.sh backend_20260207_143000
# 
# This script will:
# 1. Verify backup exists
# 2. Create pre-rollback backup of current state
# 3. Stop services
# 4. Restore from specified backup
# 5. Install dependencies
# 6. Clear caches
# 7. Restart services
# 8. Verify deployment
#
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROD_SERVER="13.126.210.220"
PROD_USER="ubuntu"
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
BACKEND_PATH="/var/www/QSightsOrg2.0/backend"
BACKUP_DIR="/home/ubuntu/backups/production"

# Check arguments
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Error: No backup filename provided${NC}"
    echo ""
    echo "Usage: $0 <backup_filename>"
    echo ""
    echo "Example: $0 backend_20260207_143000"
    echo ""
    echo "Available backups:"
    ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" "ls -lh $BACKUP_DIR/backend_*.tar.gz" 2>/dev/null || echo "  (Unable to list backups)"
    exit 1
fi

BACKUP_NAME="$1"
BACKUP_FILE="${BACKUP_NAME}.tar.gz"

# Add .tar.gz if not provided
if [[ ! "$BACKUP_FILE" == *.tar.gz ]]; then
    BACKUP_FILE="${BACKUP_NAME}.tar.gz"
fi

echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
echo -e "${RED}   ⚠️  PRODUCTION BACKEND ROLLBACK WARNING ⚠️${NC}"
echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Server:${NC} $PROD_SERVER"
echo -e "${YELLOW}Target Backup:${NC} $BACKUP_FILE"
echo -e "${YELLOW}Path:${NC} $BACKEND_PATH"
echo ""
echo -e "${RED}This will REPLACE the current production backend!${NC}"
echo -e "${RED}Current backend will be backed up before rollback.${NC}"
echo ""
read -p "Type 'ROLLBACK' to confirm: " CONFIRM

if [ "$CONFIRM" != "ROLLBACK" ]; then
    echo -e "${YELLOW}Rollback cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Starting Rollback Process...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Verify backup exists
echo -e "${BLUE}Step 1/8:${NC} Verifying backup exists..."
BACKUP_EXISTS=$(ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" "[ -f $BACKUP_DIR/$BACKUP_FILE ] && echo 'yes' || echo 'no'")

if [ "$BACKUP_EXISTS" != "yes" ]; then
    echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
    echo ""
    echo "Available backups:"
    ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" "ls -lh $BACKUP_DIR/backend_*.tar.gz"
    exit 1
fi

BACKUP_SIZE=$(ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" "du -h $BACKUP_DIR/$BACKUP_FILE | cut -f1")
echo -e "${GREEN}✅ Backup found: $BACKUP_FILE ($BACKUP_SIZE)${NC}"

# Step 2: Create pre-rollback backup
echo ""
echo -e "${BLUE}Step 2/8:${NC} Creating pre-rollback backup of current state..."
PRE_ROLLBACK_BACKUP="backend_pre_rollback_$(date +%Y%m%d_%H%M%S).tar.gz"

ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" << 'ENDSSH'
    cd /var/www/QSightsOrg2.0
    sudo tar --exclude='backend/vendor' \
             --exclude='backend/node_modules' \
             --exclude='backend/storage/logs/*.log' \
             -czf /home/ubuntu/backups/production/$(echo $PRE_ROLLBACK_BACKUP) backend/
    sudo chown ubuntu:ubuntu /home/ubuntu/backups/production/$(echo $PRE_ROLLBACK_BACKUP)
ENDSSH

echo -e "${GREEN}✅ Pre-rollback backup created: $PRE_ROLLBACK_BACKUP${NC}"

# Step 3: Stop PHP-FPM
echo ""
echo -e "${BLUE}Step 3/8:${NC} Stopping PHP-FPM service..."
ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" "sudo systemctl stop php8.1-fpm"
echo -e "${GREEN}✅ PHP-FPM stopped${NC}"

# Step 4: Move current backend
echo ""
echo -e "${BLUE}Step 4/8:${NC} Moving current backend..."
FAILED_BACKUP="backend_failed_$(date +%Y%m%d_%H%M%S)"
ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" "cd /var/www/QSightsOrg2.0 && sudo mv backend $FAILED_BACKUP"
echo -e "${GREEN}✅ Current backend moved to: $FAILED_BACKUP${NC}"

# Step 5: Extract backup
echo ""
echo -e "${BLUE}Step 5/8:${NC} Extracting backup..."
ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" << ENDSSH
    cd /var/www/QSightsOrg2.0
    sudo tar -xzf $BACKUP_DIR/$BACKUP_FILE
    sudo chown -R www-data:www-data backend/
    sudo chmod -R 755 backend/
    sudo chmod -R 775 backend/storage/
    sudo chmod -R 775 backend/bootstrap/cache/
ENDSSH
echo -e "${GREEN}✅ Backup extracted and permissions set${NC}"

# Step 6: Install dependencies
echo ""
echo -e "${BLUE}Step 6/8:${NC} Installing composer dependencies..."
ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" << 'ENDSSH'
    cd /var/www/QSightsOrg2.0/backend
    sudo composer install --no-dev --optimize-autoloader --no-interaction 2>&1 | tail -5
ENDSSH
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 7: Clear caches
echo ""
echo -e "${BLUE}Step 7/8:${NC} Clearing and rebuilding caches..."
ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" << 'ENDSSH'
    cd /var/www/QSightsOrg2.0/backend
    sudo php artisan config:clear
    sudo php artisan route:clear
    sudo php artisan cache:clear
    sudo php artisan view:clear
    sudo php artisan config:cache
    sudo php artisan route:cache
ENDSSH
echo -e "${GREEN}✅ Caches cleared and rebuilt${NC}"

# Step 8: Restart services
echo ""
echo -e "${BLUE}Step 8/8:${NC} Restarting services..."
ssh -i "$PEM_KEY" "$PROD_USER@$PROD_SERVER" << 'ENDSSH'
    sudo systemctl start php8.1-fpm
    sudo systemctl reload nginx
    sleep 2
    sudo systemctl status php8.1-fpm --no-pager | grep "Active:"
    sudo systemctl status nginx --no-pager | grep "Active:"
ENDSSH
echo -e "${GREEN}✅ Services restarted${NC}"

# Health Check
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Running Health Checks...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

sleep 3

# Check API
echo "Checking API health..."
HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" https://prod.qsights.com/api/health)

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ API Health Check: PASSED (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${RED}⚠️  API Health Check: WARNING (HTTP $HTTP_STATUS)${NC}"
    echo "   Please check logs immediately!"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ ROLLBACK COMPLETED${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Rollback Details:${NC}"
echo "  • Rolled back to: $BACKUP_FILE"
echo "  • Pre-rollback backup: $PRE_ROLLBACK_BACKUP"
echo "  • Failed deployment saved as: $FAILED_BACKUP"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Test the site: https://prod.qsights.com"
echo "  2. Check Laravel logs:"
echo "     ssh to server → tail -f /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log"
echo "  3. Monitor for 15-30 minutes"
echo "  4. Investigate what went wrong in the failed deployment"
echo ""
echo -e "${YELLOW}If rollback failed, you can restore from:${NC}"
echo "  • Pre-rollback backup: $PRE_ROLLBACK_BACKUP"
echo "  • Or use: ./rollback_backend_prod.sh <another_backup>"
echo ""

exit 0
