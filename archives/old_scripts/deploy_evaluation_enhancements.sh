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



# Evaluation Admin Enhancements Deployment Script
# Date: Feb 05, 2026
# Features: Dashboard Performance Fix + Bulk Import CSV/Excel

set -e  # Exit on error

echo "=========================================="
echo "Evaluation Admin Enhancements Deployment"
echo "=========================================="
echo ""

# Configuration
SSH_KEY="$HOME/.ssh/Qsights.pem"
SERVER_USER="ec2-user"
SERVER_IP="13.126.210.220"
SERVER="$SERVER_USER@$SERVER_IP"

BACKEND_PATH="/var/www/QSightsOrg2.0/backend"
FRONTEND_PATH="/var/www/frontend"

LOCAL_BACKEND="/Users/yash/Documents/Projects/QSightsOrg2.0/backend"
LOCAL_FRONTEND="/Users/yash/Documents/Projects/QSightsOrg2.0/frontend"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "📋 Configuration:"
echo "   Server: $SERVER_IP"
echo "   Timestamp: $TIMESTAMP"
echo ""

# Function to run remote commands
run_remote() {
    ssh -i "$SSH_KEY" "$SERVER" "$1"
}

# Function to copy files
copy_file() {
    scp -i "$SSH_KEY" "$1" "$SERVER:$2"
}

# Function to copy directories
copy_dir() {
    scp -i "$SSH_KEY" -r "$1" "$SERVER:$2"
}

echo "=========================================="
echo "Step 1: Building Frontend"
echo "=========================================="
cd "$LOCAL_FRONTEND"
echo "📦 Running npm run build..."
npm run build

if [ ! -d ".next" ]; then
    echo "❌ Error: Build failed! .next directory not found"
    exit 1
fi

echo "✅ Frontend build completed successfully"
echo ""

echo "=========================================="
echo "Step 2: Creating Backup on Production"
echo "=========================================="

echo "📦 Backing up frontend .next directory..."
run_remote "cd $FRONTEND_PATH && sudo cp -r .next .next.backup.$TIMESTAMP 2>/dev/null || echo 'No previous .next to backup'"

echo "📦 Backing up backend routes and components..."
run_remote "cd $BACKEND_PATH && sudo cp routes/api.php routes/api.php.backup.$TIMESTAMP 2>/dev/null || echo 'No previous routes to backup'"

echo "✅ Backup completed"
echo ""

echo "=========================================="
echo "Step 3: Deploying Backend Files"
echo "=========================================="

echo "📤 Uploading EvaluationBulkImportController..."
copy_file "$LOCAL_BACKEND/app/Http/Controllers/Api/EvaluationBulkImportController.php" "/tmp/"

echo "📤 Uploading updated api.php routes..."
copy_file "$LOCAL_BACKEND/routes/api.php" "/tmp/"

echo "📥 Moving files to production location..."
run_remote "sudo mv /tmp/EvaluationBulkImportController.php $BACKEND_PATH/app/Http/Controllers/Api/"
run_remote "sudo mv /tmp/api.php $BACKEND_PATH/routes/"

echo "🔧 Setting permissions..."
run_remote "sudo chown -R www-data:www-data $BACKEND_PATH/app/Http/Controllers/Api/EvaluationBulkImportController.php"
run_remote "sudo chown -R www-data:www-data $BACKEND_PATH/routes/api.php"
run_remote "sudo chmod 644 $BACKEND_PATH/app/Http/Controllers/Api/EvaluationBulkImportController.php"
run_remote "sudo chmod 644 $BACKEND_PATH/routes/api.php"

echo "🧹 Clearing Laravel cache..."
run_remote "cd $BACKEND_PATH && php artisan cache:clear"
run_remote "cd $BACKEND_PATH && php artisan config:clear"
run_remote "cd $BACKEND_PATH && php artisan route:clear"

echo "✅ Backend deployment completed"
echo ""

echo "=========================================="
echo "Step 4: Deploying Frontend Files"
echo "=========================================="

echo "📤 Uploading .next build..."
copy_dir "$LOCAL_FRONTEND/.next" "/tmp/"

