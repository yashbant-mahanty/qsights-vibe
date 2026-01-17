#!/bin/bash

# QSights System Settings Fix Deployment Script
# This deploys the fixed system settings page and backend controller

set -e

echo "======================================"
echo "QSights System Settings Fix Deployment"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PEM_FILE="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
INSTANCE_ID="i-0de19fdf0bd6568b5"
LOCAL_PORT=3323
PROJECT_DIR="/Users/yash/Documents/Projects/QSightsOrg2.0"

# Start SSM Port Forwarding
echo -e "${GREEN}Starting AWS SSM port forwarding...${NC}"
aws ssm start-session \
  --target $INSTANCE_ID \
  --document-name AWS-StartPortForwardingSession \
  --parameters "localPortNumber=$LOCAL_PORT,portNumber=22" &

SSM_PID=$!
echo "SSM PID: $SSM_PID"
sleep 8

# Upload frontend file
echo -e "${GREEN}Uploading frontend system settings page...${NC}"
scp -o StrictHostKeyChecking=no -P $LOCAL_PORT -i $PEM_FILE \
  "$PROJECT_DIR/frontend/app/settings/system/page.tsx" \
  "ubuntu@127.0.0.1:/tmp/system_page.tsx"

# Upload backend controller
echo -e "${GREEN}Uploading backend SystemSettingsController...${NC}"
scp -o StrictHostKeyChecking=no -P $LOCAL_PORT -i $PEM_FILE \
  "$PROJECT_DIR/backend/app/Http/Controllers/Api/SystemSettingsController.php" \
  "ubuntu@127.0.0.1:/tmp/SystemSettingsController.php"

# Upload seeder
echo -e "${GREEN}Uploading SystemSettingsSeeder...${NC}"
scp -o StrictHostKeyChecking=no -P $LOCAL_PORT -i $PEM_FILE \
  "$PROJECT_DIR/backend/database/seeders/SystemSettingsSeeder.php" \
  "ubuntu@127.0.0.1:/tmp/SystemSettingsSeeder.php"

# SSH and execute commands
echo -e "${GREEN}Connecting to server and deploying files...${NC}"
ssh -o StrictHostKeyChecking=no -p $LOCAL_PORT -i $PEM_FILE ubuntu@127.0.0.1 << 'ENDSSH'

set -e

echo "Moving files to production locations..."

# Frontend
sudo mv /tmp/system_page.tsx /var/www/frontend/app/settings/system/page.tsx
sudo chown ubuntu:ubuntu /var/www/frontend/app/settings/system/page.tsx

# Backend
sudo mv /tmp/SystemSettingsController.php /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/SystemSettingsController.php
sudo chown www-data:www-data /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/SystemSettingsController.php

# Seeder
sudo mv /tmp/SystemSettingsSeeder.php /var/www/QSightsOrg2.0/backend/database/seeders/SystemSettingsSeeder.php
sudo chown www-data:www-data /var/www/QSightsOrg2.0/backend/database/seeders/SystemSettingsSeeder.php

echo "Running database seeder..."
cd /var/www/QSightsOrg2.0/backend
php artisan db:seed --class=SystemSettingsSeeder --force

echo "Rebuilding frontend..."
cd /var/www/frontend
rm -rf .next
npm run build

echo "Restarting PM2..."
pm2 restart all
pm2 status

echo "Clearing Laravel cache..."
cd /var/www/QSightsOrg2.0/backend
php artisan cache:clear
php artisan config:clear

echo "Deployment complete!"

ENDSSH

# Kill SSM session
echo -e "${GREEN}Killing SSM session...${NC}"
kill $SSM_PID 2>/dev/null || true

echo -e "${GREEN}======================================"
echo "Deployment completed successfully!"
echo "======================================${NC}"
echo ""
echo "Next steps:"
echo "1. Visit https://prod.qsights.com/settings/system"
echo "2. Verify SendGrid settings are loaded"
echo "3. Test the email configuration"

