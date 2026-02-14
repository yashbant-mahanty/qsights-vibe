<?php

namespace App\Services;

use App\Models\EvaluationNotificationConfig;
use App\Models\EvaluationNotificationLog;
use App\Models\EvaluationBellNotification;
use App\Models\EvaluationReminderSchedule;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\EmailService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class EvaluationNotificationService
{
    protected $emailService;

    public function __construct(EmailService $emailService = null)
    {
        $this->emailService = $emailService ?? new EmailService();
    }

    /**
     * Send notification when evaluation is triggered/assigned
     */
    public function notifyEvaluationTriggered($evaluationTriggered, $adminIds = [])
    {
        $config = EvaluationNotificationConfig::getForProgram($evaluationTriggered['program_id']);

        if (!$config->enable_trigger_notifications) {
            Log::info('Trigger notifications disabled for program', ['program_id' => $evaluationTriggered['program_id']]);
            return;
        }

        // Get all admins who should receive notifications
        if (empty($adminIds)) {
            $adminIds = $this->getAdminsForProgram($evaluationTriggered['program_id']);
        }

        foreach ($adminIds as $adminId) {
            $admin = User::find($adminId);
            if (!$admin) continue;

            // Send email notification to admin
            $this->sendTriggerEmailToAdmin($admin, $evaluationTriggered, $config);

            // Create bell notification for admin
            $this->createBellNotification($admin->id, $evaluationTriggered, 'trigger');
        }

        // Schedule automatic reminders if enabled
        if ($config->enable_automatic_reminders && !empty($evaluationTriggered['end_date'])) {
            $this->scheduleReminders($evaluationTriggered, $config);
        }
    }

    /**
     * Send notification when evaluation is completed
     */
    public function notifyEvaluationCompleted($evaluationTriggered, $adminIds = [])
    {
        $config = EvaluationNotificationConfig::getForProgram($evaluationTriggered['program_id']);

        if (!$config->enable_completion_notifications) {
            Log::info('Completion notifications disabled for program', ['program_id' => $evaluationTriggered['program_id']]);
            return;
        }

        // Get all admins who should receive notifications
        if (empty($adminIds)) {
            $adminIds = $this->getAdminsForProgram($evaluationTriggered['program_id']);
        }

        foreach ($adminIds as $adminId) {
            $admin = User::find($adminId);
            if (!$admin) continue;

            // Send email notification to admin
            $this->sendCompletionEmailToAdmin($admin, $evaluationTriggered, $config);

            // Create bell notification for admin
            $this->createBellNotification($admin->id, $evaluationTriggered, 'completion');
        }
    }

    /**
     * Send alert when deadline is missed
     */
    public function notifyMissedDeadline($evaluationTriggered, $adminIds = [])
    {
        $config = EvaluationNotificationConfig::getForProgram($evaluationTriggered['program_id']);

        if (!$config->enable_missed_deadline_alerts) {
            Log::info('Missed deadline alerts disabled for program', ['program_id' => $evaluationTriggered['program_id']]);
            return;
        }

        // Get all admins who should receive notifications
        if (empty($adminIds)) {
            $adminIds = $this->getAdminsForProgram($evaluationTriggered['program_id']);
        }

        foreach ($adminIds as $adminId) {
            $admin = User::find($adminId);
            if (!$admin) continue;

            // Send email alert to admin
            $this->sendMissedDeadlineEmailToAdmin($admin, $evaluationTriggered, $config);

            // Create bell notification for admin with high priority
            $this->createBellNotification($admin->id, $evaluationTriggered, 'missed_deadline', 'high');
        }
    }

    /**
     * Send reminder to evaluator
     */
    public function sendReminderToEvaluator($evaluationTriggered, $daysRemaining)
    {
        $config = EvaluationNotificationConfig::getForProgram($evaluationTriggered['program_id']);

        if (!$config->enable_automatic_reminders) {
            Log::info('Automatic reminders disabled for program', ['program_id' => $evaluationTriggered['program_id']]);
            return;
        }

        // Send email reminder to evaluator
        $this->sendReminderEmail($evaluationTriggered, $daysRemaining, $config);
    }

    /**
     * Send trigger email to admin
     */
    protected function sendTriggerEmailToAdmin($admin, $evaluationTriggered, $config)
    {
        $subject = "Evaluation Assigned: {$evaluationTriggered['template_name']}";
        
        $template = $config->trigger_email_template ?? $this->getDefaultTriggerTemplate();
        $message = $this->replacePlaceholders($template, $evaluationTriggered, $admin);

        return $this->sendEmail(
            $admin,
            $subject,
            $message,
            $evaluationTriggered,
            'trigger'
        );
    }

    /**
     * Send completion email to admin
     */
    protected function sendCompletionEmailToAdmin($admin, $evaluationTriggered, $config)
    {
        $subject = "Evaluation Completed: {$evaluationTriggered['template_name']}";
        
        $template = $config->completion_email_template ?? $this->getDefaultCompletionTemplate();
        $message = $this->replacePlaceholders($template, $evaluationTriggered, $admin);

        return $this->sendEmail(
            $admin,
            $subject,
            $message,
            $evaluationTriggered,
            'completion'
        );
    }

    /**
     * Send missed deadline email to admin
     */
    protected function sendMissedDeadlineEmailToAdmin($admin, $evaluationTriggered, $config)
    {
        $subject = "⚠️ Missed Deadline Alert: {$evaluationTriggered['template_name']}";
        
        $template = $config->missed_deadline_template ?? $this->getDefaultMissedDeadlineTemplate();
        $message = $this->replacePlaceholders($template, $evaluationTriggered, $admin);

        return $this->sendEmail(
            $admin,
            $subject,
            $message,
            $evaluationTriggered,
            'missed_deadline'
        );
    }

    /**
     * Send reminder email to evaluator
     */
    protected function sendReminderEmail($evaluationTriggered, $daysRemaining, $config)
    {
        $subject = "Reminder: Complete Evaluation - {$evaluationTriggered['template_name']}";
        
        $template = $config->reminder_email_template ?? $this->getDefaultReminderTemplate();
        $message = $this->replacePlaceholders($template, $evaluationTriggered, null, $daysRemaining);

        // Get evaluator staff details
        $evaluator = DB::table('evaluation_staff')
            ->where('id', $evaluationTriggered['evaluator_id'])
            ->first();

        if (!$evaluator || !$evaluator->email) {
            Log::warning('No email found for evaluator', ['evaluator_id' => $evaluationTriggered['evaluator_id']]);
            return;
        }

        return $this->sendEmailToEvaluator(
            $evaluator,
            $subject,
            $message,
            $evaluationTriggered,
            'reminder'
        );
    }

    /**
     * Send email using EmailService
     */
    protected function sendEmail($admin, $subject, $message, $evaluationTriggered, $type)
    {
        $recipientEmail = $admin->communication_email ?? $admin->email;
        
        // Create notification log - id is bigint auto-increment, do NOT set manually
        $log = EvaluationNotificationLog::create([
            'evaluation_triggered_id' => $evaluationTriggered['id'] ?? null,
            'program_id' => $evaluationTriggered['program_id'],
            'notification_type' => $type,
            'channel' => 'email',
            'recipient_id' => $admin->id,
            'recipient_email' => $recipientEmail,
            'recipient_name' => $admin->name,
            'subject' => $subject,
            'message' => $message,
            'metadata' => json_encode([
                'evaluator_name' => $evaluationTriggered['evaluator_name'] ?? '',
                'template_name' => $evaluationTriggered['template_name'] ?? '',
                'subordinates_count' => $evaluationTriggered['subordinates_count'] ?? 0,
            ]),
            'status' => 'pending',
        ]);

        try {
            $result = $this->emailService->send(
                $recipientEmail,
                $subject,
                $message,
                [
                    'event' => 'evaluation_' . $type,
                    'evaluation_triggered_id' => $evaluationTriggered['id'] ?? null,
                    'admin_id' => $admin->id,
                ]
            );

            if ($result['success']) {
                $log->update([
                    'status' => 'sent',
                    'sent_at' => now(),
                    'provider' => 'SendGrid',
                    'provider_message_id' => $result['message_id'] ?? null,
                ]);
            } else {
                $log->update([
                    'status' => 'failed',
                    'failed_at' => now(),
                    'error_message' => $result['error'] ?? 'Unknown error',
                ]);
            }

            return $result;
        } catch (\Exception $e) {
            Log::error('Failed to send evaluation notification email', [
                'error' => $e->getMessage(),
                'admin_email' => $recipientEmail,
                'type' => $type,
            ]);

            $log->update([
                'status' => 'failed',
                'failed_at' => now(),
                'error_message' => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send trigger email to evaluator (when evaluation is assigned)
     */
    public function sendTriggerEmailToEvaluator($evaluationTriggered)
    {
        $config = EvaluationNotificationConfig::getForProgram($evaluationTriggered['program_id']);

        // Get evaluator details
        $evaluator = DB::table('evaluation_staff')
            ->where('id', $evaluationTriggered['evaluator_id'])
            ->first();

        if (!$evaluator || !$evaluator->email) {
            Log::warning('No email found for evaluator', ['evaluator_id' => $evaluationTriggered['evaluator_id']]);
            return ['success' => false, 'error' => 'No email found for evaluator'];
        }

        // Use configured template or default
        $template = $config->trigger_email_template ?? $this->getDefaultEvaluatorTriggerTemplate();
        
        // Build evaluation URL with access token
        $evaluationUrl = config('app.frontend_url', 'https://prod.qsights.com') . 
            '/e/evaluate/' . $evaluationTriggered['id'] . '?token=' . $evaluationTriggered['access_token'];
        
        // Prepare subject and body with placeholders
        $subject = $evaluationTriggered['email_subject'] ?? 'Evaluation Request: ' . $evaluationTriggered['template_name'];
        
        // Get subordinates list
        $subordinates = json_decode($evaluationTriggered['subordinates'] ?? '[]', true);
        $subordinatesList = collect($subordinates)->map(fn($s) => $s['name'] ?? 'Unknown')->implode("\n- ");
        
        // Replace all placeholders in template
        $message = $this->replaceEvaluatorPlaceholders($template, $evaluationTriggered, $evaluator, $evaluationUrl, $subordinatesList);

        return $this->sendEmailToEvaluator($evaluator, $subject, $message, $evaluationTriggered, 'trigger');
    }

    /**
     * Send email to evaluator
     */
    protected function sendEmailToEvaluator($evaluator, $subject, $message, $evaluationTriggered, $type)
    {
        // Create notification log - id is bigint auto-increment, do NOT set manually
        $log = EvaluationNotificationLog::create([
            'evaluation_triggered_id' => $evaluationTriggered['id'] ?? null,
            'program_id' => $evaluationTriggered['program_id'],
            'notification_type' => $type,
            'channel' => 'email',
            'recipient_id' => $evaluator->user_id ?? null,
            'recipient_email' => $evaluator->email,
            'recipient_name' => $evaluator->name,
            'subject' => $subject,
            'message' => $message,
            'metadata' => json_encode([
                'template_name' => $evaluationTriggered['template_name'] ?? '',
                'subordinates_count' => $evaluationTriggered['subordinates_count'] ?? 0,
            ]),
            'status' => 'pending',
        ]);

        try {
            $result = $this->emailService->send(
                $evaluator->email,
                $subject,
                $message,
                [
                    'event' => 'evaluation_' . $type,
                    'evaluation_triggered_id' => $evaluationTriggered['id'] ?? null,
                    'evaluator_id' => $evaluator->id,
                ]
            );

            if ($result['success']) {
                $log->update([
                    'status' => 'sent',
                    'sent_at' => now(),
                    'provider' => 'SendGrid',
                    'provider_message_id' => $result['message_id'] ?? null,
                ]);
            } else {
                $log->update([
                    'status' => 'failed',
                    'failed_at' => now(),
                    'error_message' => $result['error'] ?? 'Unknown error',
                ]);
            }

            return $result;
        } catch (\Exception $e) {
            Log::error('Failed to send reminder email to evaluator', [
                'error' => $e->getMessage(),
                'evaluator_email' => $evaluator->email,
            ]);

            $log->update([
                'status' => 'failed',
                'failed_at' => now(),
                'error_message' => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Create bell notification for admin
     */
    protected function createBellNotification($userId, $evaluationTriggered, $type, $priority = 'normal')
    {
        $titles = [
            'trigger' => '📋 Evaluation Assigned',
            'completion' => '✅ Evaluation Completed',
            'missed_deadline' => '⚠️ Missed Deadline Alert',
        ];

        $messages = [
            'trigger' => "{$evaluationTriggered['evaluator_name']} has been assigned to evaluate {$evaluationTriggered['subordinates_count']} staff member(s) using {$evaluationTriggered['template_name']}.",
            'completion' => "{$evaluationTriggered['evaluator_name']} has completed the evaluation: {$evaluationTriggered['template_name']}.",
            'missed_deadline' => "{$evaluationTriggered['evaluator_name']} did not complete the evaluation '{$evaluationTriggered['template_name']}' before the deadline.",
        ];

        // Create evaluation-specific notification (for analytics/history)
        EvaluationBellNotification::create([
            'user_id' => $userId,
            'evaluation_triggered_id' => $evaluationTriggered['id'] ?? null,
            'program_id' => $evaluationTriggered['program_id'],
            'notification_type' => $type,
            'title' => $titles[$type] ?? 'Evaluation Notification',
            'message' => $messages[$type] ?? 'An evaluation event occurred.',
            'metadata' => [
                'evaluator_name' => $evaluationTriggered['evaluator_name'] ?? '',
                'template_name' => $evaluationTriggered['template_name'] ?? '',
                'subordinates_count' => $evaluationTriggered['subordinates_count'] ?? 0,
                'end_date' => $evaluationTriggered['end_date'] ?? null,
            ],
            'priority' => $priority,
            'action_url' => '/evaluation-new?tab=history',
        ]);

        // ALSO create UserNotification so it shows in the bell icon
        UserNotification::create([
            'user_id' => $userId,
            'type' => 'evaluation_' . $type,
            'title' => $titles[$type] ?? 'Evaluation Notification',
            'message' => $messages[$type] ?? 'An evaluation event occurred.',
            'entity_type' => 'evaluation',
            'entity_id' => $evaluationTriggered['id'] ?? null,
            'entity_name' => $evaluationTriggered['template_name'] ?? 'Evaluation',
            'action_url' => '/evaluation-new?tab=history',
        ]);
    }

    /**
     * Schedule automatic reminders
     */
    protected function scheduleReminders($evaluationTriggered, $config)
    {
        $endDate = Carbon::parse($evaluationTriggered['end_date']);
        $reminderDays = $config->reminder_schedule ?? [7, 3, 1];

        foreach ($reminderDays as $days) {
            $scheduledDate = $endDate->copy()->subDays($days);

            // Only schedule if the date is in the future
            if ($scheduledDate->isFuture()) {
                EvaluationReminderSchedule::create([
                    'evaluation_triggered_id' => $evaluationTriggered['id'],
                    'days_before_deadline' => $days,
                    'scheduled_for' => $scheduledDate,
                    'status' => 'pending',
                ]);

                Log::info('Scheduled reminder', [
                    'evaluation_id' => $evaluationTriggered['id'],
                    'days_before' => $days,
                    'scheduled_for' => $scheduledDate->toDateTimeString(),
                ]);
            }
        }
    }

    /**
     * Get admins for a program (Evaluation Admin, Program Admin, Super Admin)
     */
    protected function getAdminsForProgram($programId)
    {
        return User::where(function ($query) use ($programId) {
            $query->where('role', 'super-admin')
                  ->orWhere('role', 'evaluation-admin')
                  ->orWhere(function ($q) use ($programId) {
                      $q->where('role', 'program-admin')
                        ->where('program_id', $programId);
                  });
        })->pluck('id')->toArray();
    }

    /**
     * Replace placeholders in email templates
     */
    protected function replacePlaceholders($template, $evaluationTriggered, $admin = null, $daysRemaining = null)
    {
        $subordinates = json_decode($evaluationTriggered['subordinates'] ?? '[]', true);
        $subordinateNames = collect($subordinates)->pluck('name')->implode(', ');

        $placeholders = [
            '{{admin_name}}' => $admin ? $admin->name : '',
            '{{evaluator_name}}' => $evaluationTriggered['evaluator_name'] ?? '',
            '{{evaluator_email}}' => $evaluationTriggered['evaluator_email'] ?? '',
            '{{template_name}}' => $evaluationTriggered['template_name'] ?? '',
            '{{staff_names}}' => $subordinateNames,
            '{{subordinates_count}}' => $evaluationTriggered['subordinates_count'] ?? 0,
            '{{start_date}}' => $evaluationTriggered['start_date'] ? Carbon::parse($evaluationTriggered['start_date'])->format('F j, Y') : 'N/A',
            '{{end_date}}' => $evaluationTriggered['end_date'] ? Carbon::parse($evaluationTriggered['end_date'])->format('F j, Y') : 'N/A',
            '{{days_remaining}}' => $daysRemaining ?? '',
            '{{evaluation_url}}' => config('app.frontend_url', 'https://prod.qsights.com') . '/evaluation-new?tab=history',
        ];

        return str_replace(array_keys($placeholders), array_values($placeholders), $template);
    }

    /**
     * Replace placeholders specifically for evaluator emails (including evaluation URL with token)
     */
    protected function replaceEvaluatorPlaceholders($template, $evaluationTriggered, $evaluator, $evaluationUrl, $subordinatesList)
    {
        $placeholders = [
            '{evaluator_name}' => $evaluator->name ?? '',
            '{template_name}' => $evaluationTriggered['template_name'] ?? '',
            '{start_date}' => $evaluationTriggered['start_date'] ? Carbon::parse($evaluationTriggered['start_date'])->format('F j, Y') : 'Not specified',
            '{end_date}' => $evaluationTriggered['end_date'] ? Carbon::parse($evaluationTriggered['end_date'])->format('F j, Y') : 'Not specified',
            '{subordinates_list}' => $subordinatesList,
            '{subordinates_count}' => $evaluationTriggered['subordinates_count'] ?? 0,
            '{evaluation_url}' => $evaluationUrl,
            '{{evaluator_name}}' => $evaluator->name ?? '',
            '{{template_name}}' => $evaluationTriggered['template_name'] ?? '',
            '{{start_date}}' => $evaluationTriggered['start_date'] ? Carbon::parse($evaluationTriggered['start_date'])->format('F j, Y') : 'Not specified',
            '{{end_date}}' => $evaluationTriggered['end_date'] ? Carbon::parse($evaluationTriggered['end_date'])->format('F j, Y') : 'Not specified',
            '{{subordinates_list}}' => $subordinatesList,
            '{{subordinates_count}}' => $evaluationTriggered['subordinates_count'] ?? 0,
            '{{evaluation_url}}' => $evaluationUrl,
        ];

        return str_replace(array_keys($placeholders), array_values($placeholders), $template);
    }

    /**
     * Get default trigger email template for evaluators
     */
    protected function getDefaultEvaluatorTriggerTemplate()
    {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
</head>
<body style='margin: 0; padding: 0; background-color: #f4f4f4;'>
    <table role='presentation' cellspacing='0' cellpadding='0' border='0' width='100%' style='background-color: #f4f4f4;'>
        <tr>
            <td style='padding: 20px 0;'>
                <table role='presentation' cellspacing='0' cellpadding='0' border='0' width='600' style='margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;'>
                    <tr>
                        <td style='padding: 40px 30px; font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #333333;'>
                            <p>Hello {evaluator_name},</p>
                            <p>You have been requested to complete a {template_name} evaluation for your team members.</p>
                            <p><strong>Evaluation Period:</strong> {start_date} to {end_date}</p>
                            <p><strong>Your subordinates to evaluate:</strong><br>
                            {subordinates_list}</p>
                            <table role='presentation' cellspacing='0' cellpadding='0' border='0' align='center' style='margin: 30px auto;'>
                                <tr>
                                    <td align='center' bgcolor='#667eea' style='border-radius: 8px; background-color: #667eea;'>
                                        <a href='{evaluation_url}' target='_blank' style='background-color: #667eea; border: 15px solid #667eea; border-radius: 8px; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; line-height: 1.1; text-align: center; text-decoration: none; display: inline-block; color: #ffffff;'>
                                            Start Evaluation →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style='color: #888888; font-size: 12px; margin-top: 30px; text-align: center; border-top: 1px solid #eeeeee; padding-top: 20px;'>
                                If the button doesn't work, copy and paste this link into your browser:<br>
                                <a href='{evaluation_url}' style='color: #667eea; word-break: break-all;'>{evaluation_url}</a>
                            </p>
                            <p>Best regards,<br>QSights Team</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
    }

    /**
     * Get default trigger email template
     */
    protected function getDefaultTriggerTemplate()
    {
        return <<<HTML
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📋 Evaluation Assigned</h1>
    </div>
    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Dear {{admin_name}},</p>
        
        <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            An evaluation has been assigned to <strong>{{evaluator_name}}</strong> ({{evaluator_email}}).
        </p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Evaluation Details:</h3>
            <ul style="color: #4b5563; line-height: 1.8;">
                <li><strong>Form:</strong> {{template_name}}</li>
                <li><strong>Evaluator:</strong> {{evaluator_name}}</li>
                <li><strong>Staff to Evaluate:</strong> {{subordinates_count}} member(s)</li>
                <li><strong>Staff Names:</strong> {{staff_names}}</li>
                <li><strong>Start Date:</strong> {{start_date}}</li>
                <li><strong>End Date:</strong> {{end_date}}</li>
            </ul>
        </div>

        <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            The evaluator has been notified via email and can begin the evaluation process.
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{evaluation_url}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                View Evaluation Dashboard
            </a>
        </div>

        <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            This is an automated notification from QSights Evaluation System.
        </p>
    </div>
</div>
HTML;
    }

    /**
     * Get default completion email template
     */
    protected function getDefaultCompletionTemplate()
    {
        return <<<HTML
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✅ Evaluation Completed</h1>
    </div>
    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Dear {{admin_name}},</p>
        
        <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            Great news! <strong>{{evaluator_name}}</strong> has completed the evaluation.
        </p>

        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #065f46; margin-top: 0;">Completion Details:</h3>
            <ul style="color: #047857; line-height: 1.8;">
                <li><strong>Form:</strong> {{template_name}}</li>
                <li><strong>Evaluator:</strong> {{evaluator_name}}</li>
                <li><strong>Staff Evaluated:</strong> {{subordinates_count}} member(s)</li>
                <li><strong>Completed On:</strong> {{end_date}}</li>
            </ul>
        </div>

        <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            You can now view the evaluation results and generate reports from the dashboard.
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{evaluation_url}}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                View Evaluation Results
            </a>
        </div>

        <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            This is an automated notification from QSights Evaluation System.
        </p>
    </div>
</div>
HTML;
    }

    /**
     * Get default missed deadline email template
     */
    protected function getDefaultMissedDeadlineTemplate()
    {
        return <<<HTML
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Missed Deadline Alert</h1>
    </div>
    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Dear {{admin_name}},</p>
        
        <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            This is an alert that <strong>{{evaluator_name}}</strong> did not complete the evaluation before the deadline.
        </p>

        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <h3 style="color: #991b1b; margin-top: 0;">Missed Evaluation Details:</h3>
            <ul style="color: #b91c1c; line-height: 1.8;">
                <li><strong>Form:</strong> {{template_name}}</li>
                <li><strong>Evaluator:</strong> {{evaluator_name}} ({{evaluator_email}})</li>
                <li><strong>Staff Pending:</strong> {{subordinates_count}} member(s)</li>
                <li><strong>Staff Names:</strong> {{staff_names}}</li>
                <li><strong>Deadline:</strong> {{end_date}}</li>
            </ul>
        </div>

        <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            Please follow up with the evaluator to ensure the evaluation is completed promptly.
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{evaluation_url}}" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                View Pending Evaluations
            </a>
        </div>

        <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            This is an automated alert from QSights Evaluation System.
        </p>
    </div>
</div>
HTML;
    }

    /**
     * Get default reminder email template
     */
    protected function getDefaultReminderTemplate()
    {
        return <<<HTML
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Evaluation Reminder</h1>
    </div>
    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Dear {{evaluator_name}},</p>
        
        <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            This is a friendly reminder that you have a pending evaluation to complete.
        </p>

        <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin-top: 0;">Evaluation Details:</h3>
            <ul style="color: #b45309; line-height: 1.8;">
                <li><strong>Form:</strong> {{template_name}}</li>
                <li><strong>Staff to Evaluate:</strong> {{subordinates_count}} member(s)</li>
                <li><strong>Deadline:</strong> {{end_date}}</li>
                <li><strong>Days Remaining:</strong> {{days_remaining}} days</li>
            </ul>
        </div>

        <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            Please complete the evaluation before the deadline to avoid delays.
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{evaluation_url}}" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Complete Evaluation Now
            </a>
        </div>

        <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            This is an automated reminder from QSights Evaluation System.
        </p>
    </div>
</div>
HTML;
    }
}
