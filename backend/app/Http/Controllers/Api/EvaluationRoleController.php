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
            $organizationId = $request->query('organization_id', $user->organization_id);
            $programId = $request->query('program_id');
            
            $query = DB::table('evaluation_roles')
                ->where('organization_id', $organizationId)
                ->whereNull('deleted_at');
            
            if ($programId) {
                $query->where(function($q) use ($programId) {
                    $q->where('program_id', $programId)
                      ->orWhereNull('program_id');
                });
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
                'organization_id' => 'required|uuid|exists:organizations,id',
                'program_id' => 'nullable|uuid|exists:programs,id',
                'hierarchy_level' => 'nullable|integer|min:0',
                'category' => 'nullable|string|max:255',
                'is_active' => 'boolean'
            ]);
            
            // Generate code if not provided
            if (empty($validated['code'])) {
                $validated['code'] = strtoupper(substr($validated['name'], 0, 3));
            }
            
            // Check for duplicate code
            $existingCode = DB::table('evaluation_roles')
                ->where('organization_id', $validated['organization_id'])
                ->where('code', $validated['code'])
                ->whereNull('deleted_at')
                ->exists();
            
            if ($existingCode) {
                return response()->json([
                    'success' => false,
                    'message' => 'A role with this code already exists'
                ], 422);
            }
            
            $roleId = Str::uuid()->toString();
            
            DB::table('evaluation_roles')->insert([
                'id' => $roleId,
                'name' => $validated['name'],
                'code' => $validated['code'],
                'description' => $validated['description'] ?? null,
                'organization_id' => $validated['organization_id'],
                'program_id' => $validated['program_id'] ?? null,
                'hierarchy_level' => $validated['hierarchy_level'] ?? 0,
                'category' => $validated['category'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'created_by' => $user->id,
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            // Log the action
            $this->logAudit('evaluation_role', $roleId, 'created', 'Role created', $user, $validated['organization_id']);
            
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
                $existingCode = DB::table('evaluation_roles')
                    ->where('organization_id', $role->organization_id)
                    ->where('code', $validated['code'])
                    ->where('id', '!=', $id)
                    ->whereNull('deleted_at')
                    ->exists();
                
                if ($existingCode) {
                    return response()->json([
                        'success' => false,
                        'message' => 'A role with this code already exists'
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
            $this->logAudit('evaluation_role', $id, 'updated', 'Role updated', $user, $role->organization_id, $oldValues, $validated);
            
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
            
            // Check if role is in use
            $staffCount = DB::table('evaluation_staff')
                ->where('role_id', $id)
                ->whereNull('deleted_at')
                ->count();
            
            if ($staffCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete role. It is assigned to {$staffCount} staff member(s)."
                ], 422);
            }
            
            // Soft delete
            DB::table('evaluation_roles')
                ->where('id', $id)
                ->update([
                    'deleted_at' => now()
                ]);
            
            // Log the action
            $this->logAudit('evaluation_role', $id, 'deleted', 'Role deleted', $user, $role->organization_id);
            
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
    private function logAudit($entityType, $entityId, $action, $description, $user, $organizationId, $oldValues = null, $newValues = null)
    {
        try {
            DB::table('evaluation_audit_log')->insert([
                'id' => Str::uuid()->toString(),
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'organization_id' => $organizationId,
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
