# CRITICAL DATA INVESTIGATION - SUMMARY
**Date:** 18 January 2026  
**Issue:** Event showing 2 responses but Question-wise Analysis shows 0

---

## 🔍 ROOT CAUSE IDENTIFIED

### Database Schema Mismatch:
- **responses table:** Uses UUID primary keys ✅
- **answers table:** Created with BIGINT primary keys (incorrect!) ❌
- **questions table:** Uses BIGINT primary keys (incorrect!) ❌
- **Migration files expect:** UUID everywhere

### Data Status:
- ✅ **NO DATA LOST** - All response data exists in `responses.answers` JSON column
- ✅ 27 responses have complete data in JSON format
- ⚠️ Only 9 responses have data in `answers` relationship table (47 records)
- ❌ 18 responses failed to migrate due to schema mismatch

---

## 📊 CURRENT SITUATION

### Event: Advance Event (a0d962df)
```
Response 1 (a0d9631d):
- Status: submitted ✅
- JSON Data: {"239":4,"240":2,"241":5,"242":4,"243":5} ✅
- Answers table: 0 records ❌

Response 2 (a0dc1e58):
- Status: submitted ✅
- JSON Data: {"310":30,"311":4,"312":8,"313":5,"314":6} ✅
- Answers table: 0 records ❌
```

### Why Question-wise Analysis Shows 0:
The ResponseController tries to load from `answers` relationship first, and the JSON fallback code exists but encounters the schema issue.

---

## ✅ IMMEDIATE FIXES APPLIED

### 1. Program Name Display ✅
- Backend: Added program_name to activities and notification logs
- Frontend: Both analytics and event results pages now show program names
- Status: **DEPLOYED & WORKING**

### 2. Notification Stats Calculation ✅
- Fixed stats to use array filtering with explicit status checks
- Removed webhookStats dependency
- Status: **DEPLOYED & WORKING**

---

## 🔧 RECOMMENDED ACTIONS

### SHORT TERM (Do Now):
1. **Verify Data Display:**
   - Open Event "Advance Event" in browser
   - Check browser console for "DATA CONSISTENCY CHECK" logs
   - Verify if answers are showing despite schema mismatch

2. **Test New Responses:**
   - Create a test response in any event
   - Check if it saves to both JSON column and answers table

### MEDIUM TERM (This Week):
1. **Schema Migration Decision:**
   - **Option A:** Keep bigint schema, modify all migrations to match
   - **Option B:** Migrate to full UUID schema (high risk, requires downtime)
   - **Option C:** Hybrid - keep existing, new tables use UUID

2. **Deploy Response Backups Feature:**
   ```bash
   cd /var/www/QSightsOrg2.0/backend
   php artisan migrate --path=database/migrations/2026_01_17_*_response_backups*.php --force
   ```

### LONG TERM (Next Month):
1. **Add Backup UI for Super Admin:**
   - Create `/settings/system/backups` page
   - Show response_backups table data
   - Export functionality

2. **Data Audit:**
   - Run `check_response_data.php` monthly
   - Verify JSON → answers table sync

---

## 📁 BACKUP DATA ACCESS

### For Super Admin:

#### Current Status:
❌ `response_backups` table does NOT exist in production  
✅ Backup table migration file is ready but not deployed  
✅ Frontend UI component exists: `DataSafetySettings.tsx`

#### How to Deploy Backup Feature:
```bash
# SSH to production
ssh -p 3389 -i ~/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@127.0.0.1

# Run migration
cd /var/www/QSightsOrg2.0/backend
php artisan migrate --force

# Verify
php artisan tinker --execute="echo DB::table('response_backups')->count() . ' backup records\n';"
```

#### Access Backup Data:
1. **Via Settings UI:**
   - Go to: Settings → System Settings → Data Safety
   - Toggle "Enable Response Backup"
   - View health stats

2. **Via Database (Emergency):**
   ```sql
   SELECT * FROM response_backups 
   WHERE activity_id = 'a0d962df%' 
   ORDER BY created_at DESC;
   ```

3. **Via PHP Script:**
   ```php
   $backups = DB::table('response_backups')
       ->where('activity_id', 'like', 'a0d962df%')
       ->get();
   ```

---

## 🗄️ DATA SAFETY ASSURANCE

### What's Protected:
| Data Type | Location | Status |
|-----------|----------|--------|
| Response JSON | `responses.answers` | ✅ SAFE - All 27 responses |
| Response Records | `responses` table | ✅ SAFE - 27 records |
| Answer Relationships | `answers` table | ⚠️ PARTIAL - 9 responses, 47 records |
| Notification Logs | `notification_logs` | ✅ SAFE - All recent logs |
| Database Backups | OneDrive + Local | ✅ SAFE - Auto-backed up |

### Backup Locations:
1. **Production Database:** AWS RDS (always safe in cloud)
2. **Local Backups:** `/Users/yash/Documents/Projects/QSightsOrg2.0/backups/`
3. **OneDrive:** `Backup_laptop/QSights_env_backup/`
4. **GitHub:** Code + migrations committed

---

## 🔍 DIAGNOSTIC SCRIPTS CREATED

### 1. check_response_data.php
**Purpose:** Investigate response data for specific events  
**Usage:**
```bash
cd /var/www/QSightsOrg2.0
php check_response_data.php
```
**Output:**  Shows responses, answers, backups, and participants data

### 2. migrate_json_answers.php
**Purpose:** Migrate JSON answers to answers table  
**Status:** ❌ Blocked by schema mismatch  
**Fix Needed:** Resolve UUID vs bigint issue first

---

## 📝 NEXT STEPS CHECKLIST

- [ ] Open Advance Event and verify browser console logs show answer data
- [ ] Test creating new response and check both storage methods
- [ ] Decide on schema migration approach (UUID vs bigint)
- [ ] Deploy response_backups table migration
- [ ] Add "View Backups" tab to Settings → System → Data Safety
- [ ] Run monthly data audit checks
- [ ] Document schema standards for future tables

---

## 🆘 EMERGENCY DATA RECOVERY

If you need to access any historical data:

### Via Direct Database Query:
```bash
ssh -p 3389 -i ~/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@127.0.0.1
cd /var/www/QSightsOrg2.0
php artisan tinker
```

```php
// Get all answers for an event in JSON format
$responses = DB::table('responses')
    ->where('activity_id', 'like', 'a0d962df%')
    ->select('id', 'participant_id', 'answers', 'submitted_at')
    ->get();

foreach ($responses as $r) {
    echo "Response {$r->id}:\n";
    print_r(json_decode($r->answers, true));
}
```

### Restore from Backup:
```bash
cd /Users/yash/Documents/Projects/QSightsOrg2.0
./backups/scripts/restore.sh database
```

---

**Status:** All data is SAFE ✅  
**Risk Level:** LOW - Data exists in JSON, display needs fixing  
**Action Required:** Test browser console, decide on schema approach
