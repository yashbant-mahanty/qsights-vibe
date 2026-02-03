# QSights Role System Upgrade - Architecture Analysis & Recommendation

**Date:** February 1, 2026  
**Version:** 2.0  
**Status:** Architecture Decision Document

---

## Executive Summary

After analyzing the QSights platform's current role architecture, **I recommend a Hybrid Approach (Option 2.5)** that combines the simplicity of fixed roles with the flexibility of dynamic permissions, while maintaining backward compatibility.

---

## Current System Analysis

### Existing Role Architecture

#### 1. **Fixed System Roles** (User.role enum)
```
- super-admin       → Full system access
- admin             → Administrative access  
- program-admin     → Program administration (scoped)
- program-manager   → Program management (scoped)
- program-moderator → Program moderation (scoped)
- participant       → Regular participant
```

#### 2. **Program-Specific Custom Roles** (program_roles table)
- Custom roles per program with assigned activities/events
- Separate authentication system
- Used for trainers, evaluators, observers

#### 3. **Evaluation System Roles** (evaluation_roles table)  
- Organizational positions (e.g., "Senior Manager", "Team Lead")
- Used for 360° evaluations
- Hierarchy-based structure

### Current Implementation Strengths

✅ **Well-Structured RBAC:**
- Role-based middleware (`CheckRole`)
- Program scoping enforcement (`EnforceProgramScoping`)
- Comprehensive permission system (frontend: `lib/permissions.ts`)
- Security audit logging

✅ **Scalable Architecture:**
- UUID-based primary keys
- Soft deletes for data retention
- Migration system in place
- Module-wise permissions already defined

✅ **Security Features:**
- Program scoping prevents data leakage
- Sanctum token-based authentication
- Audit trails for manager actions
- Rate limiting on notifications

### Current Gaps for "Evaluation Admin" Use Case

❌ **No Intermediate Role Between Program Admin and Moderator:**
- Program Admin has full program access
- Program Moderator has view-only access
- **Need:** Role with Questionnaire + Evaluation full access, but Org/Program view-only

❌ **No Dynamic Permission Assignment:**
- Permissions are hardcoded per role
- Cannot customize access per instance
- Adding new roles requires code changes

---

## Option Analysis

### Option 1: Fixed "Evaluation Admin" Role

#### Implementation
```php
// Add to User model enum
'evaluation-admin' // New fixed role

// Permissions (in lib/permissions.ts)
'evaluation-admin': {
  organizations: viewOnly,
  programs: viewOnly,
  questionnaires: fullAccess,
  activities: fullAccess,
  evaluation: fullAccess,
  reports: fullAccess,
}
```

#### Pros
- ✅ **Simplest to implement** (1-2 hours)
- ✅ **Backward compatible** (no migration needed)
- ✅ **Clear role hierarchy**
- ✅ **No performance impact**

#### Cons
- ❌ **Not scalable** - Next request will need another fixed role
- ❌ **Code changes required** for each new role
- ❌ **No flexibility** - Cannot adjust permissions per program
- ❌ **Technical debt** accumulates

#### Risk Assessment
- **Low short-term risk**, **High long-term risk**
- Band-aid solution that delays proper refactoring

---

### Option 2: Full Dynamic RBAC System

#### Implementation
```
New Tables:
- permissions (resource, action, description)
- role_permissions (role_id, permission_id)
- user_roles (user_id, role_id, program_id, scope)
- resource_modules (module_name, permissions[])
```

#### Pros
- ✅ **Highly flexible** - Create any role combination
- ✅ **Future-proof** - No code changes for new roles
- ✅ **Granular control** - Per-resource, per-action permissions
- ✅ **Industry standard** approach

#### Cons
- ❌ **Complex migration** (80+ hours development)
- ❌ **High risk** - Can break existing roles
- ❌ **Performance overhead** - Extra DB queries
- ❌ **UI complexity** - Need permission matrix builder
- ❌ **Testing burden** - Every permission combination

#### Risk Assessment
- **High short-term risk**, **Low long-term risk**
- Over-engineering for current needs

---

## ✅ RECOMMENDED: Option 2.5 (Hybrid Approach)

### Strategy: "Preserve Fixed Roles + Add Configurable Permissions Layer"

