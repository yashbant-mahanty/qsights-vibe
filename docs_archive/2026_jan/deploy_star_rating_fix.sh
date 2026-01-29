#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
REMOTE_FRONTEND="/var/www/frontend"

echo -e "${GREEN}=== Deploying Star Rating Image Fix ===${NC}"

# Check PEM key exists
if [ ! -f "$PEM_KEY" ]; then
    echo -e "${RED}ERROR: PEM key not found at $PEM_KEY${NC}"
    exit 1
fi

echo -e "${YELLOW}1. Copying modified files to server...${NC}"

# Copy the three modified frontend files
scp -i "$PEM_KEY" \
    frontend/app/questionnaires/create/page.tsx \
    ${SERVER}:/tmp/questionnaire_create_page.tsx

scp -i "$PEM_KEY" \
    "frontend/app/questionnaires/[id]/page.tsx" \
    ${SERVER}:/tmp/questionnaire_edit_page.tsx

scp -i "$PEM_KEY" \
    frontend/components/S3ImageUpload.tsx \
    ${SERVER}:/tmp/S3ImageUpload.tsx

echo -e "${GREEN}✓ Files copied to /tmp on server${NC}"

echo -e "${YELLOW}2. Moving files to correct locations on server...${NC}"

ssh -i "$PEM_KEY" $SERVER << 'ENDSSH'
set -e

# Move files to correct locations with sudo
sudo cp /tmp/questionnaire_create_page.tsx /var/www/frontend/app/questionnaires/create/page.tsx
sudo cp /tmp/questionnaire_edit_page.tsx "/var/www/frontend/app/questionnaires/[id]/page.tsx"
sudo cp /tmp/S3ImageUpload.tsx /var/www/frontend/components/S3ImageUpload.tsx

# Set correct ownership
sudo chown -R www-data:www-data /var/www/frontend/app/questionnaires/
sudo chown www-data:www-data /var/www/frontend/components/S3ImageUpload.tsx

# Set correct permissions
sudo chmod 644 /var/www/frontend/app/questionnaires/create/page.tsx
sudo chmod 644 "/var/www/frontend/app/questionnaires/[id]/page.tsx"
sudo chmod 644 /var/www/frontend/components/S3ImageUpload.tsx

echo "✓ Files moved to production locations with correct permissions"
ENDSSH

echo -e "${GREEN}✓ Files deployed successfully${NC}"

echo -e "${YELLOW}3. Building frontend on server...${NC}"

ssh -i "$PEM_KEY" $SERVER << 'ENDSSH'
set -e

cd /var/www/frontend

# Build the frontend
echo "Building Next.js application..."
sudo -u www-data npm run build

echo "✓ Build completed successfully"
ENDSSH

echo -e "${GREEN}✓ Frontend built successfully${NC}"

echo -e "${YELLOW}4. Restarting PM2...${NC}"

ssh -i "$PEM_KEY" $SERVER << 'ENDSSH'
set -e

# Restart PM2
sudo pm2 restart qsights-frontend

# Wait for restart
sleep 3

# Check PM2 status
sudo pm2 list | grep qsights-frontend

echo "✓ PM2 restarted successfully"
ENDSSH

echo -e "${GREEN}✓ PM2 restarted${NC}"

echo -e "${YELLOW}5. Verifying deployment...${NC}"

ssh -i "$PEM_KEY" $SERVER << 'ENDSSH'
echo "Checking deployed files..."
ls -lh /var/www/frontend/app/questionnaires/create/page.tsx
ls -lh "/var/www/frontend/app/questionnaires/[id]/page.tsx"
ls -lh /var/www/frontend/components/S3ImageUpload.tsx

echo ""
echo "PM2 logs (last 10 lines):"
sudo pm2 logs qsights-frontend --lines 10 --nostream
ENDSSH

echo ""
echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo -e "${GREEN}Star Rating Image Display Fix has been deployed to LIVE${NC}"
echo -e "${YELLOW}Please test the questionnaire pages at https://prod.qsights.com${NC}"
