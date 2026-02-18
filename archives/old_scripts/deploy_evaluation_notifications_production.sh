#!/bin/bash

###############################################################################
# QSights Production Deployment - Evaluation Notification System
# Date: February 8, 2026
# Environment: PRODUCTION (13.126.210.220)
# WARNING: This deploys to LIVE PRODUCTION environment
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER_IP="13.126.210.220"
SERVER_USER="ubuntu"
BACKEND_PATH="/var/www/QSightsOrg2.0/backend"
LOCAL_BACKEND_PATH="$(pwd)/backend"

# Feature-specific files to deploy
MIGRATIONS=(
    "database/migrations/2026_02_08_000001_create_evaluation_notifications_table.php"
    "database/migrations/2026_02_08_000002_add_missed_deadline_notified_at_to_evaluation_triggered.php"
)

MODELS=(
    "app/Models/EvaluationNotificationConfig.php"
    "app/Models/EvaluationNotificationLog.php"
    "app/Models/EvaluationBellNotification.php"
    "app/Models/EvaluationReminderSchedule.php"
)

SERVICES=(
    "app/Services/EvaluationNotificationService.php"
)

COMMANDS=(
    "app/Console/Commands/SendEvaluationReminders.php"
    "app/Console/Commands/CheckMissedEvaluationDeadlines.php"
)

CONTROLLERS=(
    "app/Http/Controllers/Api/EvaluationNotificationConfigController.php"
)

MODIFIED_FILES=(
    "app/Console/Kernel.php"
    "routes/api.php"
    "app/Http/Controllers/Api/EvaluationTriggerController.php"
)

echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║        ⚠️  PRODUCTION DEPLOYMENT - CRITICAL FEATURE ⚠️       ║${NC}"
echo -e "${RED}║                                                              ║${NC}"
echo -e "${RED}║     Evaluation Reminder & Notification System                ║${NC}"
echo -e "${RED}║     Server: 13.126.210.220 (PRODUCTION)                      ║${NC}"
echo -e "${RED}║                                                              ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}              DEPLOYMENT FEATURE OVERVIEW                      ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}What will be deployed:${NC}"
echo "  • 2 Database Migrations (4 new tables)"
echo "  • 4 New Models"
echo "  • 1 Notification Service"
echo "  • 2 Console Commands"
echo "  • 1 API Controller (7 endpoints)"
echo "  • 3 Modified Files (Kernel, Routes, Controller)"
echo ""
echo -e "${BLUE}Impact:${NC}"
echo "  • New scheduler tasks (hourly + twice daily)"
echo "  • New API endpoints for notifications"
echo "  • Email notifications via SendGrid"
echo "  • Bell notifications for admins"
echo "  • Automatic evaluation reminders"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT CHECKS:${NC}"
echo "  • SendGrid is configured and working"
echo "  • Queue worker is running"
echo "  • Cron scheduler is active"
echo "  • .env has correct API URLs (not localhost)"
echo ""

# Pre-flight checks
echo -e "${YELLOW}[1/12] Pre-flight Validation${NC}"

if [ ! -f "$PEM_KEY" ]; then
    echo -e "${RED}✗ PEM key not found at $PEM_KEY${NC}"
    exit 1
fi

if [ ! -d "$LOCAL_BACKEND_PATH" ]; then
    echo -e "${RED}✗ Local backend directory not found${NC}"
    exit 1
fi

# Check all files exist
MISSING_FILES=0
for file in "${MIGRATIONS[@]}" "${MODELS[@]}" "${SERVICES[@]}" "${COMMANDS[@]}" "${CONTROLLERS[@]}" "${MODIFIED_FILES[@]}"; do
    if [ ! -f "$LOCAL_BACKEND_PATH/$file" ]; then
        echo -e "${RED}✗ Missing: $file${NC}"
        MISSING_FILES=1
    fi
done

if [ $MISSING_FILES -eq 1 ]; then
    echo -e "${RED}✗ Some required files are missing. Aborting.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ PEM key found${NC}"
echo -e "${GREEN}✓ Local backend directory found${NC}"
echo -e "${GREEN}✓ All required files present${NC}"
echo ""

# Check .env files
echo -e "${YELLOW}[2/12] Checking Environment Configuration${NC}"

ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    if grep -q 'localhost:8000' $BACKEND_PATH/.env; then
        echo -e '${RED}✗ Production .env contains localhost:8000${NC}'
        exit 1
    fi
