#!/bin/bash

###############################################################################
# Min/Max Selection Feature - Direct Production Deployment
# WARNING: This deploys DIRECTLY to LIVE PRODUCTION (13.126.210.220)
# Features: Min/Max selection limits for multiple choice questions
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
SERVER_IP="13.126.210.220"
SERVER_USER="ubuntu"
BACKEND_PATH="/var/www/QSightsOrg2.0/backend"
FRONTEND_PATH="/var/www/frontend"

echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║     MIN/MAX SELECTION FEATURE - PRODUCTION DEPLOYMENT        ║${NC}"
echo -e "${RED}║     Server: 13.126.210.220 (LIVE PRODUCTION)                 ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Files to be deployed:${NC}"
echo "Backend:"
echo "  - database/migrations/2026_02_17_000001_add_min_max_selection_to_questions.php"
echo "  - app/Models/Question.php"
echo "  - app/Http/Controllers/Api/QuestionnaireController.php"
echo ""
echo "Frontend:"
echo "  - app/questionnaires/[id]/page.tsx"
echo "  - app/activities/take/[id]/page.tsx"
echo ""

read -p "Deploy to LIVE PRODUCTION? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  STEP 1: Creating Backup on Production Server${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "mkdir -p /home/ubuntu/backups/min_max_feature_$BACKUP_DATE"

echo -e "${GREEN}✓ Backup directory created: /home/ubuntu/backups/min_max_feature_$BACKUP_DATE${NC}"

# Backup existing files
echo "Backing up existing files..."
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" <<'EOF'
  # Backup backend files
  mkdir -p /home/ubuntu/backups/min_max_feature_backup/backend
  cp /var/www/QSightsOrg2.0/backend/app/Models/Question.php /home/ubuntu/backups/min_max_feature_backup/backend/ 2>/dev/null || true
  cp /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/QuestionnaireController.php /home/ubuntu/backups/min_max_feature_backup/backend/ 2>/dev/null || true
  
  # Backup frontend files
  mkdir -p /home/ubuntu/backups/min_max_feature_backup/frontend
  cp /var/www/frontend/app/questionnaires/\[id\]/page.tsx /home/ubuntu/backups/min_max_feature_backup/frontend/questionnaires_page.tsx 2>/dev/null || true
  cp /var/www/frontend/app/activities/take/\[id\]/page.tsx /home/ubuntu/backups/min_max_feature_backup/frontend/take_page.tsx 2>/dev/null || true
  
  echo "Backup complete!"
EOF

echo -e "${GREEN}✓ Existing files backed up${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  STEP 2: Deploying Backend Files${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# Deploy migration file
echo "Uploading migration file..."
scp -i "$PEM_KEY" \
  backend/database/migrations/2026_02_17_000001_add_min_max_selection_to_questions.php \
  "$SERVER_USER@$SERVER_IP:/tmp/"

ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" \
  "sudo mv /tmp/2026_02_17_000001_add_min_max_selection_to_questions.php $BACKEND_PATH/database/migrations/ && \
   sudo chown www-data:www-data $BACKEND_PATH/database/migrations/2026_02_17_000001_add_min_max_selection_to_questions.php && \
   sudo chmod 644 $BACKEND_PATH/database/migrations/2026_02_17_000001_add_min_max_selection_to_questions.php"

echo -e "${GREEN}✓ Migration file deployed${NC}"

# Deploy Question model
echo "Uploading Question.php..."
scp -i "$PEM_KEY" \
  backend/app/Models/Question.php \
  "$SERVER_USER@$SERVER_IP:/tmp/"

ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" \
  "sudo mv /tmp/Question.php $BACKEND_PATH/app/Models/ && \
   sudo chown www-data:www-data $BACKEND_PATH/app/Models/Question.php && \
   sudo chmod 644 $BACKEND_PATH/app/Models/Question.php"

