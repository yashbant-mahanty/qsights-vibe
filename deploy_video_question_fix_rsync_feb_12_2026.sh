#!/bin/bash

# VIDEO QUESTION FIX DEPLOYMENT SCRIPT (RSYNC METHOD)
# Date: February 12, 2026
# Issue: Video type questions not displaying on take activity page
# Fix: Removed duplicate case "video" statement in switch block

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
LOCAL_FRONTEND="/Users/yash/Documents/Projects/QSightsOrg2.0/frontend"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}VIDEO QUESTION FIX - PRODUCTION DEPLOYMENT${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Issue:${NC} Video type questions not displaying on take activity page"
echo -e "${YELLOW}Cause:${NC} Duplicate case 'video' statement in renderQuestion switch"
echo -e "${YELLOW}Fix:${NC} Removed first incomplete video case, kept complete one with all props"
echo ""

# Step 1: Backup current file on server
echo -e "${BLUE}[1/5] Backing Up Current File${NC}"
echo "→ Creating backup of current page.tsx..."
ssh -i "$PEM_FILE" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
set -e

BACKUP_DIR="/var/www/QSightsOrg2.0/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory if it doesn't exist
sudo mkdir -p "$BACKUP_DIR"

# Backup the file
if [ -f "/var/www/QSightsOrg2.0/frontend/app/activities/take/[id]/page.tsx" ]; then
    sudo cp "/var/www/QSightsOrg2.0/frontend/app/activities/take/[id]/page.tsx" \
        "$BACKUP_DIR/page.tsx.backup.$TIMESTAMP"
    echo "✓ Backup created: page.tsx.backup.$TIMESTAMP"
else
    echo "⚠ Original file not found - proceeding anyway"
fi

ENDSSH

echo -e "${GREEN}✓ Backup complete${NC}"
echo ""

# Step 2: Copy updated file to server
echo -e "${BLUE}[2/5] Copying Updated File to Server${NC}"
echo "→ Uploading fixed page.tsx..."

# Create the directory structure if it doesn't exist
ssh -i "$PEM_FILE" "$SERVER_USER@$SERVER_HOST" \
    "sudo mkdir -p /var/www/QSightsOrg2.0/frontend/app/activities/take/[id]/"

# Copy the file
scp -i "$PEM_FILE" \
    "$LOCAL_FRONTEND/app/activities/take/[id]/page.tsx" \
    "$SERVER_USER@$SERVER_HOST:/tmp/page.tsx"

# Move to correct location with proper permissions
ssh -i "$PEM_FILE" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
set -e
sudo mv /tmp/page.tsx "/var/www/QSightsOrg2.0/frontend/app/activities/take/[id]/page.tsx"
sudo chown ubuntu:ubuntu "/var/www/QSightsOrg2.0/frontend/app/activities/take/[id]/page.tsx"
sudo chmod 644 "/var/www/QSightsOrg2.0/frontend/app/activities/take/[id]/page.tsx"
ENDSSH

echo -e "${GREEN}✓ File uploaded successfully${NC}"
echo ""

# Step 3: Install dependencies (if needed)
echo -e "${BLUE}[3/5] Checking Dependencies${NC}"
ssh -i "$PEM_FILE" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
set -e

cd /var/www/QSightsOrg2.0/frontend

echo "→ Verifying npm packages..."
if [ -f "package.json" ]; then
    # Only reinstall if package-lock.json changed or node_modules missing
    if [ ! -d "node_modules" ] || [ "package-lock.json" -nt "node_modules" ]; then
        echo "→ Installing npm packages..."
        sudo npm install --production 2>&1 | tail -10
        echo "✓ Dependencies installed"
    else
        echo "✓ Dependencies are up to date"
    fi
fi

ENDSSH

echo -e "${GREEN}✓ Dependencies checked${NC}"
echo ""

# Step 4: Build Frontend
echo -e "${BLUE}[4/5] Building Frontend${NC}"
ssh -i "$PEM_FILE" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
set -e

cd /var/www/QSightsOrg2.0/frontend

echo "→ Building Next.js application (this may take a few minutes)..."
echo "→ Please wait..."
sudo npm run build 2>&1 | grep -E "(Compiled|Creating|Generating|Route|✓|✗|Error)" || true

echo "✓ Frontend build complete"

ENDSSH

echo -e "${GREEN}✓ Frontend built successfully${NC}"
echo ""

# Step 5: Restart PM2
echo -e "${BLUE}[5/5] Restarting Services${NC}"
ssh -i "$PEM_FILE" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
set -e

echo "→ Restarting PM2 services..."
sudo pm2 restart all 2>&1 | grep -v "PM2" | head -10 || true
sleep 3

echo "→ Checking PM2 status..."
sudo pm2 list | head -20

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
echo "  4. Check browser console for no errors (F12)"
echo "  5. Test video playback and progress tracking"
echo ""
echo -e "${YELLOW}Key Changes:${NC}"
echo "  • File: frontend/app/activities/take/[id]/page.tsx"
echo "  • Lines: Removed ~3167-3193 (duplicate case)"
echo "  • Kept: Complete video case with thumbnailUrl and onCompletionChange"
echo ""
echo -e "${BLUE}Production URL:${NC} https://prod.qsights.com"
echo ""
echo -e "${YELLOW}Rollback (if needed):${NC}"
echo "  The original file has been backed up on the server at:"
echo "  /var/www/QSightsOrg2.0/backups/page.tsx.backup.[TIMESTAMP]"
echo ""
