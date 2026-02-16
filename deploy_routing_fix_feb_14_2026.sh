#!/bin/bash

# Deploy Routing Fix - Feb 14, 2026
# Fixes 404 error on hard refresh for dashboard/organizations tabs

set -e

echo "🚀 Deploying routing fix to production..."

# Navigate to frontend directory
cd /Users/yash/Documents/Projects/QSightsOrg2.0/frontend

# Build the Next.js app
echo "📦 Building Next.js application..."
npm run build

# Create backup timestamp
BACKUP_TIME=$(date +%Y%m%d_%H%M%S)

# SSH into production server and deploy
echo "🔧 Deploying to production server..."
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 << 'ENDSSH'

# Navigate to frontend directory on server
cd /var/www/frontend

# Create backup
echo "💾 Creating backup..."
sudo mkdir -p /var/www/backups
sudo tar -czf /var/www/backups/frontend_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
  .next app

# Stop the frontend service
echo "🛑 Stopping frontend service..."
sudo pm2 stop frontend || true

ENDSSH

# Copy updated files to server
echo "📤 Copying updated files..."
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
  -r .next app package.json package-lock.json \
  ubuntu@13.126.210.220:/var/www/frontend/

# Continue deployment on server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 << 'ENDSSH'

cd /var/www/frontend

# Set proper permissions
echo "🔐 Setting permissions..."
sudo chown -R ubuntu:ubuntu .next app
sudo chmod -R 755 .next app

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install --production

# Start the frontend service
echo "✅ Starting frontend service..."
sudo pm2 restart frontend || sudo pm2 start npm --name "frontend" -- start

# Save PM2 configuration
sudo pm2 save

echo "✅ Deployment complete!"
echo "🔍 Checking service status..."
sudo pm2 list

ENDSSH

echo ""
echo "=========================================="
echo "✅ ROUTING FIX DEPLOYED SUCCESSFULLY!"
echo "=========================================="
echo ""
echo "Fixed Issues:"
echo "  - Program Admin dashboard 404 on hard refresh"
echo "  - Program Manager dashboard 404 on hard refresh"  
echo "  - Program Moderator dashboard 404 on hard refresh"
echo "  - Organizations tab 404 on hard refresh"
echo ""
echo "Changes:"
echo "  - Updated /login redirect to / (homepage)"
echo "  - Added auth loading state check before redirect"
echo "  - Prevents redirect during initial auth load"
echo ""
echo "=========================================="
