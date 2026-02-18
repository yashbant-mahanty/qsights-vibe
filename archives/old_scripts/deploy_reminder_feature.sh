#!/bin/bash

###############################################################################
# ⚠️  DEPRECATION WARNING ⚠️
#
# This script uses the OLD deployment workflow.
#
# NEW MANDATORY WORKFLOW (as of Feb 7, 2026):
#   1. Deploy to Pre-Prod first: ./deploy_backend_preprod.sh
#   2. Test on Pre-Prod for 24+ hours
#   3. Then deploy to Production: ./deploy_backend_prod.sh
#
# This script is kept for reference only.
# For new deployments, use the new workflow scripts.
#
# Documentation:
#   - DEPLOYMENT_CHECKLIST.md
#   - DEPLOYMENT_WORKFLOW_GUIDE.md
#   - DEPLOYMENT_QUICK_REFERENCE.md
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "⚠️  DEPRECATION WARNING"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "This script uses the OLD deployment workflow."
echo ""
echo "NEW MANDATORY WORKFLOW (as of Feb 7, 2026):"
echo "  1. Deploy to Pre-Prod: ./deploy_backend_preprod.sh or ./deploy_frontend_preprod.sh"
echo "  2. Test for 24+ hours"
echo "  3. Deploy to Production: ./deploy_backend_prod.sh or ./deploy_frontend_prod.sh"
echo ""
echo "Read: DEPLOYMENT_QUICK_REFERENCE.md for quick guide"
echo ""
read -p "Do you want to continue with this OLD script? (yes/no): " CONTINUE

if [ "$CONTINUE" != "yes" ]; then
    echo "Deployment cancelled. Please use new workflow scripts."
    exit 0
fi

echo ""
echo "Proceeding with OLD deployment script..."
echo ""
sleep 2

###############################################################################
# Original script continues below
###############################################################################



# Deploy Set Reminder Feature Update
# February 4, 2026

set -e

PEM_FILE="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "=========================================="
echo "Set Reminder Feature Deployment"
echo "Timestamp: $TIMESTAMP"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${YELLOW}📦 Step 1: Copying files to server...${NC}"

# Copy Program Manager
echo "  → Program Manager dashboard..."
scp -i "$PEM_FILE" \
  frontend/app/program-manager/page.tsx \
  "$SERVER:/tmp/program-manager-page.tsx"

# Copy Program Admin
echo "  → Program Admin dashboard..."
scp -i "$PEM_FILE" \
  frontend/app/program-admin/page.tsx \
  "$SERVER:/tmp/program-admin-page.tsx"

# Copy SharedDashboardContent
echo "  → Shared Dashboard Content..."
scp -i "$PEM_FILE" \
  frontend/components/shared/SharedDashboardContent.tsx \
  "$SERVER:/tmp/SharedDashboardContent.tsx"

echo -e "${GREEN}✅ Files copied successfully${NC}"

echo ""
echo -e "${YELLOW}🔄 Step 2: Creating backups on server...${NC}"

ssh -i "$PEM_FILE" "$SERVER" << 'EOF'
  # Backup Program Manager
  sudo cp /var/www/frontend/app/program-manager/page.tsx \
    /var/www/frontend/app/program-manager/page.tsx.backup-$(date +%Y%m%d-%H%M%S)
  
  # Backup Program Admin
  sudo cp /var/www/frontend/app/program-admin/page.tsx \
    /var/www/frontend/app/program-admin/page.tsx.backup-$(date +%Y%m%d-%H%M%S)
  
  # Backup SharedDashboardContent
  sudo cp /var/www/frontend/components/shared/SharedDashboardContent.tsx \
    /var/www/frontend/components/shared/SharedDashboardContent.tsx.backup-$(date +%Y%m%d-%H%M%S)
  
  echo "✅ Backups created"
EOF

echo -e "${GREEN}✅ Backups created${NC}"

