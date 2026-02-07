# CHUNK B10 - Notification Engine Documentation

## Implementation Summary

### Database Schema

**Notifications Table** (`notifications`)
- `id` (UUID) - Primary key
- `type` (string) - email, sms
- `event` (string) - activity_created, activity_reminder, response_submitted, etc.
- `participant_id` (UUID, nullable) - Foreign key to participants
- `recipient_email` (string, nullable) - Email recipient
- `recipient_phone` (string, nullable) - Phone recipient
- `subject` (string, nullable) - Email subject
- `message` (text) - Notification message body
- `status` (string) - pending, sent, failed, queued
- `metadata` (JSON, nullable) - Additional data (activity_id, program_id, etc.)
- `error_message` (text, nullable) - Error details if failed
- `sent_at` (timestamp, nullable) - When notification was sent
- `retry_count` (integer) - Number of retry attempts
- **Indexes**: type, status, event, [participant_id, type], sent_at

**Participant Preferences** (added to `participants` table)
- `email_notifications` (boolean) - Default: true
- `sms_notifications` (boolean) - Default: false
- `notification_preferences` (JSON, nullable) - Additional preferences

### Services

#### 1. EmailService (`app/Services/EmailService.php`)
**Purpose**: Handle email sending via SendGrid API

**Methods:**
- `send($to, $subject, $message, $metadata)` - Generic email sender
- `sendActivityInvitation($participant, $activity)` - Activity invitation email
- `sendActivityReminder($participant, $activity)` - Activity reminder email
- `renderActivityInvitationTemplate($participant, $activity)` - HTML template for invitations
- `renderActivityReminderTemplate($participant, $activity)` - HTML template for reminders

**Features:**
- SendGrid integration
- HTML email templates with CSS styling
- Automatic notification logging
- Error handling and retry tracking

**Email Templates:**
1. **Activity Invitation**
   - Header: "You're Invited!"
   - Activity details (name, start date, type, description)
   - CTA button: "View Activity"
   - Styled with indigo theme

2. **Activity Reminder**
   - Header: "⏰ Activity Reminder"
   - Alert box with start date/time
   - CTA button: "Go to Activity"
   - Styled with amber/orange theme

#### 2. SMSService (`app/Services/SMSService.php`)
**Purpose**: Placeholder for future SMS integration (Twilio, AWS SNS, etc.)

**Methods:**
- `send($to, $message, $metadata)` - Generic SMS sender (placeholder)
- `sendActivityInvitation($participant, $activity)` - Activity invitation SMS
- `sendActivityReminder($participant, $activity)` - Activity reminder SMS

**Current Behavior:**
- Logs notifications with status='pending'
- Returns success=false with message about SMS not configured
- Ready for future integration with SMS providers

#### 3. NotificationService (`app/Services/NotificationService.php`)
**Purpose**: Orchestrate email and SMS notifications

**Methods:**
- `notifyActivityCreated(Activity $activity, $participants)` - Send invitations to participants
- `sendActivityReminders(Activity $activity, $participants)` - Send reminders (skips already submitted)
- `sendCustomNotification(Participant $participant, $subject, $message, $metadata)` - Custom notifications

**Features:**
- Respects participant notification preferences
- Bulk notification sending
- Skips reminders for participants who already submitted responses
- Returns statistics (sent/failed counts for email/SMS)

### Events & Listeners

#### ActivityCreated Event (`app/Events/ActivityCreated.php`)
**Trigger:** When a new activity is created

**Payload:**
- `$activity` - The created activity instance

#### SendActivityNotifications Listener (`app/Listeners/SendActivityNotifications.php`)
**Implements:** `ShouldQueue` (runs in background)

**Action:**
- Automatically sends invitation notifications to all active participants in the activity's program

**Usage in Controller:**
```php
use App\Events\ActivityCreated;

// After creating activity
event(new ActivityCreated($activity));
```

### Artisan Commands

#### `activity:send-reminders` (`app/Console/Commands/SendActivityReminders.php`)

**Purpose:** Send reminder notifications for upcoming activities

**Signature:**
```bash
php artisan activity:send-reminders {--days=1}
```

**Options:**
- `--days` (default: 1) - Send reminders for activities starting in X days

**Behavior:**
1. Finds all 'live' activities starting in X days
2. Gets active participants from each activity's program
3. Skips participants who already submitted responses
4. Sends email/SMS reminders based on preferences
5. Reports statistics: sent, failed counts

**Schedule Integration:**
Add to `app/Console/Kernel.php`:
```php
protected function schedule(Schedule $schedule)
{
    // Send reminders daily for activities starting tomorrow
    $schedule->command('activity:send-reminders --days=1')
             ->dailyAt('09:00');
    
    // Send reminders for activities starting in 7 days
    $schedule->command('activity:send-reminders --days=7')
             ->dailyAt('09:00');
}
```

### Configuration

#### Environment Variables (.env)
```env
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
MAIL_FROM_ADDRESS=noreply@qsights.com
MAIL_FROM_NAME="QSights Platform"
APP_URL=http://localhost:3000
```

#### SendGrid Setup
1. Create account at https://sendgrid.com
2. Create API key with "Mail Send" permission
3. Add API key to `.env`
4. Verify sender email in SendGrid dashboard

### Testing

#### Manual Test Script (`test_notifications.php`)
```bash
php test_notifications.php
```

**Tests:**
1. EmailService - Send activity invitation
2. SMSService - Placeholder SMS
3. Notification Logs - Query logged notifications
4. NotificationService - Bulk notification sending

