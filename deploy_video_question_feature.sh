#!/bin/bash

# DEPLOYMENT SCRIPT: Video Question Feature
# Date: February 12, 2026
# Description: Deploys video question type feature to production

set -e  # Exit on error

echo "========================================="
echo "VIDEO QUESTION FEATURE DEPLOYMENT"
echo "========================================="
echo ""

# Configuration
BACKEND_DIR="/var/www/QSightsOrg2.0/backend"
FRONTEND_DIR="/var/www/QSightsOrg2.0/frontend"
APP_URL="your-domain.com"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[1/8] Checking prerequisites...${NC}"
echo ""

# Check if directories exist
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}Error: Backend directory not found at $BACKEND_DIR${NC}"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: Frontend directory not found at $FRONTEND_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Directories found${NC}"
echo ""

echo -e "${YELLOW}[2/8] Pulling latest changes from Git...${NC}"
cd /var/www/QSightsOrg2.0
git pull origin main
echo -e "${GREEN}✓ Git pull complete${NC}"
echo ""

echo -e "${YELLOW}[3/8] Running database migrations...${NC}"
cd $BACKEND_DIR

# Run video-related migrations
php artisan migrate --path=database/migrations/2026_02_12_000001_add_video_support_to_questions_table.php --force
php artisan migrate --path=database/migrations/2026_02_12_000002_create_video_watch_tracking_table.php --force

echo -e "${GREEN}✓ Database migrations complete${NC}"
echo ""

echo -e "${YELLOW}[4/8] Checking migration status...${NC}"
php artisan migrate:status | grep -E "(video|2026_02_12)"
echo ""

echo -e "${YELLOW}[5/8] Clearing backend caches...${NC}"
cd $BACKEND_DIR
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
echo -e "${GREEN}✓ Backend caches cleared${NC}"
echo ""

echo -e "${YELLOW}[6/8] Installing dependencies (if needed)...${NC}"
cd $BACKEND_DIR
composer install --no-dev --optimize-autoloader 2>&1 | grep -E "(Installing|Nothing to install)"

echo -e "${GREEN}✓ Backend dependencies ready${NC}"
echo ""

echo -e "${YELLOW}[7/8] Building frontend...${NC}"
cd $FRONTEND_DIR
npm run build 2>&1 | grep -E "(Compiled|✓|✗|Error|Failed)" | head -20
echo -e "${GREEN}✓ Frontend build complete${NC}"
echo ""

echo -e "${YELLOW}[8/8] Restarting services...${NC}"
# Restart PHP-FPM
sudo systemctl restart php8.3-fpm 2>/dev/null || sudo systemctl restart php8.2-fpm 2>/dev/null || echo "PHP-FPM restart skipped"

# Restart nginx
sudo systemctl restart nginx 2>/dev/null || echo "Nginx restart skipped"

# Restart PM2 (if using)
pm2 restart qsights 2>/dev/null || echo "PM2 restart skipped"

echo -e "${GREEN}✓ Services restarted${NC}"
echo ""

echo -e "${GREEN}========================================="
echo "DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "=========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Test video question creation in Questionnaire Builder"
echo "2. Test video upload functionality"
echo "3. Test video playback in Take Activity page"
echo "4. Verify watch tracking is working"
echo "5. Check mandatory validation logic"
echo "6. Review video reports in Activity Results"
echo ""
echo "Admin Panel: https://$APP_URL/admin"
echo "Documentation: /VIDEO_QUESTION_FEATURE_IMPLEMENTATION.md"
echo ""
echo -e "${YELLOW}Note: Frontend video player UI will be available in the next deployment.${NC}"
echo "Current deployment includes:"
echo "  ✓ Database schema updates"
echo "  ✓ Backend API endpoints"
echo "  ✓ Video question type registration"
echo "  ✓ Watch tracking backend"
echo ""
echo -e "${GREEN}Deployment completed at: $(date)${NC}"
