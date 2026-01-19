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
            $organizationId = $request->query('organization_id', $user->organization_id);
            $programId = $request->query('program_id');
            $roleId = $request->query('role_id');
            $status = $request->query('status');
            $search = $request->query('search');
            
            $query = DB::table('evaluation_staff as es')
                ->leftJoin('evaluation_roles as er', 'es.role_id', '=', 'er.id')
                ->leftJoin('users as u', 'es.user_id', '=', 'u.id')
                ->where('es.organization_id', $organizationId)
                ->whereNull('es.deleted_at')
                ->select(
                    'es.*',
                    'er.name as role_name',
                    'er.code as role_code',
                    'u.name as user_name'
                );
            
            if ($programId) {
                $query->where(function($q) use ($programId) {
                    $q->where('es.program_id', $programId)
                      ->orWhereNull('es.program_id');
                });
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
                'organization_id' => 'required|uuid|exists:organizations,id',
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
            
            $staffId = Str::uuid()->toString();
            
            DB::table('evaluation_staff')->insert([
                'id' => $staffId,
                'employee_id' => $validated['employee_id'] ?? null,
                'name' => $validated['name'],
                'email' => $validated['email'],
                'role_id' => $validated['role_id'],
                'organization_id' => $validated['organization_id'],
                'program_id' => $validated['program_id'] ?? null,
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
            
            $this->logAudit('evaluation_staff', $staffId, 'created', 'Staff member created', $user, $validated['organization_id']);
            
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
            
            $this->logAudit('evaluation_staff', $id, 'updated', 'Staff member updated', $user, $staff->organization_id, $oldValues, $validated);
            
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
            
            $staff = DB::table('evaluation_staff')->where('id', $id)->whereNull('deleted_at')->first();
            
            if (!$staff) {
                return response()->json([
                    'success' => false,
                    'message' => 'Staff member not found'
                ], 404);
            }
            
            // Check if staff has evaluation assignments
            $assignmentCount = DB::table('evaluation_assignments')
                ->where(function($q) use ($id) {
                    $q->where('evaluatee_id', $id)
                      ->orWhere('evaluator_id', $id);
                })
                ->whereNull('deleted_at')
                ->count();
            
            if ($assignmentCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete staff member. They have {$assignmentCount} evaluation assignment(s)."
                ], 422);
            }
            
            // Soft delete
            DB::table('evaluation_staff')->where('id', $id)->update(['deleted_at' => now()]);
            
            // Also soft delete hierarchy relationships
            DB::table('evaluation_hierarchy')
                ->where(function($q) use ($id) {
                    $q->where('staff_id', $id)->orWhere('reports_to_id', $id);
                })
                ->update(['deleted_at' => now()]);
            
            $this->logAudit('evaluation_staff', $id, 'deleted', 'Staff member deleted', $user, $staff->organization_id);
            
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
