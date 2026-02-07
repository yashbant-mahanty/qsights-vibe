<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HierarchicalRole;
use App\Models\User;
use App\Models\UserRoleHierarchy;
use App\Models\ManagerDashboardAccess;
use App\Services\HierarchyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class HierarchyController extends Controller
{
    protected $hierarchyService;

    public function __construct(HierarchyService $hierarchyService)
    {
        $this->hierarchyService = $hierarchyService;
    }

    /**
     * Get all hierarchical roles
     * GET /api/hierarchy/roles
     */
    public function getRoles(Request $request)
    {
        try {
            $query = HierarchicalRole::with('roleType')
                ->where('status', 'active');

            // Filter by role type (system or program)
            if ($request->has('role_type')) {
                $query->whereHas('roleType', function ($q) use ($request) {
                    $q->where('name', $request->role_type);
                });
            }

            // Filter by manager roles only
            if ($request->boolean('managers_only')) {
                $query->where('is_manager', true);
            }

            $roles = $query->orderBy('hierarchy_level')->get();

            return response()->json([
                'success' => true,
                'roles' => $roles,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching hierarchical roles', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch roles',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available managers for a program
     * GET /api/hierarchy/programs/{programId}/available-managers
     */
    public function getAvailableManagers($programId)
    {
        try {
            // Get users with manager roles in this program
            $managers = UserRoleHierarchy::where('program_id', $programId)
                ->whereHas('hierarchicalRole', function ($q) {
                    $q->where('is_manager', true);
                })
                ->with(['user', 'hierarchicalRole'])
                ->get()
                ->map(function ($hierarchy) {
                    return [
                        'id' => $hierarchy->user->id,
                        'name' => $hierarchy->user->name,
                        'email' => $hierarchy->user->email,
                        'role' => $hierarchy->hierarchicalRole->name,
                        'role_code' => $hierarchy->hierarchicalRole->code,
                        'hierarchy_level' => $hierarchy->hierarchicalRole->hierarchy_level,
                    ];
                });

            return response()->json([
                'success' => true,
                'managers' => $managers,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching available managers', [
                'program_id' => $programId,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch available managers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Assign manager to a user
     * POST /api/hierarchy/assign-manager
     */
    public function assignManager(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'program_id' => 'required|exists:programs,id',
            'manager_user_id' => 'required|exists:users,id|different:user_id',
            'hierarchical_role_id' => 'required|exists:hierarchical_roles,id',
            'reason' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $hierarchy = $this->hierarchyService->assignManager(
                $request->user_id,
                $request->program_id,
                $request->manager_user_id,
                $request->hierarchical_role_id,
                Auth::id(),
                $request->reason
            );

            return response()->json([
                'success' => true,
                'message' => 'Manager assigned successfully',
                'hierarchy' => $hierarchy->load(['user', 'manager', 'hierarchicalRole', 'program']),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error assigning manager', [
                'user_id' => $request->user_id,
                'manager_id' => $request->manager_user_id,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Remove manager from a user
     * DELETE /api/hierarchy/remove-manager
     */
    public function removeManager(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'program_id' => 'required|exists:programs,id',
            'reason' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $this->hierarchyService->removeManager(
                $request->user_id,
                $request->program_id,
                Auth::id(),
                $request->reason
            );

            return response()->json([
                'success' => true,
                'message' => 'Manager removed successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Error removing manager', [
                'user_id' => $request->user_id,
                'program_id' => $request->program_id,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get hierarchy for a program
     * GET /api/hierarchy/programs/{programId}/tree
     */
    public function getHierarchyTree($programId)
    {
        try {
            $tree = $this->hierarchyService->getHierarchyTree($programId);

            return response()->json([
                'success' => true,
                'program_id' => $programId,
                'hierarchy' => $tree,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching hierarchy tree', [
                'program_id' => $programId,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch hierarchy tree',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user's hierarchy info
     * GET /api/hierarchy/users/{userId}/info
     */
    public function getUserHierarchy($userId, Request $request)
    {
        try {
            $programId = $request->query('program_id');

            if (!$programId) {
                return response()->json([
                    'success' => false,
                    'message' => 'program_id is required',
                ], 400);
            }

            $user = User::findOrFail($userId);
            $hierarchy = UserRoleHierarchy::where('user_id', $userId)
                ->where('program_id', $programId)
                ->with(['hierarchicalRole', 'manager', 'program'])
                ->first();

            if (!$hierarchy) {
                return response()->json([
                    'success' => true,
                    'user' => $user,
                    'hierarchy' => null,
                    'message' => 'No hierarchy assigned for this user in the specified program',
                ]);
            }

            // Get direct reports
            $directReports = $this->hierarchyService->getManagerTeam($userId, $programId);
            
            // Get all subordinates
            $allSubordinates = $this->hierarchyService->getAllSubordinates($userId, $programId);

            return response()->json([
                'success' => true,
                'user' => $user,
                'hierarchy' => $hierarchy,
                'manager' => $hierarchy->manager,
                'role' => $hierarchy->hierarchicalRole,
                'direct_reports' => $directReports,
                'direct_reports_count' => $directReports->count(),
                'total_subordinates_count' => count($allSubordinates),
                'is_manager' => $hierarchy->hierarchicalRole->is_manager ?? false,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching user hierarchy', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch user hierarchy',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check if assignment would create circular reference
     * POST /api/hierarchy/validate-assignment
     */
    public function validateAssignment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'manager_user_id' => 'required|exists:users,id',
            'program_id' => 'required|exists:programs,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $wouldBeCircular = $this->hierarchyService->wouldCreateCircularReference(
                $request->user_id,
                $request->manager_user_id,
                $request->program_id
            );

            return response()->json([
                'success' => true,
                'valid' => !$wouldBeCircular,
                'would_create_circular_reference' => $wouldBeCircular,
                'message' => $wouldBeCircular 
                    ? 'This assignment would create a circular reporting structure' 
                    : 'Assignment is valid',
            ]);
        } catch (\Exception $e) {
            Log::error('Error validating assignment', [
                'user_id' => $request->user_id,
                'manager_id' => $request->manager_user_id,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to validate assignment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get manager's team
     * GET /api/hierarchy/managers/{managerId}/team
     */
    public function getManagerTeam($managerId, Request $request)
    {
        try {
            $programId = $request->query('program_id');

            if (!$programId) {
                return response()->json([
                    'success' => false,
                    'message' => 'program_id is required',
                ], 400);
            }

            $team = $this->hierarchyService->getManagerTeam($managerId, $programId);
            $statistics = $this->hierarchyService->getTeamStatistics($managerId, $programId);

            return response()->json([
                'success' => true,
                'manager_id' => $managerId,
                'program_id' => $programId,
                'team' => $team->map(function ($hierarchy) {
                    return [
                        'id' => $hierarchy->user->id,
                        'name' => $hierarchy->user->name,
                        'email' => $hierarchy->user->email,
                        'role' => $hierarchy->hierarchicalRole->name ?? null,
                        'status' => $hierarchy->user->status,
                        'assigned_at' => $hierarchy->assigned_at,
                    ];
                }),
                'statistics' => $statistics,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching manager team', [
                'manager_id' => $managerId,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch manager team',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update manager dashboard access
     * PUT /api/hierarchy/managers/{managerId}/dashboard-access
     */
    public function updateDashboardAccess($managerId, Request $request)
    {
        $validator = Validator::make($request->all(), [
            'program_id' => 'required|exists:programs,id',
            'can_view_activities' => 'boolean',
            'can_view_events' => 'boolean',
            'can_view_questionnaires' => 'boolean',
            'can_view_notifications' => 'boolean',
            'can_export_reports' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $access = ManagerDashboardAccess::updateOrCreate(
                [
                    'manager_user_id' => $managerId,
                    'program_id' => $request->program_id,
                ],
                $request->only([
                    'can_view_activities',
                    'can_view_events',
                    'can_view_questionnaires',
                    'can_view_notifications',
                    'can_export_reports',
                ])
            );

            return response()->json([
                'success' => true,
                'message' => 'Dashboard access updated successfully',
                'access' => $access,
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating dashboard access', [
                'manager_id' => $managerId,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to update dashboard access',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get manager dashboard access
     * GET /api/hierarchy/managers/{managerId}/dashboard-access
     */
    public function getDashboardAccess($managerId, Request $request)
    {
        try {
            $programId = $request->query('program_id');

            if (!$programId) {
                return response()->json([
                    'success' => false,
                    'message' => 'program_id is required',
                ], 400);
            }

            $access = ManagerDashboardAccess::where('manager_user_id', $managerId)
                ->where('program_id', $programId)
                ->first();

            if (!$access) {
                // Return default access settings
                return response()->json([
                    'success' => true,
                    'access' => [
                        'manager_user_id' => $managerId,
                        'program_id' => $programId,
                        'can_view_activities' => true,
                        'can_view_events' => true,
                        'can_view_questionnaires' => true,
                        'can_view_notifications' => true,
                        'can_export_reports' => true,
                    ],
                    'message' => 'Using default access settings',
                ]);
            }

            return response()->json([
                'success' => true,
                'access' => $access,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching dashboard access', [
                'manager_id' => $managerId,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dashboard access',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get hierarchy change logs
     * GET /api/hierarchy/change-logs
     */
    public function getChangeLogs(Request $request)
    {
        try {
            $query = \App\Models\HierarchyChangeLog::with([
                'user',
                'program',
                'oldManager',
                'newManager',
                'changedBy'
            ]);

            // Filter by user
            if ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            // Filter by program
            if ($request->has('program_id')) {
                $query->where('program_id', $request->program_id);
            }

            // Filter by change type
            if ($request->has('change_type')) {
                $query->where('change_type', $request->change_type);
            }

            // Filter by date range
            if ($request->has('start_date')) {
                $query->where('created_at', '>=', $request->start_date);
            }
            if ($request->has('end_date')) {
                $query->where('created_at', '<=', $request->end_date);
            }

            $logs = $query->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 20));

            return response()->json([
                'success' => true,
                'logs' => $logs,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching change logs', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch change logs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get team activity analytics
     * GET /api/hierarchy/managers/{managerId}/analytics
     */
    public function getTeamAnalytics(Request $request, $managerId)
    {
        try {
            $programId = $request->get('program_id');
            $startDate = $request->get('start_date');
            $endDate = $request->get('end_date');

            // Get all team members (direct and indirect reports)
            $teamMembers = $this->hierarchyService->getAllSubordinates($managerId, $programId);
            $teamMemberIds = collect($teamMembers)->pluck('id')->toArray();

            // Get activity participation stats
            $activityStats = DB::table('event_participants')
                ->select(
                    DB::raw('COUNT(DISTINCT event_id) as total_activities'),
                    DB::raw('COUNT(DISTINCT CASE WHEN status = "completed" THEN event_id END) as completed_activities'),
                    DB::raw('COUNT(DISTINCT CASE WHEN status = "in_progress" THEN event_id END) as in_progress_activities'),
                    DB::raw('COUNT(DISTINCT CASE WHEN status = "not_started" THEN event_id END) as pending_activities')
                )
                ->whereIn('user_id', $teamMemberIds)
                ->when($startDate, function ($q) use ($startDate) {
                    return $q->where('created_at', '>=', $startDate);
                })
                ->when($endDate, function ($q) use ($endDate) {
                    return $q->where('created_at', '<=', $endDate);
                })
                ->first();

            // Get notification stats
            $notificationStats = DB::table('notifications')
                ->select(
                    DB::raw('COUNT(*) as total_sent'),
                    DB::raw('COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as total_read'),
                    DB::raw('ROUND(COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as read_rate')
                )
                ->whereIn('user_id', $teamMemberIds)
                ->when($startDate, function ($q) use ($startDate) {
                    return $q->where('created_at', '>=', $startDate);
                })
                ->when($endDate, function ($q) use ($endDate) {
                    return $q->where('created_at', '<=', $endDate);
                })
                ->first();

            // Get top performers (by activity completion)
            $topPerformers = DB::table('event_participants')
                ->select(
                    'users.id',
                    'users.name',
                    'users.email',
                    DB::raw('COUNT(CASE WHEN event_participants.status = "completed" THEN 1 END) as completed_count')
                )
                ->join('users', 'event_participants.user_id', '=', 'users.id')
                ->whereIn('event_participants.user_id', $teamMemberIds)
                ->when($startDate, function ($q) use ($startDate) {
                    return $q->where('event_participants.created_at', '>=', $startDate);
                })
                ->when($endDate, function ($q) use ($endDate) {
                    return $q->where('event_participants.created_at', '<=', $endDate);
                })
                ->groupBy('users.id', 'users.name', 'users.email')
                ->orderByDesc('completed_count')
                ->limit(10)
                ->get();

            // Get activity completion trend (last 7 days)
            $completionTrend = DB::table('event_participants')
                ->select(
                    DB::raw('DATE(completed_at) as date'),
                    DB::raw('COUNT(*) as count')
                )
                ->whereIn('user_id', $teamMemberIds)
                ->where('status', 'completed')
                ->where('completed_at', '>=', now()->subDays(7))
                ->groupBy(DB::raw('DATE(completed_at)'))
                ->orderBy('date')
                ->get();

            return response()->json([
                'success' => true,
                'analytics' => [
                    'team_size' => count($teamMemberIds),
                    'activity_stats' => $activityStats,
                    'notification_stats' => $notificationStats,
                    'top_performers' => $topPerformers,
                    'completion_trend' => $completionTrend,
                    'date_range' => [
                        'start' => $startDate,
                        'end' => $endDate
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching team analytics', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch team analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get team member details
     * GET /api/hierarchy/team-members/{memberId}
     */
    public function getTeamMemberDetails(Request $request, $memberId)
    {
        try {
            $user = User::with([
                'hierarchicalRole',
                'manager',
                'roleHierarchies.program'
            ])->findOrFail($memberId);

            // Verify requesting user is the manager
            $requestingUserId = Auth::id();
            if (!$this->hierarchyService->isUserInManagerChain($memberId, $requestingUserId)) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have permission to view this team member'
                ], 403);
            }

            // Get activity stats for this member
            $activityStats = DB::table('event_participants')
                ->select(
                    DB::raw('COUNT(*) as total_assigned'),
                    DB::raw('COUNT(CASE WHEN status = "completed" THEN 1 END) as completed'),
                    DB::raw('COUNT(CASE WHEN status = "in_progress" THEN 1 END) as in_progress'),
                    DB::raw('COUNT(CASE WHEN status = "not_started" THEN 1 END) as not_started'),
                    DB::raw('ROUND(AVG(CASE WHEN status = "completed" AND score IS NOT NULL THEN score END), 2) as avg_score')
                )
                ->where('user_id', $memberId)
                ->first();

            // Get recent activities
            $recentActivities = DB::table('event_participants')
                ->select('events.id', 'events.name', 'event_participants.status', 'event_participants.completed_at', 'event_participants.score')
                ->join('events', 'event_participants.event_id', '=', 'events.id')
                ->where('event_participants.user_id', $memberId)
                ->orderBy('event_participants.updated_at', 'desc')
                ->limit(10)
                ->get();

            // Get notification stats
            $notificationStats = DB::table('notifications')
                ->select(
                    DB::raw('COUNT(*) as total_received'),
                    DB::raw('COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as read_count')
                )
                ->where('user_id', $memberId)
                ->first();

            return response()->json([
                'success' => true,
                'member' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'hierarchical_role' => $user->hierarchicalRole,
                    'manager' => $user->manager,
                    'programs' => $user->roleHierarchies->map(function ($rh) {
                        return $rh->program;
                    }),
                    'activity_stats' => $activityStats,
                    'recent_activities' => $recentActivities,
                    'notification_stats' => $notificationStats
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching team member details', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch team member details',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send notification to team members
     * POST /api/hierarchy/managers/{managerId}/send-notification
     */
    public function sendTeamNotification(Request $request, $managerId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'program_id' => 'nullable|exists:programs,id',
                'recipient_ids' => 'nullable|array',
                'recipient_ids.*' => 'exists:users,id',
                'subject' => 'required|string|max:255',
                'message' => 'required|string',
                'send_email' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Get team members to notify
            $recipientIds = $request->get('recipient_ids');
            if (empty($recipientIds)) {
                // Send to all team members
                $programId = $request->get('program_id');
                $teamMembers = $this->hierarchyService->getAllSubordinates($managerId, $programId);
                $recipientIds = collect($teamMembers)->pluck('id')->toArray();
            }

            // Verify all recipients are in manager's team
            foreach ($recipientIds as $recipientId) {
                if (!$this->hierarchyService->isUserInManagerChain($recipientId, $managerId)) {
                    return response()->json([
                        'success' => false,
                        'message' => "User $recipientId is not in your team"
                    ], 403);
                }
            }

            $sender = User::find($managerId);
            $subject = $request->get('subject');
            $message = $request->get('message');
            $sendEmail = $request->boolean('send_email', false);

            $sentCount = 0;
            foreach ($recipientIds as $recipientId) {
                // Create in-app notification
                DB::table('notifications')->insert([
                    'user_id' => $recipientId,
                    'type' => 'manager_message',
                    'title' => $subject,
                    'message' => $message,
                    'from_user_id' => $managerId,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                // TODO: Send email if requested
                // if ($sendEmail) {
                //     Mail::to($recipient)->send(new ManagerNotification($subject, $message, $sender));
                // }

                $sentCount++;
            }

            return response()->json([
                'success' => true,
                'message' => "Notification sent to $sentCount team member(s)",
                'sent_count' => $sentCount
            ]);
        } catch (\Exception $e) {
            Log::error('Error sending team notification', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to send notification',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
