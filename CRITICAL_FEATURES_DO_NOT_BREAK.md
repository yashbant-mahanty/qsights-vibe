# 🚨 CRITICAL FEATURES - MANDATORY CHECKS BEFORE ANY DEPLOYMENT

## ⚠️ MUST READ BEFORE MAKING ANY CHANGES

**These features are CRITICAL to the application and must NEVER be broken.**  
**Run ALL tests below before deploying ANY changes to production.**

---

## 1. 📊 RESPONSE DATA INTEGRITY (HIGHEST PRIORITY)

### Why Critical:
User responses are the MOST IMPORTANT data in this system. Loss of response data = complete business failure.

### Requirements:
- ✅ **DUAL-SAVE System**: Responses must be saved in BOTH `answers` table AND `responses.answers` JSON column
- ✅ **response_backups Table**: Every response must create backup records (append-only, never update/delete)
- ✅ **Atomic Saves**: Response submission must be transactional - all or nothing
- ✅ **No Overwrites**: Backup data must NEVER be overwritten or deleted

### Before ANY Deployment - Test:
```bash
# Test 1: Submit a response
curl -X POST http://prod.qsights.com/api/responses \
  -H "Content-Type: application/json" \
  -d '{"activity_id": "xxx", "participant_id": "yyy", "answers": {...}}'

# Test 2: Verify dual-save worked
ssh production "cd /var/www/QSightsOrg2.0/backend && php artisan tinker --execute='
  \$response = DB::table(\"responses\")->latest()->first();
  \$answersCount = DB::table(\"answers\")->where(\"response_id\", \$response->id)->count();
  \$jsonAnswers = json_decode(\$response->answers, true);
  echo \"Answers table: \" . \$answersCount . \" records\" . PHP_EOL;
  echo \"JSON column: \" . count(\$jsonAnswers ?? []) . \" answers\" . PHP_EOL;
  echo \"Match: \" . (\$answersCount === count(\$jsonAnswers ?? []) ? \"✅ YES\" : \"❌ NO\") . PHP_EOL;
'"

# Test 3: Verify backup created
ssh production "cd /var/www/QSightsOrg2.0/backend && php artisan tinker --execute='
  \$response = DB::table(\"responses\")->latest()->first();
  \$backupCount = DB::table(\"response_backups\")->where(\"response_id\", \$response->id)->count();
  echo \"Backup records: \" . \$backupCount . PHP_EOL;
  echo \"Status: \" . (\$backupCount > 0 ? \"✅ BACKED UP\" : \"❌ NO BACKUP\") . PHP_EOL;
'"
```

### API Endpoints That Must Work:
- `POST /api/responses` - Submit response (must create answers + JSON + backup)
- `GET /api/activities/{id}/responses` - List responses
- `GET /api/activities/{id}/responses/statistics` - Response stats

### Files to NEVER Break:
- `/backend/app/Http/Controllers/Api/ResponseController.php` (Lines 150-300: submit method)
- `/backend/app/Models/Response.php`
- `/backend/app/Models/Answer.php`
- `/backend/database/migrations/*_create_response_backups_table.php`

---

## 2. 📈 STATISTICS & COUNTS (HIGH PRIORITY)

### Why Critical:
Event Results page shows "Total Responses: 0" even when responses exist = breaks admin confidence

### Requirements:
- ✅ Statistics API must count NON-PREVIEW responses only (`is_preview = false`)
- ✅ Must include BOTH registered AND guest responses
- ✅ Frontend cards must display accurate counts

### Before ANY Deployment - Test:
```bash
# Test 1: Check statistics API returns correct count
ACTIVITY_ID="a0d394a0-479d-45b4-bf33-711ab17d7516"  # BQ-Internal-Demo-Survey
curl -X GET "http://prod.qsights.com/api/activities/$ACTIVITY_ID/responses/statistics" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected Response:
# {
#   "total_responses": 24,  ← MUST BE > 0 if responses exist
#   "submitted": 24,
#   "in_progress": 0,
#   ...
# }

# Test 2: Verify database count matches
ssh production "cd /var/www/QSightsOrg2.0/backend && php artisan tinker --execute='
  \$activityId = \"a0d394a0-479d-45b4-bf33-711ab17d7516\";
  \$dbCount = DB::table(\"responses\")->where(\"activity_id\", \$activityId)->where(\"is_preview\", false)->count();
  \$apiStats = app(\"App\\\Http\\\Controllers\\\Api\\\ResponseController\")->statistics(\$activityId)->getData();
  echo \"DB Count: \" . \$dbCount . PHP_EOL;
  echo \"API Total: \" . \$apiStats->total_responses . PHP_EOL;
  echo \"Match: \" . (\$dbCount === \$apiStats->total_responses ? \"✅ YES\" : \"❌ NO\") . PHP_EOL;
'"
```

