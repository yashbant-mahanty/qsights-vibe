<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EvaluationStaffController extends Controller
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
            
            $roleId = $request->query('role_id');
            $status = $request->query('status');
            $search = $request->query('search');
            
            $query = DB::table('evaluation_staff as es')
                ->leftJoin('evaluation_roles as er', 'es.role_id', '=', 'er.id')
                ->leftJoin('users as u', 'es.user_id', '=', 'u.id')
                ->whereNull('es.deleted_at')
                ->select(
                    'es.*',
                    'er.name as role_name',
                    'er.code as role_code',
                    'u.name as user_name'
                );
            
            if ($programId) {
                $query->where('es.program_id', $programId);
            }
            
            if ($roleId) {
                $query->where('es.role_id', $roleId);
            }
            
            if ($status) {
                $query->where('es.status', $status);
            }
            
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('es.name', 'ilike', "%{$search}%")
                      ->orWhere('es.email', 'ilike', "%{$search}%")
                      ->orWhere('es.employee_id', 'ilike', "%{$search}%");
                });
            }
            
            $staff = $query->orderBy('es.name')->get();
            
            // Get hierarchy information for each staff
            foreach ($staff as $member) {
                $member->reports_to = DB::table('evaluation_hierarchy as eh')
                    ->join('evaluation_staff as es', 'eh.reports_to_id', '=', 'es.id')
                    ->where('eh.staff_id', $member->id)
                    ->where('eh.is_active', true)
                    ->whereNull('eh.deleted_at')
                    ->select('es.id', 'es.name', 'es.email', 'eh.relationship_type')
                    ->get();
                
                $member->subordinates_count = DB::table('evaluation_hierarchy')
                    ->where('reports_to_id', $member->id)
                    ->where('is_active', true)
                    ->whereNull('deleted_at')
                    ->count();
            }
            
            return response()->json([
                'success' => true,
                'staff' => $staff
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch staff: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function show(Request $request, $id)
    {
        try {
            $staff = DB::table('evaluation_staff as es')
                ->leftJoin('evaluation_roles as er', 'es.role_id', '=', 'er.id')
                ->leftJoin('users as u', 'es.user_id', '=', 'u.id')
                ->where('es.id', $id)
                ->whereNull('es.deleted_at')
                ->select('es.*', 'er.name as role_name', 'er.code as role_code', 'u.name as user_name')
                ->first();
            
            if (!$staff) {
                return response()->json([
                    'success' => false,
                    'message' => 'Staff member not found'
                ], 404);
            }
            
            // Get reporting relationships
            $staff->reports_to = DB::table('evaluation_hierarchy as eh')
                ->join('evaluation_staff as es', 'eh.reports_to_id', '=', 'es.id')
                ->join('evaluation_roles as er', 'es.role_id', '=', 'er.id')
                ->where('eh.staff_id', $id)
                ->where('eh.is_active', true)
                ->whereNull('eh.deleted_at')
                ->select(
                    'es.id', 'es.name', 'es.email', 'es.employee_id',
                    'er.name as role_name',
                    'eh.relationship_type', 'eh.is_primary'
                )
                ->get();
            
            $staff->subordinates = DB::table('evaluation_hierarchy as eh')
                ->join('evaluation_staff as es', 'eh.staff_id', '=', 'es.id')
                ->join('evaluation_roles as er', 'es.role_id', '=', 'er.id')
                ->where('eh.reports_to_id', $id)
                ->where('eh.is_active', true)
                ->whereNull('eh.deleted_at')
                ->select(
                    'es.id', 'es.name', 'es.email', 'es.employee_id',
                    'er.name as role_name',
                    'eh.relationship_type', 'eh.is_primary'
                )
                ->get();
            
            return response()->json([
                'success' => true,
                'staff' => $staff
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch staff: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function store(Request $request)
    {
        try {
            $user = $request->user();
            
            $validated = $request->validate([
                'employee_id' => 'nullable|string|max:255',
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:evaluation_staff,email',
                'role_id' => 'required|uuid|exists:evaluation_roles,id',
                'program_id' => 'nullable|uuid|exists:programs,id',
                'user_id' => 'nullable|uuid|exists:users,id',
                'department' => 'nullable|string|max:255',
                'team' => 'nullable|string|max:255',
                'location' => 'nullable|string|max:255',
                'office' => 'nullable|string|max:255',
                'joining_date' => 'nullable|date',
                'employment_type' => 'nullable|in:full_time,part_time,contract,intern',
                'phone' => 'nullable|string|max:50',
                'mobile' => 'nullable|string|max:50',
                'status' => 'nullable|in:active,inactive,on_leave,terminated',
                'metadata' => 'nullable|array'
            ]);
            
            // Determine program_id based on user role
            if ($user->role === 'super-admin') {
                $programId = $validated['program_id'] ?? null;
            } else {
                $programId = $user->program_id;
                
                if (!$programId) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You must be assigned to a program to create staff'
                    ], 403);
                }
            }
            
            $staffId = Str::uuid()->toString();
            
            DB::table('evaluation_staff')->insert([
                'id' => $staffId,
                'employee_id' => $validated['employee_id'] ?? null,
                'name' => $validated['name'],
                'email' => $validated['email'],
                'role_id' => $validated['role_id'],
                'program_id' => $programId,
                'user_id' => $validated['user_id'] ?? null,
                'department' => $validated['department'] ?? null,
                'team' => $validated['team'] ?? null,
                'location' => $validated['location'] ?? null,
                'office' => $validated['office'] ?? null,
                'joining_date' => $validated['joining_date'] ?? null,
                'employment_type' => $validated['employment_type'] ?? 'full_time',
                'phone' => $validated['phone'] ?? null,
                'mobile' => $validated['mobile'] ?? null,
                'status' => $validated['status'] ?? 'active',
                'is_available_for_evaluation' => true,
                'metadata' => isset($validated['metadata']) ? json_encode($validated['metadata']) : null,
                'created_by' => $user->id,
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            $this->logAudit('evaluation_staff', $staffId, 'created', 'Staff member created', $user, $programId);
            
            $staff = DB::table('evaluation_staff')->where('id', $staffId)->first();
            
            return response()->json([
                'success' => true,
                'message' => 'Staff member created successfully',
                'staff' => $staff
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create staff member: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function update(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            $staff = DB::table('evaluation_staff')->where('id', $id)->whereNull('deleted_at')->first();
            
            if (!$staff) {
                return response()->json([
                    'success' => false,
                    'message' => 'Staff member not found'
                ], 404);
            }
            
            $validated = $request->validate([
                'employee_id' => 'nullable|string|max:255',
                'name' => 'sometimes|required|string|max:255',
                'email' => 'sometimes|required|email|unique:evaluation_staff,email,' . $id,
                'role_id' => 'sometimes|required|uuid|exists:evaluation_roles,id',
                'department' => 'nullable|string|max:255',
                'team' => 'nullable|string|max:255',
                'location' => 'nullable|string|max:255',
                'office' => 'nullable|string|max:255',
                'joining_date' => 'nullable|date',
                'leaving_date' => 'nullable|date',
                'employment_type' => 'nullable|in:full_time,part_time,contract,intern',
                'phone' => 'nullable|string|max:50',
                'mobile' => 'nullable|string|max:50',
                'status' => 'nullable|in:active,inactive,on_leave,terminated',
                'is_available_for_evaluation' => 'boolean',
                'metadata' => 'nullable|array'
            ]);
            
            if (isset($validated['metadata'])) {
                $validated['metadata'] = json_encode($validated['metadata']);
            }
            
            $oldValues = (array) $staff;
            
            $updateData = array_merge($validated, ['updated_at' => now()]);
            
            DB::table('evaluation_staff')->where('id', $id)->update($updateData);
            
            $this->logAudit('evaluation_staff', $id, 'updated', 'Staff member updated', $user, $staff->program_id, $oldValues, $validated);
            
            $updatedStaff = DB::table('evaluation_staff')->where('id', $id)->first();
            
            return response()->json([
                'success' => true,
                'message' => 'Staff member updated successfully',
                'staff' => $updatedStaff
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update staff member: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function destroy(Request $request, $id)
    {
        try {
            $user = $request->user();
            $cascade = $request->query('cascade') === 'true';
            
            $staff = DB::table('evaluation_staff')->where('id', $id)->whereNull('deleted_at')->first();
            
            if (!$staff) {
                return response()->json([
                    'success' => false,
                    'message' => 'Staff member not found'
                ], 404);
            }
            
            // Check if staff has evaluation assignments or hierarchy relationships
            $assignmentCount = DB::table('evaluation_assignments')
                ->where(function($q) use ($id) {
                    $q->where('evaluatee_id', $id)
                      ->orWhere('evaluator_id', $id);
                })
                ->whereNull('deleted_at')
                ->count();
            
            $hierarchyCount = DB::table('evaluation_hierarchy')
                ->where(function($q) use ($id) {
                    $q->where('staff_id', $id)
                      ->orWhere('reports_to_id', $id);
                })
                ->whereNull('deleted_at')
                ->count();
            
            if (($assignmentCount > 0 || $hierarchyCount > 0) && !$cascade) {
                $message = "Cannot delete staff member. They have ";
                $parts = [];
                if ($assignmentCount > 0) {
                    $parts[] = "{$assignmentCount} evaluation assignment(s)";
                }
                if ($hierarchyCount > 0) {
                    $parts[] = "{$hierarchyCount} hierarchy relationship(s)";
                }
                $message .= implode(' and ', $parts) . '. Use cascade=true to delete all related data.';
                
                return response()->json([
                    'success' => false,
                    'message' => $message
                ], 422);
            }
            
            // If cascade delete, delete all related data
            if ($cascade && ($assignmentCount > 0 || $hierarchyCount > 0)) {
                DB::beginTransaction();
                
                try {
                    // Delete hierarchy relationships
                    DB::table('evaluation_hierarchy')
                        ->where(function($q) use ($id) {
                            $q->where('staff_id', $id)
                              ->orWhere('reports_to_id', $id);
                        })
                        ->update(['deleted_at' => now()]);
                    
                    // Delete evaluation assignments
                    DB::table('evaluation_assignments')
                        ->where(function($q) use ($id) {
                            $q->where('evaluatee_id', $id)
                              ->orWhere('evaluator_id', $id);
                        })
                        ->whereNull('deleted_at')
                        ->update(['deleted_at' => now()]);
                    
                    // Delete staff
                    DB::table('evaluation_staff')->where('id', $id)->update(['deleted_at' => now()]);
                    
                    $this->logAudit('evaluation_staff', $id, 'deleted_cascade', 'Staff member deleted with cascade (assignments: ' . $assignmentCount . ', hierarchy: ' . $hierarchyCount . ')', $user, $staff->program_id);
                    
                    DB::commit();
                    
                    return response()->json([
                        'success' => true,
                        'message' => 'Staff member and all related data deleted successfully'
                    ]);
                } catch (\Exception $e) {
                    DB::rollBack();
                    throw $e;
                }
            }
            
            // Simple delete (no dependencies)
            DB::table('evaluation_staff')->where('id', $id)->update(['deleted_at' => now()]);
            
            $this->logAudit('evaluation_staff', $id, 'deleted', 'Staff member deleted', $user, $staff->program_id);
            
            return response()->json([
                'success' => true,
                'message' => 'Staff member deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete staff member: ' . $e->getMessage()
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
