#!/bin/bash
# Thank You Video - PRODUCTION DEPLOYMENT
# Using CORRECT paths based on production structure
set -e

PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER_IP="13.126.210.220"
SERVER_USER="ubuntu"
FRONTEND_PATH="/var/www/frontend"  # ← CORRECT production path
BACKEND_PATH="/var/www/QSightsOrg2.0/backend"  # ← CORRECT backend path

echo "🚀 PRODUCTION DEPLOYMENT - Thank You Video Fix"
echo "=============================================="
echo "Server: $SERVER_IP"
echo "Frontend Path: $FRONTEND_PATH (CORRECT)"
echo "Backend Path: $BACKEND_PATH (CORRECT)"
echo ""
echo "Changes:"
echo "  ✓ Thank you video display on take page"
echo "  ✓ Auto-save warning fix in questionnaire editor"
echo ""
read -p "Deploy to PRODUCTION? Type YES: " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "❌ Cancelled"
    exit 0
fi

# 1. Upload files to /tmp (avoids permission issues)
echo ""
echo "📤 Step 1: Uploading files to server..."
scp -i "$PEM_KEY" \
    "frontend/app/activities/take/[id]/page.tsx" \
    "$SERVER_USER@$SERVER_IP:/tmp/take_page.tsx" || exit 1

scp -i "$PEM_KEY" \
    "frontend/app/questionnaires/[id]/page.tsx" \
    "$SERVER_USER@$SERVER_IP:/tmp/questionnaire_page.tsx" || exit 1

echo "✅ Files uploaded to /tmp"

# 2. Deploy on server using CORRECT paths
echo ""
echo "🔧 Step 2: Deploying files (using correct paths)..."
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" bash << 'ENDSSH'
    set -e
    
    FRONTEND_PATH="/var/www/frontend"  # ← CORRECT path where PM2 runs from
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    echo "  • Creating backups..."
    sudo cp "$FRONTEND_PATH/app/activities/take/[id]/page.tsx" \
            "$FRONTEND_PATH/app/activities/take/[id]/page.tsx.backup_$TIMESTAMP" 2>/dev/null || true
    
    sudo cp "$FRONTEND_PATH/app/questionnaires/[id]/page.tsx" \
            "$FRONTEND_PATH/app/questionnaires/[id]/page.tsx.backup_$TIMESTAMP" 2>/dev/null || true
    
    echo "  • Installing new files to $FRONTEND_PATH..."
    sudo cp /tmp/take_page.tsx "$FRONTEND_PATH/app/activities/take/[id]/page.tsx"
    sudo cp /tmp/questionnaire_page.tsx "$FRONTEND_PATH/app/questionnaires/[id]/page.tsx"
    
    echo "  • Setting permissions..."
    sudo chown -R www-data:www-data "$FRONTEND_PATH/app"
    
    echo "  • Cleaning build cache..."
    cd "$FRONTEND_PATH"
    sudo rm -rf .next
    sudo mkdir -p .next
    sudo chown -R www-data:www-data .next
    
    echo "  • Building with correct permissions (2-3 minutes)..."
    sudo -u www-data npm run build
    
    if [ ! -f ".next/BUILD_ID" ]; then
        echo "❌ ERROR: BUILD_ID missing! Build failed!"
        exit 1
    fi
    
    echo "  • Restarting PM2..."
    pm2 restart qsights-frontend
    pm2 save
    
    echo "✅ Deployment complete!"
ENDSSH

# 3. Verify deployment
echo ""
echo "🔍 Step 3: Verifying deployment..."
sleep 3
HEALTH_CHECK=$(curl -sI https://prod.qsights.com | head -1)
if echo "$HEALTH_CHECK" | grep -q "200"; then
    echo "✅ Health check passed: $HEALTH_CHECK"
else
    echo "⚠️  Health check: $HEALTH_CHECK"
fi

echo ""
echo "=============================================="
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "=============================================="
echo ""
echo "🎯 VERIFY NOW:"
echo ""
echo "1. Auto-save warning fix:"
echo "   • Open: https://prod.qsights.com/questionnaires/33"
echo "   • The intro video auto-save warning should be GONE"
echo "   • Hard refresh (Cmd+Shift+R) to clear cache"
echo ""
echo "2. Upload thank you video:"
echo "   • Scroll to 'Thank You Page Video' section"
echo "   • Toggle 'Enable Thank You Video' to ON"
echo "   • Upload video file (MP4/WEBM, max 100MB)"
echo "   • Should see: 'Video Saved' (green checkmark)"
echo "   • Should NOT see: 'Failed to auto-save' warning"
echo ""
echo "3. Test thank you video display:"
echo "   • Click 'Preview' button"
echo "   • Fill and submit questionnaire"
echo "   • Thank you page should show:"
echo "     ✓ Success message"
echo "     ✓ 'Thank You Message' card"
echo "     ✓ Video player with controls"
echo ""
echo "4. Console check:"
echo "   • Open browser console (F12)"
echo "   • Look for: 'Loaded thank you video: {...}'"
echo "   • Should see video_url, display_mode, etc."
echo ""
echo "🔧 If issues occur:"
echo "   ssh -i $PEM_KEY ubuntu@$SERVER_IP"
echo "   pm2 logs qsights-frontend"
echo ""
