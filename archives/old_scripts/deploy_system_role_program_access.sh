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



# QSights System Role Program Access Enhancement Deployment
# Adds program-level access control and services display fix for system users
# Features:
# - Adds allowed_program_ids column to program_roles table
# - System users can now be restricted to specific programs
# - System users now display all assigned services correctly
# - UI for selecting "All Programs" or "Selected Programs"

set -e  # Exit on error

# Configuration
PEM="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
BACKEND_PATH="/var/www/QSightsOrg2.0/backend"
FRONTEND_PATH="/var/www/frontend"
LOCAL_BACKEND="/Users/yash/Documents/Projects/QSightsOrg2.0/backend"
LOCAL_FRONTEND="/Users/yash/Documents/Projects/QSightsOrg2.0/frontend"

echo "🚀 System Role Program Access Enhancement Deployment"
echo "===================================================="
echo ""
echo "⚠️  DEPLOYING TO PRODUCTION: $SERVER"
echo ""
echo "📦 Files to deploy:"
echo ""
echo "BACKEND:"
echo "  1. NEW: database/migrations/2026_02_05_000001_add_allowed_program_ids_to_program_roles.php"
echo "  2. UPDATED: app/Http/Controllers/Api/AuthController.php (services display fix)"
echo "  3. UPDATED: app/Http/Controllers/Api/ProgramRoleController.php (CRUD operations)"
echo "  4. UPDATED: app/Models/ProgramRole.php (model fields)"
echo ""
echo "FRONTEND:"
echo "  5. UPDATED: app/program-admin/roles/page.tsx (Program Access UI)"
echo ""
echo "🔧 Changes:"
echo "  • System users can now be assigned to All Programs or Selected Programs"
echo "  • System users will see all assigned services correctly (not just Dashboard)"
echo "  • New 'Program Access' section in System Roles creation/edit modal"
echo "  • Backward compatible: Existing system users default to All Programs"
echo ""
read -p "Proceed with deployment? (yes/no): " proceed
if [ "$proceed" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "📋 Step 1: Creating backups on server..."
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)_system_role_program_access"
ssh -i "$PEM" "$SERVER" "cd $BACKEND_PATH && \
    sudo mkdir -p $BACKUP_DIR && \
    sudo cp app/Http/Controllers/Api/AuthController.php $BACKUP_DIR/ 2>/dev/null || true && \
    sudo cp app/Http/Controllers/Api/ProgramRoleController.php $BACKUP_DIR/ 2>/dev/null || true && \
    sudo cp app/Models/ProgramRole.php $BACKUP_DIR/ 2>/dev/null || true && \
    echo '✅ Backend backup created'"

echo ""
echo "📋 Step 2: Deploying migration..."
scp -i "$PEM" "$LOCAL_BACKEND/database/migrations/2026_02_05_000001_add_allowed_program_ids_to_program_roles.php" "$SERVER:/tmp/"
ssh -i "$PEM" "$SERVER" "sudo mv /tmp/2026_02_05_000001_add_allowed_program_ids_to_program_roles.php $BACKEND_PATH/database/migrations/ && \
    sudo chown www-data:www-data $BACKEND_PATH/database/migrations/2026_02_05_000001_add_allowed_program_ids_to_program_roles.php"
echo "✅ Migration deployed"

echo ""
echo "📋 Step 3: Running migration..."
ssh -i "$PEM" "$SERVER" "cd $BACKEND_PATH && \
    sudo -u www-data php artisan migrate --path=database/migrations/2026_02_05_000001_add_allowed_program_ids_to_program_roles.php --force"
echo "✅ Migration completed"

echo ""
echo "📋 Step 4: Deploying AuthController..."
scp -i "$PEM" "$LOCAL_BACKEND/app/Http/Controllers/Api/AuthController.php" "$SERVER:/tmp/"
ssh -i "$PEM" "$SERVER" "sudo mv /tmp/AuthController.php $BACKEND_PATH/app/Http/Controllers/Api/ && \
    sudo chown www-data:www-data $BACKEND_PATH/app/Http/Controllers/Api/AuthController.php"
echo "✅ AuthController deployed"

echo ""
echo "📋 Step 5: Deploying ProgramRoleController..."
scp -i "$PEM" "$LOCAL_BACKEND/app/Http/Controllers/Api/ProgramRoleController.php" "$SERVER:/tmp/"
ssh -i "$PEM" "$SERVER" "sudo mv /tmp/ProgramRoleController.php $BACKEND_PATH/app/Http/Controllers/Api/ && \
    sudo chown www-data:www-data $BACKEND_PATH/app/Http/Controllers/Api/ProgramRoleController.php"
