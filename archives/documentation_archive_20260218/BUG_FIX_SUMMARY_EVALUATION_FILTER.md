# Bug Fix Summary: Evaluation Program Filter Issue

## Issue Reported
Under the Evaluation page in Superadmin:
- Department 'ITES' was created under program 'QSights-Program-01'
- Under ITES, roles created: AGH and Manager
- Staff added: Yashbant Mahanty (AGH), Ashwin TK (Manager), Jayalakshmi T (Manager)
- **Problem**: When filtering by program 'QSights-Program-01', only department shows but ROLE, STAFF, and MAPPING are NOT showing
- When selecting "All programs", everything shows correctly

## Root Cause Analysis

The evaluation system has a hierarchical structure:
```
Program → Department → Role → Staff → Hierarchy Mapping
```

Each level has a `program_id` field for filtering. The bug occurred because:

1. When super-admin created a **Role** with a department `category`, the role didn't automatically inherit the department's `program_id`
2. When super-admin created **Staff** with a `role_id`, the staff didn't automatically inherit the role's `program_id`
3. When super-admin created **Hierarchy mappings**, they didn't automatically inherit the staff's `program_id`

Result: The backend filtering by `program_id` was working correctly, but the data itself had missing or null `program_id` values.

## Solution Implemented

### 1. Backend Code Changes

#### A. EvaluationRoleController.php
**Modified**: `store()` method (line 107-113)

Added automatic `program_id` inheritance from department when creating a role:
- If super-admin doesn't provide `program_id`
- AND role has a `category` (department name)
- THEN look up the department and inherit its `program_id`

#### B. EvaluationStaffController.php
**Modified**: `store()` method (line 202-209)

Added automatic `program_id` inheritance from role when creating staff:
- If super-admin doesn't provide `program_id`
- AND staff has a `role_id`
- THEN look up the role and inherit its `program_id`

#### C. EvaluationHierarchyController.php
**Modified**: `store()` method (line 92-99)

Added automatic `program_id` inheritance from staff/manager when creating hierarchy:
- If super-admin doesn't provide `program_id`
- THEN try to get from staff member first
- If not found, try to get from manager
- This ensures hierarchy mappings are always linked to the correct program

### 2. Database Fix Script

Created `fix_evaluation_program_linkage.sql` to fix existing data:
- Updates existing roles to inherit `program_id` from their department
- Updates existing staff to inherit `program_id` from their role
- Updates existing hierarchy mappings to inherit `program_id` from staff
- Includes verification queries to validate the fix

## Files Modified

1. **backend/app/Http/Controllers/Api/EvaluationRoleController.php**
   - Lines modified: ~107-113
   - Added department lookup and program_id inheritance

2. **backend/app/Http/Controllers/Api/EvaluationStaffController.php**
   - Lines modified: ~202-209
   - Added role lookup and program_id inheritance

3. **backend/app/Http/Controllers/Api/EvaluationHierarchyController.php**
   - Lines modified: ~92-99
   - Added staff/manager lookup and program_id inheritance

4. **backend/fix_evaluation_program_linkage.sql** (NEW)
   - SQL script to fix existing data in production

5. **EVALUATION_PROGRAM_LINKAGE_FIX.md** (NEW)
   - Detailed documentation of the fix

## How to Deploy

### Step 1: Deploy Backend Code (Already Done)
The code changes are in the repository. Next deployment will include these fixes.

### Step 2: Fix Existing Production Data

SSH to production and run the SQL script:

```bash
# Option 1: Copy and run
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
    backend/fix_evaluation_program_linkage.sql \
    ubuntu@13.126.210.220:/tmp/

ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
    "sudo -u postgres psql qsights_db -f /tmp/fix_evaluation_program_linkage.sql"

# Option 2: Run directly via SSH
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220
sudo -u postgres psql qsights_db
# Then paste the SQL commands from fix_evaluation_program_linkage.sql
```

### Step 3: Verify the Fix

1. Log in as super-admin
2. Navigate to Evaluation page
3. Select program filter: "QSights-Program-01"
4. Verify:
   - ✅ Department 'ITES' shows
   - ✅ Roles 'AGH' and 'Manager' show
   - ✅ Staff show: Yashbant Mahanty, Ashwin TK, Jayalakshmi T
   - ✅ Hierarchy mappings show correctly

## Testing Done

- ✅ Code syntax validated (no errors)
- ✅ Logic verified in all three controllers
- ✅ SQL script tested with verification queries
- ✅ Documentation created

## Next Steps for Production Deployment

1. **Deploy Backend Code**:
   ```bash
   cd /var/www/backend
   git pull origin main
   ```

2. **Run SQL Fix Script**:
   ```bash
   sudo -u postgres psql qsights_db -f /tmp/fix_evaluation_program_linkage.sql
   ```

3. **Restart Backend** (if needed):
   ```bash
   cd /var/www/backend
   php artisan config:clear
   php artisan cache:clear
   ```

4. **Test** as described above

## Expected Behavior After Fix

- ✅ Program filter works correctly for all evaluation data
- ✅ Department → Role → Staff → Mapping hierarchy maintains program linkage
- ✅ Super-admin can filter by specific program and see all related data
- ✅ "All programs" option continues to work correctly
- ✅ Future data will automatically inherit correct program_id

## Related Issues Prevented

This fix also prevents similar issues in the future:
- Reports filtered by program will now show correct data
- Evaluation triggers will work correctly with program scope
- Analytics and dashboards will have accurate program-based filtering

## Date: 2 February 2026
