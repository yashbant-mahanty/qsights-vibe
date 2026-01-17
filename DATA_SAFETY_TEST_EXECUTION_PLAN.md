# Data Safety System - Test Execution Plan
**Date:** 17 January 2026  
**System:** https://prod.qsights.com  
**Status:** ✅ Backend Deployed | ✅ Frontend Deployed | ⏳ Awaiting Real Data Testing

---

## ✅ PRE-TEST VALIDATION (COMPLETED)

### Database Tables Status
```sql
✅ response_audit_logs table: EXISTS (0 records - expected)
✅ notification_logs table: EXISTS (0 records - expected)
✅ system_settings table: EXISTS with data_safety settings
```

### System Settings Verification
```
✅ data_safety_enable_response_backup: true (ON by default)
✅ data_safety_include_anonymous: true (Anonymous responses tracked)
✅ data_safety_enable_notification_logging: true (Notification tracking ON)
✅ data_safety_log_notification_content: true (Email content logged)
✅ data_safety_retention_policy: never (Keep forever until admin changes)
```

### API Endpoints Status
```
✅ GET  /api/data-safety/settings - Deployed
✅ POST /api/data-safety/settings - Deployed
✅ GET  /api/data-safety/health - Deployed
✅ GET  /api/data-safety/response-audit/stats - Deployed
✅ GET  /api/data-safety/notifications/stats - Deployed
```

### Frontend UI Status
```
✅ Settings → System Config → Data Safety tab - Deployed
✅ DataSafetySettings component - Loaded
✅ Toggle controls - Functional
```

---

## 🧪 TEST CASE 1: RESPONSE AUDIT LOGGING

### Objective
Verify that every response (participant + anonymous) is saved at the individual question/answer level with complete audit trail.

### Prerequisites
- [ ] At least ONE active Activity with attached Questionnaire
- [ ] Questionnaire has multiple question types (MCQ, checkbox, text, rating)
- [ ] Activity is published and accepting responses

### Test Steps

#### 1A. Logged-in Participant Response
```
1. Login as a registered participant
2. Navigate to the activity/questionnaire
3. Answer ALL questions:
   - Multiple choice question
   - Checkbox question  
   - Text input question
   - Any other question types
4. Submit the response
5. Note the timestamp
```

#### 1B. Anonymous User Response
```
1. Open activity link in INCOGNITO mode (no login)
2. Answer the same questionnaire
3. Submit as anonymous/guest user
4. Note the timestamp
```

### Backend Validation Commands

```bash
# SSH into production server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Check total response audit records
cd /var/www/QSightsOrg2.0/backend
php artisan tinker --execute="echo 'Total responses logged: ' . DB::table('response_audit_logs')->count();"

# View latest 5 records with details
php artisan tinker --execute="
DB::table('response_audit_logs')
  ->orderBy('id', 'desc')
  ->limit(5)
  ->get()
  ->each(function(\$r) {
    echo \"ID: \$r->id\\n\";
    echo \"  User ID: \$r->user_id\\n\";
    echo \"  Anonymous Token: \$r->anonymous_token\\n\";
    echo \"  Activity ID: \$r->activity_id\\n\";
    echo \"  Questionnaire ID: \$r->questionnaire_id\\n\";
    echo \"  Question ID: \$r->question_id\\n\";
    echo \"  Option ID: \$r->option_id\\n\";
    echo \"  Answer: \$r->answer_value\\n\";
    echo \"  Source: \$r->response_source\\n\";
    echo \"  Submitted: \$r->submitted_at\\n\";
    echo \"---\\n\";
  });
"
```

### Expected Results ✅

**For Logged-in User:**
- ✅ Each answer = 1 database record
- ✅ `user_id` populated with actual user ID
- ✅ `anonymous_token` = NULL
- ✅ `participant_id` populated if applicable
- ✅ `activity_id`, `questionnaire_id`, `question_id` all populated
- ✅ `option_id` populated for MCQ/checkbox
- ✅ `answer_value` populated for text inputs
- ✅ `response_source` = 'web' or 'api'
- ✅ `submitted_at` matches submission time

**For Anonymous User:**
- ✅ Each answer = 1 database record
- ✅ `user_id` = NULL
- ✅ `anonymous_token` populated (UUID format)
- ✅ All other fields populated same as logged-in user

### Frontend Validation

```
1. Navigate to: https://prod.qsights.com/activities/{activity_id}/results
   OR: Reports & Analytics → Activity Results

2. Verify:
   ✅ Question-wise breakdown is visible
   ✅ Each response is counted correctly
   ✅ Participant names shown for logged-in users
   ✅ "Anonymous User" or "Guest" shown for anonymous responses
   ✅ Response counts match database records
   ✅ Charts/graphs reflect accurate data
```

