<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Permission Service
 * 
 * Handles permission checks with priority:
 * 1. User-specific overrides
 * 2. Role-based permissions
 * 3. System default (deny)
 */
class PermissionService
{
    /**
     * Check if user has permission for action on resource
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
     * Check if evaluation admin owns a resource
     */
    public function evaluationAdminOwnsResource(User $user, string $resourceType, string $resourceId): bool
    {
        if ($user->role !== 'evaluation-admin') {
            return false;
        }

        return DB::table('evaluation_admin_ownership')
            ->where('admin_user_id', $user->id)
            ->where('resource_type', $resourceType)
            ->where('resource_id', $resourceId)
            ->exists();
    }

    /**
     * Get resources owned by evaluation admin
     */
    public function getEvaluationAdminResources(User $user, string $resourceType = null): array
    {
        if ($user->role !== 'evaluation-admin') {
            return [];
        }

        $query = DB::table('evaluation_admin_ownership')
            ->where('admin_user_id', $user->id);

        if ($resourceType) {
            $query->where('resource_type', $resourceType);
        }

        return $query->pluck('resource_id')->toArray();
    }

    /**
     * Track ownership when evaluation admin creates a resource
     */
    public function trackOwnership(User $user, string $resourceType, string $resourceId, string $programId): void
    {
        if ($user->role !== 'evaluation-admin') {
            return;
        }

        DB::table('evaluation_admin_ownership')->insertOrIgnore([
            'id' => \Illuminate\Support\Str::uuid(),
            'admin_user_id' => $user->id,
            'program_id' => $programId,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Apply permission override to user
     */
    public function setPermissionOverride(
        User $user, 
        string $resource, 
        string $action, 
        bool $allowed, 
        string $reason = null
    ): void {
        // Only super-admin can set overrides
        if (!auth()->user() || auth()->user()->role !== 'super-admin') {
            throw new \Exception('Only super-admin can override permissions');
        }

        // Prevent granting super-admin permissions
        if ($user->role !== 'super-admin' && $allowed) {
            $superAdminPerms = $this->getRolePermissions('super-admin');
            if (isset($superAdminPerms[$resource][$action]) && $superAdminPerms[$resource][$action]) {
                // This is a super-admin only permission, block it
                throw new \Exception('Cannot grant super-admin level permissions');
            }
        }

        $overrides = $user->permission_overrides ?? [];
        
        if (!isset($overrides[$resource])) {
            $overrides[$resource] = [];
        }
        
        $overrides[$resource][$action] = $allowed;
        
        $user->update(['permission_overrides' => $overrides]);
        
        // Audit log
        DB::table('permission_audit_log')->insert([
            'id' => \Illuminate\Support\Str::uuid(),
            'user_id' => $user->id,
            'resource' => $resource,
            'action' => $action,
            'granted' => $allowed,
            'check_type' => 'override',
            'reason' => $reason,
            'changed_by' => auth()->id(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Remove permission override
     */
    public function removePermissionOverride(User $user, string $resource, string $action): void
    {
        if (!auth()->user() || auth()->user()->role !== 'super-admin') {
            throw new \Exception('Only super-admin can modify permissions');
        }

        $overrides = $user->permission_overrides ?? [];
        
        if (isset($overrides[$resource][$action])) {
            unset($overrides[$resource][$action]);
            
            // Remove empty resource arrays
            if (empty($overrides[$resource])) {
                unset($overrides[$resource]);
            }
            
            $user->update(['permission_overrides' => $overrides ?: null]);
        }
    }

    /**
     * Get default permissions for a role
     */
    private function getRolePermissions(string $role): array
    {
        // Define role permissions inline (can be moved to config later)
        $permissions = [
            'super-admin' => [
                'organizations' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
                'programs' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
                'questionnaires' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
                'activities' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
                'evaluation' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
                'reports' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
            ],
            'admin' => [
                'organizations' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
                'programs' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
                'questionnaires' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
                'activities' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
                'evaluation' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
                'reports' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
            ],
            'program-admin' => [
                'organizations' => ['canView' => false, 'canCreate' => false, 'canEdit' => false, 'canDelete' => false, 'canExport' => false],
                'programs' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
                'questionnaires' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
                'activities' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
                'evaluation' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
                'reports' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
            ],
            'evaluation-admin' => [
                'organizations' => ['canView' => true, 'canCreate' => false, 'canEdit' => false, 'canDelete' => false, 'canExport' => false],
                'programs' => ['canView' => true, 'canCreate' => false, 'canEdit' => false, 'canDelete' => false, 'canExport' => false],
                'questionnaires' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
                'activities' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
                'evaluation' => ['canView' => true, 'canCreate' => true, 'canEdit' => true, 'canDelete' => true, 'canExport' => true],
                'reports' => ['canView' => true, 'canCreate' => false, 'canEdit' => false, 'canDelete' => false, 'canExport' => true],
            ],
            'program-manager' => [
                'organizations' => ['canView' => false, 'canCreate' => false, 'canEdit' => false, 'canDelete' => false, 'canExport' => false],
                'programs' => ['canView' => true, 'canCreate' => false, 'canEdit' => true, 'canDelete' => false, 'canExport' => false],
                'questionnaires' => ['canView' => true, 'canCreate' => false, 'canEdit' => true, 'canDelete' => false, 'canExport' => true],
                'activities' => ['canView' => true, 'canCreate' => false, 'canEdit' => true, 'canDelete' => false, 'canExport' => true],
                'evaluation' => ['canView' => true, 'canCreate' => false, 'canEdit' => true, 'canDelete' => false, 'canExport' => true],
                'reports' => ['canView' => true, 'canCreate' => false, 'canEdit' => false, 'canDelete' => false, 'canExport' => true],
            ],
            'program-moderator' => [
                'organizations' => ['canView' => false, 'canCreate' => false, 'canEdit' => false, 'canDelete' => false, 'canExport' => false],
                'programs' => ['canView' => true, 'canCreate' => false, 'canEdit' => false, 'canDelete' => false, 'canExport' => false],
                'questionnaires' => ['canView' => true, 'canCreate' => false, 'canEdit' => false, 'canDelete' => false, 'canExport' => false],
                'activities' => ['canView' => true, 'canCreate' => false, 'canEdit' => false, 'canDelete' => false, 'canExport' => false],
                'evaluation' => ['canView' => true, 'canCreate' => false, 'canEdit' => false, 'canDelete' => false, 'canExport' => false],
                'reports' => ['canView' => true, 'canCreate' => false, 'canEdit' => false, 'canDelete' => false, 'canExport' => true],
            ],
        ];

        return $permissions[$role] ?? [];
    }

    /**
     * Log permission check
     */
    private function logPermissionCheck(
        User $user, 
        string $resource, 
        string $action, 
        bool $granted, 
        string $checkType
    ): void {
        // Only log in production/staging, not in development
        if (config('app.env') === 'local') {
            return;
        }

        try {
            DB::table('permission_audit_log')->insert([
                'id' => \Illuminate\Support\Str::uuid(),
                'user_id' => $user->id,
                'resource' => $resource,
                'action' => $action,
                'granted' => $granted,
                'check_type' => $checkType,
                'reason' => null,
                'changed_by' => null,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            // Silently fail - don't break application if logging fails
            Log::warning('Permission audit log failed', [
                'user_id' => $user->id,
                'resource' => $resource,
                'action' => $action,
                'error' => $e->getMessage()
            ]);
        }
    }
}