echo -e "${GREEN}✓ Question.php deployed${NC}"

# Deploy QuestionnaireController
echo "Uploading QuestionnaireController.php..."
scp -i "$PEM_KEY" \
  backend/app/Http/Controllers/Api/QuestionnaireController.php \
  "$SERVER_USER@$SERVER_IP:/tmp/"

ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" \
  "sudo mv /tmp/QuestionnaireController.php $BACKEND_PATH/app/Http/Controllers/Api/ && \
   sudo chown www-data:www-data $BACKEND_PATH/app/Http/Controllers/Api/QuestionnaireController.php && \
   sudo chmod 644 $BACKEND_PATH/app/Http/Controllers/Api/QuestionnaireController.php"

echo -e "${GREEN}✓ QuestionnaireController.php deployed${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  STEP 3: Running Database Migration${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" <<'EOF'
  cd /var/www/QSightsOrg2.0/backend
  php artisan migrate --path=database/migrations/2026_02_17_000001_add_min_max_selection_to_questions.php --force
EOF

echo -e "${GREEN}✓ Migration executed on production database${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  STEP 4: Clearing Laravel Cache${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" <<'EOF'
  cd /var/www/QSightsOrg2.0/backend
  php artisan config:clear
  php artisan route:clear
  php artisan cache:clear
EOF

echo -e "${GREEN}✓ Laravel cache cleared${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  STEP 5: Deploying Frontend Files${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# Deploy questionnaire builder page
echo "Uploading questionnaires/[id]/page.tsx..."
scp -i "$PEM_KEY" \
  "frontend/app/questionnaires/[id]/page.tsx" \
  "$SERVER_USER@$SERVER_IP:/tmp/questionnaires_page.tsx"

ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" \
  "sudo mv /tmp/questionnaires_page.tsx $FRONTEND_PATH/app/questionnaires/\[id\]/page.tsx && \
   sudo chown ubuntu:ubuntu $FRONTEND_PATH/app/questionnaires/\[id\]/page.tsx && \
   sudo chmod 644 $FRONTEND_PATH/app/questionnaires/\[id\]/page.tsx"

echo -e "${GREEN}✓ Questionnaire builder page deployed${NC}"

# Deploy take activity page
echo "Uploading activities/take/[id]/page.tsx..."
scp -i "$PEM_KEY" \
  "frontend/app/activities/take/[id]/page.tsx" \
  "$SERVER_USER@$SERVER_IP:/tmp/take_page.tsx"

ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" \
  "sudo mv /tmp/take_page.tsx $FRONTEND_PATH/app/activities/take/\[id\]/page.tsx && \
   sudo chown ubuntu:ubuntu $FRONTEND_PATH/app/activities/take/\[id\]/page.tsx && \
   sudo chmod 644 $FRONTEND_PATH/app/activities/take/\[id\]/page.tsx"

echo -e "${GREEN}✓ Take activity page deployed${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  STEP 6: Rebuilding Frontend (Next.js)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" <<'EOF'
  cd /var/www/frontend
  npm run build
EOF

echo -e "${GREEN}✓ Frontend rebuilt successfully${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  STEP 7: Restarting PM2 Services${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" <<'EOF'
  pm2 restart qsights-frontend
  pm2 status
EOF

echo -e "${GREEN}✓ PM2 services restarted${NC}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                 DEPLOYMENT COMPLETED                         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Test the feature on production:"
echo "   - Create a multi-select question"
echo "   - Set min/max limits"
echo "   - Take the activity and verify"
echo ""
echo "2. Check for errors:"
echo "   - Backend: ssh and check /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log"
echo "   - Frontend: pm2 logs qsights-frontend"
echo ""
echo "3. Rollback if needed:"
echo "   - Files backed up in: /home/ubuntu/backups/min_max_feature_backup/"
echo ""
echo -e "${GREEN}Production URL: https://prod.qsights.com${NC}"
echo ""
