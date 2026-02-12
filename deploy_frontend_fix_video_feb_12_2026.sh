#!/bin/bash

###############################################################################
# Frontend Video Fix Deployment - February 12, 2026
# Fix: Video upload not showing, 's is not a function' error
# Deploy latest frontend build with video fixes
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
FRONTEND_PATH="/var/www/frontend"
LOCAL_FRONTEND="/Users/yash/Documents/Projects/QSightsOrg2.0/frontend"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}     Frontend Video Fix Deployment - Feb 12, 2026         ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Verify PEM file
if [ ! -f "$PEM_KEY" ]; then
    echo -e "${RED}✗ PEM key not found${NC}"
    exit 1
fi

# Verify build exists
if [ ! -d "$LOCAL_FRONTEND/.next" ]; then
    echo -e "${RED}✗ Frontend build not found. Building now...${NC}"
    cd "$LOCAL_FRONTEND"
    npm run build
fi

BUILD_ID=$(cat "$LOCAL_FRONTEND/.next/BUILD_ID" 2>/dev/null || echo "unknown")
echo -e "${GREEN}✓ Frontend build ready (BUILD_ID: $BUILD_ID)${NC}"
echo ""

# Confirmation
echo -e "${YELLOW}This will deploy the latest frontend build to fix:${NC}"
echo "  • Video upload not showing in questionnaire editor"
echo "  • 's is not a function' JavaScript error"
echo "  • Video playback in take activity page"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}[1/4] Creating backup of current frontend...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
    if [ -d /var/www/frontend/.next ]; then
        sudo rm -rf /var/www/frontend/.next.backup 2>/dev/null || true
        sudo cp -r /var/www/frontend/.next /var/www/frontend/.next.backup
        echo "✓ Backup created: /var/www/frontend/.next.backup"
    fi
EOF

echo ""
echo -e "${BLUE}[2/4] Stopping PM2 frontend process...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "sudo pm2 stop qsights-frontend || true"
echo -e "${GREEN}✓ PM2 stopped${NC}"

echo ""
echo -e "${BLUE}[3/4] Deploying frontend build...${NC}"
echo "Syncing .next directory (this may take a minute)..."

# Use rsync for efficient file transfer
rsync -avz --delete \
    -e "ssh -i $PEM_KEY" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    "$LOCAL_FRONTEND/.next/" \
    "$SERVER_USER@$SERVER_IP:/tmp/frontend-next-deploy/"

# Move files with sudo on server
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
    sudo rm -rf /var/www/frontend/.next
    sudo mv /tmp/frontend-next-deploy /var/www/frontend/.next
    sudo chown -R www-data:www-data /var/www/frontend/.next
    sudo chmod -R 755 /var/www/frontend/.next
EOF

echo -e "${GREEN}✓ Frontend deployed${NC}"

echo ""
echo -e "${BLUE}[4/4] Restarting PM2 frontend...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
    sudo pm2 restart qsights-frontend --update-env
    sleep 5
    sudo pm2 list
EOF

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}          ✓ DEPLOYMENT COMPLETED SUCCESSFULLY${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Visit: https://prod.qsights.com/questionnaires/27"
echo "2. Go to Edit mode"
echo "3. Add or edit a video question"
echo "4. Verify video upload component appears"
echo "5. Test video upload functionality"
echo "6. Go to Activities > Take page and verify video playback"
echo ""
echo -e "${BLUE}Backup Location:${NC} /var/www/frontend/.next.backup"
echo -e "${BLUE}To rollback:${NC} ssh and run: sudo mv /var/www/frontend/.next.backup /var/www/frontend/.next"
echo ""
echo -e "${GREEN}Deployment completed at: $(date)${NC}"
