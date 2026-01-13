<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserNotificationController extends Controller
{
    /**
     * Get all notifications for the authenticated user.
     */
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 50);
        
        $notifications = UserNotification::forUser(Auth::id())
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => $notifications->items(),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
            ]
        ]);
    }

    /**
     * Get unread notification count.
     */
    public function unreadCount()
    {
        $count = UserNotification::forUser(Auth::id())
            ->unread()
            ->count();

        return response()->json(['count' => $count]);
    }

    /**
     * Mark a notification as read.
     */
    public function markAsRead(string $id)
    {
        $notification = UserNotification::forUser(Auth::id())
            ->findOrFail($id);

        $notification->markAsRead();

        return response()->json([
            'message' => 'Notification marked as read',
            'data' => $notification
        ]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead()
    {
        UserNotification::forUser(Auth::id())
            ->unread()
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json([
            'message' => 'All notifications marked as read'
        ]);
    }

    /**
     * Delete a notification.
     */
    public function destroy(string $id)
    {
        $notification = UserNotification::forUser(Auth::id())
            ->findOrFail($id);

        $notification->delete();

        return response()->json([
            'message' => 'Notification deleted successfully'
        ]);
    }

    /**
     * Create a notification (typically called internally or by system).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'type' => 'required|in:approval_request,approval_pending,approval_approved,approval_rejected,activity_assigned,activity_completed,reminder,event_update',
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'entity_type' => 'required|in:activity,event,approval,program,participant',
            'entity_id' => 'nullable|string',
            'entity_name' => 'nullable|string',
            'action_url' => 'nullable|string',
        ]);

        $notification = UserNotification::create($validated);

        return response()->json([
            'message' => 'Notification created successfully',
            'data' => $notification
        ], 201);
    }

    /**
     * Bulk create notifications for multiple users.
     */
    public function bulkStore(Request $request)
    {
        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
            'type' => 'required|in:approval_request,approval_pending,approval_approved,approval_rejected,activity_assigned,activity_completed,reminder,event_update',
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'entity_type' => 'required|in:activity,event,approval,program,participant',
            'entity_id' => 'nullable|string',
            'entity_name' => 'nullable|string',
            'action_url' => 'nullable|string',
        ]);

        $userIds = $validated['user_ids'];
        unset($validated['user_ids']);

        $notifications = [];
        foreach ($userIds as $userId) {
            $notifications[] = UserNotification::create([
                'user_id' => $userId,
                ...$validated
            ]);
        }

        return response()->json([
            'message' => 'Notifications created successfully',
            'data' => $notifications,
            'count' => count($notifications)
        ], 201);
    }
}
