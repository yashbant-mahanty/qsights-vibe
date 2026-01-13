<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'activity_id',
        'notification_type',
        'subject',
        'body_html',
        'body_text',
        'is_active',
        'placeholders',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'placeholders' => 'array',
    ];

    /**
     * Notification types
     */
    const TYPE_INVITATION = 'invitation';
    const TYPE_REMINDER = 'reminder';
    const TYPE_THANK_YOU = 'thank_you';
    const TYPE_PROGRAM_EXPIRY = 'program_expiry';
    const TYPE_ACTIVITY_SUMMARY = 'activity_summary';

    /**
     * Get all notification types
     */
    public static function getNotificationTypes(): array
    {
        return [
            self::TYPE_INVITATION,
            self::TYPE_REMINDER,
            self::TYPE_THANK_YOU,
            self::TYPE_PROGRAM_EXPIRY,
            self::TYPE_ACTIVITY_SUMMARY,
        ];
    }

    /**
     * Get available placeholders for templates
     */
    public static function getAvailablePlaceholders(): array
    {
        return [
            'participant_name' => 'Participant\'s full name',
            'participant_email' => 'Participant\'s email address',
            'activity_name' => 'Activity name',
            'activity_description' => 'Activity description',
            'activity_type' => 'Activity type',
            'activity_start_date' => 'Activity start date',
            'activity_end_date' => 'Activity end date',
            'program_name' => 'Program name',
            'program_description' => 'Program description',
            'organization_name' => 'Organization name',
            'activity_url' => 'Direct link to activity',
            'days_until_start' => 'Days until activity starts',
            'current_date' => 'Current date',
            'response_count' => 'Number of responses received',
            'completion_rate' => 'Activity completion rate',
        ];
    }

    /**
     * Replace placeholders in template with actual values
     */
    public function renderTemplate(array $data): array
    {
        $subject = $this->subject;
        $bodyHtml = $this->body_html;
        $bodyText = $this->body_text ?? strip_tags($this->body_html);

        // Replace placeholders
        foreach ($data as $key => $value) {
            $placeholder = '{{' . $key . '}}';
            $subject = str_replace($placeholder, $value ?? '', $subject);
            $bodyHtml = str_replace($placeholder, $value ?? '', $bodyHtml);
            $bodyText = str_replace($placeholder, $value ?? '', $bodyText);
        }

        return [
            'subject' => $subject,
            'body_html' => $bodyHtml,
            'body_text' => $bodyText,
        ];
    }

    /**
     * Get default template for a notification type
     */
    public static function getDefaultTemplate(string $notificationType): array
    {
        $templates = [
            self::TYPE_INVITATION => [
                'subject' => 'You\'re Invited: {{activity_name}}',
                'body_html' => self::getDefaultInvitationHtml(),
                'body_text' => 'Hi {{participant_name}}, You\'re invited to participate in {{activity_name}}. Activity starts on {{activity_start_date}}. Click here to view: {{activity_url}}',
            ],
            self::TYPE_REMINDER => [
                'subject' => 'Reminder: {{activity_name}} starts soon',
                'body_html' => self::getDefaultReminderHtml(),
                'body_text' => 'Hi {{participant_name}}, This is a reminder that {{activity_name}} starts in {{days_until_start}} day(s). Don\'t forget to participate! {{activity_url}}',
            ],
            self::TYPE_THANK_YOU => [
                'subject' => 'Thank you for participating in {{activity_name}}',
                'body_html' => self::getDefaultThankYouHtml(),
                'body_text' => 'Hi {{participant_name}}, Thank you for participating in {{activity_name}}. Your feedback is valuable to us!',
            ],
            self::TYPE_PROGRAM_EXPIRY => [
                'subject' => 'Program Expiring: {{program_name}}',
                'body_html' => self::getDefaultProgramExpiryHtml(),
                'body_text' => 'Hi {{participant_name}}, The program {{program_name}} is expiring soon. Please complete any pending activities.',
            ],
            self::TYPE_ACTIVITY_SUMMARY => [
                'subject' => 'Activity Summary: {{activity_name}}',
                'body_html' => self::getDefaultActivitySummaryHtml(),
                'body_text' => 'Hi {{participant_name}}, Here\'s a summary of {{activity_name}}: {{response_count}} responses received with {{completion_rate}}% completion rate.',
            ],
        ];

        return $templates[$notificationType] ?? [
            'subject' => 'Notification from {{program_name}}',
            'body_html' => '<p>Hi {{participant_name}},</p><p>This is a notification regarding {{activity_name}}.</p>',
            'body_text' => 'Hi {{participant_name}}, This is a notification regarding {{activity_name}}.',
        ];
    }

    /**
     * Default invitation template HTML
     */
    private static function getDefaultInvitationHtml(): string
    {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
        .button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .details { background: white; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>You're Invited!</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{{participant_name}}</strong>,</p>
            <p>You've been invited to participate in <strong>{{activity_name}}</strong>.</p>
            <div class="details">
                <p><strong>Activity:</strong> {{activity_name}}</p>
                <p><strong>Type:</strong> {{activity_type}}</p>
                <p><strong>Start Date:</strong> {{activity_start_date}}</p>
                <p><strong>Description:</strong> {{activity_description}}</p>
            </div>
            <p>We look forward to your participation!</p>
            <a href="{{activity_url}}" class="button">View Activity</a>
        </div>
        <div class="footer">
            <p>{{organization_name}} | {{program_name}}</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Default reminder template HTML
     */
    private static function getDefaultReminderHtml(): string
    {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
        .button { display: inline-block; padding: 12px 30px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .reminder-box { background: #fff3cd; border: 2px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Activity Reminder</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{{participant_name}}</strong>,</p>
            <div class="reminder-box">
                <p><strong>{{activity_name}}</strong> starts in <strong>{{days_until_start}} day(s)</strong>!</p>
            </div>
            <p>Don't miss out on this opportunity to participate. Your input is valuable to us.</p>
            <p><strong>Start Date:</strong> {{activity_start_date}}</p>
            <a href="{{activity_url}}" class="button">Participate Now</a>
        </div>
        <div class="footer">
            <p>{{organization_name}} | {{program_name}}</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Default thank you template HTML
     */
    private static function getDefaultThankYouHtml(): string
    {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .thank-you-box { background: #e3f2fd; border-left: 4px solid #2196F3; padding: 20px; margin: 20px 0; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Thank You!</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{{participant_name}}</strong>,</p>
            <div class="thank-you-box">
                <h2>Thank you for participating in {{activity_name}}!</h2>
                <p>Your feedback is incredibly valuable to us.</p>
            </div>
            <p>We appreciate the time you took to share your thoughts and contribute to {{program_name}}.</p>
            <p>Your input helps us improve and make better decisions.</p>
        </div>
        <div class="footer">
            <p>{{organization_name}} | {{program_name}}</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Default program expiry template HTML
     */
    private static function getDefaultProgramExpiryHtml(): string
    {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
        .button { display: inline-block; padding: 12px 30px; background: #f44336; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .warning-box { background: #ffebee; border: 2px solid #f44336; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Program Expiring Soon</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{{participant_name}}</strong>,</p>
            <div class="warning-box">
                <p><strong>{{program_name}}</strong> is expiring soon!</p>
            </div>
            <p>Please complete any pending activities before the program expires.</p>
            <p>Don't miss your chance to contribute your valuable feedback.</p>
            <a href="{{activity_url}}" class="button">Complete Activities</a>
        </div>
        <div class="footer">
            <p>{{organization_name}}</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Default activity summary template HTML
     */
    private static function getDefaultActivitySummaryHtml(): string
    {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #9C27B0; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat-box { background: white; padding: 20px; border-radius: 5px; text-align: center; flex: 1; margin: 0 10px; }
        .stat-number { font-size: 32px; font-weight: bold; color: #9C27B0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Activity Summary</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{{participant_name}}</strong>,</p>
            <p>Here's a summary of <strong>{{activity_name}}</strong>:</p>
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-number">{{response_count}}</div>
                    <p>Responses</p>
                </div>
                <div class="stat-box">
                    <div class="stat-number">{{completion_rate}}%</div>
                    <p>Completion Rate</p>
                </div>
            </div>
            <p>Thank you for being part of this activity!</p>
        </div>
        <div class="footer">
            <p>{{organization_name}} | {{program_name}}</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Relationship: Activity
     */
    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    /**
     * Scope: Active templates
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: By notification type
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('notification_type', $type);
    }

    /**
     * Scope: By activity
     */
    public function scopeForActivity($query, string $activityId)
    {
        return $query->where('activity_id', $activityId);
    }
}
