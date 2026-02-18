#!/bin/bash
# ========================================
# CRITICAL FIX DEPLOYMENT - FEBRUARY 15, 2026
# Reference Save & Title Input Focus Fix
# ========================================
#
# FIXES:
# 1. Title input focus/anchoring issue - only allowing one character
# 2. Save questionnaire references not working (database table missing)
#
# CHANGES:
# - Frontend: IsolatedReferenceItem.tsx - Added IsolatedInput component for title/URL fields
# - Backend: Run migration for question_references table
#

set -e  # Exit on error

# Configuration
PEM="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
FRONTEND_LOCAL="/Users/yash/Documents/Projects/QSightsOrg2.0/frontend"
BACKEND_LOCAL="/Users/yash/Documents/Projects/QSightsOrg2.0/backend"
FRONTEND_REMOTE="/var/www/frontend"
BACKEND_REMOTE="/var/www/QSightsOrg2.0/backend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================"
echo "CRITICAL FIX DEPLOYMENT - FEB 15, 2026"
echo "Reference Save & Title Focus Fix"
echo -e "========================================${NC}\n"

# ========================================
# STEP 1: Pre-deployment Validation
# ========================================
echo -e "${YELLOW}[STEP 1/6] Pre-deployment Validation${NC}"

# Check PEM file exists
if [ ! -f "$PEM" ]; then
    echo -e "${RED}ERROR: PEM file not found at $PEM${NC}"
    exit 1
fi
echo "✓ PEM file exists"

# Check SSH connectivity
echo "Testing SSH connectivity..."
if ! ssh -i "$PEM" -o ConnectTimeout=10 "$SERVER" "echo 'SSH connected'" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Cannot connect to server${NC}"
    exit 1
fi
echo "✓ SSH connection successful"

# Verify local files exist
if [ ! -f "$FRONTEND_LOCAL/components/IsolatedReferenceItem.tsx" ]; then
    echo -e "${RED}ERROR: IsolatedReferenceItem.tsx not found${NC}"
    exit 1
fi
echo "✓ Local frontend files verified"

if [ ! -f "$BACKEND_LOCAL/database/migrations/2026_02_15_000001_create_question_references_table.php" ]; then
    echo -e "${RED}ERROR: Migration file not found${NC}"
    exit 1
fi
echo "✓ Migration file verified"

# ========================================
# STEP 2: Create Backup
# ========================================
echo -e "\n${YELLOW}[STEP 2/6] Creating Backup${NC}"

BACKUP_TIME=$(date +%Y%m%d_%H%M%S)
echo "Creating backup on server..."

ssh -i "$PEM" "$SERVER" << 'BACKUP_EOF'
# Create backup directory
BACKUP_DIR="/home/ubuntu/backups/feb_15_2026_reference_fix"
mkdir -p "$BACKUP_DIR"

# Backup frontend component
if [ -f "/var/www/frontend/components/IsolatedReferenceItem.tsx" ]; then
    cp /var/www/frontend/components/IsolatedReferenceItem.tsx "$BACKUP_DIR/"
    echo "✓ Frontend component backed up"
else
    echo "⚠ Frontend component doesn't exist yet (new file or first deploy)"
fi

# Backup current .next for rollback
cp -r /var/www/frontend/.next "$BACKUP_DIR/next_backup" 2>/dev/null || echo "⚠ No .next to backup"

echo "Backup complete at: $BACKUP_DIR"
BACKUP_EOF

echo "✓ Server backup created"

# ========================================
# STEP 3: Deploy Backend Migration & Model
# ========================================
echo -e "\n${YELLOW}[STEP 3/6] Deploying Backend Migration & Model${NC}"

# Copy migration file to server
echo "Uploading migration file..."
scp -i "$PEM" "$BACKEND_LOCAL/database/migrations/2026_02_15_000001_create_question_references_table.php" \
    "$SERVER:/tmp/2026_02_15_000001_create_question_references_table.php"

# Copy QuestionReference model
echo "Uploading QuestionReference model..."
scp -i "$PEM" "$BACKEND_LOCAL/app/Models/QuestionReference.php" \
    "$SERVER:/tmp/QuestionReference.php"

# Copy updated Question model (with references relationship)
echo "Uploading Question model..."
scp -i "$PEM" "$BACKEND_LOCAL/app/Models/Question.php" \
    "$SERVER:/tmp/Question.php"

# Move to correct location and run migration
ssh -i "$PEM" "$SERVER" << 'BACKEND_EOF'
set -e

# Move migration to backend
sudo cp /tmp/2026_02_15_000001_create_question_references_table.php \
    /var/www/QSightsOrg2.0/backend/database/migrations/