### API Endpoints That Must Work:
- `GET /api/activities/{id}/responses/statistics`
- `GET /api/activities/{id}/responses`

### Files to NEVER Break:
- `/backend/app/Http/Controllers/Api/ResponseController.php` (Lines 467-501: statistics method)
- `/frontend/app/activities/[id]/results/page.tsx` (Lines 85-110: loadData function)

---

## 3. 📧 NOTIFICATION TRACKING (HIGH PRIORITY)

### Why Critical:
SendGrid webhook integration tracks email delivery/opens. Breaking this = no visibility into campaign performance.

### Requirements:
- ✅ `notification_logs` table must exist and be writable
- ✅ SendGrid webhooks must be configured and working
- ✅ Frontend notification stats must show accurate counts (NOT all zeros)

### Before ANY Deployment - Test:
```bash
# Test 1: Check notification logs API
ACTIVITY_ID="a0d394a0-479d-45b4-bf33-711ab17d7516"
curl -X GET "http://prod.qsights.com/api/notifications/logs?activity_id=$ACTIVITY_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: Array of notification logs with status, sent_at, delivered_at, opened_at

# Test 2: Verify database has logs
ssh production "cd /var/www/QSightsOrg2.0/backend && php artisan tinker --execute='
  \$activityId = \"a0d394a0-479d-45b4-bf33-711ab17d7516\";
  \$logCount = DB::table(\"notification_logs\")->where(\"activity_id\", \$activityId)->count();
  \$sentCount = DB::table(\"notification_logs\")->where(\"activity_id\", \$activityId)->where(\"status\", \"sent\")->count();
  \$deliveredCount = DB::table(\"notification_logs\")->where(\"activity_id\", \$activityId)->where(\"status\", \"delivered\")->count();
  echo \"Total logs: \" . \$logCount . PHP_EOL;
  echo \"Sent: \" . \$sentCount . PHP_EOL;
  echo \"Delivered: \" . \$deliveredCount . PHP_EOL;
'"

# Test 3: Send test notification and verify webhook
curl -X POST "http://prod.qsights.com/api/activities/$ACTIVITY_ID/send-notifications" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"participant_ids": ["test-participant-id"]}'

# Wait 30 seconds for SendGrid webhook
sleep 30

# Check if webhook updated status
ssh production "cd /var/www/QSightsOrg2.0/backend && php artisan tinker --execute='
  \$latest = DB::table(\"notification_logs\")->latest()->first();
  echo \"Status: \" . \$latest->status . PHP_EOL;
  echo \"Webhook working: \" . (in_array(\$latest->status, [\"delivered\", \"opened\"]) ? \"✅ YES\" : \"❌ NO\") . PHP_EOL;
'"
```

### API Endpoints That Must Work:
- `GET /api/notifications/logs?activity_id={id}`
- `POST /api/notifications/sendgrid/webhook` (SendGrid webhook endpoint)

### Files to NEVER Break:
- `/backend/app/Http/Controllers/Api/NotificationController.php` (Lines 735-870: webhook handlers)
- `/frontend/app/activities/[id]/results/page.tsx` (Lines 1393-1428: notification stats)
- `/frontend/app/analytics/page.tsx` (Lines 1165-1250: notifications table)

---

## 4. 🎯 DATA SAFETY SETTINGS (MEDIUM PRIORITY)

### Why Critical:
Super Admin needs visibility into backup status and ability to restore data if needed.

### Requirements:
- ✅ Settings → System → Data Safety page must load without errors
- ✅ Must show 3 tabs: Settings, System Health, View Backups
- ✅ System Health must show green checkmarks for all tables
- ✅ View Backups must show migration stats and recent backups

