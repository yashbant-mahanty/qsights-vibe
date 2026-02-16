<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityApprovalRequest;
use App\Models\Activity;
use App\Models\User;
use App\Models\ManagerReviewToken;
use App\Services\NotificationService;
use App\Services\EmailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ActivityApprovalRequestController extends Controller
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Get all approval requests (filtered by role)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        $query = ActivityApprovalRequest::with([
            'program',
            'questionnaire',
            'requestedBy' => function($query) {
                $query->select('id', 'name', 'email');
            },
            'reviewedBy' => function($query) {
                $query->select('id', 'name', 'email');
            },
            'createdActivity'
        ]);

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        } else {
            // Default to pending for most users
            if (!in_array($user->role, ['super-admin', 'admin'])) {
                $query->pending();
            }
        }

        // Filter by program for program-level roles
        if ($user->program_id && in_array($user->role, ['program-admin', 'program-manager', 'program-moderator'])) {
            $query->byProgram($user->program_id);
        }

        // Filter by requested_by for program users (see own requests)
        if (in_array($user->role, ['program-admin', 'program-manager'])) {
            $query->where('requested_by', $user->id);
        }

        $requests = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($requests);
    }

    /**
     * Get single approval request
     */
    public function show($id)
    {
        $request = ActivityApprovalRequest::with([
            'program',
            'questionnaire.sections.questions',
            'requestedBy' => function($query) {
                $query->select('id', 'name', 'email');
            },
            'reviewedBy' => function($query) {
                $query->select('id', 'name', 'email');
            },
            'createdActivity'
        ])->findOrFail($id);

        return response()->json(['data' => $request]);
    }

    /**
     * Get current user's approval requests (for Program Admin/Manager)
     */
    public function myRequests(Request $request)
    {
        $user = $request->user();
        
        $query = ActivityApprovalRequest::with([
            'program',
            'questionnaire',
            'requestedBy' => function($query) {
                $query->select('id', 'name', 'email');
            },
            'reviewedBy' => function($query) {
                $query->select('id', 'name', 'email');
            },
            'createdActivity'
        ])
        ->where('requested_by', $user->id);

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $requests = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($requests);
    }

    /**
     * Create new approval request
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'program_id' => 'required|uuid|exists:programs,id',
            'questionnaire_id' => 'nullable|exists:questionnaires,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|in:survey,poll,assessment',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'close_date' => 'nullable|date|after_or_equal:end_date',
            'allow_guests' => 'nullable|boolean',
            'contact_us_enabled' => 'nullable|boolean',
            'enable_generated_links' => 'nullable|boolean',
            'is_multilingual' => 'nullable|boolean',
            'languages' => 'nullable|array',
            'settings' => 'required|array',
            'registration_form_fields' => 'required|array',
            'registration_form_fields.*.name' => 'required|string',
            'registration_form_fields.*.label' => 'required|string',
            'registration_form_fields.*.type' => 'required|string',
            'registration_form_fields.*.required' => 'required|boolean',
            'registration_form_fields.*.options' => 'nullable|array',
            'registration_form_fields.*.options.*' => 'string',
            'landing_config' => 'nullable|array',
            'time_limit_enabled' => 'nullable|boolean',
            'time_limit_minutes' => 'nullable|integer|min:1',
            'pass_percentage' => 'nullable|numeric|min:0|max:100',
            'max_retakes' => 'nullable|integer|min:0',
            // Additional details fields - OPTIONAL for approval request
            'sender_email' => 'nullable|email|max:255',
            'manager_name' => 'nullable|string|max:255',
            'manager_email' => 'nullable|email|max:255',
            'project_code' => 'nullable|string|max:255',
            'configuration_date' => 'nullable|date',
            'configuration_price' => 'nullable|numeric|min:0',
            'subscription_price' => 'nullable|numeric|min:0',
            'subscription_frequency' => 'nullable|in:one-time,monthly,quarterly,yearly',
            'tax_percentage' => 'nullable|numeric|min:0|max:100',
            'number_of_participants' => 'nullable|integer|min:0',
            'questions_to_randomize' => 'nullable|integer|min:0',
            // Link to existing draft activity (for Publish flow)
            'activity_id' => 'nullable|uuid|exists:activities,id',
        ]);

        $validated['requested_by'] = $request->user()->id;
        $validated['status'] = 'pending';

        // Determine if manager review is required
        $requiresManagerReview = !empty($validated['manager_email']);
        $validated['manager_review_status'] = $requiresManagerReview ? 'pending' : 'not_required';

        DB::beginTransaction();
        try {
            $approvalRequest = ActivityApprovalRequest::create($validated);

            // If manager review is required, send manager review email
            if ($requiresManagerReview) {
                // Generate token for manager
                $tokenData = ManagerReviewToken::generateToken(
                    $approvalRequest,
                    $validated['manager_email'],
                    null // manager_id can be null if manager is external
                );

                // Send manager review email
                $this->sendManagerReviewEmail($approvalRequest, $tokenData['token']);
            }

            // Create a temporary Activity object for notification purposes
            $tempActivity = new Activity();
            $tempActivity->id = $approvalRequest->id;
            $tempActivity->name = $approvalRequest->name;
            $tempActivity->type = $approvalRequest->type;

            // Send in-app notifications
            $this->notificationService->createApprovalRequest($tempActivity, $request->user());
            $this->notificationService->createApprovalPending($tempActivity, $request->user());

            // Send email notification to super admins
            $this->notifySuperAdmins($approvalRequest, $requiresManagerReview);

            DB::commit();

            return response()->json([
                'message' => $requiresManagerReview 
                    ? 'Activity approval request submitted. Manager review email sent.' 
                    : 'Activity approval request submitted successfully',
                'data' => $approvalRequest->load(['program', 'questionnaire', 'requestedBy']),
                'manager_review_required' => $requiresManagerReview
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to create approval request: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to create approval request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve or reject an approval request
     */
    public function review(Request $request, $id)
    {
        $user = $request->user();

        // Only super-admin and admin can review
        if (!in_array($user->role, ['super-admin', 'admin'])) {
            return response()->json([
                'message' => 'Unauthorized. Only Super Admin can review approval requests.'
            ], 403);
        }

        $validated = $request->validate([
            'action' => 'required|in:approve,reject',
            'remarks' => 'required|string|max:1000',
        ]);

        $approvalRequest = ActivityApprovalRequest::findOrFail($id);

        if (!$approvalRequest->isPending()) {
            return response()->json([
                'message' => 'This approval request has already been reviewed.'
            ], 400);
        }

        // Check if manager review is required and completed
        if ($validated['action'] === 'approve' && !$approvalRequest->isReadyForSuperAdminReview()) {
            return response()->json([
                'message' => 'Cannot approve. Manager review is pending.',
                'manager_review_status' => $approvalRequest->manager_review_status
            ], 400);
        }

        DB::beginTransaction();
        try {
            $approvalRequest->status = $validated['action'] === 'approve' ? 'approved' : 'rejected';
            $approvalRequest->remarks = $validated['remarks'];
            $approvalRequest->reviewed_by = $user->id;
            $approvalRequest->reviewed_at = Carbon::now();

            // If approved, update existing activity or create new one
            if ($validated['action'] === 'approve') {
                // Check if this approval is linked to an existing draft activity
                if ($approvalRequest->activity_id) {
                    // UPDATE existing activity to live status and sync all fields from approval request
                    $activity = Activity::findOrFail($approvalRequest->activity_id);
                    $activity->update([
                        'status' => 'live',
                        'questionnaire_id' => $approvalRequest->questionnaire_id,
                        'name' => $approvalRequest->name,
                        'description' => $approvalRequest->description,
                        'type' => $approvalRequest->type,
                        'start_date' => $approvalRequest->start_date,
                        'end_date' => $approvalRequest->end_date,
                        'close_date' => $approvalRequest->close_date,
                        'allow_guests' => $approvalRequest->allow_guests,
                        'contact_us_enabled' => $approvalRequest->contact_us_enabled ?? false,
                        'enable_generated_links' => $approvalRequest->enable_generated_links ?? false,
                        'is_multilingual' => $approvalRequest->is_multilingual,
                        'languages' => $approvalRequest->languages,
                        'settings' => $approvalRequest->settings,
                        'registration_form_fields' => $approvalRequest->registration_form_fields,
                        'landing_config' => $approvalRequest->landing_config,
                        'time_limit_enabled' => $approvalRequest->time_limit_enabled,
                        'time_limit_minutes' => $approvalRequest->time_limit_minutes,
                        'pass_percentage' => $approvalRequest->pass_percentage,
                        'max_retakes' => $approvalRequest->max_retakes,
                        'sender_email' => $approvalRequest->sender_email,
                        'manager_name' => $approvalRequest->manager_name,
                        'manager_email' => $approvalRequest->manager_email,
                        'project_code' => $approvalRequest->project_code,
                        'configuration_date' => $approvalRequest->configuration_date,
                        'configuration_price' => $approvalRequest->configuration_price,
                        'subscription_price' => $approvalRequest->subscription_price,
                        'subscription_frequency' => $approvalRequest->subscription_frequency,
                        'tax_percentage' => $approvalRequest->tax_percentage,
                        'number_of_participants' => $approvalRequest->number_of_participants,
                        'questions_to_randomize' => $approvalRequest->questions_to_randomize,
                        'approved_by' => $user->id,
                        'approved_at' => Carbon::now(),
                        'approval_comments' => $validated['remarks'],
                    ]);
                } else {
                    // Create new activity as LIVE (Published upon Super Admin approval)
                    $program = \App\Models\Program::findOrFail($approvalRequest->program_id);
                    
                    $activity = Activity::create([
                        'program_id' => $approvalRequest->program_id,
                        'organization_id' => $program->organization_id,
                        'questionnaire_id' => $approvalRequest->questionnaire_id,
                        'name' => $approvalRequest->name,
                        'description' => $approvalRequest->description,
                        'type' => $approvalRequest->type,
                        'status' => 'live', // Published directly upon Super Admin approval
                        'approved_by' => $user->id,
                        'approved_at' => Carbon::now(),
                        'approval_comments' => $validated['remarks'],
                    'start_date' => $approvalRequest->start_date,
                    'end_date' => $approvalRequest->end_date,
                    'close_date' => $approvalRequest->close_date,
                    'allow_guests' => $approvalRequest->allow_guests,
                    'contact_us_enabled' => $approvalRequest->contact_us_enabled ?? false,
                    'enable_generated_links' => $approvalRequest->enable_generated_links ?? false,
                    'is_multilingual' => $approvalRequest->is_multilingual,
                    'languages' => $approvalRequest->languages,
                    'settings' => $approvalRequest->settings,
                    'registration_form_fields' => $approvalRequest->registration_form_fields,
                    'landing_config' => $approvalRequest->landing_config,
                    'time_limit_enabled' => $approvalRequest->time_limit_enabled,
                    'time_limit_minutes' => $approvalRequest->time_limit_minutes,
                    'pass_percentage' => $approvalRequest->pass_percentage,
                    'max_retakes' => $approvalRequest->max_retakes,
                    // Additional fields
                    'sender_email' => $approvalRequest->sender_email,
                    'manager_name' => $approvalRequest->manager_name,
                    'manager_email' => $approvalRequest->manager_email,
                    'project_code' => $approvalRequest->project_code,
                    'configuration_date' => $approvalRequest->configuration_date,
                    'configuration_price' => $approvalRequest->configuration_price,
                    'subscription_price' => $approvalRequest->subscription_price,
                    'subscription_frequency' => $approvalRequest->subscription_frequency,
                    'tax_percentage' => $approvalRequest->tax_percentage,
                    'number_of_participants' => $approvalRequest->number_of_participants,
                    'questions_to_randomize' => $approvalRequest->questions_to_randomize,
                    // Approval audit fields
                    'approved_by' => $user->id,
                    'approved_at' => Carbon::now(),
                        'approval_comments' => $validated['remarks'],
                    ]);
                }

                $approvalRequest->created_activity_id = $activity->id;
            }

            $approvalRequest->save();

            DB::commit();

            // Send in-app notification to requester
            $activityForNotification = $validated['action'] === 'approve' && isset($activity) 
                ? $activity 
                : (function() use ($approvalRequest) {
                    $temp = new Activity();
                    $temp->id = $approvalRequest->id;
                    $temp->name = $approvalRequest->name;
                    return $temp;
                })();

            if ($validated['action'] === 'approve') {
                $this->notificationService->createApprovalApproved(
                    $activityForNotification, 
                    $approvalRequest->requestedBy, 
                    $user
                );
            } else {
                $this->notificationService->createApprovalRejected(
                    $activityForNotification, 
                    $approvalRequest->requestedBy, 
                    $user,
                    $validated['remarks']
                );
            }

            // Send notification email to requester
            $this->notifyRequester($approvalRequest);

            return response()->json([
                'message' => $validated['action'] === 'approve' 
                    ? 'Activity approved successfully' 
                    : 'Activity rejected',
                'data' => $approvalRequest->load(['program', 'questionnaire', 'requestedBy', 'reviewedBy', 'createdActivity'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to process approval request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Resend rejected approval request
     */
    public function resend(Request $request, $id)
    {
        $user = $request->user();
        $approvalRequest = ActivityApprovalRequest::findOrFail($id);

        // Check if user is the requester
        if ($approvalRequest->requested_by !== $user->id) {
            return response()->json([
                'message' => 'You are not authorized to resend this approval request.'
            ], 403);
        }

        // Check if status is rejected
        if ($approvalRequest->status !== 'rejected') {
            return response()->json([
                'message' => 'Only rejected approval requests can be resubmitted.'
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Reset approval status
            $approvalRequest->status = 'pending';
            $approvalRequest->reviewed_by = null;
            $approvalRequest->reviewed_at = null;
            $approvalRequest->remarks = null;
            $approvalRequest->review_message = null;
            
            // Check if manager review is required
            $requiresManagerReview = !empty($approvalRequest->manager_email);
            
            // Always reset manager review on resend (manager must re-review)
            if ($requiresManagerReview) {
                $approvalRequest->manager_review_status = 'pending';
                $approvalRequest->manager_reviewed_by = null;
                $approvalRequest->manager_reviewed_at = null;
                $approvalRequest->manager_review_notes = null;
                $approvalRequest->expected_participants = null;
                
                // Invalidate all previous manager review tokens
                ManagerReviewToken::where('approval_request_id', $approvalRequest->id)
                    ->where('used', false)
                    ->update(['used' => true]);
                
                // Generate new manager review token
                $tokenData = ManagerReviewToken::generateToken(
                    $approvalRequest,
                    $approvalRequest->manager_email,
                    null
                );
                
                // Send new manager review email
                $this->sendManagerReviewEmail($approvalRequest, $tokenData['token']);
            } else {
                $approvalRequest->manager_review_status = 'not_required';
            }
            
            $approvalRequest->save();

            // Create a temporary Activity object for notification purposes
            $tempActivity = new Activity();
            $tempActivity->id = $approvalRequest->id;
            $tempActivity->name = $approvalRequest->name;
            $tempActivity->type = $approvalRequest->type;

            // Send in-app notifications
            $this->notificationService->createApprovalRequest($tempActivity, $user);
            $this->notificationService->createApprovalPending($tempActivity, $user);

            // Only notify super admins if NO manager review is required
            // If manager review is required, super admins will be notified after manager completes review
            if (!$requiresManagerReview) {
                $this->notifySuperAdmins($approvalRequest, false);
            }

            DB::commit();

            return response()->json([
                'message' => $requiresManagerReview
                    ? 'Approval request resubmitted. Manager review email sent.' 
                    : 'Approval request resubmitted successfully',
                'data' => $approvalRequest->load(['program', 'questionnaire', 'requestedBy']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to resend approval request: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to resend approval request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Notify super admins about new approval request
     */
    private function notifySuperAdmins(ActivityApprovalRequest $request, bool $requiresManagerReview = false)
    {
        $superAdmins = User::where('role', 'super-admin')->get();
        $emailService = new EmailService();
        
        foreach ($superAdmins as $admin) {
            try {
                $htmlContent = $this->buildApprovalNotificationHtml($request, 'new', $requiresManagerReview);
                $subject = $requiresManagerReview
                    ? "New Activity Awaiting Manager Review: {$request->name}"
                    : "New Activity Approval Request: {$request->name}";
                    
                // Use communication_email if set, otherwise fallback to email
                $recipientEmail = $admin->communication_email ?: $admin->email;
                    
                $emailService->send(
                    $recipientEmail,
                    $subject,
                    $htmlContent,
                    [
                        'event' => 'approval_request_notification',
                        'user_id' => $admin->id,
                        'request_id' => $request->id,
                    ]
                );
            } catch (\Exception $e) {
                \Log::error("Failed to send approval notification email: " . $e->getMessage());
            }
        }
    }

    /**
     * Send notification to requester about approval/rejection
     */
    protected function notifyRequester(ActivityApprovalRequest $request)
    {
        try {
            $requester = $request->requestedBy;
            $status = $request->isApproved() ? 'APPROVED' : 'REJECTED';
            
            $htmlContent = $this->buildApprovalNotificationHtml($request, $status);
            
            $emailService = new EmailService();
            $emailService->send(
                $requester->email,
                "Activity Request {$status}: {$request->name}",
                $htmlContent,
                [
                    'event' => 'approval_request_result',
                    'user_id' => $requester->id,
                    'request_id' => $request->id,
                ]
            );
        } catch (\Exception $e) {
            \Log::error("Failed to send approval notification to requester: " . $e->getMessage());
        }
    }

    /**
     * Build HTML content for approval notification email
     */
    private function buildApprovalNotificationHtml(ActivityApprovalRequest $request, string $type, bool $requiresManagerReview = false): string
    {
        $isNew = $type === 'new';
        $isApproved = $type === 'APPROVED';
        
        $statusColor = $isNew ? '#3b82f6' : ($isApproved ? '#22c55e' : '#ef4444');
        $statusText = $isNew ? 'New Request' : $type;
        
        $managerReviewNotice = '';
        if ($isNew && $requiresManagerReview) {
            $managerReviewNotice = "
                <div style='background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0;'>
                    <p style='margin: 0; color: #92400e; font-weight: 600;'>⏳ Awaiting Manager Review</p>
                    <p style='margin: 5px 0 0 0; color: #78350f; font-size: 14px;'>
                        This request is pending manager approval. Approve/Reject buttons will be enabled after manager completes their review.
                    </p>
                    <p style='margin: 5px 0 0 0; color: #78350f; font-size: 14px;'>
                        <strong>Manager:</strong> {$request->manager_name} ({$request->manager_email})
                    </p>
                </div>";
        }
        
        // Build review link
        $reviewUrl = $isNew ? config('app.frontend_url') . "/activities/approvals/{$request->id}" : '';
        $loginUrl = config('app.frontend_url') . "/login";
        
        $actionButton = $isNew 
            ? "<div style='text-align: center; margin: 30px 0;'>
                   <a href='{$reviewUrl}' style='display: inline-block; background: #3b82f6; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;'>Review Approval Request</a>
               </div>"
            : "<div style='text-align: center; margin: 30px 0;'>
                   <a href='{$loginUrl}' style='display: inline-block; background: {$statusColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;'>Login to View Activities</a>
               </div>";
        
        $content = $isNew
            ? "<p>A new activity approval request has been submitted and requires your attention.</p>
               <p><strong>Event Name:</strong> {$request->name}</p>
               <p><strong>Type:</strong> {$request->type}</p>
               <p><strong>Requested by:</strong> {$request->requestedBy->name} ({$request->requestedBy->email})</p>
               <p><strong>Program:</strong> {$request->program->name}</p>
               {$managerReviewNotice}
               {$actionButton}"
            : "<p>Your activity approval request has been <strong>{$type}</strong>.</p>
               <p><strong>Event Name:</strong> {$request->name}</p>
               <p><strong>Reviewed by:</strong> {$request->reviewedBy->name}</p>
               <p><strong>Remarks:</strong> {$request->remarks}</p>
               <p style='margin-top: 20px;'>" . 
               ($isApproved 
                   ? "Your activity has been approved and is now available in the Activities section."
                   : "Your activity request has been rejected. Please review the remarks and make necessary changes before resubmitting.") . 
               "</p>
               {$actionButton}";
        
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>Activity Approval Request</title>
        </head>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px;'>
            <div style='max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;'>
                <div style='background: {$statusColor}; color: #ffffff; padding: 20px; text-align: center;'>
                    <h1 style='margin: 0; font-size: 20px;'>Activity Approval Request - {$statusText}</h1>
                </div>
                <div style='padding: 30px 20px;'>
                    {$content}
                </div>
                <div style='background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;'>
                    <p style='margin: 0;'>This is an automated email from QSights. Please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        ";
    }

    /**
     * Send manager review email helper
     */
    protected function sendManagerReviewEmail(ActivityApprovalRequest $approvalRequest, string $token)
    {
        $reviewUrl = config('app.frontend_url') . "/manager/review/{$token}";
        $managerName = $approvalRequest->manager_name ?? 'Manager';
        $programName = $approvalRequest->program->name ?? 'N/A';
        $requesterName = $approvalRequest->requestedBy->name ?? 'N/A';
        
        $htmlContent = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>Manager Review Required</title>
        </head>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px;'>
            <div style='max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;'>
                <div style='background: #6366f1; color: #ffffff; padding: 20px; text-align: center;'>
                    <h1 style='margin: 0; font-size: 20px;'>Manager Review Required</h1>
                </div>
                <div style='padding: 30px 20px;'>
                    <p>Dear {$managerName},</p>
                    <p>Your review and approval is required for a new activity approval request.</p>
                    
                    <div style='background: #f3f4f6; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0;'>
                        <h3 style='margin: 0 0 10px 0; color: #1f2937;'>Activity Details</h3>
                        <p style='margin: 5px 0;'><strong>Activity Name:</strong> {$approvalRequest->name}</p>
                        <p style='margin: 5px 0;'><strong>Type:</strong> {$approvalRequest->type}</p>
                        <p style='margin: 5px 0;'><strong>Program:</strong> {$programName}</p>
                        <p style='margin: 5px 0;'><strong>Requested by:</strong> {$requesterName}</p>
                    </div>
                    
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='{$reviewUrl}' style='display: inline-block; background: #6366f1; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;'>Review & Submit</a>
                    </div>
                    
                    <p style='font-size: 12px; color: #6b7280; margin-top: 20px;'>
                        <strong>Note:</strong> This link is valid for 72 hours and can only be used once.
                    </p>
                </div>
                <div style='background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;'>
                    <p style='margin: 0;'>This is an automated email from QSights. Please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        ";
        
        try {
            $emailService = new EmailService();
            $emailService->send(
                $approvalRequest->manager_email,
                "Manager Review Required: Activity - {$approvalRequest->name}",
                $htmlContent,
                [
                    'event' => 'manager_review_request',
                    'approval_request_id' => $approvalRequest->id,
                    'manager_email' => $approvalRequest->manager_email,
                ]
            );
        } catch (\Exception $e) {
            \Log::error('Failed to send manager review email: ' . $e->getMessage());
            throw $e;
        }
    }

    public function statistics(Request $request)
    {
        $user = $request->user();
        
        $query = ActivityApprovalRequest::query();

        // Filter by program for program-level roles
        if ($user->program_id && in_array($user->role, ['program-admin', 'program-manager', 'program-moderator'])) {
            $query->byProgram($user->program_id);
        }

        $stats = [
            'pending' => (clone $query)->pending()->count(),
            'approved' => (clone $query)->approved()->count(),
            'rejected' => (clone $query)->rejected()->count(),
            'total' => $query->count(),
        ];

        return response()->json(['data' => $stats]);
    }
}
