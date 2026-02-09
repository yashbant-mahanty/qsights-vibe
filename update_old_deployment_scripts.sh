#!/bin/bash

###############################################################################
# Add Deprecation Warnings to Old Deployment Scripts
# 
# This script adds warnings to old deployment scripts directing users
# to the new Pre-Prod → Production workflow
###############################################################################

# Colors
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "Adding deprecation warnings to old deployment scripts..."
echo ""

# List of old deployment scripts to update (excluding new workflow scripts)
OLD_SCRIPTS=(
    "deploy_reminder_feature.sh"
    "deploy_frontend_complete.sh"
    "deploy_new_joinee_fix_feb_07_2026.sh"
    "deploy_system_role_program_access.sh"
    "deploy_role_services_fix_production.sh"
    "deploy_critical_fixes_feb_06_2026_ssh.sh"
    "deploy_role_system.sh"
    "deploy_evaluation_enhancements.sh"
    "deploy_evaluation_admin_fix.sh"
    "deploy_subordinate_selection.sh"
    "deploy_system_role_services_fix.sh"
    "deploy_evaluation_fixes_feb_05_2026.sh"
    "deploy_evaluation_fix.sh"
    "deploy_critical_fixes_feb_06_2026.sh"
    "deploy_critical_fixes_production.sh"
)

# Deprecation warning to add
DEPRECATION_WARNING='#!/bin/bash

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

'

COUNT=0

for SCRIPT in "${OLD_SCRIPTS[@]}"; do
    if [ -f "$SCRIPT" ]; then
        # Check if warning already added
        if ! grep -q "DEPRECATION WARNING" "$SCRIPT"; then
            # Create backup
            cp "$SCRIPT" "${SCRIPT}.backup"
            
            # Get original content (skip shebang if exists)
            ORIGINAL_CONTENT=$(tail -n +2 "$SCRIPT")
            
            # Write new file with warning
            echo "$DEPRECATION_WARNING" > "$SCRIPT"
            echo "$ORIGINAL_CONTENT" >> "$SCRIPT"
            
            # Make executable
            chmod +x "$SCRIPT"
            
            echo -e "${GREEN}✅ Updated: $SCRIPT${NC}"
            COUNT=$((COUNT + 1))
        else
            echo -e "${YELLOW}⏭️  Skipped (already updated): $SCRIPT${NC}"
        fi
    else
        echo -e "${YELLOW}⏭️  Not found: $SCRIPT${NC}"
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}Deprecation warnings added to $COUNT scripts${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Backups created with .backup extension"
echo ""
echo "Users running old scripts will now see:"
echo "  - Deprecation warning"
echo "  - Instructions for new workflow"
echo "  - Option to continue with old script or cancel"
echo ""
