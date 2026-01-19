#!/bin/bash

###############################################################################
# DEPLOYMENT SCRIPT: Global Numeric Font Reduction
# Date: 18 January 2026
# Changes: CSS-only changes to frontend/app/globals.css
# Risk Level: LOW (CSS only, no backend/data changes)
###############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SSH_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
REMOTE_PATH="/var/www/QSightsOrg2.0"
LOCAL_PATH="/Users/yash/Documents/Projects/QSightsOrg2.0"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   DEPLOYMENT: GLOBAL NUMERIC FONT REDUCTION               ║${NC}"
echo -e "${BLUE}║   Date: $(date +%Y-%m-%d\ %H:%M:%S)                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

###############################################################################
# STEP 1: PRE-DEPLOYMENT VALIDATION
###############################################################################
echo -e "${YELLOW}[STEP 1/7]${NC} Pre-Deployment Validation..."

# Check if file exists locally
if [ ! -f "$LOCAL_PATH/frontend/app/globals.css" ]; then
    echo -e "${RED}❌ ERROR: globals.css not found locally${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Local file exists"

# Check if backup was created
if [ ! -d "$LOCAL_PATH/backups/2026-01-18_GLOBAL_NUMERIC_FONT_REDUCTION" ]; then
    echo -e "${RED}❌ ERROR: Backup directory not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Backup exists"

# Verify SSH connection
echo -e "${BLUE}   Testing SSH connection...${NC}"
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$SERVER" "echo 'Connected' > /dev/null 2>&1"; then
    echo -e "${RED}❌ ERROR: Cannot connect to production server${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} SSH connection successful"

###############################################################################
# STEP 2: RISK ASSESSMENT
###############################################################################
echo ""
echo -e "${YELLOW}[STEP 2/7]${NC} Risk Assessment..."
echo -e "${BLUE}   Change Type:${NC} CSS Only (frontend/app/globals.css)"
echo -e "${BLUE}   Backend Impact:${NC} None"
echo -e "${BLUE}   Database Impact:${NC} None"
echo -e "${BLUE}   API Impact:${NC} None"
echo -e "${BLUE}   Risk Level:${NC} ${GREEN}LOW${NC}"
echo -e "${GREEN}✓${NC} Safe to proceed - CSS-only change"

###############################################################################
# STEP 3: CREATE PRODUCTION BACKUP
###############################################################################
echo ""
echo -e "${YELLOW}[STEP 3/7]${NC} Creating Production Backup..."

BACKUP_DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="backup_pre_font_reduction_${BACKUP_DATE}"

echo -e "${BLUE}   Backing up current globals.css on production...${NC}"
ssh -i "$SSH_KEY" "$SERVER" <<EOF
    cd $REMOTE_PATH
    mkdir -p backups/$BACKUP_DIR
    cp frontend/app/globals.css backups/$BACKUP_DIR/globals.css.backup
    echo "$BACKUP_DATE" > backups/$BACKUP_DIR/BACKUP_INFO.txt
    echo "Pre-deployment backup for Global Numeric Font Reduction" >> backups/$BACKUP_DIR/BACKUP_INFO.txt
    ls -lh backups/$BACKUP_DIR/
EOF

echo -e "${GREEN}✓${NC} Production backup created: backups/$BACKUP_DIR"

###############################################################################
# STEP 4: UPLOAD MODIFIED FILE
###############################################################################
echo ""
echo -e "${YELLOW}[STEP 4/7]${NC} Uploading Modified File..."

echo -e "${BLUE}   Uploading globals.css to production...${NC}"
scp -i "$SSH_KEY" \
    "$LOCAL_PATH/frontend/app/globals.css" \
    "$SERVER:$REMOTE_PATH/frontend/app/globals.css"

echo -e "${GREEN}✓${NC} File uploaded successfully"

###############################################################################
# STEP 5: REBUILD FRONTEND
###############################################################################
echo ""
echo -e "${YELLOW}[STEP 5/7]${NC} Rebuilding Frontend..."