This approach keeps the simplicity of fixed roles while adding flexibility where needed.

### Architecture Design

#### Phase 1: Core Schema (Immediate - 8 hours)

```sql
-- 1. Add permission overrides to users table
ALTER TABLE users ADD COLUMN permission_overrides JSON;
-- Stores custom permissions that override role defaults
-- Example: {"questionnaires": {"canCreate": false}, "evaluation": {"canDelete": true}}

-- 2. Add new fixed role
ALTER TABLE users MODIFY COLUMN role ENUM(
  'super-admin',
  'admin',
  'program-admin',
  'program-manager',
  'program-moderator',
  'evaluation-admin',  -- NEW ROLE
  'participant'
);

-- 3. Permission audit log
CREATE TABLE permission_audit_log (
  id UUID PRIMARY KEY,
  user_id BIGINT UNSIGNED,
  resource VARCHAR(50),
  action VARCHAR(20),
  granted BOOLEAN,
  reason TEXT,
  created_at TIMESTAMP
);
```

#### Phase 2: Permission Engine (8 hours)

```php
// app/Services/PermissionService.php
class PermissionService {
    
    /**
     * Check if user has permission for action on resource
     * 
     * Priority: 
     * 1. User-specific overrides
     * 2. Role default permissions
     * 3. System defaults (deny by default)
     */
    public function hasPermission(User $user, string $resource, string $action): bool
    {
        // Check user-specific overrides first
        if ($user->permission_overrides) {
            $overrides = $user->permission_overrides;
            if (isset($overrides[$resource][$action])) {
                $this->logPermissionCheck($user, $resource, $action, $overrides[$resource][$action], 'override');
                return $overrides[$resource][$action];
            }
        }
        
        // Fall back to role-based permissions
        $rolePermissions = $this->getRolePermissions($user->role);
        $hasPermission = $rolePermissions[$resource][$action] ?? false;
        
        $this->logPermissionCheck($user, $resource, $action, $hasPermission, 'role');
        return $hasPermission;
    }
    
    /**
     * Get default permissions for a role
     */
    private function getRolePermissions(string $role): array
    {
        return config('permissions.roles')[$role] ?? [];
    }
    
    /**
     * Apply permission override to user
     */
    public function setPermissionOverride(User $user, string $resource, string $action, bool $allowed, string $reason = null): void
    {
        $overrides = $user->permission_overrides ?? [];
        
        if (!isset($overrides[$resource])) {
            $overrides[$resource] = [];
        }
        
        $overrides[$resource][$action] = $allowed;
        
        $user->update(['permission_overrides' => $overrides]);
        
        // Audit log
        PermissionAuditLog::create([
            'user_id' => $user->id,
            'resource' => $resource,
            'action' => $action,
            'granted' => $allowed,
            'reason' => $reason,
            'changed_by' => auth()->id(),
        ]);
    }
}
```

#### Phase 3: Middleware Enhancement (4 hours)

```php
// app/Http/Middleware/CheckPermission.php
class CheckPermission
{
    public function handle(Request $request, Closure $next, string $resource, string $action): Response
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }
        
        $permissionService = app(PermissionService::class);
        
        if (!$permissionService->hasPermission($user, $resource, $action)) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => "You do not have permission to {$action} {$resource}",
            ], 403);
        }
        
        return $next($request);
    }
}
```

#### Phase 4: Admin UI (12 hours)

```typescript
// frontend/app/admin/users/[id]/permissions/page.tsx

interface PermissionOverride {
  resource: string;
  action: string;
  allowed: boolean;
  reason?: string;
}

function UserPermissionsEditor({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [overrides, setOverrides] = useState<PermissionOverride[]>([]);
  
  const resources = [
    'organizations', 'programs', 'questionnaires', 
    'activities', 'evaluation', 'reports'
  ];
  
  const actions = ['canView', 'canCreate', 'canEdit', 'canDelete', 'canExport'];
  
  return (
    <div className="permission-matrix">
      <h2>User Permissions for {user?.name}</h2>
      <p>Base Role: <Badge>{user?.role}</Badge></p>
      
      <table>
        <thead>
          <tr>
            <th>Resource</th>
            {actions.map(action => <th key={action}>{action}</th>)}
          </tr>
        </thead>
        <tbody>
          {resources.map(resource => (
            <tr key={resource}>
              <td>{resource}</td>
              {actions.map(action => {
                const override = overrides.find(
                  o => o.resource === resource && o.action === action
                );
                const defaultPerm = getRolePermission(user?.role, resource, action);
                
                return (
                  <td key={action}>
                    <PermissionToggle
                      defaultValue={defaultPerm}
                      override={override?.allowed}
                      onChange={(value, reason) => 
                        handleOverrideChange(resource, action, value, reason)
                      }
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Evaluation Admin Role Definition

```javascript
// config/permissions.js (or frontend/lib/permissions.ts)

