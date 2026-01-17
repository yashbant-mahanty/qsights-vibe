<?php

namespace App\Services;

use SendGrid\Mail\Mail;
use App\Models\Notification;
use App\Models\NotificationTemplate;
use App\Models\Activity;
use App\Models\SystemSetting;
use App\Services\QrCodeService;
use Illuminate\Support\Str;
use Carbon\Carbon;

class EmailService
{
    protected $sendgrid;
    protected $fromEmail;
    protected $fromName;
    protected $qrCodeService;

    public function __construct()
    {
        $this->loadSendGridConfig();
        $this->qrCodeService = new QrCodeService();
    }

    /**
     * Load SendGrid configuration from System Settings (database) with env fallback
     */
    protected function loadSendGridConfig()
    {
        try {
            // Try to load from database first (keys have 'email_' prefix in database)
            $apiKey = SystemSetting::getValue('email_sendgrid_api_key');
            $senderEmail = SystemSetting::getValue('email_sender_email');
            $senderName = SystemSetting::getValue('email_sender_name');

            if ($apiKey && $senderEmail) {
                // Use database settings
                $this->sendgrid = new \SendGrid($apiKey);
                $this->fromEmail = $senderEmail;
                $this->fromName = $senderName ?: 'QSights';
                
                \Log::debug('EmailService: Using SendGrid config from System Settings (database)', [
                    'sender_email' => $this->fromEmail,
                    'sender_name' => $this->fromName,
                ]);
                return;
            }
        } catch (\Exception $e) {
            \Log::warning('EmailService: Failed to load SendGrid config from database, falling back to env', [
                'error' => $e->getMessage()
            ]);
        }

        // Fallback to environment variables
        $this->sendgrid = new \SendGrid(env('SENDGRID_API_KEY'));
        $this->fromEmail = env('SENDGRID_FROM_EMAIL', env('MAIL_FROM_ADDRESS', 'info@qsights.com'));
        $this->fromName = env('SENDGRID_FROM_NAME', env('MAIL_FROM_NAME', 'QSights'));
        
        \Log::debug('EmailService: Using SendGrid config from environment variables', [
            'sender_email' => $this->fromEmail,
            'sender_name' => $this->fromName,
        ]);
    }

    /**
     * Reload SendGrid configuration (useful after settings are updated)
     */
    public function reloadConfig()
    {
        $this->loadSendGridConfig();
        return $this;
    }

    /**
     * Get the communication email for a user (falls back to regular email if not set)
     */
    protected function getCommunicationEmail($user): string
    {
        return $user->communication_email ?: $user->email;
    }

