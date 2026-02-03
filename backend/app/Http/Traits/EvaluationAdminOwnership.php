<?php

namespace App\Http\Traits;

use App\Services\PermissionService;
use Illuminate\Support\Facades\DB;

/**
 * Evaluation Admin Ownership Trait
 * 
 * Provides methods to track and enforce ownership for evaluation-admin role
 */
trait EvaluationAdminOwnership
{
    /**
     * Track ownership when a resource is created
     */
    protected function trackOwnership(string $resourceType, string $resourceId, string $programId): void
    {
        $user = auth()->user();
        
        if ($user && $user->role === 'evaluation-admin') {
            $permissionService = app(PermissionService::class);
            $permissionService->trackOwnership($user, $resourceType, $resourceId, $programId);
        }
    }

    /**
     * Check if evaluation admin owns or can access a resource
     */
    protected function canAccessResource(string $resourceType, string $resourceId): bool
    {
        $user = auth()->user();
        
        // Super-admin, admin, program-admin have full access
        if (in_array($user->role, ['super-admin', 'admin', 'program-admin'])) {
            return true;
        }
        
        // Evaluation admin: ownership-based access
        if ($user->role === 'evaluation-admin') {
            $permissionService = app(PermissionService::class);
            return $permissionService->evaluationAdminOwnsResource($user, $resourceType, $resourceId);
        }
        
        return false;
    }

    /**
     * Filter query for evaluation admin (ownership-based)
     */
    protected function applyOwnershipFilter($query, string $resourceType, string $resourceIdColumn = 'id')
    {
        $user = auth()->user();
        
        // Super-admin, admin, program-admin: no filter needed
        if (in_array($user->role, ['super-admin', 'admin', 'program-admin'])) {
            return $query;
        }
        
        // Evaluation admin: filter by ownership
        if ($user->role === 'evaluation-admin') {
            $permissionService = app(PermissionService::class);
            $ownedResourceIds = $permissionService->getEvaluationAdminResources($user, $resourceType);
            
            if (empty($ownedResourceIds)) {
                // No owned resources, return empty result
                return $query->whereRaw('1 = 0');
            }
            
            return $query->whereIn($resourceIdColumn, $ownedResourceIds);
        }
        
        return $query;
    }

    /**
     * Get filter for subordinates (manager hierarchy)
     */
    protected function getSubordinateUserIds($managerId, $programId, &$result = []): array
    {
        $directReports = DB::table('user_role_hierarchy')
            ->where('manager_user_id', $managerId)
            ->where('program_id', $programId)
            ->whereNull('deleted_at')
            ->pluck('user_id')
            ->toArray();
        
        $result = array_merge($result, $directReports);
        
        // Recursively get subordinates
        foreach ($directReports as $userId) {
            $this->getSubordinateUserIds($userId, $programId, $result);
        }
        
        return array_unique($result);
    }
}
