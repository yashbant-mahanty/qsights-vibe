<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityApprovalRequest;
use App\Models\Activity;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
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
     * Create new approval request
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'program_id' => 'required|uuid|exists:programs,id',
            'questionnaire_id' => 'nullable|uuid|exists:questionnaires,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|in:survey,poll,assessment',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'close_date' => 'nullable|date|after_or_equal:end_date',
            'allow_guests' => 'nullable|boolean',
            'is_multilingual' => 'nullable|boolean',
            'languages' => 'nullable|array',
            'settings' => 'required|array',
            'registration_form_fields' => 'required|array',
            'landing_config' => 'nullable|array',
            'time_limit_enabled' => 'nullable|boolean',
            'time_limit_minutes' => 'nullable|integer|min:1',
            'pass_percentage' => 'nullable|numeric|min:0|max:100',
            'max_retakes' => 'nullable|integer|min:0',
            // Additional details fields - REQUIRED for approval request
            'sender_email' => 'nullable|email|max:255',
            'manager_name' => 'nullable|string|max:255',
            'manager_email' => 'nullable|email|max:255',
            'project_code' => 'nullable|string|max:255',
            'configuration_date' => 'required|date',
            'configuration_price' => 'required|numeric|min:0',
            'subscription_price' => 'required|numeric|min:0',
            'subscription_frequency' => 'required|in:one-time,monthly,quarterly,yearly',
            'tax_percentage' => 'required|numeric|min:0|max:100',
            'number_of_participants' => 'required|integer|min:0',
            'questions_to_randomize' => 'nullable|integer|min:0',
        ]);

        $validated['requested_by'] = $request->user()->id;
        $validated['status'] = 'pending';

        $approvalRequest = ActivityApprovalRequest::create($validated);

        // Create a temporary Activity object for notification purposes
        $tempActivity = new Activity();
        $tempActivity->id = $approvalRequest->id;
        $tempActivity->name = $approvalRequest->name;
        $tempActivity->type = $approvalRequest->type;

        // Send in-app notifications
        $this->notificationService->createApprovalRequest($tempActivity, $request->user());
        $this->notificationService->createApprovalPending($tempActivity, $request->user());

        // Send email notification to super admins
        $this->notifySuperAdmins($approvalRequest);

        return response()->json([
            'message' => 'Activity approval request submitted successfully',
            'data' => $approvalRequest->load(['program', 'questionnaire', 'requestedBy'])
        ], 201);
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

        DB::beginTransaction();
        try {
            $approvalRequest->status = $validated['action'] === 'approve' ? 'approved' : 'rejected';
            $approvalRequest->remarks = $validated['remarks'];
            $approvalRequest->reviewed_by = $user->id;
            $approvalRequest->reviewed_at = Carbon::now();

            // If approved, create the actual activity
            if ($validated['action'] === 'approve') {
                $activity = Activity::create([
                    'program_id' => $approvalRequest->program_id,
                    'questionnaire_id' => $approvalRequest->questionnaire_id,
                    'name' => $approvalRequest->name,
                    'description' => $approvalRequest->description,
                    'type' => $approvalRequest->type,
                    'status' => 'draft', // Start as draft
                    'start_date' => $approvalRequest->start_date,
                    'end_date' => $approvalRequest->end_date,
                    'close_date' => $approvalRequest->close_date,
                    'allow_guests' => $approvalRequest->allow_guests,
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
     * Send notification to super admins
     */
    protected function notifySuperAdmins(ActivityApprovalRequest $request)
    {
        $superAdmins = User::where('role', 'super-admin')->get();
        
        foreach ($superAdmins as $admin) {
            try {
                Mail::raw(
                    "New Activity Approval Request\n\n" .
                    "Event Name: {$request->name}\n" .
                    "Type: {$request->type}\n" .
                    "Requested by: {$request->requestedBy->name} ({$request->requestedBy->email})\n" .
                    "Program: {$request->program->name}\n\n" .
                    "Please log in to review and approve/reject this request.\n" .
                    "Review Link: " . url("/activities/approvals/{$request->id}"),
                    function ($message) use ($admin, $request) {
                        $message->to($admin->email)
                            ->subject("New Activity Approval Request: {$request->name}");
                    }
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
            
            Mail::raw(
                "Activity Approval Request {$status}\n\n" .
                "Event Name: {$request->name}\n" .
                "Status: {$status}\n" .
                "Reviewed by: {$request->reviewedBy->name}\n" .
                "Remarks: {$request->remarks}\n\n" .
                ($request->isApproved() 
                    ? "Your activity has been approved and is now available in the Activities section."
                    : "Your activity request has been rejected. Please review the remarks and resubmit if needed."),
                function ($message) use ($requester, $request, $status) {
                    $message->to($requester->email)
                        ->subject("Activity Request {$status}: {$request->name}");
                }
            );
        } catch (\Exception $e) {
            \Log::error("Failed to send requester notification email: " . $e->getMessage());
        }
    }

    /**
     * Get approval statistics
     */
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
