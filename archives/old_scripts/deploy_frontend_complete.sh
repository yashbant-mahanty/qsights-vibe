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



# Complete Frontend Deployment - Fix React Hydration Errors
# Date: Feb 05, 2026

echo "🚀 Starting Complete Frontend Deployment..."

# Upload fresh build
echo "📦 Uploading fresh build..."
scp frontend/next-build.tar.gz ubuntu@13.126.210.220:/tmp/

# Deploy on server
echo "🔧 Deploying on production..."
ssh ubuntu@13.126.210.220 << 'ENDSSH'
    set -e
    
    echo "📁 Backing up current deployment..."
    sudo cp -r /var/www/frontend/.next /var/www/frontend/.next.backup.$(date +%Y%m%d_%H%M%S)
    
    echo "🗑️  Removing old build..."
    sudo rm -rf /var/www/frontend/.next
    
    echo "📦 Extracting fresh build..."
    cd /var/www/frontend
    sudo tar xzf /tmp/next-build.tar.gz
    sudo chown -R ubuntu:ubuntu .next
    
    echo "🔄 Restarting PM2..."
    pm2 restart qsights-frontend
    
    echo "✅ Deployment complete!"
    rm /tmp/next-build.tar.gz
ENDSSH

echo "✅ Frontend deployed successfully!"
echo ""
echo "🌐 Please test at: https://prod.qsights.com/program-admin/roles"
