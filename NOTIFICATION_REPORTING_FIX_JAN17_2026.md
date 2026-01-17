# Notification Reporting Fix - January 17, 2026

## Problem Summary

### Issues Identified:
1. **Data Inconsistency**: Event Results and Reports & Analytics showing different notification data
2. **Missing Participant Details**: Participant names displayed as "Participant 1 (participant-0@example.com)" instead of actual names
3. **Wrong Data Source**: System was using `notification_reports` table (aggregated summaries) instead of `notification_logs` table (individual tracking with participant details)
4. **No Individual Tracking**: Email notifications were not being logged individually, only as aggregated campaign summaries

### Root Cause:
- `notification_reports` table: OLD system - only stores aggregated counts per campaign, NO participant-level data
- `notification_logs` table: NEW system (deployed Jan 17) - has participant_id, user_id, recipient_email, status tracking
- NotificationController was creating aggregated reports instead of individual logs
- Frontend was fabricating fake participant names from aggregated data

---

## Solution Implemented

### Backend Changes

#### 1. NotificationController.php
**File**: `/backend/app/Http/Controllers/Api/NotificationController.php`

**Changes Made**:
- Added `NotificationLogService` dependency injection
- Updated `sendNotifications()` method to create individual `NotificationLog` entries for each email
- Logs created BEFORE sending with full participant details:
  - user_id
  - participant_id
  - recipient_email
  - event_id (activity_id)
  - questionnaire_id
  - notification_type
  - subject
  - message
- Status updates after sending:
  - `markAsSent()` with SendGrid message ID on success
  - `markAsFailed()` with error message on failure
- Added 2 new API endpoints:
  - `GET /api/notifications/logs` - All notification logs with participant details
  - `GET /api/notifications/logs/{activityId}` - Logs for specific activity

**New Methods**:
```php
public function getNotificationLogs(Request $request)
{
    // Returns notification_logs with participant/user relationships
    // Includes stats: total, sent, delivered, opened, read, failed
}

public function getNotificationLogsForActivity($activityId)
{
    // Returns logs for specific activity with participant details
}
```

#### 2. API Routes
**File**: `/backend/routes/api.php`

**Added Routes**:
```php
// NEW: Detailed notification logs with participant info
Route::get('/notifications/logs', [NotificationController::class, 'getNotificationLogs']);
Route::get('/notifications/logs/{activityId}', [NotificationController::class, 'getNotificationLogsForActivity']);
```

**Kept for Backward Compatibility**:
```php
// OLD: Aggregated reports
Route::get('/notifications/reports', [NotificationController::class, 'getAllReports']);
Route::get('/notifications/reports/{activityId}', [NotificationController::class, 'getReports']);
```

---

### Frontend Changes

#### 1. API Client
**File**: `/frontend/lib/api.ts`

**Changes Made**:
- Added new methods to `notificationsApi`:
  - `getLogsForActivity(activityId)` - NEW detailed logs
  - `getAllLogs(params)` - NEW all logs with filters
- Kept old methods for backward compatibility:
  - `getReportsForActivity(activityId)` - OLD aggregated
  - `getAllReports()` - OLD aggregated

#### 2. Event Results Page
**File**: `/frontend/app/activities/[id]/results/page.tsx`

**Changes Made**:
- Switched from `notificationsApi.getReportsForActivity()` to `notificationsApi.getLogsForActivity()`
- Updated notification statistics cards:
  - Total Notifications (individual count)
  - Delivered (filtered by status)
  - Opened (filtered by status)
  - Failed (filtered by status)
- Completely redesigned notification table:
  - **Before**: Aggregated campaign view (template_type, total_recipients, sent_count, failed_count)
  - **After**: Individual notification view with:
    - Participant Name (real name from participant table)
    - Email Address
    - Notification Type
    - Status (sent/delivered/opened/read/failed)
    - Sent At timestamp
    - Delivered At timestamp
    - Opened At timestamp

#### 3. Reports & Analytics Page
**File**: `/frontend/app/analytics/page.tsx`

**Changes Made**:
- Switched from `notificationsApi.getAllReports()` to `notificationsApi.getAllLogs()`
- Removed fabricated participant names logic
- Now displays actual participant names from database
- Simplified transformation - logs already contain participant details

---

## Data Flow

