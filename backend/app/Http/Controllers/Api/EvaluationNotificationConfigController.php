<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvaluationNotificationConfig;
use App\Models\EvaluationNotificationLog;
use App\Models\EvaluationBellNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EvaluationNotificationConfigController extends Controller
{
    /**
     * Get notification configuration for a program
     */
    public function getConfig(Request $request)
    {
        $user = $request->user();
        $programId = $request->query('program_id') ?? $user->program_id;

        if (!$programId) {
            return response()->json([
                'success' => false,
                'message' => 'Program ID is required'
            ], 400);
        }

        // Check authorization
        if (!$this->canManageNotifications($user, $programId)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to view notification settings'
            ], 403);
        }

        $config = EvaluationNotificationConfig::getForProgram($programId);

        return response()->json([
            'success' => true,
            'config' => $config
        ]);
    }

    /**
     * Update notification configuration
     */
    public function updateConfig(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'program_id' => 'required|uuid|exists:programs,id',
            'enable_trigger_notifications' => 'boolean',
            'enable_completion_notifications' => 'boolean',
            'enable_missed_deadline_alerts' => 'boolean',
            'enable_automatic_reminders' => 'boolean',
            'reminder_schedule' => 'array',
            'reminder_schedule.*' => 'integer|min:1|max:30',
            'trigger_email_template' => 'nullable|string',
            'completion_email_template' => 'nullable|string',
            'missed_deadline_template' => 'nullable|string',
            'reminder_email_template' => 'nullable|string',
        ]);

        // Check authorization
        if (!$this->canManageNotifications($user, $validated['program_id'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to modify notification settings'
            ], 403);
        }

        $config = EvaluationNotificationConfig::updateOrCreate(
            ['program_id' => $validated['program_id']],
            $validated
        );

        return response()->json([
            'success' => true,
            'message' => 'Notification configuration updated successfully',
            'config' => $config
        ]);
    }

    /**
     * Get notification logs with filters
     */
    public function getNotificationLogs(Request $request)
    {
        $user = $request->user();
        $programId = $request->query('program_id') ?? $user->program_id;

        if (!$programId) {
            return response()->json([
                'success' => false,
                'message' => 'Program ID is required'
            ], 400);
        }

        // Check authorization
        if (!$this->canViewNotifications($user, $programId)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to view notification logs'
            ], 403);
        }

        $query = EvaluationNotificationLog::where('program_id', $programId);

        // Apply filters
        if ($request->has('notification_type')) {
            $query->where('notification_type', $request->notification_type);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('evaluation_triggered_id')) {
            $query->where('evaluation_triggered_id', $request->evaluation_triggered_id);
        }

        if ($request->has('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('created_at', '<=', $request->date_to . ' 23:59:59');
        }

        // Get paginated results
        $logs = $query->orderBy('created_at', 'desc')
                     ->paginate($request->per_page ?? 20);

        // Get statistics
        $stats = [
            'total' => EvaluationNotificationLog::where('program_id', $programId)->count(),
            'sent' => EvaluationNotificationLog::where('program_id', $programId)->where('status', 'sent')->count(),
            'pending' => EvaluationNotificationLog::where('program_id', $programId)->where('status', 'pending')->count(),
            'failed' => EvaluationNotificationLog::where('program_id', $programId)->where('status', 'failed')->count(),
        ];

        return response()->json([
            'success' => true,
            'logs' => $logs,
            'stats' => $stats
        ]);
    }

    /**
     * Get bell notifications for current user
     */
    public function getBellNotifications(Request $request)
    {
        $user = $request->user();

        $query = EvaluationBellNotification::forUser($user->id);

        // Filter by read/unread
        if ($request->has('is_read')) {
            if ($request->is_read === 'false' || $request->is_read === '0') {
                $query->unread();
            } else {
                $query->where('is_read', true);
            }
        }

        // Get recent notifications (last 30 days)
        $query->where('created_at', '>=', now()->subDays(30));

        $notifications = $query->orderBy('created_at', 'desc')
                              ->limit(50)
                              ->get();

        $unreadCount = EvaluationBellNotification::forUser($user->id)
                                                 ->unread()
                                                 ->count();

        return response()->json([
            'success' => true,
            'notifications' => $notifications,
            'unread_count' => $unreadCount
        ]);
    }

    /**
     * Mark bell notification as read
     */
    public function markNotificationAsRead(Request $request, $id)
    {
        $user = $request->user();

        $notification = EvaluationBellNotification::where('id', $id)
                                                  ->where('user_id', $user->id)
                                                  ->first();

        if (!$notification) {
            return response()->json([
                'success' => false,
                'message' => 'Notification not found'
            ], 404);
        }

        $notification->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read'
        ]);
    }

    /**
     * Mark all notifications as read for current user
     */
    public function markAllAsRead(Request $request)
    {
        $user = $request->user();

        EvaluationBellNotification::forUser($user->id)
                                  ->unread()
                                  ->update([
                                      'is_read' => true,
                                      'read_at' => now()
                                  ]);

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read'
        ]);
    }

    /**
     * Get notification statistics
     */
    public function getStats(Request $request)
    {
        $user = $request->user();
        $programId = $request->query('program_id') ?? $user->program_id;

        if (!$programId) {
            return response()->json([
                'success' => false,
                'message' => 'Program ID is required'
            ], 400);
        }

        // Check authorization
        if (!$this->canViewNotifications($user, $programId)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to view notification statistics'
            ], 403);
        }

        // Notification logs stats
        $emailStats = [
            'total_sent' => EvaluationNotificationLog::where('program_id', $programId)
                                                    ->where('status', 'sent')
                                                    ->count(),
            'pending' => EvaluationNotificationLog::where('program_id', $programId)
                                                 ->where('status', 'pending')
                                                 ->count(),
            'failed' => EvaluationNotificationLog::where('program_id', $programId)
                                                ->where('status', 'failed')
                                                ->count(),
            'by_type' => EvaluationNotificationLog::where('program_id', $programId)
                                                  ->select('notification_type', DB::raw('count(*) as count'))
                                                  ->groupBy('notification_type')
                                                  ->pluck('count', 'notification_type')
        ];

        // Bell notifications stats for admins
        $bellStats = [
            'total' => EvaluationBellNotification::where('program_id', $programId)->count(),
            'unread' => EvaluationBellNotification::where('program_id', $programId)
                                                  ->where('is_read', false)
                                                  ->count(),
            'by_type' => EvaluationBellNotification::where('program_id', $programId)
                                                   ->select('notification_type', DB::raw('count(*) as count'))
                                                   ->groupBy('notification_type')
                                                   ->pluck('count', 'notification_type')
        ];

        return response()->json([
            'success' => true,
            'email_stats' => $emailStats,
            'bell_stats' => $bellStats
        ]);
    }

    /**
     * Check if user can manage notifications for a program
     */
    protected function canManageNotifications($user, $programId)
    {
        return $user->role === 'super-admin' || 
               $user->role === 'evaluation-admin' ||
               ($user->role === 'program-admin' && $user->program_id === $programId);
    }

    /**
     * Check if user can view notifications for a program
     */
    protected function canViewNotifications($user, $programId)
    {
        return $user->role === 'super-admin' || 
               $user->role === 'evaluation-admin' ||
               ($user->role === 'program-admin' && $user->program_id === $programId);
    }
}