echo ""
echo -e "${YELLOW}🚀 Step 3: Deploying files...${NC}"

ssh -i "$PEM_FILE" "$SERVER" << 'EOF'
  # Deploy Program Manager
  sudo mv /tmp/program-manager-page.tsx /var/www/frontend/app/program-manager/page.tsx
  sudo chown www-data:www-data /var/www/frontend/app/program-manager/page.tsx
  
  # Deploy Program Admin
  sudo mv /tmp/program-admin-page.tsx /var/www/frontend/app/program-admin/page.tsx
  sudo chown www-data:www-data /var/www/frontend/app/program-admin/page.tsx
  
  # Deploy SharedDashboardContent
  sudo mv /tmp/SharedDashboardContent.tsx /var/www/frontend/components/shared/SharedDashboardContent.tsx
  sudo chown www-data:www-data /var/www/frontend/components/shared/SharedDashboardContent.tsx
  
  echo "✅ Files deployed"
EOF

echo -e "${GREEN}✅ Files deployed successfully${NC}"

echo ""
echo -e "${YELLOW}⏳ Step 4: Waiting for PM2 to detect changes (30 seconds)...${NC}"
sleep 30

echo ""
echo -e "${YELLOW}📊 Step 5: Checking application status...${NC}"

ssh -i "$PEM_FILE" "$SERVER" << 'EOF'
  echo "=== PM2 Status ==="
  pm2 list | grep qsights-frontend
  
  echo ""
  echo "=== Recent Logs ==="
  pm2 logs qsights-frontend --lines 10 --nostream
EOF

echo ""
echo -e "${YELLOW}🔍 Step 6: Verifying deployment...${NC}"

ssh -i "$PEM_FILE" "$SERVER" << 'EOF'
  # Check if files exist and have correct ownership
  echo "Checking Program Manager..."
  ls -lh /var/www/frontend/app/program-manager/page.tsx | tail -1
  
  echo "Checking Program Admin..."
  ls -lh /var/www/frontend/app/program-admin/page.tsx | tail -1
  
  echo "Checking SharedDashboardContent..."
  ls -lh /var/www/frontend/components/shared/SharedDashboardContent.tsx | tail -1
  
  # Check if "Set Reminder" appears in the files
  echo ""
  echo "Verifying 'Set Reminder' text..."
  if grep -q "Set Reminder" /var/www/frontend/app/program-manager/page.tsx; then
    echo "✅ Program Manager: 'Set Reminder' found"
  else
    echo "❌ Program Manager: 'Set Reminder' NOT found"
  fi
  
  if grep -q "Set Reminder" /var/www/frontend/app/program-admin/page.tsx; then
    echo "✅ Program Admin: 'Set Reminder' found"
  else
    echo "❌ Program Admin: 'Set Reminder' NOT found"
  fi
  
  if grep -q "Set Reminder" /var/www/frontend/components/shared/SharedDashboardContent.tsx; then
    echo "✅ SharedDashboardContent: 'Set Reminder' found"
  else
    echo "❌ SharedDashboardContent: 'Set Reminder' NOT found"
  fi
EOF

echo ""
echo -e "${GREEN}=========================================="
echo "✅ Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Test the reminder functionality at:"
echo "   - https://prod.qsights.com (Program Manager)"
echo "   - https://prod.qsights.com (Program Admin)"
echo ""
echo "2. Verify the button text shows 'Set Reminder'"
echo "3. Click the button and test the calendar integration"
echo ""
echo "To rollback if needed:"
echo "  ssh -i $PEM_FILE $SERVER"
echo "  cd /var/www/frontend/app/program-manager && sudo cp page.tsx.backup-* page.tsx"
echo "  cd /var/www/frontend/app/program-admin && sudo cp page.tsx.backup-* page.tsx"
echo "  cd /var/www/frontend/components/shared && sudo cp SharedDashboardContent.tsx.backup-* SharedDashboardContent.tsx"
echo ""
