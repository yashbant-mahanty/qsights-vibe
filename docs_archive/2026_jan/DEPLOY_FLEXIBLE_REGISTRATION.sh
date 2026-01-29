#!/bin/bash

# ============================================================================
# FLEXIBLE REGISTRATION FLOW - DEPLOYMENT SCRIPT
# ============================================================================
# Date: January 23, 2026
# WARNING: This will deploy to production server - USE WITH CAUTION
# ============================================================================

set -e  # Exit on error

# Server details
SERVER_USER="ubuntu"
SERVER_IP="13.126.210.220"
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
BACKEND_PATH="/var/www/backend"
FRONTEND_PATH="/var/www/frontend"
LOCAL_BACKEND="./backend"
LOCAL_FRONTEND="./frontend"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  FLEXIBLE REGISTRATION FLOW - DEPLOYMENT SCRIPT                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "⚠️  WARNING: This will deploy to PRODUCTION server!"
echo "Server: $SERVER_IP"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

echo ""
echo "📦 Step 1: Deploying Backend Files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Deploy new controller
echo "→ Deploying TemporarySubmissionController..."
scp -i "$PEM_KEY" \
    "$LOCAL_BACKEND/app/Http/Controllers/Api/TemporarySubmissionController.php" \
    "$SERVER_USER@$SERVER_IP:$BACKEND_PATH/app/Http/Controllers/Api/"

# Deploy cleanup command
echo "→ Deploying CleanupExpiredTemporarySubmissions command..."
scp -i "$PEM_KEY" \
    "$LOCAL_BACKEND/app/Console/Commands/CleanupExpiredTemporarySubmissions.php" \
    "$SERVER_USER@$SERVER_IP:$BACKEND_PATH/app/Console/Commands/"

# Deploy migrations
echo "→ Deploying database migrations..."
scp -i "$PEM_KEY" \
    "$LOCAL_BACKEND/database/migrations/2026_01_23_082141_add_registration_flow_to_activities_table.php" \
    "$SERVER_USER@$SERVER_IP:$BACKEND_PATH/database/migrations/"

scp -i "$PEM_KEY" \
    "$LOCAL_BACKEND/database/migrations/2026_01_23_082239_create_temporary_submissions_table.php" \
    "$SERVER_USER@$SERVER_IP:$BACKEND_PATH/database/migrations/"

# Deploy models
echo "→ Deploying models..."
scp -i "$PEM_KEY" \
    "$LOCAL_BACKEND/app/Models/Activity.php" \
    "$SERVER_USER@$SERVER_IP:$BACKEND_PATH/app/Models/"

scp -i "$PEM_KEY" \
    "$LOCAL_BACKEND/app/Models/TemporarySubmission.php" \
    "$SERVER_USER@$SERVER_IP:$BACKEND_PATH/app/Models/"

# Deploy routes
echo "→ Deploying API routes..."
scp -i "$PEM_KEY" \
    "$LOCAL_BACKEND/routes/api.php" \
    "$SERVER_USER@$SERVER_IP:$BACKEND_PATH/routes/"

echo ""
echo "📦 Step 2: Deploying Frontend Files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Deploy Create page
echo "→ Deploying Create Activity page..."
scp -i "$PEM_KEY" \
    "$LOCAL_FRONTEND/app/activities/create/page.tsx" \
    "$SERVER_USER@$SERVER_IP:$FRONTEND_PATH/app/activities/create/"

# Deploy Edit page
echo "→ Deploying Edit Activity page..."
scp -i "$PEM_KEY" \
    "$LOCAL_FRONTEND/app/activities/[id]/edit/page.tsx" \
    "$SERVER_USER@$SERVER_IP:$FRONTEND_PATH/app/activities/[id]/edit/"

# Deploy Take page
echo "→ Deploying Take Activity page..."
scp -i "$PEM_KEY" \
    "$LOCAL_FRONTEND/app/activities/take/[id]/page.tsx" \
    "$SERVER_USER@$SERVER_IP:$FRONTEND_PATH/app/activities/take/[id]/"

echo ""
echo "🔄 Step 3: Running Database Migrations..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  CRITICAL: About to run migrations on PRODUCTION database!"
echo ""
read -p "Run migrations now? (yes/no): " RUN_MIGRATIONS

if [ "$RUN_MIGRATIONS" = "yes" ]; then
    ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
        cd /var/www/backend
        echo "→ Running migrations..."
        php artisan migrate --force
        echo ""
        echo "✅ Migrations completed!"
ENDSSH
else
    echo "⏭️  Skipped migrations. Run manually with:"
    echo "   ssh -i $PEM_KEY $SERVER_USER@$SERVER_IP"
    echo "   cd /var/www/backend && php artisan migrate --force"
fi

echo ""
echo "🔄 Step 4: Restarting Services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
    # Restart PHP-FPM if needed
    if command -v systemctl &> /dev/null; then
        sudo systemctl reload php-fpm || sudo systemctl reload php8.2-fpm || echo "PHP-FPM not found"
    fi
    
    # Clear Laravel cache
    cd /var/www/backend
    php artisan config:clear
    php artisan route:clear
    php artisan cache:clear
    
    echo "✅ Services restarted!"
ENDSSH

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅  DEPLOYMENT COMPLETE!                                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Next Steps:"
echo "  1. Test Pre-Submission flow (existing behavior)"
echo "  2. Test Post-Submission flow (new feature)"
echo "  3. Monitor logs for errors"
echo "  4. Schedule cleanup command (see documentation)"
echo ""
echo "📚 Documentation:"
echo "  - COMPLETE_FEATURE_SUMMARY.md"
echo "  - PHASE2_IMPLEMENTATION_COMPLETE.md"
echo ""
