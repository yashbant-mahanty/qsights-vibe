#!/bin/bash

# Evaluation & Notification Fix Deployment Script
# Date: February 11, 2026
# Fixes: Evaluation trigger emails & Participant notification filtering

set -e  # Exit on error

echo "========================================="
echo "Evaluation & Notification Fix Deployment"
echo "Date: $(date)"
echo "========================================="
echo ""

# Configuration
PEM_FILE="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
REMOTE_PATH="/var/www/backend"
LOCAL_PATH="/Users/yash/Documents/Projects/QSightsOrg2.0/backend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Creating backups on server...${NC}"
ssh -i "$PEM_FILE" "$SERVER" << 'EOF'
cd /var/www/backend
mkdir -p backups/before_eval_notification_fix_$(date +%Y%m%d_%H%M%S)
cp app/Services/EvaluationNotificationService.php "backups/before_eval_notification_fix_$(date +%Y%m%d_%H%M%S)/"
cp app/Http/Controllers/Api/EvaluationTriggerController.php "backups/before_eval_notification_fix_$(date +%Y%m%d_%H%M%S)/"
cp app/Http/Controllers/Api/ActivityController.php "backups/before_eval_notification_fix_$(date +%Y%m%d_%H%M%S)/"
echo "✓ Backups created"
EOF

echo -e "${GREEN}✓ Backups created${NC}"
echo ""

echo -e "${YELLOW}Step 2: Uploading EvaluationNotificationService.php...${NC}"
scp -i "$PEM_FILE" \
  "$LOCAL_PATH/app/Services/EvaluationNotificationService.php" \
  "$SERVER:$REMOTE_PATH/app/Services/"
echo -e "${GREEN}✓ EvaluationNotificationService.php uploaded${NC}"
echo ""

echo -e "${YELLOW}Step 3: Uploading EvaluationTriggerController.php...${NC}"
scp -i "$PEM_FILE" \
  "$LOCAL_PATH/app/Http/Controllers/Api/EvaluationTriggerController.php" \
  "$SERVER:$REMOTE_PATH/app/Http/Controllers/Api/"
echo -e "${GREEN}✓ EvaluationTriggerController.php uploaded${NC}"
echo ""

echo -e "${YELLOW}Step 4: Uploading ActivityController.php...${NC}"
scp -i "$PEM_FILE" \
  "$LOCAL_PATH/app/Http/Controllers/Api/ActivityController.php" \
  "$SERVER:$REMOTE_PATH/app/Http/Controllers/Api/"
echo -e "${GREEN}✓ ActivityController.php uploaded${NC}"
echo ""

echo -e "${YELLOW}Step 5: Clearing Laravel cache...${NC}"
ssh -i "$PEM_FILE" "$SERVER" << 'EOF'
cd /var/www/backend
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
echo "✓ Cache cleared"
EOF
echo -e "${GREEN}✓ Cache cleared${NC}"
echo ""

echo -e "${YELLOW}Step 6: Reloading PHP-FPM...${NC}"
ssh -i "$PEM_FILE" "$SERVER" << 'EOF'
sudo systemctl reload php8.1-fpm
echo "✓ PHP-FPM reloaded"
EOF
echo -e "${GREEN}✓ PHP-FPM reloaded${NC}"
echo ""

echo -e "${YELLOW}Step 7: Verifying deployment...${NC}"
ssh -i "$PEM_FILE" "$SERVER" << 'EOF'
echo "File timestamps:"
ls -lh /var/www/backend/app/Services/EvaluationNotificationService.php
ls -lh /var/www/backend/app/Http/Controllers/Api/EvaluationTriggerController.php
ls -lh /var/www/backend/app/Http/Controllers/Api/ActivityController.php
EOF
echo -e "${GREEN}✓ Verification complete${NC}"
echo ""

echo "========================================="
echo -e "${GREEN}DEPLOYMENT SUCCESSFUL!${NC}"
echo "========================================="
echo ""
echo "Next Steps:"
echo "1. Test evaluation trigger - verify emails are sent with templates"
echo "2. Test participant notifications - verify all participants show up"
echo "3. Monitor logs: /var/www/backend/storage/logs/laravel.log"
echo "4. Check email debug log: /var/www/backend/storage/logs/email_debug.log"
echo ""
echo "Rollback command (if needed):"
echo "  ssh -i \"$PEM_FILE\" \"$SERVER\" 'cd /var/www/backend && cp backups/before_eval_notification_fix_*/EvaluationNotificationService.php app/Services/ && cp backups/before_eval_notification_fix_*/EvaluationTriggerController.php app/Http/Controllers/Api/ && cp backups/before_eval_notification_fix_*/ActivityController.php app/Http/Controllers/Api/ && php artisan cache:clear && sudo systemctl reload php8.1-fpm'"
echo ""
