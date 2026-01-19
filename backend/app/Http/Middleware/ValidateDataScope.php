<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Services\HierarchyService;
use Symfony\Component\HttpFoundation\Response;

class ValidateDataScope
{
    protected HierarchyService $hierarchyService;

    public function __construct(HierarchyService $hierarchyService)
    {
        $this->hierarchyService = $hierarchyService;
    }

    /**
     * Handle an incoming request and validate data access scope.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated'
            ], 401);
        }

        // Extract target resource IDs from route
        $managerId = $request->route('managerId');
        $memberId = $request->route('memberId');
        $userId = $request->route('userId');
        $programId = $request->input('program_id') ?? $request->route('programId');

        // Validate manager is accessing their own data
        if ($managerId && (int) $managerId !== $user->id) {
            Log::warning('Manager attempting to access another manager\'s data', [
                'requesting_user_id' => $user->id,
                'target_manager_id' => $managerId,
                'path' => $request->path(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: You can only access your own manager data'
            ], 403);
        }

        // Validate access to team member data
        if ($memberId) {
            $hasAccess = $this->validateMemberAccess($user->id, (int) $memberId, $programId);
            
            if (!$hasAccess) {
                Log::warning('Manager attempting to access unauthorized team member', [
                    'manager_id' => $user->id,
                    'target_member_id' => $memberId,
                    'program_id' => $programId,
                    'path' => $request->path(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized: This team member is not in your hierarchy'
                ], 403);
            }
        }

        // Validate access to user data (for manager assignment, etc.)
        if ($userId && $request->method() !== 'GET') {
            // For POST/PUT/DELETE operations on users, ensure they're in manager's scope
            $hasAccess = $this->validateMemberAccess($user->id, (int) $userId, $programId);
            
            if (!$hasAccess && $user->role !== 'admin' && $user->role !== 'program_admin') {
                Log::warning('Manager attempting unauthorized user modification', [
                    'manager_id' => $user->id,
                    'target_user_id' => $userId,
                    'method' => $request->method(),
                    'path' => $request->path(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized: You cannot modify users outside your hierarchy'
                ], 403);
            }
        }

        // Validate program access
        if ($programId) {
            $hasProgram = $this->validateProgramAccess($user->id, $programId);
            
            if (!$hasProgram) {
                Log::warning('Manager attempting to access unauthorized program', [
                    'manager_id' => $user->id,
                    'program_id' => $programId,
                    'path' => $request->path(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized: You do not have access to this program'
                ], 403);
            }
        }

        return $next($request);
    }

    /**
     * Validate manager has access to a team member
     */
    private function validateMemberAccess(int $managerId, int $memberId, $programId = null): bool
    {
        try {
            // Admin and program_admin have full access
            $user = \App\Models\User::find($managerId);
            if ($user && in_array($user->role, ['admin', 'program_admin'])) {
                return true;
            }

            // If program specified, check within that program
            if ($programId) {
                return $this->hierarchyService->isUserInManagerChain($memberId, $managerId, $programId);
            }

            // Check across all programs where manager has hierarchy
            $subordinates = $this->hierarchyService->getAllSubordinates($managerId);
            return $subordinates->contains('id', $memberId);
        } catch (\Exception $e) {
            Log::error('Error validating member access', [
                'manager_id' => $managerId,
                'member_id' => $memberId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Validate manager has access to a program
     */
    private function validateProgramAccess(int $managerId, string $programId): bool
    {
        try {
            $user = \App\Models\User::find($managerId);
            
            // Admin and program_admin have full access
            if ($user && in_array($user->role, ['admin', 'program_admin'])) {
                return true;
            }

            // Check if user has any hierarchical role in this program
            $hasRole = \App\Models\UserRoleHierarchy::where('user_id', $managerId)
                ->where('program_id', $programId)
                ->exists();

            return $hasRole;
        } catch (\Exception $e) {
            Log::error('Error validating program access', [
                'manager_id' => $managerId,
                'program_id' => $programId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }
}
