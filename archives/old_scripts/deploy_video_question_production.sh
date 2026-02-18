#!/bin/bash

# ============================================================================
# Video Question Feature - Production Deployment Script
# Date: February 12, 2026
# ============================================================================

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"
LOCAL_ROOT="/Users/yash/Documents/Projects/QSightsOrg2.0"
PROD_BACKEND="/var/www/QSightsOrg2.0/backend"
PROD_FRONTEND="/var/www/frontend"

# Print functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# ============================================================================
# STEP 1: Pre-Deployment Validation
# ============================================================================
print_header "STEP 1: Pre-Deployment Validation"

# Check PEM key exists
if [ ! -f "$PEM_KEY" ]; then
    print_error "PEM key not found at $PEM_KEY"
    exit 1
fi
print_success "PEM key found"

# Check SSH connection
print_info "Testing SSH connection..."
if ssh -i "$PEM_KEY" -o ConnectTimeout=10 "$SERVER" "echo 'Connection successful'" > /dev/null 2>&1; then
    print_success "SSH connection successful"
else
    print_error "Cannot connect to server"
    exit 1
fi

# Check localhost in .env
print_info "Checking production .env files..."
LOCALHOST_CHECK=$(ssh -i "$PEM_KEY" "$SERVER" "grep -i 'localhost:8000' $PROD_BACKEND/.env || true")
if [ -n "$LOCALHOST_CHECK" ]; then
    print_error "Production .env contains localhost:8000"
    exit 1
fi
print_success "Production .env is clean"

# Verify local files exist
print_info "Verifying local files..."
LOCAL_FILES=(
    "backend/database/migrations/2026_02_12_000001_add_video_support_to_questions_table.php"
    "backend/database/migrations/2026_02_12_000002_create_video_watch_tracking_table.php"
    "backend/app/Models/VideoWatchTracking.php"
    "backend/app/Http/Controllers/Api/VideoUploadController.php"
    "frontend/components/VideoPlayerWithTracking.tsx"
    "frontend/app/questionnaires/create/page.tsx"
    "frontend/app/activities/take/[id]/page.tsx"
)

for file in "${LOCAL_FILES[@]}"; do
    if [ ! -f "$LOCAL_ROOT/$file" ]; then
        print_error "Local file missing: $file"
        exit 1
    fi
done
print_success "All local files verified"

# ============================================================================
# STEP 2: Backup Production Files
# ============================================================================
print_header "STEP 2: Backing Up Production Files"

BACKUP_DIR="video_question_backup_$(date +%Y%m%d_%H%M%S)"
print_info "Creating backup directory: $BACKUP_DIR"

ssh -i "$PEM_KEY" "$SERVER" << EOF
    mkdir -p /tmp/$BACKUP_DIR/backend
    mkdir -p /tmp/$BACKUP_DIR/frontend
    
    # Backup backend files
    [ -f $PROD_BACKEND/app/Http/Controllers/Api/VideoUploadController.php ] && \
        cp $PROD_BACKEND/app/Http/Controllers/Api/VideoUploadController.php /tmp/$BACKUP_DIR/backend/
    [ -f $PROD_BACKEND/app/Models/Question.php ] && \
        cp $PROD_BACKEND/app/Models/Question.php /tmp/$BACKUP_DIR/backend/
    
    # Backup frontend files
    [ -f $PROD_FRONTEND/app/questionnaires/create/page.tsx ] && \
        cp $PROD_FRONTEND/app/questionnaires/create/page.tsx /tmp/$BACKUP_DIR/frontend/
    [ -f $PROD_FRONTEND/app/activities/take/[id]/page.tsx ] && \
        cp $PROD_FRONTEND/app/activities/take/[id]/page.tsx /tmp/$BACKUP_DIR/frontend/
    
    echo "Backup created at /tmp/$BACKUP_DIR"
EOF

print_success "Production files backed up to /tmp/$BACKUP_DIR"

# ============================================================================
# STEP 3: Deploy Backend Files
# ============================================================================
print_header "STEP 3: Deploying Backend Files"

print_info "Uploading backend files to /tmp..."

# Upload migrations
scp -i "$PEM_KEY" \
    "$LOCAL_ROOT/backend/database/migrations/2026_02_12_000001_add_video_support_to_questions_table.php" \
    "$LOCAL_ROOT/backend/database/migrations/2026_02_12_000002_create_video_watch_tracking_table.php" \
    "$SERVER:/tmp/"
print_success "Migrations uploaded"

# Upload models
scp -i "$PEM_KEY" \
    "$LOCAL_ROOT/backend/app/Models/VideoWatchTracking.php" \
    "$SERVER:/tmp/"
print_success "Models uploaded"

# Upload controller
scp -i "$PEM_KEY" \
    "$LOCAL_ROOT/backend/app/Http/Controllers/Api/VideoUploadController.php" \
    "$SERVER:/tmp/"
print_success "Controller uploaded"

print_info "Moving backend files to production paths..."
ssh -i "$PEM_KEY" "$SERVER" << 'EOF'
    # Move migrations
    sudo mv /tmp/2026_02_12_000001_add_video_support_to_questions_table.php \
        /var/www/QSightsOrg2.0/backend/database/migrations/
    sudo mv /tmp/2026_02_12_000002_create_video_watch_tracking_table.php \
        /var/www/QSightsOrg2.0/backend/database/migrations/
    
    # Move models
    sudo mv /tmp/VideoWatchTracking.php \
        /var/www/QSightsOrg2.0/backend/app/Models/
    
    # Move controller
    sudo mv /tmp/VideoUploadController.php \
        /var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/
    
    # Set correct permissions
    sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend/database/migrations/
    sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend/app/Models/
    sudo chown -R www-data:www-data /var/www/QSightsOrg2.0/backend/app/Http/Controllers/
    
    echo "Backend files deployed successfully"
