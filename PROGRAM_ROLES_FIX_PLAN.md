# DEFAULT PROGRAM ROLES FIX - Implementation Plan

## Current State Analysis

### ✅ What's Working:
1. Service-based permission system exists (`default_services` in users table)
2. Permission helpers in `frontend/lib/permissions.ts`
3. Role-based navigation in `getNavigationItems()`
4. Backend service definitions in ProgramController

### ❌ What's Broken/Incomplete:

1. **Service Definitions Don't Match Requirements:**
   - Program Admin missing: questionnaires services, evaluation services
   - Program Manager missing: questionnaires view/edit (has create wrongly)
   - Program Moderator: correct

2. **Frontend Permissions Wrong:**
   - Program Manager has `canCreate` for questionnaires/activities (should be false for questionnaires)
   - Navigation doesn't check services properly for Evaluation tab

3. **Missing Services:**
   - `questionnaires-view`, `questionnaires-edit`, `questionnaires-create`, `questionnaires-delete`
   - `evaluation-view`, `evaluation-manage`
   - `programs-view`, `programs-create`, `programs-edit`

## Required Changes

### 1. Backend: Update Default Services (ProgramController.php)

```php
'program-admin' => [
    'dashboard',
    'programs-view',
    'programs-create', 
    'programs-edit',
    'programs-delete',
    'participants-view',
    'participants-create',
    'participants-edit',
    'participants-delete',
    'questionnaires-view',
    'questionnaires-create',
    'questionnaires-edit',
    'questionnaires-delete',
    'activities-view',
    'activities-create',
    'activities-edit',
    'activities-delete',
    'activities-send-notification',
    'activities-set-reminder',
    'activities-landing-config',
    'reports-view',
    'reports-export',
    'evaluation-view',
    'evaluation-manage',
],
'program-manager' => [
    'dashboard',
    'programs-view', // View only, no create
    'participants-view',
    'participants-edit',
    'questionnaires-view',
    'questionnaires-edit', // Can edit, but NOT create or delete
    'activities-view',
    'activities-edit', // Can edit, but NOT create or delete  
    'activities-send-notification',
    'activities-landing-config',
    'reports-view',
    'reports-export',
    'evaluation-view',
    'evaluation-manage',
],
'program-moderator' => [
    'dashboard',
    'activities-view', // View only, no edit
    'reports-view',
    'reports-export',
    'evaluation-view',
    'evaluation-manage',
],
```

### 2. Frontend: Update Permission Definitions (permissions.ts)

Fix role permissions to match requirements:

```typescript
'program-admin': {
    organizations: noAccess,
    groupHeads: noAccess,
    programs: fullAccess, // Full access to programs
    participants: manageAccess,
    questionnaires: fullAccess, // Full like Super Admin (scoped)
    activities: fullAccess, // Full like Super Admin (scoped)
    reports: fullAccess,
    notifications: fullAccess,
},

'program-manager': {
    organizations: noAccess,
    groupHeads: noAccess,
    programs: viewOnly, // View only
    participants: viewExport,
    questionnaires: editViewExport, // Edit/View but NO create/delete
    activities: editViewExport, // Edit/View but NO create/delete
    reports: viewExport,
    notifications: { ...viewExport, canSendNotifications: true },
},

'program-moderator': {
    organizations: noAccess,
    groupHeads: noAccess,
    programs: noAccess,
    participants: noAccess,
    questionnaires: noAccess,
    activities: viewOnly, // View only
    reports: viewExport,
    notifications: noAccess,
},
```

### 3. Frontend: Update Navigation Items (permissions.ts)

Add Evaluation check:

```typescript
// Evaluation Module - check service access
if (hasService('evaluation-view') || hasService('evaluation-manage')) {
  if (role === 'super-admin' || role === 'admin' || 
      role === 'program-admin' || role === 'program-manager' || 
      role === 'program-moderator') {
    items.push({ label: 'Evaluation', href: '/evaluation-new', icon: 'ClipboardCheck' });
  }
}
```

### 4. Migration: Update Existing Users

Create migration to update existing program role users with correct services.

## Safety Checks
- ✅ No impact on Super Admin
- ✅ Program-scoped data visibility maintained
- ✅ Backward compatible
- ✅ No breaking database changes

## Files to Modify
1. backend/app/Http/Controllers/Api/ProgramController.php
2. frontend/lib/permissions.ts
3. backend/database/migrations/[new]_update_program_role_services.php
