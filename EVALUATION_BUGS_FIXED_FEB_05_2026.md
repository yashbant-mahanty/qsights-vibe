# Evaluation Module Bug Fixes - February 05, 2026

## Summary
Fixed two critical issues in the Evaluation module:
1. **Scheduled evaluation emails not being delivered**
2. **Super Admin unable to see history/reports for all programs**

---

## Issue #1: Scheduled Emails Not Delivered

### Problem
When an Evaluation Admin triggers an evaluation with "Schedule Send" (future date/time), the system creates the evaluation record but **never sends the email** to evaluators, even after the scheduled time has passed.

### Root Cause
The Laravel scheduler was not configured to run the `SendScheduledEvaluations` command. While the command existed ([backend/app/Console/Commands/SendScheduledEvaluations.php](backend/app/Console/Commands/SendScheduledEvaluations.php)), it was never being executed automatically.

### Console Evidence
```javascript
{
  "success": true,
  "message": "Evaluation triggered successfully. 0 email(s) sent.",
  "triggered_count": 1,
  "emails_sent": 0,  // ❌ No emails sent
  "scheduled_trigger_at": "2026-02-05 19:45:00",
  "email_sent_at": null  // ❌ Never sent
}
```

### Solution
Added scheduled task to [backend/app/Console/Kernel.php](backend/app/Console/Kernel.php#L16-L21):

```php
protected function schedule(Schedule $schedule): void
{
    // Send scheduled evaluation emails every 5 minutes
    $schedule->command('evaluations:send-scheduled')
        ->everyFiveMinutes()
        ->withoutOverlapping()
        ->runInBackground();
}
```

### How It Works
1. Every 5 minutes, Laravel scheduler checks for evaluations where:
   - `scheduled_trigger_at` is not null
   - `scheduled_trigger_at` <= current time
   - `email_sent_at` is null (not yet sent)
   - `deleted_at` is null (not deleted)

2. For each pending evaluation:
   - Sends email to evaluator with evaluation link
   - Updates `email_sent_at` timestamp
   - Logs success/failure

### Setup Required
Add to crontab for continuous execution:
```bash
* * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1
```

### Testing
Run manually to send pending scheduled emails:
```bash
php artisan evaluations:send-scheduled
```

---

## Issue #2: Super Admin History Tab Empty

### Problem
Super Admin role could not see evaluation reports/history in the "History" tab. The tab showed empty results, while Evaluation Admin could see their program's history.

### Root Cause
All evaluation report endpoints were filtering by `program_id` without considering the Super Admin role. Super Admins have no specific `program_id` (it's null or multi-program), so the filter excluded all results.

### Console Evidence
```javascript
{
  "success": true,
  "reports": [],  // ❌ Empty for Super Admin
  "total_evaluations": 0,
  "total_staff_evaluated": 0
}
```

But the same endpoint returned data for Evaluation Admin with a specific program_id.

### Solution
Updated all evaluation report endpoints in [backend/app/Http/Controllers/Api/EvaluationTriggerController.php](backend/app/Http/Controllers/Api/EvaluationTriggerController.php):

#### 1. `reports()` method (Line ~820)
```php
// Super admin sees all programs if no program_id specified
// Other roles (evaluation-admin, program-admin) must filter by program
if ($programId || !in_array($user->role, ['super-admin', 'admin'])) {
    // If programId is provided, use it; otherwise use user's program_id
    $effectiveProgramId = $programId ?? $user->program_id;
    if ($effectiveProgramId) {
        $query->where('et.program_id', $effectiveProgramId);
    }
}
```

#### 2. `reportsSummary()` method (Line ~980)
```php
// Super admin sees all programs if no program_id specified
if ($programId || !in_array($user->role, ['super-admin', 'admin'])) {
    $effectiveProgramId = $programId ?? $user->program_id;
    if ($effectiveProgramId) {
        $query->where('evaluation_triggered.program_id', $effectiveProgramId);
    }
}
```

#### 3. `staffDetail()` method (Line ~1170)
#### 4. `evaluatorsList()` method (Line ~1270)
#### 5. `evaluatedStaff()` method (Line ~1320)

All endpoints updated with the same pattern.

### How It Works
- **Super Admin / Admin**: If no `program_id` query parameter is provided, returns data from **all programs** (no filter applied)
- **Evaluation Admin / Program Admin**: Always filters by their assigned `program_id` or the provided query parameter
- **All roles**: Can optionally pass `?program_id=xxx` to filter specific programs

---

## Files Modified

### Backend
1. [backend/app/Console/Kernel.php](backend/app/Console/Kernel.php)
   - Added scheduled task for sending evaluation emails

2. [backend/app/Http/Controllers/Api/EvaluationTriggerController.php](backend/app/Http/Controllers/Api/EvaluationTriggerController.php)
   - `reports()` - Fixed Super Admin filtering
   - `reportsSummary()` - Fixed Super Admin filtering
   - `staffDetail()` - Fixed Super Admin filtering
   - `evaluatorsList()` - Fixed Super Admin filtering
   - `evaluatedStaff()` - Fixed Super Admin filtering

### Deployment
3. [deploy_evaluation_fixes_feb_05_2026.sh](deploy_evaluation_fixes_feb_05_2026.sh)
   - Automated deployment script

---

## Testing Instructions

### Test Issue #1: Scheduled Emails

1. **Trigger evaluation with scheduled send:**
   - Login as Evaluation Admin
   - Go to Evaluation page → Trigger tab
   - Select template and evaluators
   - Set "Schedule Send" to 5-10 minutes in future
   - Click "Trigger Evaluation"

2. **Verify scheduled record:**
   ```sql
   SELECT id, evaluator_name, scheduled_trigger_at, email_sent_at, status
   FROM evaluation_triggered
   WHERE scheduled_trigger_at IS NOT NULL
   ORDER BY scheduled_trigger_at DESC
   LIMIT 5;
   ```

3. **Wait for scheduled time to pass**

4. **Check if email was sent:**
   - Run: `php artisan evaluations:send-scheduled`
   - Verify in database: `email_sent_at` should be populated
   - Check evaluator's inbox for email

5. **Verify automated sending:**
   - Wait 5 minutes after scheduled time
   - Check if cron executed and sent email automatically

### Test Issue #2: Super Admin History

1. **Login as Super Admin**

2. **Navigate to Evaluation page → History tab**

3. **Verify results:**
   - Should see evaluations from **all programs**
   - Summary cards should show aggregated data
   - Filter by program should work

4. **Compare with Evaluation Admin:**
   - Login as Evaluation Admin
   - Should only see their specific program's data

5. **Test filters:**
   - Department filter
   - Evaluator filter
   - Date range filter
   - All should work for Super Admin across all programs

---

## Deployment Steps

1. **Pull latest changes:**
   ```bash
   cd /Users/yash/Documents/Projects/QSightsOrg2.0
   git pull origin main
   ```

2. **Run deployment script:**
   ```bash
   ./deploy_evaluation_fixes_feb_05_2026.sh
   ```

3. **Add cron job (if not already added):**
   ```bash
   crontab -e
   ```
   Add this line:
   ```
   * * * * * cd /Users/yash/Documents/Projects/QSightsOrg2.0/backend && php artisan schedule:run >> /dev/null 2>&1
   ```

4. **Verify cron is running:**
   ```bash
   php artisan schedule:list
   ```
   Should show: `evaluations:send-scheduled` running every 5 minutes

5. **Test scheduled email sending:**
   ```bash
   php artisan evaluations:send-scheduled
   ```

---

## Production Checklist

- [ ] Code deployed to production server
- [ ] Laravel caches cleared (`php artisan cache:clear`)
- [ ] Cron job configured for Laravel scheduler
- [ ] Scheduled email command tested manually
- [ ] Super Admin can see all program reports
- [ ] Evaluation Admin sees only their program
- [ ] Email credentials verified (SendGrid API key)
- [ ] Scheduled emails are being sent automatically
- [ ] No console errors in frontend
- [ ] Database indexes on `scheduled_trigger_at` and `email_sent_at` (optional performance)

---

## Rollback Plan

If issues occur:

1. **Revert Kernel.php:**
   ```bash
   git checkout HEAD~1 backend/app/Console/Kernel.php
   ```

2. **Revert EvaluationTriggerController.php:**
   ```bash
   git checkout HEAD~1 backend/app/Http/Controllers/Api/EvaluationTriggerController.php
   ```

3. **Clear caches:**
   ```bash
   php artisan config:clear && php artisan cache:clear
   ```

---

## Related Files

- [backend/app/Console/Commands/SendScheduledEvaluations.php](backend/app/Console/Commands/SendScheduledEvaluations.php) - Email sending logic
- [backend/database/migrations/2026_02_03_000001_add_scheduled_trigger_at_to_evaluation_triggered.php](backend/database/migrations/2026_02_03_000001_add_scheduled_trigger_at_to_evaluation_triggered.php) - Migration for scheduled_trigger_at column
- [backend/routes/api.php](backend/routes/api.php#L837-L847) - Evaluation report routes

---

## Notes

- Scheduled emails check every 5 minutes (configurable in Kernel.php)
- Super Admin sees all programs by default (no filter applied)
- Other roles always filter by their program_id
- Email delivery requires valid SendGrid API credentials
- Cron job is **required** for automated scheduled emails

---

**Deployment Date:** February 05, 2026  
**Developer:** GitHub Copilot  
**Status:** ✅ Ready for Production
