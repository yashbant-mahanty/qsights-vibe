#!/bin/bash

# Comprehensive Video Export Fix - Feb 14, 2026
# Fixes: PDF Completion %, CSV/Excel Video Completion % and Pause Count
# Enhanced: Multi-key matching for all participant types (registered + anonymous)

echo "🚀 Starting comprehensive video export fix deployment..."

# Configuration
REMOTE_HOST="ubuntu@13.126.210.220"
REMOTE_DIR="/var/www/frontend"
LOCAL_DIR="/Users/yash/Documents/Projects/QSightsOrg2.0/frontend"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup on server
echo "📦 Creating backup on server..."
ssh $REMOTE_HOST "cd $REMOTE_DIR && sudo cp app/activities/\[id\]/results/page.tsx app/activities/\[id\]/results/page.tsx.backup_$TIMESTAMP"

echo "🔨 Building locally..."
cd "$LOCAL_DIR"
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Local build successful"
    
    echo "📤 Uploading files to server..."
    scp -r app/ $REMOTE_HOST:/tmp/frontend_deploy_$TIMESTAMP/
    
    echo "🔄 Moving files on server..."
    ssh $REMOTE_HOST << 'ENDSSH'
        cd /tmp/frontend_deploy_*
        sudo cp -r app/ /var/www/frontend/
        sudo chown -R www-data:www-data /var/www/frontend/app/
        cd /var/www/frontend && sudo npm run build
        sudo pm2 restart qsights-frontend
        rm -rf /tmp/frontend_deploy_*
ENDSSH

    echo "✅ Deployment complete!"
    echo "🔍 Verifying PM2 status..."
    ssh $REMOTE_HOST "sudo pm2 status qsights-frontend"
    
    echo ""
    echo "✨ Comprehensive video export fix deployed successfully!"
    echo "📋 Changes:"
    echo "  ✓ PDF export: Fixed participant matching with String comparison"
    echo "  ✓ PDF export: Added anonymous user detection"
    echo "  ✓ PDF export: Ensured Completion % displays correctly"
    echo "  ✓ CSV/Excel: Added 5-tier key matching (numeric, string, guest_identifier)"
    echo "  ✓ CSV/Excel: All video columns included (Duration, Completed, %, Plays, Pauses)"
    echo "  ✓ Video log storage: Enhanced with all key variations for maximum compatibility"
    echo ""
    echo "🧪 Testing checklist:"
    echo "  1. Export activity with video as CSV - verify all 5 video columns appear"
    echo "  2. Check Video Completion % and Video Pause Count columns have data"
    echo "  3. Export as Excel - verify same columns and data"
    echo "  4. Export as PDF - verify video table shows Completion % with percentages"
    echo "  5. Verify both registered and anonymous participants show video data"
    echo ""
    echo "💡 Note: Hard refresh browser (Cmd+Shift+R) to clear cache"
    
else
    echo "❌ Local build failed. Deployment aborted."
    exit 1
fi
