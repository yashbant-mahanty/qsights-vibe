#!/bin/bash

# Complete Image Sequence Feature Deployment (with Builder UI)
# Deploys backend + frontend components + builder UI

set -e

echo "========================================="
echo "IMAGE SEQUENCE FEATURE - FULL DEPLOYMENT"
echo "========================================="
echo ""

# Configuration
REMOTE_USER="ubuntu"
REMOTE_HOST="13.126.210.220"
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"

echo "📤 Step 1: Uploading all files to temp directory..."
scp -i "$PEM_KEY" \
  backend/app/Models/Question.php \
  "$REMOTE_USER@$REMOTE_HOST:/tmp/Question.php"

scp -i "$PEM_KEY" \
  backend/app/Http/Controllers/Api/S3UploadController.php \
  "$REMOTE_USER@$REMOTE_HOST:/tmp/S3UploadController.php"

scp -i "$PEM_KEY" \
  backend/routes/api.php \
  "$REMOTE_USER@$REMOTE_HOST:/tmp/api.php"

scp -i "$PEM_KEY" \
  frontend/components/questions/SliderScale.tsx \
  "$REMOTE_USER@$REMOTE_HOST:/tmp/SliderScale.tsx"

scp -i "$PEM_KEY" \
  frontend/components/questions/DialGauge.tsx \
  "$REMOTE_USER@$REMOTE_HOST:/tmp/DialGauge.tsx"

scp -i "$PEM_KEY" \
  frontend/components/BulkImageUpload.tsx \
  "$REMOTE_USER@$REMOTE_HOST:/tmp/BulkImageUpload.tsx"

scp -i "$PEM_KEY" \
  frontend/app/questionnaires/create/page.tsx \
  "$REMOTE_USER@$REMOTE_HOST:/tmp/questionnaire_create.tsx"

echo "✅ All files uploaded to temp"

echo ""
echo "📂 Step 2: Moving files to production locations..."
ssh -i "$PEM_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
# Backend files
sudo mv /tmp/Question.php /var/www/QSightsOrg2.0/backend/app/Models/Question.php
sudo mv /tmp/S3UploadController.php /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/S3UploadController.php
sudo mv /tmp/api.php /var/www/QSightsOrg2.0/backend/routes/api.php
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend/

# Frontend files
sudo mv /tmp/SliderScale.tsx /var/www/QSightsOrg2.0/frontend/components/questions/SliderScale.tsx
sudo mv /tmp/DialGauge.tsx /var/www/QSightsOrg2.0/frontend/components/questions/DialGauge.tsx
sudo mv /tmp/BulkImageUpload.tsx /var/www/QSightsOrg2.0/frontend/components/BulkImageUpload.tsx
sudo mv /tmp/questionnaire_create.tsx /var/www/QSightsOrg2.0/frontend/app/questionnaires/create/page.tsx
sudo chown -R ubuntu:ubuntu /var/www/QSightsOrg2.0/frontend/

echo "✅ Files moved to production"
EOF

echo ""
echo "🔨 Step 3: Building Next.js on production..."
ssh -i "$PEM_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
cd /var/www/QSightsOrg2.0/frontend
sudo rm -rf .next
npm run build
echo "✅ Build completed"
EOF

echo ""
echo "🔄 Step 4: Restarting PM2..."
ssh -i "$PEM_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
pm2 restart qsights-frontend
echo "✅ PM2 restarted"
EOF

echo ""
echo "🧹 Step 5: Clearing Laravel caches..."
ssh -i "$PEM_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
cd /var/www/QSightsOrg2.0/backend
php artisan config:clear
php artisan route:clear
php artisan cache:clear
echo "✅ Caches cleared"
EOF

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "📋 What was deployed:"
echo "   Backend:"
echo "   - Question model with sequenceImages support"
echo "   - S3UploadController with bulk upload API"
echo "   - API route: POST /api/uploads/s3/bulk"
echo ""
echo "   Frontend:"
echo "   - SliderScale with sequence highlighting"
echo "   - DialGauge with sequence highlighting"
echo "   - BulkImageUpload component (NEW)"
echo "   - Questionnaire builder with bulk upload UI (NEW)"
echo ""
echo "🎉 You can now:"
echo "   1. Login to https://prod.qsights.com"
echo "   2. Create a new questionnaire"
echo "   3. Add SliderScale or DialGauge question"
echo "   4. Click 'Upload Sequence Images' button"
echo "   5. Upload 1-20 images"
echo "   6. Preview and test the interactive highlighting!"
echo ""
echo "========================================="