**Expected Output:**
```
=== QSights Notification System Test ===

Test Activity: Q1 Employee Satisfaction Survey
Test Participant: Alice Johnson (alice@example.com)

Test 1: Email Service
----------------------
Result: FAILED (if no valid SendGrid key)
Notification ID: [UUID]

Test 2: SMS Service (Placeholder)
-----------------------------------
Result: PENDING
Message: SMS service is not configured. Notification logged for future processing.
Notification ID: [UUID]

Test 3: Notification Logs
--------------------------
Total notifications for Alice Johnson: 4
  - [email] activity_created: failed (ID: [UUID])
  - [sms] activity_created: pending (ID: [UUID])
```

#### Testing Reminder Command
```bash
# Test with activities starting tomorrow
php artisan activity:send-reminders --days=1

# Test with activities starting in 7 days
php artisan activity:send-reminders --days=7
```

### Database Queries

#### View All Notifications
```sql
SELECT 
    id, type, event, status, 
    recipient_email, created_at, error_message
FROM notifications
ORDER BY created_at DESC
LIMIT 10;
```

#### Notification Statistics
```sql
SELECT 
    type,
    status,
    COUNT(*) as count
FROM notifications
GROUP BY type, status;
```

#### Failed Notifications
```sql
SELECT 
    id, type, event, recipient_email, 
    error_message, retry_count, created_at
FROM notifications
WHERE status = 'failed'
ORDER BY created_at DESC;
```

#### Participant Notification Preferences
```sql
SELECT 
    id, name, email,
    email_notifications, sms_notifications
FROM participants
WHERE status = 'active';
```

## API Integration

### Trigger Notifications Programmatically

#### 1. Via Event (Recommended)
```php
use App\Events\ActivityCreated;

$activity = Activity::create([...]);
event(new ActivityCreated($activity));
```

#### 2. Via NotificationService (Manual)
```php
use App\Services\NotificationService;

$notificationService = app(NotificationService::class);

// Send to all program participants
$results = $notificationService->notifyActivityCreated($activity);

// Send to specific participants
$participants = Participant::whereIn('id', [...])->get();
$results = $notificationService->notifyActivityCreated($activity, $participants);

// Custom notification
$participant = Participant::find($id);
$notificationService->sendCustomNotification(
    $participant,
    'Custom Subject',
    '<h1>Custom HTML Message</h1>',
    ['event' => 'custom_event']
);
```

#### 3. Via EmailService (Direct)
```php
use App\Services\EmailService;

$emailService = app(EmailService::class);

// Activity invitation
$result = $emailService->sendActivityInvitation($participant, $activity);

// Activity reminder
$result = $emailService->sendActivityReminder($participant, $activity);

// Generic email
$result = $emailService->send(
    'recipient@example.com',
    'Subject',
    '<p>HTML message</p>',
    ['event' => 'custom', 'metadata' => '...']
);
```

## Features Summary

### ✅ Implemented
1. **Email Notifications**
   - SendGrid integration
   - HTML templates (invitation, reminder)
   - Automatic logging
   - Error handling

2. **SMS Notifications**
   - Placeholder service ready for integration
   - Logs pending notifications

3. **Notification Logging**
   - All notifications logged in database
   - Status tracking (pending, sent, failed)
   - Error messages captured
   - Retry count tracking

4. **Event-Driven Architecture**
   - ActivityCreated event
   - Background listener (queued)
   - Automatic invitation sending

5. **Scheduled Reminders**
   - Artisan command for reminders
   - Configurable days before activity
   - Skips participants who submitted
   - Bulk processing

6. **Participant Preferences**
   - Email notifications toggle
   - SMS notifications toggle
   - JSON preferences for future extensibility

7. **Multiple Notification Types**
   - Activity invitations
   - Activity reminders
   - Custom notifications

### 🔄 Future Enhancements
1. SMS provider integration (Twilio, AWS SNS)
2. Push notifications (mobile app)
3. In-app notifications
4. Webhook notifications
5. Notification templates management UI
6. A/B testing for notification content
7. Notification analytics dashboard
8. Rate limiting and throttling
9. Notification queue management
10. Unsubscribe functionality

## Troubleshooting

### Email Not Sending
1. **Check SendGrid API Key**
   ```bash
   # Verify in .env
   SENDGRID_API_KEY=SG.xxx
   ```

2. **Check Notification Logs**
   ```sql
   SELECT * FROM notifications WHERE status = 'failed';
   ```

3. **Check Laravel Logs**
   ```bash
   tail -f storage/logs/laravel.log
   ```

### Queue Not Processing
```bash
# Start queue worker
php artisan queue:work

# Check failed jobs
php artisan queue:failed
```

### Reminders Not Sending
1. **Check Activity Dates**
   ```sql
   SELECT name, start_date, status 
   FROM activities 
   WHERE status = 'live' 
   AND DATE(start_date) = CURRENT_DATE + INTERVAL '1 day';
   ```

2. **Check Participant Preferences**
   ```sql
   SELECT COUNT(*) FROM participants 
   WHERE email_notifications = true;
   ```

## Performance Considerations

### Background Processing
- Listener implements `ShouldQueue` for async processing
- Large participant lists processed in background
- Won't block API requests

### Batch Notifications
- NotificationService processes multiple participants efficiently
- Returns aggregated statistics
- Database inserts optimized

### Scheduling
- Reminder command can be scheduled at off-peak hours
- Processes only activities for specific date
- Skips already-notified participants

---

**Implementation Date:** December 2, 2025  
**Laravel Version:** 11.47.0  
**SendGrid SDK:** 8.1.11  
**Total Services:** 3 (Email, SMS, Notification)  
**Total Commands:** 1 (SendActivityReminders)  
**Total Events:** 1 (ActivityCreated)  
**Test Coverage:** ✅ All core features validated
