<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use App\Models\SystemSetting;

class SendScheduledEvaluations extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'evaluations:send-scheduled';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send scheduled evaluation emails that are due';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking for scheduled evaluations...');

        // Get evaluations scheduled for now or earlier that haven't been sent yet
        $scheduledEvaluations = DB::table('evaluation_triggered')
            ->whereNotNull('scheduled_trigger_at')
            ->where('scheduled_trigger_at', '<=', now())
            ->whereNull('email_sent_at')
            ->whereNull('deleted_at')
            ->get();

        if ($scheduledEvaluations->isEmpty()) {
            $this->info('No scheduled evaluations to send.');
            return 0;
        }

        $this->info("Found {$scheduledEvaluations->count()} scheduled evaluation(s) to send.");

        $sentCount = 0;
        $failedCount = 0;

        foreach ($scheduledEvaluations as $evaluation) {
            try {
                $this->info("Sending evaluation to: {$evaluation->evaluator_email}");

                // Prepare evaluation URL
                $evaluationUrl = config('app.frontend_url', 'https://prod.qsights.com') . 
                    '/e/evaluate/' . $evaluation->id . '?token=' . $evaluation->access_token;

                // Prepare email content
                $emailSubject = $evaluation->email_subject ?? ('Evaluation Request: ' . $evaluation->template_name);
                $emailBody = $evaluation->email_body ?? "Hello {evaluator_name},\n\nYou have been requested to complete evaluations for your team members.";

                // Parse subordinates
                $subordinates = json_decode($evaluation->subordinates, true);
                $subordinatesList = collect($subordinates)->pluck('name')->implode("\n- ");

                // Replace placeholders
                $emailBody = str_replace('{evaluation_url}', $evaluationUrl, $emailBody);
                $emailBody = str_replace([
                    '{evaluator_name}',
                    '{start_date}',
                    '{end_date}',
                    '{subordinates_list}'
                ], [
                    $evaluation->evaluator_name,
                    $evaluation->start_date ?? 'Not specified',
                    $evaluation->end_date ?? 'Not specified',
                    $subordinatesList
                ], $emailBody);

                // Get email credentials
                $sendGridApiKey = SystemSetting::getValue('email_sendgrid_api_key') ?: env('SENDGRID_API_KEY');
                $from = SystemSetting::getValue('email_sender_email') ?: config('mail.from.address', 'info@qsights.com');
                $fromName = SystemSetting::getValue('email_sender_name') ?: config('mail.from.name', 'QSights');

                // Build email HTML
                $buttonHtml = "
                    <table role='presentation' cellspacing='0' cellpadding='0' border='0' align='center' style='margin: 30px auto;'>
                        <tr>
                            <td align='center' bgcolor='#667eea' style='border-radius: 8px; background-color: #667eea;'>
                                <a href='" . $evaluationUrl . "' target='_blank' style='background-color: #667eea; border: 15px solid #667eea; border-radius: 8px; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; line-height: 1.1; text-align: center; text-decoration: none; display: inline-block; color: #ffffff; mso-padding-alt: 0;'>
                                    <span style='color: #ffffff; mso-text-raise: 15pt;'>Start Evaluation →</span>
                                </a>
                            </td>
                        </tr>
                    </table>";

                $htmlBody = "<!DOCTYPE html>
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
                                            " . nl2br(e($emailBody)) . "
                                            " . $buttonHtml . "
                                            <p style='color: #888888; font-size: 12px; margin-top: 30px; text-align: center; border-top: 1px solid #eeeeee; padding-top: 20px;'>
                                                If the button doesn't work, copy and paste this link into your browser:<br>
                                                <a href='" . $evaluationUrl . "' style='color: #667eea; word-break: break-all;'>" . $evaluationUrl . "</a>
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>";

                // Send via SendGrid
                $response = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $sendGridApiKey,
                    'Content-Type' => 'application/json'
                ])->post('https://api.sendgrid.com/v3/mail/send', [
                    'personalizations' => [[
                        'to' => [['email' => $evaluation->evaluator_email, 'name' => $evaluation->evaluator_name]],
                        'subject' => $emailSubject
                    ]],
                    'from' => ['email' => $from, 'name' => $fromName],
                    'content' => [['type' => 'text/html', 'value' => $htmlBody]]
                ]);

                if ($response->successful()) {
                    // Update email sent status
                    DB::table('evaluation_triggered')
                        ->where('id', $evaluation->id)
                        ->update(['email_sent_at' => now()]);

                    $sentCount++;
                    $this->info("✓ Sent to {$evaluation->evaluator_email}");
                } else {
                    $failedCount++;
                    $this->error("✗ Failed to send to {$evaluation->evaluator_email}: " . $response->body());
                }

            } catch (\Exception $e) {
                $failedCount++;
                $this->error("✗ Error sending to {$evaluation->evaluator_email}: " . $e->getMessage());
            }
        }

        $this->info("\n" . str_repeat('=', 50));
        $this->info("Summary:");
        $this->info("  Sent: {$sentCount}");
        $this->info("  Failed: {$failedCount}");
        $this->info(str_repeat('=', 50));

        return 0;
    }
}
