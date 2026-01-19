<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class HierarchyMappingController extends Controller
{
    /**
     * Get all hierarchy mappings
     */
    public function index(Request $request)
    {
        try {
            $mappings = DB::table('hierarchy_mappings')
                ->join('programs', 'hierarchy_mappings.program_id', '=', 'programs.id')
                ->join('program_roles as parent_users', 'hierarchy_mappings.parent_user_id', '=', 'parent_users.id')
                ->join('program_roles as child_users', 'hierarchy_mappings.child_user_id', '=', 'child_users.id')
                ->select(
                    'hierarchy_mappings.id',
                    'hierarchy_mappings.program_id',
                    'programs.name as program_name',
                    'hierarchy_mappings.parent_role_id',
                    'hierarchy_mappings.parent_user_id',
                    'parent_users.username as parent_user_name',
                    'parent_users.email as parent_user_email',
                    'hierarchy_mappings.child_role_id',
                    'hierarchy_mappings.child_user_id',
                    'child_users.username as child_user_name',
                    'child_users.email as child_user_email',
                    'hierarchy_mappings.mapped_at',
                    DB::raw("hierarchy_mappings.parent_role_id as parent_role_name"),
                    DB::raw("hierarchy_mappings.child_role_id as child_role_name")
                )
                ->orderBy('hierarchy_mappings.mapped_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'mappings' => $mappings
            ], 200);
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
            $validated = $request->validate([
                'program_id' => 'required|uuid|exists:programs,id',
                'parent_role_id' => 'required|string',
                'parent_user_id' => 'required|uuid|exists:program_roles,id',
                'child_role_id' => 'required|string',
                'child_user_id' => 'required|uuid|exists:program_roles,id'
            ]);

            // Validate: Parent and child must be in the same program
            $parentUser = DB::table('program_roles')->where('id', $validated['parent_user_id'])->first();
            $childUser = DB::table('program_roles')->where('id', $validated['child_user_id'])->first();

            if (!$parentUser || !$childUser) {
                return response()->json([
                    'success' => false,
                    'message' => 'Parent or child user not found'
                ], 404);
            }

            if ($parentUser->program_id !== $validated['program_id'] || $childUser->program_id !== $validated['program_id']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Parent and child must be in the same program'
                ], 422);
            }

            // Validate: Child cannot be the same as parent
            if ($validated['parent_user_id'] === $validated['child_user_id']) {
                return response()->json([
                    'success' => false,
                    'message' => 'A user cannot report to themselves'
                ], 422);
            }

            // Validate: Check for circular hierarchy (child cannot already be a parent of the parent)
            $circular = $this->checkCircularHierarchy($validated['parent_user_id'], $validated['child_user_id']);
            if ($circular) {
                return response()->json([
                    'success' => false,
                    'message' => 'This mapping would create a circular hierarchy'
                ], 422);
            }

            // Check if child already has a manager in this program
            $existingMapping = DB::table('hierarchy_mappings')
                ->where('child_user_id', $validated['child_user_id'])
                ->where('program_id', $validated['program_id'])
                ->first();

            if ($existingMapping) {
                // Update existing mapping
                DB::table('hierarchy_mappings')
                    ->where('id', $existingMapping->id)
                    ->update([
                        'parent_role_id' => $validated['parent_role_id'],
                        'parent_user_id' => $validated['parent_user_id'],
                        'child_role_id' => $validated['child_role_id'],
                        'mapped_at' => now()
                    ]);

                $mappingId = $existingMapping->id;
            } else {
                // Create new mapping
                $mappingId = Str::uuid();
                DB::table('hierarchy_mappings')->insert([
                    'id' => $mappingId,
                    'program_id' => $validated['program_id'],
                    'parent_role_id' => $validated['parent_role_id'],
                    'parent_user_id' => $validated['parent_user_id'],
                    'child_role_id' => $validated['child_role_id'],
                    'child_user_id' => $validated['child_user_id'],
                    'mapped_at' => now()
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Hierarchy mapping created successfully',
                'mapping_id' => $mappingId
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
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
            $deleted = DB::table('hierarchy_mappings')
                ->where('id', $id)
                ->delete();

            if (!$deleted) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hierarchy mapping not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Hierarchy mapping deleted successfully'
            ], 200);
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
     * Get hierarchy tree for a program
     */
    public function getHierarchyTree($programId)
    {
        try {
            $mappings = DB::table('hierarchy_mappings')
                ->where('program_id', $programId)
                ->get();

            // Build tree structure
            $tree = $this->buildHierarchyTree($mappings);

            return response()->json([
                'success' => true,
                'tree' => $tree
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching hierarchy tree: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch hierarchy tree',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check for circular hierarchy
     */
    private function checkCircularHierarchy($parentUserId, $childUserId, $visited = [])
    {
        // If we've already visited this user, we have a cycle
        if (in_array($childUserId, $visited)) {
            return true;
        }

        // Add current user to visited list
        $visited[] = $childUserId;

        // Get the parent of the child
        $childAsParent = DB::table('hierarchy_mappings')
            ->where('parent_user_id', $childUserId)
            ->pluck('child_user_id');

        foreach ($childAsParent as $grandchild) {
            // If any grandchild is the original parent, we have a cycle
            if ($grandchild === $parentUserId) {
                return true;
            }

            // Recursively check grandchildren
            if ($this->checkCircularHierarchy($parentUserId, $grandchild, $visited)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Build hierarchy tree from flat mappings
     */
    private function buildHierarchyTree($mappings)
    {
        $tree = [];
        $childMap = [];

        // Create a map of parent -> children
        foreach ($mappings as $mapping) {
            if (!isset($childMap[$mapping->parent_user_id])) {
                $childMap[$mapping->parent_user_id] = [];
            }
            $childMap[$mapping->parent_user_id][] = $mapping->child_user_id;
        }

        // Find root nodes (users who are not children of anyone)
        $allChildren = [];
        foreach ($mappings as $mapping) {
            $allChildren[] = $mapping->child_user_id;
        }

        $roots = [];
        foreach ($mappings as $mapping) {
            if (!in_array($mapping->parent_user_id, $allChildren)) {
                $roots[] = $mapping->parent_user_id;
            }
        }

        // Build tree for each root
        foreach ($roots as $root) {
            $tree[] = $this->buildNode($root, $childMap, $mappings);
        }

        return $tree;
    }

    /**
     * Build a single node in the hierarchy tree
     */
    private function buildNode($userId, $childMap, $mappings)
    {
        $user = DB::table('program_roles')->where('id', $userId)->first();
        
        $node = [
            'id' => $userId,
            'username' => $user->username ?? 'Unknown',
            'email' => $user->email ?? '',
            'role' => $user->role ?? 'Unknown',
            'children' => []
        ];

        if (isset($childMap[$userId])) {
            foreach ($childMap[$userId] as $childId) {
                $node['children'][] = $this->buildNode($childId, $childMap, $mappings);
            }
        }

        return $node;
    }
}