### Before ANY Deployment - Test:
```bash
# Test 1: Check Data Safety API endpoints exist
curl -X GET "http://prod.qsights.com/api/data-safety/health" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected:
# {
#   "response_backup_enabled": true,
#   "notification_logging_enabled": true,
#   "tables_exist": {
#     "response_backups": true,
#     "notification_logs": true,
#     "response_audit_logs": true
#   }
# }

# Test 2: Frontend page loads without errors
# Navigate to: http://prod.qsights.com/settings/system
# Open browser console (F12)
# Look for ANY JavaScript errors - MUST BE ZERO ERRORS

# Test 3: Check tables exist
ssh production "cd /var/www/QSightsOrg2.0/backend && php artisan tinker --execute='
  \$tables = [\"response_backups\", \"notification_logs\"];
  foreach (\$tables as \$table) {
    \$exists = DB::getSchemaBuilder()->hasTable(\$table);
    echo \$table . \": \" . (\$exists ? \"✅ EXISTS\" : \"❌ MISSING\") . PHP_EOL;
  }
'"
```

### API Endpoints That Must Work:
- `GET /api/data-safety/health`
- `GET /api/data-safety/migration-stats`
- `GET /api/data-safety/backups`

### Files to NEVER Break:
- `/frontend/components/admin/DataSafetySettings.tsx`
- `/backend/app/Http/Controllers/Api/DataSafetyController.php` (if exists)

---

## 5. 🔄 DATABASE SCHEMA INTEGRITY (CRITICAL)

### Why Critical:
Production has mixed bigint/UUID schema. Any migration that changes this will break everything.

### Current Schema Reality:
```
responses:
  - id: UUID (primary key)
  - activity_id: UUID
  - participant_id: UUID
  - answers: JSONB column

answers:
  - id: BIGINT (auto-increment)
  - response_id: UUID (foreign key to responses.id)
  - question_id: BIGINT
  - value: TEXT
  - value_array: JSON

questions:
  - id: BIGINT (auto-increment)
  
response_backups:
  - id: BIGINT (auto-increment)
  - response_id: UUID
  - question_id: BIGINT
```

### ⚠️ NEVER DO THIS:
- ❌ Drop `answers` table
- ❌ Change `answers.id` from bigint to UUID
- ❌ Change `questions.id` from bigint to UUID
- ❌ Drop or truncate `response_backups` table
- ❌ Run `php artisan migrate:fresh` on production

### Before ANY Schema Change:
1. **BACKUP FIRST**:
```bash
ssh production "cd /var/www/QSightsOrg2.0/backend && php artisan tinker --execute='
  \$backup = [
    \"responses\" => DB::table(\"responses\")->get()->toArray(),
    \"answers\" => DB::table(\"answers\")->get()->toArray(),
    \"response_backups\" => DB::table(\"response_backups\")->get()->toArray()
  ];
  file_put_contents(\"/tmp/response_data_backup_\" . date(\"Y-m-d_His\") . \".json\", json_encode(\$backup));
  echo \"Backup saved to /tmp/response_data_backup_\" . date(\"Y-m-d_His\") . \".json\" . PHP_EOL;
'"
```

2. **TEST ON STAGING FIRST** (always)

3. **VERIFY SCHEMA MATCH**:
```bash
ssh production "cd /var/www/QSightsOrg2.0/backend && php artisan tinker --execute='
  \$schema = [
    \"answers.id\" => DB::select(\"SELECT data_type FROM information_schema.columns WHERE table_name = \\\"answers\\\" AND column_name = \\\"id\\\"\")[0]->data_type,
    \"answers.response_id\" => DB::select(\"SELECT data_type FROM information_schema.columns WHERE table_name = \\\"answers\\\" AND column_name = \\\"response_id\\\"\")[0]->data_type,
    \"answers.question_id\" => DB::select(\"SELECT data_type FROM information_schema.columns WHERE table_name = \\\"answers\\\" AND column_name = \\\"question_id\\\"\")[0]->data_type
  ];
  print_r(\$schema);
'"
```

---

## 📋 PRE-DEPLOYMENT CHECKLIST

**Run this checklist BEFORE every production deployment:**

- [ ] 1. Response submission test passed (dual-save verified)
- [ ] 2. Statistics API returning correct counts
- [ ] 3. Notification logs API working
- [ ] 4. Data Safety settings page loads without errors
- [ ] 5. No JavaScript console errors on frontend
- [ ] 6. Database backup created
- [ ] 7. All tests run on staging environment first
- [ ] 8. Schema verification passed