### Failure Criteria ❌

- Response not saved to database
- Any field is NULL when it should have value
- Multiple answers aggregated into single record (should be individual)
- Anonymous responses not tracked
- UI doesn't show data that exists in database
- Mismatch between DB count and UI count

---

## 🧪 TEST CASE 2: NOTIFICATION TRACKING

### Objective
Verify complete email notification lifecycle tracking from send → delivered → opened.

### Prerequisites
- [ ] SendGrid API key configured in System Settings
- [ ] Sender email verified in SendGrid
- [ ] SendGrid webhook configured: https://prod.qsights.com/api/webhooks/sendgrid
- [ ] At least ONE activity with email notifications enabled

### Test Steps

#### 2A. Send Test Notification
```
1. Login as Super Admin
2. Navigate to Activity → Send Notifications
3. Send email to a REAL email address you can access
4. Use clear subject line: "TEST - Data Safety Notification Tracking"
5. Note the send timestamp
```

#### 2B. Trigger Email Events
```
1. Open your email inbox
2. Open the notification email
3. Click any links in the email (if present)
4. Wait 30 seconds for webhooks to process
```

### Backend Validation Commands

```bash
# Check total notification logs
php artisan tinker --execute="echo 'Total notifications logged: ' . DB::table('notification_logs')->count();"

# View latest notification details
php artisan tinker --execute="
DB::table('notification_logs')
  ->orderBy('id', 'desc')
  ->limit(3)
  ->get()
  ->each(function(\$n) {
    echo \"ID: \$n->id\\n\";
    echo \"  User ID: \$n->user_id\\n\";
    echo \"  Activity ID: \$n->activity_id\\n\";
    echo \"  Channel: \$n->channel\\n\";
    echo \"  Provider: \$n->provider\\n\";
    echo \"  Recipient: \$n->recipient_email\\n\";
    echo \"  Status: \$n->status\\n\";
    echo \"  Provider Message ID: \$n->provider_message_id\\n\";
    echo \"  Sent At: \$n->sent_at\\n\";
    echo \"  Delivered At: \$n->delivered_at\\n\";
    echo \"  Opened At: \$n->opened_at\\n\";
    echo \"  Clicked At: \$n->clicked_at\\n\";
    echo \"---\\n\";
  });
"

# Check webhook events
php artisan tinker --execute="
DB::table('notification_logs')
  ->whereNotNull('webhook_events')
  ->orderBy('id', 'desc')
  ->limit(1)
  ->get()
  ->each(function(\$n) {
    echo \"Latest Webhook Events:\\n\";
    echo \$n->webhook_events . \"\\n\";
  });
"
```

### Expected Results ✅

**Initial Send:**
- ✅ Notification record created immediately after send
- ✅ `channel` = 'email'
- ✅ `provider` = 'SendGrid'
- ✅ `recipient_email` = test email address
- ✅ `status` = 'queued' or 'sent'
- ✅ `provider_message_id` populated (SendGrid msg ID)
- ✅ `sent_at` timestamp populated
- ✅ `subject` and `body` logged (if `log_notification_content` = true)

**After Email Delivery:**
- ✅ Status updated to 'delivered'
- ✅ `delivered_at` timestamp populated
- ✅ Webhook event JSON saved in `webhook_events`

**After Email Open:**
- ✅ Status updated to 'opened'
- ✅ `opened_at` timestamp populated
- ✅ `open_count` incremented

**After Link Click:**
- ✅ `clicked_at` timestamp populated
- ✅ `click_count` incremented

### Frontend Validation

```
1. Navigate to: https://prod.qsights.com/notifications
   OR: Reports → Notification Tracking

2. Verify:
   ✅ Email appears in notification list
   ✅ Recipient name/email displayed correctly
   ✅ Status badges show correct status (Sent/Delivered/Opened)
   ✅ Timestamps are accurate
   ✅ Activity name linked correctly
   ✅ NO placeholder values like "Participant 1" or "User 123"
   ✅ If user clicked link, click count shown
```

### Failure Criteria ❌

- Notification not logged in database
- Status stuck at 'queued' after sending
- Webhook events not recorded
- Status timestamps missing
- Frontend shows dummy/placeholder data
- Data in DB but not visible in UI
- Email content not logged when setting is ON

---

## 🧪 TEST CASE 3: DATA SAFETY UI CONTROLS

### Objective
Verify Super Admin can view and modify Data Safety settings via UI.

### Test Steps