EOF

print_success "Backend files deployed"

# ============================================================================
# STEP 4: Run Database Migrations
# ============================================================================
print_header "STEP 4: Running Database Migrations"

print_info "Running migrations on production..."
ssh -i "$PEM_KEY" "$SERVER" << 'EOF'
    cd /var/www/QSightsOrg2.0/backend
    
    # Run migrations
    php artisan migrate --force
    
    # Verify migrations
    echo ""
    echo "Migration Status:"
    php artisan migrate:status 2>&1 | grep -i video
EOF

print_success "Migrations completed"

# ============================================================================
# STEP 5: Deploy Frontend Files
# ============================================================================
print_header "STEP 5: Deploying Frontend Files"

print_info "Uploading frontend files to /tmp..."

# Upload new component
scp -i "$PEM_KEY" \
    "$LOCAL_ROOT/frontend/components/VideoPlayerWithTracking.tsx" \
    "$SERVER:/tmp/"
print_success "VideoPlayerWithTracking component uploaded"

# Upload updated pages
scp -i "$PEM_KEY" \
    "$LOCAL_ROOT/frontend/app/questionnaires/create/page.tsx" \
    "$SERVER:/tmp/questionnaire_create_page.tsx"
print_success "Questionnaire create page uploaded"

scp -i "$PEM_KEY" \
    "$LOCAL_ROOT/frontend/app/activities/take/[id]/page.tsx" \
    "$SERVER:/tmp/activity_take_page.tsx"
print_success "Activity take page uploaded"

print_info "Moving frontend files to production paths..."
ssh -i "$PEM_KEY" "$SERVER" << 'EOF'
    # Move component
    sudo mv /tmp/VideoPlayerWithTracking.tsx \
        /var/www/frontend/components/
    
    # Move pages
    sudo mv /tmp/questionnaire_create_page.tsx \
        /var/www/frontend/app/questionnaires/create/page.tsx
    sudo mv /tmp/activity_take_page.tsx \
        /var/www/frontend/app/activities/take/[id]/page.tsx
    
    # Set correct permissions
    sudo chown -R ubuntu:ubuntu /var/www/frontend/components/
    sudo chown -R ubuntu:ubuntu /var/www/frontend/app/
    
    echo "Frontend files deployed successfully"
EOF

print_success "Frontend files deployed"

# ============================================================================
# STEP 6: Build Frontend
# ============================================================================
print_header "STEP 6: Building Frontend"

print_info "Building Next.js frontend on production..."
ssh -i "$PEM_KEY" "$SERVER" << 'EOF'
    cd /var/www/frontend
    
    # Build frontend
    npm run build
    
    # Verify BUILD_ID exists
    if [ -f .next/BUILD_ID ]; then
        BUILD_ID=$(cat .next/BUILD_ID)
        echo "BUILD_ID: $BUILD_ID"
    else
        echo "ERROR: BUILD_ID missing!"
        exit 1
    fi
EOF

print_success "Frontend built successfully"

# ============================================================================
# STEP 7: Restart Services
# ============================================================================
print_header "STEP 7: Restarting Services"

print_info "Clearing Laravel caches..."
ssh -i "$PEM_KEY" "$SERVER" << 'EOF'
    cd /var/www/QSightsOrg2.0/backend
    php artisan config:clear
    php artisan cache:clear
    php artisan route:clear
    php artisan view:clear
EOF
print_success "Laravel caches cleared"

print_info "Restarting PM2 frontend..."
ssh -i "$PEM_KEY" "$SERVER" << 'EOF'
    pm2 restart frontend
    pm2 status
EOF
print_success "PM2 restarted"

# ============================================================================
# STEP 8: Post-Deployment Verification
# ============================================================================
print_header "STEP 8: Post-Deployment Verification"

print_info "Verifying backend routes..."
ssh -i "$PEM_KEY" "$SERVER" << 'EOF'
    cd /var/www/QSightsOrg2.0/backend
    php artisan route:list 2>&1 | grep -i "video.*question" | head -5
EOF
print_success "Backend routes verified"

print_info "Verifying frontend build..."
ssh -i "$PEM_KEY" "$SERVER" << 'EOF'
    ls -lh /var/www/frontend/.next/BUILD_ID
    ls -lh /var/www/frontend/components/VideoPlayerWithTracking.tsx
EOF
print_success "Frontend build verified"

print_info "Checking PM2 status..."
ssh -i "$PEM_KEY" "$SERVER" "pm2 list | grep frontend"
print_success "PM2 status verified"

# ============================================================================
# DEPLOYMENT COMPLETE
# ============================================================================
print_header "DEPLOYMENT COMPLETE"

echo ""
print_success "Video Question Feature deployed successfully!"
echo ""
print_info "Backup location: /tmp/$BACKUP_DIR"
echo ""
print_warning "IMPORTANT: Please verify the following manually:"
echo "  1. Open https://prod.qsights.com in browser"
echo "  2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo "  3. Open DevTools Console (F12) - Check for errors"
echo "  4. Test: Create questionnaire → Add video question"
echo "  5. Test: Take activity → Watch video → Verify tracking"
echo "  6. Test: Submit with mandatory video enforcement"
echo ""
print_info "Rollback command if needed:"
echo "  ssh -i $PEM_KEY $SERVER"
echo "  cd /tmp/$BACKUP_DIR"
echo "  # Copy files back to original locations"
echo ""

exit 0