**If ANY checkbox is unchecked, DO NOT DEPLOY.**

---

## 🚨 EMERGENCY RECOVERY

If something breaks in production:

### 1. Immediate Rollback:
```bash
cd /var/www/QSightsOrg2.0/backend
git log --oneline -5  # Find last working commit
git reset --hard COMMIT_HASH
composer install
php artisan config:clear
php artisan cache:clear
pm2 restart qsights-backend

cd /var/www/QSightsOrg2.0/frontend
git reset --hard COMMIT_HASH
npm run build
pm2 restart qsights-frontend
```

### 2. Data Recovery (if responses lost):
```bash
# Find latest backup
ls -lt /tmp/response_data_backup_*.json

# Restore from backup
cd /var/www/QSightsOrg2.0/backend
php artisan tinker --execute='
  $backup = json_decode(file_get_contents("/tmp/response_data_backup_YYYY-MM-DD_HHmmss.json"), true);
  
  // Restore answers
  DB::beginTransaction();
  try {
    foreach ($backup["answers"] as $answer) {
      DB::table("answers")->updateOrInsert(
        ["id" => $answer["id"]],
        (array)$answer
      );
    }
    DB::commit();
    echo "✅ Restored " . count($backup["answers"]) . " answer records" . PHP_EOL;
  } catch (\Exception $e) {
    DB::rollBack();
    echo "❌ Error: " . $e->getMessage() . PHP_EOL;
  }
'
```

### 3. Contact Chain:
1. Check this document first
2. Check recent git commits: `git log --oneline -10`
3. Check `/var/log/nginx/error.log` for PHP errors
4. Check Laravel logs: `tail -100 /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log`

---

## 📝 MAINTENANCE LOG

| Date | Change Description | Test Results | Deployed By |
|------|-------------------|--------------|-------------|
| 2026-01-17 | Initial response backup system deployed | ✅ All tests passed | System |
| 2026-01-17 | Data Safety UI with 3 tabs deployed | ✅ No errors | System |
| 2026-01-18 | Fixed Data Safety settings crash (null health check) | ⏳ Pending | System |
| 2026-01-20 | **CRITICAL INCIDENT**: Evaluation module deployment broke app | ❌ REVERTED | System |

---

## 🚨 CRITICAL INCIDENT: EVALUATION MODULE DEPLOYMENT FAILURE (20 Jan 2026)

### What Happened:
1. Evaluation Module MVP was being deployed (roles, staff, hierarchy tables + controllers + UI)
2. Database migrations had schema mismatch (expected UUID, actual was BIGINT for `users.id` and `organizations.id`)
3. Multiple rebuild attempts corrupted Next.js Server Actions cache
4. Frontend became unresponsive - navigation broken, sidebar missing, sign-out not working
5. **App was down/broken for users during this period**

### Root Causes:
1. **Schema validation was NOT performed before deployment** (violated governance)
2. **Production database schema differs from migration expectations**:
   - `organizations.id` = BIGINT (not UUID)
   - `users.id` = BIGINT (not UUID)
   - `programs.id` = UUID ✓
3. **Multiple .next cache rebuilds** created stale Server Action references
4. **No rollback plan was documented** before starting deployment

### Resolution:
- Full frontend restore from local machine using rsync
- Checkpoint backup created: `QSightsOrg2.0_CHECKPOINT_20_JAN_2026_WORKING.tar.gz`

### Pending Work (Evaluation Module):
- 4 of 6 database tables were created (evaluation_roles, evaluation_staff, evaluation_hierarchy, evaluation_audit_log)
- 2 tables pending: evaluation_assignments, evaluation_results (require evaluation_events table)
- Backend controllers were deployed but need the evaluation_events migration
- Frontend components exist locally but NOT deployed to production

### Prevention Checklist (MANDATORY for future deployments):
- [ ] Always run schema validation BEFORE creating migrations
- [ ] Create backup checkpoint BEFORE any deployment
- [ ] Document rollback plan BEFORE starting
- [ ] Test locally with production schema copy
- [ ] Deploy backend completely BEFORE frontend
- [ ] Never rebuild .next multiple times in quick succession

---

**Remember: These are not suggestions, they are REQUIREMENTS. Breaking these features breaks the entire application.**
