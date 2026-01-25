<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EvaluationRoleController extends Controller
{
    /**
     * Get all evaluation roles for an organization
     */
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
            
            $query = DB::table('evaluation_roles')
                ->whereNull('deleted_at');
            
            if ($programId) {
                $query->where('program_id', $programId);
            }
            
            $roles = $query->orderBy('hierarchy_level')
                ->orderBy('name')
                ->get();
            
            return response()->json([
                'success' => true,
                'roles' => $roles
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch roles: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get a single role
     */
    public function show(Request $request, $id)
    {
        try {
            $role = DB::table('evaluation_roles')
                ->where('id', $id)
                ->whereNull('deleted_at')
                ->first();
            
            if (!$role) {
                return response()->json([
                    'success' => false,
                    'message' => 'Role not found'
                ], 404);
            }
            
            // Get staff count for this role
            $staffCount = DB::table('evaluation_staff')
                ->where('role_id', $id)
                ->whereNull('deleted_at')
                ->count();
            
            $role->staff_count = $staffCount;
            
            return response()->json([
                'success' => true,
                'role' => $role
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch role: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Create a new role
     */
    public function store(Request $request)
    {
        try {
            $user = $request->user();
            
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'code' => 'nullable|string|max:50',
                'description' => 'nullable|string',
                'program_id' => 'nullable|uuid|exists:programs,id',
                'hierarchy_level' => 'nullable|integer|min:0',
                'category' => 'nullable|string|max:255',
                'is_active' => 'boolean'
            ]);
            
            // Determine program_id based on user role
            if ($user->role === 'super-admin') {
                $programId = $validated['program_id'] ?? null;
            } else {
                $programId = $user->program_id;
                
                if (!$programId) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You must be assigned to a program to create roles'
                    ], 403);
                }
            }
            
            // Generate code if not provided
            if (empty($validated['code'])) {
                $validated['code'] = strtoupper(substr($validated['name'], 0, 3));
            }
            
            // Check for duplicate code within the same program
            $duplicateQuery = DB::table('evaluation_roles')
                ->where('code', $validated['code'])
                ->whereNull('deleted_at');
            
            if ($programId) {
                $duplicateQuery->where('program_id', $programId);
            } else {
                $duplicateQuery->whereNull('program_id');
            }
            
            if ($duplicateQuery->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'A role with this code already exists in this program'
                ], 422);
            }
            
            $roleId = Str::uuid()->toString();
            
            DB::table('evaluation_roles')->insert([
                'id' => $roleId,
                'name' => $validated['name'],
                'code' => $validated['code'],
                'description' => $validated['description'] ?? null,
                'program_id' => $programId,
                'hierarchy_level' => $validated['hierarchy_level'] ?? 0,
                'category' => $validated['category'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'created_by' => $user->id,
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            // Log the action
            $this->logAudit('evaluation_role', $roleId, 'created', 'Role created', $user, $programId);
            
            $role = DB::table('evaluation_roles')->where('id', $roleId)->first();
            
            return response()->json([
                'success' => true,
                'message' => 'Role created successfully',
                'role' => $role
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create role: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Update a role
     */
    public function update(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            $role = DB::table('evaluation_roles')
                ->where('id', $id)
                ->whereNull('deleted_at')
                ->first();
            
            if (!$role) {
                return response()->json([
                    'success' => false,
                    'message' => 'Role not found'
                ], 404);
            }
            
            $validated = $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'code' => 'sometimes|required|string|max:50',
                'description' => 'nullable|string',
                'hierarchy_level' => 'nullable|integer|min:0',
                'category' => 'nullable|string|max:255',
                'is_active' => 'boolean'
            ]);
            
            // Check for duplicate code if code is being changed
            if (isset($validated['code']) && $validated['code'] !== $role->code) {
                $duplicateQuery = DB::table('evaluation_roles')
                    ->where('code', $validated['code'])
                    ->where('id', '!=', $id)
                    ->whereNull('deleted_at');
                
                if ($role->program_id) {
                    $duplicateQuery->where('program_id', $role->program_id);
                } else {
                    $duplicateQuery->whereNull('program_id');
                }
                
                if ($duplicateQuery->exists()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'A role with this code already exists in this program'
                    ], 422);
                }
            }
            
            $oldValues = (array) $role;
            
            $updateData = array_merge(
                $validated,
                ['updated_at' => now()]
            );
            
            DB::table('evaluation_roles')
                ->where('id', $id)
                ->update($updateData);
            
            // Log the action
            $this->logAudit('evaluation_role', $id, 'updated', 'Role updated', $user, $role->program_id, $oldValues, $validated);
            
            $updatedRole = DB::table('evaluation_roles')->where('id', $id)->first();
            
            return response()->json([
                'success' => true,
                'message' => 'Role updated successfully',
                'role' => $updatedRole
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update role: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Delete a role
     */
    public function destroy(Request $request, $id)
    {
        try {
            $user = $request->user();
            $cascade = $request->input('cascade') === 'true' || $request->query('cascade') === 'true';
            
            $role = DB::table('evaluation_roles')
                ->where('id', $id)
                ->whereNull('deleted_at')
                ->first();
            
            if (!$role) {
                return response()->json([
                    'success' => false,
                    'message' => 'Role not found'
                ], 404);
            }
            
            // Get all staff with this role
            $staff = DB::table('evaluation_staff')
                ->where('role_id', $id)
                ->whereNull('deleted_at')
                ->get();
            
            $staffCount = $staff->count();
            
            if ($staffCount > 0 && !$cascade) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete role. It is assigned to {$staffCount} staff member(s). Use cascade=true to delete all related data.",
                    'cascade_received' => $request->query('cascade'),
                    'cascade_value' => $cascade
                ], 422);
            }
            
            // If cascade delete, delete all related data
            if ($cascade && $staffCount > 0) {
                DB::beginTransaction();
                
                try {
                    $staffIds = $staff->pluck('id')->toArray();
                    
                    \Log::info('[DELETE ROLE CASCADE] Starting', [
                        'role_id' => $id,
                        'staff_count' => count($staffIds),
                        'staff_ids' => $staffIds
                    ]);
                    
                    // Delete hierarchy mappings where staff is involved
                    $hierarchyDeleted = DB::table('evaluation_hierarchy')
                        ->where(function($q) use ($staffIds) {
                            $q->whereIn('staff_id', $staffIds)
                              ->orWhereIn('reports_to_id', $staffIds);
                        })
                        ->update(['deleted_at' => now()]);
                    
                    \Log::info('[DELETE ROLE CASCADE] Hierarchy deleted', ['count' => $hierarchyDeleted]);
                    
                    // Delete evaluation assignments where staff is involved
                    $assignmentsDeleted = DB::table('evaluation_assignments')
                        ->where(function($q) use ($staffIds) {
                            $q->whereIn('evaluatee_id', $staffIds)
                              ->orWhereIn('evaluator_id', $staffIds);
                        })
                        ->whereNull('deleted_at')
                        ->update(['deleted_at' => now()]);
                    
                    \Log::info('[DELETE ROLE CASCADE] Assignments deleted', ['count' => $assignmentsDeleted]);
                    
                    // Delete staff
                    $staffDeleted = DB::table('evaluation_staff')
                        ->whereIn('id', $staffIds)
                        ->update(['deleted_at' => now()]);
                    
                    \Log::info('[DELETE ROLE CASCADE] Staff deleted', ['count' => $staffDeleted]);
                    
                    // Delete role
                    $roleDeleted = DB::table('evaluation_roles')
                        ->where('id', $id)
                        ->update(['deleted_at' => now()]);
                    
                    \Log::info('[DELETE ROLE CASCADE] Role deleted', ['count' => $roleDeleted]);
                    
                    DB::commit();
                    
                    \Log::info('[DELETE ROLE CASCADE] Transaction committed');
                    
                    // Log audit AFTER transaction completes
                    $this->logAudit('evaluation_role', $id, 'deleted_cascade', 'Role deleted with cascade (staff: ' . count($staffIds) . ')', $user, $role->program_id);
                    
                    return response()->json([
                        'success' => true,
                        'message' => 'Role and all related data deleted successfully'
                    ]);
                } catch (\Exception $e) {
                    DB::rollBack();
                    \Log::error('[DELETE ROLE CASCADE] Transaction rolled back', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                    throw $e;
                }
            }
            
            // Simple delete (no dependencies)
            DB::table('evaluation_roles')
                ->where('id', $id)
                ->update(['deleted_at' => now()]);
            
            // Log the action
            $this->logAudit('evaluation_role', $id, 'deleted', 'Role deleted', $user, $role->program_id);
            
            return response()->json([
                'success' => true,
                'message' => 'Role deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete role: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Log audit trail
     */
    private function logAudit($entityType, $entityId, $action, $description, $user, $programId = null, $oldValues = null, $newValues = null)
    {
        try {
            DB::table('evaluation_audit_log')->insert([
                'id' => Str::uuid()->toString(),
                'entity_type' => $entityType,
                'entity_id' => $entityId,
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
