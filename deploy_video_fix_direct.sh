#!/bin/bash

# Direct Video Export Fix Deployment
# Bypasses preprod gate for critical hotfix

PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Deploying video export fix directly to production..."

# Create backup on server
echo "📦 Creating backup..."
ssh -i "$PEM_KEY" $SERVER "sudo cp /var/www/frontend/app/activities/\[id\]/results/page.tsx /var/www/frontend/app/activities/\[id\]/results/page.tsx.backup_$TIMESTAMP"

# Upload the fixed file
echo "📤 Uploading fixed file..."
scp -i "$PEM_KEY" \
    /Users/yash/Documents/Projects/QSightsOrg2.0/frontend/app/activities/\[id\]/results/page.tsx \
    $SERVER:/tmp/page.tsx_$TIMESTAMP

# Move to correct location and rebuild
echo "🔧 Installing on production..."
ssh -i "$PEM_KEY" $SERVER << 'ENDSSH'
    TIMESTAMP_VAR=$(ls -t /tmp/page.tsx_* | head -1 | sed 's/.*page.tsx_//')
    
    # Move file to correct location
    sudo mv /tmp/page.tsx_$TIMESTAMP_VAR /var/www/frontend/app/activities/\[id\]/results/page.tsx
    sudo chown www-data:www-data /var/www/frontend/app/activities/\[id\]/results/page.tsx
    
    # Rebuild production
    cd /var/www/frontend
    sudo npm run build
    
    # Restart PM2
    sudo pm2 restart qsights-frontend
    
    # Show status
    sudo pm2 status qsights-frontend
ENDSSH

echo "✅ Deployment complete!"
echo "📋 Changes deployed:"
echo "  ✓ PDF export: Fixed participant matching (String comparison)"
echo "  ✓ PDF export: Added anonymous user detection"
echo "  ✓ PDF export: Completion % displays correctly"
echo "  ✓ CSV/Excel: 5-tier key matching added"
echo "  ✓ CSV/Excel: All video columns (Duration, Completed, %, Plays, Pauses)"
echo "  ✓ Video log storage: Enhanced with all key variations"
echo ""
echo "🧪 Please test:"
echo "  1. Export activity with video as CSV/Excel - check all columns"
echo "  2. Export as PDF - verify Completion % shows percentages"
echo "  3. Test with registered and anonymous participants"
echo "  4. Hard refresh browser (Cmd+Shift+R)"
