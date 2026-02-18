#!/bin/bash
# Deploy Thank You Video Fix to Production
# Date: Feb 16, 2026

set -e

echo "=========================================="
echo "🚀 DEPLOYING THANK YOU VIDEO FIX"
echo "=========================================="
echo ""

# Configuration
SERVER_USER="ubuntu"
SERVER_IP="13.127.79.144"
PEM_KEY="/Users/yash/qsights-prod-new.pem"
REMOTE_PATH="/var/www/QSightsOrg2.0"

echo "📋 Files to deploy:"
echo "  1. frontend/app/activities/take/[id]/page.tsx (Thank you video display)"
echo "  2. frontend/app/questionnaires/[id]/page.tsx (Auto-save fix)"
echo ""

# Build frontend with minimal resources
echo "🔨 Building frontend (this may take a few minutes)..."
cd frontend
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build > /dev/null 2>&1 || {
    echo "❌ Build failed - trying alternative..."
    # Try building without cache
    rm -rf .next
    npm run build
}

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed - disk space issue"
    echo "Current disk usage:"
    df -h | grep -E "Filesystem|/dev/disk"
    exit 1
fi

cd ..

echo ""
echo "📤 Deploying to production..."

# Create temp directory for deployment
TEMP_DIR=$(mktemp -d)

# Copy files
echo "  • Copying files..."
cp "frontend/app/activities/take/[id]/page.tsx" "$TEMP_DIR/take_page.tsx"
cp "frontend/app/questionnaires/[id]/page.tsx" "$TEMP_DIR/questionnaire_page.tsx"

# Upload to server
echo "  • Uploading to server..."
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no \
    "$TEMP_DIR/take_page.tsx" \
    "$SERVER_USER@$SERVER_IP:/tmp/"

scp -i "$PEM_KEY" -o StrictHostKeyChecking=no \
    "$TEMP_DIR/questionnaire_page.tsx" \
    "$SERVER_USER@$SERVER_IP:/tmp/"

# Deploy on server
echo "  • Installing files on server..."
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
    set -e
    
    # Backup current files
    sudo cp "$REMOTE_PATH/frontend/app/activities/take/[id]/page.tsx" \
            "$REMOTE_PATH/frontend/app/activities/take/[id]/page.tsx.backup_$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
    
    sudo cp "$REMOTE_PATH/frontend/app/questionnaires/[id]/page.tsx" \
            "$REMOTE_PATH/frontend/app/questionnaires/[id]/page.tsx.backup_$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
    
    # Install new files
    sudo cp /tmp/take_page.tsx "$REMOTE_PATH/frontend/app/activities/take/[id]/page.tsx"
    sudo cp /tmp/questionnaire_page.tsx "$REMOTE_PATH/frontend/app/questionnaires/[id]/page.tsx"
    
    # Set permissions
    sudo chown -R www-data:www-data "$REMOTE_PATH/frontend/app"
    
    # Rebuild on server
    cd "$REMOTE_PATH/frontend"
    sudo -u www-data npm run build
    
    # Restart PM2
    pm2 restart qsights-frontend || true
    
    echo "✅ Deployment complete!"
ENDSSH

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "=========================================="
echo ""
echo "🎯 Next steps:"
echo "1. Open: https://prod.qsights.com/questionnaires/33"
echo "2. Scroll to 'Thank You Page Video' section"
echo "3. Upload a video"
echo "4. Preview and submit the questionnaire"
echo "5. Thank you video will display on the thank you page!"
echo ""
echo "🔍 Verify deployment:"
echo "  curl -sI https://prod.qsights.com | grep '200 OK'"
echo ""
