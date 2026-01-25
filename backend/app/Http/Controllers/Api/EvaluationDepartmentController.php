<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EvaluationDepartmentController extends Controller
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
            
            $query = DB::table('evaluation_departments')
                ->where('is_active', true)
                ->whereNull('deleted_at');
            
            if ($programId) {
                $query->where('program_id', $programId);
            }
            
            $departments = $query->orderBy('name')->get();
            
            // Add role count for each department
            foreach ($departments as $dept) {
                $roleQuery = DB::table('evaluation_roles')
                    ->where('category', $dept->name)
                    ->whereNull('deleted_at');
                
                if ($dept->program_id) {
                    $roleQuery->where('program_id', $dept->program_id);
                }
                
                $dept->roles_count = $roleQuery->count();
            }
            
            return response()->json([
                'success' => true,
                'departments' => $departments
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch departments: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function store(Request $request)
    {
        try {
            $user = $request->user();
            
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'code' => 'nullable|string|max:50',
                'description' => 'nullable|string',
                'program_id' => 'nullable|uuid|exists:programs,id'
            ]);
            
            // Determine program_id based on user role
            if ($user->role === 'super-admin') {
                // Super-admin can specify program_id or leave it null (global)
                $programId = $validated['program_id'] ?? null;
            } else {
                // Other users must use their assigned program
                $programId = $user->program_id;
                
                if (!$programId) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You must be assigned to a program to create departments'
                    ], 403);
                }
            }
            
            // Check for duplicate name within the same program
            $duplicateQuery = DB::table('evaluation_departments')
                ->where('name', $validated['name'])
                ->whereNull('deleted_at');
            
            if ($programId) {
                $duplicateQuery->where('program_id', $programId);
            } else {
                $duplicateQuery->whereNull('program_id');
            }
            
            if ($duplicateQuery->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'A department with this name already exists in this program'
                ], 422);
            }
            
            $deptId = Str::uuid()->toString();
            
            DB::table('evaluation_departments')->insert([
                'id' => $deptId,
                'name' => $validated['name'],
                'code' => $validated['code'] ?? strtoupper(substr($validated['name'], 0, 3)),
                'description' => $validated['description'] ?? null,
                'program_id' => $programId,
                'is_active' => true,
                'created_by' => $user->id,
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            $department = DB::table('evaluation_departments')->where('id', $deptId)->first();
            
            return response()->json([
                'success' => true,
                'message' => 'Department created successfully',
                'department' => $department
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create department: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function update(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            $department = DB::table('evaluation_departments')
                ->where('id', $id)
                ->whereNull('deleted_at')
                ->first();
                
            if (!$department) {
                return response()->json([
                    'success' => false,
                    'message' => 'Department not found'
                ], 404);
            }
            
            $validated = $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'code' => 'nullable|string|max:50',
                'description' => 'nullable|string',
                'is_active' => 'boolean'
            ]);
            
            $validated['updated_at'] = now();
            
            DB::table('evaluation_departments')
                ->where('id', $id)
                ->update($validated);
            
            $updated = DB::table('evaluation_departments')->where('id', $id)->first();
            
            return response()->json([
                'success' => true,
                'message' => 'Department updated successfully',
                'department' => $updated
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update department: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function show(Request $request, $id)
    {
        try {
            $department = DB::table('evaluation_departments')
                ->where('id', $id)
                ->whereNull('deleted_at')
                ->first();
                
            if (!$department) {
                return response()->json([
                    'success' => false,
                    'message' => 'Department not found'
                ], 404);
            }
            
            // Get role count for this department
            $roleQuery = DB::table('evaluation_roles')
                ->where('category', $department->name)
                ->whereNull('deleted_at');
            
            if ($department->program_id) {
                $roleQuery->where('program_id', $department->program_id);
            }
            
            $department->roles_count = $roleQuery->count();
            
            return response()->json([
                'success' => true,
                'department' => $department
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch department: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function destroy(Request $request, $id)
    {
        try {
            $user = $request->user();
            $cascade = $request->query('cascade') === 'true';
            
            $department = DB::table('evaluation_departments')
                ->where('id', $id)
                ->whereNull('deleted_at')
                ->first();
                
            if (!$department) {
                return response()->json([
                    'success' => false,
                    'message' => 'Department not found'
                ], 404);
            }
            
            // Get all roles in this department
            $roleQuery = DB::table('evaluation_roles')
                ->where('category', $department->name)
                ->whereNull('deleted_at');
            
            if ($department->program_id) {
                $roleQuery->where('program_id', $department->program_id);
            }
            
            $roles = $roleQuery->get();
            $rolesCount = $roles->count();
                
            if ($rolesCount > 0 && !$cascade) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete department. It has {$rolesCount} role(s) assigned. Use cascade=true to delete all related data."
                ], 422);
            }
            
            // If cascade delete, delete all related data
            if ($cascade && $rolesCount > 0) {
                DB::beginTransaction();
                
                try {
                    $roleIds = $roles->pluck('id')->toArray();
                    
                    // Get all staff in these roles
                    $staffIds = DB::table('evaluation_staff')
                        ->whereIn('role_id', $roleIds)
                        ->whereNull('deleted_at')
                        ->pluck('id')
                        ->toArray();
                    
                    if (count($staffIds) > 0) {
                        // Delete hierarchy mappings where staff is involved
                        DB::table('evaluation_hierarchy')
                            ->where(function($q) use ($staffIds) {
                                $q->whereIn('staff_id', $staffIds)
                                  ->orWhereIn('reports_to_id', $staffIds);
                            })
                            ->update(['deleted_at' => now()]);
                        
                        // Delete evaluation assignments where staff is involved
                        DB::table('evaluation_assignments')
                            ->where(function($q) use ($staffIds) {
                                $q->whereIn('evaluatee_id', $staffIds)
                                  ->orWhereIn('evaluator_id', $staffIds);
                            })
                            ->whereNull('deleted_at')
                            ->update(['deleted_at' => now()]);
                        
                        // Delete staff
                        DB::table('evaluation_staff')
                            ->whereIn('id', $staffIds)
                            ->update(['deleted_at' => now()]);
                    }
                    
                    // Delete roles
                    DB::table('evaluation_roles')
                        ->whereIn('id', $roleIds)
                        ->update(['deleted_at' => now()]);
                    
                    // Delete department
                    DB::table('evaluation_departments')
                        ->where('id', $id)
                        ->update(['deleted_at' => now()]);
                    
                    $this->logAudit('evaluation_department', $id, 'deleted_cascade', 'Department deleted with cascade (roles: ' . count($roleIds) . ', staff: ' . count($staffIds) . ')', $user, $department->program_id);
                    
                    DB::commit();
                    
                    return response()->json([
                        'success' => true,
                        'message' => 'Department and all related data deleted successfully'
                    ]);
                } catch (\Exception $e) {
                    DB::rollBack();
                    throw $e;
                }
            }
            
            // Simple delete (no dependencies)
            DB::table('evaluation_departments')
                ->where('id', $id)
                ->update(['deleted_at' => now()]);
            
            $this->logAudit('evaluation_department', $id, 'deleted', 'Department deleted', $user, $department->program_id);
            
            return response()->json([
                'success' => true,
                'message' => 'Department deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete department: ' . $e->getMessage()
            ], 500);
        }
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
