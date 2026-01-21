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
            $organizationId = $request->query('organization_id', $user->organization_id);
            
            $departments = DB::table('evaluation_departments')
                ->where('organization_id', $organizationId)
                ->where('is_active', true)
                ->whereNull('deleted_at')
                ->orderBy('name')
                ->get();
            
            // Add role count for each department
            foreach ($departments as $dept) {
                $dept->roles_count = DB::table('evaluation_roles')
                    ->where('category', $dept->name)
                    ->where('organization_id', $organizationId)
                    ->whereNull('deleted_at')
                    ->count();
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
                'organization_id' => 'required|uuid'
            ]);
            
            // Check for duplicate name
            $exists = DB::table('evaluation_departments')
                ->where('organization_id', $validated['organization_id'])
                ->where('name', $validated['name'])
                ->whereNull('deleted_at')
                ->exists();
                
            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'A department with this name already exists'
                ], 422);
            }
            
            $deptId = Str::uuid()->toString();
            
            DB::table('evaluation_departments')->insert([
                'id' => $deptId,
                'name' => $validated['name'],
                'code' => $validated['code'] ?? strtoupper(substr($validated['name'], 0, 3)),
                'description' => $validated['description'] ?? null,
                'organization_id' => $validated['organization_id'],
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
    
    public function destroy(Request $request, $id)
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
            
            // Check if department has roles
            $rolesCount = DB::table('evaluation_roles')
                ->where('category', $department->name)
                ->where('organization_id', $department->organization_id)
                ->whereNull('deleted_at')
                ->count();
                
            if ($rolesCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete department. It has {$rolesCount} role(s) assigned."
                ], 422);
            }
            
            // Soft delete
            DB::table('evaluation_departments')
                ->where('id', $id)
                ->update(['deleted_at' => now()]);
            
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
}
