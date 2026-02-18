#!/bin/bash

###############################################################################
# QSights Production Deployment - Matrix Export Feature
# Direct deployment (preprod bypassed per user request)
# Date: February 18, 2026
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
LOCAL_FRONTEND_PATH="$(pwd)/frontend"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Matrix Question Export Enhancement - Production         ║${NC}"
echo -e "${BLUE}║     Feature: Per-question Excel/CSV export with matrix      ║${NC}"
echo -e "${BLUE}║     flattening support                                       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Pre-flight checks
echo -e "${YELLOW}[1/11] Pre-flight Checks${NC}"

if [ ! -f "$PEM_KEY" ]; then
    echo -e "${RED}✗ PEM key not found at $PEM_KEY${NC}"
    exit 1
fi

if [ ! -d "$LOCAL_FRONTEND_PATH" ]; then
    echo -e "${RED}✗ Local frontend directory not found${NC}"
    exit 1
fi

# Check that the modified file exists
if [ ! -f "$LOCAL_FRONTEND_PATH/app/activities/[id]/results/page.tsx" ]; then
    echo -e "${RED}✗ Modified file not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ PEM key found${NC}"
echo -e "${GREEN}✓ Local frontend directory found${NC}"
echo -e "${GREEN}✓ Modified results page found${NC}"
echo ""

# Build for production
echo -e "${YELLOW}[2/11] Building Frontend for Production${NC}"
cd "$LOCAL_FRONTEND_PATH"

# Set Production environment variables
export NEXT_PUBLIC_API_URL="https://prod.qsights.com/api"
export NEXT_PUBLIC_APP_URL="https://prod.qsights.com"
export NODE_ENV="production"

echo "Installing dependencies..."
npm install --legacy-peer-deps

echo "Running production build..."
npm run build

if [ ! -d ".next" ]; then
    echo -e "${RED}✗ Build failed - .next directory not found${NC}"
    exit 1
fi

BUILD_ID=$(cat .next/BUILD_ID 2>/dev/null || echo "unknown")
echo -e "${GREEN}✓ Production build completed${NC}"
echo -e "${BLUE}BUILD_ID: $BUILD_ID${NC}"
cd ..
echo ""

# Create backup on production
echo -e "${YELLOW}[3/11] Creating Production Backup${NC}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    sudo mkdir -p /home/ubuntu/backups/production
    if [ -d $FRONTEND_PATH/.next ]; then
        sudo tar -czf /home/ubuntu/backups/production/frontend_${TIMESTAMP}.tar.gz \
            -C $FRONTEND_PATH .next package.json package-lock.json
        sudo chown ubuntu:ubuntu /home/ubuntu/backups/production/frontend_${TIMESTAMP}.tar.gz
        ls -lh /home/ubuntu/backups/production/frontend_${TIMESTAMP}.tar.gz
        echo 'Backup created successfully'
    else
        echo 'Warning: .next directory not found on production, skipping backup'
    fi
"
echo -e "${GREEN}✓ Production backup created: frontend_${TIMESTAMP}.tar.gz${NC}"
echo ""

# Create deployment package
echo -e "${YELLOW}[4/11] Creating Deployment Package${NC}"
cd "$LOCAL_FRONTEND_PATH"
tar -czf /tmp/frontend_matrix_export_deploy.tar.gz \
    app/activities/\[id\]/results/page.tsx \
    .next \
    package.json \
    package-lock.json
PACKAGE_SIZE=$(du -h /tmp/frontend_matrix_export_deploy.tar.gz | cut -f1)
echo -e "${BLUE}Package size: $PACKAGE_SIZE${NC}"
cd ..
echo -e "${GREEN}✓ Package created${NC}"
echo ""

# Upload to server
echo -e "${YELLOW}[5/11] Uploading to Production Server${NC}"
scp -i "$PEM_KEY" /tmp/frontend_matrix_export_deploy.tar.gz "$SERVER_USER@$SERVER_IP:/tmp/"
rm /tmp/frontend_matrix_export_deploy.tar.gz
echo -e "${GREEN}✓ Package uploaded${NC}"
echo ""

# Check PM2 status before stopping
echo -e "${YELLOW}[6/11] Checking PM2 Status${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    echo 'Current PM2 status:'
    pm2 list | grep qsights-frontend || echo 'qsights-frontend not found in PM2'
"
echo ""

# Stop PM2
echo -e "${YELLOW}[7/11] Stopping PM2 Process${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    pm2 stop qsights-frontend 2>/dev/null || echo 'PM2 process already stopped or not found'
    sleep 2
"
echo -e "${GREEN}✓ PM2 stopped${NC}"
echo ""

