<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class HierarchyMappingController extends Controller
{
    /**
     * Get all hierarchy mappings
     */
    public function index(Request $request)
    {
        try {
            $mappings = DB::table('hierarchy_mappings as hm')
                ->join('programs as p', 'hm.program_id', '=', 'p.id')
                ->join('users as parent_user', 'hm.parent_user_id', '=', 'parent_user.id')
                ->join('users as child_user', 'hm.child_user_id', '=', 'child_user.id')
                ->select(
                    'hm.id',
                    'hm.program_id',
                    'p.name as program_name',
                    'hm.parent_role_id as parent_role_name',
                    'hm.parent_user_id',
                    'parent_user.username as parent_user_name',
                    'parent_user.email as parent_user_email',
                    'hm.child_role_id as child_role_name',
                    'hm.child_user_id',
                    'child_user.username as child_user_name',
                    'child_user.email as child_user_email',
                    'hm.created_at as mapped_at'
                )
                ->orderBy('hm.created_at', 'desc')
                ->get();

            return response()->json(['success' => true, 'data' => $mappings]);
        } catch (\Exception $e) {
            Log::error('Error fetching hierarchy mappings: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch hierarchy mappings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new hierarchy mapping
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'program_id' => 'required|uuid|exists:programs,id',
                'parent_role_id' => 'required|string',
                'parent_user_id' => 'required|uuid|exists:users,id',
                'child_role_id' => 'required|string',
                'child_user_id' => 'required|uuid|exists:users,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check if child user already has a manager in this program
            $existingMapping = DB::table('hierarchy_mappings')
                ->where('child_user_id', $request->child_user_id)
                ->where('program_id', $request->program_id)
                ->first();

            if ($existingMapping) {
                return response()->json([
                    'success' => false,
                    'message' => 'This user already has a manager assigned in this program'
                ], 409);
            }

            // Check for circular hierarchy (prevent user from being their own manager)
            if ($request->parent_user_id === $request->child_user_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'A user cannot be their own manager'
                ], 400);
            }

            // Check for circular hierarchy (prevent child from being manager of their manager)
            $circularCheck = $this->checkCircularHierarchy(
                $request->parent_user_id,
                $request->child_user_id,
                $request->program_id
            );

            if ($circularCheck) {
                return response()->json([
                    'success' => false,
                    'message' => 'This would create a circular hierarchy. The selected manager is already managed by this user.'
                ], 400);
            }

            // Create the mapping
            $mapping = DB::table('hierarchy_mappings')->insertGetId([
                'program_id' => $request->program_id,
                'parent_role_id' => $request->parent_role_id,
                'parent_user_id' => $request->parent_user_id,
                'child_role_id' => $request->child_role_id,
                'child_user_id' => $request->child_user_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Grant manager dashboard access to parent user if not already granted
            $this->grantManagerDashboardAccess($request->parent_user_id);

            Log::info('Hierarchy mapping created', [
                'mapping_id' => $mapping,
                'program_id' => $request->program_id,
                'parent_user_id' => $request->parent_user_id,
                'child_user_id' => $request->child_user_id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Hierarchy mapping created successfully',
                'data' => ['id' => $mapping]
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating hierarchy mapping: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create hierarchy mapping',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a hierarchy mapping
     */
    public function destroy($id)
    {
        try {
            $mapping = DB::table('hierarchy_mappings')->where('id', $id)->first();

            if (!$mapping) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hierarchy mapping not found'
                ], 404);
            }

            DB::table('hierarchy_mappings')->where('id', $id)->delete();

            // Check if parent user has any remaining child mappings
            $remainingMappings = DB::table('hierarchy_mappings')
                ->where('parent_user_id', $mapping->parent_user_id)
                ->count();

            // If no more mappings, revoke manager dashboard access
            if ($remainingMappings === 0) {
                $this->revokeManagerDashboardAccess($mapping->parent_user_id);
            }

            Log::info('Hierarchy mapping deleted', ['mapping_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Hierarchy mapping deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting hierarchy mapping: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete hierarchy mapping',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check for circular hierarchy
     */
    private function checkCircularHierarchy($parentUserId, $childUserId, $programId, $visited = [])
    {
        // Prevent infinite recursion
        if (in_array($parentUserId, $visited)) {
            return true;
        }

        $visited[] = $parentUserId;

        // Check if the parent user is managed by the child user
        $parentManager = DB::table('hierarchy_mappings')
            ->where('child_user_id', $parentUserId)
            ->where('program_id', $programId)
            ->first();

        if (!$parentManager) {
            return false;
        }

        // If parent's manager is the child, we have a circular hierarchy
        if ($parentManager->parent_user_id === $childUserId) {
            return true;
        }

        // Recursively check the parent's manager
        return $this->checkCircularHierarchy(
            $parentManager->parent_user_id,
            $childUserId,
            $programId,
            $visited
        );
    }

    /**
     * Grant manager dashboard access to a user
     */
    private function grantManagerDashboardAccess($userId)
    {
        try {
            // Check if user already has manager_dashboard service
            $user = DB::table('users')->where('id', $userId)->first();
            
            if (!$user) {
                return;
            }

            // Decode services JSON
            $services = json_decode($user->services, true) ?? [];

            // Add manager_dashboard if not already present
            if (!in_array('manager_dashboard', $services)) {
                $services[] = 'manager_dashboard';
                
                DB::table('users')
                    ->where('id', $userId)
                    ->update([
                        'services' => json_encode($services),
                        'updated_at' => now()
                    ]);

                Log::info('Granted manager dashboard access', ['user_id' => $userId]);
            }
        } catch (\Exception $e) {
            Log::error('Error granting manager dashboard access: ' . $e->getMessage());
        }
    }

    /**
     * Revoke manager dashboard access from a user
     */
    private function revokeManagerDashboardAccess($userId)
    {
        try {
            $user = DB::table('users')->where('id', $userId)->first();
            
            if (!$user) {
                return;
            }

            // Decode services JSON
            $services = json_decode($user->services, true) ?? [];

            // Remove manager_dashboard
            $services = array_filter($services, function($service) {
                return $service !== 'manager_dashboard';
            });
            
            DB::table('users')
                ->where('id', $userId)
                ->update([
                    'services' => json_encode(array_values($services)),
                    'updated_at' => now()
                ]);

            Log::info('Revoked manager dashboard access', ['user_id' => $userId]);
        } catch (\Exception $e) {
            Log::error('Error revoking manager dashboard access: ' . $e->getMessage());
        }
    }

    /**
     * Get hierarchy for a specific program
     */
    public function getByProgram($programId)
    {
        try {
            $mappings = DB::table('hierarchy_mappings as hm')
                ->join('programs as p', 'hm.program_id', '=', 'p.id')
                ->join('users as parent_user', 'hm.parent_user_id', '=', 'parent_user.id')
                ->join('users as child_user', 'hm.child_user_id', '=', 'child_user.id')
                ->where('hm.program_id', $programId)
                ->select(
                    'hm.id',
                    'hm.program_id',
                    'p.name as program_name',
                    'hm.parent_role_id as parent_role_name',
                    'hm.parent_user_id',
                    'parent_user.username as parent_user_name',
                    'hm.child_role_id as child_role_name',
                    'hm.child_user_id',
                    'child_user.username as child_user_name',
                    'hm.created_at as mapped_at'
                )
                ->orderBy('hm.created_at', 'desc')
                ->get();

            return response()->json(['success' => true, 'data' => $mappings]);
        } catch (\Exception $e) {
            Log::error('Error fetching hierarchy mappings for program: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch hierarchy mappings',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
