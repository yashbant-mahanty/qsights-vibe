#!/bin/bash

# QSights - Deploy Video Question to Edit Questionnaire Page
# Date: February 12, 2026
# Description: Adds Video question type support to /questionnaires/[id] edit page

set -e

echo "=========================================="
echo "  Video Question - Edit Page Deployment"
echo "  Date: $(date)"
echo "=========================================="

PEM_FILE="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
FRONTEND_PATH="/var/www/frontend"
LOCAL_FRONTEND="/Users/yash/Documents/Projects/QSightsOrg2.0/frontend"

echo ""
echo "✅ Step 1: Upload updated edit page..."
scp -i "$PEM_FILE" \
  "$LOCAL_FRONTEND/app/questionnaires/[id]/page.tsx" \
  "$SERVER:/tmp/questionnaire_edit_page.tsx"

echo ""
echo "✅ Step 2: Backup and deploy edit page..."
ssh -i "$PEM_FILE" "$SERVER" << 'ENDSSH'
  cd /var/www/frontend
  
  # Backup existing file
  if [ -f "app/questionnaires/[id]/page.tsx" ]; then
    echo "Backing up existing edit page..."
    sudo cp app/questionnaires/[id]/page.tsx app/questionnaires/[id]/page.tsx.backup.$(date +%Y%m%d_%H%M%S)
  fi
  
  # Deploy new file
  echo "Deploying updated edit page..."
  sudo mv /tmp/questionnaire_edit_page.tsx app/questionnaires/[id]/page.tsx
  sudo chown ubuntu:ubuntu app/questionnaires/[id]/page.tsx
  
  echo "✓ Edit page deployed successfully"
ENDSSH

echo ""
echo "✅ Step 3: Rebuild frontend..."
ssh -i "$PEM_FILE" "$SERVER" << 'ENDSSH'
  cd /var/www/frontend
  
  # Fix permissions
  if [ -d ".next" ]; then
    echo "Fixing .next directory permissions..."
    sudo chown -R ubuntu:ubuntu .next/
  fi
  
  # Clean cache
  echo "Cleaning build cache..."
  rm -rf .next/cache
  
  # Build
  echo "Building frontend..."
  npm run build
  
  if [ $? -eq 0 ]; then
    echo "✓ Build completed successfully"
    
    # Get BUILD_ID
    if [ -f ".next/BUILD_ID" ]; then
      BUILD_ID=$(cat .next/BUILD_ID)
      echo "✓ New BUILD_ID: $BUILD_ID"
    fi
  else
    echo "✗ Build failed"
    exit 1
  fi
ENDSSH

echo ""
echo "✅ Step 4: Restart PM2..."
ssh -i "$PEM_FILE" "$SERVER" << 'ENDSSH'
  pm2 restart qsights-frontend
  sleep 2
  pm2 list | grep qsights-frontend
ENDSSH

echo ""
echo "=========================================="
echo "  ✓ DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "📋 VERIFICATION CHECKLIST:"
echo "  1. Navigate to: /questionnaires/[id]?mode=edit"
echo "  2. Click 'Add Question' button"
echo "  3. Verify 'Video' option appears in question types (purple icon)"
echo "  4. Select Video question type"
echo "  5. Upload a test video file"
echo "  6. Toggle 'Mandatory Watch' setting"
echo "  7. Select playback mode (Inline/New Tab)"
echo "  8. Save questionnaire and verify video settings persist"
echo ""
echo "⚠️  IMPORTANT: Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)"
echo ""
