<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use App\Models\User;
use App\Models\SystemSetting;

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
            
            // Check if email already exists in evaluation_staff table (only non-deleted records)
            $existingStaff = DB::table('evaluation_staff')
                ->where('email', $request->input('email'))
                ->whereNull('deleted_at')
                ->first();
            
            if ($existingStaff) {
                return response()->json([
                    'success' => false,
                    'message' => 'A staff member with this email already exists. Please use a different email address.'
                ], 422);
            }
            
            // Check if email exists but was deleted - we'll permanently delete it to allow reuse
            $deletedStaff = DB::table('evaluation_staff')
                ->where('email', $request->input('email'))
                ->whereNotNull('deleted_at')
                ->first();
            
            if ($deletedStaff) {
                // Permanently delete the old soft-deleted record to avoid unique constraint violation
                DB::table('evaluation_staff')
                    ->where('id', $deletedStaff->id)
                    ->delete();
            }
            
            $validated = $request->validate([
                'employee_id' => 'nullable|string|max:255',
                'name' => 'required|string|max:255',
                'email' => 'required|email',
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
                'metadata' => 'nullable|array',
                'create_account' => 'nullable|boolean',
                'is_new_joinee' => 'nullable|boolean',
                'new_joinee_days' => 'nullable|integer|min:1|max:365'
            ]);
            
            // Determine program_id based on user role and associated role
            if ($user->role === 'super-admin') {
                $programId = $validated['program_id'] ?? null;
                
                // If no program_id provided but role_id is specified,
                // inherit program_id from the role
                if (!$programId && !empty($validated['role_id'])) {
                    $role = DB::table('evaluation_roles')
                        ->where('id', $validated['role_id'])
                        ->whereNull('deleted_at')
                        ->first();
                    
                    if ($role && $role->program_id) {
                        $programId = $role->program_id;
                        \Log::info('Staff inheriting program_id from role', [
                            'staff_name' => $validated['name'],
                            'role_id' => $validated['role_id'],
                            'program_id' => $programId
                        ]);
                    }
                }
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
            $createdUserId = null;
            $generatedPassword = null;
            
            // If create_account is true, create a user account
            if (!empty($validated['create_account'])) {
                // Generate unique login email by adding '.staff' suffix before @
                // e.g., john.doe@company.com becomes john.doe.staff@company.com
                $emailParts = explode('@', $validated['email']);
                $uniqueLoginEmail = $emailParts[0] . '.staff@' . $emailParts[1];
                
                // Check if this unique login email already exists (only consider active/non-deleted users)
                $existingUser = User::where('email', $uniqueLoginEmail)->whereNull('deleted_at')->first();
                
                // If deleted user exists with this email, permanently remove it
                $deletedUser = User::where('email', $uniqueLoginEmail)->whereNotNull('deleted_at')->first();
                if ($deletedUser) {
                    \Log::info('Removing deleted user to allow email reuse', ['email' => $uniqueLoginEmail]);
                    $deletedUser->forceDelete();
                }
                
                if ($existingUser) {
                    // Active user exists, link to existing account
                    $createdUserId = $existingUser->id;
                    \Log::info('Linked to existing staff account', ['login_email' => $uniqueLoginEmail]);
                } else {
                    // Generate random password
                    $generatedPassword = Str::random(10);
                    
                    // Create user with unique login email, but use original email as communication_email
                    $newUser = User::create([
                        'name' => $validated['name'],
                        'email' => $uniqueLoginEmail,  // Unique login email
                        'communication_email' => $validated['email'],  // Actual email for communications
                        'password' => Hash::make($generatedPassword),
                        'role' => 'evaluation_staff',
                        'program_id' => $programId,
                        'status' => 'active'
                    ]);
                    
                    $createdUserId = $newUser->id;
                    
                    \Log::info('Created new staff user account', [
                        'login_email' => $uniqueLoginEmail,
                        'communication_email' => $validated['email']
                    ]);
                }
            }
            
            DB::table('evaluation_staff')->insert([
                'id' => $staffId,
                'employee_id' => $validated['employee_id'] ?? null,
                'name' => $validated['name'],
                'email' => $validated['email'],
                'role_id' => $validated['role_id'],
                'program_id' => $programId,
                'user_id' => $createdUserId ?? ($validated['user_id'] ?? null),
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
                'is_new_joinee' => $validated['is_new_joinee'] ?? false,
                'metadata' => isset($validated['metadata']) ? json_encode($validated['metadata']) : null,
                'created_by' => $user->id,
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            // Send welcome email if account was created with new password
            if ($generatedPassword && $createdUserId) {
                \Log::info('Sending welcome email', [
                    'communication_email' => $validated['email'],
                    'login_email' => $uniqueLoginEmail,
                    'name' => $validated['name'],
                    'has_password' => !empty($generatedPassword)
                ]);
                $this->sendWelcomeEmail(
                    $validated['name'], 
                    $validated['email'],  // communication email (actual email)
                    $uniqueLoginEmail,    // login email (with .staff suffix)
                    $generatedPassword, 
                    $programId
                );
            } else {
                \Log::info('Welcome email not sent', [
                    'create_account' => !empty($validated['create_account']),
                    'has_password' => !empty($generatedPassword),
                    'has_user_id' => !empty($createdUserId),
                    'email' => $validated['email']
                ]);
            }
            
            $this->logAudit('evaluation_staff', $staffId, 'created', 'Staff member created', $user, $programId);
            
            // Auto-schedule new joinee evaluation if applicable
            if (!empty($validated['is_new_joinee']) && !empty($validated['joining_date'])) {
                $this->scheduleNewJoineeEvaluation($staffId, $validated, $programId, $user);
            }
            
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
                    
                    // Delete associated user account if exists
                    if ($staff->user_id) {
                        DB::table('users')->where('id', $staff->user_id)->delete();
                        \Log::info('Deleted associated user account', ['staff_id' => $id, 'user_id' => $staff->user_id]);
                    }
                    
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
            
            // Simple delete (no dependencies) - also delete user account
            DB::beginTransaction();
            
            try {
                // Delete associated user account if exists
                if ($staff->user_id) {
                    DB::table('users')->where('id', $staff->user_id)->delete();
                    \Log::info('Deleted associated user account', ['staff_id' => $id, 'user_id' => $staff->user_id]);
                }
                
                // Delete staff
                DB::table('evaluation_staff')->where('id', $id)->update(['deleted_at' => now()]);
                
                $this->logAudit('evaluation_staff', $id, 'deleted', 'Staff member deleted', $user, $staff->program_id);
                
                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
            
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
    
    /**
     * Send welcome email to staff with login credentials
     * @param string $name - Staff member's name
     * @param string $communicationEmail - Email where the welcome message is sent
     * @param string $loginEmail - Email used for login (may have .staff suffix)
     * @param string $password - Generated password
     */
    private function sendWelcomeEmail($name, $communicationEmail, $loginEmail, $password, $programId = null)
    {
        try {
            $sendGridApiKey = SystemSetting::getValue('email_sendgrid_api_key') ?: env('SENDGRID_API_KEY');
            $from = SystemSetting::getValue('email_sender_email') ?: config('mail.from.address', 'info@qsights.com');
            $fromName = SystemSetting::getValue('email_sender_name') ?: config('mail.from.name', 'QSights');
            
            if (!$sendGridApiKey) {
                \Log::warning('SendGrid API key not configured for welcome email');
                return;
            }
            
            $loginUrl = config('app.frontend_url', 'https://prod.qsights.com') . '/login';
            
            $htmlContent = "
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;'>
                        <h1 style='color: white; margin: 0;'>Welcome to QSights</h1>
                        <p style='color: #e0e0e0; margin-top: 10px;'>Performance Evaluation System</p>
                    </div>
                    <div style='padding: 30px; background: #f9fafb;'>
                        <h2 style='color: #1f2937;'>Hello {$name}!</h2>
                        <p style='color: #4b5563; line-height: 1.6;'>Your account has been created for the QSights Performance Evaluation System. You can now log in to view your performance reports and evaluations.</p>
                        
                        <div style='background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;'>
                            <h3 style='color: #374151; margin-top: 0;'>Your Login Credentials</h3>
                            <p style='margin: 10px 0;'><strong>Login Email:</strong> {$loginEmail}</p>
                            <p style='margin: 10px 0;'><strong>Password:</strong> {$password}</p>
                        </div>
                        
                        <p style='color: #6b7280; font-size: 14px;'>⚠️ Please change your password after your first login for security.</p>
                        
                        <div style='text-align: center; margin-top: 30px;'>
                            <a href='{$loginUrl}' style='background: #7c3aed; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;'>Login to QSights</a>
                        </div>
                    </div>
                    <div style='padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;'>
                        <p>This is an automated message from QSights Performance Evaluation System.</p>
                        <p>This email was sent to {$communicationEmail}</p>
                    </div>
                </div>
            ";
            
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $sendGridApiKey,
                'Content-Type' => 'application/json'
            ])->post('https://api.sendgrid.com/v3/mail/send', [
                'personalizations' => [[
                    'to' => [['email' => $communicationEmail, 'name' => $name]]
                ]],
                'from' => ['email' => $from, 'name' => $fromName],
                'subject' => 'Welcome to QSights - Your Account Details',
                'content' => [
                    ['type' => 'text/html', 'value' => $htmlContent]
                ]
            ]);
            
            if ($response->successful()) {
                \Log::info("Welcome email sent", [
                    'communication_email' => $communicationEmail,
                    'login_email' => $loginEmail
                ]);
            } else {
                \Log::error('Failed to send welcome email: ' . $response->body());
            }
        } catch (\Exception $e) {
            \Log::error('Exception sending welcome email: ' . $e->getMessage());
        }
    }
    
    /**
     * Get logged-in staff's own performance data (My Performance)
     */
    public function myPerformance(Request $request)
    {
        try {
            $user = $request->user();
            
            // Find this user's evaluation_staff record
            $staffMember = DB::table('evaluation_staff')
                ->where('email', $user->email)
                ->orWhere('user_id', $user->id)
                ->whereNull('deleted_at')
                ->first();
            
            if (!$staffMember) {
                return response()->json([
                    'success' => false,
                    'message' => 'Staff profile not found'
                ], 404);
            }
            
            // Get all completed evaluations from evaluation_triggered where this staff member is a subordinate
            $evaluations = DB::table('evaluation_triggered')
                ->where('is_active', true)
                ->where('status', 'completed')
                ->whereNull('deleted_at')
                ->whereRaw("subordinates::text ILIKE '%\" . $staffMember->id . \"%'")
                ->orderBy('completed_at', 'desc')
                ->get();
            
            // Process evaluations - extract responses for this staff member
            $processedEvaluations = [];
            $allScores = [];
            
            foreach ($evaluations as $eval) {
                $subordinates = json_decode($eval->subordinates, true) ?? [];
                $responses = json_decode($eval->responses, true) ?? [];
                
                // Check if this staff member is in subordinates
                $isSubordinate = false;
                foreach ($subordinates as $sub) {
                    if (($sub['id'] ?? '') === $staffMember->id) {
                        $isSubordinate = true;
                        break;
                    }
                }
                
                if (!$isSubordinate) {
                    continue;
                }
                
                // Get this staff member's responses
                $staffResponses = $responses[$staffMember->id] ?? null;
                
                if (!$staffResponses) {
                    continue;
                }
                
                // Calculate score from responses if available
                $responseData = $staffResponses['responses'] ?? [];
                $scores = [];
                
                if (is_array($responseData)) {
                    foreach ($responseData as $answer) {
                        if (is_numeric($answer)) {
                            $scores[] = (float) $answer;
                        }
                    }
                }
                
                $avgScore = count($scores) > 0 
                    ? round(array_sum($scores) / count($scores), 2) 
                    : 0;
                
                $processedEvaluations[] = [
                    'id' => $eval->id,
                    'template_name' => $eval->template_name ?? 'Evaluation',
                    'evaluator_name' => $eval->evaluator_name ?? 'Manager',
                    'completed_at' => $staffResponses['completed_at'] ?? $eval->completed_at,
                    'score' => $avgScore,
                    'status' => 'completed',
                    'responses' => $responseData
                ];
                
                if ($avgScore > 0) {
                    $allScores[] = $avgScore;
                }
            }
            
            // Calculate overall average score
            $overallAverage = count($allScores) > 0 
                ? round(array_sum($allScores) / count($allScores), 2) 
                : 0;
            
            $latestEvaluation = count($processedEvaluations) > 0 
                ? $processedEvaluations[0]['completed_at'] 
                : null;
            
            return response()->json([
                'success' => true,
                'overallScore' => $overallAverage,
                'totalEvaluations' => count($processedEvaluations),
                'latestEvaluation' => $latestEvaluation,
                'evaluations' => $processedEvaluations,
                'staff' => [
                    'id' => $staffMember->id,
                    'name' => $staffMember->name,
                    'email' => $staffMember->email,
                    'employee_id' => $staffMember->employee_id
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch performance data: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get team performance for logged-in staff's subordinates
     */
    public function teamPerformance(Request $request)
    {
        try {
            $user = $request->user();
            
            // Find this user's evaluation_staff record
            $staffMember = DB::table('evaluation_staff')
                ->where('email', $user->email)
                ->orWhere('user_id', $user->id)
                ->whereNull('deleted_at')
                ->first();
            
            if (!$staffMember) {
                return response()->json([
                    'success' => false,
                    'message' => 'Staff profile not found'
                ], 404);
            }
            
            // Get all subordinates of this staff member
            $subordinates = DB::table('evaluation_hierarchy as eh')
                ->join('evaluation_staff as es', 'eh.staff_id', '=', 'es.id')
                ->leftJoin('evaluation_roles as er', 'es.role_id', '=', 'er.id')
                ->where('eh.reports_to_id', $staffMember->id)
                ->where('eh.is_active', true)
                ->whereNull('eh.deleted_at')
                ->whereNull('es.deleted_at')
                ->select(
                    'es.id as staff_id',
                    'es.name as staff_name',
                    'es.email as staff_email',
                    'es.employee_id',
                    'es.department',
                    'er.name as role_name'
                )
                ->get();
            
            if ($subordinates->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'message' => 'No subordinates found',
                    'subordinates' => [],
                    'staff_reports' => []
                ]);
            }
            
            // Get performance data for each subordinate from evaluation_triggered
            $staffReports = [];
            foreach ($subordinates as $sub) {
                // Get all completed evaluations by this evaluator
                $evaluations = DB::table('evaluation_triggered')
                    ->where('evaluator_id', $staffMember->id)
                    ->where('status', 'completed')
                    ->where('is_active', true)
                    ->whereNull('deleted_at')
                    ->orderBy('completed_at', 'desc')
                    ->get();
                
                $allScores = [];
                $processedEvals = [];
                
                foreach ($evaluations as $eval) {
                    $subordinatesJson = json_decode($eval->subordinates, true) ?? [];
                    $responses = json_decode($eval->responses, true) ?? [];
                    
                    // Check if this subordinate is in the evaluation
                    $isInEval = false;
                    foreach ($subordinatesJson as $evalSub) {
                        if (($evalSub['id'] ?? '') === $sub->staff_id) {
                            $isInEval = true;
                            break;
                        }
                    }
                    
                    if (!$isInEval) {
                        continue;
                    }
                    
                    // Get this subordinate's responses
                    $subResponses = $responses[$sub->staff_id] ?? null;
                    
                    if (!$subResponses) {
                        continue;
                    }
                    
                    // Calculate score from responses
                    $responseData = $subResponses['responses'] ?? [];
                    $scores = [];
                    
                    if (is_array($responseData)) {
                        foreach ($responseData as $answer) {
                            if (is_numeric($answer)) {
                                $scores[] = (float) $answer;
                                $allScores[] = (float) $answer;
                            }
                        }
                    }
                    
                    $avgScore = count($scores) > 0 
                        ? round(array_sum($scores) / count($scores), 2) 
                        : 0;
                    
                    $processedEvals[] = [
                        'id' => $eval->id,
                        'template_name' => $eval->template_name,
                        'evaluator_name' => $eval->evaluator_name,
                        'evaluated_at' => $subResponses['completed_at'] ?? $eval->completed_at,
                        'average_score' => $avgScore,
                        'responses' => $responseData
                    ];
                }
                
                // Calculate overall average for this subordinate
                $overallAvg = count($allScores) > 0
                    ? round(array_sum($allScores) / count($allScores), 2)
                    : 0;
                
                $staffReports[] = [
                    'staff_id' => $sub->staff_id,
                    'staff_name' => $sub->staff_name,
                    'staff_email' => $sub->staff_email,
                    'employee_id' => $sub->employee_id,
                    'department' => $sub->department,
                    'role_name' => $sub->role_name,
                    'total_evaluations' => count($processedEvals),
                    'overall_average' => $overallAvg,
                    'evaluations' => $processedEvals
                ];
            }
            
            return response()->json([
                'success' => true,
                'manager' => [
                    'id' => $staffMember->id,
                    'name' => $staffMember->name
                ],
                'subordinates_count' => count($subordinates),
                'staff_reports' => $staffReports
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch team performance: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Schedule automatic evaluation for new joinee
     */
    private function scheduleNewJoineeEvaluation($staffId, $validated, $programId, $user)
    {
        try {
            // Get the staff's reporting manager (evaluator) from hierarchy
            $hierarchy = DB::table('evaluation_hierarchy')
                ->where('staff_id', $staffId)
                ->where('is_active', true)
                ->where('is_primary', true)
                ->whereNull('deleted_at')
                ->first();
            
            if (!$hierarchy) {
                \Log::warning('New joinee has no reporting manager assigned', [
                    'staff_id' => $staffId,
                    'staff_name' => $validated['name']
                ]);
                return;
            }
            
            // Get evaluator details
            $evaluator = DB::table('evaluation_staff')
                ->where('id', $hierarchy->reports_to_id)
                ->whereNull('deleted_at')
                ->first();
            
            if (!$evaluator) {
                \Log::warning('Evaluator not found for new joinee', [
                    'staff_id' => $staffId,
                    'evaluator_id' => $hierarchy->reports_to_id
                ]);
                return;
            }
            
            // Find the "Trainee Evaluation - NJ" questionnaire
            $questionnaire = DB::table('questionnaires')
                ->where('name', 'ILIKE', '%Trainee Evaluation%NJ%')
                ->where('program_id', $programId)
                ->whereNull('deleted_at')
                ->first();
            
            if (!$questionnaire) {
                \Log::warning('Trainee Evaluation - NJ questionnaire not found', [
                    'program_id' => $programId
                ]);
                return;
            }
            
            // Calculate trigger date: joining_date + X days (default 30)
            $triggerDays = $validated['new_joinee_days'] ?? 30;
            $joiningDate = new \DateTime($validated['joining_date']);
            $triggerDate = clone $joiningDate;
            $triggerDate->modify("+{$triggerDays} days");
            
            // End date is trigger date + 30 days for completion
            $endDate = clone $triggerDate;
            $endDate->modify('+30 days');
            
            // Parse questionnaire questions
            $questions = [];
            if ($questionnaire->questions) {
                $parsedQuestions = json_decode($questionnaire->questions, true);
                if (is_array($parsedQuestions)) {
                    $questions = $parsedQuestions;
                }
            }
            
            // Generate access token for the evaluation
            $accessToken = Str::random(32);
            
            // Create the scheduled trigger
            $triggerId = Str::uuid()->toString();
            DB::table('evaluation_triggered')->insert([
                'id' => $triggerId,
                'organization_id' => $user->organization_id ?? 1,
                'program_id' => $programId,
                'template_id' => 'questionnaire_' . $questionnaire->id,
                'template_name' => $questionnaire->name,
                'template_questions' => json_encode($questions),
                'evaluator_id' => $evaluator->id,
                'evaluator_name' => $evaluator->name,
                'evaluator_email' => $evaluator->email,
                'staff_id' => $staffId,
                'subordinates' => json_encode([[
                    'staff_id' => $staffId,
                    'staff_name' => $validated['name'],
                    'staff_email' => $validated['email'],
                    'employee_id' => $validated['employee_id'] ?? ''
                ]]),
                'subordinates_count' => 1,
                'access_token' => $accessToken,
                'status' => 'pending',
                'triggered_by' => $user->id,
                'triggered_at' => now(),
                'start_date' => $triggerDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
                'scheduled_trigger_at' => $triggerDate->format('Y-m-d H:i:s'),
                'scheduled_timezone' => 'Asia/Kolkata',
                'is_auto_scheduled' => true,
                'auto_schedule_type' => 'new_joinee',
                'email_subject' => "Trainee Evaluation Required - {$validated['name']}",
                'email_body' => "Hello {$evaluator->name},\n\nYour new team member {$validated['name']} has completed {$triggerDays} days. Please evaluate their performance using the Trainee Evaluation form.\n\nJoining Date: {$validated['joining_date']}\nEvaluation Period: {$triggerDays} days\n\nPlease complete the evaluation by {$endDate->format('Y-m-d')}.\n\nBest regards,\nQSights Team",
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            \Log::info('Auto-scheduled new joinee evaluation', [
                'staff_id' => $staffId,
                'staff_name' => $validated['name'],
                'evaluator_name' => $evaluator->name,
                'trigger_date' => $triggerDate->format('Y-m-d'),
                'trigger_days' => $triggerDays,
                'questionnaire' => $questionnaire->name
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Failed to schedule new joinee evaluation', [
                'staff_id' => $staffId,
                'error' => $e->getMessage()
            ]);
        }
    }
}
