#!/bin/bash
# ========================================
# URGENT FIX - FEBRUARY 15, 2026
# Reference Validation Rules Fix
# ========================================
#
# ISSUE: References were being stripped by Laravel validator
# FIX: Added validation rules for references field
#

set -e

# Configuration
PEM="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
BACKEND_LOCAL="/Users/yash/Documents/Projects/QSightsOrg2.0/backend"
BACKEND_REMOTE="/var/www/QSightsOrg2.0/backend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}========================================"
echo "🚨 URGENT FIX - REFERENCE VALIDATION"
echo "========================================${NC}\n"

# Upload the fixed controller
echo -e "${YELLOW}Uploading fixed QuestionnaireController...${NC}"
scp -i "$PEM" "$BACKEND_LOCAL/app/Http/Controllers/Api/QuestionnaireController.php" \
    "$SERVER:/tmp/QuestionnaireController.php"

# Deploy and test
ssh -i "$PEM" "$SERVER" << 'DEPLOY_EOF'
set -e

# Backup
echo "Creating backup..."
sudo cp /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/QuestionnaireController.php \
    /home/ubuntu/backups/QuestionnaireController_pre_validation_fix.php

# Deploy
echo "Deploying fix..."
sudo cp /tmp/QuestionnaireController.php /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/
sudo chown www-data:www-data /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/QuestionnaireController.php

# Clear caches
echo "Clearing caches..."
cd /var/www/QSightsOrg2.0/backend
sudo php artisan config:clear
sudo php artisan cache:clear
sudo php artisan route:clear

echo "✓ Fix deployed!"
DEPLOY_EOF

echo -e "\n${GREEN}========================================"
echo "✅ DEPLOYMENT COMPLETE"
echo "========================================"
echo ""
echo "TEST NOW:"
echo "1. Go to https://prod.qsights.com/questionnaires/27"
echo "2. Add a reference to SCT 01 question"
echo "3. Save the questionnaire"
echo "4. Reload and verify reference is saved"
echo -e "========================================${NC}"
