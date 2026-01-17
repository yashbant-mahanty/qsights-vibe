# QSights 2.0 Backend - Deployment & Running Guide

## Quick Start Commands

### 1. Start Backend Server (Laravel)
```bash
php artisan serve
```
- Runs on: `http://localhost:8000`
- Default port: 8000

### 2. Start Frontend Server (Vite)
```bash
npm run dev
```
- Runs on: `http://localhost:5173`
- Hot reload enabled

### 3. Run Both Servers Concurrently
```bash
npx concurrently "php artisan serve" "npm run dev"
```

---

## Initial Setup (First Time Only)

### 1. Install Dependencies
```bash
# Install PHP dependencies
composer install

# Install Node dependencies
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` (if needed) and configure:

```dotenv
# Database
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=qsights
DB_USERNAME=postgres
DB_PASSWORD=postgres

# Queue Configuration
QUEUE_CONNECTION=database

# SendGrid (for email notifications)
SENDGRID_API_KEY=your_sendgrid_api_key_here
MAIL_FROM_ADDRESS=noreply@qsights.com
MAIL_FROM_NAME="QSights Platform"

# Frontend URL
APP_URL=http://localhost:3000
SANCTUM_STATEFUL_DOMAINS=localhost:3000
```

### 3. Generate Application Key
```bash
php artisan key:generate
```

### 4. Run Database Migrations
```bash
php artisan migrate
```

### 5. Seed Database (Optional)
```bash
php artisan db:seed
```

---

## Background Services (Production)

### 1. Queue Worker (For Notifications)
The queue worker processes background jobs like sending email notifications.

**Start Queue Worker:**
```bash
php artisan queue:work --queue=default --tries=3 --timeout=90
```

**Options:**
- `--queue=default` - Process jobs from default queue
- `--tries=3` - Retry failed jobs 3 times
- `--timeout=90` - Job timeout in seconds
- `--daemon` - Run as daemon (production)

**Development (with auto-reload):**
```bash
php artisan queue:listen
```

**Production (using Supervisor):**
Create supervisor config at `/etc/supervisor/conf.d/qsights-worker.conf`:
```ini
[program:qsights-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/qsights/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=4
redirect_stderr=true
stdout_logfile=/path/to/qsights/storage/logs/worker.log
stopwaitsecs=3600
```

Then:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start qsights-worker:*
```

### 2. Task Scheduler (For Activity Reminders)
The scheduler runs automated tasks like sending activity reminders.

**Add to Crontab:**
```bash
crontab -e
```

Add this line:
```bash
* * * * * cd /path/to/qsights && php artisan schedule:run >> /dev/null 2>&1
```

**Scheduled Tasks:**
- **Activity Reminders**: Runs daily at 9:00 AM
  - Sends reminders to participants 24 hours before activity starts
  - Configured in `routes/console.php`

**Test Scheduler Manually:**
```bash
php artisan schedule:list  # View scheduled tasks
php artisan qsights:send-activity-reminders  # Run reminders manually
```

---

## Development Workflow

### Run All Services for Development
```bash
# Terminal 1: Laravel Backend
php artisan serve

# Terminal 2: Vite Frontend
npm run dev

# Terminal 3: Queue Worker
php artisan queue:listen

# Terminal 4: Scheduler (optional, or use cron)
# Every minute, run:
php artisan schedule:work
```

**Or use tmux/screen for multi-terminal:**
```bash
# Start all in background
tmux new-session -d -s qsights 'php artisan serve'
tmux split-window -h 'npm run dev'
tmux split-window -v 'php artisan queue:listen'
tmux attach -t qsights
```

---

## Notification System

### Email Notifications (via SendGrid)

**1. Configure SendGrid:**
- Get API key from https://sendgrid.com
- Add to `.env`: `SENDGRID_API_KEY=SG.xxxxx`

**2. Test Email Sending:**
```bash
php artisan tinker
```
```php
$service = app(\App\Services\EmailService::class);
$service->send('test@example.com', 'Test Subject', '<p>Test message</p>');
```

**3. Notification Events:**
- **ActivityCreated**: Sent when new activity is created
- **ActivityReminder**: Sent 24 hours before activity starts

**4. Check Notification Status:**
```sql
-- View all notifications
SELECT id, type, event, recipient_email, status, sent_at
FROM notifications
ORDER BY created_at DESC
LIMIT 20;

-- Failed notifications
SELECT * FROM notifications
WHERE status = 'failed'
ORDER BY created_at DESC;
```

**5. Resend Failed Notifications:**
```bash
php artisan tinker
```
```php
$failed = \App\Models\Notification::where('status', 'failed')->get();
foreach ($failed as $notification) {
    // Implement retry logic or manual resend
}
```

---

## Reporting & Analytics

### Available Reports
All reports require authentication (`Authorization: Bearer <token>`).

**1. Activity Reports:**
```bash
# Participation metrics
GET /api/reports/participation/{activityId}

# Completion metrics
GET /api/reports/completion/{activityId}

# Response drill-down
GET /api/reports/responses/{activityId}?page=1&status=submitted

# Question analytics
GET /api/reports/question/{activityId}/{questionId}
```

**2. Program Reports:**
```bash
# Program overview
GET /api/reports/program/{programId}
```

**3. Export Reports:**
```bash
# Export activity (CSV, Excel, PDF)
GET /api/reports/export/{activityId}/csv
GET /api/reports/export/{activityId}/excel
GET /api/reports/export/{activityId}/pdf

