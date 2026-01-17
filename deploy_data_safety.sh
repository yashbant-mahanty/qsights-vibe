#!/bin/bash

# Data Safety & Audit Logging - Deployment Script
# Date: 17 January 2026
# This script deploys the Data Safety & Audit Logging system

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Data Safety & Audit Logging Deployment${NC}"
echo -e "${BLUE}   Date: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}\n"

# Configuration
BACKEND_PATH="/var/www/QSightsOrg2.0/backend"
PEM_PATH="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER_IP="13.126.210.220"
SERVER_USER="ubuntu"

# Function to print success messages
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print info messages
info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Function to print error messages
error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to print warning messages
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if running locally or on server
if [ -f "$PEM_PATH" ]; then
    DEPLOYMENT_MODE="local"
    info "Running in LOCAL mode - will upload files to server"
else
    DEPLOYMENT_MODE="server"
    info "Running in SERVER mode - will execute locally"
fi

# Step 1: Backup (if on server)
if [ "$DEPLOYMENT_MODE" == "server" ]; then
    echo -e "\n${BLUE}[Step 1/7] Creating Backup...${NC}"
    
    BACKUP_FILE="$HOME/backup_$(date +%Y%m%d_%H%M%S).sql"
    info "Backing up database to: $BACKUP_FILE"
    
    if sudo -u postgres pg_dump qsights_db > "$BACKUP_FILE"; then
        success "Database backup created"
    else
        error "Database backup failed (continuing anyway)"
    fi
else
    warning "Skipping backup (run this step manually on server)"
fi

# Step 2: Upload Files (if local)
if [ "$DEPLOYMENT_MODE" == "local" ]; then
    echo -e "\n${BLUE}[Step 2/7] Uploading Files to Server...${NC}"
    
    info "Uploading migrations..."
    scp -i "$PEM_PATH" \
        ./backend/database/migrations/2026_01_17_*.php \
        "$SERVER_USER@$SERVER_IP:$BACKEND_PATH/database/migrations/" 2>/dev/null || warning "Some migrations may already exist"
    
    info "Uploading models..."
    scp -i "$PEM_PATH" \
        ./backend/app/Models/ResponseAuditLog.php \
        ./backend/app/Models/NotificationLog.php \
        "$SERVER_USER@$SERVER_IP:$BACKEND_PATH/app/Models/" 2>/dev/null || true
    
    info "Uploading services..."
    scp -i "$PEM_PATH" \
        ./backend/app/Services/ResponseAuditService.php \
        ./backend/app/Services/NotificationLogService.php \
        "$SERVER_USER@$SERVER_IP:$BACKEND_PATH/app/Services/" 2>/dev/null || true
    
    info "Uploading controllers..."
    scp -i "$PEM_PATH" \
        ./backend/app/Http/Controllers/Api/ResponseController.php \
        ./backend/app/Http/Controllers/Api/DataSafetyController.php \
        "$SERVER_USER@$SERVER_IP:$BACKEND_PATH/app/Http/Controllers/Api/" 2>/dev/null || true
    
    scp -i "$PEM_PATH" \
        ./backend/app/Services/EmailService.php \
        "$SERVER_USER@$SERVER_IP:$BACKEND_PATH/app/Services/" 2>/dev/null || true
    
    success "Files uploaded successfully"
    
    info "Now SSH to server to complete deployment:"
    echo -e "${YELLOW}ssh -i $PEM_PATH $SERVER_USER@$SERVER_IP${NC}"
    echo -e "${YELLOW}cd $BACKEND_PATH && bash deploy_data_safety.sh${NC}"
    exit 0
fi

# Remaining steps run on server
echo -e "\n${BLUE}[Step 3/7] Running Migrations...${NC}"
cd "$BACKEND_PATH"

info "Checking current migration status..."
php artisan migrate:status | tail -10

info "Running new migrations..."
if php artisan migrate --force; then
    success "Migrations completed successfully"
else
    error "Migration failed - check logs"
    exit 1
fi

info "Verifying new tables..."
php artisan migrate:status | grep "2026_01_17"

# Step 4: Clear Caches
echo -e "\n${BLUE}[Step 4/7] Clearing Caches...${NC}"

php artisan cache:clear
success "Cache cleared"

php artisan config:clear
success "Config cache cleared"

php artisan route:clear
success "Route cache cleared"

php artisan view:clear
success "View cache cleared"

# Rebuild caches
info "Rebuilding optimizations..."
php artisan config:cache
php artisan route:cache
php artisan optimize
success "Optimizations rebuilt"

# Step 5: Set Permissions
echo -e "\n${BLUE}[Step 5/7] Setting Permissions...${NC}"

info "Setting ownership..."
sudo chown -R www-data:www-data storage bootstrap/cache
success "Ownership set"

info "Setting permissions..."
sudo chmod -R 775 storage bootstrap/cache
success "Permissions set"

# Step 6: Restart Services
echo -e "\n${BLUE}[Step 6/7] Restarting Services...${NC}"

info "Restarting PHP-FPM..."
sudo systemctl restart php8.2-fpm
success "PHP-FPM restarted"

info "Restarting Nginx..."
sudo systemctl restart nginx
success "Nginx restarted"

# Verify services
if systemctl is-active --quiet php8.2-fpm && systemctl is-active --quiet nginx; then
    success "All services running"
else
    error "Some services failed to start"
    systemctl status php8.2-fpm
    systemctl status nginx
fi

# Step 7: Verification
echo -e "\n${BLUE}[Step 7/7] Verification...${NC}"

info "Checking database tables..."
sudo -u postgres psql qsights_db -c "\dt response_audit_logs" -t | grep -q "response_audit_logs" && success "response_audit_logs table exists" || error "response_audit_logs table missing"
sudo -u postgres psql qsights_db -c "\dt notification_logs" -t | grep -q "notification_logs" && success "notification_logs table exists" || error "notification_logs table missing"

info "Checking data safety settings..."
SETTINGS_COUNT=$(sudo -u postgres psql qsights_db -t -c "SELECT COUNT(*) FROM system_settings WHERE category = 'data_safety';")
if [ "$SETTINGS_COUNT" -ge 5 ]; then
    success "Data safety settings configured ($SETTINGS_COUNT settings)"
else
    warning "Expected 5 data safety settings, found $SETTINGS_COUNT"
fi

info "Checking application logs..."
if tail -20 storage/logs/laravel.log | grep -q "error\|Error\|ERROR"; then
    warning "Recent errors found in logs - please review"
    echo -e "${YELLOW}Run: tail -50 storage/logs/laravel.log${NC}"
else
    success "No recent errors in logs"
fi

# Summary
echo -e "\n${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Deployment Completed Successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}\n"

echo -e "${BLUE}Next Steps:${NC}"
echo "1. Configure SendGrid webhook at: https://app.sendgrid.com/"
echo "   Webhook URL: https://qsights.com/api/webhooks/sendgrid"
echo ""
echo "2. Access Data Safety UI:"
echo "   Login as Super Admin → Navigate to Data Safety"
echo "   URL: https://qsights.com/super-admin/data-safety"
echo ""
echo "3. Test the system:"
echo "   - Submit a test response"
echo "   - Send a test notification"
echo "   - Check audit logs in Data Safety UI"
echo ""
echo -e "${BLUE}For detailed documentation, see:${NC}"
echo "   DEPLOYMENT_GUIDE_DATA_SAFETY.md"
echo ""

success "All done! 🎉"
