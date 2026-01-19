#!/bin/bash

# Evaluation Module Deployment Script
# Date: 19 January 2026

set -e

echo "=========================================="
echo "EVALUATION MODULE DEPLOYMENT"
echo "=========================================="
echo ""

# Configuration
SERVER="ubuntu@13.126.210.220"
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
BACKEND_PATH="/var/www/qsights/backend"
FRONTEND_PATH="/var/www/qsights/frontend"

echo "Step 1: Building Frontend..."
cd /Users/yash/Documents/Projects/QSightsOrg2.0/frontend
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

echo "✅ Frontend build successful"
echo ""

echo "Step 2: Deploying Backend (Migrations + Controllers + Routes)..."
ssh -i "$PEM_KEY" "$SERVER" << 'ENDSSH'
    set -e
    cd /var/www/qsights/backend
    
    # Pull latest changes
    echo "Pulling latest backend code..."
    git pull origin main
    
    # Run migrations
    echo "Running database migrations..."
    php artisan migrate --force
    
    # Clear caches
    echo "Clearing caches..."
    php artisan config:clear
    php artisan route:clear
    php artisan cache:clear
    
    echo "✅ Backend deployment complete"
ENDSSH

echo ""
echo "Step 3: Deploying Frontend..."
ssh -i "$PEM_KEY" "$SERVER" << 'ENDSSH'
    set -e
    cd /var/www/qsights/frontend
    
    # Pull latest changes
    echo "Pulling latest frontend code..."
    git pull origin main
    
    # Install dependencies (if needed)
    npm install --production
    
    # Build
    echo "Building frontend..."
    npm run build
    
    # Restart PM2
    echo "Restarting PM2 process..."
    pm2 restart qsights-frontend
    
    echo "✅ Frontend deployment complete"
ENDSSH

echo ""
echo "Step 4: Verification..."
ssh -i "$PEM_KEY" "$SERVER" << 'ENDSSH'
    echo "PM2 Status:"
    pm2 list | grep qsights
    
    echo ""
    echo "Migration Status:"
    cd /var/www/qsights/backend
    php artisan migrate:status | grep evaluation
ENDSSH

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "Evaluation Module is now live at:"
echo "https://prod.qsights.com/evaluation"
echo ""
echo "New Database Tables:"
echo "  - evaluation_roles"
echo "  - evaluation_staff"
echo "  - evaluation_hierarchy"
echo "  - evaluation_assignments"
echo "  - evaluation_results"
echo "  - evaluation_audit_log"
echo ""
echo "New API Endpoints:"
echo "  - /api/evaluation/roles"
echo "  - /api/evaluation/staff"
echo "  - /api/evaluation/hierarchy"
echo "  - /api/evaluation/assignments"
echo "  - /api/evaluation/results"
echo ""