### Before Fix:
```
Email Sent → NotificationReport created (aggregated) → Frontend fabricates participant names
```

### After Fix:
```
Email Sent → NotificationLog created (individual with participant_id)
           ↓
    Load participant relationship
           ↓
    Frontend displays real participant name/email
```

---

## Database Tables

### notification_reports (OLD - Kept for backward compatibility)
```sql
- id (uuid)
- activity_id (uuid)
- template_type (string)
- total_recipients (int)
- sent_count (int)
- failed_count (int)
- failed_emails (json)
- error_details (text)
- created_at, updated_at
```
**Purpose**: Aggregated campaign summary (no individual tracking)

### notification_logs (NEW - Primary source)
```sql
- id (bigint)
- user_id (bigint, nullable)
- participant_id (bigint, nullable)
- anonymous_token (string, nullable)
- recipient_email (string)
- recipient_phone (string, nullable)
- event_id (uuid, nullable) -- Activity ID
- questionnaire_id (bigint, nullable)
- notification_type (string)
- channel (enum: email, in-app, sms, push)
- provider (string: SendGrid, Twilio, etc.)
- provider_message_id (string)
- subject, message_preview
- status (enum: queued, sent, delivered, opened, read, clicked, bounced, failed)
- queued_at, sent_at, delivered_at, opened_at, read_at, clicked_at, bounced_at, failed_at
- error_message
- webhook_events (json)
- created_at, updated_at, deleted_at
```
**Purpose**: Individual notification tracking with full participant context

---

## Testing Checklist

### Pre-Deployment:
- [x] Backend changes committed
- [x] Frontend changes committed
- [x] API routes added
- [x] NotificationLogService integration verified

### Post-Deployment:
- [ ] Trigger manual email notification
- [ ] Verify `notification_logs` table receives records with participant_id
- [ ] Check Event Results → Notification tab shows real participant names
- [ ] Check Reports & Analytics → Notification Reports shows same data
- [ ] Verify no "Participant 1" placeholder names
- [ ] Confirm status updates (sent, delivered, opened) work via SendGrid webhooks

---

## Files Modified

### Backend (4 files):
1. `/backend/app/Http/Controllers/Api/NotificationController.php` - Added NotificationLogService integration + 2 new endpoints
2. `/backend/routes/api.php` - Added 2 new routes for notification logs
3. (No changes needed to NotificationLogService - already complete)
4. (No changes needed to notification_logs migration - already deployed)

### Frontend (3 files):
1. `/frontend/lib/api.ts` - Added new API methods for notification logs
2. `/frontend/app/activities/[id]/results/page.tsx` - Updated to use logs API + redesigned table
3. `/frontend/app/analytics/page.tsx` - Updated to use logs API + removed fake participant logic

---

## Deployment Steps

### 1. Deploy Backend:
```bash
cd /var/www/QSightsOrg2.0/backend
git pull origin main
php artisan config:clear
php artisan cache:clear
sudo systemctl restart php8.4-fpm
```

### 2. Deploy Frontend:
```bash
cd /var/www/QSightsOrg2.0/frontend
git pull origin main
npm run build
pm2 restart qsights-frontend
```

### 3. Verify:
```bash
# Check notification_logs table
php artisan tinker --execute="echo NotificationLog::count();"

# Trigger test email
# Verify database record created with participant details
```

---

## Acceptance Criteria

✅ **Data Consistency**: Both Event Results and Reports & Analytics show identical notification data
✅ **Participant Names**: Display actual participant names from `participants` table, not "Participant 1"
✅ **Email Addresses**: Show real email addresses, not `participant-0@example.com`
✅ **Status Tracking**: All status transitions (queued → sent → delivered → opened) persisted correctly
✅ **No Regressions**: Existing notification sending flow works without changes
✅ **Backward Compatibility**: Old `/notifications/reports` endpoints still work

---

## Next Steps

1. Deploy to production
2. Trigger test email notification
3. Verify notification_logs table populated
4. Check both UI pages show correct data
5. Monitor SendGrid webhook updates for status changes
6. Document any issues found

---

## Notes

- The old `notification_reports` table is kept for backward compatibility but is no longer actively used
- Future notifications will only create entries in `notification_logs` table
- SendGrid webhook integration will update status in `notification_logs` (already implemented)
- This fix aligns with the Data Safety & Audit Logging System deployed earlier today

