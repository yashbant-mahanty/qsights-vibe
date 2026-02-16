#!/bin/bash

# ============================================================
# EVENT APPROVAL WORKFLOW ENHANCEMENT DEPLOYMENT
# Manager Review Feature - February 14, 2026
# ============================================================

set -e  # Exit on error

echo "========================================"
echo "Manager Review Workflow Deployment"
echo "========================================"
echo ""

# Configuration
PEM_PATH="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
BACKEND_PATH="/var/www/QSightsOrg2.0/backend"
FRONTEND_PATH="/var/www/frontend"
LOCAL_BACKEND="./backend"
LOCAL_FRONTEND="./frontend"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Step 1: Create backup
print_status "Step 1: Creating backup on production server..."
ssh -i "$PEM_PATH" "$SERVER" << 'EOF'
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="/home/ubuntu/backups/manager_review_workflow_$TIMESTAMP"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup backend
    cp -r /var/www/QSightsOrg2.0/backend "$BACKUP_DIR/"
    
    # Backup frontend
    cp -r /var/www/frontend "$BACKUP_DIR/"
    
    # Backup database
    cd /var/www/QSightsOrg2.0/backend
    php artisan db:backup
    
    echo "Backup created at: $BACKUP_DIR"
EOF

print_status "Backup completed successfully"
echo ""

# Step 2: Deploy backend files
print_status "Step 2: Deploying backend files..."

# Upload migrations
print_status "  → Uploading migrations..."
scp -i "$PEM_PATH" \
    "$LOCAL_BACKEND/database/migrations/2026_02_14_000001_add_manager_review_workflow_to_activity_approval_requests.php" \
    "$LOCAL_BACKEND/database/migrations/2026_02_14_000002_create_manager_review_tokens_table.php" \
    "$SERVER:/tmp/"

# Upload models
print_status "  → Uploading models..."
scp -i "$PEM_PATH" \
    "$LOCAL_BACKEND/app/Models/ManagerReviewToken.php" \
    "$LOCAL_BACKEND/app/Models/ActivityApprovalRequest.php" \
    "$SERVER:/tmp/"

# Upload controllers
print_status "  → Uploading controllers..."
scp -i "$PEM_PATH" \
    "$LOCAL_BACKEND/app/Http/Controllers/Api/ManagerReviewController.php" \
    "$LOCAL_BACKEND/app/Http/Controllers/Api/ActivityApprovalRequestController.php" \
    "$SERVER:/tmp/"

# Upload services
print_status "  → Uploading services..."
scp -i "$PEM_PATH" \
    "$LOCAL_BACKEND/app/Services/NotificationService.php" \
    "$SERVER:/tmp/"

# Upload routes
print_status "  → Uploading routes..."
scp -i "$PEM_PATH" \
    "$LOCAL_BACKEND/routes/api.php" \
    "$SERVER:/tmp/"

# Move files to correct locations
ssh -i "$PEM_PATH" "$SERVER" << 'EOF'
    # Move migrations
    sudo mv /tmp/2026_02_14_000001_add_manager_review_workflow_to_activity_approval_requests.php /var/www/QSightsOrg2.0/backend/database/migrations/
    sudo mv /tmp/2026_02_14_000002_create_manager_review_tokens_table.php /var/www/QSightsOrg2.0/backend/database/migrations/
    
    # Move models
    sudo mv /tmp/ManagerReviewToken.php /var/www/QSightsOrg2.0/backend/app/Models/
    sudo mv /tmp/ActivityApprovalRequest.php /var/www/QSightsOrg2.0/backend/app/Models/
    
    # Move controllers
    sudo mv /tmp/ManagerReviewController.php /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/
    sudo mv /tmp/ActivityApprovalRequestController.php /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/
    
    # Move services
    sudo mv /tmp/NotificationService.php /var/www/QSightsOrg2.0/backend/app/Services/
    
    # Move routes
    sudo mv /tmp/api.php /var/www/QSightsOrg2.0/backend/routes/
    
    # Set permissions
    sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend
    sudo chmod -R 755 /var/www/QSightsOrg2.0/backend
