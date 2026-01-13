<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Participant;
use App\Models\UserNotification;
use App\Models\User;
use App\Models\DemoRequest;
use App\Models\ContactSales;
use App\Models\ContactRequest;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    protected $emailService;
    protected $smsService;

    public function __construct(EmailService $emailService, SMSService $smsService)
    {
        $this->emailService = $emailService;
        $this->smsService = $smsService;
    }

    // ========== IN-APP NOTIFICATION METHODS ==========

    /**
     * Create notification for approval request (sent to super admins).
     */
    public function createApprovalRequest(Activity $activity, User $requester)
    {
        // Get all super admins
        $superAdmins = User::where('role', 'super-admin')->get();

        foreach ($superAdmins as $admin) {
            UserNotification::create([
                'user_id' => $admin->id,
                'type' => 'approval_request',
                'title' => 'New Event Approval Request',
                'message' => "{$requester->name} has submitted \"{$activity->name}\" for approval.",
                'entity_type' => 'approval',
                'entity_id' => $activity->id,
                'entity_name' => $activity->name,
                'action_url' => "/activities/approvals/{$activity->id}",
            ]);
        }

        Log::info('Approval request notifications created', [
            'activity_id' => $activity->id,
            'requester' => $requester->id,
            'recipients' => $superAdmins->count()
        ]);
    }

    /**
     * Create notification for pending approval (sent to requester).
     */
    public function createApprovalPending(Activity $activity, User $requester)
    {
        UserNotification::create([
            'user_id' => $requester->id,
            'type' => 'approval_pending',
            'title' => 'Event Approval Pending',
            'message' => "Your event \"{$activity->name}\" has been submitted for approval and is awaiting review.",
            'entity_type' => 'approval',
            'entity_id' => $activity->id,
            'entity_name' => $activity->name,
            'action_url' => "/activities/approvals/{$activity->id}",
        ]);
    }

    /**
     * Create notification for approved event.
     */
    public function createApprovalApproved(Activity $activity, User $requester, User $approver)
    {
        UserNotification::create([
            'user_id' => $requester->id,
            'type' => 'approval_approved',
            'title' => 'Event Approved!',
            'message' => "Great news! Your event \"{$activity->name}\" has been approved by {$approver->name}.",
            'entity_type' => 'activity',
            'entity_id' => $activity->id,
            'entity_name' => $activity->name,
            'action_url' => "/activities",
        ]);
    }

    /**
     * Create notification for rejected event.
     */
    public function createApprovalRejected(Activity $activity, User $requester, User $rejector, ?string $reason = null)
    {
        $message = "Your event \"{$activity->name}\" was not approved by {$rejector->name}.";
        if ($reason) {
            $message .= " Reason: {$reason}";
        }

        UserNotification::create([
            'user_id' => $requester->id,
            'type' => 'approval_rejected',
            'title' => 'Event Not Approved',
            'message' => $message,
            'entity_type' => 'activity',
            'entity_id' => $activity->id,
            'entity_name' => $activity->name,
            'action_url' => "/activities",
        ]);
    }

    /**
     * Create notification for activity assigned to users.
     */
    public function createActivityAssigned(Activity $activity, array $userIds)
    {
        foreach ($userIds as $userId) {
            UserNotification::create([
                'user_id' => $userId,
                'type' => 'activity_assigned',
                'title' => 'New Activity Assigned',
                'message' => "You have been assigned to \"{$activity->name}\". Please complete it by the due date.",
                'entity_type' => 'activity',
                'entity_id' => $activity->id,
                'entity_name' => $activity->name,
                'action_url' => "/activities/take/{$activity->id}",
            ]);
        }
    }

    /**
     * Create notification for activity completed.
     */
    public function createActivityCompleted(Activity $activity, User $user)
    {
        // Notify activity creator or program admin
        if ($activity->created_by) {
            UserNotification::create([
                'user_id' => $activity->created_by,
                'type' => 'activity_completed',
                'title' => 'Activity Completed',
                'message' => "{$user->name} has completed \"{$activity->name}\".",
                'entity_type' => 'activity',
                'entity_id' => $activity->id,
                'entity_name' => $activity->name,
                'action_url' => "/activities/{$activity->id}/results",
            ]);
        }
    }

    /**
     * Create in-app reminder notification.
     */
    public function createInAppReminder(User $user, Activity $activity, string $reminderType = 'due_soon')
    {
        $messages = [
            'due_soon' => "Reminder: \"{$activity->name}\" is due soon. Please complete it at your earliest convenience.",
            'overdue' => "Your activity \"{$activity->name}\" is overdue. Please complete it as soon as possible.",
            'follow_up' => "This is a follow-up reminder for \"{$activity->name}\". Your response is important to us.",
        ];

        UserNotification::create([
            'user_id' => $user->id,
            'type' => 'reminder',
            'title' => 'Activity Reminder',
            'message' => $messages[$reminderType] ?? $messages['due_soon'],
            'entity_type' => 'activity',
            'entity_id' => $activity->id,
            'entity_name' => $activity->name,
            'action_url' => "/activities/take/{$activity->id}",
        ]);
    }

    /**
     * Create event update notification.
     */
    public function createEventUpdate(Activity $activity, array $userIds, string $updateMessage)
    {
        foreach ($userIds as $userId) {
            UserNotification::create([
                'user_id' => $userId,
                'type' => 'event_update',
                'title' => 'Event Updated',
                'message' => "Update for \"{$activity->name}\": {$updateMessage}",
                'entity_type' => 'event',
                'entity_id' => $activity->id,
                'entity_name' => $activity->name,
                'action_url' => "/activities/{$activity->id}",
            ]);
        }
    }

    // ========== EMAIL/SMS NOTIFICATION METHODS ==========

    /**
     * Notify participants about activity creation
     */
    public function notifyActivityCreated(Activity $activity, $participants = null)
    {
        if (!$participants) {
            $participants = $activity->program->participants()
                ->where('status', 'active')
                ->get();
        }

        $results = [
            'email' => ['sent' => 0, 'failed' => 0],
            'sms' => ['sent' => 0, 'failed' => 0],
        ];

        foreach ($participants as $participant) {
            // Send email if enabled
            if ($participant->email_notifications && $participant->email) {
                $result = $this->emailService->sendActivityInvitation($participant, $activity);
                $result['success'] ? $results['email']['sent']++ : $results['email']['failed']++;
            }

            // Send SMS if enabled
            if ($participant->sms_notifications && $participant->phone) {
                $result = $this->smsService->sendActivityInvitation($participant, $activity);
                $result['success'] ? $results['sms']['sent']++ : $results['sms']['failed']++;
            }
        }

        return $results;
    }

    /**
     * Send activity reminders
     */
    public function sendActivityReminders(Activity $activity, $participants = null)
    {
        if (!$participants) {
            $participants = $activity->program->participants()
                ->where('status', 'active')
                ->get();
        }

        $results = [
            'email' => ['sent' => 0, 'failed' => 0],
            'sms' => ['sent' => 0, 'failed' => 0],
        ];

        foreach ($participants as $participant) {
            // Check if participant already submitted response
            $hasResponse = $activity->responses()
                ->where('participant_id', $participant->id)
                ->where('status', 'submitted')
                ->exists();

            if ($hasResponse) {
                continue; // Skip if already submitted
            }

            // Send email reminder if enabled
            if ($participant->email_notifications && $participant->email) {
                $result = $this->emailService->sendActivityReminder($participant, $activity);
                $result['success'] ? $results['email']['sent']++ : $results['email']['failed']++;
            }

            // Send SMS reminder if enabled
            if ($participant->sms_notifications && $participant->phone) {
                $result = $this->smsService->sendActivityReminder($participant, $activity);
                $result['success'] ? $results['sms']['sent']++ : $results['sms']['failed']++;
            }
        }

        return $results;
    }

    /**
     * Send custom notification to specific participant
     */
    public function sendCustomNotification(Participant $participant, $subject, $message, $metadata = [])
    {
        $results = [];

        if ($participant->email_notifications && $participant->email) {
            $results['email'] = $this->emailService->send(
                $participant->email,
                $subject,
                $message,
                array_merge($metadata, ['participant_id' => $participant->id])
            );
        }

        if ($participant->sms_notifications && $participant->phone) {
            $results['sms'] = $this->smsService->send(
                $participant->phone,
                strip_tags($message),
                array_merge($metadata, ['participant_id' => $participant->id])
            );
        }

        return $results;
    }

    /**
     * Send thank you notification
     */
    public function sendThankYou(Activity $activity, $participants = null)
    {
        if (!$participants) {
            // Get participants who submitted responses
            $participantIds = $activity->responses()
                ->where('status', 'submitted')
                ->pluck('participant_id')
                ->unique();
            
            $participants = Participant::whereIn('id', $participantIds)
                ->where('status', 'active')
                ->get();
        }

        $results = [
            'email' => ['sent' => 0, 'failed' => 0],
            'sms' => ['sent' => 0, 'failed' => 0],
        ];

        foreach ($participants as $participant) {
            if ($participant->email_notifications && $participant->email) {
                $result = $this->emailService->sendThankYou($participant, $activity);
                $result['success'] ? $results['email']['sent']++ : $results['email']['failed']++;
            }
        }

        return $results;
    }

    /**
     * Send program expiry notification
     */
    public function sendProgramExpiry(Activity $activity, $participants = null)
    {
        if (!$participants) {
            $participants = $activity->program->participants()
                ->where('status', 'active')
                ->get();
        }

        $results = [
            'email' => ['sent' => 0, 'failed' => 0],
            'sms' => ['sent' => 0, 'failed' => 0],
        ];

        foreach ($participants as $participant) {
            if ($participant->email_notifications && $participant->email) {
                $result = $this->emailService->sendProgramExpiry($participant, $activity);
                $result['success'] ? $results['email']['sent']++ : $results['email']['failed']++;
            }
        }

        return $results;
    }

    /**
     * Send activity summary
     */
    public function sendActivitySummary(Activity $activity, $participants = null)
    {
        if (!$participants) {
            $participants = $activity->program->participants()
                ->where('status', 'active')
                ->get();
        }

        $results = [
            'email' => ['sent' => 0, 'failed' => 0],
            'sms' => ['sent' => 0, 'failed' => 0],
        ];

        foreach ($participants as $participant) {
            if ($participant->email_notifications && $participant->email) {
                $result = $this->emailService->sendActivitySummary($participant, $activity);
                $result['success'] ? $results['email']['sent']++ : $results['email']['failed']++;
            }
        }

        return $results;
    }

    // ========== DEMO REQUEST & CONTACT SALES NOTIFICATIONS ==========

    /**
     * Send notifications for demo request submission
     */
    public function notifyDemoRequestSubmission(DemoRequest $demoRequest)
    {
        // Get all super admins
        $superAdmins = User::where('role', 'super-admin')->get();

        // Create in-app notifications for all super admins
        foreach ($superAdmins as $admin) {
            UserNotification::create([
                'user_id' => $admin->id,
                'type' => 'demo_request',
                'title' => 'New Demo Request',
                'message' => "{$demoRequest->name} ({$demoRequest->email}) has requested a personalized demo from {$demoRequest->city}, {$demoRequest->country}.",
                'entity_type' => 'demo_request',
                'entity_id' => $demoRequest->id,
                'entity_name' => $demoRequest->name,
                'action_url' => "/settings/demo-requests",
            ]);

            // Send email to super admin
            $this->emailService->sendDemoRequestNotification($admin, $demoRequest);
        }

        // Send email to support@qsights.com
        $this->emailService->sendDemoRequestToSupport($demoRequest);

        Log::info('Demo request notifications sent', [
            'demo_request_id' => $demoRequest->id,
            'recipients' => $superAdmins->count() + 1, // +1 for support email
        ]);
    }

    /**
     * Send notifications for contact sales submission
     */
    public function notifyContactSalesSubmission(ContactSales $contactSales)
    {
        // Get all super admins
        $superAdmins = User::where('role', 'super-admin')->get();

        // Create in-app notifications for all super admins
        foreach ($superAdmins as $admin) {
            UserNotification::create([
                'user_id' => $admin->id,
                'type' => 'contact_sales',
                'title' => 'New Sales Inquiry',
                'message' => "{$contactSales->first_name} {$contactSales->last_name} from {$contactSales->company} has contacted the sales team.",
                'entity_type' => 'contact_sales',
                'entity_id' => $contactSales->id,
                'entity_name' => "{$contactSales->first_name} {$contactSales->last_name}",
                'action_url' => "/settings/contact-sales",
            ]);

            // Send email to super admin
            $this->emailService->sendContactSalesNotification($admin, $contactSales);
        }

        // Send emails to support@qsights.com and info@qsights.com
        $this->emailService->sendContactSalesToSupport($contactSales);

        Log::info('Contact sales notifications sent', [
            'contact_sales_id' => $contactSales->id,
            'recipients' => $superAdmins->count() + 2, // +2 for support and info emails
        ]);
    }

    /**
     * Send notifications for contact us request submission
     */
    public function notifyContactRequestSubmission(ContactRequest $contactRequest)
    {
        // Get all super admins
        $superAdmins = User::where('role', 'super-admin')->get();

        // Create in-app notifications for all super admins
        foreach ($superAdmins as $admin) {
            UserNotification::create([
                'user_id' => $admin->id,
                'type' => 'contact_request',
                'title' => 'New Contact Request',
                'message' => "{$contactRequest->name} ({$contactRequest->email}) has sent a message: " . substr($contactRequest->message, 0, 100) . (strlen($contactRequest->message) > 100 ? '...' : ''),
                'entity_type' => 'contact_request',
                'entity_id' => $contactRequest->id,
                'entity_name' => $contactRequest->name,
                'action_url' => "/settings/contact-requests",
            ]);

            // Send email to super admin
            try {
                // Use same email format as contact sales for now
                $this->emailService->sendContactSalesNotification($admin, (object)[
                    'name' => $contactRequest->name,
                    'email' => $contactRequest->email,
                    'message' => $contactRequest->message,
                    'created_at' => $contactRequest->created_at,
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to send contact request email', [
                    'error' => $e->getMessage(),
                    'admin_id' => $admin->id,
                ]);
            }
        }

        Log::info('Contact request notifications sent', [
            'contact_request_id' => $contactRequest->id,
            'recipients' => $superAdmins->count(),
        ]);
    }
}
