#!/bin/bash
# CRITICAL FIX - Thank You Video Deployment
# Direct deployment to production (emergency fix)

set -e

PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER_IP="13.126.210.220"
SERVER_USER="ubuntu"

echo "🚨 EMERGENCY DEPLOYMENT - Thank You Video Fix"
echo "=============================================="
echo ""
echo "Changes:"
echo "  1. Thank you video display on take page"
echo "  2. Fix auto-save warning in questionnaire editor"
echo ""
read -p "Deploy to PRODUCTION? Type YES: " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "Cancelled"
    exit 0
fi

# Upload files
echo "📤 Uploading files..."
scp -i "$PEM_KEY" \
    "frontend/app/activities/take/[id]/page.tsx" \
    "$SERVER_USER@$SERVER_IP:/tmp/take_page.tsx" || exit 1

scp -i "$PEM_KEY" \
    "frontend/app/questionnaires/[id]/page.tsx" \
    "$SERVER_USER@$SERVER_IP:/tmp/questionnaire_page.tsx" || exit 1

echo "✅ Files uploaded"
echo ""

# Deploy on server
echo "🔧 Deploying on server..."
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" bash << 'EOF'
    set -e
    cd /var/www/QSightsOrg2.0
    
    # Backup
    echo "  • Creating backup..."
    sudo cp "frontend/app/activities/take/[id]/page.tsx" "frontend/app/activities/take/[id]/page.tsx.backup_$(date +%Y%m%d_%H%M%S)" || true
    sudo cp "frontend/app/questionnaires/[id]/page.tsx" "frontend/app/questionnaires/[id]/page.tsx.backup_$(date +%Y%m%d_%H%M%S)" || true
    
    # Install new files
    echo "  • Installing files..."
    sudo cp /tmp/take_page.tsx "frontend/app/activities/take/[id]/page.tsx"
    sudo cp /tmp/questionnaire_page.tsx "frontend/app/questionnaires/[id]/page.tsx"
    sudo chown -R www-data:www-data frontend/app
    
    # Clean and rebuild
    echo "  • Cleaning build cache..."
    cd frontend
    sudo rm -rf .next
    
    echo "  • Building (this takes 2-3 minutes)..."
    sudo -u www-data npm run build
    
    # Restart
    echo "  • Restarting application..."
    pm2 restart qsights-frontend || true
    
    echo "✅ Deployment complete!"
EOF

echo ""
echo "=============================================="
echo "✅ DEPLOYED TO PRODUCTION!"
echo "=============================================="
echo ""
echo "🔍 Verify now:"
echo "  1. Open: https://prod.qsights.com/questionnaires/33"
echo "  2. The intro video auto-save warning should be FIXED"
echo "  3. Upload a thank you video"
echo "  4. Submit the questionnaire"
echo "  5. Thank you video will display on thank you page!"
echo ""
