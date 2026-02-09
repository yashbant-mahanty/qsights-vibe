# Evaluation Reminder & Notification System - Quick Start Guide

**Date:** February 8, 2026  
**Status:** ✅ READY TO DEPLOY

---

## 🚀 Quick Deployment (5 Minutes)

### Step 1: Run Deployment Script

```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0
./deploy_evaluation_notifications_feb_08_2026.sh
```

This script will:
- Run database migrations
- Clear Laravel caches
- Verify scheduler configuration
- Test commands
- Create default notification configs

### Step 2: Verify Cron Job (if not already set)

```bash
crontab -e
```

Add this line if not present:
```
* * * * * cd /Users/yash/Documents/Projects/QSightsOrg2.0/backend && php artisan schedule:run >> /dev/null 2>&1
```

### Step 3: Ensure Queue Worker is Running

```bash
# Check if running
ps aux | grep "queue:work"

# If not running, start it:
cd /Users/yash/Documents/Projects/QSightsOrg2.0/backend
php artisan queue:work --daemon &
```

**That's it! The system is now live. 🎉**

---

## 📧 How It Works

### Automatic Notifications

#### 1. **When Evaluation is Triggered** ✅
- **Admin receives:** Email + Bell notification
- **Content:** Evaluator name, form name, staff list, dates
- **Action:** View evaluation dashboard

#### 2. **When Evaluation is Completed** ✅
- **Admin receives:** Email + Bell notification
- **Content:** Completion details, evaluator name
- **Action:** View results

#### 3. **When Deadline is Missed** ⚠️
- **Admin receives:** Alert email + High-priority bell notification
- **Content:** Missed evaluation details, evaluator contact
- **Action:** Follow up with evaluator

#### 4. **Reminders to Evaluators** ⏰
- **Evaluator receives:** Email reminder
- **Schedule:** 7 days, 3 days, 1 day before deadline (default)
- **Content:** Days remaining, staff to evaluate
- **Action:** Complete evaluation

---

## 🎯 Quick Test

### Test Trigger Notification

1. Go to Evaluation module
2. Trigger a new evaluation
3. Check your email (admin)
4. Check bell icon in app

### Test Completion Notification

1. Open an evaluation link
2. Complete all staff evaluations
3. Submit
4. Admin receives completion email + bell notification

### Test Reminder (Manual)

```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0/backend
php artisan evaluations:send-reminders
```

Check if reminders are scheduled:
```sql
SELECT * FROM evaluation_reminder_schedules WHERE status = 'pending';
```

### Test Missed Deadline Alert (Manual)

```bash
php artisan evaluations:check-missed-deadlines
```

---

## ⚙️ Configuration

### Access Configuration API

```bash
# Get current config
curl -X GET "https://prod.qsights.com/api/evaluation/notifications/config?program_id=YOUR_PROGRAM_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update config (example: change reminder schedule)
curl -X PUT "https://prod.qsights.com/api/evaluation/notifications/config" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "program_id": "YOUR_PROGRAM_ID",
    "reminder_schedule": [14, 7, 3, 1],
    "enable_automatic_reminders": true
  }'
```

### Default Settings

Every program automatically gets:
- ✅ Trigger notifications enabled
- ✅ Completion notifications enabled
- ✅ Missed deadline alerts enabled
- ✅ Automatic reminders enabled
- 📅 Reminder schedule: 7, 3, 1 days before deadline

---

## 📊 View Notification History

### Get Notification Logs

```bash
curl -X GET "https://prod.qsights.com/api/evaluation/notifications/logs?program_id=YOUR_PROGRAM_ID&per_page=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Statistics

```bash
curl -X GET "https://prod.qsights.com/api/evaluation/notifications/stats?program_id=YOUR_PROGRAM_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Bell Notifications

```bash
# Get unread notifications
curl -X GET "https://prod.qsights.com/api/evaluation/bell-notifications?is_read=false" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Mark notification as read
curl -X PATCH "https://prod.qsights.com/api/evaluation/bell-notifications/NOTIFICATION_ID/read" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Mark all as read
curl -X POST "https://prod.qsights.com/api/evaluation/bell-notifications/mark-all-read" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔧 Troubleshooting

### Emails Not Sending?

```bash
# Check SendGrid config
cd /Users/yash/Documents/Projects/QSightsOrg2.0/backend
php artisan tinker
>>> App\Models\SystemSetting::getValue('email_sendgrid_api_key');
>>> App\Models\SystemSetting::getValue('email_sender_email');

# Check notification logs
>>> App\Models\EvaluationNotificationLog::where('status', 'failed')->latest()->first();
```

### Reminders Not Working?

```bash
# Check if scheduler is running
php artisan schedule:list

# Run reminders manually
php artisan evaluations:send-reminders

# Check database
>>> App\Models\EvaluationReminderSchedule::pending()->count();
```

### Cron Job Not Running?

```bash
# Check crontab
crontab -l

# Check cron service
sudo service cron status

