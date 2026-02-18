#!/bin/bash

###############################################################################
# Critical Fix: Min/Max Selection Backend Save Issue
# Deploys QuestionnaireController.php fix to production
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
BACKEND_PATH="/var/www/QSightsOrg2.0/backend"
LOCAL_FILE="backend/app/Http/Controllers/Api/QuestionnaireController.php"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Deploying Min/Max Selection Backend Fix to PRODUCTION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Verify local file exists
if [ ! -f "$LOCAL_FILE" ]; then
    echo -e "${RED}✗ Local file not found: $LOCAL_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Changes being deployed:${NC}"
echo "  • Added min_selection and max_selection to validation rules"
echo "  • Added min_selection and max_selection to create() in addQuestion()"
echo "  • Added min_selection and max_selection to validation in updateQuestion()"
echo ""
echo -e "${YELLOW}Target: ${NC}$SERVER_IP:$BACKEND_PATH/app/Http/Controllers/Api/QuestionnaireController.php"
echo ""

read -p "Deploy to PRODUCTION? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}[1/4] Backing up current controller on server...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "sudo cp $BACKEND_PATH/app/Http/Controllers/Api/QuestionnaireController.php $BACKEND_PATH/app/Http/Controllers/Api/QuestionnaireController.php.backup.\$(date +%Y%m%d_%H%M%S)"
echo -e "${GREEN}✓ Backup created${NC}"

echo ""
echo -e "${BLUE}[2/4] Uploading fixed controller to temp location...${NC}"
scp -i "$PEM_KEY" "$LOCAL_FILE" "$SERVER_USER@$SERVER_IP:/tmp/QuestionnaireController.php"
echo -e "${GREEN}✓ File uploaded to temp${NC}"

echo ""
echo -e "${BLUE}[3/4] Moving to production location...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "sudo mv /tmp/QuestionnaireController.php $BACKEND_PATH/app/Http/Controllers/Api/QuestionnaireController.php && sudo chown www-data:www-data $BACKEND_PATH/app/Http/Controllers/Api/QuestionnaireController.php"
echo -e "${GREEN}✓ File moved and permissions set${NC}"

echo ""
echo -e "${BLUE}[4/4] Verifying deployment...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "grep -A2 'min_selection.*nullable.*integer' $BACKEND_PATH/app/Http/Controllers/Api/QuestionnaireController.php | head -2"
echo -e "${GREEN}✓ Verification complete${NC}"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}            DEPLOYMENT SUCCESSFUL ✓${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Testing Instructions:${NC}"
echo "1. Edit a questionnaire and add a checkbox question"
echo "2. Set min_selection = 2 and max_selection = 4"
echo "3. Save the questionnaire"
echo "4. Reload the page and verify values are saved"
echo "5. Take the activity and verify validation works"
echo ""
echo -e "${BLUE}Backend logs:${NC} ssh -i $PEM_KEY $SERVER_USER@$SERVER_IP 'tail -f $BACKEND_PATH/storage/logs/laravel.log'"
echo ""