echo "✅ ProgramRoleController deployed"

echo ""
echo "📋 Step 6: Deploying ProgramRole model..."
scp -i "$PEM" "$LOCAL_BACKEND/app/Models/ProgramRole.php" "$SERVER:/tmp/"
ssh -i "$PEM" "$SERVER" "sudo mv /tmp/ProgramRole.php $BACKEND_PATH/app/Models/ && \
    sudo chown www-data:www-data $BACKEND_PATH/app/Models/ProgramRole.php"
echo "✅ ProgramRole model deployed"

echo ""
echo "📋 Step 7: Clearing Laravel caches..."
ssh -i "$PEM" "$SERVER" "cd $BACKEND_PATH && \
    sudo -u www-data php artisan config:clear && \
    sudo -u www-data php artisan cache:clear && \
    sudo -u www-data php artisan route:clear && \
    sudo -u www-data php artisan view:clear"
echo "✅ Backend caches cleared"

echo ""
echo "📋 Step 8: Deploying frontend changes..."
echo "  Building frontend locally first..."
cd "$LOCAL_FRONTEND"
npm run build
echo "✅ Frontend build complete"

echo ""
echo "  Transferring build to server..."
ssh -i "$PEM" "$SERVER" "sudo systemctl stop frontend.service"
scp -i "$PEM" -r "$LOCAL_FRONTEND/.next" "$SERVER:/tmp/"
ssh -i "$PEM" "$SERVER" "cd $FRONTEND_PATH && \
    sudo rm -rf .next && \
    sudo mv /tmp/.next . && \
    sudo chown -R www-data:www-data .next && \
    sudo systemctl start frontend.service"
echo "✅ Frontend deployed and restarted"

echo ""
echo "📋 Step 9: Verifying deployment..."
echo ""
echo "Backend checks:"
ssh -i "$PEM" "$SERVER" "cd $BACKEND_PATH && \
    echo '  ✓ Migration file exists' && \
    ls -lh database/migrations/2026_02_05_000001_add_allowed_program_ids_to_program_roles.php && \
    echo '  ✓ AuthController updated' && \
    grep -q 'allowedProgramIds' app/Http/Controllers/Api/AuthController.php && \
    echo '  ✓ ProgramRoleController updated' && \
    grep -q 'allowed_program_ids' app/Http/Controllers/Api/ProgramRoleController.php && \
    echo '  ✓ ProgramRole model updated' && \
    grep -q 'allowed_program_ids' app/Models/ProgramRole.php"

echo ""
echo "Frontend checks:"
ssh -i "$PEM" "$SERVER" "systemctl is-active frontend.service && echo '  ✓ Frontend service running'"

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📝 Summary:"
echo "  • Database migration applied: allowed_program_ids column added"
echo "  • Existing system users default to All Programs access (NULL)"
echo "  • Backend updated to handle program access control"
echo "  • Frontend updated with Program Access UI"
echo ""
echo "🧪 Testing Steps:"
echo "  1. Login as Super Admin"
echo "  2. Go to Roles & Services > System Roles tab"
echo "  3. Create a new system user:"
echo "     - Select 'All Programs' or 'Selected Programs'"
echo "     - Select multiple services"
echo "     - Save and verify"
echo "  4. Login as the newly created system user"
echo "  5. Verify all selected services appear in the sidebar"
echo "  6. If 'Selected Programs' was chosen, verify filtered data"
echo "  7. Edit an existing system user:"
echo "     - Should default to 'All Programs' (backward compatible)"
echo "     - Change to 'Selected Programs' and test filtering"
echo ""
echo "🔍 Rollback Instructions (if needed):"
echo "  Backend:"
echo "    ssh -i \"$PEM\" \"$SERVER\""
echo "    cd $BACKEND_PATH"
echo "    sudo cp $BACKUP_DIR/* app/Http/Controllers/Api/ || true"
echo "    sudo cp $BACKUP_DIR/ProgramRole.php app/Models/ || true"
echo "    sudo -u www-data php artisan migrate:rollback --step=1"
echo ""
echo "  Frontend:"
echo "    (Rebuild and redeploy previous version)"
echo ""