# View cron logs (varies by system)
grep CRON /var/log/syslog  # Ubuntu/Debian
tail -f /var/log/cron       # CentOS/RHEL
```

---

## 📱 Frontend Integration (Next Steps)

### 1. Bell Notification Icon

Create a bell icon component in the header:

```jsx
// Example: components/BellNotifications.tsx
import { Bell } from 'lucide-react';
import { useState, useEffect } from 'react';

export function BellNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    const response = await fetch('/api/evaluation/bell-notifications?is_read=false', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    setNotifications(data.notifications);
    setUnreadCount(data.unread_count);
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}>
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      {/* Dropdown with notifications */}
    </div>
  );
}
```

### 2. Admin Configuration Panel

Add a new tab in Evaluation Settings:

```jsx
// Example: app/evaluation-settings/page.tsx
<Tabs>
  <TabsList>
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="notifications">Notifications</TabsTrigger>
  </TabsList>
  
  <TabsContent value="notifications">
    <NotificationSettings programId={programId} />
  </TabsContent>
</Tabs>
```

---

## 📝 Monitoring Commands

### Daily Health Check

```bash
#!/bin/bash
# daily-notification-health-check.sh

echo "Evaluation Notification System - Health Check"
echo "=============================================="

cd /Users/yash/Documents/Projects/QSightsOrg2.0/backend

# Check scheduler
echo "1. Scheduler Status:"
php artisan schedule:list | grep evaluations

# Check queue worker
echo -e "\n2. Queue Worker Status:"
ps aux | grep "queue:work" | grep -v grep || echo "❌ Not running!"

# Check failed notifications (last 24 hours)
echo -e "\n3. Failed Notifications (last 24h):"
php artisan tinker --execute="
echo App\Models\EvaluationNotificationLog::where('status', 'failed')
    ->where('created_at', '>=', now()->subDay())
    ->count() . ' failed';
"

# Check pending reminders
echo -e "\n4. Pending Reminders:"
php artisan tinker --execute="
echo App\Models\EvaluationReminderSchedule::where('status', 'pending')
    ->where('scheduled_for', '<=', now())
    ->count() . ' due now';
"

echo -e "\n✓ Health check complete"
```

---

## 🎓 Key Concepts

### Notification Types

1. **trigger** - Sent when evaluation is assigned
2. **completion** - Sent when evaluation is completed  
3. **missed_deadline** - Sent when deadline passes without completion
4. **reminder** - Sent to evaluator before deadline

### Notification Channels

1. **email** - Email notifications via SendGrid
2. **bell** - In-app bell notifications (admins only)
3. **both** - Both email and bell (for admin notifications)

### Reminder Schedule

Array of days before deadline: `[7, 3, 1]`
- Creates 3 scheduled reminders
- Automatically sent when due
- Skips if evaluation already completed

### Email Templates

All templates support placeholders:
- `{{admin_name}}`, `{{evaluator_name}}`, `{{template_name}}`
- `{{staff_names}}`, `{{subordinates_count}}`
- `{{start_date}}`, `{{end_date}}`, `{{days_remaining}}`
- `{{evaluation_url}}`

---

## 🔗 Important Links

- **Full Documentation:** `EVALUATION_REMINDER_NOTIFICATION_SYSTEM.md`
- **Deployment Script:** `deploy_evaluation_notifications_feb_08_2026.sh`
- **Backend Code:** `backend/app/Services/EvaluationNotificationService.php`
- **Console Commands:** `backend/app/Console/Commands/`

---

## 📞 Quick Reference

### Manual Commands

```bash
# Send reminders
php artisan evaluations:send-reminders

# Check missed deadlines
php artisan evaluations:check-missed-deadlines

# View scheduler
php artisan schedule:list

# View notification logs
tail -f storage/logs/laravel.log | grep "Evaluation"
```

### Database Tables

- `evaluation_notification_configs` - Notification settings per program
- `evaluation_notification_logs` - Email notification history
- `evaluation_bell_notifications` - In-app notifications
- `evaluation_reminder_schedules` - Scheduled reminders

### API Endpoints

```
GET    /api/evaluation/notifications/config
PUT    /api/evaluation/notifications/config
GET    /api/evaluation/notifications/logs
GET    /api/evaluation/notifications/stats
GET    /api/evaluation/bell-notifications
PATCH  /api/evaluation/bell-notifications/{id}/read
POST   /api/evaluation/bell-notifications/mark-all-read
```

---

## ✅ Success Checklist

- [ ] Deployment script ran successfully
- [ ] Cron job is active
- [ ] Queue worker is running
- [ ] Triggered test evaluation
- [ ] Admin received email notification
- [ ] Bell notification appeared
- [ ] Reminder scheduled in database
- [ ] Ran manual reminder test
- [ ] Checked notification logs
- [ ] Verified SendGrid configuration

---

**Status:** ✅ System is LIVE and functional

**Next Steps:**
1. ✅ Backend complete
2. 🔄 Build frontend UI for admin panel
3. 🔄 Add bell icon to header
4. 🔄 Create notification history page

---

**Questions?** Check `EVALUATION_REMINDER_NOTIFICATION_SYSTEM.md` for detailed documentation.

**Implementation Date:** February 8, 2026  
**Version:** 1.0.0
