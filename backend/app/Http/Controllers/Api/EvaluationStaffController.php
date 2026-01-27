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
                'metadata' => 'nullable|array',
                'create_account' => 'nullable|boolean'
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
            $createdUserId = null;
            $generatedPassword = null;
            
            // If create_account is true, create a user account
            if (!empty($validated['create_account'])) {
                // Check if user with this email already exists
                $existingUser = User::where('email', $validated['email'])->first();
                
                if ($existingUser) {
                    $createdUserId = $existingUser->id;
                } else {
                    // Generate random password
                    $generatedPassword = Str::random(10);
                    
                    // Create user
                    $newUser = User::create([
                        'name' => $validated['name'],
                        'email' => $validated['email'],
                        'password' => Hash::make($generatedPassword),
                        'role' => 'evaluation_staff',
                        'program_id' => $programId,
                        'is_active' => true
                    ]);
                    
                    $createdUserId = $newUser->id;
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
                'metadata' => isset($validated['metadata']) ? json_encode($validated['metadata']) : null,
                'created_by' => $user->id,
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            // Send welcome email if account was created
            if ($generatedPassword && $createdUserId) {
                $this->sendWelcomeEmail($validated['name'], $validated['email'], $generatedPassword, $programId);
            }
            
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
    
    /**
     * Send welcome email to staff with login credentials
     */
    private function sendWelcomeEmail($name, $email, $password, $programId = null)
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
                            <p style='margin: 10px 0;'><strong>Username (Email):</strong> {$email}</p>
                            <p style='margin: 10px 0;'><strong>Password:</strong> {$password}</p>
                        </div>
                        
                        <p style='color: #6b7280; font-size: 14px;'>⚠️ Please change your password after your first login for security.</p>
                        
                        <div style='text-align: center; margin-top: 30px;'>
                            <a href='{$loginUrl}' style='background: #7c3aed; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;'>Login to QSights</a>
                        </div>
                    </div>
                    <div style='padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;'>
                        <p>This is an automated message from QSights Performance Evaluation System.</p>
                    </div>
                </div>
            ";
            
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $sendGridApiKey,
                'Content-Type' => 'application/json'
            ])->post('https://api.sendgrid.com/v3/mail/send', [
                'personalizations' => [[
                    'to' => [['email' => $email, 'name' => $name]]
                ]],
                'from' => ['email' => $from, 'name' => $fromName],
                'subject' => 'Welcome to QSights - Your Account Details',
                'content' => [
                    ['type' => 'text/html', 'value' => $htmlContent]
                ]
            ]);
            
            if ($response->successful()) {
                \Log::info("Welcome email sent to {$email}");
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
            
            // Get all evaluations where this staff member was evaluated
            $evaluations = DB::table('evaluation_results as er')
                ->join('evaluation_triggered as et', 'er.triggered_id', '=', 'et.id')
                ->join('evaluation_staff as evaluator', 'et.evaluator_id', '=', 'evaluator.id')
                ->where('er.staff_id', $staffMember->id)
                ->whereNull('er.deleted_at')
                ->select(
                    'er.*',
                    'et.template_name',
                    'et.evaluator_id',
                    'evaluator.name as evaluator_name',
                    'evaluator.email as evaluator_email'
                )
                ->orderBy('er.evaluated_at', 'desc')
                ->get();
            
            // Process evaluations to extract scores
            $processedEvaluations = [];
            $allScores = [];
            $strengths = [];
            $improvements = [];
            
            foreach ($evaluations as $eval) {
                $responses = json_decode($eval->responses, true) ?? [];
                $evalScores = [];
                
                foreach ($responses as $questionId => $response) {
                    if (isset($response['score']) && is_numeric($response['score'])) {
                        $evalScores[] = [
                            'question' => $response['question'] ?? $questionId,
                            'score' => (float) $response['score']
                        ];
                        $allScores[] = [
                            'question' => $response['question'] ?? $questionId,
                            'score' => (float) $response['score']
                        ];
                    }
                }
                
                $avgScore = count($evalScores) > 0 
                    ? round(array_sum(array_column($evalScores, 'score')) / count($evalScores), 2) 
                    : 0;
                
                $processedEvaluations[] = [
                    'id' => $eval->id,
                    'template_name' => $eval->template_name,
                    'evaluator_name' => $eval->evaluator_name,
                    'evaluated_at' => $eval->evaluated_at,
                    'scores' => $evalScores,
                    'average_score' => $avgScore,
                    'feedback' => $eval->feedback ?? null
                ];
            }
            
            // Calculate aggregated scores by question
            $aggregatedScores = [];
            foreach ($allScores as $score) {
                $key = $score['question'];
                if (!isset($aggregatedScores[$key])) {
                    $aggregatedScores[$key] = ['question' => $key, 'scores' => [], 'total' => 0, 'count' => 0];
                }
                $aggregatedScores[$key]['scores'][] = $score['score'];
                $aggregatedScores[$key]['total'] += $score['score'];
                $aggregatedScores[$key]['count']++;
            }
            
            // Calculate averages and identify strengths/improvements
            $skillScores = [];
            foreach ($aggregatedScores as $key => $data) {
                $avg = round($data['total'] / $data['count'], 2);
                $skillScores[] = [
                    'question' => $data['question'],
                    'average' => $avg,
                    'count' => $data['count']
                ];
            }
            
            // Sort to find top and bottom
            usort($skillScores, fn($a, $b) => $b['average'] <=> $a['average']);
            $strengths = array_slice(array_filter($skillScores, fn($s) => $s['average'] >= 4), 0, 3);
            $improvements = array_slice(array_filter($skillScores, fn($s) => $s['average'] < 4), 0, 3);
            
            $overallAverage = count($skillScores) > 0 
                ? round(array_sum(array_column($skillScores, 'average')) / count($skillScores), 2) 
                : 0;
            
            return response()->json([
                'success' => true,
                'staff' => [
                    'id' => $staffMember->id,
                    'name' => $staffMember->name,
                    'email' => $staffMember->email,
                    'employee_id' => $staffMember->employee_id,
                    'department' => $staffMember->department
                ],
                'summary' => [
                    'total_evaluations' => count($processedEvaluations),
                    'overall_average' => $overallAverage,
                    'strengths' => $strengths,
                    'improvements' => $improvements
                ],
                'skill_scores' => $skillScores,
                'evaluations' => $processedEvaluations
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
            
            // Get performance data for each subordinate
            $staffReports = [];
            foreach ($subordinates as $sub) {
                $evaluations = DB::table('evaluation_results as er')
                    ->join('evaluation_triggered as et', 'er.triggered_id', '=', 'et.id')
                    ->join('evaluation_staff as evaluator', 'et.evaluator_id', '=', 'evaluator.id')
                    ->where('er.staff_id', $sub->staff_id)
                    ->whereNull('er.deleted_at')
                    ->select('er.*', 'et.template_name', 'evaluator.name as evaluator_name')
                    ->orderBy('er.evaluated_at', 'desc')
                    ->get();
                
                $allScores = [];
                $processedEvals = [];
                
                foreach ($evaluations as $eval) {
                    $responses = json_decode($eval->responses, true) ?? [];
                    $evalScores = [];
                    
                    foreach ($responses as $questionId => $response) {
                        if (isset($response['score']) && is_numeric($response['score'])) {
                            $evalScores[] = [
                                'question' => $response['question'] ?? $questionId,
                                'score' => (float) $response['score']
                            ];
                            $allScores[] = [
                                'question' => $response['question'] ?? $questionId,
                                'score' => (float) $response['score']
                            ];
                        }
                    }
                    
                    $avgScore = count($evalScores) > 0 
                        ? round(array_sum(array_column($evalScores, 'score')) / count($evalScores), 2) 
                        : 0;
                    
                    $processedEvals[] = [
                        'id' => $eval->id,
                        'template_name' => $eval->template_name,
                        'evaluator_name' => $eval->evaluator_name,
                        'evaluated_at' => $eval->evaluated_at,
                        'average_score' => $avgScore
                    ];
                }
                
                // Calculate overall average for this subordinate
                $overallAvg = count($allScores) > 0
                    ? round(array_sum(array_column($allScores, 'score')) / count($allScores), 2)
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
}