'evaluation-admin': {
  organizations: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canExport: false,
  },
  programs: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canExport: false,
  },
  questionnaires: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canExport: true,
  },
  evaluation: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canExport: true,
    canPublish: true,
  },
  activities: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canExport: true,
  },
  reports: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canExport: true,
  },
}
```

---

## Migration Strategy (Zero-Downtime)

### Step 1: Add New Structures (Non-Breaking)
```bash
# Create migration
php artisan make:migration add_permission_overrides_to_users

# Run migration
php artisan migrate
```

### Step 2: Deploy Permission Service (Backward Compatible)
- Service checks both old and new permission systems
- Falls back to role-based permissions if no overrides

### Step 3: Add Evaluation Admin Role
```bash
# Run seeder
php artisan db:seed --class=EvaluationAdminRoleSeeder
```

### Step 4: Migrate Existing Data (Optional)
```php
// No data migration needed - existing roles work as-is
// Only migrate if users need custom overrides
```

### Step 5: Update Routes (Incremental)
```php
// Old (still works):
Route::middleware(['auth:sanctum', 'role:super-admin,admin'])->group(...);

// New (more granular):
Route::middleware(['auth:sanctum', 'permission:questionnaires,canCreate'])->group(...);
```

---

## Benefits of Hybrid Approach

### ✅ Immediate Benefits
1. **Add Evaluation Admin role** in 1 day (not weeks)
2. **Zero downtime** - backward compatible
3. **Low risk** - existing roles unchanged
4. **Quick wins** - Solves immediate problem

### ✅ Long-term Benefits
1. **Scalable** - Add new roles via config
2. **Flexible** - Override permissions per user
3. **Audit trail** - Track all permission changes
4. **Future-proof** - Can add more resources/actions

### ✅ Maintainability
1. **Simple mental model** - Roles + Overrides
2. **No performance hit** - JSON column, no extra JOINs
3. **Easy testing** - Test role defaults + override logic separately
4. **Clear ownership** - Permission service is single source of truth

---

## Implementation Plan

### Week 1: Core Infrastructure (32 hours)
- [ ] Database migration for permission_overrides
- [ ] PermissionService implementation
- [ ] CheckPermission middleware
- [ ] Add evaluation-admin role definition
- [ ] Backend API for permission management
- [ ] Unit tests for permission service

### Week 2: Admin UI (24 hours)
- [ ] User permissions editor component
- [ ] Permission matrix UI
- [ ] Role default viewer
- [ ] Override audit log viewer
- [ ] Integration tests

### Week 3: Migration & Testing (16 hours)
- [ ] Migrate existing routes to new middleware (optional)
- [ ] End-to-end testing
- [ ] Security audit
- [ ] Performance testing
- [ ] Documentation

### Week 4: Deployment (8 hours)
- [ ] Staging deployment
- [ ] User acceptance testing
- [ ] Production deployment
- [ ] Monitoring & rollback plan

**Total Effort:** ~80 hours (2 weeks with 2 developers)

---

## Security Considerations

### 1. Privilege Escalation Prevention
```php
// Only super-admin can override permissions
public function setPermissionOverride(...) 
{
    if (!auth()->user()->hasRole('super-admin')) {
        throw new UnauthorizedException('Only super-admin can override permissions');
    }
    
    // Prevent granting super-admin permissions
    if ($role === 'super-admin' && !auth()->user()->hasRole('super-admin')) {
        throw new UnauthorizedException('Cannot grant super-admin permissions');
    }
}
```

### 2. Audit Logging
- Every permission check logged
- Override changes tracked with reason
- Queryable audit log for compliance

### 3. Default Deny
- Unknown resources/actions → denied
- Missing override → fall back to role default
- Role not found → deny

### 4. Program Scoping Preserved
- Evaluation Admin still scoped to program
- EnforceProgramScoping middleware still applies
- Cannot access other programs' data

---

## Validation & Testing

### Unit Tests
```php
test('evaluation_admin_can_create_questionnaire')
test('evaluation_admin_cannot_edit_organization')
test('permission_override_takes_precedence_over_role')
test('invalid_resource_returns_false')
test('super_admin_can_override_any_permission')
```

### Integration Tests
```php
test('evaluation_admin_can_access_questionnaire_routes')
test('evaluation_admin_blocked_from_organization_routes')
test('permission_override_persists_after_logout')
test('audit_log_records_permission_checks')
```

### Security Tests
```php
test('program_moderator_cannot_override_own_permissions')
test('evaluation_admin_scoped_to_program')
test('cannot_escalate_to_super_admin')
```

---

## Rollback Plan

### If Issues Arise:
1. **Remove evaluation-admin role** from enum
2. **Drop permission_overrides column** (data preserved in migration)
3. **Revert middleware** to role-based checks
4. **No data loss** - all changes are additive

### Rollback SQL:
```sql
-- Remove new role (if needed)
UPDATE users SET role = 'program-admin' WHERE role = 'evaluation-admin';

