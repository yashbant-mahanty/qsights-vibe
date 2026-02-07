# Evaluation Program Linkage Bug Fix

## Bug Description

When filtering by a specific program in the Superadmin Evaluation page, the department shows correctly, but Role, Staff, and Mapping are not showing. This issue occurs because:

1. A department (e.g., 'ITES') is created under a program (e.g., 'QSights-Program-01')
2. Roles are created with the department as their `category` 
3. Staff are assigned to those roles
4. Hierarchy mappings are created between staff members
5. **BUT** the roles, staff, and mappings may not have inherited the `program_id` from the department

When filtering by program, the backend correctly filters by `program_id`, but if the roles/staff/mappings don't have the correct `program_id`, they won't appear.

## Root Cause

The issue was in the backend controllers when creating roles, staff, and hierarchy mappings:

1. **EvaluationRoleController**: When super-admin creates a role with a `category` (department), it didn't automatically inherit the department's `program_id`
2. **EvaluationStaffController**: When super-admin creates staff with a `role_id`, it didn't automatically inherit the role's `program_id`
3. **EvaluationHierarchyController**: When super-admin creates a hierarchy mapping, it didn't automatically inherit the staff's `program_id`

## Fix Applied

### Backend Changes

#### 1. EvaluationRoleController.php (store method)
**File**: `backend/app/Http/Controllers/Api/EvaluationRoleController.php`

Added logic to automatically inherit `program_id` from the department when a role is created with a `category`:

```php
// If no program_id provided but category (department) is specified,
// inherit program_id from the department
if (!$programId && !empty($validated['category'])) {
    $department = DB::table('evaluation_departments')
        ->where('name', $validated['category'])
        ->whereNull('deleted_at')
        ->first();
    
    if ($department && $department->program_id) {
        $programId = $department->program_id;
        \Log::info('Role inheriting program_id from department', [
            'role_name' => $validated['name'],
            'department' => $validated['category'],
            'program_id' => $programId
        ]);
    }
}
```

#### 2. EvaluationStaffController.php (store method)
**File**: `backend/app/Http/Controllers/Api/EvaluationStaffController.php`

Added logic to automatically inherit `program_id` from the role when staff is created:

```php
// If no program_id provided but role_id is specified,
// inherit program_id from the role
if (!$programId && !empty($validated['role_id'])) {
    $role = DB::table('evaluation_roles')
        ->where('id', $validated['role_id'])
        ->whereNull('deleted_at')
        ->first();
    
    if ($role && $role->program_id) {
        $programId = $role->program_id;
        \Log::info('Staff inheriting program_id from role', [
            'staff_name' => $validated['name'],
            'role_id' => $validated['role_id'],
            'program_id' => $programId
        ]);
    }
}
```

#### 3. EvaluationHierarchyController.php (store method)
**File**: `backend/app/Http/Controllers/Api/EvaluationHierarchyController.php`

Added logic to automatically inherit `program_id` from the staff or manager:

```php
// If no program_id provided, inherit from staff or manager
if (!$programId) {
    $staff = DB::table('evaluation_staff')
        ->where('id', $validated['staff_id'])
        ->whereNull('deleted_at')
        ->first();
    
    if ($staff && $staff->program_id) {
        $programId = $staff->program_id;
        \Log::info('Hierarchy inheriting program_id from staff', [
            'staff_id' => $validated['staff_id'],
            'reports_to_id' => $validated['reports_to_id'],
            'program_id' => $programId
        ]);
    } else {
        // Try to get from manager
        $manager = DB::table('evaluation_staff')
            ->where('id', $validated['reports_to_id'])
            ->whereNull('deleted_at')
            ->first();
        
        if ($manager && $manager->program_id) {
            $programId = $manager->program_id;
            \Log::info('Hierarchy inheriting program_id from manager', [
                'staff_id' => $validated['staff_id'],
                'reports_to_id' => $validated['reports_to_id'],
                'program_id' => $programId
            ]);
        }
    }
}
```

### Database Fix Script

A SQL script has been created to fix existing data that may have incorrect `program_id` values:

**File**: `backend/fix_evaluation_program_linkage.sql`

This script:
1. Updates roles to inherit `program_id` from their department (via `category`)
2. Updates staff to inherit `program_id` from their role
3. Updates hierarchy mappings to inherit `program_id` from staff
4. Includes verification queries to check the results

## How to Apply the Fix

### For New Data (Already Applied)
The code changes are already in place. Going forward, when creating:
- Roles with a department category
- Staff with a role
- Hierarchy mappings

The `program_id` will be automatically inherited from the parent entity.

### For Existing Data

Run the SQL script on the production database:

```bash
# SSH to the production server
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220

# Connect to PostgreSQL
sudo -u postgres psql qsights_db

# Run the fix script
\i /var/www/backend/fix_evaluation_program_linkage.sql

# Or copy the script content and paste it into psql
```

Alternatively, you can run it from your local machine:

```bash
# Copy the script to the server
scp -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
    backend/fix_evaluation_program_linkage.sql \
    ubuntu@13.126.210.220:/tmp/

# SSH and run it
ssh -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@13.126.210.220 \
    "sudo -u postgres psql qsights_db -f /tmp/fix_evaluation_program_linkage.sql"
```

## Testing

After applying the fix:

1. Log in as super-admin
2. Go to Evaluation page
3. Select a specific program from the program filter (e.g., 'QSights-Program-01')
4. Verify that:
   - Department shows correctly (e.g., 'ITES')
   - Roles in that department show correctly (e.g., 'AGH', 'Manager')
   - Staff assigned to those roles show correctly (e.g., 'Yashbant Mahanty', 'Ashwin TK', 'Jayalakshmi T')
   - Hierarchy mappings show correctly

## Expected Behavior After Fix

- When filtering by a specific program, ALL related data (departments, roles, staff, mappings) that belong to that program should show up
- When selecting "All Programs", all data across all programs should show up
- The program linkage is now properly cascaded: Program → Department → Role → Staff → Hierarchy

## Files Changed

1. `backend/app/Http/Controllers/Api/EvaluationRoleController.php`
2. `backend/app/Http/Controllers/Api/EvaluationStaffController.php`
3. `backend/app/Http/Controllers/Api/EvaluationHierarchyController.php`
4. `backend/fix_evaluation_program_linkage.sql` (new file)
5. `EVALUATION_PROGRAM_LINKAGE_FIX.md` (this file)

## Date Fixed
2 February 2026
