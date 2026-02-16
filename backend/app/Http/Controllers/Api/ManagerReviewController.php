<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityApprovalRequest;
use App\Models\ManagerReviewToken;
use App\Models\User;
use App\Services\EmailService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class ManagerReviewController extends Controller
{
    protected $emailService;
    protected $notificationService;

    public function __construct(EmailService $emailService, NotificationService $notificationService)
    {
        $this->emailService = $emailService;
        $this->notificationService = $notificationService;
    }

    /**
     * Send manager review request
     * Called when Program Admin creates an approval request
     */
    public function sendManagerReview(Request $request, $approvalRequestId)
    {
        $validator = Validator::make($request->all(), [
            'manager_email' => 'required|email',
            'manager_name' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $approvalRequest = ActivityApprovalRequest::findOrFail($approvalRequestId);

        // Check if request is in correct state
        if (!$approvalRequest->isPending()) {
            return response()->json([
                'message' => 'Approval request is not in pending state'
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Update manager info on approval request
            $approvalRequest->update([
                'manager_email' => $request->manager_email,
                'manager_name' => $request->manager_name ?? $approvalRequest->manager_name,
                'manager_review_status' => 'pending',
            ]);

            // Invalidate any old tokens
            ManagerReviewToken::invalidateForRequest($approvalRequestId);

            // Generate new secure token
            $tokenData = ManagerReviewToken::generateToken(
                $approvalRequest,
                $request->manager_email
            );

            // Send email to manager
            $this->sendManagerReviewEmail($approvalRequest, $tokenData['token']);

            DB::commit();

            return response()->json([
                'message' => 'Manager review request sent successfully',
                'data' => [
                    'manager_email' => $request->manager_email,
                    'token_expires_at' => $tokenData['record']->expires_at,
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to send manager review: ' . $e->getMessage(), [
                'approval_request_id' => $approvalRequestId,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Failed to send manager review request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate manager review token (GET endpoint)
     * Shows the form to manager
     */
    public function validateToken($token)
    {
        $reviewToken = ManagerReviewToken::verifyToken($token);

        if (!$reviewToken) {
            return response()->json([
                'valid' => false,
                'message' => 'Invalid or expired token'
            ], 404);
        }

        if (!$reviewToken->isValid()) {
            return response()->json([
                'valid' => false,
                'message' => $reviewToken->isExpired() ? 'Token has expired' : 'Token has already been used'
            ], 400);
        }

        // Load approval request data
        $approvalRequest = $reviewToken->approvalRequest()
            ->with(['program', 'questionnaire', 'requestedBy'])
            ->first();

        if (!$approvalRequest) {
            return response()->json([
                'valid' => false,
                'message' => 'Approval request not found'
            ], 404);
        }

        // Check if already reviewed
        if ($approvalRequest->isManagerApproved()) {
            return response()->json([
                'valid' => false,
                'message' => 'This request has already been reviewed by a manager',
                'already_reviewed' => true
            ], 400);
        }

        return response()->json([
            'valid' => true,
            'data' => [
                'approval_request' => [
                    'id' => $approvalRequest->id,
                    'name' => $approvalRequest->name,
                    'description' => $approvalRequest->description,
                    'type' => $approvalRequest->type,
                    'start_date' => $approvalRequest->start_date,
                    'end_date' => $approvalRequest->end_date,
                    'program' => $approvalRequest->program,
                    'requested_by' => $approvalRequest->requestedBy,
                    'manager_email' => $reviewToken->manager_email,
                ],
                'token_expires_at' => $reviewToken->expires_at,
                // Return existing values if any (for resend scenario)
                'existing_data' => [
                    'project_code' => $approvalRequest->project_code,
                    'configuration_date' => $approvalRequest->configuration_date,
                    'configuration_price' => $approvalRequest->configuration_price,
                    'subscription_price' => $approvalRequest->subscription_price,
                    'subscription_frequency' => $approvalRequest->subscription_frequency,
                    'tax_percentage' => $approvalRequest->tax_percentage,
                    'expected_participants' => $approvalRequest->expected_participants,
                ],
            ]
        ]);
    }

    /**
     * Submit manager review (POST endpoint)
     */
    public function submitReview(Request $request, $token)
    {
        $reviewToken = ManagerReviewToken::verifyToken($token);

        if (!$reviewToken || !$reviewToken->isValid()) {
            return response()->json([
                'message' => 'Invalid, expired, or already used token'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'project_code' => 'required|string|max:255',
            'configuration_date' => 'required|date',
            'configuration_price' => 'required|numeric|min:0',
            'subscription_price' => 'required|numeric|min:0',
            'subscription_frequency' => 'required|in:one-time,monthly,quarterly,yearly',
            'tax_percentage' => 'required|numeric|min:0|max:100',
            'expected_participants' => 'required|integer|min:1',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $approvalRequest = $reviewToken->approvalRequest;

            // Update approval request with manager's input
            $approvalRequest->update([
                'project_code' => $request->project_code,
                'configuration_date' => $request->configuration_date,
                'configuration_price' => $request->configuration_price,
                'subscription_price' => $request->subscription_price,
                'subscription_frequency' => $request->subscription_frequency,
                'tax_percentage' => $request->tax_percentage,
                'expected_participants' => $request->expected_participants,
                'manager_review_status' => 'approved',
                'manager_reviewed_at' => Carbon::now(),
                'manager_reviewed_by' => $reviewToken->manager_id,
                'manager_review_notes' => $request->notes,
            ]);

            // Mark token as used
            $reviewToken->markAsUsed(
                $request->ip(),
                $request->userAgent()
            );

            // Send notification to Super Admins
            $this->notifySuperAdminsManagerApproved($approvalRequest);

            // Create bell notification for Super Admins
            $superAdmins = User::where('role', 'super-admin')->get();
            foreach ($superAdmins as $admin) {
                $this->notificationService->createManagerReviewCompleted(
                    $approvalRequest,
                    $admin
                );
            }

            DB::commit();

            return response()->json([
                'message' => 'Review submitted successfully. The Super Admin will now review your submission.',
                'data' => [
                    'approval_request_id' => $approvalRequest->id,
                    'manager_reviewed_at' => $approvalRequest->manager_reviewed_at,
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to submit manager review: ' . $e->getMessage(), [
                'token' => substr($token, 0, 20) . '...',
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Failed to submit review',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Resend manager review (when Super Admin rejects)
     */
    public function resendManagerReview(Request $request, $approvalRequestId)
    {
        $user = $request->user();

        // Only allow program admin or the original requester
        $approvalRequest = ActivityApprovalRequest::findOrFail($approvalRequestId);

        if (!in_array($user->role, ['program-admin', 'super-admin']) && $approvalRequest->requested_by !== $user->id) {
            return response()->json([
                'message' => 'Unauthorized to resend manager review'
            ], 403);
        }

        // Check if request was rejected by Super Admin
        if (!$approvalRequest->isRejected()) {
            return response()->json([
                'message' => 'Can only resend manager review for rejected approval requests'
            ], 400);
        }

        // Validate manager email
        $validator = Validator::make($request->all(), [
            'manager_email' => 'required|email',
            'manager_name' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Reset approval request status
            $approvalRequest->update([
                'status' => 'pending',
                'manager_review_status' => 'pending',
                'manager_email' => $request->manager_email,
                'manager_name' => $request->manager_name ?? $approvalRequest->manager_name,
                'reviewed_by' => null,
                'reviewed_at' => null,
                'remarks' => null,
            ]);

            // Invalidate old tokens
            ManagerReviewToken::invalidateForRequest($approvalRequestId);

            // Generate new token
            $tokenData = ManagerReviewToken::generateToken(
                $approvalRequest,
                $request->manager_email
            );

            // Send email to manager
            $this->sendManagerReviewEmail($approvalRequest, $tokenData['token'], true);

            DB::commit();

            return response()->json([
                'message' => 'Manager review request resent successfully',
                'data' => [
                    'manager_email' => $request->manager_email,
                    'token_expires_at' => $tokenData['record']->expires_at,
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to resend manager review: ' . $e->getMessage());

            return response()->json([
                'message' => 'Failed to resend manager review',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send manager review email
     */
    protected function sendManagerReviewEmail(ActivityApprovalRequest $approvalRequest, string $token, bool $isResend = false)
    {
        $reviewUrl = config('app.frontend_url') . "/manager/review/{$token}";
        
        $subject = $isResend 
            ? "Resubmit Required: Manager Review for Activity - {$approvalRequest->name}"
            : "Manager Review Required: Activity - {$approvalRequest->name}";
        
        $htmlContent = $this->buildManagerReviewEmailHtml($approvalRequest, $reviewUrl, $isResend);
        
        try {
            $this->emailService->send(
                $approvalRequest->manager_email,
                $subject,
                $htmlContent,
                [
                    'event' => 'manager_review_request',
                    'approval_request_id' => $approvalRequest->id,
                    'manager_email' => $approvalRequest->manager_email,
                    'is_resend' => $isResend,
                ]
            );
        } catch (\Exception $e) {
            Log::error('Failed to send manager review email: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Send notification to super admins when manager approves
     */
    protected function notifySuperAdminsManagerApproved(ActivityApprovalRequest $approvalRequest)
    {
        $superAdmins = User::where('role', 'super-admin')->get();
        
        foreach ($superAdmins as $admin) {
            try {
                $htmlContent = $this->buildManagerApprovedEmailHtml($approvalRequest);
                
                // Use communication_email if available, fallback to email
                $recipientEmail = $admin->communication_email ?: $admin->email;
                
                $this->emailService->send(
                    $recipientEmail,
                    "Manager Approved: Activity Ready for Final Review - {$approvalRequest->name}",
                    $htmlContent,
                    [
                        'event' => 'manager_review_completed',
                        'approval_request_id' => $approvalRequest->id,
                        'admin_user_id' => $admin->id,
                    ]
                );
            } catch (\Exception $e) {
                Log::error('Failed to send manager approved notification: ' . $e->getMessage());
            }
        }
    }

    /**
     * Build manager review email HTML
     */
    protected function buildManagerReviewEmailHtml(ActivityApprovalRequest $approvalRequest, string $reviewUrl, bool $isResend): string
    {
        $managerName = $approvalRequest->manager_name ?? 'Manager';
        $programName = $approvalRequest->program->name ?? 'N/A';
        $requesterName = $approvalRequest->requestedBy->name ?? 'N/A';
        
        $introText = $isResend
            ? "<p>A previously submitted activity approval request requires resubmission of your review.</p>
               <p style='color: #dc2626; font-weight: 600;'>The Super Admin has requested changes. Please review and resubmit.</p>"
            : "<p>Your review and approval is required for a new activity approval request.</p>";
        
        return "
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
                    {$introText}
                    
                    <div style='background: #f3f4f6; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0;'>
                        <h3 style='margin: 0 0 10px 0; color: #1f2937;'>Activity Details</h3>
                        <p style='margin: 5px 0;'><strong>Activity Name:</strong> {$approvalRequest->name}</p>
                        <p style='margin: 5px 0;'><strong>Type:</strong> {$approvalRequest->type}</p>
                        <p style='margin: 5px 0;'><strong>Program:</strong> {$programName}</p>
                        <p style='margin: 5px 0;'><strong>Requested by:</strong> {$requesterName}</p>
                        <p style='margin: 5px 0;'><strong>Start Date:</strong> {$approvalRequest->start_date->format('M d, Y')}</p>
                        <p style='margin: 5px 0;'><strong>End Date:</strong> {$approvalRequest->end_date->format('M d, Y')}</p>
                    </div>
                    
                    <h3 style='color: #1f2937; margin-top: 25px;'>Required Information</h3>
                    <p>Please provide the following information to proceed with the approval:</p>
                    <ul style='color: #4b5563;'>
                        <li>Project Code</li>
                        <li>Configuration Date</li>
                        <li>Configuration Price</li>
                        <li>Subscription Price & Frequency</li>
                        <li>Tax Percentage</li>
                        <li>Expected Participants</li>
                    </ul>
                    
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='{$reviewUrl}' style='display: inline-block; background: #6366f1; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;'>Review & Submit</a>
                    </div>
                    
                    <p style='font-size: 12px; color: #6b7280; margin-top: 20px;'>
                        <strong>Note:</strong> This link is valid for 72 hours and can only be used once.
                    </p>
                    
                    <p style='font-size: 12px; color: #6b7280; margin-top: 10px;'>
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <span style='word-break: break-all;'>{$reviewUrl}</span>
                    </p>
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
     * Build manager approved notification email HTML
     */
    protected function buildManagerApprovedEmailHtml(ActivityApprovalRequest $approvalRequest): string
    {
        $managerName = $approvalRequest->manager_name ?? 'Manager';
        $managerEmail = $approvalRequest->manager_email ?? 'N/A';
        $programName = $approvalRequest->program->name ?? 'N/A';
        
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>Manager Review Completed</title>
        </head>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px;'>
            <div style='max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;'>
                <div style='background: #22c55e; color: #ffffff; padding: 20px; text-align: center;'>
                    <h1 style='margin: 0; font-size: 20px;'>Manager Review Completed</h1>
                </div>
                <div style='padding: 30px 20px;'>
                    <p>A manager has completed their review for an activity approval request.</p>
                    
                    <div style='background: #f3f4f6; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;'>
                        <h3 style='margin: 0 0 10px 0; color: #1f2937;'>Activity Details</h3>
                        <p style='margin: 5px 0;'><strong>Activity Name:</strong> {$approvalRequest->name}</p>
                        <p style='margin: 5px 0;'><strong>Type:</strong> {$approvalRequest->type}</p>
                        <p style='margin: 5px 0;'><strong>Program:</strong> {$programName}</p>
                        <p style='margin: 5px 0;'><strong>Reviewed by:</strong> {$managerName} ({$managerEmail})</p>
                    </div>
                    
                    <div style='background: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;'>
                        <h3 style='margin: 0 0 10px 0; color: #1f2937;'>Manager Submitted Data</h3>
                        <p style='margin: 5px 0;'><strong>Project Code:</strong> {$approvalRequest->project_code}</p>
                        <p style='margin: 5px 0;'><strong>Configuration Date:</strong> " . ($approvalRequest->configuration_date ? $approvalRequest->configuration_date->format('M d, Y') : 'N/A') . "</p>
                        <p style='margin: 5px 0;'><strong>Configuration Price:</strong> $" . number_format($approvalRequest->configuration_price ?? 0, 2) . "</p>
                        <p style='margin: 5px 0;'><strong>Subscription:</strong> $" . number_format($approvalRequest->subscription_price ?? 0, 2) . " ({$approvalRequest->subscription_frequency})</p>
                        <p style='margin: 5px 0;'><strong>Tax:</strong> {$approvalRequest->tax_percentage}%</p>
                        <p style='margin: 5px 0;'><strong>Expected Participants:</strong> {$approvalRequest->expected_participants}</p>
                    </div>
                    
                    <p style='margin-top: 20px; font-weight: 600; color: #1f2937;'>
                        This activity is now ready for your final approval. Please log in to review and approve/reject.
                    </p>
                </div>
                <div style='background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;'>
                    <p style='margin: 0;'>This is an automated email from QSights. Please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        ";
    }
}