-- Drop overrides column (optional - doesn't break anything if kept)
ALTER TABLE users DROP COLUMN permission_overrides;
```

---

## Cost-Benefit Analysis

| Approach | Dev Time | Risk | Scalability | Maintenance |
|----------|----------|------|-------------|-------------|
| **Option 1 (Fixed Role)** | 4h | Low | ❌ Poor | ❌ High |
| **Option 2 (Full Dynamic)** | 320h | High | ✅ Excellent | ✅ Low |
| **Option 2.5 (Hybrid)** ⭐ | 80h | Medium | ✅ Good | ✅ Medium |

### ROI Calculation:
- **Option 1:** Cheap now, expensive later (tech debt accumulates)
- **Option 2:** Expensive now, may never use full complexity
- **Option 2.5:** Balanced investment with immediate & future value

---

## Recommendations by Stakeholder

### For Product Team:
✅ **Use Hybrid Approach (Option 2.5)**
- Solves immediate problem (Evaluation Admin)
- Prepares for future role requests
- Minimal disruption to existing users

### For Engineering Team:
✅ **Use Hybrid Approach (Option 2.5)**
- Clean architecture
- Testable code
- Maintainable long-term
- Incremental rollout

### For Business Team:
✅ **Use Hybrid Approach (Option 2.5)**
- 2-week delivery timeline
- Low risk to existing customers
- Supports future sales needs
- Competitive feature parity

---

## Next Steps

### Immediate Actions:
1. ✅ **Approve this architecture** (Stakeholder sign-off)
2. 📝 **Create implementation tickets** (Break down into sprints)
3. 🎨 **Review UI mockups** (Permission matrix design)
4. 🔒 **Security review** (Pen-test plan)

### Before Starting Development:
- [ ] Confirm Evaluation Admin permission requirements
- [ ] Identify any other upcoming role requests
- [ ] Assess if any existing users need custom overrides
- [ ] Set up monitoring for permission checks

---

## Conclusion

The **Hybrid Approach (Option 2.5)** provides the best balance of:
- ✅ Immediate value (Evaluation Admin in 1 week)
- ✅ Future scalability (Custom permissions ready)
- ✅ Low risk (Backward compatible)
- ✅ Maintainable (Single source of truth)

This approach respects the existing architecture while adding necessary flexibility, making it the most pragmatic choice for QSights' current needs and future growth.

---

## Appendices

### A. Existing Role Permissions Reference
See: [frontend/lib/permissions.ts](frontend/lib/permissions.ts)

### B. Database Schema
See: [backend/database/migrations/](backend/database/migrations/)

### C. Security Audit Log
See: [EnforceProgramScoping.php](backend/app/Http/Middleware/EnforceProgramScoping.php)

### D. API Documentation
See: [backend/routes/api.php](backend/routes/api.php)

---

**Document Version:** 2.0  
**Last Updated:** February 1, 2026  
**Next Review:** After implementation completion