```
1. Login as Super Admin
2. Navigate to: Settings → System Config → Data Safety tab
3. Observe current settings display
4. Toggle "Enable Response Backup" OFF
5. Click Save
6. Refresh page
7. Toggle "Enable Response Backup" back ON
8. Change "Data Retention Policy" to "2 years"
9. Click Save
10. Verify changes persist
```

### Backend Validation

```bash
# Check settings after UI changes
php artisan tinker --execute="
DB::table('system_settings')
  ->where('category', 'data_safety')
  ->get(['key', 'value', 'updated_at'])
  ->each(fn(\$s) => print(\"\$s->key: \$s->value (updated: \$s->updated_at)\\n\"));
"
```

### Expected Results ✅

- ✅ Current settings load correctly on page load
- ✅ System health indicators show green/red status
- ✅ Toggle changes reflect immediately
- ✅ Save button updates database
- ✅ Changes persist after page refresh
- ✅ `updated_at` timestamp changes in database
- ✅ Unsaved changes warning appears if navigating away

### Failure Criteria ❌

- Settings don't load from database
- Toggle doesn't update UI state
- Save button doesn't update database
- Changes don't persist after refresh
- No visual feedback on save success/failure

---

## 📊 FINAL VALIDATION CHECKLIST

### Database Layer
- [ ] `response_audit_logs` table has records after test responses
- [ ] `notification_logs` table has records after test emails
- [ ] Every answer = 1 row (no aggregation)
- [ ] Anonymous responses have `anonymous_token`
- [ ] Logged-in responses have `user_id`
- [ ] Notification status progression logged correctly

### Business Logic
- [ ] Response backup happens automatically (no manual trigger)
- [ ] Anonymous responses tracked when setting ON
- [ ] Notification lifecycle captured via webhooks
- [ ] Email content logged when setting ON
- [ ] System respects retention policy setting

### Frontend UI
- [ ] Data Safety tab visible in System Config
- [ ] Settings load from database correctly
- [ ] Toggle controls functional
- [ ] Activity results show question-wise breakdown
- [ ] Notification tracking page shows lifecycle
- [ ] Real names displayed (no placeholders)
- [ ] Counts match database

### Integration
- [ ] Response save triggers audit log creation
- [ ] Email send triggers notification log creation
- [ ] SendGrid webhook updates notification status
- [ ] UI queries pull from audit tables
- [ ] No errors in browser console
- [ ] No errors in Laravel logs

---

## 🚨 KNOWN LIMITATIONS (TO FIX IF FOUND)

### If Response Audit Fails:
1. Check if ResponseController calls ResponseAuditService
2. Verify service is injected via dependency injection
3. Check Laravel logs: `tail -f /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log`

### If Notification Tracking Fails:
1. Verify SendGrid webhook endpoint is accessible
2. Check webhook signature validation
3. Test webhook manually: `POST /api/webhooks/sendgrid` with SendGrid event payload
4. Check NotificationLogService is called in EmailService

### If UI Doesn't Show Data:
1. Verify API endpoints return data
2. Check browser console for 401/403/500 errors
3. Verify DataSafetySettings component fetches from correct endpoint
4. Check if Super Admin role has proper permissions

---

## 📝 TEST EXECUTION LOG

### Test Run #1
**Date:** _________________  
**Tester:** _________________  
**Activity Used:** _________________  
**Email Used:** _________________

**Results:**
- [ ] Test Case 1: Response Audit - PASS / FAIL
- [ ] Test Case 2: Notification Tracking - PASS / FAIL
- [ ] Test Case 3: UI Controls - PASS / FAIL

**Screenshots Taken:**
1. Database query results showing response_audit_logs
2. Database query results showing notification_logs
3. Activity results page in UI
4. Notification tracking page in UI
5. Data Safety settings page

**Issues Found:**
_______________________________________________________
_______________________________________________________
_______________________________________________________

**Action Items:**
_______________________________________________________
_______________________________________________________
_______________________________________________________

---

## ✅ SIGN-OFF CRITERIA

**DO NOT MARK COMPLETE UNTIL:**

1. ✅ At least 5 responses logged in `response_audit_logs` table
2. ✅ At least 1 notification logged in `notification_logs` table  
3. ✅ Status progression visible (sent → delivered → opened)
4. ✅ UI shows real data (not placeholders)
5. ✅ Database counts match UI counts
6. ✅ Screenshots attached as evidence
7. ✅ All 3 test cases marked PASS

---

**Next Steps After Testing:**
1. Document any bugs found
2. Create GitHub issues for bugs
3. Update deployment documentation
4. Train Super Admin on Data Safety features
5. Monitor production logs for 48 hours
6. Schedule weekly data audit review

---

**Test Plan Status:** ⏳ READY FOR EXECUTION  
**System Status:** ✅ DEPLOYED - AWAITING REAL DATA VALIDATION
