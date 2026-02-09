#!/bin/bash

# Deployment Script for Evaluation Reminder & Notification System
# Date: February 8, 2026
# Version: 1.0.0

set -e

echo "=========================================="
echo "Evaluation Reminder & Notification System"
echo "Deployment Script"
echo "Date: February 8, 2026"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"

echo -e "${BLUE}Step 1: Navigating to backend directory...${NC}"
cd "$BACKEND_DIR"
echo -e "${GREEN}✓ In backend directory${NC}"
echo ""

echo -e "${BLUE}Step 2: Running database migrations...${NC}"
php artisan migrate --force
echo -e "${GREEN}✓ Migrations completed${NC}"
echo ""

echo -e "${BLUE}Step 3: Clearing Laravel caches...${NC}"
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
echo -e "${GREEN}✓ Caches cleared${NC}"
echo ""

echo -e "${BLUE}Step 4: Checking scheduler configuration...${NC}"
php artisan schedule:list | grep -E "evaluations:send-reminders|evaluations:check-missed-deadlines"
echo -e "${GREEN}✓ Scheduler commands registered${NC}"
echo ""

echo -e "${BLUE}Step 5: Verifying cron job...${NC}"
if crontab -l 2>/dev/null | grep -q "schedule:run"; then
    echo -e "${GREEN}✓ Cron job exists${NC}"
    crontab -l | grep "schedule:run"
else
    echo -e "${YELLOW}⚠ Cron job not found!${NC}"
    echo ""
    echo -e "${YELLOW}Please add the following to your crontab (run: crontab -e):${NC}"
    echo "* * * * * cd $BACKEND_DIR && php artisan schedule:run >> /dev/null 2>&1"
    echo ""
fi
echo ""

echo -e "${BLUE}Step 6: Checking queue worker status...${NC}"
if pgrep -f "queue:work" > /dev/null; then
    echo -e "${GREEN}✓ Queue worker is running${NC}"
    ps aux | grep "queue:work" | grep -v grep
else
    echo -e "${YELLOW}⚠ Queue worker not running!${NC}"
    echo ""
    echo "Start queue worker with:"
    echo "php artisan queue:work --daemon"
    echo ""
    echo "For production, use Supervisor. Config example:"
    echo "[program:qsights-worker]"
    echo "command=php $BACKEND_DIR/artisan queue:work --sleep=3 --tries=3"
    echo "autostart=true"
    echo "autorestart=true"
    echo ""
fi
echo ""

echo -e "${BLUE}Step 7: Testing commands manually...${NC}"
echo ""
echo "Testing Send Reminders command..."
php artisan evaluations:send-reminders
echo ""
echo "Testing Check Missed Deadlines command..."
php artisan evaluations:check-missed-deadlines
echo ""
echo -e "${GREEN}✓ Commands tested successfully${NC}"
echo ""

echo -e "${BLUE}Step 8: Verifying SendGrid configuration...${NC}"
if php artisan tinker --execute="echo App\Models\SystemSetting::getValue('email_sendgrid_api_key') ? 'API Key: [SET]' : 'API Key: [NOT SET]';" 2>/dev/null; then
    echo -e "${GREEN}✓ SendGrid configuration checked${NC}"
else
    echo -e "${YELLOW}⚠ Could not verify SendGrid config${NC}"
    echo "Ensure email_sendgrid_api_key is set in System Settings"
fi
echo ""

echo -e "${BLUE}Step 9: Creating default notification configs...${NC}"
php artisan tinker --execute="
foreach (App\Models\Program::all() as \$program) {
    App\Models\EvaluationNotificationConfig::firstOrCreate(
        ['program_id' => \$program->id],
        [
            'enable_trigger_notifications' => true,
            'enable_completion_notifications' => true,
            'enable_missed_deadline_alerts' => true,
            'enable_automatic_reminders' => true,
            'reminder_schedule' => [7, 3, 1]
        ]
    );
}
echo 'Default configs created for all programs';
" 2>/dev/null || echo -e "${YELLOW}⚠ Could not create default configs automatically${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}Deployment Summary${NC}"
echo "=========================================="
echo ""
echo -e "${GREEN}✓${NC} Database migrations completed"
echo -e "${GREEN}✓${NC} Laravel caches cleared"
echo -e "${GREEN}✓${NC} Scheduler commands registered"
echo -e "${GREEN}✓${NC} Commands tested successfully"
echo ""
echo -e "${BLUE}New Features Deployed:${NC}"
echo "  • Automatic email notifications on evaluation trigger"
echo "  • Completion notifications to admins"
echo "  • Missed deadline alerts"
echo "  • Scheduled reminder emails to evaluators"
echo "  • Bell notifications for admins"
echo "  • Admin configuration panel (API ready)"
echo "  • Comprehensive notification logging"
echo ""
echo -e "${BLUE}Scheduler Tasks:${NC}"
echo "  • evaluations:send-reminders (hourly)"
echo "  • evaluations:check-missed-deadlines (twice daily at 9 AM & 6 PM)"
echo ""
echo -e "${BLUE}API Endpoints Added:${NC}"
echo "  GET    /api/evaluation/notifications/config"
echo "  PUT    /api/evaluation/notifications/config"
echo "  GET    /api/evaluation/notifications/logs"
echo "  GET    /api/evaluation/notifications/stats"
echo "  GET    /api/evaluation/bell-notifications"
echo "  PATCH  /api/evaluation/bell-notifications/{id}/read"
echo "  POST   /api/evaluation/bell-notifications/mark-all-read"
echo ""
echo -e "${YELLOW}Post-Deployment Tasks:${NC}"
echo "1. Verify cron job is active (see warning above if any)"
echo "2. Ensure queue worker is running (Supervisor recommended)"
echo "3. Test email delivery by triggering a new evaluation"
echo "4. Monitor logs: tail -f storage/logs/laravel.log"
echo "5. Build frontend UI for admin configuration panel"
echo "6. Implement bell notification icon in frontend"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  📄 Full documentation: EVALUATION_REMINDER_NOTIFICATION_SYSTEM.md"
echo ""
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo "=========================================="