# Extract files
echo -e "${YELLOW}[8/11] Extracting Files to Production${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $FRONTEND_PATH
    
    # Extract the package
    echo 'Extracting deployment package...'
    sudo tar -xzf /tmp/frontend_matrix_export_deploy.tar.gz
    
    # Set correct ownership
    echo 'Setting ownership...'
    sudo chown -R www-data:www-data .next package.json package-lock.json app
    
    # Clean up
    sudo rm /tmp/frontend_matrix_export_deploy.tar.gz
    
    # Verify BUILD_ID
    if [ -f .next/BUILD_ID ]; then
        echo 'Deployed BUILD_ID:'
        cat .next/BUILD_ID
    else
        echo 'Warning: BUILD_ID file not found'
    fi
    
    # Verify the modified file is in place
    if [ -f app/activities/\[id\]/results/page.tsx ]; then
        echo '✓ Results page file deployed successfully'
        wc -l app/activities/\[id\]/results/page.tsx
    else
        echo '✗ Warning: Results page file not found after extraction'
    fi
"
echo -e "${GREEN}✓ Files extracted and verified${NC}"
echo ""

# Restart PM2
echo -e "${YELLOW}[9/11] Restarting PM2${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $FRONTEND_PATH
    pm2 restart qsights-frontend || pm2 start npm --name qsights-frontend -- start
    pm2 save
    sleep 5
    echo 'PM2 status after restart:'
    pm2 list | grep qsights-frontend
    echo ''
    echo 'PM2 logs (last 10 lines):'
    pm2 logs qsights-frontend --lines 10 --nostream
"
echo -e "${GREEN}✓ PM2 restarted${NC}"
echo ""

# Wait for stabilization
echo -e "${YELLOW}[10/11] Waiting for Application to Stabilize${NC}"
echo "Waiting 15 seconds for app to fully start..."
sleep 15
echo -e "${GREEN}✓ Stabilization period completed${NC}"
echo ""

# Health check
echo -e "${YELLOW}[11/11] Production Health Check${NC}"

# Check HTTP status
echo "Checking production HTTP status..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://prod.qsights.com 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Production health check passed (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}⚠️  Health check returned HTTP $HTTP_CODE${NC}"
    echo -e "${YELLOW}Please verify production status immediately${NC}"
fi

# Verify BUILD_ID
echo "Checking BUILD_ID consistency..."
SERVED_BUILD=$(curl -s https://prod.qsights.com 2>/dev/null | grep -o '"buildId":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
if [ -n "$SERVED_BUILD" ]; then
    if [ "$SERVED_BUILD" = "$BUILD_ID" ]; then
        echo -e "${GREEN}✓ Correct BUILD_ID being served: $BUILD_ID${NC}"
    else
        echo -e "${YELLOW}⚠️  BUILD_ID mismatch - Deployed: $BUILD_ID, Served: $SERVED_BUILD${NC}"
        echo -e "${YELLOW}   This may resolve after cache clears${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Could not verify BUILD_ID from response${NC}"
fi
echo ""

# Success
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         PRODUCTION DEPLOYMENT COMPLETED                      ║${NC}"
echo -e "${GREEN}║         Feature: Matrix Export Enhancement                   ║${NC}"
echo -e "${GREEN}║         BUILD_ID: $BUILD_ID                                  ║${NC}"
echo -e "${GREEN}║         Server: 13.126.210.220                               ║${NC}"
echo -e "${GREEN}║         Timestamp: $TIMESTAMP                                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Testing Instructions:${NC}"
echo -e "1. ${YELLOW}Access:${NC} https://prod.qsights.com"
echo -e "2. ${YELLOW}Login and navigate to:${NC} Aflibercept Global Survey (a10e6beb)"
echo -e "3. ${YELLOW}Go to:${NC} Event Results > Question-wise Analysis"
echo -e "4. ${YELLOW}Look for:${NC} Excel and CSV export buttons on each question card"
echo -e "5. ${YELLOW}Test matrix question:${NC} Click export and verify columns are flattened"
echo -e "   (e.g., Q3_Service, Q3_Quality, Q3_Price as separate columns)"
echo ""
echo -e "${BLUE}Post-Deployment Verification:${NC}"
echo -e "✓ Hard refresh browser: ${YELLOW}Ctrl+Shift+R${NC} (or Cmd+Shift+R on Mac)"
echo -e "✓ Open Developer Console (F12) and check for errors"
echo -e "✓ Export a matrix question and verify column structure"
echo -e "✓ Export a non-matrix question and verify format"
echo -e "✓ Test on mobile if possible"
echo ""
echo -e "${MAGENTA}Rollback Information:${NC}"
echo -e "Backup: ${BLUE}/home/ubuntu/backups/production/frontend_${TIMESTAMP}.tar.gz${NC}"
echo ""
echo -e "To rollback if needed:"
echo -e "${BLUE}ssh -i $PEM_KEY $SERVER_USER@$SERVER_IP${NC}"
echo -e "${BLUE}cd $FRONTEND_PATH${NC}"
echo -e "${BLUE}sudo tar -xzf /home/ubuntu/backups/production/frontend_${TIMESTAMP}.tar.gz${NC}"
echo -e "${BLUE}sudo chown -R www-data:www-data .next package.json${NC}"
echo -e "${BLUE}pm2 restart qsights-frontend${NC}"
echo ""
echo -e "${GREEN}✓ Deployment complete! Please verify the feature on production.${NC}"
echo ""
