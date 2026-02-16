#!/bin/bash

# ============================================================================
# Video URL Input & QuestionnaireId Fix - Production Deployment
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

# ============================================================================
# STEP 2: Deploy Backend Fix
# ============================================================================
print_header "STEP 2: Deploying Backend Fix"

print_info "Backing up VideoUploadController..."
ssh -i "$PEM_KEY" "$SERVER" "sudo cp $PROD_BACKEND/app/Http/Controllers/Api/VideoUploadController.php $PROD_BACKEND/app/Http/Controllers/Api/VideoUploadController.php.backup.20260212"

print_info "Uploading VideoUploadController.php..."
scp -i "$PEM_KEY" "$LOCAL_ROOT/backend/app/Http/Controllers/Api/VideoUploadController.php" "$SERVER:/tmp/"
ssh -i "$PEM_KEY" "$SERVER" "sudo mv /tmp/VideoUploadController.php $PROD_BACKEND/app/Http/Controllers/Api/VideoUploadController.php && sudo chown www-data:www-data $PROD_BACKEND/app/Http/Controllers/Api/VideoUploadController.php"
print_success "Backend controller deployed"

# ============================================================================
# STEP 3: Deploy Frontend Changes
# ============================================================================
print_header "STEP 3: Deploying Frontend Changes"

print_info "Building frontend locally..."
cd "$LOCAL_ROOT/frontend"
npm run build
cd "$LOCAL_ROOT"
print_success "Frontend built successfully"

print_info "Uploading .next directory..."
rsync -avz --delete -e "ssh -i $PEM_KEY" "$LOCAL_ROOT/frontend/.next/" "$SERVER:/tmp/.next_deploy/"
ssh -i "$PEM_KEY" "$SERVER" "sudo rsync -a --delete /tmp/.next_deploy/ $PROD_FRONTEND/.next/ && sudo chown -R ubuntu:ubuntu $PROD_FRONTEND/.next && sudo rm -rf /tmp/.next_deploy"
print_success "Frontend deployed"

# ============================================================================
# STEP 4: Restart Services
# ============================================================================
print_header "STEP 4: Restarting Services"

print_info "Restarting PM2 qsights-frontend..."
ssh -i "$PEM_KEY" "$SERVER" "pm2 restart qsights-frontend"
print_success "Frontend restarted"

# ============================================================================
# STEP 5: Verification
# ============================================================================
print_header "STEP 5: Deployment Verification"

print_info "Checking frontend status..."
FRONTEND_STATUS=$(ssh -i "$PEM_KEY" "$SERVER" "pm2 status qsights-frontend | grep 'online' || echo 'ERROR'")
if [[ "$FRONTEND_STATUS" == *"ERROR"* ]]; then
    print_error "Frontend is not online"
    exit 1
fi
print_success "Frontend is online"

# ============================================================================
# DEPLOYMENT COMPLETE
# ============================================================================
print_header "🎉 DEPLOYMENT COMPLETE"

echo -e "${GREEN}Changes Deployed:${NC}"
echo -e "  ${BLUE}•${NC} Backend: questionnaire_id validation changed to nullable"
echo -e "  ${BLUE}•${NC} Frontend: Added questionnaireId prop to S3VideoUpload (edit page)"
echo -e "  ${BLUE}•${NC} Frontend: Added URL input option for both create and edit pages"
echo ""
echo -e "${YELLOW}Testing Steps:${NC}"
echo -e "  1. Edit existing questionnaire → Add video question"
echo -e "  2. Upload 28MB video → Should succeed ✅"
echo -e "  3. Try manual URL input → Should work ✅"
echo -e "  4. Create new questionnaire → Add video question"
echo -e "  5. Upload video → Should succeed ✅"
echo -e "  6. Try manual URL input → Should work ✅"
echo ""
print_success "Deployment completed successfully!"
