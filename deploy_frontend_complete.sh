#!/bin/bash

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