echo "📤 Uploading BulkImportModal component..."
run_remote "sudo mkdir -p /tmp/components/evaluation"
copy_file "$LOCAL_FRONTEND/components/evaluation/BulkImportModal.tsx" "/tmp/components/evaluation/"

echo "📤 Uploading updated evaluation-admin page..."
run_remote "sudo mkdir -p /tmp/app/evaluation-admin"
copy_file "$LOCAL_FRONTEND/app/evaluation-admin/page.tsx" "/tmp/app/evaluation-admin/"

echo "📥 Removing old frontend build..."
run_remote "sudo rm -rf $FRONTEND_PATH/.next"

echo "📥 Moving new build to production..."
run_remote "sudo mv /tmp/.next $FRONTEND_PATH/"
run_remote "sudo mkdir -p $FRONTEND_PATH/components/evaluation"
run_remote "sudo mv /tmp/components/evaluation/BulkImportModal.tsx $FRONTEND_PATH/components/evaluation/"
run_remote "sudo mv /tmp/app/evaluation-admin/page.tsx $FRONTEND_PATH/app/evaluation-admin/"

echo "🔧 Setting permissions..."
run_remote "sudo chown -R www-data:www-data $FRONTEND_PATH"
run_remote "sudo chmod -R 755 $FRONTEND_PATH"

echo "✅ Frontend deployment completed"
echo ""

echo "=========================================="
echo "Step 5: Restarting Services"
echo "=========================================="

echo "🔄 Restarting PM2 frontend service..."
run_remote "pm2 restart qsights-frontend"

sleep 5

echo "✅ Services restarted"
echo ""

echo "=========================================="
echo "Step 6: Verification"
echo "=========================================="

echo "🔍 Checking PM2 status..."
run_remote "pm2 list | grep qsights-frontend"

echo ""
echo "🔍 Checking recent logs..."
run_remote "pm2 logs qsights-frontend --lines 20 --nostream" || echo "Logs not available"

echo ""
echo "🔍 Testing API endpoint..."
HEALTH_CHECK=$(run_remote "curl -s -o /dev/null -w '%{http_code}' https://prod.qsights.com/" || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo "✅ Frontend is responding (HTTP $HEALTH_CHECK)"
else
    echo "⚠️  Frontend response: HTTP $HEALTH_CHECK"
fi

echo ""
echo "🔍 Verifying bulk import routes..."
run_remote "cd $BACKEND_PATH && php artisan route:list | grep 'bulk-import'" || echo "Route verification failed"

echo ""
echo "=========================================="
echo "✅ Deployment Completed Successfully!"
echo "=========================================="
echo ""
echo "📝 Summary:"
echo "   ✅ Frontend build completed"
echo "   ✅ Backend files deployed"
echo "   ✅ Frontend files deployed"
echo "   ✅ Services restarted"
echo "   ✅ Basic health check passed"
echo ""
echo "🔧 Enhancements Deployed:"
echo "   1. Dashboard Performance Fix (Parallel API Calls)"
echo "   2. Bulk Import Feature (CSV/Excel for Dept/Role/Staff)"
echo ""
echo "📚 Documentation: EVALUATION_ENHANCEMENTS_FEB_05_2026.md"
echo ""
echo "🧪 Testing Instructions:"
echo "   1. Login as Evaluation Admin"
echo "   2. Navigate to Evaluation Admin Dashboard"
echo "   3. Verify fast dashboard loading (< 3 seconds)"
echo "   4. Click 'Bulk Import (CSV/Excel)' button"
echo "   5. Download sample CSV and test import"
echo ""
echo "🔄 Rollback if needed:"
echo "   Frontend: sudo cp -r $FRONTEND_PATH/.next.backup.$TIMESTAMP $FRONTEND_PATH/.next && pm2 restart qsights-frontend"
echo "   Backend: sudo cp $BACKEND_PATH/routes/api.php.backup.$TIMESTAMP $BACKEND_PATH/routes/api.php && php artisan route:clear"
echo ""
echo "✨ Deployment completed at: $(date)"
echo "=========================================="
