#!/bin/bash

# Image Sequence Feature Deployment Script
# Deploys backend (Question model, S3UploadController, routes) and frontend (SliderScale, DialGauge)

set -e

echo "========================================="
echo "IMAGE SEQUENCE FEATURE DEPLOYMENT"
echo "========================================="
echo ""

# Configuration
REMOTE_USER="ubuntu"
REMOTE_HOST="13.126.210.220"
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
BACKEND_PATH="/var/www/QSightsOrg2.0/backend"
FRONTEND_PATH="/var/www/QSightsOrg2.0/frontend"

echo "🔄 Step 1: Creating backup checkpoint on production..."
ssh -i "$PEM_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
cd /var/www/QSightsOrg2.0
tar -czf "BACKUP_BEFORE_IMAGE_SEQUENCE_$(date +%Y%m%d_%H%M%S).tar.gz" \
  backend/app/Models/Question.php \
  backend/app/Http/Controllers/Api/S3UploadController.php \
  backend/routes/api.php \
  frontend/components/questions/SliderScale.tsx \
  frontend/components/questions/DialGauge.tsx \
  2>/dev/null || echo "Note: Some files may not exist yet"
echo "✅ Backup created"
EOF

echo ""
echo "📤 Step 2: Uploading backend files to temp directory..."
scp -i "$PEM_KEY" \
  backend/app/Models/Question.php \
  "$REMOTE_USER@$REMOTE_HOST:/tmp/Question.php"

scp -i "$PEM_KEY" \
  backend/app/Http/Controllers/Api/S3UploadController.php \
  "$REMOTE_USER@$REMOTE_HOST:/tmp/S3UploadController.php"

scp -i "$PEM_KEY" \
  backend/routes/api.php \
  "$REMOTE_USER@$REMOTE_HOST:/tmp/api.php"

echo "✅ Backend files uploaded to temp"

echo ""
echo "📂 Step 3: Moving backend files to correct locations..."
ssh -i "$PEM_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
sudo mv /tmp/Question.php /var/www/QSightsOrg2.0/backend/app/Models/Question.php
sudo mv /tmp/S3UploadController.php /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/S3UploadController.php
sudo mv /tmp/api.php /var/www/QSightsOrg2.0/backend/routes/api.php
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend/app/Models/
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/
sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend/routes/
echo "✅ Backend files moved to production"
EOF

echo ""
echo "📤 Step 4: Uploading frontend files to temp directory..."
scp -i "$PEM_KEY" \
  frontend/components/questions/SliderScale.tsx \
  "$REMOTE_USER@$REMOTE_HOST:/tmp/SliderScale.tsx"

scp -i "$PEM_KEY" \
  frontend/components/questions/DialGauge.tsx \
  "$REMOTE_USER@$REMOTE_HOST:/tmp/DialGauge.tsx"

echo "✅ Frontend files uploaded to temp"

echo ""
echo "📂 Step 5: Moving frontend files to correct locations..."
ssh -i "$PEM_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
sudo mv /tmp/SliderScale.tsx /var/www/QSightsOrg2.0/frontend/components/questions/SliderScale.tsx
sudo mv /tmp/DialGauge.tsx /var/www/QSightsOrg2.0/frontend/components/questions/DialGauge.tsx
sudo chown -R ubuntu:ubuntu /var/www/QSightsOrg2.0/frontend/components/questions/
echo "✅ Frontend files moved to production"
EOF

echo ""
echo "🔨 Step 6: Building Next.js on production..."
ssh -i "$PEM_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
cd /var/www/QSightsOrg2.0/frontend
echo "Building Next.js..."
npm run build
echo "✅ Build completed"
EOF

echo ""
echo "🔄 Step 7: Restarting PM2..."
ssh -i "$PEM_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
pm2 restart qsights-frontend
echo "✅ PM2 restarted"
EOF

echo ""
echo "🧹 Step 8: Clearing caches..."
ssh -i "$PEM_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
cd /var/www/QSightsOrg2.0/backend
php artisan config:clear
php artisan route:clear
php artisan cache:clear
echo "✅ Laravel caches cleared"
EOF

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "📋 What was deployed:"
echo "   - Question model: sequenceImages presigned URL support"
echo "   - S3UploadController: bulk upload endpoint (/api/uploads/s3/bulk)"
echo "   - API routes: POST /api/uploads/s3/bulk"
echo "   - SliderScale: interactive image highlighting"
echo "   - DialGauge: interactive image highlighting"
echo ""
echo "🧪 Next steps:"
echo "   1. Test bulk upload API with Postman/curl"
echo "   2. Test SliderScale with sequence images"
echo "   3. Test DialGauge with sequence images"
echo "   4. Build UI for bulk upload in questionnaire builder"
echo ""
echo "========================================="
