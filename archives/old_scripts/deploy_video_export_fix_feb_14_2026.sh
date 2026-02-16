#!/bin/bash

# ===================================================================
# VIDEO WATCH TIME EXPORT FIX - Feb 14, 2026
# ===================================================================
# Fixes video watch time not appearing in CSV/Excel/PDF exports
# for both registered and anonymous participants
# ===================================================================

set -e  # Exit on error

PEM_FILE="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
FRONTEND_PATH="/var/www/frontend"
RESULTS_PAGE="app/activities/[id]/results/page.tsx"

echo "=========================================="
echo "VIDEO EXPORT FIX DEPLOYMENT"
echo "=========================================="
echo ""

# Confirmation
if [[ "$1" != "--yes" ]]; then
    echo "⚠️  This will fix video watch time exports for all users"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

echo "✓ Starting deployment..."
echo ""

# Build frontend locally first
echo "1️⃣  Building frontend locally..."
cd /Users/yash/Documents/Projects/QSightsOrg2.0/frontend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Local build failed"
    exit 1
fi
echo "✓ Local build successful"
echo ""

# Backup current file on server
echo "2️⃣  Creating backup on server..."
ssh -i "$PEM_FILE" "$SERVER" "sudo cp $FRONTEND_PATH/$RESULTS_PAGE $FRONTEND_PATH/$RESULTS_PAGE.backup_$(date +%Y%m%d_%H%M%S)"
echo "✓ Backup created"
echo ""

# Upload the file
echo "3️⃣  Uploading updated file..."
scp -i "$PEM_FILE" "$RESULTS_PAGE" "$SERVER:/tmp/page.tsx"
ssh -i "$PEM_FILE" "$SERVER" "sudo mv /tmp/page.tsx $FRONTEND_PATH/$RESULTS_PAGE && sudo chown www-data:www-data $FRONTEND_PATH/$RESULTS_PAGE"
echo "✓ File uploaded"
echo ""

# Build on production server
echo "4️⃣  Building on production server..."
ssh -i "$PEM_FILE" "$SERVER" << 'ENDSSH'
cd /var/www/frontend
sudo -u www-data npm run build
if [ $? -ne 0 ]; then
    echo "❌ Production build failed"
    exit 1
fi
echo "✓ Production build successful"
ENDSSH
echo ""

# Restart PM2
echo "5️⃣  Restarting frontend service..."
ssh -i "$PEM_FILE" "$SERVER" "pm2 restart qsights-frontend"
echo "✓ Frontend restarted"
echo ""

#Wait for service to be online
echo "6️⃣  Waiting for service to come online..."
sleep 3
PM2_STATUS=$(ssh -i "$PEM_FILE" "$SERVER" "pm2 status qsights-frontend | grep 'online' || echo 'offline'")
if [[ $PM2_STATUS == *"online"* ]]; then
    echo "✓ Service is online"
else
    echo "⚠️  Service status unclear - please check manually"
fi
echo ""

echo "=========================================="
echo "✅ VIDEO EXPORT FIX DEPLOYED"
echo "=========================================="
echo ""
echo "What was fixed:"
echo "  • Video logs now load for ALL users (registered + anonymous)"
echo "  • Export matches video data by multiple keys"
echo "  • CSV/Excel/PDF exports include video watch time"
echo ""
echo "Test the fix:"
echo "  1. Go to Activity Results page"
echo "  2. Export as CSV or Excel"
echo "  3. Check for 'Video Watch Duration' columns"
echo "  4. Verify anonymous users have data populated"
echo ""
