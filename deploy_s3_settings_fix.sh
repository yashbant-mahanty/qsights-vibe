#!/bin/bash

# QSights S3 Settings Fix Deployment Script
# Deploys the fixed SystemSettingsController with S3 methods

set -e

echo "======================================"
echo "QSights S3 Settings Fix Deployment"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PEM_FILE="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER_IP="13.126.210.220"
PROJECT_DIR="/Users/yash/Documents/Projects/QSightsOrg2.0"
REMOTE_BACKEND="/var/www/QSightsOrg2.0/backend"

# File to deploy
CONTROLLER_FILE="backend/app/Http/Controllers/Api/SystemSettingsController.php"

echo -e "${GREEN}Step 1: Backing up existing file on server...${NC}"
ssh -i $PEM_FILE ubuntu@$SERVER_IP "sudo cp $REMOTE_BACKEND/app/Http/Controllers/Api/SystemSettingsController.php $REMOTE_BACKEND/app/Http/Controllers/Api/SystemSettingsController.php.backup-$(date +%Y%m%d-%H%M%S)"

echo -e "${GREEN}Step 2: Uploading updated SystemSettingsController...${NC}"
cat "$PROJECT_DIR/$CONTROLLER_FILE" | ssh -i $PEM_FILE ubuntu@$SERVER_IP "sudo tee $REMOTE_BACKEND/app/Http/Controllers/Api/SystemSettingsController.php > /dev/null"

echo -e "${GREEN}Step 3: Setting correct permissions...${NC}"
ssh -i $PEM_FILE ubuntu@$SERVER_IP "sudo chown www-data:www-data $REMOTE_BACKEND/app/Http/Controllers/Api/SystemSettingsController.php"

echo -e "${GREEN}Step 4: Clearing Laravel caches...${NC}"
ssh -i $PEM_FILE ubuntu@$SERVER_IP "cd $REMOTE_BACKEND && php artisan cache:clear && php artisan config:clear && php artisan route:clear && php artisan view:clear"

echo -e "${GREEN}Step 5: Verifying deployment...${NC}"
ssh -i $PEM_FILE ubuntu@$SERVER_IP "grep -q 'getS3Config' $REMOTE_BACKEND/app/Http/Controllers/Api/SystemSettingsController.php && echo '✓ getS3Config method found' || echo '✗ Method not found'"
ssh -i $PEM_FILE ubuntu@$SERVER_IP "grep -q 'saveS3Config' $REMOTE_BACKEND/app/Http/Controllers/Api/SystemSettingsController.php && echo '✓ saveS3Config method found' || echo '✗ Method not found'"
ssh -i $PEM_FILE ubuntu@$SERVER_IP "grep -q 'testS3Connection' $REMOTE_BACKEND/app/Http/Controllers/Api/SystemSettingsController.php && echo '✓ testS3Connection method found' || echo '✗ Method not found'"

echo ""
echo -e "${GREEN}======================================"
echo "Deployment completed successfully!"
echo "======================================${NC}"
echo ""
echo "Next steps:"
echo "1. Visit https://prod.qsights.com/settings/system"
echo "2. Navigate to the 'AWS S3 Storage' tab"
echo "3. Verify S3 settings are now loading from the database"
echo "4. Test saving new S3 configuration"
echo ""
echo "To rollback if needed:"
echo "ssh -i $PEM_FILE ubuntu@$SERVER_IP \"sudo cp $REMOTE_BACKEND/app/Http/Controllers/Api/SystemSettingsController.php.backup-* $REMOTE_BACKEND/app/Http/Controllers/Api/SystemSettingsController.php\""
