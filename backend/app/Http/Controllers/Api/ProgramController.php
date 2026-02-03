<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Program;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class ProgramController extends Controller
{
    /**
     * Display a listing of programs.
     */
    public function index(Request $request)
    {
        // Auto-filter by program_id for program-scoped roles
        $user = $request->user();
        if ($user && in_array($user->role, ['program-admin', 'program-manager', 'program-moderator', 'evaluation-admin']) && $user->program_id) {
            // Force filter to user's program for these roles
            $request->merge(['program_id' => $user->program_id]);
        }
        
        $query = Program::with(['organization', 'groupHead', 'groupHead.user'])
            ->withCount([
                'participants as participants_count' => function($q) {
                    $q->whereNull('participants.deleted_at');
                },
                'participants as active_participants_count' => function($q) {
                    $q->where('participants.status', 'active')
                      ->where('participants.is_guest', false)
                      ->whereNull('participants.deleted_at');
                },
                'participants as inactive_participants_count' => function($q) {
                    $q->where('participants.status', 'inactive')
                      ->where('participants.is_guest', false)
                      ->whereNull('participants.deleted_at');
                },
                'participants as authenticated_participants_count' => function($q) {
                    $q->where('participants.is_guest', false)
                      ->whereNull('participants.deleted_at');
                },
                'participants as total_authenticated_count' => function($q) {
                    $q->where('participants.is_guest', false)
                      ->whereNull('participants.deleted_at');
                },
                'participants as guest_participants_count' => function($q) {
                    $q->where('participants.is_guest', true)
                      ->whereNull('participants.deleted_at');
                },
                'activities as activities_count' => function($q) {
                    $q->whereNull('activities.deleted_at');
                }
            ]);
        
        // Filter by status - default to active only, unless 'all_statuses' is requested
        if (!$request->boolean('all_statuses')) {
            $query->where('status', 'active');
        }
        
        // Exclude soft-deleted programs
        $query->whereNull('deleted_at');
        
        // Include trashed only if explicitly requested
        if ($request->boolean('with_trashed')) {
            $query->withTrashed();
        }
        
        // Auto-update expired programs
        $this->updateExpiredPrograms();

        // Filter by organization
        if ($request->has('organization_id')) {
            $query->where('organization_id', $request->organization_id);
        }        // Filter by group head
        if ($request->has('group_head_id')) {
            $query->where('group_head_id', $request->group_head_id);
        }

        // Filter by program ID (for program-scoped roles)
        if ($request->has('program_id')) {
            $query->where('id', $request->program_id);
        }

        // Filter by ID (alternative parameter)
        if ($request->has('id')) {
            $query->where('id', $request->id);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('code', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->has('start_date')) {
            $query->where('start_date', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->where('end_date', '<=', $request->end_date);
        }

        // Include trashed
        if ($request->boolean('with_trashed')) {
            $query->withTrashed();
        }

        $programs = $query->paginate($request->input('per_page', 15));
        
        // Add calculated fields for each program
        $programs->getCollection()->transform(function ($program) {
            // Calculate progress based on activities completion
            $totalActivities = \App\Models\Activity::where('program_id', $program->id)
                ->whereNull('deleted_at')
                ->count();
            
            $completedActivities = \App\Models\Activity::where('program_id', $program->id)
                ->where('status', 'completed')
                ->whereNull('deleted_at')
                ->count();
            
            $program->progress = $totalActivities > 0 
                ? round(($completedActivities / $totalActivities) * 100, 2)
                : 0;
            
            return $program;
        });

        return response()->json($programs);
    }

    /**
     * Store a newly created program with auto-generated users.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'organization_id' => 'required|integer|exists:organizations,id',
            'group_head_id' => 'nullable|integer|exists:group_heads,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:programs,code',
            'description' => 'nullable|string',
            'logo' => 'nullable|string|max:500',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_multilingual' => 'nullable|boolean',
            'languages' => 'nullable|array',
            'languages.*' => 'string|max:10',
            'status' => 'nullable|in:active,inactive',
            // User generation flags
            'generate_admin' => 'nullable|boolean',
            'generate_manager' => 'nullable|boolean',
            'generate_moderator' => 'nullable|boolean',
        ]);

        // Create program
        $program = Program::create([
            'id' => Str::uuid(),
            'organization_id' => $validated['organization_id'],
            'group_head_id' => $validated['group_head_id'] ?? null,
            'name' => $validated['name'],
            'code' => $validated['code'],
            'description' => $validated['description'] ?? null,
            'logo' => $validated['logo'] ?? null,
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'is_multilingual' => $validated['is_multilingual'] ?? false,
            'languages' => $validated['languages'] ?? null,
            'status' => $validated['status'] ?? 'active',
        ]);

        // Auto-generate users if requested
        $generatedUsers = [];
        
        if ($request->boolean('generate_admin', true)) {
            $generatedUsers['admin'] = $this->generateProgramUser($program, 'program-admin');
        }
        
        if ($request->boolean('generate_manager', true)) {
            $generatedUsers['manager'] = $this->generateProgramUser($program, 'program-manager');
        }
        
        if ($request->boolean('generate_moderator', true)) {
            $generatedUsers['moderator'] = $this->generateProgramUser($program, 'program-moderator');
        }
        
        // Also generate evaluation-admin by default (new role)
        if ($request->boolean('generate_evaluation_admin', true)) {
            $generatedUsers['evaluation-admin'] = $this->generateProgramUser($program, 'evaluation-admin');
        }

        $program->load(['organization', 'groupHead']);

        return response()->json([
            'message' => 'Program created successfully',
            'data' => $program,
            'generated_users' => $generatedUsers,
            'note' => 'Please save all user credentials. Passwords will not be shown again.'
        ], 201);
    }

    /**
     * Generate a user for a specific program role.
     */
    private function generateProgramUser(Program $program, string $role)
    {
        $roleNames = [
            'program-admin' => 'admin',
            'program-manager' => 'manager',
            'program-moderator' => 'moderator',
            'evaluation-admin' => 'evaladmin',
        ];

        $roleShortName = $roleNames[$role] ?? 'user';
        $generatedPassword = Str::random(12);
        
        // Generate username: programcode.role@qsights.com (no spaces, all lowercase)
        // Example: "strategic-survey.admin@qsights.com"
        $programSlug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $program->name));
        $programSlug = trim($programSlug, '-'); // Remove leading/trailing hyphens
        $programSlug = substr($programSlug, 0, 30); // Limit length
        
        $baseUsername = "{$programSlug}.{$roleShortName}@qsights.com";
        
        // Ensure unique username
        $username = $baseUsername;
        $counter = 1;
        while (User::where('name', $username)->exists() || User::where('email', $username)->exists()) {
            $username = "{$programSlug}.{$roleShortName}.{$counter}@qsights.com";
            $counter++;
        }
        
        // Email is same as username for consistency
        $email = $username;

        // Define default services for each role
        $defaultServices = $this->getDefaultServicesForRole($role);

        $user = User::create([
            'name' => $username, // Store username in name field for login
            'email' => $email,
            'password' => Hash::make($generatedPassword),
            'role' => $role,
            'program_id' => $program->id,
            'default_services' => $defaultServices,
        ]);

        return [
            'role' => $role,
            'username' => $user->name, // Return as 'username' for clarity
            'email' => $user->email,
            'password' => $generatedPassword,
        ];
    }

    /**
     * Get default services/permissions for a role.
     * 
     * IMPORTANT: These are default Program role services
     * - Program Admin: Full access within program (like Super Admin but scoped)
     * - Program Manager: View/Edit only (no Create/Delete for questionnaires & events)
     * - Program Moderator: View-only access to events and reports
     */
    private function getDefaultServicesForRole(string $role): array
    {
        $defaults = [
            'program-admin' => [
                // Dashboard
                'dashboard',
                
                // Programs - Full access
                'programs-view',
                'programs-create',
                'programs-edit',
                'programs-delete',
                
                // Participants - Full access
                'participants-view',
                'participants-create',
                'participants-edit',
                'participants-delete',
                
                // Questionnaires - Full access (like Super Admin, program-scoped)
                'questionnaires-view',
                'questionnaires-create',
                'questionnaires-edit',
                'questionnaires-delete',
                
                // Activities/Events - Full access (like Super Admin, program-scoped)
                'activities-view',
                'activities-create',
                'activities-edit',
                'activities-delete',
                'activities-send-notification',
                'activities-set-reminder',
                'activities-landing-config',
                
                // Reports - Full access
                'reports-view',
                'reports-export',
                
                // Evaluation - NO ACCESS (only evaluation-admin has access)
                // Removed: evaluation-view, evaluation-manage
            ],
            'program-manager' => [
                // Dashboard
                'dashboard',
                
                // Programs - View only
                'programs-view',
                
                // Participants - View and Edit
                'participants-view',
                'participants-edit',
                
                // Questionnaires - View and Edit only (NO create, NO delete)
                'questionnaires-view',
                'questionnaires-edit',
                
                // Activities/Events - Create and Manage
                'activities-view',
                'activities-create',
                'activities-edit',
                'activities-send-notification',
                'activities-landing-config',
                
                // Reports - View and Export
                'reports-view',
                'reports-export',
                
                // Evaluation - NO ACCESS (only evaluation-admin has access)
                // Removed: evaluation-view, evaluation-manage
            ],
            'program-moderator' => [
                // Dashboard
                'dashboard',
                
                // Activities/Events - Run only (view to run them)
                'activities-view',
                
                // Reports - Limited (view and export)
                'reports-view',
                'reports-export',
                
                // Evaluation - NO ACCESS (only evaluation-admin has access)
                // Removed: evaluation-view, evaluation-manage
            ],
            'evaluation-admin' => [
                // Dashboard
                'dashboard',
                
                // Organizations - View only (using dash-based service keys to match other roles)
                'list_organization',
                
                // Programs - NO ACCESS (hidden from evaluation-admin navigation)
                // Removed: programs-view
                
                // Questionnaires - Full access (dash-based)
                'questionnaires-view',
                'questionnaires-create',
                'questionnaires-edit',
                'questionnaires-delete',
                
                // Activities/Events - NO ACCESS (evaluation-admin doesn't see Events)
                // Removed: activities-view, activities-create, etc.
                
                // Reports/Analytics - NO ACCESS (evaluation-admin doesn't see Reports & Analytics)
                // Removed: reports-view, reports-export
                
                // Evaluation - Full access (program-scoped, ownership-based)
                'evaluation-view',
                'evaluation-manage',
            ],
        ];

        return $defaults[$role] ?? [];
    }

    /**
     * Display the specified program.
     */
    public function show(string $id)
    {
        $program = Program::with([
            'organization', 
            'groupHead', 
            'groupHead.user',
            'activities',
            'participants'
        ])->findOrFail($id);

        // Check if expired
        $this->checkAndUpdateExpiry($program);

        return response()->json(['data' => $program]);
    }

    /**
     * Update the specified program.
     */
    public function update(Request $request, string $id)
    {
        $program = Program::findOrFail($id);

        $validated = $request->validate([
            'organization_id' => 'sometimes|required|integer|exists:organizations,id',
            'group_head_id' => 'nullable|integer|exists:group_heads,id',
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50|unique:programs,code,' . $id,
            'description' => 'nullable|string',
            'logo' => 'nullable|string|max:500',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_multilingual' => 'nullable|boolean',
            'languages' => 'nullable|array',
            'languages.*' => 'string|max:10',
            'status' => 'sometimes|in:active,inactive,expired',
        ]);

        $program->update($validated);

        // Check expiry after update
        $this->checkAndUpdateExpiry($program);

        $program->load(['organization', 'groupHead']);

        return response()->json([
            'message' => 'Program updated successfully',
            'data' => $program
        ]);
    }

    /**
     * Soft delete the specified program.
     */
    public function destroy(string $id)
    {
        $program = Program::findOrFail($id);
        $program->delete();

        return response()->json([
            'message' => 'Program deleted successfully'
        ]);
    }

    /**
     * Deactivate program.
     */
    public function deactivate(string $id)
    {
        $program = Program::findOrFail($id);
        $program->update(['status' => 'inactive']);

        return response()->json([
            'message' => 'Program deactivated successfully',
            'data' => $program
        ]);
    }

    /**
     * Activate program.
     */
    public function activate(string $id)
    {
        $program = Program::findOrFail($id);
        
        // Check if not expired
        if ($program->end_date && Carbon::parse($program->end_date)->isPast()) {
            return response()->json([
                'message' => 'Cannot activate expired program',
                'error' => 'Program end date has passed'
            ], 422);
        }

        $program->update(['status' => 'active']);

        return response()->json([
            'message' => 'Program activated successfully',
            'data' => $program
        ]);
    }

    /**
     * Permanently delete program.
     */
    public function forceDestroy(string $id)
    {
        $program = Program::withTrashed()->findOrFail($id);
        
        // Delete associated program users
        User::where('program_id', $program->id)->forceDelete();
        
        $program->forceDelete();

        return response()->json([
            'message' => 'Program permanently deleted'
        ]);
    }

    /**
     * Restore soft deleted program.
     */
    public function restore(string $id)
    {
        $program = Program::withTrashed()->findOrFail($id);
        $program->restore();

        // Restore associated users
        User::withTrashed()->where('program_id', $program->id)->restore();

        $program->load(['organization', 'groupHead']);

        return response()->json([
            'message' => 'Program restored successfully',
            'data' => $program
        ]);
    }

    /**
     * Check and update program expiry status.
     */
    private function checkAndUpdateExpiry(Program $program)
    {
        if ($program->end_date && Carbon::parse($program->end_date)->isPast() && $program->status !== 'expired') {
            $program->update(['status' => 'expired']);
        }
    }

    /**
     * Update all expired programs.
     */
    private function updateExpiredPrograms()
    {
        Program::where('status', '!=', 'expired')
            ->whereNotNull('end_date')
            ->where('end_date', '<', Carbon::now())
            ->update(['status' => 'expired']);
    }

    /**
     * Get program statistics.
     */

    public function statistics(string $id)
    {
        $program = Program::withCount(['activities', 'participants'])
            ->findOrFail($id);

        $stats = [
            'total_activities' => $program->activities_count,
            'total_participants' => $program->participants_count,
            'is_multilingual' => $program->is_multilingual,
            'languages' => $program->languages,
            'status' => $program->status,
            'days_remaining' => $program->end_date ? Carbon::now()->diffInDays(Carbon::parse($program->end_date), false) : null,
        ];

        return response()->json([
            'data' => $program,
            'statistics' => $stats
        ]);
    }

    /**
     * Get all users assigned to a specific program
     */
    public function getProgramUsers(string $programId)
    {
        try {
            $program = Program::findOrFail($programId);
            
            $users = User::where('program_id', $programId)
                ->whereIn('role', ['program-admin', 'program-manager', 'program-moderator'])
                ->select('id', 'name', 'email', 'role', 'program_id', 'status', 'created_at', 'updated_at')
                ->get();
            
            return response()->json([
                'success' => true,
                'data' => $users,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch program users',
                'error' => $e->getMessage(),
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reset password for a program user
     */
    public function resetProgramUserPassword(string $programId, string $userId)
    {
        try {
            $program = Program::findOrFail($programId);
            $user = User::where('id', $userId)
                ->where('program_id', $programId)
                ->whereIn('role', ['program-admin', 'program-manager', 'program-moderator'])
                ->firstOrFail();
            
            $newPassword = Str::random(12);
            $user->password = Hash::make($newPassword);
            $user->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Password reset successfully',
                'credentials' => [
                    'user_id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'password' => $newPassword,
                    'note' => 'Please save this password securely.'
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reset password',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update a program user
     * Super admin can update any user
     * Program admin can only update users in their program
     */
    public function updateProgramUser(Request $request, string $programId, string $userId)
    {
        try {
            $authUser = $request->user();
            $program = Program::findOrFail($programId);
            
            // Authorization check
            if ($authUser->role !== 'super-admin' && $authUser->program_id !== $programId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. You can only manage users in your program.',
                ], 403);
            }
            
            $user = User::where('id', $userId)
                ->where('program_id', $programId)
                ->whereIn('role', ['program-admin', 'program-manager', 'program-moderator'])
                ->firstOrFail();
            
            // Validate request
            $validated = $request->validate([
                'username' => 'sometimes|string|max:255|unique:users,name,' . $userId,
                'email' => 'sometimes|email|unique:users,email,' . $userId,
                'password' => 'sometimes|string|min:8',
            ]);
            
            // Update user fields
            if (isset($validated['username'])) {
                $username = $validated['username'];
                
                // Only validate format if username is actually changing
                if ($username !== $user->name) {
                    // Ensure username has no spaces and ends with @qsights.com
                    if (!str_ends_with($username, '@qsights.com')) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Username must end with @qsights.com',
                        ], 422);
                    }
                    if (preg_match('/\s/', $username)) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Username cannot contain spaces',
                        ], 422);
                    }
                    $user->name = $username;
                    // Also update email to match username
                    $user->email = $username;
                }
            }
            if (isset($validated['email'])) {
                $user->email = $validated['email'];
            }
            if (isset($validated['password'])) {
                $user->password = Hash::make($validated['password']);
            }
            
            $user->save();
            
            return response()->json([
                'success' => true,
                'message' => 'User updated successfully',
                'data' => $user,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update allowed services for a program user
     * Only super-admin and admin can update services
     */
    public function updateProgramUserServices(Request $request, string $programId, string $userId)
    {
        try {
            $authUser = $request->user();
            
            // Only super-admin and admin can update services
            if (!in_array($authUser->role, ['super-admin', 'admin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Only super-admin and admin can update user services.',
                ], 403);
            }
            
            $program = Program::findOrFail($programId);
            $user = User::where('id', $userId)
                ->where('program_id', $programId)
                ->whereIn('role', ['program-admin', 'program-manager', 'program-moderator'])
                ->firstOrFail();
            
            // Validate request
            $validated = $request->validate([
                'services' => 'required|array',
                'services.*' => 'string|in:dashboard,activities-view,activities-create,activities-edit,activities-delete,activities-send-notification,activities-set-reminder,activities-landing-config,participants-view,participants-create,participants-edit,participants-delete,reports-view,reports-export',
            ]);
            
            // Update services
            $user->default_services = $validated['services'];
            $user->save();
            
            return response()->json([
                'success' => true,
                'message' => 'User services updated successfully',
                'data' => [
                    'user_id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role,
                    'services' => $user->default_services,
                ],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'User or program not found',
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update user services',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a program user
     * Super admin can delete any user
     * Program admin can only delete users in their program
     */
    public function deleteProgramUser(Request $request, string $programId, string $userId)
    {
        try {
            $authUser = $request->user();
            $program = Program::findOrFail($programId);
            
            // Authorization check
            if ($authUser->role !== 'super-admin' && $authUser->program_id !== $programId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. You can only manage users in your program.',
                ], 403);
            }
            
            $user = User::where('id', $userId)
                ->where('program_id', $programId)
                ->whereIn('role', ['program-admin', 'program-manager', 'program-moderator'])
                ->firstOrFail();
            
            // Prevent self-deletion
            if ($authUser->id === $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You cannot delete your own account.',
                ], 403);
            }
            
            $user->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'User deleted successfully',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