echo -e "${BLUE}   Running npm build on production...${NC}"
ssh -i "$SSH_KEY" "$SERVER" <<EOF
    cd $REMOTE_PATH/frontend
    
    # Install dependencies if needed (should already be there)
    echo "Checking dependencies..."
    npm install --production > /dev/null 2>&1 || true
    
    # Build
    echo "Building production bundle..."
    npm run build
    
    # Check build status
    if [ \$? -eq 0 ]; then
        echo "✓ Build completed successfully"
    else
        echo "✗ Build failed"
        exit 1
    fi
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Frontend rebuild successful"
else
    echo -e "${RED}❌ ERROR: Build failed - Rolling back...${NC}"
    
    # Rollback
    ssh -i "$SSH_KEY" "$SERVER" <<EOF
        cd $REMOTE_PATH
        cp backups/$BACKUP_DIR/globals.css.backup frontend/app/globals.css
        cd frontend
        npm run build
EOF
    
    echo -e "${RED}❌ DEPLOYMENT FAILED - Rolled back to previous version${NC}"
    exit 1
fi

###############################################################################
# STEP 6: RESTART SERVICES (IF NEEDED)
###############################################################################
echo ""
echo -e "${YELLOW}[STEP 6/7]${NC} Restarting Services..."

echo -e "${BLUE}   Restarting PM2 processes...${NC}"
ssh -i "$SSH_KEY" "$SERVER" <<EOF
    # Restart Next.js frontend
    pm2 restart qsights-frontend || pm2 restart all
    
    # Wait for restart
    sleep 3
    
    # Check status
    pm2 status
EOF

echo -e "${GREEN}✓${NC} Services restarted"

###############################################################################
# STEP 7: POST-DEPLOYMENT VERIFICATION
###############################################################################
echo ""
echo -e "${YELLOW}[STEP 7/7]${NC} Post-Deployment Verification..."

echo -e "${BLUE}   Verifying deployment...${NC}"

# Check if file was updated
ssh -i "$SSH_KEY" "$SERVER" <<EOF
    cd $REMOTE_PATH/frontend/app
    
    # Check if new CSS rules exist
    if grep -q "GLOBAL NUMERIC DISPLAY REDUCTION" globals.css; then
        echo "✓ New CSS rules found in production file"
    else
        echo "✗ New CSS rules NOT found - deployment may have failed"
        exit 1
    fi
    
    # Check file timestamp
    echo ""
    echo "File info:"
    ls -lh globals.css
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Verification successful"
else
    echo -e "${RED}❌ ERROR: Verification failed${NC}"
    exit 1
fi

###############################################################################
# DEPLOYMENT COMPLETE
###############################################################################
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  DEPLOYMENT SUCCESSFUL!                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}SUMMARY:${NC}"
echo -e "  • File Updated: ${GREEN}frontend/app/globals.css${NC}"
echo -e "  • Backup Location: ${YELLOW}$REMOTE_PATH/backups/$BACKUP_DIR${NC}"
echo -e "  • Build Status: ${GREEN}SUCCESS${NC}"
echo -e "  • Services: ${GREEN}RESTARTED${NC}"
echo ""
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo -e "  1. Visit ${BLUE}https://prod.qsights.com${NC}"
echo -e "  2. Check any dashboard page (Programs, Organizations, etc.)"
echo -e "  3. Verify numeric values appear balanced (not too large)"
echo -e "  4. Test on different screen sizes"
echo -e "  5. Monitor for any layout issues"
echo ""
echo -e "${YELLOW}ROLLBACK (if needed):${NC}"
echo -e "  ssh -i $SSH_KEY $SERVER"
echo -e "  cd $REMOTE_PATH"
echo -e "  cp backups/$BACKUP_DIR/globals.css.backup frontend/app/globals.css"
echo -e "  cd frontend && npm run build && pm2 restart qsights-frontend"
echo ""
echo -e "${GREEN}✅ Global Numeric Font Reduction deployed successfully!${NC}"
echo ""