# Export program overview (PDF)
GET /api/reports/export/program/{programId}
```

### Test Reports
```bash
php test_reports.php
```

---

## Database Management

### Run Migrations
```bash
# Run all pending migrations
php artisan migrate

# Rollback last migration
php artisan migrate:rollback

# Fresh migration (WARNING: deletes all data)
php artisan migrate:fresh

# Fresh migration with seeding
php artisan migrate:fresh --seed
```

### Check Migration Status
```bash
php artisan migrate:status
```

### Database Queries
```bash
# Open Tinker console
php artisan tinker
```

```php
// Example queries
\App\Models\Activity::count();
\App\Models\Response::submitted()->count();
\App\Models\Notification::where('status', 'sent')->count();
```

---

## Testing

### Run PHP Tests
```bash
# Run all tests
php artisan test

# Run specific test
php artisan test --filter NotificationTest

# Run with coverage
php artisan test --coverage
```

### Manual API Testing
Use the test scripts provided:

```bash
# Test notifications
php test_notifications.php

# Test reports
php test_reports.php

# Test dashboard
php test_dashboard.php
```

---

## Troubleshooting

### Queue Not Processing
```bash
# Check if queue worker is running
ps aux | grep "queue:work"

# Clear failed jobs
php artisan queue:flush

# Restart queue worker
php artisan queue:restart
```

### Scheduler Not Running
```bash
# Verify cron is set up
crontab -l

# Check scheduler tasks
php artisan schedule:list

# Test scheduler manually
php artisan schedule:run
```

### Email Not Sending
1. Verify SendGrid API key in `.env`
2. Check notification logs:
   ```sql
   SELECT * FROM notifications WHERE status = 'failed';
   ```
3. Test SendGrid connection:
   ```bash
   php artisan tinker
   ```
   ```php
   $sg = new \SendGrid(env('SENDGRID_API_KEY'));
   var_dump($sg);
   ```

### Database Connection Issues
```bash
# Test database connection
php artisan tinker
```
```php
DB::connection()->getPdo();
```

### Clear Cache
```bash
# Clear all caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Or clear everything
php artisan optimize:clear
```

---

## Production Deployment Checklist

- [ ] Set `APP_ENV=production` in `.env`
- [ ] Set `APP_DEBUG=false` in `.env`
- [ ] Generate new `APP_KEY`
- [ ] Configure production database credentials
- [ ] Set up SendGrid API key
- [ ] Run `composer install --optimize-autoloader --no-dev`
- [ ] Run `npm run build`
- [ ] Run `php artisan migrate --force`
- [ ] Set up queue worker with Supervisor
- [ ] Set up cron job for scheduler
- [ ] Configure proper file permissions (storage, bootstrap/cache)
- [ ] Set up SSL certificate
- [ ] Configure proper CORS settings
- [ ] Set up backup system for database
- [ ] Configure log rotation
- [ ] Set up monitoring (e.g., Laravel Telescope, Sentry)

---

## Monitoring & Logs

### Application Logs
```bash
# Tail logs
tail -f storage/logs/laravel.log

# Search logs
grep "ERROR" storage/logs/laravel.log
```

### Queue Monitoring
```bash
# View queue jobs
php artisan queue:work --verbose

# Failed jobs table
php artisan queue:failed

# Retry failed job
php artisan queue:retry {job-id}

# Retry all failed jobs
php artisan queue:retry all
```

### Performance Monitoring
```bash
# Install Laravel Telescope (optional)
composer require laravel/telescope --dev
php artisan telescope:install
php artisan migrate
```

---

## Key Features Implemented

### ✅ Authentication & Authorization
- Sanctum token-based authentication
- Role-based access control (Admin, Moderator, Participant)

### ✅ Program & Activity Management
- CRUD operations for programs and activities
- Hierarchical organization structure
- Activity lifecycle management (draft, live, paused, completed)

### ✅ Participant Management
- Bulk import via Excel
- Custom attribute support
- Profile management

### ✅ Response Engine
- Multi-step response workflow
- Auto-save functionality
- Guest response support
- Progress tracking

### ✅ Notification Engine
- Email notifications via SendGrid
- Event-based notifications (ActivityCreated)
- Scheduled reminders
- Notification logging and tracking

### ✅ Activity-based eNotification Content Manager (NEW!)
- Custom email templates per activity
- 5 notification types (invitation, reminder, thank_you, program_expiry, activity_summary)
- 16 dynamic placeholders ({{participant_name}}, {{activity_name}}, etc.)
- Rich HTML email templates with visual preview
- Automatic fallback to beautiful default templates
- Full CRUD API for template management
- See: `NOTIFICATION_TEMPLATES_QUICKSTART.md`

### ✅ Reporting & Analytics
- Participation metrics
- Completion analytics
- Question-level analytics
- Multi-format exports (CSV, Excel, PDF)
- Program-level overview

---

## API Documentation

For full API documentation, refer to:
- `LARAVEL_SETUP.md` - Complete API endpoint listing
- `CHUNK_B*.md` - Feature-specific documentation
- `NOTIFICATION_TEMPLATE_MANAGER.md` - Notification template system (NEW!)
- `NOTIFICATION_TEMPLATES_QUICKSTART.md` - Quick start guide (NEW!)

---

## Support

For issues or questions:
1. Check logs: `storage/logs/laravel.log`
2. Review documentation files
3. Test with provided test scripts
4. Use `php artisan tinker` for debugging

---

**Last Updated:** December 5, 2025  
**Version:** 2.0  
**Laravel Version:** 11.47.0
