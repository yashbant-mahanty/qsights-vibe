# Deleted Programs and Staff Filter Fix

## Issue Description
Staff members were appearing multiple times in the Staff Evaluation Reports section with duplicate evaluation counts because:
1. The API was returning evaluations from deleted programs
2. The API was returning evaluations for staff that had been deleted from the evaluation system

This caused:
- Duplicate entries for the same staff (e.g., Ashwin TK appearing twice, Jayalakshmi T appearing twice)
- Incorrect evaluation counts showing evaluations from deleted programs and deleted staff
- Confusion for all user roles (Super Admin, Evaluation Admin, Program Admin)

## Example of the Issue
**Before Fix:**
- Ashwin TK appeared twice:
  - Entry 1: 1 evaluation, 5.0 avg score (from BQ-Evaluation program - active staff)
  - Entry 2: 3 evaluations, 4.5 avg score (from QSights-Program-01 - **deleted staff**)
- Jayalakshmi T appeared twice:
  - Entry 1: 1 evaluation, 4.2 avg score (from BQ-Evaluation program - active staff)
  - Entry 2: 3 evaluations, 4.3 avg score (from QSights-Program-01 - **deleted staff**)

The duplicate entries were from:
- Different programs where staff with same names existed
- Staff records that were deleted from the evaluation_staff table

## Root Cause

### Issue 1: No Programs Table Filter
The backend API endpoints were not joining with the `programs` table to filter out records where `programs.deleted_at IS NOT NULL`. The queries only checked `evaluation_triggered.deleted_at`, which wasn't sufficient.

### Issue 2: No Staff Existence Check
Even when programs were active, the API was returning evaluation data for staff that had been **deleted from the evaluation system**. The evaluation records stored subordinate information in JSON, but didn't verify if those staff still existed in the `evaluation_staff` table.

In the case of QSights-Program-01:
- Program itself: **NOT deleted**
- Staff in that program: **DELETED** (removed from evaluation_staff table)
- Evaluations: **Still exist** with references to deleted staff IDs

## Solution Implemented

### Backend Changes (EvaluationTriggerController.php)

Modified 5 functions to:
1. Join with the `programs` table and filter deleted programs
2. Check if staff still exist in `evaluation_staff` table before including them

#### 1. `reports()` Function (Line 767)
**Changes:**
- Added `JOIN programs` table
- Added `whereNull('p.deleted_at')` to filter deleted programs
- Added staff existence check before processing subordinates:
  ```php
  // Check if staff still exists in evaluation_staff table (not deleted)
  $staffExists = DB::table('evaluation_staff')
      ->where('id', $subId)
      ->whereNull('deleted_at')
      ->exists();
  
  // Skip deleted staff
  if (!$staffExists) {
      continue;
  }
  ```

#### 2. `reportsSummary()` Function (Line 897)
**Changes:**
- Added `JOIN programs` table
- Fixed ambiguous `status` column references by prefixing with table name
- Added `whereNull('p.deleted_at')` filter

#### 3. `staffDetail()` Function (Line 981)
**Changes:**
- Added `JOIN programs` table
- Fixed ambiguous column references
- Added `whereNull('p.deleted_at')` filter

#### 4. `evaluatorsList()` Function (Line 1088)
**Changes:**
- Added `JOIN programs` table
- Added `whereNull('p.deleted_at')` filter

#### 5. `evaluatedStaff()` Function (Line 1135)
**Changes:**
- Added `JOIN programs` table
- Added staff existence check:
  ```php
  // Check if staff still exists in evaluation_staff table (not deleted)
  $staffExists = DB::table('evaluation_staff')
      ->where('id', $subId)
      ->whereNull('deleted_at')
      ->exists();
  
  // Skip deleted staff
  if (!$staffExists) {
      continue;
  }
  ```
- Fixed ambiguous column references

#### 6. `exportReports()` Function (Line 1198)
**Changes:**
- Added `JOIN programs` table
- Added staff existence check before exporting
- Added `whereNull('p.deleted_at')` filter

