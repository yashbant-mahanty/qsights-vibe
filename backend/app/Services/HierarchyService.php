<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserRoleHierarchy;
use App\Models\HierarchicalRole;
use App\Models\HierarchyChangeLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HierarchyService
{
    /**
     * Assign a manager to a user
     *
     * @param string $userId
     * @param string $programId
     * @param string $managerId
     * @param string $hierarchicalRoleId
     * @param string $changedByUserId
     * @param string|null $reason
     * @return UserRoleHierarchy
     * @throws \Exception
     */
    public function assignManager(
        string $userId,
        string $programId,
        string $managerId,
        string $hierarchicalRoleId,
        string $changedByUserId,
        ?string $reason = null
    ): UserRoleHierarchy {
        // Validation
        $this->validateManagerAssignment($userId, $programId, $managerId);

        DB::beginTransaction();
        try {
            // Check if hierarchy already exists
            $existingHierarchy = UserRoleHierarchy::where('user_id', $userId)
                ->where('program_id', $programId)
                ->first();

            if ($existingHierarchy) {
                // Update existing hierarchy
                $oldManagerId = $existingHierarchy->manager_user_id;
                
                $existingHierarchy->update([
                    'manager_user_id' => $managerId,
                    'hierarchical_role_id' => $hierarchicalRoleId,
                    'assigned_at' => now(),
                ]);

                // Log the reassignment
                HierarchyChangeLog::logReassignment(
                    $userId,
                    $programId,
                    $oldManagerId,
                    $managerId,
                    $changedByUserId,
                    $reason
                );

                $hierarchy = $existingHierarchy;
            } else {
                // Create new hierarchy
                $hierarchy = UserRoleHierarchy::create([
                    'user_id' => $userId,
                    'program_id' => $programId,
                    'hierarchical_role_id' => $hierarchicalRoleId,
                    'manager_user_id' => $managerId,
                    'assigned_at' => now(),
                ]);

                // Log the assignment
                HierarchyChangeLog::logAssignment(
                    $userId,
                    $programId,
                    $managerId,
                    $changedByUserId,
                    $reason
                );
            }

            // Update user's manager_user_id field for quick access
            User::where('id', $userId)->update([
                'manager_user_id' => $managerId,
                'hierarchical_role_id' => $hierarchicalRoleId,
            ]);

            DB::commit();
            return $hierarchy->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to assign manager', [
                'user_id' => $userId,
                'manager_id' => $managerId,
                'program_id' => $programId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Remove manager assignment from a user
     *
     * @param string $userId
     * @param string $programId
     * @param string $changedByUserId
     * @param string|null $reason
     * @return bool
     * @throws \Exception
     */
    public function removeManager(
        string $userId,
        string $programId,
        string $changedByUserId,
        ?string $reason = null
    ): bool {
        DB::beginTransaction();
        try {
            $hierarchy = UserRoleHierarchy::where('user_id', $userId)
                ->where('program_id', $programId)
                ->first();

            if (!$hierarchy) {
                throw new \Exception('No hierarchy found for this user in the specified program.');
            }

            $oldManagerId = $hierarchy->manager_user_id;

            // Update hierarchy - keep role but remove manager
            $hierarchy->update([
                'manager_user_id' => null,
            ]);

            // Update user model
            User::where('id', $userId)->update([
                'manager_user_id' => null,
            ]);

            // Log the removal
            HierarchyChangeLog::logRemoval(
                $userId,
                $programId,
                $oldManagerId,
                $changedByUserId,
                $reason
            );

            DB::commit();
            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to remove manager', [
                'user_id' => $userId,
                'program_id' => $programId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Validate manager assignment
     *
     * @param string $userId
     * @param string $programId
     * @param string $managerId
     * @return void
     * @throws \Exception
     */
    protected function validateManagerAssignment(string $userId, string $programId, string $managerId): void
    {
        // 1. Check if user and manager exist
        $user = User::find($userId);
        if (!$user) {
            throw new \Exception('User not found.');
        }

        $manager = User::find($managerId);
        if (!$manager) {
            throw new \Exception('Manager not found.');
        }

        // 2. Prevent self-assignment
        if ($userId === $managerId) {
            throw new \Exception('A user cannot be their own manager.');
        }

        // 3. Check if manager belongs to the same program
        $managerHierarchy = UserRoleHierarchy::where('user_id', $managerId)
            ->where('program_id', $programId)
            ->first();

        if (!$managerHierarchy && $manager->program_id != $programId) {
            throw new \Exception('Manager must belong to the same program.');
        }

        // 4. Check if manager has a manager role
        if ($managerHierarchy) {
            $managerRole = $managerHierarchy->hierarchicalRole;
            if (!$managerRole || !$managerRole->is_manager) {
                throw new \Exception('The selected user does not have a manager role.');
            }
        }

        // 5. Check for circular reference
        if ($this->wouldCreateCircularReference($userId, $managerId, $programId)) {
            throw new \Exception('This assignment would create a circular reporting structure.');
        }
    }

    /**
     * Check if assignment would create circular reference
     *
     * @param string $userId
     * @param string $proposedManagerId
     * @param string $programId
     * @return bool
     */
    public function wouldCreateCircularReference(string $userId, string $proposedManagerId, string $programId): bool
    {
        if ($userId === $proposedManagerId) {
            return true;
        }

        // Get all subordinates of the user
        $subordinates = $this->getAllSubordinates($userId, $programId);
        $subordinateIds = array_column($subordinates, 'id');

        // If proposed manager is in the subordinates, it's circular
        return in_array($proposedManagerId, $subordinateIds);
    }

    /**
     * Get all subordinates (direct and indirect) for a user
     *
     * @param string $userId
     * @param string $programId
     * @param int $depth
     * @param int $maxDepth
     * @return array
     */
    public function getAllSubordinates(string $userId, string $programId, int $depth = 0, int $maxDepth = 10): array
    {
        if ($depth >= $maxDepth) {
            return [];
        }

        $subordinates = [];
        
        // Get direct reports
        $directReports = UserRoleHierarchy::where('manager_user_id', $userId)
            ->where('program_id', $programId)
            ->with('user')
            ->get();

        foreach ($directReports as $hierarchy) {
            $user = $hierarchy->user;
            $subordinates[] = [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'depth' => $depth + 1,
            ];

            // Recursively get their subordinates
            $subSubordinates = $this->getAllSubordinates($user->id, $programId, $depth + 1, $maxDepth);
            $subordinates = array_merge($subordinates, $subSubordinates);
        }

        return $subordinates;
    }

    /**
     * Get hierarchy tree for a program
     *
     * @param string $programId
     * @return array
     */
    public function getHierarchyTree(string $programId): array
    {
        // Get all hierarchies for the program
        $hierarchies = UserRoleHierarchy::where('program_id', $programId)
            ->with(['user', 'hierarchicalRole', 'manager'])
            ->get();

        // Find top-level users (no manager)
        $topLevel = $hierarchies->whereNull('manager_user_id');

        $tree = [];
        foreach ($topLevel as $hierarchy) {
            $tree[] = $this->buildHierarchyNode($hierarchy, $hierarchies);
        }

        return $tree;
    }

    /**
     * Build a hierarchy node recursively
     *
     * @param UserRoleHierarchy $hierarchy
     * @param \Illuminate\Support\Collection $allHierarchies
     * @return array
     */
    protected function buildHierarchyNode(UserRoleHierarchy $hierarchy, $allHierarchies): array
    {
        $user = $hierarchy->user;
        $role = $hierarchy->hierarchicalRole;

        // Find direct reports
        $directReports = $allHierarchies->where('manager_user_id', $user->id);

        $children = [];
        foreach ($directReports as $reportHierarchy) {
            $children[] = $this->buildHierarchyNode($reportHierarchy, $allHierarchies);
        }

        return [
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $role ? $role->name : null,
            'role_code' => $role ? $role->code : null,
            'hierarchy_level' => $role ? $role->hierarchy_level : null,
            'is_manager' => $role ? $role->is_manager : false,
            'children' => $children,
            'direct_reports_count' => count($children),
        ];
    }

    /**
     * Get manager's team members for a program
     *
     * @param string $managerId
     * @param string $programId
     * @return \Illuminate\Support\Collection
     */
    public function getManagerTeam(string $managerId, string $programId)
    {
        return UserRoleHierarchy::where('manager_user_id', $managerId)
            ->where('program_id', $programId)
            ->with(['user', 'hierarchicalRole'])
            ->get();
    }

    /**
     * Get team statistics for a manager
     *
     * @param string $managerId
     * @param string $programId
     * @return array
     */
    public function getTeamStatistics(string $managerId, string $programId): array
    {
        $team = $this->getManagerTeam($managerId, $programId);
        $allSubordinates = $this->getAllSubordinates($managerId, $programId);

        return [
            'direct_reports' => $team->count(),
            'total_subordinates' => count($allSubordinates),
            'active_users' => $team->filter(function ($hierarchy) {
                return $hierarchy->user->status === 'active';
            })->count(),
            'inactive_users' => $team->filter(function ($hierarchy) {
                return $hierarchy->user->status !== 'active';
            })->count(),
            'managers_count' => $team->filter(function ($hierarchy) {
                return $hierarchy->hierarchicalRole && $hierarchy->hierarchicalRole->is_manager;
            })->count(),
            'staff_count' => $team->filter(function ($hierarchy) {
                return $hierarchy->hierarchicalRole && !$hierarchy->hierarchicalRole->is_manager;
            })->count(),
        ];
    }

    /**
     * Check if a user is in a manager's chain (direct or indirect report)
     *
     * @param int $userId
     * @param int $managerId
     * @param string|null $programId
     * @return bool
     */
    public function isUserInManagerChain(int $userId, int $managerId, ?string $programId = null): bool
    {
        try {
            $subordinates = $this->getAllSubordinates($managerId, $programId);
            return collect($subordinates)->contains('id', $userId);
        } catch (\Exception $e) {
            Log::error('Error checking manager chain', [
                'user_id' => $userId,
                'manager_id' => $managerId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Validate if user has permission to perform hierarchy actions
     * 
     * @param int $userId
     * @param string $action
     * @return bool
     */
    public function hasHierarchyPermission(int $userId, string $action): bool
    {
        try {
            $user = User::find($userId);
            
            if (!$user) {
                return false;
            }

            // Admin roles have all permissions
            $bypassRoles = config('hierarchy_security.data_access.bypass_roles', ['admin', 'super-admin']);
            if (in_array($user->role, $bypassRoles)) {
                return true;
            }

            // Check manager-specific permissions
            $permissions = config('hierarchy_security.manager_permissions', []);
            
            $actionMap = [
                'view_analytics' => $permissions['can_view_analytics'] ?? true,
                'view_team_profiles' => $permissions['can_view_team_profiles'] ?? true,
                'send_notifications' => $permissions['can_send_notifications'] ?? true,
                'export_data' => $permissions['can_export_data'] ?? true,
                'assign_activities' => $permissions['can_assign_activities'] ?? false,
                'modify_structure' => $permissions['can_modify_team_structure'] ?? false,
            ];

            return $actionMap[$action] ?? false;
        } catch (\Exception $e) {
            Log::error('Error checking hierarchy permission', [
                'user_id' => $userId,
                'action' => $action,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Check if user can access data from a specific program
     * 
     * @param int $userId
     * @param string $programId
     * @return bool
     */
    public function canAccessProgram(int $userId, string $programId): bool
    {
        try {
            $user = User::find($userId);
            
            if (!$user) {
                return false;
            }

            // Bypass roles have access to all programs
            $bypassRoles = config('hierarchy_security.data_access.bypass_roles', []);
            if (in_array($user->role, $bypassRoles)) {
                return true;
            }

            // Check if user has any role in this program
            return UserRoleHierarchy::where('user_id', $userId)
                ->where('program_id', $programId)
                ->exists();
        } catch (\Exception $e) {
            Log::error('Error checking program access', [
                'user_id' => $userId,
                'program_id' => $programId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Validate manager assignment for security
     * 
     * @param int $userId
     * @param int $managerId
     * @param string $programId
     * @return array ['valid' => bool, 'errors' => array]
     */
    public function validateManagerAssignmentSecurity(int $userId, int $managerId, string $programId): array
    {
        $errors = [];

        try {
            // Check for self-management
            if ($userId === $managerId && config('hierarchy_security.validation.manager_assignment.prevent_self_management', true)) {
                $errors[] = 'User cannot be their own manager';
            }

            // Check for circular references
            if (config('hierarchy_security.validation.manager_assignment.prevent_circular_references', true)) {
                if ($this->wouldCreateCircularReference($userId, $managerId, $programId)) {
                    $errors[] = 'This assignment would create a circular reference';
                }
            }

            // Check hierarchy depth
            $maxDepth = config('hierarchy_security.data_access.max_hierarchy_depth', 10);
            $depth = $this->getHierarchyDepth($managerId, $programId);
            if ($depth >= $maxDepth) {
                $errors[] = "Maximum hierarchy depth ($maxDepth) would be exceeded";
            }

            // Validate both users have access to the program
            if (config('hierarchy_security.validation.manager_assignment.require_program_id', true)) {
                if (!$this->canAccessProgram($userId, $programId)) {
                    $errors[] = 'User does not have access to this program';
                }
                if (!$this->canAccessProgram($managerId, $programId)) {
                    $errors[] = 'Manager does not have access to this program';
                }
            }

            return [
                'valid' => empty($errors),
                'errors' => $errors
            ];
        } catch (\Exception $e) {
            Log::error('Error validating manager assignment security', [
                'user_id' => $userId,
                'manager_id' => $managerId,
                'error' => $e->getMessage()
            ]);
            return [
                'valid' => false,
                'errors' => ['Security validation failed: ' . $e->getMessage()]
            ];
        }
    }

    /**
     * Get hierarchy depth for a user
     * 
     * @param int $userId
     * @param string $programId
     * @return int
     */
    private function getHierarchyDepth(int $userId, string $programId): int
    {
        $depth = 0;
        $currentUserId = $userId;
        $maxIterations = 20; // Safety limit

        while ($currentUserId && $depth < $maxIterations) {
            $hierarchy = UserRoleHierarchy::where('user_id', $currentUserId)
                ->where('program_id', $programId)
                ->first();

            if (!$hierarchy || !$hierarchy->manager_id) {
                break;
            }

            $currentUserId = $hierarchy->manager_id;
            $depth++;
        }

        return $depth;
    }
}

