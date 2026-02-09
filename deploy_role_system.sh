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



# QSights Role System Deployment Script
# Date: 2026-02-01
# CRITICAL: This deploys Evaluation Admin & Permission System

set -e  # Exit on error

# Configuration
PEM="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
BACKEND_PATH="/var/www/QSightsOrg2.0/backend"
LOCAL_BACKEND="/Users/yash/Documents/Projects/QSightsOrg2.0/backend"

echo "🚀 QSights Role System Deployment"
echo "=================================="
echo ""
echo "⚠️  DEPLOYING TO PRODUCTION: $SERVER"
echo "⚠️  This will add Evaluation Admin role + Permission System"
echo ""
read -p "Have you read CRITICAL_RULES.md? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Please read CRITICAL_RULES.md before deploying!"
    exit 1
fi

echo ""
echo "📦 Files to deploy:"
echo "  1. Migration: 2026_02_01_000001_add_permission_overrides_and_evaluation_admin.php"
echo "  2. Service: app/Services/PermissionService.php"
echo "  3. Middleware: app/Http/Middleware/CheckPermission.php"
echo "  4. Trait: app/Http/Traits/EvaluationAdminOwnership.php"
echo "  5. Updated: app/Models/User.php"
echo "  6. Updated: bootstrap/app.php"
echo "  7. Updated: app/Http/Controllers/Api/ProgramController.php"
echo ""
read -p "Proceed with deployment? (yes/no): " proceed
if [ "$proceed" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "📋 Step 1: Creating backup on server..."
ssh -i "$PEM" "$SERVER" "cd $BACKEND_PATH && \
    sudo mkdir -p backups/$(date +%Y%m%d_%H%M%S) && \
    sudo cp -r app/Models/User.php backups/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true && \
    sudo cp -r bootstrap/app.php backups/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true && \
    sudo cp -r app/Http/Controllers/Api/ProgramController.php backups/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true && \
    echo '✅ Backup created'"

echo ""
echo "📤 Step 2: Uploading files to /tmp..."

# Upload new files
scp -i "$PEM" \
    "$LOCAL_BACKEND/database/migrations/2026_02_01_000001_add_permission_overrides_and_evaluation_admin.php" \
    "$SERVER:/tmp/"

scp -i "$PEM" \
    "$LOCAL_BACKEND/app/Services/PermissionService.php" \
    "$SERVER:/tmp/"

scp -i "$PEM" \
    "$LOCAL_BACKEND/app/Http/Middleware/CheckPermission.php" \
    "$SERVER:/tmp/"

scp -i "$PEM" \
    "$LOCAL_BACKEND/app/Http/Traits/EvaluationAdminOwnership.php" \
    "$SERVER:/tmp/"

scp -i "$PEM" \
    "$LOCAL_BACKEND/app/Models/User.php" \
    "$SERVER:/tmp/"

scp -i "$PEM" \
    "$LOCAL_BACKEND/bootstrap/app.php" \
    "$SERVER:/tmp/"

scp -i "$PEM" \
    "$LOCAL_BACKEND/app/Http/Controllers/Api/ProgramController.php" \
    "$SERVER:/tmp/"

echo "✅ Files uploaded to /tmp"

echo ""
echo "📂 Step 3: Moving files to production directories..."
ssh -i "$PEM" "$SERVER" "
    # Create directories if they don't exist
    sudo mkdir -p $BACKEND_PATH/app/Services
    sudo mkdir -p $BACKEND_PATH/app/Http/Traits
    
    # Move files with sudo
    sudo mv /tmp/2026_02_01_000001_add_permission_overrides_and_evaluation_admin.php $BACKEND_PATH/database/migrations/
    sudo mv /tmp/PermissionService.php $BACKEND_PATH/app/Services/
    sudo mv /tmp/CheckPermission.php $BACKEND_PATH/app/Http/Middleware/
    sudo mv /tmp/EvaluationAdminOwnership.php $BACKEND_PATH/app/Http/Traits/
    sudo mv /tmp/User.php $BACKEND_PATH/app/Models/
    sudo mv /tmp/app.php $BACKEND_PATH/bootstrap/
    sudo mv /tmp/ProgramController.php $BACKEND_PATH/app/Http/Controllers/Api/
    
    # Set correct permissions
    sudo chown -R www-data:www-data $BACKEND_PATH/app
    sudo chown -R www-data:www-data $BACKEND_PATH/bootstrap
    sudo chown -R www-data:www-data $BACKEND_PATH/database
    sudo chmod -R 755 $BACKEND_PATH/app
    sudo chmod -R 755 $BACKEND_PATH/bootstrap
    
    echo '✅ Files moved and permissions set'
"

echo ""
echo "🗄️  Step 4: Running database migration..."
ssh -i "$PEM" "$SERVER" "cd $BACKEND_PATH && \
    sudo -u www-data php artisan migrate --force && \
    echo '✅ Migration completed successfully'"

echo ""
echo "🔄 Step 5: Clearing Laravel caches..."
ssh -i "$PEM" "$SERVER" "cd $BACKEND_PATH && \
    sudo -u www-data php artisan config:clear && \
    sudo -u www-data php artisan cache:clear && \
    sudo -u www-data php artisan route:clear && \
    sudo -u www-data php artisan view:clear && \
    echo '✅ Caches cleared'"

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "🧪 Please test the following:"
echo "  1. Login as super-admin"
echo "  2. Create a new program"
echo "  3. Verify 4 role checkboxes appear"
echo "  4. Select roles and create program"
echo "  5. Verify credentials modal shows"
echo "  6. Login as evaluation-admin"
echo "  7. Verify limited access (view-only for org/program)"
echo ""
echo "📝 Rollback command (if needed):"
echo "   ssh -i $PEM $SERVER 'cd $BACKEND_PATH && sudo php artisan migrate:rollback --step=1 --force'"
echo ""
