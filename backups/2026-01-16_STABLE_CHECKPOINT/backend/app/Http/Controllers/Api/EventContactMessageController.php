<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventContactMessage;
use App\Models\Activity;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\EmailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class EventContactMessageController extends Controller
{
    protected $emailService;

    public function __construct(EmailService $emailService)
    {
        $this->emailService = $emailService;
    }

    /**
     * Get all contact messages (Admin/Super Admin only)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Only admin and super-admin can view messages
        if (!in_array($user->role, ['super-admin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $query = EventContactMessage::with(['activity', 'participant'])
            ->orderBy('created_at', 'desc');

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by activity
        if ($request->has('activity_id')) {
            $query->where('activity_id', $request->activity_id);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('activity_name', 'ilike', "%{$search}%")
                  ->orWhere('message', 'ilike', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 20);
        $messages = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $messages
        ]);
    }

    /**
     * Get a single contact message
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        
        if (!in_array($user->role, ['super-admin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $message = EventContactMessage::with(['activity', 'participant'])->find($id);

        if (!$message) {
            return response()->json([
                'success' => false,
                'message' => 'Message not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $message
        ]);
    }

    /**
     * Submit a contact message (Public - for participants/anonymous users)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'activity_id' => 'required|uuid|exists:activities,id',
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'message' => 'required|string|max:5000',
            'participant_id' => 'nullable|uuid|exists:participants,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check if activity exists and has contact_us_enabled
        $activity = Activity::find($request->activity_id);
        
        if (!$activity) {
            return response()->json([
                'success' => false,
                'message' => 'Activity not found'
            ], 404);
        }

        if (!$activity->contact_us_enabled) {
            return response()->json([
                'success' => false,
                'message' => 'Contact Us is not enabled for this event'
            ], 403);
        }

        // Rate limiting for anonymous users (max 3 per hour per email)
        $cacheKey = 'contact_us_rate_' . md5($request->email);
        $attempts = Cache::get($cacheKey, 0);
        
        if ($attempts >= 3) {
            return response()->json([
                'success' => false,
                'message' => 'Too many messages. Please try again later.'
            ], 429);
        }

        // Determine user type
        $userType = $request->participant_id 
            ? EventContactMessage::USER_TYPE_PARTICIPANT 
            : EventContactMessage::USER_TYPE_ANONYMOUS;

        // Create the message
        $contactMessage = EventContactMessage::create([
            'activity_id' => $request->activity_id,
            'activity_name' => $activity->name,
            'user_type' => $userType,
            'participant_id' => $request->participant_id,
            'name' => $request->name,
            'email' => $request->email,
            'message' => $request->message,
            'status' => EventContactMessage::STATUS_NEW,
        ]);

        // Update rate limit
        Cache::put($cacheKey, $attempts + 1, now()->addHour());

        // Send notifications to admins
        $this->notifyAdmins($contactMessage, $activity);

        // Send confirmation email to sender
        $this->sendConfirmationEmail($contactMessage, $activity);

        Log::info('Event contact message submitted', [
            'message_id' => $contactMessage->id,
            'activity_id' => $activity->id,
            'user_type' => $userType,
            'email' => $request->email,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Your message has been sent successfully. We will get back to you soon.',
            'data' => $contactMessage
        ], 201);
    }

    /**
     * Mark message as read
     */
    public function markAsRead(Request $request, $id)
    {
        $user = $request->user();
        
        if (!in_array($user->role, ['super-admin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $message = EventContactMessage::find($id);

        if (!$message) {
            return response()->json([
                'success' => false,
                'message' => 'Message not found'
            ], 404);
        }

        $message->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'Message marked as read',
            'data' => $message
        ]);
    }

    /**
     * Mark message as responded
     */
    public function markAsResponded(Request $request, $id)
    {
        $user = $request->user();
        
        if (!in_array($user->role, ['super-admin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $message = EventContactMessage::find($id);

        if (!$message) {
            return response()->json([
                'success' => false,
                'message' => 'Message not found'
            ], 404);
        }

        $message->markAsResponded();

        return response()->json([
            'success' => true,
            'message' => 'Message marked as responded',
            'data' => $message
        ]);
    }

    /**
     * Get unread count
     */
    public function unreadCount(Request $request)
    {
        $user = $request->user();
        
        if (!in_array($user->role, ['super-admin', 'admin'])) {
            return response()->json([
                'success' => true,
                'data' => ['count' => 0]
            ]);
        }

        $count = EventContactMessage::unread()->count();

        return response()->json([
            'success' => true,
            'data' => ['count' => $count]
        ]);
    }

    /**
     * Delete a message
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        
        if (!in_array($user->role, ['super-admin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $message = EventContactMessage::find($id);

        if (!$message) {
            return response()->json([
                'success' => false,
                'message' => 'Message not found'
            ], 404);
        }

        $message->delete();

        return response()->json([
            'success' => true,
            'message' => 'Message deleted successfully'
        ]);
    }

    /**
     * Notify admins about new contact message
     */
    private function notifyAdmins(EventContactMessage $contactMessage, Activity $activity)
    {
        // Get all super admins and admins
        $admins = User::whereIn('role', ['super-admin', 'admin'])->get();

        foreach ($admins as $admin) {
            // Create in-app notification
            UserNotification::create([
                'user_id' => $admin->id,
                'type' => 'event_contact',
                'title' => 'New Contact Us Message',
                'message' => "New message from {$contactMessage->name} for Event: {$activity->name}",
                'entity_type' => 'event_contact',
                'entity_id' => $contactMessage->id,
                'entity_name' => $activity->name,
                'action_url' => "/settings/event-contact-messages",
            ]);

            // Send email notification
            $this->sendAdminNotificationEmail($admin, $contactMessage, $activity);
        }
    }

    /**
     * Send confirmation email to the sender
     */
    private function sendConfirmationEmail(EventContactMessage $contactMessage, Activity $activity)
    {
        $subject = "Thank you for contacting us - {$activity->name}";
        
        $message = "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
            <h2 style='color: #4F46E5;'>Thank You for Your Message</h2>
            
            <p>Dear {$contactMessage->name},</p>
            
            <p>We have received your message regarding <strong>{$activity->name}</strong>. Our team will review it and get back to you as soon as possible.</p>
            
            <div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                <h3 style='margin-top: 0;'>Your Message</h3>
                <p style='white-space: pre-wrap;'>{$contactMessage->message}</p>
            </div>
            
            <p>If you have any urgent concerns, please don't hesitate to reach out to our support team.</p>
            
            <p style='color: #666; font-size: 14px; margin-top: 30px;'>
                Best regards,<br>
                The QSights Team
            </p>
        </div>
        ";
        
        try {
            $this->emailService->send($contactMessage->email, $subject, $message, [
                'event' => 'event_contact_confirmation',
                'contact_message_id' => $contactMessage->id,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send contact confirmation email', [
                'email' => $contactMessage->email,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Send notification email to admin
     */
    private function sendAdminNotificationEmail($admin, EventContactMessage $contactMessage, Activity $activity)
    {
        $recipientEmail = $admin->communication_email ?: $admin->email;
        
        $subject = "New Contact Us Message - {$activity->name}";
        
        $userTypeLabel = $contactMessage->isAnonymous() ? 'Anonymous User' : 'Participant';
        
        $message = "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
            <h2 style='color: #4F46E5;'>New Contact Us Message</h2>
            
            <p>A new message has been received for Event: <strong>{$activity->name}</strong></p>
            
            <div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                <h3 style='margin-top: 0;'>Message Details</h3>
                <p><strong>From:</strong> {$contactMessage->name} ({$userTypeLabel})</p>
                <p><strong>Email:</strong> <a href='mailto:{$contactMessage->email}'>{$contactMessage->email}</a></p>
                <p><strong>Event:</strong> {$activity->name}</p>
                <p><strong>Received:</strong> " . $contactMessage->created_at->format('F j, Y g:i A') . "</p>
                <p><strong>Message:</strong></p>
                <p style='white-space: pre-wrap; background: white; padding: 10px; border-radius: 4px;'>{$contactMessage->message}</p>
            </div>
            
            <a href='" . config('app.frontend_url') . "/settings/event-contact-messages' 
               style='display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;'>
                View All Messages
            </a>
            
            <p style='color: #666; font-size: 14px; margin-top: 30px;'>
                This is an automated notification from QSights Platform.
            </p>
        </div>
        ";
        
        try {
            $this->emailService->send($recipientEmail, $subject, $message, [
                'event' => 'event_contact_admin_notification',
                'contact_message_id' => $contactMessage->id,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send admin notification email', [
                'admin_email' => $recipientEmail,
                'error' => $e->getMessage()
            ]);
        }
    }
}