    /**
     * Send email using SendGrid
     */
    public function send($to, $subject, $message, $metadata = [])
    {
        try {
            $email = new Mail();
            $email->setFrom($this->fromEmail, $this->fromName);
            $email->setSubject($subject);
            $email->addTo($to);
            $email->addContent("text/html", $message);

            $response = $this->sendgrid->send($email);

            // Log detailed SendGrid response
            \Log::info('SendGrid API Response', [
                'to' => $to,
                'status_code' => $response->statusCode(),
                'headers' => $response->headers(),
                'body' => $response->body(),
            ]);

            // Log notification
            $notification = Notification::create([
                'id' => Str::uuid(),
                'type' => 'email',
                'event' => $metadata['event'] ?? 'email_sent',
                'participant_id' => $metadata['participant_id'] ?? null,
                'recipient_email' => $to,
                'subject' => $subject,
                'message' => $message,
                'status' => $response->statusCode() >= 200 && $response->statusCode() < 300 ? 'sent' : 'failed',
                'metadata' => array_merge($metadata, [
                    'sendgrid_status_code' => $response->statusCode(),
                    'sendgrid_response_body' => $response->body(),
                ]),
                'sent_at' => now(),
            ]);

            return [
                'success' => $response->statusCode() >= 200 && $response->statusCode() < 300,
                'status_code' => $response->statusCode(),
                'notification_id' => $notification->id,
            ];
        } catch (\Exception $e) {
            // Log failed notification
            $notification = Notification::create([
                'id' => Str::uuid(),
                'type' => 'email',
                'event' => $metadata['event'] ?? 'email_sent',
                'participant_id' => $metadata['participant_id'] ?? null,
                'recipient_email' => $to,
                'subject' => $subject,
                'message' => $message,
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'metadata' => $metadata,
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
                'notification_id' => $notification->id,
            ];
        }
    }

    /**
     * Send activity invitation email
     */
    public function sendActivityInvitation($participant, $activity)
    {
        // Load activity with relationships for template data
        $activity->load('program.organization');

        // Check for custom template
        $template = $activity->getNotificationTemplate(NotificationTemplate::TYPE_INVITATION);
        
        if ($template) {
            // Use custom template
            $templateData = $this->prepareTemplateData($participant, $activity);
            $rendered = $template->renderTemplate($templateData);
            $subject = $rendered['subject'];
            $message = $rendered['body_html'];
        } else {
            // Use default template
            $subject = "You're invited: {$activity->name}";
            $message = $this->renderActivityInvitationTemplate($participant, $activity);
        }

        return $this->send(
            $participant->email,
            $subject,
            $message,
            [
                'event' => 'activity_created',
                'participant_id' => $participant->id,
                'activity_id' => $activity->id,
                'program_id' => $activity->program_id,
            ]
        );
    }

    /**
     * Send activity reminder email
     */
    public function sendActivityReminder($participant, $activity)
    {
        // Load activity with relationships for template data
        $activity->load('program.organization');

        // Check for custom template
        $template = $activity->getNotificationTemplate(NotificationTemplate::TYPE_REMINDER);
        
        if ($template) {
            // Use custom template
            $templateData = $this->prepareTemplateData($participant, $activity);
            $rendered = $template->renderTemplate($templateData);
            $subject = $rendered['subject'];
            $message = $rendered['body_html'];
        } else {
            // Use default template
            $subject = "Reminder: {$activity->name} starts soon";
            $message = $this->renderActivityReminderTemplate($participant, $activity);
        }

        return $this->send(
            $participant->email,
            $subject,
            $message,
            [
                'event' => 'activity_reminder',
                'participant_id' => $participant->id,
                'activity_id' => $activity->id,
                'program_id' => $activity->program_id,
            ]
        );
    }

    /**
     * Render activity invitation template
     */
    private function renderActivityInvitationTemplate($participant, $activity)
    {
        // Generate access token for direct access
        $accessToken = \App\Models\ActivityAccessToken::generateToken($activity->id, $participant->id);
        $activityUrl = env('FRONTEND_URL', env('APP_URL')) . "/activities/take/{$activity->id}?token={$accessToken->token}";
        $startDate = $activity->start_date->format('F j, Y');
        $startTime = $activity->start_date->format('g:i A');

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .details { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>You're Invited!</h1>
        </div>
        <div class="content">
            <p>Hi {$participant->name},</p>
            <p>You've been invited to participate in <strong>{$activity->name}</strong>.</p>
            
            <div class="details">
                <h3>Activity Details</h3>
                <p><strong>Start Date:</strong> {$startDate} at {$startTime}</p>
                <p><strong>Type:</strong> {$activity->type}</p>
HTML;
        
        if ($activity->description) {
            $message .= "<p><strong>Description:</strong> {$activity->description}</p>";
        }
        
        $message .= <<<HTML
            </div>

            <a href="{$activityUrl}" class="button">View Activity</a>

            <p>We look forward to your participation!</p>
        </div>
        <div class="footer">
            <p>© 2025 QSights Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Render activity reminder template
     */
    private function renderActivityReminderTemplate($participant, $activity)
    {
        // Generate access token for direct access (or reuse existing if not used)
        $existingToken = \App\Models\ActivityAccessToken::where('activity_id', $activity->id)
            ->where('participant_id', $participant->id)
            ->whereNull('used_at')
            ->where(function($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->first();
        
        if ($existingToken) {
            $accessToken = $existingToken;
        } else {
            $accessToken = \App\Models\ActivityAccessToken::generateToken($activity->id, $participant->id);
        }
        
        $activityUrl = env('FRONTEND_URL', env('APP_URL')) . "/activities/take/{$activity->id}?token={$accessToken->token}";
        $startDate = $activity->start_date->format('F j, Y');
        $startTime = $activity->start_date->format('g:i A');

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .alert { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Activity Reminder</h1>
        </div>
        <div class="content">
            <p>Hi {$participant->name},</p>
            
            <div class="alert">
                <strong>{$activity->name}</strong> starts on {$startDate} at {$startTime}
            </div>

            <p>Don't forget to participate in this activity. Your insights are valuable to us!</p>

            <a href="{$activityUrl}" class="button">Go to Activity</a>

            <p>See you there!</p>
        </div>
        <div class="footer">
            <p>© 2025 QSights Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Send thank you email
     */
    public function sendThankYou($participant, $activity)
    {
        $activity->load('program.organization');

        $template = $activity->getNotificationTemplate(NotificationTemplate::TYPE_THANK_YOU);
        
        if ($template) {
            $templateData = $this->prepareTemplateData($participant, $activity);
            $rendered = $template->renderTemplate($templateData);
            $subject = $rendered['subject'];
            $message = $rendered['body_html'];
        } else {
            $subject = "Thank you for participating in {$activity->name}";
            $message = $this->renderDefaultThankYouTemplate($participant, $activity);
        }

        return $this->send(
            $participant->email,
            $subject,
            $message,
            [
                'event' => 'thank_you',
                'participant_id' => $participant->id,
                'activity_id' => $activity->id,
                'program_id' => $activity->program_id,
            ]
        );
    }

    /**
     * Send thank you email with assessment results
     */
    public function sendThankYouEmail($participant, $activity, $resultData = [])
    {
        $activity->load('program.organization');

        $template = $activity->getNotificationTemplate(NotificationTemplate::TYPE_THANK_YOU);
        
        if ($template) {
            $templateData = $this->prepareTemplateData($participant, $activity);
            // Add result data to template variables
            $templateData['score'] = $resultData['score'] ?? null;
            $templateData['assessment_result'] = $resultData['assessment_result'] ?? null;
            $templateData['correct_answers_count'] = $resultData['correct_answers_count'] ?? 0;
            $templateData['total_questions'] = $resultData['total_questions'] ?? 0;
            $templateData['attempt_number'] = $resultData['attempt_number'] ?? 1;
            
            $rendered = $template->renderTemplate($templateData);
            $subject = $rendered['subject'];
            $message = $rendered['body_html'];
        } else {
            $subject = "Thank you for completing {$activity->name}";
            $message = $this->renderThankYouWithResultsTemplate($participant, $activity, $resultData);
        }

        return $this->send(
            $participant->email,
            $subject,
            $message,
            [
                'event' => 'response_submitted',
                'participant_id' => $participant->id,
                'activity_id' => $activity->id,
                'program_id' => $activity->program_id,
                'result_data' => $resultData,
            ]
        );
    }

    /**
     * Send program expiry notification
     */
    public function sendProgramExpiry($participant, $activity)
    {
        $activity->load('program.organization');

        $template = $activity->getNotificationTemplate(NotificationTemplate::TYPE_PROGRAM_EXPIRY);
        
        if ($template) {
            $templateData = $this->prepareTemplateData($participant, $activity);
            $rendered = $template->renderTemplate($templateData);
            $subject = $rendered['subject'];
            $message = $rendered['body_html'];
        } else {
            $subject = "Program Expiring: {$activity->program->name}";
            $message = $this->renderDefaultProgramExpiryTemplate($participant, $activity);
        }

        return $this->send(
            $participant->email,
            $subject,
            $message,
            [
                'event' => 'program_expiry',
                'participant_id' => $participant->id,
                'activity_id' => $activity->id,
                'program_id' => $activity->program_id,
            ]
        );
    }

    /**
     * Send activity summary
     */
    public function sendActivitySummary($participant, $activity)
    {
        $activity->load('program.organization');

        $template = $activity->getNotificationTemplate(NotificationTemplate::TYPE_ACTIVITY_SUMMARY);
        
        if ($template) {
            $templateData = $this->prepareTemplateData($participant, $activity);
            $rendered = $template->renderTemplate($templateData);
            $subject = $rendered['subject'];
            $message = $rendered['body_html'];
        } else {
            $subject = "Activity Summary: {$activity->name}";
            $message = $this->renderDefaultActivitySummaryTemplate($participant, $activity);
        }

        return $this->send(
            $participant->email,
            $subject,
            $message,
            [
                'event' => 'activity_summary',
                'participant_id' => $participant->id,
                'activity_id' => $activity->id,
                'program_id' => $activity->program_id,
            ]
        );
    }

    /**
     * Prepare template data for placeholders
     */
    private function prepareTemplateData($participant, $activity)
    {
        $daysUntilStart = 0;
        if ($activity->start_date) {
            $daysUntilStart = max(0, Carbon::now()->diffInDays($activity->start_date, false));
        }

        // Generate QR code for the activity
        $qrCode = $this->qrCodeService->generateActivityQrCode($activity->id);

        return [
            'participant_name' => $participant->name ?? 'Participant',
            'participant_email' => $participant->email ?? '',
            'activity_name' => $activity->name,
            'activity_description' => $activity->description ?? '',
            'activity_type' => $activity->type,
            'activity_start_date' => $activity->start_date ? $activity->start_date->format('F j, Y') : 'TBD',
            'activity_end_date' => $activity->end_date ? $activity->end_date->format('F j, Y') : 'TBD',
            'program_name' => $activity->program->name ?? 'QSights Program',
            'program_description' => $activity->program->description ?? '',
            'organization_name' => $activity->program->organization->name ?? 'QSights',
            'activity_url' => env('APP_URL') . '/activities/' . $activity->id,
            'qr_code' => $qrCode,
            'days_until_start' => $daysUntilStart,
            'current_date' => Carbon::now()->format('F j, Y'),
            'response_count' => $activity->responses()->count(),
            'completion_rate' => $activity->getCompletionRate(),
        ];
    }

    /**
     * Default thank you template (fallback)
     */
    private function renderDefaultThankYouTemplate($participant, $activity)
    {
        return "<p>Hi {$participant->name},</p><p>Thank you for participating in {$activity->name}!</p>";
    }

    /**
     * Default thank you with results template (fallback)
     */
    private function renderThankYouWithResultsTemplate($participant, $activity, $resultData)
    {
        $html = "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>";
        $html .= "<h2>Thank You for Completing {$activity->name}!</h2>";
        $html .= "<p>Hi {$participant->name},</p>";
        $html .= "<p>Thank you for completing <strong>{$activity->name}</strong>.</p>";
        
        // Add assessment results if available
        if ($activity->type === 'assessment' && isset($resultData['score'])) {
            $score = round($resultData['score'], 1);
            $correct = $resultData['correct_answers_count'] ?? 0;
            $total = $resultData['total_questions'] ?? 0;
            $result = $resultData['assessment_result'] ?? 'pending';
            $attempt = $resultData['attempt_number'] ?? 1;
            
            $html .= "<div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;'>";
            $html .= "<h3 style='margin-top: 0;'>Your Results</h3>";
            $html .= "<p><strong>Score:</strong> {$score}%</p>";
            $html .= "<p><strong>Correct Answers:</strong> {$correct} out of {$total}</p>";
            $html .= "<p><strong>Result:</strong> " . ucfirst($result) . "</p>";
            $html .= "<p><strong>Attempt:</strong> #{$attempt}</p>";
            $html .= "</div>";
        }
        
        $html .= "<p>We appreciate your participation and feedback.</p>";
        $html .= "<p>Best regards,<br>The QSights Team</p>";
        $html .= "</div>";
        
        return $html;
    }

    /**
     * Default program expiry template (fallback)
     */
    private function renderDefaultProgramExpiryTemplate($participant, $activity)
    {
        return "<p>Hi {$participant->name},</p><p>The program {$activity->program->name} is expiring soon. Please complete any pending activities.</p>";
    }

    /**
     * Default activity summary template (fallback)
     */
    private function renderDefaultActivitySummaryTemplate($participant, $activity)
    {
        $responseCount = $activity->responses()->count();
        $completionRate = $activity->getCompletionRate();
        return "<p>Hi {$participant->name},</p><p>Here's a summary of {$activity->name}: {$responseCount} responses with {$completionRate}% completion rate.</p>";
    }

    /**
     * Send demo request notification to super admin
     */
    public function sendDemoRequestNotification($admin, $demoRequest)
    {
        $subject = "New Demo Request - {$demoRequest->name}";
        
        $message = "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
            <h2 style='color: #4F46E5;'>New Demo Request Received</h2>
            
            <div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                <h3 style='margin-top: 0;'>Request Details</h3>
                <p><strong>Name:</strong> {$demoRequest->name}</p>
                <p><strong>Email:</strong> {$demoRequest->email}</p>
                <p><strong>Phone:</strong> " . ($demoRequest->phone ?: 'Not provided') . "</p>
                <p><strong>Location:</strong> {$demoRequest->city}, {$demoRequest->country}</p>
                " . ($demoRequest->message ? "<p><strong>Message:</strong><br>{$demoRequest->message}</p>" : "") . "
                <p><strong>Submitted:</strong> " . $demoRequest->created_at->format('F j, Y g:i A') . "</p>
            </div>
            
            <p>Please review and follow up with this demo request at your earliest convenience.</p>
            
            <a href='" . config('app.frontend_url') . "/settings/demo-requests' 
               style='display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;'>
                View Demo Requests
            </a>
            
            <p style='color: #666; font-size: 14px; margin-top: 30px;'>
                This is an automated notification from QSights Platform.
            </p>
        </div>
        ";
        
        $recipientEmail = $this->getCommunicationEmail($admin);
        
        return $this->send($recipientEmail, $subject, $message, [
            'event' => 'demo_request_notification',
            'demo_request_id' => $demoRequest->id,
        ]);
    }

    /**
     * Send demo request notification to support@qsights.com
     */
    public function sendDemoRequestToSupport($demoRequest)
    {
        $subject = "New Demo Request - {$demoRequest->name}";
        
        $message = "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
            <h2 style='color: #4F46E5;'>New Demo Request from Website</h2>
            
            <div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                <h3 style='margin-top: 0;'>Prospect Information</h3>
                <p><strong>Name:</strong> {$demoRequest->name}</p>
                <p><strong>Email:</strong> <a href='mailto:{$demoRequest->email}'>{$demoRequest->email}</a></p>
                <p><strong>Phone:</strong> " . ($demoRequest->phone ?: 'Not provided') . "</p>
                <p><strong>Location:</strong> {$demoRequest->city}, {$demoRequest->country}</p>
                " . ($demoRequest->message ? "<p><strong>Message:</strong><br>{$demoRequest->message}</p>" : "") . "
                <p><strong>Submitted:</strong> " . $demoRequest->created_at->format('F j, Y g:i A') . "</p>
            </div>
            
            <p><strong>Action Required:</strong> Please follow up with this prospect within 24 hours to schedule a personalized demo.</p>
        </div>
        ";
        
        return $this->send('support@qsights.com', $subject, $message, [
            'event' => 'demo_request_support',
            'demo_request_id' => $demoRequest->id,
        ]);
    }

    /**
     * Send contact sales notification to super admin
     */
    public function sendContactSalesNotification($admin, $contactSales)
    {
        $subject = "New Sales Inquiry - {$contactSales->first_name} {$contactSales->last_name}";
        
        $message = "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
            <h2 style='color: #4F46E5;'>New Sales Inquiry Received</h2>
            
            <div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                <h3 style='margin-top: 0;'>Contact Information</h3>
                <p><strong>Name:</strong> {$contactSales->first_name} {$contactSales->last_name}</p>
                <p><strong>Email:</strong> {$contactSales->email}</p>
                <p><strong>Phone:</strong> " . ($contactSales->phone ?: 'Not provided') . "</p>
                <p><strong>Company:</strong> " . ($contactSales->company ?: 'Not provided') . "</p>
                <p><strong>Company Size:</strong> " . ($contactSales->company_size ?: 'Not provided') . "</p>
                <p><strong>Role:</strong> " . ($contactSales->role ?: 'Not provided') . "</p>
                <p><strong>Interest:</strong> " . ($contactSales->interest ?: 'Not provided') . "</p>
                " . ($contactSales->message ? "<p><strong>Message:</strong><br>{$contactSales->message}</p>" : "") . "
                <p><strong>Submitted:</strong> " . $contactSales->created_at->format('F j, Y g:i A') . "</p>
            </div>
            
            <p>Please review and respond to this sales inquiry promptly.</p>
            
            <a href='" . config('app.frontend_url') . "/settings/contact-sales' 
               style='display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;'>
                View Sales Inquiries
            </a>
            
            <p style='color: #666; font-size: 14px; margin-top: 30px;'>
                This is an automated notification from QSights Platform.
            </p>
        </div>
        ";
        
        $recipientEmail = $this->getCommunicationEmail($admin);
        
        return $this->send($recipientEmail, $subject, $message, [
            'event' => 'contact_sales_notification',
            'contact_sales_id' => $contactSales->id,
        ]);
    }

    /**
     * Send contact sales notification to support@qsights.com and info@qsights.com
     */
    public function sendContactSalesToSupport($contactSales)
    {
        $subject = "New Sales Inquiry - {$contactSales->company}";
        
        $message = "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
            <h2 style='color: #4F46E5;'>New Sales Inquiry from Website</h2>
            
            <div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                <h3 style='margin-top: 0;'>Lead Information</h3>
                <p><strong>Name:</strong> {$contactSales->first_name} {$contactSales->last_name}</p>
                <p><strong>Email:</strong> <a href='mailto:{$contactSales->email}'>{$contactSales->email}</a></p>
                <p><strong>Phone:</strong> " . ($contactSales->phone ?: 'Not provided') . "</p>
                <p><strong>Company:</strong> " . ($contactSales->company ?: 'Not provided') . "</p>
                <p><strong>Company Size:</strong> " . ($contactSales->company_size ?: 'Not provided') . "</p>
                <p><strong>Role:</strong> " . ($contactSales->role ?: 'Not provided') . "</p>
                <p><strong>Interest:</strong> " . ($contactSales->interest ?: 'Not provided') . "</p>
                " . ($contactSales->message ? "<p><strong>Message:</strong><br>{$contactSales->message}</p>" : "") . "
                <p><strong>Submitted:</strong> " . $contactSales->created_at->format('F j, Y g:i A') . "</p>
            </div>
            
            <p><strong>Action Required:</strong> Please contact this lead within 24 hours to discuss their needs and requirements.</p>
            
            <div style='background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;'>
                <strong>Priority:</strong> Sales inquiry - requires prompt follow-up
            </div>
        </div>
        ";
        
        // Send to both support and info
        $results = [];
        $results['support'] = $this->send('support@qsights.com', $subject, $message, [
            'event' => 'contact_sales_support',
            'contact_sales_id' => $contactSales->id,
        ]);
        
        $results['info'] = $this->send('info@qsights.com', $subject, $message, [
            'event' => 'contact_sales_info',
            'contact_sales_id' => $contactSales->id,
        ]);
        
        return $results;
    }
}