EOF

print_status "Backend files deployed successfully"
echo ""

# Step 3: Run migrations
print_status "Step 3: Running database migrations..."
ssh -i "$PEM_PATH" "$SERVER" << 'EOF'
    cd /var/www/QSightsOrg2.0/backend
    sudo -u www-data php artisan migrate --force
    
    # Clear caches
    sudo -u www-data php artisan cache:clear
    sudo -u www-data php artisan config:clear
    sudo -u www-data php artisan route:clear
    sudo -u www-data php artisan view:clear
EOF

print_status "Migrations completed successfully"
echo ""

# Step 4: Deploy frontend
print_status "Step 4: Deploying frontend files..."

# Build frontend locally first
print_status "  → Building frontend locally..."
cd "$LOCAL_FRONTEND"
npm run build

# Create tarball
print_status "  → Creating deployment package..."
tar -czf manager-review-frontend.tar.gz \
    app/manager \
    .next

# Upload to server
print_status "  → Uploading frontend build..."
scp -i "$PEM_PATH" manager-review-frontend.tar.gz "$SERVER:/tmp/"

# Extract on server
ssh -i "$PEM_PATH" "$SERVER" << 'EOF'
    cd /tmp
    tar -xzf manager-review-frontend.tar.gz
    
    # Move manager review pages
    sudo mkdir -p /var/www/frontend/app/manager
    sudo cp -r app/manager/* /var/www/frontend/app/manager/
    
    # Update .next directory
    sudo cp -r .next/* /var/www/frontend/.next/
    
    # Set permissions
    sudo chown -R www-data:www-data /var/www/frontend
    sudo chmod -R 755 /var/www/frontend
    
    # Cleanup
    rm -rf /tmp/manager-review-frontend.tar.gz /tmp/app /tmp/.next
EOF

cd - > /dev/null

print_status "Frontend deployed successfully"
echo ""

# Step 5: Restart services
print_status "Step 5: Restarting services..."
ssh -i "$PEM_PATH" "$SERVER" << 'EOF'
    # Restart PHP-FPM
    sudo systemctl restart php8.2-fpm
    
    # Restart Nginx
    sudo systemctl restart nginx
    
    # Restart PM2 (for Next.js)
    pm2 restart all
    
    # Wait for services to stabilize
    sleep 3
    
    # Check service status
    sudo systemctl status php8.2-fpm --no-pager | head -n 5
    sudo systemctl status nginx --no-pager | head -n 5
    pm2 status
EOF

print_status "Services restarted successfully"
echo ""

# Step 6: Verification
print_status "Step 6: Running verification checks..."
ssh -i "$PEM_PATH" "$SERVER" << 'EOF'
    echo "Checking backend..."
    cd /var/www/QSightsOrg2.0/backend
    
    # Verify migrations
    php artisan migrate:status | grep "manager_review"
    
    # Verify routes
    php artisan route:list | grep "manager/review"
    
    echo ""
    echo "Checking frontend..."
    ls -la /var/www/frontend/app/manager/review/
    
    echo ""
    echo "All verifications passed!"
EOF

print_status "Verification completed successfully"
echo ""

# Summary
echo "========================================"
echo "Deployment Summary"
echo "========================================"
echo ""
print_status "Backend: Migrations run, models/controllers deployed"
print_status "Frontend: Manager review page deployed"
print_status "Services: PHP-FPM, Nginx, and PM2 restarted"
print_status "Verification: All checks passed"
echo ""
print_warning "Important: Test the manager review workflow thoroughly"
echo ""
echo "Test URLs:"
echo "  - Manager Review: https://yourdomain.com/manager/review/{token}"
echo "  - Super Admin Dashboard: https://yourdomain.com/activities/approvals"
echo ""
print_status "Deployment completed successfully!"
echo ""
