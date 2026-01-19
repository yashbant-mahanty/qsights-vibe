#!/bin/bash

# Deploy Program Name Fix - COMPLETE (Backend + Frontend + Notifications)
# Date: 18 January 2026
# Changes: Display program name instead of program ID in:
#   1. Reports & Analytics - Event Summary table
#   2. Reports & Analytics - Notifications tab (Email Notification Tracking)

set -e

PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SSH_PORT="3389"
SERVER="127.0.0.1"

echo "🚀 Starting COMPLETE deployment of Program Name fix..."
echo ""
echo "📝 Changes being deployed:"
echo "   1. Backend: ActivityController - adds program_name to activities"
echo "   2. Backend: NotificationController - adds program_name to notification logs"
echo "   3. Frontend: Event Summary table - displays program_name"
echo "   4. Frontend: Notifications table - displays program_name"
echo ""

# Step 1: Deploy Backend Files
echo "📦 Step 1: Deploying backend files..."

echo "   → ActivityController.php..."
scp -P ${SSH_PORT} -i ${PEM_KEY} \
  /Users/yash/Documents/Projects/QSightsOrg2.0/backend/app/Http/Controllers/Api/ActivityController.php \
  ubuntu@${SERVER}:/tmp/ActivityController.php

ssh -p ${SSH_PORT} -i ${PEM_KEY} ubuntu@${SERVER} \
  "sudo mv /tmp/ActivityController.php /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/ActivityController.php && \
   sudo chown www-data:www-data /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/ActivityController.php"

echo "   → NotificationController.php..."
scp -P ${SSH_PORT} -i ${PEM_KEY} \
  /Users/yash/Documents/Projects/QSightsOrg2.0/backend/app/Http/Controllers/Api/NotificationController.php \
  ubuntu@${SERVER}:/tmp/NotificationController.php

ssh -p ${SSH_PORT} -i ${PEM_KEY} ubuntu@${SERVER} \
  "sudo mv /tmp/NotificationController.php /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/NotificationController.php && \
   sudo chown www-data:www-data /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/NotificationController.php"

echo "✅ Backend files deployed"
echo ""

# Step 2: Clear Laravel Cache
echo "🧹 Step 2: Clearing Laravel cache..."
ssh -p ${SSH_PORT} -i ${PEM_KEY} ubuntu@${SERVER} \
  "cd /var/www/QSightsOrg2.0/backend && \
   php artisan config:clear && \
   php artisan cache:clear && \
   php artisan route:clear && \
   php artisan view:clear"

echo "✅ Laravel cache cleared"
echo ""

# Step 3: Restart PHP-FPM
echo "🔄 Step 3: Restarting PHP-FPM..."
ssh -p ${SSH_PORT} -i ${PEM_KEY} ubuntu@${SERVER} "sudo systemctl restart php8.4-fpm"

echo "✅ PHP-FPM restarted"
echo ""

# Step 4: Deploy Frontend File
echo "📦 Step 4: Deploying frontend page.tsx..."
scp -P ${SSH_PORT} -i ${PEM_KEY} \
  /Users/yash/Documents/Projects/QSightsOrg2.0/frontend/app/analytics/page.tsx \
  ubuntu@${SERVER}:/tmp/analytics_page.tsx

ssh -p ${SSH_PORT} -i ${PEM_KEY} ubuntu@${SERVER} \
  "sudo mv /tmp/analytics_page.tsx /var/www/QSightsOrg2.0/frontend/app/analytics/page.tsx && \
   sudo chown ubuntu:ubuntu /var/www/QSightsOrg2.0/frontend/app/analytics/page.tsx"

echo "✅ Frontend file deployed"
echo ""

# Step 5: Build Frontend on Production
echo "🏗️  Step 5: Building frontend on production..."
ssh -p ${SSH_PORT} -i ${PEM_KEY} ubuntu@${SERVER} \
  "cd /var/www/QSightsOrg2.0/frontend && npm run build"

echo "✅ Frontend built"
echo ""

# Step 6: Clear Next.js Cache
echo "🧹 Step 6: Clearing Next.js cache..."
ssh -p ${SSH_PORT} -i ${PEM_KEY} ubuntu@${SERVER} \
  "cd /var/www/QSightsOrg2.0/frontend && rm -rf .next/cache"

echo "✅ Next.js cache cleared"
echo ""

# Step 7: Restart PM2
echo "🔄 Step 7: Restarting PM2..."
ssh -p ${SSH_PORT} -i ${PEM_KEY} ubuntu@${SERVER} "pm2 restart qsights-frontend"

echo "✅ PM2 restarted"
echo ""

# Step 8: Verify Services
echo "🔍 Step 8: Verifying services..."
ssh -p ${SSH_PORT} -i ${PEM_KEY} ubuntu@${SERVER} "pm2 status"

echo ""
echo "✅ ✅ ✅ COMPLETE DEPLOYMENT SUCCESSFUL! ✅ ✅ ✅"
echo ""
echo "📝 Summary of changes:"
echo "   ✓ ActivityController: Returns program_name with activities"
echo "   ✓ NotificationController: Returns program_name with notifications"
echo "   ✓ Reports & Analytics - Event Summary: Shows program names"
echo "   ✓ Reports & Analytics - Notifications: Shows program names"
echo ""
echo "🌐 Please verify at: https://prod.qsights.com/analytics"
echo "   - Check Event Summary table (Overview tab)"
echo "   - Check Email Notification Tracking (Notifications tab)"
echo ""