sudo chown www-data:www-data /var/www/QSightsOrg2.0/backend/database/migrations/2026_02_15_000001_create_question_references_table.php
echo "✓ Migration file deployed"

# Move QuestionReference model
sudo cp /tmp/QuestionReference.php /var/www/QSightsOrg2.0/backend/app/Models/
sudo chown www-data:www-data /var/www/QSightsOrg2.0/backend/app/Models/QuestionReference.php
echo "✓ QuestionReference model deployed"

# Move updated Question model
sudo cp /tmp/Question.php /var/www/QSightsOrg2.0/backend/app/Models/
sudo chown www-data:www-data /var/www/QSightsOrg2.0/backend/app/Models/Question.php
echo "✓ Question model deployed"

# Deploy QuestionReference model if needed
cd /var/www/QSightsOrg2.0/backend

# Run migration
echo "Running migration..."
sudo php artisan migrate --force
echo "✓ Migration completed successfully"

# Verify table exists
echo "Verifying table creation..."
sudo php artisan tinker --execute="echo Schema::hasTable('question_references') ? 'Table exists' : 'Table NOT found';"

# Clear caches
echo "Clearing backend caches..."
sudo php artisan config:clear
sudo php artisan cache:clear
sudo php artisan view:clear
echo "✓ Caches cleared"
BACKEND_EOF

echo "✓ Backend migration and models deployed"

# ========================================
# STEP 4: Deploy Frontend Fix
# ========================================
echo -e "\n${YELLOW}[STEP 4/6] Deploying Frontend Fix${NC}"

# Copy updated component
echo "Uploading IsolatedReferenceItem.tsx..."
scp -i "$PEM" "$FRONTEND_LOCAL/components/IsolatedReferenceItem.tsx" \
    "$SERVER:/tmp/IsolatedReferenceItem.tsx"

# Move and rebuild
ssh -i "$PEM" "$SERVER" << 'FRONTEND_EOF'
set -e

# Move component to correct location
sudo cp /tmp/IsolatedReferenceItem.tsx /var/www/frontend/components/
sudo chown www-data:www-data /var/www/frontend/components/IsolatedReferenceItem.tsx
echo "✓ Component file deployed"

# Navigate to frontend directory
cd /var/www/frontend

# Build frontend
echo "Building frontend (this may take a few minutes)..."
sudo npm run build

# Restart PM2
echo "Restarting PM2..."
pm2 restart all

# Wait for restart
sleep 5

# Check PM2 status
pm2 status
echo "✓ Frontend rebuilt and restarted"
FRONTEND_EOF

echo "✓ Frontend deployed and rebuilt"

# ========================================
# STEP 5: Verify Deployment
# ========================================
echo -e "\n${YELLOW}[STEP 5/6] Verifying Deployment${NC}"

# Check HTTP status
echo "Checking HTTP status..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://prod.qsights.com)
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✓ HTTP status: 200 OK"
else
    echo -e "${RED}⚠ HTTP status: $HTTP_STATUS${NC}"
fi

# Check PM2 status
echo "Checking PM2 status..."
ssh -i "$PEM" "$SERVER" "pm2 status"

# Verify database table
echo "Verifying question_references table..."
ssh -i "$PEM" "$SERVER" << 'VERIFY_EOF'
cd /var/www/QSightsOrg2.0/backend
sudo php artisan tinker --execute="
\$count = DB::table('question_references')->count();
echo \"question_references table row count: \" . \$count;
"
VERIFY_EOF

# ========================================
# STEP 6: Summary
# ========================================
echo -e "\n${GREEN}========================================"
echo "DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "FIXES DEPLOYED:"
echo "1. ✓ Title input focus issue - IsolatedInput component"
echo "2. ✓ Reference save issue - question_references table"
echo ""
echo "TESTING CHECKLIST:"
echo "[ ] Go to https://prod.qsights.com"
echo "[ ] Edit a questionnaire"
echo "[ ] Expand a question and open References section"
echo "[ ] Add a new reference"
echo "[ ] Type in the Title field - should NOT lose focus"
echo "[ ] Save the questionnaire"
echo "[ ] Reload the page"
echo "[ ] Verify references are still there"
echo ""
echo "ROLLBACK COMMAND (if needed):"
echo "  ssh -i $PEM $SERVER"
echo "  cp /home/ubuntu/backups/feb_15_2026_reference_fix/* /var/www/frontend/components/"
echo "  cd /var/www/frontend && sudo npm run build && pm2 restart all"
echo -e "========================================${NC}"
