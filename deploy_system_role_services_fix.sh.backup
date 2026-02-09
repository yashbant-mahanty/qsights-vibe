#!/bin/bash

# QSights System Role Services Fix Deployment
# Fixes services loading for system-user and program-user roles
# They should ONLY use services from program_roles, not merge with default_services

set -e  # Exit on error

# Configuration
PEM="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
BACKEND_PATH="/var/www/QSightsOrg2.0/backend"
LOCAL_BACKEND="/Users/yash/Documents/Projects/QSightsOrg2.0/backend"

echo "🚀 System Role Services Fix Deployment"
echo "======================================"
echo ""
echo "⚠️  DEPLOYING TO PRODUCTION: $SERVER"
echo "⚠️  This fixes service loading for system-user roles"
echo ""

echo "📦 Files to deploy:"
echo "  1. Updated: app/Http/Controllers/Api/AuthController.php"
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
    sudo cp app/Http/Controllers/Api/AuthController.php backups/$(date +%Y%m%d_%H%M%S)/ && \
    echo '✅ Backup created'"

echo ""
echo "📋 Step 2: Deploying AuthController..."
scp -i "$PEM" "$LOCAL_BACKEND/app/Http/Controllers/Api/AuthController.php" "$SERVER:/tmp/"
ssh -i "$PEM" "$SERVER" "sudo mv /tmp/AuthController.php $BACKEND_PATH/app/Http/Controllers/Api/ && \
    sudo chown www-data:www-data $BACKEND_PATH/app/Http/Controllers/Api/AuthController.php"
echo "✅ AuthController deployed"

echo ""
echo "📋 Step 3: Clearing Laravel caches..."
ssh -i "$PEM" "$SERVER" "cd $BACKEND_PATH && \
    sudo -u www-data php artisan config:clear && \
    sudo -u www-data php artisan cache:clear && \
    sudo -u www-data php artisan route:clear && \
    echo '✅ Caches cleared'"

echo ""
echo "📋 Step 4: Testing /api/auth/me endpoint..."
echo "Testing with curl (this will show if services are now correctly filtered)..."
ssh -i "$PEM" "$SERVER" "curl -s https://prod.qsights.com/api/auth/me -H 'Authorization: Bearer test' | head -20"

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📝 Next Steps:"
echo "  1. Login as system-user: lmdadmib@qsightsprod.com"
echo "  2. Check that ONLY the 10 selected services are displayed"
echo "  3. Verify navigation tabs show: dashboard, organizations, programs, etc."
echo ""
echo "🔍 Expected services (10 total):"
echo "  - dashboard"
echo "  - list_organization"
echo "  - list_programs"
echo "  - list_group_head"
echo "  - add_program_participants"
echo "  - list_activity"
echo "  - category_add"
echo "  - category_edit"
echo "  - list_evaluation"
echo "  - add_evaluation"
