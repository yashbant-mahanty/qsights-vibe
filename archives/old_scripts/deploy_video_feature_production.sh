#!/bin/bash

###############################################################################
# Video Questionnaire Feature - Production Deployment Script
# Date: February 12, 2026
# Feature: Video questionnaire with watch tracking & metrics
# Server: 13.126.210.220 (PRODUCTION)
###############################################################################

set -e  # Exit on error

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
FRONTEND_PATH="/var/www/frontend"
LOCAL_ROOT="/Users/yash/Documents/Projects/QSightsOrg2.0"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Video Questionnaire Feature - Production Deployment     ║${NC}"
echo -e "${BLUE}║                 Server: 13.126.210.220                       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verify PEM file
if [ ! -f "$PEM_KEY" ]; then
    echo -e "${RED}✗ PEM key not found: $PEM_KEY${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PEM key found${NC}"

# Verify SSH connection
echo -e "${YELLOW}Testing SSH connection...${NC}"
if ! ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "echo 'SSH OK'" > /dev/null 2>&1; then
    echo -e "${RED}✗ Cannot connect to server${NC}"
    exit 1
fi
echo -e "${GREEN}✓ SSH connection verified${NC}"
echo ""

# Verify local frontend build exists
if [ ! -f "$LOCAL_ROOT/frontend/.next/BUILD_ID" ]; then
    echo -e "${RED}✗ Frontend build not found. Run: cd frontend && npm run build${NC}"
    exit 1
fi
BUILD_ID=$(cat "$LOCAL_ROOT/frontend/.next/BUILD_ID")
echo -e "${GREEN}✓ Frontend build found (BUILD_ID: $BUILD_ID)${NC}"
echo ""

