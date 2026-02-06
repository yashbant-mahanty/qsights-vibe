#!/bin/bash

# Critical Fixes Production Deployment
# Date: February 6, 2026
# CORRECT PATHS: Frontend -> /var/www/frontend

set -e

echo "🚀 Deploying Critical Fixes to PRODUCTION"
echo "=========================================="
echo ""

# Configuration
PEM_PATH="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📋 Fixed Issues:${NC}"
echo "  1. Program Edit Modal - Start/End dates now display correctly"
echo "  2. Program Status - Shows correct status (Active/Inactive/etc)"
echo "  3. Event Edit - Program dropdown auto-populates correctly"
echo ""

# Verify PEM file exists
if [ ! -f "$PEM_PATH" ]; then
    echo -e "${RED}❌ PEM file not found: $PEM_PATH${NC}"
    exit 1
fi

# Verify build exists
if [ ! -d "./frontend/.next" ]; then
    echo -e "${RED}❌ Build not found. Run: cd frontend && npm run build${NC}"
    exit 1
fi

# Create build archive
echo -e "${BLUE}📦 Creating build archive...${NC}"
cd frontend
tar -czf ../.next-fixes-$TIMESTAMP.tar.gz .next
cd ..
echo -e "${GREEN}✅ Archive created: .next-fixes-$TIMESTAMP.tar.gz${NC}"
echo ""

# Upload to server
echo -e "${BLUE}⬆️  Uploading to production server...${NC}"
scp -i "$PEM_PATH" .next-fixes-$TIMESTAMP.tar.gz $SERVER:/tmp/
echo -e "${GREEN}✅ Upload complete${NC}"
echo ""

# Deploy on server
echo -e "${BLUE}🚀 Deploying on production server...${NC}"
ssh -i "$PEM_PATH" $SERVER << ENDSSH
set -e

TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
FRONTEND_DIR="/var/www/frontend"

echo "⏸️  Stopping PM2..."
pm2 stop qsights-frontend || true
sleep 2

echo "💾 Backing up current build..."
if [ -d "\$FRONTEND_DIR/.next" ]; then
    sudo mv "\$FRONTEND_DIR/.next" "\$FRONTEND_DIR/.next.backup.\$TIMESTAMP"
    echo "✅ Backup: .next.backup.\$TIMESTAMP"
else
    echo "⚠️  No existing build to backup"
fi

echo "📦 Extracting new build..."
cd /tmp
ARCHIVE=\$(ls -t .next-fixes-*.tar.gz | head -1)
sudo tar -xzf \$ARCHIVE -C \$FRONTEND_DIR/
sudo chown -R www-data:www-data \$FRONTEND_DIR/.next
sudo chmod -R 755 \$FRONTEND_DIR/.next

# Verify BUILD_ID exists
if [ -f "\$FRONTEND_DIR/.next/BUILD_ID" ]; then
    echo "✅ BUILD_ID verified"
else
    echo "⚠️  BUILD_ID missing - checking backup..."
    if [ -f "\$FRONTEND_DIR/.next.backup.\$TIMESTAMP/BUILD_ID" ]; then
        sudo cp "\$FRONTEND_DIR/.next.backup.\$TIMESTAMP/BUILD_ID" "\$FRONTEND_DIR/.next/"
        echo "✅ BUILD_ID restored from backup"
    fi
fi

echo "▶️  Restarting PM2..."
pm2 restart qsights-frontend
sleep 3

echo ""
echo "🔍 PM2 Status:"
pm2 list | grep qsights-frontend

echo ""
echo "📝 Recent logs (last 20 lines):"
pm2 logs qsights-frontend --lines 20 --nostream

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📍 Deployed to: \$FRONTEND_DIR"
echo "🔄 PM2 Process: qsights-frontend"
echo "🌐 URL: https://prod.qsights.com"
echo ""
echo "💡 Rollback if needed:"
echo "   sudo rm -rf \$FRONTEND_DIR/.next"
echo "   sudo mv \$FRONTEND_DIR/.next.backup.\$TIMESTAMP \$FRONTEND_DIR/.next"
echo "   pm2 restart qsights-frontend"
echo ""

# Cleanup old tmp files
rm -f /tmp/.next-fixes-*.tar.gz
ENDSSH

echo ""
echo -e "${GREEN}✅ PRODUCTION DEPLOYMENT COMPLETE!${NC}"
echo ""
echo -e "${BLUE}🌐 Test URLs:${NC}"
echo "   Main:     https://prod.qsights.com"
echo "   Programs: https://prod.qsights.com/programs"
echo "   Events:   https://prod.qsights.com/activities"
echo ""
echo -e "${BLUE}📊 Testing Steps:${NC}"
echo "   1. Login to production"
echo "   2. Go to Programs page"
echo "   3. Click Edit on 'The Strategic Time Drain Survey'"
echo "   4. ✓ Verify Start Date and End Date show correctly"
echo "   5. ✓ Verify Status shows 'Active' (not 'Draft')"
echo "   6. Go to Events/Activities"
echo "   7. Click Edit on 'The Strategic Time Drain Survey' event"
echo "   8. ✓ Verify Program dropdown shows 'The Strategic Time Drain Survey'"
echo ""

# Cleanup local archive
rm .next-fixes-$TIMESTAMP.tar.gz
echo -e "${GREEN}✅ Local cleanup complete${NC}"