## Impact

### Who Benefits
- ✅ **Super Admin**: Clean reports without deleted program or deleted staff data
- ✅ **Evaluation Admin**: Accurate staff evaluation reports showing only active staff
- ✅ **Program Admin**: Only see evaluations from active programs with active staff
- ✅ **All Report Views**: Staff reports, evaluator lists, export functionality

### Data Integrity
- Only active program evaluations are shown
- Only active staff (not deleted from evaluation_staff table) are shown
- No duplicate staff entries
- Accurate evaluation counts
- Correct average scores based on active programs and active staff only

### Real-World Example
**QSights-Program-01 Scenario:**
- Program: Active (not deleted)
- Staff (Ashwin TK, Jayalakshmi T): **Deleted from evaluation_staff table**
- Historical evaluations: Still exist in database
- **Result:** These evaluations are now **excluded** from reports because staff don't exist

**BQ-Evaluation Program:**
- Program: Active
- Staff (Ashwin TK, Jayalakshmi T): **Active**
- Current evaluations: Exist
- **Result:** These evaluations **appear** in reports

## Testing

### Verification Steps
1. Navigate to Evaluation → Reports → Staff Evaluation Reports
2. Verify each staff member appears only once
3. Check evaluation counts match actual completed evaluations in active programs
4. Verify average scores are calculated from active program evaluations only
5. Test as different roles (Super Admin, Evaluation Admin, Program Admin)

### Expected Results After Fix
- Ashwin TK: Single entry with correct evaluation count and average
- Jayalakshmi T: Single entry with correct evaluation count and average
- All staff: One entry per person with accurate data from active programs

## Deployment

### Date
February 1, 2026

### Files Modified
- `/var/www/QSightsOrg2.0/backend/app/Http/Controllers/Api/EvaluationTriggerController.php`

### Deployment Steps
1. Updated local file with programs table joins
2. Uploaded to server: `scp EvaluationTriggerController.php ubuntu@server:/tmp/`
3. Moved to production: `sudo cp /tmp/EvaluationTriggerController.php /var/www/...`
4. Set permissions: `sudo chown www-data:www-data ...`
5. No service restart needed (PHP changes are immediate)

## Related Endpoints

All evaluation report endpoints now filter deleted programs:
- `GET /api/evaluation/reports` - Staff-wise reports
- `GET /api/evaluation/reports/summary` - Dashboard summary
- `GET /api/evaluation/reports/evaluators` - Evaluators list
- `GET /api/evaluation/reports/staff` - Evaluated staff list
- `GET /api/evaluation/reports/staff/{staffId}` - Individual staff detail
- `GET /api/evaluation/reports/export` - Export functionality

## Technical Notes

### Database Schema
```sql
-- Evaluation Triggered table stores evaluations
evaluation_triggered:
  - id (uuid, PK)
  - program_id (uuid, FK -> programs.id)
  - deleted_at (timestamp, nullable)
  
-- Programs table
programs:
  - id (uuid, PK)
  - deleted_at (timestamp, nullable)
```

### Query Pattern
All report queries now follow this pattern:
```php
DB::table('evaluation_triggered')
    ->join('programs as p', 'evaluation_triggered.program_id', '=', 'p.id')
    ->whereNull('evaluation_triggered.deleted_at')
    ->whereNull('p.deleted_at')  // Critical filter
```

## Additional Benefits

1. **Performance**: Inner join with programs table is efficient with proper indexes
2. **Data Consistency**: All report endpoints use consistent filtering logic
3. **Audit Trail**: Deleted programs remain in database for audit purposes but don't pollute reports
4. **Scalability**: Solution works regardless of the number of deleted programs

## Future Considerations

- Consider adding a `is_active` flag to programs table for additional filtering
- Add database indexes on `programs.deleted_at` if not present
- Consider adding soft delete middleware to automatically filter across all queries