# Confirmation
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}                 DEPLOYMENT SUMMARY${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Backend Files to Deploy:"
echo "  • VideoUploadController.php"
echo "  • QuestionnaireVideo.php (model)"
echo "  • VideoViewLog.php (model)"
echo "  • 2 database migrations"
echo "  • Updated routes/api.php"
echo "  • Updated Questionnaire.php model"
echo ""
echo "Frontend Files to Deploy:"
echo "  • VideoPlayer.tsx component"
echo "  • S3VideoUpload.tsx component"
echo "  • Updated results page (video metrics)"
echo "  • Updated take page (video intro)"
echo "  • Updated questionnaire create page"
echo "  • Complete .next build directory"
echo ""
echo "Database Changes:"
echo "  • Create questionnaire_videos table"
echo "  • Create video_view_logs table"
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo ""
read -p "Type 'DEPLOY' to continue: " CONFIRM

if [ "$CONFIRM" != "DEPLOY" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Starting deployment...${NC}"
echo ""

###############################################################################
# STEP 1: DEPLOY BACKEND FILES
###############################################################################
echo -e "${YELLOW}[1/5] Deploying backend files...${NC}"

# Create temp directory on server
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "mkdir -p /tmp/video-deploy/backend"

# Deploy VideoUploadController
echo "  • Uploading VideoUploadController.php..."
scp -i "$PEM_KEY" \
    "$LOCAL_ROOT/backend/app/Http/Controllers/Api/VideoUploadController.php" \
    "$SERVER_USER@$SERVER_IP:/tmp/video-deploy/backend/"

# Deploy Models
echo "  • Uploading QuestionnaireVideo.php..."
scp -i "$PEM_KEY" \
    "$LOCAL_ROOT/backend/app/Models/QuestionnaireVideo.php" \
    "$SERVER_USER@$SERVER_IP:/tmp/video-deploy/backend/"

echo "  • Uploading VideoViewLog.php..."
scp -i "$PEM_KEY" \
    "$LOCAL_ROOT/backend/app/Models/VideoViewLog.php" \
    "$SERVER_USER@$SERVER_IP:/tmp/video-deploy/backend/"

# Deploy migrations
echo "  • Uploading migrations..."
scp -i "$PEM_KEY" \
    "$LOCAL_ROOT/backend/database/migrations/2026_02_12_100000_create_questionnaire_videos_table.php" \
    "$SERVER_USER@$SERVER_IP:/tmp/video-deploy/backend/"

scp -i "$PEM_KEY" \
    "$LOCAL_ROOT/backend/database/migrations/2026_02_12_100001_create_video_view_logs_table.php" \
    "$SERVER_USER@$SERVER_IP:/tmp/video-deploy/backend/"

# Deploy updated routes
echo "  • Uploading routes/api.php..."
scp -i "$PEM_KEY" \
    "$LOCAL_ROOT/backend/routes/api.php" \
    "$SERVER_USER@$SERVER_IP:/tmp/video-deploy/backend/"

# Deploy updated Questionnaire model
echo "  • Uploading Questionnaire.php..."
scp -i "$PEM_KEY" \
    "$LOCAL_ROOT/backend/app/Models/Questionnaire.php" \
    "$SERVER_USER@$SERVER_IP:/tmp/video-deploy/backend/"

# Move files to production with sudo
echo "  • Moving files to production backend..."
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
    sudo cp /tmp/video-deploy/backend/VideoUploadController.php /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/
    sudo cp /tmp/video-deploy/backend/QuestionnaireVideo.php /var/www/QSightsOrg2.0/backend/app/Models/
    sudo cp /tmp/video-deploy/backend/VideoViewLog.php /var/www/QSightsOrg2.0/backend/app/Models/
    sudo cp /tmp/video-deploy/backend/2026_02_12_100000_create_questionnaire_videos_table.php /var/www/QSightsOrg2.0/backend/database/migrations/
    sudo cp /tmp/video-deploy/backend/2026_02_12_100001_create_video_view_logs_table.php /var/www/QSightsOrg2.0/backend/database/migrations/
    sudo cp /tmp/video-deploy/backend/api.php /var/www/QSightsOrg2.0/backend/routes/
    sudo cp /tmp/video-deploy/backend/Questionnaire.php /var/www/QSightsOrg2.0/backend/app/Models/
    sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend/
EOF

echo -e "${GREEN}✓ Backend files deployed${NC}"
echo ""

###############################################################################
# STEP 2: DEPLOY FRONTEND FILES
###############################################################################
echo -e "${YELLOW}[2/5] Deploying frontend files...${NC}"

# Create temp directory for frontend
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "mkdir -p /tmp/video-deploy/frontend/components"

# Deploy components
echo "  • Uploading VideoPlayer.tsx..."
scp -i "$PEM_KEY" \
    "$LOCAL_ROOT/frontend/components/VideoPlayer.tsx" \
    "$SERVER_USER@$SERVER_IP:/tmp/video-deploy/frontend/components/"

echo "  • Uploading S3VideoUpload.tsx..."
scp -i "$PEM_KEY" \
    "$LOCAL_ROOT/frontend/components/S3VideoUpload.tsx" \
    "$SERVER_USER@$SERVER_IP:/tmp/video-deploy/frontend/components/"

# Deploy updated pages
echo "  • Uploading updated pages..."
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "mkdir -p /tmp/video-deploy/frontend/app/activities/take"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "mkdir -p /tmp/video-deploy/frontend/app/activities/results"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "mkdir -p /tmp/video-deploy/frontend/app/questionnaires/create"

scp -i "$PEM_KEY" \
    "$LOCAL_ROOT/frontend/app/activities/take/[id]/page.tsx" \
    "$SERVER_USER@$SERVER_IP:/tmp/video-deploy/frontend/app/activities/take/"

scp -i "$PEM_KEY" \
    "$LOCAL_ROOT/frontend/app/activities/[id]/results/page.tsx" \
    "$SERVER_USER@$SERVER_IP:/tmp/video-deploy/frontend/app/activities/results/"

scp -i "$PEM_KEY" \
    "$LOCAL_ROOT/frontend/app/questionnaires/create/page.tsx" \
    "$SERVER_USER@$SERVER_IP:/tmp/video-deploy/frontend/app/questionnaires/create/"

# Deploy .next build directory
echo "  • Uploading .next build directory (this may take a minute)..."
cd "$LOCAL_ROOT/frontend" && tar -czf /tmp/next-build.tar.gz .next/
scp -i "$PEM_KEY" /tmp/next-build.tar.gz "$SERVER_USER@$SERVER_IP:/tmp/video-deploy/frontend/"
rm /tmp/next-build.tar.gz

# Move frontend files to production
echo "  • Moving files to production frontend..."
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
    # Components
    sudo cp /tmp/video-deploy/frontend/components/VideoPlayer.tsx /var/www/frontend/components/
    sudo cp /tmp/video-deploy/frontend/components/S3VideoUpload.tsx /var/www/frontend/components/
    
    # Pages
    sudo mkdir -p /var/www/frontend/app/activities/take/[id]
    sudo mkdir -p /var/www/frontend/app/activities/[id]/results
    sudo mkdir -p /var/www/frontend/app/questionnaires/create
    sudo cp /tmp/video-deploy/frontend/app/activities/take/page.tsx /var/www/frontend/app/activities/take/[id]/
    sudo cp /tmp/video-deploy/frontend/app/activities/results/page.tsx /var/www/frontend/app/activities/[id]/results/
    sudo cp /tmp/video-deploy/frontend/app/questionnaires/create/page.tsx /var/www/frontend/app/questionnaires/create/
    
    # Extract .next build
    cd /tmp/video-deploy/frontend
    tar -xzf next-build.tar.gz
    sudo rm -rf /var/www/frontend/.next
    sudo cp -r .next /var/www/frontend/
    
    # Set permissions
    sudo chown -R ubuntu:ubuntu /var/www/frontend/
EOF

echo -e "${GREEN}✓ Frontend files deployed${NC}"
echo ""

###############################################################################
# STEP 3: RUN DATABASE MIGRATIONS
###############################################################################
echo -e "${YELLOW}[3/5] Running database migrations...${NC}"

ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
    cd /var/www/QSightsOrg2.0/backend
    php artisan migrate --force
EOF

echo -e "${GREEN}✓ Migrations completed${NC}"
echo ""

###############################################################################
# STEP 4: CLEAR CACHES
###############################################################################
echo -e "${YELLOW}[4/5] Clearing caches...${NC}"

ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
    cd /var/www/QSightsOrg2.0/backend
    php artisan config:clear
    php artisan cache:clear
    php artisan route:clear
    php artisan view:clear
EOF

echo -e "${GREEN}✓ Caches cleared${NC}"
echo ""

###############################################################################
# STEP 5: RESTART PM2
###############################################################################
echo -e "${YELLOW}[5/5] Restarting PM2...${NC}"

ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
    cd /var/www/frontend
    pm2 restart all
    sleep 3
    pm2 status
EOF

echo -e "${GREEN}✓ PM2 restarted${NC}"
echo ""

###############################################################################
# CLEANUP
###############################################################################
echo -e "${YELLOW}Cleaning up temporary files...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "rm -rf /tmp/video-deploy"
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

###############################################################################
# VERIFICATION
###############################################################################
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  DEPLOYMENT COMPLETED                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Backend files deployed to: $BACKEND_PATH${NC}"
echo -e "${GREEN}✓ Frontend files deployed to: $FRONTEND_PATH${NC}"
echo -e "${GREEN}✓ Database migrations completed${NC}"
echo -e "${GREEN}✓ Caches cleared${NC}"
echo -e "${GREEN}✓ PM2 restarted${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Verify migrations ran successfully:"
echo "   ssh -i $PEM_KEY $SERVER_USER@$SERVER_IP"
echo "   cd /var/www/QSightsOrg2.0/backend"
echo "   php artisan migrate:status | grep video"
echo ""
echo "2. Check frontend is serving:"
echo "   curl -I https://production-url.com"
echo ""
echo "3. Test video feature:"
echo "   • Login to admin panel"
echo "   • Create/edit questionnaire"
echo "   • Upload a video"
echo "   • Take activity as participant"
echo "   • Check reports for video metrics"
echo ""
echo -e "${YELLOW}Rollback (if needed):${NC}"
echo "  git checkout pre-video-deployment-backup-feb12-2026"
echo "  ssh to server and run:"
echo "  cd /var/www/QSightsOrg2.0/backend"
echo "  php artisan migrate:rollback --step=2"
echo ""
echo -e "${GREEN}🎉 Video Questionnaire Feature Deployed Successfully! 🎉${NC}"
