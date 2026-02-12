#!/bin/bash

# VIDEO QUESTION FIX DEPLOYMENT SCRIPT
# Date: February 12, 2026
# Issue: Video type questions not displaying on take activity page
# Fix: Removed duplicate case "video" statement in switch block
# File: frontend/app/activities/take/[id]/page.tsx

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_USER="ubuntu"
SERVER_HOST="13.126.210.220"
PEM_FILE="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
BACKEND_DIR="/var/www/QSightsOrg2.0/backend"
FRONTEND_DIR="/var/www/QSightsOrg2.0/frontend"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}VIDEO QUESTION FIX - PRODUCTION DEPLOYMENT${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Issue:${NC} Video type questions not displaying on take activity page"
echo -e "${YELLOW}Cause:${NC} Duplicate case 'video' statement in renderQuestion switch"
echo -e "${YELLOW}Fix:${NC} Removed first incomplete video case, kept complete one with all props"
echo ""

# Step 1: Git operations
echo -e "${BLUE}[1/4] Git Operations${NC}"
echo "→ Pushing changes to remote..."
if git push origin Production-Package; then
    echo -e "${GREEN}✓ Git push successful${NC}"
else
    echo -e "${RED}✗ Git push failed${NC}"
    exit 1
fi
echo ""

# Step 2: Pull on server and install dependencies
echo -e "${BLUE}[2/4] Pulling Latest Code on Server${NC}"
ssh -i "$PEM_FILE" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
set -e

# Pull latest code
cd /var/www/QSightsOrg2.0
echo "→ Fetching and pulling latest changes..."
sudo git fetch origin
sudo git reset --hard origin/Production-Package
echo "✓ Code updated"

# Install/update frontend dependencies (if needed)
cd /var/www/QSightsOrg2.0/frontend
echo "→ Checking frontend dependencies..."
if [ -f "package.json" ]; then
    echo "→ Installing/updating npm packages..."
    sudo npm install --production
    echo "✓ Dependencies updated"
fi

ENDSSH

echo -e "${GREEN}✓ Server code updated${NC}"
echo ""

# Step 3: Build Frontend
echo -e "${BLUE}[3/4] Building Frontend${NC}"
ssh -i "$PEM_FILE" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
set -e

cd /var/www/QSightsOrg2.0/frontend

echo "→ Building Next.js application..."
sudo npm run build

echo "✓ Frontend build complete"

ENDSSH

echo -e "${GREEN}✓ Frontend built successfully${NC}"
echo ""

# Step 4: Restart PM2
echo -e "${BLUE}[4/4] Restarting Services${NC}"
ssh -i "$PEM_FILE" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
set -e

echo "→ Restarting PM2 services..."
sudo pm2 restart all
sleep 3

echo "→ Checking PM2 status..."
sudo pm2 status

echo "✓ Services restarted"

ENDSSH

echo -e "${GREEN}✓ Services restarted${NC}"
echo ""

# Deployment Complete
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ DEPLOYMENT COMPLETE${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}What was fixed:${NC}"
echo "  • Removed duplicate 'case video' statement in switch block"
echo "  • Video questions now use complete case with all props:"
echo "    - thumbnailUrl prop included"
echo "    - onCompletionChange callback for validation"
echo "    - Proper activity ID reference"
echo ""
echo -e "${YELLOW}Testing Steps:${NC}"
echo "  1. Open the preview URL:"
echo "     https://prod.qsights.com/activities/take/a10e5460-cff2-4ad4-b79a-cabdc2727521?token=..."
echo "  2. Navigate to the video question"
echo "  3. Verify video player displays correctly"
echo "  4. Check browser console for no errors"
echo "  5. Test video playback and progress tracking"
echo ""
echo -e "${YELLOW}Key Changes:${NC}"
echo "  • File: frontend/app/activities/take/[id]/page.tsx"
echo "  • Lines: Removed ~3167-3193 (duplicate case)"
echo "  • Kept: Complete video case with thumbnailUrl and onCompletionChange"
echo ""
echo -e "${BLUE}Production URL:${NC} https://prod.qsights.com"
echo ""
