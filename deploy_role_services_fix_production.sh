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



# Production Deployment - Role Services Fix
# Date: Feb 06, 2026
# Fixes: React hydration errors and service checkbox display issue

set -e

# Configuration
PEM="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"

# CRITICAL PATHS (from CRITICAL_RULES.md)
FRONTEND_PROD_PATH="/var/www/frontend"
BACKEND_PROD_PATH="/var/www/QSightsOrg2.0/backend"

echo "=========================================="
echo "🚀 Production Deployment - Role Services Fix"
echo "Date: $(date)"
echo "=========================================="

# Pre-deployment checks
echo ""
echo "📋 Pre-deployment checks..."

# Check BUILD_ID exists
if [ ! -f "frontend/.next/BUILD_ID" ]; then
    echo "❌ ERROR: BUILD_ID missing! Run: cd frontend && npm run build"
    exit 1
fi

BUILD_ID=$(cat frontend/.next/BUILD_ID)
echo "✅ BUILD_ID found: $BUILD_ID"

# Check .env has no localhost:8000
if grep -q "localhost:8000" frontend/.env.local 2>/dev/null; then
    echo "❌ ERROR: .env.local contains localhost:8000"
    exit 1
fi
echo "✅ .env.local verified (no localhost:8000)"

# Check PEM file exists
if [ ! -f "$PEM" ]; then
    echo "❌ ERROR: PEM file not found at $PEM"
    exit 1
fi
echo "✅ PEM file found"

# Package frontend build
echo ""
echo "📦 Packaging frontend build..."
cd frontend
tar czf ../frontend-deploy.tar.gz .next/
cd ..
echo "✅ Frontend packaged"

# Upload to production
echo ""
echo "📤 Uploading to production server..."
scp -i "$PEM" frontend-deploy.tar.gz "$SERVER:/tmp/"
echo "✅ Uploaded to /tmp/"

# Deploy on production server
echo ""
echo "🔧 Deploying on production (correct paths)..."
ssh -i "$PEM" "$SERVER" << 'ENDSSH'
    set -e
    
    echo ""
    echo "📁 Creating backup..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    sudo cp -r /var/www/frontend/.next "/var/www/frontend/.next.backup.$TIMESTAMP"
    echo "✅ Backup created: .next.backup.$TIMESTAMP"
    
    echo ""
    echo "🗑️  Removing old .next..."
    sudo rm -rf /var/www/frontend/.next
    
    echo ""
    echo "📦 Extracting new build..."
    cd /var/www/frontend
    sudo tar xzf /tmp/frontend-deploy.tar.gz
    sudo chown -R ubuntu:ubuntu .next
    
    echo ""
    echo "🔄 Restarting PM2..."
    pm2 restart qsights-frontend
    
    echo ""
    echo "⏳ Waiting for PM2 to start..."
    sleep 3
    
    echo ""
    echo "📊 PM2 Status:"
    pm2 list | grep qsights-frontend
    
    echo ""
    echo "🧹 Cleaning up..."
    rm /tmp/frontend-deploy.tar.gz
    
    echo ""
    echo "✅ Deployment complete!"
ENDSSH

# Cleanup local files
echo ""
echo "🧹 Cleaning up local files..."
rm frontend-deploy.tar.gz

# Post-deployment verification
echo ""
echo "=========================================="
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "=========================================="
echo ""
echo "📋 Post-Deployment Verification:"
echo "1. Check site: https://prod.qsights.com/program-admin/roles"
echo "2. Login and test Edit Role functionality"
echo "3. Verify services checkboxes display correctly"
echo "4. Check browser console for React errors"
echo ""
echo "🔍 To check logs:"
echo "ssh -i $PEM $SERVER 'pm2 logs qsights-frontend --lines 50'"
echo ""
echo "🔙 Rollback if needed:"
echo "ssh -i $PEM $SERVER 'cd /var/www/frontend && sudo rm -rf .next && sudo mv .next.backup.$TIMESTAMP .next && pm2 restart qsights-frontend'"
