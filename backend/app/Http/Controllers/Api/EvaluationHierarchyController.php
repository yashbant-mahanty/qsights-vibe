<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EvaluationHierarchyController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            
            // Super-admin can view any program or all, others locked to their program
            if ($user->role === 'super-admin') {
                $programId = $request->query('program_id');
            } else {
                $programId = $user->program_id;
            }
            
            $staffId = $request->query('staff_id');
            
            $query = DB::table('evaluation_hierarchy as eh')
                ->join('evaluation_staff as staff', 'eh.staff_id', '=', 'staff.id')
                ->join('evaluation_staff as manager', 'eh.reports_to_id', '=', 'manager.id')
                ->join('evaluation_roles as staff_role', 'staff.role_id', '=', 'staff_role.id')
                ->join('evaluation_roles as manager_role', 'manager.role_id', '=', 'manager_role.id')
                ->whereNull('eh.deleted_at')
                ->select(
                    'eh.*',
                    'staff.name as staff_name',
                    'staff.email as staff_email',
                    'staff.employee_id as staff_employee_id',
                    'staff.department as staff_department',
                    'staff_role.name as staff_role_name',
                    'staff_role.category as staff_role_category',
                    'manager.name as manager_name',
                    'manager.email as manager_email',
                    'manager.employee_id as manager_employee_id',
                    'manager.department as manager_department',
                    'manager_role.name as manager_role_name',
                    'manager_role.category as manager_role_category'
                );
            
            if ($programId) {
                $query->where('eh.program_id', $programId);
            }
            
            if ($staffId) {
                $query->where(function($q) use ($staffId) {
                    $q->where('eh.staff_id', $staffId)
                      ->orWhere('eh.reports_to_id', $staffId);
                });
            }
            
            $hierarchies = $query->orderBy('staff.name')->get();
            
            return response()->json([
                'success' => true,
                'hierarchies' => $hierarchies
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch hierarchy: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function store(Request $request)
    {
        try {
            $user = $request->user();
            
            $validated = $request->validate([
                'staff_id' => 'required|uuid|exists:evaluation_staff,id',
                'reports_to_id' => 'required|uuid|exists:evaluation_staff,id|different:staff_id',
                'program_id' => 'nullable|uuid|exists:programs,id',
                'relationship_type' => 'nullable|in:direct,indirect,dotted_line,matrix',
                'relationship_title' => 'nullable|string|max:255',
                'notes' => 'nullable|string',
                'valid_from' => 'nullable|date',
                'valid_until' => 'nullable|date|after:valid_from',
                'is_active' => 'boolean',
                'is_primary' => 'boolean',
                'evaluation_weight' => 'nullable|integer|min:0|max:100'
            ]);
            
            // Determine program_id based on user role and staff members
            if ($user->role === 'super-admin') {
                $programId = $validated['program_id'] ?? null;
                
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
            } else {
                $programId = $user->program_id;
                
                if (!$programId) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You must be assigned to a program to create hierarchy relationships'
                    ], 403);
                }
            }
            
            // Check for circular reference
            if ($this->wouldCreateCircularReference($validated['staff_id'], $validated['reports_to_id'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot create this relationship as it would create a circular reference in the hierarchy.'
                ], 422);
            }
            
            // If this is a primary relationship, deactivate other primary relationships for this staff
            if ($validated['is_primary'] ?? false) {
                DB::table('evaluation_hierarchy')
                    ->where('staff_id', $validated['staff_id'])
                    ->where('is_primary', true)
                    ->whereNull('deleted_at')
                    ->update(['is_primary' => false]);
            }
            
            $hierarchyId = Str::uuid()->toString();
            
            DB::table('evaluation_hierarchy')->insert([
                'id' => $hierarchyId,
                'staff_id' => $validated['staff_id'],
                'reports_to_id' => $validated['reports_to_id'],
                'program_id' => $programId,
                'relationship_type' => $validated['relationship_type'] ?? 'direct',
                'relationship_title' => $validated['relationship_title'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'valid_from' => $validated['valid_from'] ?? null,
                'valid_until' => $validated['valid_until'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'is_primary' => $validated['is_primary'] ?? true,
                'evaluation_weight' => $validated['evaluation_weight'] ?? 100,
                'created_by' => $user->id,
                'updated_by' => $user->id,
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            $this->logAudit('evaluation_hierarchy', $hierarchyId, 'created', 'Hierarchy relationship created', $user, $programId);
            
            $hierarchy = DB::table('evaluation_hierarchy as eh')
                ->join('evaluation_staff as staff', 'eh.staff_id', '=', 'staff.id')
                ->join('evaluation_staff as manager', 'eh.reports_to_id', '=', 'manager.id')
                ->where('eh.id', $hierarchyId)
                ->select('eh.*', 'staff.name as staff_name', 'manager.name as manager_name')
                ->first();
            
            return response()->json([
                'success' => true,
                'message' => 'Hierarchy relationship created successfully',
                'hierarchy' => $hierarchy
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create hierarchy: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function update(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            $hierarchy = DB::table('evaluation_hierarchy')->where('id', $id)->whereNull('deleted_at')->first();
            
            if (!$hierarchy) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hierarchy relationship not found'
                ], 404);
            }
            
            $validated = $request->validate([
                'relationship_type' => 'nullable|in:direct,indirect,dotted_line,matrix',
                'relationship_title' => 'nullable|string|max:255',
                'notes' => 'nullable|string',
                'valid_from' => 'nullable|date',
                'valid_until' => 'nullable|date|after:valid_from',
                'is_active' => 'boolean',
                'is_primary' => 'boolean',
                'evaluation_weight' => 'nullable|integer|min:0|max:100'
            ]);
            
            // If setting as primary, deactivate other primary relationships
            if (isset($validated['is_primary']) && $validated['is_primary']) {
                DB::table('evaluation_hierarchy')
                    ->where('staff_id', $hierarchy->staff_id)
                    ->where('is_primary', true)
                    ->where('id', '!=', $id)
                    ->whereNull('deleted_at')
                    ->update(['is_primary' => false]);
            }
            
            $oldValues = (array) $hierarchy;
            
            $updateData = array_merge(
                $validated,
                [
                    'updated_by' => $user->id,
                    'updated_at' => now()
                ]
            );
            
            DB::table('evaluation_hierarchy')->where('id', $id)->update($updateData);
            
            $this->logAudit('evaluation_hierarchy', $id, 'updated', 'Hierarchy relationship updated', $user, $hierarchy->program_id, $oldValues, $validated);
            
            $updatedHierarchy = DB::table('evaluation_hierarchy')->where('id', $id)->first();
            
            return response()->json([
                'success' => true,
                'message' => 'Hierarchy relationship updated successfully',
                'hierarchy' => $updatedHierarchy
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update hierarchy: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function destroy(Request $request, $id)
    {
        // IMMEDIATE LOG - FIRST LINE
        file_put_contents('/tmp/hierarchy_delete.log', date('Y-m-d H:i:s') . " DESTROY ENTERED id=$id\n", FILE_APPEND);
        \Log::emergency('HIERARCHY DESTROY METHOD ENTERED', ['id' => $id, 'uri' => $request->getRequestUri()]);
        
        try {
            $user = $request->user();
            $cascadeParam = $request->query('cascade');
            $cascade = $cascadeParam === 'true' || $cascadeParam === true || $cascadeParam === '1' || $cascadeParam === 1;
            
            file_put_contents('/tmp/hierarchy_delete.log', date('Y-m-d H:i:s') . " cascade_param=$cascadeParam cascade_bool=" . ($cascade ? 'true' : 'false') . "\n", FILE_APPEND);
            \Log::emergency('HIERARCHY DESTROY CASCADE CHECK', [
                'id' => $id,
                'cascade_param' => $cascadeParam,
                'cascade_param_type' => gettype($cascadeParam),
                'cascade_bool' => $cascade,
                'all_query' => $request->query(),
                'full_url' => $request->fullUrl()
            ]);
            
            // If cascade=true, the $id is the evaluator_id (reports_to_id), delete all their subordinate relationships
            if ($cascade) {
                // First check if any relationships exist for this evaluator
                $relationships = DB::table('evaluation_hierarchy')
                    ->where('reports_to_id', $id)
                    ->whereNull('deleted_at')
                    ->get();
                
                if ($relationships->isEmpty()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No hierarchy relationships found for this evaluator'
                    ], 404);
                }
                
                $programId = $relationships->first()->program_id;
                $count = $relationships->count();
                
                // Soft delete all relationships for this evaluator
                DB::table('evaluation_hierarchy')
                    ->where('reports_to_id', $id)
                    ->whereNull('deleted_at')
                    ->update(['deleted_at' => now()]);
                
                $this->logAudit('evaluation_hierarchy', $id, 'bulk_deleted', "Deleted {$count} hierarchy relationships for evaluator", $user, $programId);
                
                return response()->json([
                    'success' => true,
                    'message' => "Successfully deleted {$count} hierarchy relationship(s)"
                ]);
            }
            
            // Regular single hierarchy delete by ID
            $hierarchy = DB::table('evaluation_hierarchy')->where('id', $id)->whereNull('deleted_at')->first();
            
            if (!$hierarchy) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hierarchy relationship not found'
                ], 404);
            }
            
            // Soft delete
            DB::table('evaluation_hierarchy')->where('id', $id)->update(['deleted_at' => now()]);
            
            $this->logAudit('evaluation_hierarchy', $id, 'deleted', 'Hierarchy relationship deleted', $user, $hierarchy->program_id);
            
            return response()->json([
                'success' => true,
                'message' => 'Hierarchy relationship deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete hierarchy: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get organization chart / hierarchy tree
     */
    public function getTree(Request $request)
    {
        try {
            $organizationId = $request->query('organization_id', $request->user()->organization_id);
            $programId = $request->query('program_id');
            
            // Get all active staff with their roles
            $staff = DB::table('evaluation_staff as es')
                ->join('evaluation_roles as er', 'es.role_id', '=', 'er.id')
                ->where('es.organization_id', $organizationId)
                ->where('es.status', 'active')
                ->whereNull('es.deleted_at')
                ->select('es.id', 'es.name', 'es.email', 'es.employee_id', 'er.name as role_name', 'er.hierarchy_level')
                ->get()
                ->keyBy('id');
            
            // Get all active hierarchy relationships
            $relationships = DB::table('evaluation_hierarchy')
                ->where('organization_id', $organizationId)
                ->where('is_active', true)
                ->where('is_primary', true)
                ->whereNull('deleted_at')
                ->get();
            
            // Build tree structure
            $tree = [];
            $childrenMap = [];
            
            foreach ($relationships as $rel) {
                if (!isset($childrenMap[$rel->reports_to_id])) {
                    $childrenMap[$rel->reports_to_id] = [];
                }
                $childrenMap[$rel->reports_to_id][] = $rel->staff_id;
            }
            
            // Find root nodes (staff who don't report to anyone)
            $rootIds = array_diff(array_keys($staff->toArray()), array_column($relationships->toArray(), 'staff_id'));
            
            // Build tree recursively
            foreach ($rootIds as $rootId) {
                $tree[] = $this->buildNode($rootId, $staff, $childrenMap);
            }
            
            return response()->json([
                'success' => true,
                'tree' => $tree,
                'total_staff' => count($staff),
                'total_relationships' => count($relationships)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to build hierarchy tree: ' . $e->getMessage()
            ], 500);
        }
    }
    
    private function buildNode($staffId, $allStaff, $childrenMap)
    {
        $staff = $allStaff[$staffId] ?? null;
        if (!$staff) return null;
        
        $node = [
            'id' => $staff->id,
            'name' => $staff->name,
            'email' => $staff->email,
            'employee_id' => $staff->employee_id,
            'role' => $staff->role_name,
            'children' => []
        ];
        
        if (isset($childrenMap[$staffId])) {
            foreach ($childrenMap[$staffId] as $childId) {
                $childNode = $this->buildNode($childId, $allStaff, $childrenMap);
                if ($childNode) {
                    $node['children'][] = $childNode;
                }
            }
        }
        
        return $node;
    }
    
    /**
     * Check if creating a relationship would create a circular reference
     */
    private function wouldCreateCircularReference($staffId, $managerId)
    {
        // Check if manager is already a subordinate (direct or indirect) of staff
        $currentManager = $managerId;
        $visited = [];
        $maxDepth = 100; // Prevent infinite loop
        $depth = 0;
        
        while ($currentManager && $depth < $maxDepth) {
            if ($currentManager === $staffId) {
                return true; // Circular reference found
            }
            
            if (in_array($currentManager, $visited)) {
                break; // Already visited this node
            }
            
            $visited[] = $currentManager;
            
            // Get this manager's manager
            $nextLevel = DB::table('evaluation_hierarchy')
                ->where('staff_id', $currentManager)
                ->where('is_active', true)
                ->where('is_primary', true)
                ->whereNull('deleted_at')
                ->value('reports_to_id');
            
            $currentManager = $nextLevel;
            $depth++;
        }
        
        return false;
    }
    
    private function logAudit($entityType, $entityId, $action, $description, $user, $programId = null, $oldValues = null, $newValues = null)
    {
        try {
            DB::table('evaluation_audit_log')->insert([
                'id' => Str::uuid()->toString(),
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'program_id' => $programId,
                'action' => $action,
                'action_description' => $description,
                'user_id' => $user->id,
                'user_name' => $user->name,
                'user_email' => $user->email,
                'old_values' => $oldValues ? json_encode($oldValues) : null,
                'new_values' => $newValues ? json_encode($newValues) : null,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'performed_at' => now(),
                'created_at' => now(),
                'updated_at' => now()
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to log audit: ' . $e->getMessage());
        }
    }
}
