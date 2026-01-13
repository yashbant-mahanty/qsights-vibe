<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Participant;
use App\Models\NotificationReport;
use App\Models\NotificationTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    /**
     * Send notifications via SendGrid
     */
    public function sendNotifications(Request $request)
    {
        // Log to file for debugging
        $logMessage = "\n" . str_repeat('=', 50) . "\n";
        $logMessage .= date('Y-m-d H:i:s') . " - SendNotifications called\n";
        $logMessage .= "User-Agent: " . $request->header('User-Agent') . "\n";
        $logMessage .= "IP: " . $request->ip() . "\n";
        $logMessage .= "Has Auth: " . ($request->bearerToken() ? 'YES' : 'NO') . "\n";
        $logMessage .= "Request Data: " . json_encode($request->all()) . "\n";
        file_put_contents(storage_path('logs/email_debug.log'), $logMessage, FILE_APPEND);
        
        Log::info('SendNotifications endpoint called', [
            'activity_id' => $request->activity_id,
            'notification_type' => $request->notification_type,
            'participant_ids_count' => count($request->participant_ids ?? []),
            'timestamp' => now(),
            'user' => $request->user() ? $request->user()->id : 'none',
        ]);

        try {
            $request->validate([
                'activity_id' => 'required|exists:activities,id',
                'notification_type' => 'required|string',
                'participant_ids' => 'required|array',
                'participant_ids.*' => 'required|exists:participants,id',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed in sendNotifications', [
                'errors' => $e->errors(),
            ]);
            file_put_contents(storage_path('logs/email_debug.log'), "❌ Validation failed: " . json_encode($e->errors()) . "\n", FILE_APPEND);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        }

        try {
            $activity = Activity::with('program')->findOrFail($request->activity_id);
            $notificationType = $request->notification_type;
            $participantIds = $request->participant_ids;

            file_put_contents(storage_path('logs/email_debug.log'), "Activity loaded: {$activity->name}\n", FILE_APPEND);
            file_put_contents(storage_path('logs/email_debug.log'), "Notification type: {$notificationType}\n", FILE_APPEND);
            file_put_contents(storage_path('logs/email_debug.log'), "Participant IDs: " . json_encode($participantIds) . "\n", FILE_APPEND);

            // Get participants from database
            $participants = Participant::whereIn('id', $participantIds)
                ->where('status', 'active')
                ->get();

            if ($participants->isEmpty()) {
                file_put_contents(storage_path('logs/email_debug.log'), "❌ No valid participants found\n", FILE_APPEND);
                return response()->json([
                    'success' => false,
                    'message' => 'No valid participants found',
                ], 404);
            }

            file_put_contents(storage_path('logs/email_debug.log'), "Found {$participants->count()} valid participants\n", FILE_APPEND);

            // Get or create default template
            $template = NotificationTemplate::where('activity_id', $activity->id)
                ->where('notification_type', $notificationType)
                ->first();

            if (!$template) {
                // Create default template on-the-fly
                file_put_contents(storage_path('logs/email_debug.log'), "No custom template found, using default\n", FILE_APPEND);
                $template = (object) [
                    'subject' => "You're invited to participate in {$activity->name}",
                    'body' => $this->getDefaultTemplate($activity, $notificationType),
                ];
            }

            $sentCount = 0;
            $failedCount = 0;
            $failedEmails = [];
            $errorDetails = [];

            // Initialize SendGrid with updated configuration
            $sendGridApiKey = env('SENDGRID_API_KEY');
            $fromEmail = env('SENDGRID_FROM_EMAIL', 'info@qsights.com');
            $fromName = env('SENDGRID_FROM_NAME', 'QSights');

            file_put_contents(storage_path('logs/email_debug.log'), "SendGrid API Key ID: " . env('SENDGRID_API_KEY_ID') . "\n", FILE_APPEND);
            file_put_contents(storage_path('logs/email_debug.log'), "API Key: " . substr($sendGridApiKey, 0, 20) . "...\n", FILE_APPEND);
            file_put_contents(storage_path('logs/email_debug.log'), "From Email: $fromEmail\n", FILE_APPEND);
            file_put_contents(storage_path('logs/email_debug.log'), "From Name: $fromName\n", FILE_APPEND);
            file_put_contents(storage_path('logs/email_debug.log'), "Recipients: " . $participants->count() . "\n", FILE_APPEND);

            if (!$sendGridApiKey || $sendGridApiKey === 'SG.xxxxx') {
                Log::warning('SendGrid API key not configured, using mock mode');
                file_put_contents(storage_path('logs/email_debug.log'), "MOCK MODE - No emails sent\n", FILE_APPEND);
                
                // Mock mode - simulate success for all
                $sentCount = $participants->count();
            } else {
                // Real SendGrid integration
                file_put_contents(storage_path('logs/email_debug.log'), "REAL MODE - Sending via SendGrid\n", FILE_APPEND);
                $sendgrid = new \SendGrid($sendGridApiKey);
                
                foreach ($participants as $participant) {
                    try {
                        $email = $participant->email;
                        $name = $participant->name ?? 'Participant';

                        // Personalize template
                        $subject = $this->personalizeContent($template->subject, $name, $activity, $participant);
                        $body = $this->personalizeContent($template->body, $name, $activity, $participant);

                        // Create a new Mail object for each email
                        $mail = new \SendGrid\Mail\Mail();
                        $mail->setFrom($fromEmail, $fromName);
                        $mail->setSubject($subject);
                        $mail->addTo($email, $name);
                        $mail->addContent("text/html", $body);

                        file_put_contents(storage_path('logs/email_debug.log'), "Sending to: $email ($name)\n", FILE_APPEND);
                        $response = $sendgrid->send($mail);

                        if ($response->statusCode() >= 200 && $response->statusCode() < 300) {
                            $sentCount++;
                            file_put_contents(storage_path('logs/email_debug.log'), "✅ Success: $email (HTTP {$response->statusCode()})\n", FILE_APPEND);
                            Log::info("Email sent successfully to {$email}", [
                                'status' => $response->statusCode(),
                                'notification_type' => $notificationType,
                                'activity_id' => $activity->id,
                                'timestamp' => now(),
                            ]);
                        } else {
                            $failedCount++;
                            $failedEmails[] = $email;
                            $responseBody = $response->body();
                            file_put_contents(storage_path('logs/email_debug.log'), "❌ Failed: $email (HTTP {$response->statusCode()})\n", FILE_APPEND);
                            $errorDetails[] = "Failed to send to {$email}: HTTP {$response->statusCode()} - {$responseBody}";
                            Log::error("Email failed to {$email}", [
                                'status' => $response->statusCode(),
                                'body' => $responseBody,
                                'headers' => $response->headers(),
                            ]);
                        }
                    } catch (\Exception $e) {
                        $failedCount++;
                        $failedEmails[] = $participant->email;
                        $errorMessage = $e->getMessage();
                        file_put_contents(storage_path('logs/email_debug.log'), "❌ Exception: {$participant->email} - $errorMessage\n", FILE_APPEND);
                        $errorDetails[] = "Error sending to {$participant->email}: {$errorMessage}";
                        Log::error("SendGrid exception for {$participant->email}", [
                            'error' => $errorMessage,
                            'trace' => $e->getTraceAsString(),
                            'activity_id' => $activity->id,
                            'notification_type' => $notificationType,
                        ]);
                    }
                }
            }

            // Save notification report
            file_put_contents(storage_path('logs/email_debug.log'), "Saving notification report...\n", FILE_APPEND);
            $report = NotificationReport::create([
                'activity_id' => $activity->id,
                'template_type' => $notificationType,
                'total_recipients' => $participants->count(),
                'sent_count' => $sentCount,
                'failed_count' => $failedCount,
                'failed_emails' => $failedEmails,
                'error_details' => !empty($errorDetails) ? implode("\n", $errorDetails) : null,
            ]);

            file_put_contents(storage_path('logs/email_debug.log'), "✅ Report saved: {$report->id}\n", FILE_APPEND);
            file_put_contents(storage_path('logs/email_debug.log'), "📊 Final: Sent {$sentCount}/{$participants->count()}\n\n", FILE_APPEND);

            Log::info('Email notifications sent successfully', [
                'report_id' => $report->id,
                'sent' => $sentCount,
                'failed' => $failedCount,
                'total' => $participants->count(),
            ]);

            return response()->json([
                'success' => true,
                'message' => "Email notifications processed successfully",
                'sent_count' => $sentCount,
                'failed_count' => $failedCount,
                'data' => [
                    'total_recipients' => $participants->count(),
                    'sent_count' => $sentCount,
                    'failed_count' => $failedCount,
                    'report_id' => $report->id,
                ],
            ]);

        } catch (\Exception $e) {
            file_put_contents(storage_path('logs/email_debug.log'), "❌ EXCEPTION: " . $e->getMessage() . "\n\n", FILE_APPEND);
            Log::error('Failed to process email notifications', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send notifications',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Personalize email content with placeholders
     */
    private function personalizeContent($content, $name, $activity, $participant = null)
    {
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
        
        // Generate access token for direct access if participant is provided
        if ($participant) {
            $accessToken = \App\Models\ActivityAccessToken::generateToken($activity->id, $participant->id);
            $activityUrl = "{$frontendUrl}/activities/take/{$activity->id}?token={$accessToken->token}";
        } else {
            $activityUrl = "{$frontendUrl}/activities/take/{$activity->id}";
        }
        
        $replacements = [
            '{{participant_name}}' => $name,
            '{{participant_email}}' => $participant ? $participant->email : '',
            '{{activity_name}}' => $activity->name,
            '{{activity_description}}' => $activity->description ?? '',
            '{{activity_url}}' => $activityUrl,
            '{{program_name}}' => $activity->program->name ?? '',
            '{{organization}}' => 'QSights',
            '{{organization_name}}' => 'QSights',
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $content);
    }

    /**
     * Get default email template
     */
    private function getDefaultTemplate($activity, $notificationType)
    {
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
        $activityUrl = "{$frontendUrl}/activities/take/{$activity->id}";
        
        $templates = [
            'invitation' => "
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <h2 style='color: #4F46E5;'>Hello {{participant_name}},</h2>
                    <p>You're invited to participate in <strong>{{activity_name}}</strong>.</p>
                    <p>{{activity_description}}</p>
                    <p style='margin: 30px 0;'>
                        <a href='{{activity_url}}' style='background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;'>
                            Participate Now
                        </a>
                    </p>
                    <p style='color: #6B7280; font-size: 14px;'>
                        We look forward to your participation!<br>
                        - The QSights Team
                    </p>
                </div>
            ",
            'reminder' => "
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <h2 style='color: #4F46E5;'>Reminder: {{activity_name}}</h2>
                    <p>Hello {{participant_name}},</p>
                    <p>This is a friendly reminder to participate in <strong>{{activity_name}}</strong>.</p>
                    <p style='margin: 30px 0;'>
                        <a href='{{activity_url}}' style='background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;'>
                            Participate Now
                        </a>
                    </p>
                    <p style='color: #6B7280; font-size: 14px;'>
                        - The QSights Team
                    </p>
                </div>
            ",
            'thank_you' => "
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <h2 style='color: #10B981;'>Thank You!</h2>
                    <p>Dear {{participant_name}},</p>
                    <p>Thank you for participating in <strong>{{activity_name}}</strong>.</p>
                    <p>Your feedback is valuable to us and helps us improve.</p>
                    <p style='color: #6B7280; font-size: 14px; margin-top: 30px;'>
                        Best regards,<br>
                        The QSights Team
                    </p>
                </div>
            ",
        ];

        return $templates[$notificationType] ?? $templates['invitation'];
    }

    /**
     * Get all notification reports across all activities
     */
    public function getAllReports(Request $request)
    {
        try {
            $query = NotificationReport::with('activity:id,name')
                ->orderBy('created_at', 'desc');

            // Filter by activity_id if provided
            if ($request->has('activity_id')) {
                $query->where('activity_id', $request->activity_id);
            }

            // Filter by date range if provided
            if ($request->has('start_date')) {
                $query->whereDate('created_at', '>=', $request->start_date);
            }
            if ($request->has('end_date')) {
                $query->whereDate('created_at', '<=', $request->end_date);
            }

            $reports = $query->get();

            // Calculate totals
            $totals = [
                'total_campaigns' => $reports->count(),
                'total_sent' => $reports->sum('sent_count'),
                'total_failed' => $reports->sum('failed_count'),
                'total_recipients' => $reports->sum('total_recipients'),
                'success_rate' => $reports->sum('total_recipients') > 0
                    ? round(($reports->sum('sent_count') / $reports->sum('total_recipients')) * 100, 2)
                    : 0,
            ];

            return response()->json([
                'success' => true,
                'data' => $reports,
                'totals' => $totals,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch all notification reports', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch reports',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get notification reports for a specific activity
     */
    public function getReports($activityId)
    {
        try {
            $reports = NotificationReport::where('activity_id', $activityId)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $reports,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch notification reports', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch reports',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Legacy send single notification (kept for backward compatibility)
     */
    public function send(Request $request)
    {
        $request->validate([
            'activity_id' => 'required|exists:activities,id',
            'activity_name' => 'required|string',
            'notification_type' => 'required|string',
            'language' => 'required|string',
            'mode' => 'required|in:participant,guest',
            'email' => 'required_if:mode,participant|email',
            'link' => 'required|url',
        ]);

        try {
            Log::info('Notification sent', [
                'type' => $request->notification_type,
                'email' => $request->email,
                'activity' => $request->activity_name,
                'link' => $request->link,
            ]);

            return response()->json([
                'message' => 'Notification sent successfully',
                'data' => [
                    'type' => $request->notification_type,
                    'recipient' => $request->email,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send notification', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to send notification',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Legacy send bulk notifications (kept for backward compatibility)
     */
    public function sendBulk(Request $request)
    {
        $request->validate([
            'activity_id' => 'required|exists:activities,id',
            'activity_name' => 'required|string',
            'notification_type' => 'required|string',
            'language' => 'required|string',
            'participant_ids' => 'required|array',
            'participant_ids.*' => 'exists:participants,id',
            'link' => 'required|url',
        ]);

        try {
            $activity = Activity::findOrFail($request->activity_id);
            $participants = Participant::whereIn('id', $request->participant_ids)
                ->whereHas('activities', function ($query) use ($request) {
                    $query->where('activities.id', $request->activity_id);
                })
                ->get();

            if ($participants->isEmpty()) {
                return response()->json([
                    'message' => 'No valid participants found'
                ], 404);
            }

            $sentCount = 0;
            foreach ($participants as $participant) {
                Log::info('Bulk notification sent', [
                    'type' => $request->notification_type,
                    'email' => $participant->email,
                    'name' => $participant->name,
                    'activity' => $request->activity_name,
                    'link' => $request->link,
                ]);
                
                $sentCount++;
            }

            return response()->json([
                'message' => "Notifications sent successfully to {$sentCount} participants",
                'data' => [
                    'type' => $request->notification_type,
                    'sent_count' => $sentCount,
                    'recipients' => $participants->pluck('email')->toArray(),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send bulk notifications', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to send bulk notifications',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test endpoint to verify route is accessible
     */
    public function testEndpoint(Request $request)
    {
        file_put_contents(storage_path('logs/email_debug.log'), date('Y-m-d H:i:s') . " - TEST endpoint hit!\n", FILE_APPEND);
        
        return response()->json([
            'success' => true,
            'message' => 'Endpoint is accessible',
            'timestamp' => now(),
            'user' => $request->user() ? $request->user()->email : 'not authenticated',
        ]);
    }
}
