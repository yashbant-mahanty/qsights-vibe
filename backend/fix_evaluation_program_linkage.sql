-- Fix Program Linkage for Evaluation Data
-- This script fixes the bug where roles, staff, and hierarchy mappings 
-- are not properly linked to programs when created under a department

-- ============================================================================
-- STEP 1: Update Roles to inherit program_id from their department
-- ============================================================================
-- For roles that have a category (department name) but no program_id,
-- update them to use the department's program_id

UPDATE evaluation_roles er
SET program_id = ed.program_id,
    updated_at = NOW()
FROM evaluation_departments ed
WHERE er.category = ed.name
  AND er.program_id IS NULL
  AND ed.program_id IS NOT NULL
  AND er.deleted_at IS NULL
  AND ed.deleted_at IS NULL;

-- Log the result
SELECT 
    'Step 1: Updated Roles' as action,
    COUNT(*) as updated_count
FROM evaluation_roles er
INNER JOIN evaluation_departments ed ON er.category = ed.name
WHERE er.program_id = ed.program_id
  AND er.deleted_at IS NULL
  AND ed.deleted_at IS NULL;

-- ============================================================================
-- STEP 2: Update Staff to inherit program_id from their role
-- ============================================================================
-- For staff that have a role but no program_id or mismatched program_id,
-- update them to use the role's program_id

UPDATE evaluation_staff es
SET program_id = er.program_id,
    updated_at = NOW()
FROM evaluation_roles er
WHERE es.role_id = er.id
  AND (es.program_id IS NULL OR es.program_id != er.program_id)
  AND er.program_id IS NOT NULL
  AND es.deleted_at IS NULL
  AND er.deleted_at IS NULL;

-- Log the result
SELECT 
    'Step 2: Updated Staff' as action,
    COUNT(*) as updated_count
FROM evaluation_staff es
INNER JOIN evaluation_roles er ON es.role_id = er.id
WHERE es.program_id = er.program_id
  AND es.deleted_at IS NULL
  AND er.deleted_at IS NULL;

-- ============================================================================
-- STEP 3: Update Hierarchy/Mappings to inherit program_id from staff
-- ============================================================================
-- For hierarchy relationships that have no program_id or mismatched program_id,
-- update them to use the staff member's program_id

UPDATE evaluation_hierarchy eh
SET program_id = es.program_id,
    updated_at = NOW()
FROM evaluation_staff es
WHERE eh.staff_id = es.id
  AND (eh.program_id IS NULL OR eh.program_id != es.program_id)
  AND es.program_id IS NOT NULL
  AND eh.deleted_at IS NULL
  AND es.deleted_at IS NULL;

-- Log the result
SELECT 
    'Step 3: Updated Hierarchy' as action,
    COUNT(*) as updated_count
FROM evaluation_hierarchy eh
INNER JOIN evaluation_staff es ON eh.staff_id = es.id
WHERE eh.program_id = es.program_id
  AND eh.deleted_at IS NULL
  AND es.deleted_at IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check for any remaining roles without program_id that have a department
SELECT 
    er.id,
    er.name as role_name,
    er.category as department,
    er.program_id as role_program_id,
    ed.program_id as dept_program_id,
    ed.name as dept_name
FROM evaluation_roles er
LEFT JOIN evaluation_departments ed ON er.category = ed.name
WHERE er.program_id IS NULL 
  AND ed.program_id IS NOT NULL
  AND er.deleted_at IS NULL
  AND ed.deleted_at IS NULL;

-- Check for any staff without proper program_id
SELECT 
    es.id,
    es.name as staff_name,
    es.program_id as staff_program_id,
    er.program_id as role_program_id,
    er.name as role_name
FROM evaluation_staff es
INNER JOIN evaluation_roles er ON es.role_id = er.id
WHERE (es.program_id IS NULL OR es.program_id != er.program_id)
  AND er.program_id IS NOT NULL
  AND es.deleted_at IS NULL
  AND er.deleted_at IS NULL;

-- Check for any hierarchy without proper program_id
SELECT 
    eh.id,
    staff.name as staff_name,
    manager.name as manager_name,
    eh.program_id as hierarchy_program_id,
    staff.program_id as staff_program_id
FROM evaluation_hierarchy eh
INNER JOIN evaluation_staff staff ON eh.staff_id = staff.id
INNER JOIN evaluation_staff manager ON eh.reports_to_id = manager.id
WHERE (eh.program_id IS NULL OR eh.program_id != staff.program_id)
  AND staff.program_id IS NOT NULL
  AND eh.deleted_at IS NULL
  AND staff.deleted_at IS NULL;

-- Show the specific case mentioned in the bug report
SELECT 
    'Department: ITES' as info,
    ed.program_id,
    p.name as program_name
FROM evaluation_departments ed
LEFT JOIN programs p ON ed.program_id = p.id
WHERE ed.name = 'ITES'
  AND ed.deleted_at IS NULL;

SELECT 
    'Roles in ITES' as info,
    er.name as role_name,
    er.program_id,
    p.name as program_name
FROM evaluation_roles er
LEFT JOIN programs p ON er.program_id = p.id
WHERE er.category = 'ITES'
  AND er.deleted_at IS NULL;

SELECT 
    'Staff in ITES' as info,
    es.name as staff_name,
    er.name as role_name,
    es.program_id,
    p.name as program_name
FROM evaluation_staff es
INNER JOIN evaluation_roles er ON es.role_id = er.id
LEFT JOIN programs p ON es.program_id = p.id
WHERE er.category = 'ITES'
  AND es.deleted_at IS NULL;

SELECT 
    'Hierarchy for ITES staff' as info,
    staff.name as staff_name,
    manager.name as manager_name,
    eh.program_id,
    p.name as program_name
FROM evaluation_hierarchy eh
INNER JOIN evaluation_staff staff ON eh.staff_id = staff.id
INNER JOIN evaluation_staff manager ON eh.reports_to_id = manager.id
INNER JOIN evaluation_roles er ON staff.role_id = er.id
LEFT JOIN programs p ON eh.program_id = p.id
WHERE er.category = 'ITES'
  AND eh.deleted_at IS NULL;