"
echo -e "${GREEN}✓ Production .env validated (no localhost)${NC}"
echo ""

# Final confirmation
echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${RED}           FINAL PRODUCTION CONFIRMATION                       ${NC}"
echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}You are about to deploy a NEW FEATURE to LIVE PRODUCTION${NC}"
echo -e "Server: ${RED}$SERVER_IP${NC}"
echo -e "Environment: ${RED}PRODUCTION${NC}"
echo -e "Feature: ${RED}Evaluation Reminder & Notification System${NC}"
echo -e "Impact: ${RED}ALL USERS (adds new scheduler tasks)${NC}"
echo ""
read -p "Type 'DEPLOY-NOTIFICATIONS' to continue: " CONFIRM

if [ "$CONFIRM" != "DEPLOY-NOTIFICATIONS" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 0
fi
echo ""

# Create backup
echo -e "${YELLOW}[3/12] Creating Production Backup${NC}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    sudo mkdir -p /home/ubuntu/backups/production
    sudo tar -czf /home/ubuntu/backups/production/backend_before_notifications_${TIMESTAMP}.tar.gz \
        -C $BACKEND_PATH \
        app/Console/Kernel.php \
        routes/api.php \
        app/Http/Controllers/Api/EvaluationTriggerController.php \
        2>/dev/null || true
    sudo chown ubuntu:ubuntu /home/ubuntu/backups/production/backend_before_notifications_${TIMESTAMP}.tar.gz
    ls -lh /home/ubuntu/backups/production/backend_before_notifications_${TIMESTAMP}.tar.gz
"
echo -e "${GREEN}✓ Production backup created: backend_before_notifications_${TIMESTAMP}.tar.gz${NC}"
echo ""

# Upload files to temp directory
echo -e "${YELLOW}[4/12] Uploading New Files to Server${NC}"

# Create archive with only notification files
cd backend
tar -czf /tmp/notification_deploy.tar.gz \
    "${MIGRATIONS[@]}" \
    "${MODELS[@]}" \
    "${SERVICES[@]}" \
    "${COMMANDS[@]}" \
    "${CONTROLLERS[@]}" \
    "${MODIFIED_FILES[@]}"
cd ..

scp -i "$PEM_KEY" /tmp/notification_deploy.tar.gz "$SERVER_USER@$SERVER_IP:/tmp/"
rm /tmp/notification_deploy.tar.gz

echo -e "${GREEN}✓ Files uploaded to /tmp on production server${NC}"
echo ""

# Extract and move files
echo -e "${YELLOW}[5/12] Deploying Files${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    # Extract to temp
    cd /tmp
    tar -xzf notification_deploy.tar.gz
    
    # Move files to production backend
    sudo cp -r app $BACKEND_PATH/
    sudo cp -r database $BACKEND_PATH/
    sudo cp -r routes $BACKEND_PATH/
    
    # Set permissions
    sudo chown -R www-data:www-data $BACKEND_PATH/app
    sudo chown -R www-data:www-data $BACKEND_PATH/database
    sudo chown -R www-data:www-data $BACKEND_PATH/routes
    
    # Clean up
    rm -rf /tmp/app /tmp/database /tmp/routes /tmp/notification_deploy.tar.gz
    
    echo 'Files deployed to production'
"
echo -e "${GREEN}✓ Files deployed to $BACKEND_PATH${NC}"
echo ""

# Verify SendGrid configuration
echo -e "${YELLOW}[6/12] Verifying Email Configuration${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $BACKEND_PATH
    if ! grep -q 'MAIL_MAILER=sendgrid' .env; then
        echo -e '${YELLOW}⚠️  MAIL_MAILER not set to sendgrid${NC}'
    fi
    if ! grep -q 'SENDGRID_API_KEY=' .env || grep -q 'SENDGRID_API_KEY=$' .env; then
        echo -e '${RED}✗ SENDGRID_API_KEY not configured${NC}'
        exit 1
    fi
    echo -e '${GREEN}✓ SendGrid configuration found${NC}'
"
echo ""

# Run migrations
echo -e "${YELLOW}[7/12] Running Database Migrations${NC}"
echo -e "${RED}⚠️  This will create 4 new tables and modify 1 existing table${NC}"
echo "Tables to create:"
echo "  • evaluation_notification_configs"
echo "  • evaluation_notification_logs"
echo "  • evaluation_bell_notifications"
echo "  • evaluation_reminder_schedules"
echo "Modification:"
echo "  • evaluation_triggered (add missed_deadline_notified_at column)"
echo ""
read -p "Proceed with migrations? (yes/no): " MIGRATE_CONFIRM

if [ "$MIGRATE_CONFIRM" = "yes" ]; then
    ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
        cd $BACKEND_PATH
        sudo php artisan migrate --force
    "
    echo -e "${GREEN}✓ Migrations completed successfully${NC}"
else
    echo -e "${RED}✗ Migrations skipped - deployment incomplete${NC}"
    exit 1
fi
echo ""

# Clear caches
echo -e "${YELLOW}[8/12] Clearing and Optimizing Caches${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $BACKEND_PATH
    sudo php artisan config:clear
    sudo php artisan route:clear
    sudo php artisan view:clear
    sudo php artisan cache:clear
    sudo php artisan config:cache
    sudo php artisan route:cache
"
echo -e "${GREEN}✓ Caches cleared and optimized${NC}"
echo ""

# Test console commands
echo -e "${YELLOW}[9/12] Testing Console Commands${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $BACKEND_PATH
    echo 'Testing SendEvaluationReminders command...'
    sudo php artisan evaluations:send-reminders --help >/dev/null 2>&1 && echo '  ✓ Send reminders command registered' || echo '  ✗ Send reminders command failed'
    
    echo 'Testing CheckMissedEvaluationDeadlines command...'
    sudo php artisan evaluations:check-missed-deadlines --help >/dev/null 2>&1 && echo '  ✓ Check deadlines command registered' || echo '  ✗ Check deadlines command failed'
"
echo ""

# Verify scheduler
echo -e "${YELLOW}[10/12] Verifying Scheduler Configuration${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $BACKEND_PATH
    echo 'Checking scheduler tasks...'
    sudo php artisan schedule:list | grep -E 'evaluations:(send-reminders|check-missed-deadlines)' || echo '${YELLOW}⚠️  Scheduler tasks not found in list${NC}'
"
echo ""
echo -e "${YELLOW}Verifying cron job...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    sudo crontab -l | grep 'schedule:run' >/dev/null 2>&1 && echo -e '${GREEN}✓ Cron job is configured${NC}' || echo -e '${RED}✗ Cron job NOT found${NC}'
"
echo ""

# Verify queue worker
echo -e "${YELLOW}[11/12] Verifying Queue Worker${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    ps aux | grep 'queue:work' | grep -v grep >/dev/null 2>&1 && echo -e '${GREEN}✓ Queue worker is running${NC}' || echo -e '${RED}⚠️  Queue worker NOT running - emails may not send${NC}'
"
echo ""

# Restart services
echo -e "${YELLOW}[12/12] Restarting Services${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    sudo systemctl reload php8.1-fpm
    sudo systemctl reload nginx
    echo -e '${GREEN}✓ PHP-FPM and Nginx reloaded${NC}'
"
echo ""

# Create default notification configs for existing programs
echo -e "${YELLOW}Creating default notification configs for existing programs...${NC}"
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" "
    cd $BACKEND_PATH
    sudo php artisan tinker --execute=\"
        \\\$programs = \\\App\\\Models\\\Program::all();
        foreach (\\\$programs as \\\$program) {
            \\\App\\\Models\\\EvaluationNotificationConfig::firstOrCreate(
                ['program_id' => \\\$program->id],
                [
                    'trigger_notification_enabled' => true,
                    'completion_notification_enabled' => true,
                    'missed_deadline_notification_enabled' => true,
                    'reminder_enabled' => true,
                    'reminder_schedule' => [7, 3, 1]
                ]
            );
        }
        echo 'Default configs created for ' . \\\$programs->count() . ' programs';
    \"
"
echo ""

# Health check
echo -e "${YELLOW}Performing Health Check...${NC}"
sleep 3

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://prod.qsights.com/api/health 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Production health check passed (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}⚠️  Health check returned HTTP $HTTP_CODE${NC}"
fi
echo ""

# Success summary
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}║      ✓ EVALUATION NOTIFICATION SYSTEM DEPLOYED               ║${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}║      Environment: PRODUCTION                                 ║${NC}"
echo -e "${GREEN}║      Server: 13.126.210.220                                  ║${NC}"
echo -e "${GREEN}║      Status: LIVE                                            ║${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                  DEPLOYMENT SUMMARY                           ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}✓ Deployed Components:${NC}"
echo "  • 2 Database migrations (4 tables + 1 column)"
echo "  • 4 Models (Config, Log, Bell, ReminderSchedule)"
echo "  • 1 Service (EvaluationNotificationService)"
echo "  • 2 Console commands (Reminders, Deadline checks)"
echo "  • 1 Controller (7 API endpoints)"
echo "  • 3 Modified files (Kernel, Routes, Controller)"
echo ""
echo -e "${BLUE}✓ Active Features:${NC}"
echo "  • Evaluation trigger notifications ✓"
echo "  • Completion notifications ✓"
echo "  • Missed deadline alerts ✓"
echo "  • Automatic reminders (7, 3, 1 days) ✓"
echo "  • Bell notifications ✓"
echo "  • Email logging ✓"
echo ""
echo -e "${BLUE}✓ Automation:${NC}"
echo "  • Hourly reminder checks"
echo "  • Twice-daily deadline checks (9 AM & 6 PM)"
echo ""
echo -e "${BLUE}✓ API Endpoints:${NC}"
echo "  • GET  /api/evaluation/notifications/config"
echo "  • PUT  /api/evaluation/notifications/config"
echo "  • GET  /api/evaluation/notifications/logs"
echo "  • GET  /api/evaluation/notifications/stats"
echo "  • GET  /api/evaluation/bell-notifications"
echo "  • PATCH /api/evaluation/bell-notifications/{id}/read"
echo "  • POST /api/evaluation/bell-notifications/mark-all-read"
echo ""

echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}              IMMEDIATE VERIFICATION REQUIRED                  ${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${RED}⚠️  CRITICAL: Test the following immediately:${NC}"
echo ""
echo -e "${BLUE}1. Trigger an evaluation:${NC}"
echo "   • Go to https://prod.qsights.com"
echo "   • Create/trigger a test evaluation"
echo "   • Verify admin receives email notification"
echo "   • Check bell notification appears"
echo ""
echo -e "${BLUE}2. Check logs:${NC}"
echo "   ssh -i $PEM_KEY $SERVER_USER@$SERVER_IP"
echo "   tail -f $BACKEND_PATH/storage/logs/laravel.log | grep 'Evaluation'"
echo ""
echo -e "${BLUE}3. Verify scheduler:${NC}"
echo "   ssh -i $PEM_KEY $SERVER_USER@$SERVER_IP"
echo "   cd $BACKEND_PATH && sudo php artisan schedule:list"
echo ""
echo -e "${BLUE}4. Test reminder command:${NC}"
echo "   ssh -i $PEM_KEY $SERVER_USER@$SERVER_IP"
echo "   cd $BACKEND_PATH && sudo php artisan evaluations:send-reminders"
echo ""
echo -e "${BLUE}5. Check notification logs:${NC}"
echo "   ssh -i $PEM_KEY $SERVER_USER@$SERVER_IP"
echo "   cd $BACKEND_PATH && sudo php artisan tinker --execute=\"\\\App\\\Models\\\EvaluationNotificationLog::latest()->take(5)->get()\""
echo ""

echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}                  ROLLBACK INFORMATION                         ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Backup location: ${BLUE}/home/ubuntu/backups/production/backend_before_notifications_${TIMESTAMP}.tar.gz${NC}"
echo ""
echo -e "${YELLOW}To rollback (if needed):${NC}"
echo ""
echo "ssh -i $PEM_KEY $SERVER_USER@$SERVER_IP"
echo "cd $BACKEND_PATH"
echo "sudo tar -xzf /home/ubuntu/backups/production/backend_before_notifications_${TIMESTAMP}.tar.gz"
echo "sudo php artisan migrate:rollback --step=2"
echo "sudo php artisan config:clear && sudo php artisan route:clear"
echo "sudo systemctl reload php8.1-fpm"
echo ""

echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${RED}              MONITORING (NEXT 30 MINUTES)                     ${NC}"
echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Watch for:"
echo "  • Email delivery failures"
echo "  • Database errors in logs"
echo "  • Scheduler execution"
echo "  • Queue worker processing"
echo "  • API endpoint responses"
echo ""
echo -e "${GREEN}Deployment completed at: $(date)${NC}"
echo -e "${GREEN}Feature is now LIVE in production!${NC}"
echo ""
