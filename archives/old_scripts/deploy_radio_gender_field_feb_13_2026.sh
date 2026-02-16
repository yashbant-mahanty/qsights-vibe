#!/bin/bash

###############################################################################
# Radio Button & Gender Field Feature Deployment - February 13, 2026
# 
# FEATURE: Add Radio Button field type and Gender predefined field
# FILES:
#   - frontend/components/registration-form-builder.tsx
#   - frontend/take_page.tsx
#   - frontend/src/components/notifications/ActivityParticipantsAndNotifications.jsx
#
# PRODUCTION PATHS:
#   Frontend: /var/www/frontend
#   Backend:  /var/www/QSightsOrg2.0/backend
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
echo -e "${BLUE}  Radio Button & Gender Field Deployment - Feb 13, 2026  ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Verify PEM file
if [ ! -f "$PEM_KEY" ]; then
    echo -e "${RED}✗ PEM key not found at $PEM_KEY${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PEM key found${NC}"

# Verify local files exist
echo -e "${BLUE}Verifying modified files...${NC}"
FILES_TO_CHECK=(
    "$LOCAL_FRONTEND/components/registration-form-builder.tsx"
    "$LOCAL_FRONTEND/take_page.tsx"
    "$LOCAL_FRONTEND/src/components/notifications/ActivityParticipantsAndNotifications.jsx"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}✗ File not found: $file${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Found: $(basename $file)${NC}"
done
echo ""

# Check BUILD_ID
if [ ! -f "$LOCAL_FRONTEND/.next/BUILD_ID" ]; then
    echo -e "${YELLOW}⚠ No BUILD_ID found. Need to build first.${NC}"
    read -p "Build now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Building frontend...${NC}"
        cd "$LOCAL_FRONTEND"
        npm run build
        if [ $? -ne 0 ]; then
            echo -e "${RED}✗ Build failed${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ Build complete${NC}"
    else
        echo -e "${RED}Deployment cancelled - build required${NC}"
        exit 0
    fi
fi

BUILD_ID=$(cat "$LOCAL_FRONTEND/.next/BUILD_ID" 2>/dev/null || echo "unknown")
echo -e "${GREEN}✓ Frontend build ready (BUILD_ID: $BUILD_ID)${NC}"
echo ""

# Feature description
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}FEATURE DETAILS:${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""
echo "✨ NEW FIELD TYPES:"
echo "   • Radio Button - Custom radio button field type"
echo "   • Gender - Predefined field with Male/Female options"
echo ""
echo "📝 CHANGES:"
echo "   • registration-form-builder.tsx - Added radio & gender types"
echo "   • take_page.tsx - Added radio button rendering"
echo "   • ActivityParticipantsAndNotifications.jsx - Support all field types"
echo ""
echo "🎯 WHAT USERS GET:"
echo "   • Radio button option in field picker (purple icon)"
echo "   • Gender field option in field picker (pink icon)"
echo "   • Pre-populated Male/Female options for Gender"
echo "   • Proper rendering in registration forms"
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""

# Confirmation
read -p "Deploy to PRODUCTION? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}     STARTING DEPLOYMENT                   ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

# Step 1: Backup current frontend
echo -e "${BLUE}[1/5] Creating backup of current frontend...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    if [ -d /var/www/frontend/.next ]; then
        sudo rm -rf /var/www/frontend/.next.backup_$TIMESTAMP 2>/dev/null || true
        sudo cp -r /var/www/frontend/.next /var/www/frontend/.next.backup_$TIMESTAMP
        echo "✓ Backup created: /var/www/frontend/.next.backup_$TIMESTAMP"
    else
        echo "⚠ No existing .next directory to backup"
    fi
EOF
echo -e "${GREEN}✓ Backup complete${NC}"
echo ""

# Step 2: Stop PM2
echo -e "${BLUE}[2/5] Stopping PM2 frontend process...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
    sudo pm2 stop qsights-frontend || true
    sleep 2
    PM2_STATUS=$(sudo pm2 list | grep qsights-frontend | awk '{print $10}')
    if [ "$PM2_STATUS" == "stopped" ] || [ "$PM2_STATUS" == "stopping" ]; then
        echo "✓ PM2 frontend stopped"
    else
        echo "⚠ PM2 status: $PM2_STATUS"
    fi
EOF
echo -e "${GREEN}✓ PM2 stopped${NC}"
echo ""

# Step 3: Deploy files
echo -e "${BLUE}[3/5] Deploying frontend build...${NC}"
echo "Syncing .next directory (this may take 1-2 minutes)..."

# Use rsync for efficient file transfer
rsync -avz --delete \
    -e "ssh -i $PEM_KEY" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --progress \
    "$LOCAL_FRONTEND/.next/" \
    "$SERVER_USER@$SERVER_IP:/tmp/frontend-next-deploy/"

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ rsync failed${NC}"
    exit 1
fi

# Move files with sudo on server
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
    # Remove old .next
    sudo rm -rf /var/www/frontend/.next
    
    # Move new build
    sudo mv /tmp/frontend-next-deploy /var/www/frontend/.next
    
    # Set permissions
    sudo chown -R www-data:www-data /var/www/frontend/.next
    sudo chmod -R 755 /var/www/frontend/.next
    
    # Verify BUILD_ID
    if [ -f /var/www/frontend/.next/BUILD_ID ]; then
        BUILD_ID=$(cat /var/www/frontend/.next/BUILD_ID)
        echo "✓ BUILD_ID: $BUILD_ID"
    else
        echo "⚠ WARNING: BUILD_ID not found!"
        exit 1
    fi
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Deployment failed${NC}"
    echo -e "${YELLOW}Restoring backup...${NC}"
    ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "sudo cp -r /var/www/frontend/.next.backup_* /var/www/frontend/.next 2>/dev/null || true"
    exit 1
fi

echo -e "${GREEN}✓ Frontend deployed${NC}"
echo ""

# Step 4: Restart PM2
echo -e "${BLUE}[4/5] Restarting PM2 frontend...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
    # Restart frontend
    sudo pm2 restart qsights-frontend
    
    # Wait for startup
    sleep 5
    
    # Check status
    PM2_STATUS=$(sudo pm2 list | grep qsights-frontend | awk '{print $10}')
    if [ "$PM2_STATUS" == "online" ]; then
        echo "✓ PM2 frontend online"
    else
        echo "✗ PM2 frontend status: $PM2_STATUS"
        exit 1
    fi
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ PM2 restart failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ PM2 restarted successfully${NC}"
echo ""

# Step 5: Verification
echo -e "${BLUE}[5/5] Verifying deployment...${NC}"

# Check PM2 status
echo "Checking PM2 status..."
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "sudo pm2 status | grep qsights"

# Check production HTTP status
echo ""
echo "Checking production HTTP status..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://app.qsights.in)
if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ Production site responding (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${YELLOW}⚠ Production site HTTP code: $HTTP_CODE${NC}"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}     DEPLOYMENT SUCCESSFUL!                ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📋 POST-DEPLOYMENT CHECKLIST:${NC}"
echo ""
echo "1. Open browser: https://app.qsights.in"
echo "2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo "3. Open DevTools Console (F12) - check for errors"
echo "4. Test the feature:"
echo "   - Go to Activities → Create Event"
echo "   - Scroll to 'Participant Registration Form'"
echo "   - Click 'Add Field'"
echo "   - Verify 'Radio Button' option appears (purple icon)"
echo "   - Verify 'Gender' option appears (pink icon)"
echo "   - Add Gender field and check Male/Female options"
echo "5. Test form rendering:"
echo "   - Create a test event with Gender field"
echo "   - Open preview link"
echo "   - Verify radio buttons display correctly"
echo ""
echo -e "${BLUE}🔄 ROLLBACK if needed:${NC}"
echo "ssh -i $PEM_KEY $SERVER_USER@$SERVER_IP"
echo "sudo cp -r /var/www/frontend/.next.backup_* /var/www/frontend/.next"
echo "sudo pm2 restart qsights-frontend"
echo ""
echo -e "${GREEN}✅ Deployment completed at $(date)${NC}"
echo ""
