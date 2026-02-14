#!/bin/bash

###############################################################################
# CRITICAL FIX: Video Question Report Display - February 13, 2026
###############################################################################
# 
# ISSUE: Event Results > Question-wise Analysis page not showing video question
#        reports properly. Shows "0 only", missing participant status 
#        (completed/in-progress) and video watched time (HH:MM:SS).
#
# ROOT CAUSE: 
#   1. Video questions rely on video_view_logs table, not answer records
#   2. The participantResponses array was filtering out entries without answers
#   3. This caused video question data to not display even when view logs exist
#
# FIX:
#   1. Updated participantResponses logic to check question type
#   2. For video questions: use videoViewLogs directly instead of answer records
#   3. Updated totalResponses count for video questions to use view log count
#   4. Fixed video data retrieval to use pr.answer (which contains videoLog)
#   5. Added debug logging for troubleshooting
#
# FILES MODIFIED:
#   - frontend/app/activities/[id]/results/page.tsx
#
###############################################################################

set -e  # Exit on any error

echo "========================================="
echo "DEPLOYING VIDEO QUESTION REPORT FIX"
echo "Date: February 13, 2026"
echo "========================================="
echo ""

# Configuration
FRONTEND_DIR="frontend"
SERVER="ubuntu@13.232.120.22"
REMOTE_DIR="/var/www/qsights-app"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -d "$FRONTEND_DIR" ]; then
    print_error "Frontend directory not found. Please run from project root."
    exit 1
fi

print_status "Starting deployment process..."

# Step 1: Build Frontend
print_status "Building frontend application..."
cd $FRONTEND_DIR

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Build the frontend
print_status "Running production build..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Frontend build completed successfully"
else
    print_error "Frontend build failed"
    exit 1
fi

cd ..

# Step 2: Create backup on server
print_status "Creating backup on production server..."
ssh $SERVER "mkdir -p $REMOTE_DIR/backups && \
    if [ -d $REMOTE_DIR/frontend/.next ]; then \
        sudo cp -r $REMOTE_DIR/frontend/.next $REMOTE_DIR/backups/.next_backup_$TIMESTAMP; \
        echo 'Backup created: .next_backup_$TIMESTAMP'; \
    fi"

# Step 3: Upload built frontend
print_status "Uploading frontend build to production..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env.local' \
    --exclude '.env' \
    --exclude 'backups' \
    $FRONTEND_DIR/.next/ $SERVER:$REMOTE_DIR/frontend/.next/

rsync -avz \
    $FRONTEND_DIR/package.json \
    $FRONTEND_DIR/package-lock.json \
    $SERVER:$REMOTE_DIR/frontend/

print_success "Files uploaded successfully"

# Step 4: Restart frontend service
print_status "Restarting frontend service..."
ssh $SERVER "cd $REMOTE_DIR/frontend && \
    sudo npm install --production && \
    sudo systemctl restart qsights-frontend && \
    sleep 3 && \
    sudo systemctl status qsights-frontend --no-pager"

if [ $? -eq 0 ]; then
    print_success "Frontend service restarted successfully"
else
    print_error "Failed to restart frontend service"
    print_warning "You may need to manually check the service status"
fi

echo ""
echo "========================================="
print_success "DEPLOYMENT COMPLETED SUCCESSFULLY"
echo "========================================="
echo ""
echo "VERIFICATION STEPS:"
echo "1. Navigate to: Event Results > Question-wise Analysis"
echo "2. Find a video question in the list"
echo "3. Verify the following are now displayed:"
echo "   ✓ Total response count (should match video view logs)"
echo "   ✓ Per-participant watch duration in HH:MM:SS format"
echo "   ✓ Participant status: 'Completed' or 'In Progress'"
echo "   ✓ Participant names and emails"
echo ""
echo "ROLLBACK INSTRUCTIONS (if needed):"
echo "ssh $SERVER"
echo "cd $REMOTE_DIR"
echo "sudo cp -r backups/.next_backup_$TIMESTAMP frontend/.next"
echo "sudo systemctl restart qsights-frontend"
echo ""
echo "LOGS:"
echo "Check browser console for: 📹 [Video Question Debug]"
echo "Check frontend logs: sudo journalctl -u qsights-frontend -f"
echo ""
print_status "Deployment script completed at $(date)"
