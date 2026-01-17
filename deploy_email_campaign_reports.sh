#!/bin/bash

# Email Campaign Reports - Add User Identifier Feature
# Date: January 16, 2026

set -e

echo "=========================================="
echo "Email Campaign Reports - User Identifier"
echo "=========================================="
echo ""

SERVER="ubuntu@13.126.210.220"
PEM_FILE="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
REMOTE_PATH="/var/www/QSightsOrg2.0"

echo "📦 Deploying backend changes..."
# Upload to temp directory first
scp -i "$PEM_FILE" \
    backend/app/Http/Controllers/Api/NotificationController.php \
    "$SERVER:/tmp/"

scp -i "$PEM_FILE" \
    backend/routes/api.php \
    "$SERVER:/tmp/"

# Move from temp to destination with sudo
ssh -i "$PEM_FILE" "$SERVER" << 'ENDSSH'
sudo mv /tmp/NotificationController.php /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/
sudo mv /tmp/api.php /var/www/QSightsOrg2.0/backend/routes/
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend/
ENDSSH

echo "✅ Backend files deployed"
echo ""

echo "🎨 Deploying frontend changes..."
scp -i "$PEM_FILE" \
    "frontend/app/activities/[id]/results/page.tsx" \
    "$SERVER:/tmp/"

ssh -i "$PEM_FILE" "$SERVER" << 'ENDSSH'
sudo mv /tmp/page.tsx "/var/www/QSightsOrg2.0/frontend/app/activities/[id]/results/"
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/frontend/
ENDSSH

echo "✅ Frontend files deployed"
echo ""

echo "🔄 Building frontend on production..."
ssh -i "$PEM_FILE" "$SERVER" << 'ENDSSH'
cd /var/www/QSightsOrg2.0/frontend
npm run build
pm2 restart qsights-frontend
ENDSSH

echo "✅ Frontend rebuilt and restarted"
echo ""

echo "🔍 Verifying deployment..."
ssh -i "$PEM_FILE" "$SERVER" << 'ENDSSH'
echo "Backend route file updated:"
grep -n "getDetailedNotifications" /var/www/QSightsOrg2.0/backend/routes/api.php | head -1

echo ""
echo "Frontend page updated:"
ls -lh /var/www/QSightsOrg2.0/frontend/app/activities/[id]/results/page.tsx
ENDSSH

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "CHANGES DEPLOYED:"
echo "  ✓ Added individual notification logging (backend)"
echo "  ✓ Added detailed notifications API endpoint"
echo "  ✓ Added expandable rows with user identifiers (frontend)"
echo "  ✓ Shows Full Name + Email for registered users"
echo "  ✓ Shows Email only for external participants"
echo ""
echo "TESTING:"
echo "  1. Navigate to Activity Results → Email Notification Tracking"
echo "  2. Click the expand arrow (▼) on any campaign report"
echo "  3. View detailed recipient list with user names/emails"
echo ""
