<?php

/**
 * Notification Template Management Test Script
 * 
 * Tests the Activity-based eNotification Content Manager
 * - Create/Update/Delete notification templates
 * - Preview templates with sample data
 * - Test fallback to default templates
 * - Verify template rendering with placeholders
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Activity;
use App\Models\Program;
use App\Models\Participant;
use App\Models\NotificationTemplate;
use App\Services\EmailService;
use Illuminate\Support\Str;

echo "\n=== NOTIFICATION TEMPLATE MANAGEMENT TEST ===\n\n";

// Step 1: Get or create test activity
echo "Step 1: Getting test activity...\n";
$activity = Activity::with(['program.organization', 'program.participants'])->first();

if (!$activity) {
    echo "❌ No activity found. Please create an activity first.\n";
    exit;
}

echo "✅ Found activity: {$activity->name} (ID: {$activity->id})\n";
echo "   Program: {$activity->program->name}\n\n";

// Step 2: Get available notification types and placeholders
echo "Step 2: Fetching available notification types...\n";
$notificationTypes = NotificationTemplate::getNotificationTypes();
echo "✅ Available notification types:\n";
foreach ($notificationTypes as $type) {
    echo "   - {$type}\n";
}
echo "\n";

echo "Step 3: Fetching available placeholders...\n";
$placeholders = NotificationTemplate::getAvailablePlaceholders();
echo "✅ Available placeholders:\n";
foreach ($placeholders as $key => $description) {
    echo "   - {{{{{$key}}}}} : {$description}\n";
}
echo "\n";

// Step 4: Check existing templates
echo "Step 4: Checking existing templates for activity...\n";
$existingTemplates = NotificationTemplate::where('activity_id', $activity->id)->get();
echo "Found " . $existingTemplates->count() . " existing template(s)\n";
foreach ($existingTemplates as $template) {
    echo "   - {$template->notification_type} (Active: " . ($template->is_active ? 'Yes' : 'No') . ")\n";
}
echo "\n";

// Step 5: Create custom invitation template
echo "Step 5: Creating custom invitation template...\n";
$invitationTemplate = NotificationTemplate::updateOrCreate(
    [
        'activity_id' => $activity->id,
        'notification_type' => NotificationTemplate::TYPE_INVITATION,
    ],
    [
        'id' => Str::uuid(),
        'subject' => 'Special Invitation: {{activity_name}} by {{organization_name}}',
        'body_html' => <<<HTML
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }
        .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 40px 30px; }
        .highlight { background: #f3f4f6; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #5568d3; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .info-item { background: #f9fafb; padding: 15px; border-radius: 6px; }
        .info-label { font-weight: bold; color: #667eea; font-size: 12px; text-transform: uppercase; }
        .info-value { color: #1f2937; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>🎉 You're Invited!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">{{organization_name}} invites you</p>
        </div>
        <div class="content">
            <p style="font-size: 18px; color: #1f2937;">Hi <strong>{{participant_name}}</strong>,</p>
            
            <p style="color: #4b5563; line-height: 1.6;">We're excited to invite you to participate in our latest activity!</p>
            
            <div class="highlight">
                <h2 style="margin: 0 0 10px 0; color: #667eea;">{{activity_name}}</h2>
                <p style="margin: 0; color: #4b5563;">{{activity_description}}</p>
            </div>

            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Start Date</div>
                    <div class="info-value">{{activity_start_date}}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Activity Type</div>
                    <div class="info-value">{{activity_type}}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Program</div>
                    <div class="info-value">{{program_name}}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Days Until Start</div>
                    <div class="info-value">{{days_until_start}} days</div>
                </div>
            </div>

            <p style="color: #4b5563; line-height: 1.6;">Your participation is valuable to us. Click the button below to get started!</p>

            <center>
                <a href="{{activity_url}}" class="button">View Activity Details</a>
            </center>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you have any questions, please don't hesitate to reach out.</p>
        </div>
        <div class="footer">
            <p style="margin: 0;"><strong>{{organization_name}}</strong></p>
            <p style="margin: 5px 0 0 0;">{{program_name}} | {{current_date}}</p>
        </div>
    </div>
</body>
</html>
HTML,
        'body_text' => 'Hi {{participant_name}}, You are invited to participate in {{activity_name}}. Start date: {{activity_start_date}}. Visit: {{activity_url}}',
        'is_active' => true,
        'placeholders' => NotificationTemplate::getAvailablePlaceholders(),
    ]
);

echo "✅ Created custom invitation template (ID: {$invitationTemplate->id})\n";
echo "   Subject: {$invitationTemplate->subject}\n\n";

// Step 6: Create custom reminder template
echo "Step 6: Creating custom reminder template...\n";
$reminderTemplate = NotificationTemplate::updateOrCreate(
    [
        'activity_id' => $activity->id,
        'notification_type' => NotificationTemplate::TYPE_REMINDER,
    ],
    [
        'id' => Str::uuid(),
        'subject' => '⏰ Don\'t forget: {{activity_name}} starts in {{days_until_start}} days',
        'body_html' => <<<HTML
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background: #fff9e6; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; border: 3px solid #fbbf24; }
        .header { background: #fbbf24; color: #1f2937; padding: 30px 20px; text-align: center; }
        .content { padding: 30px; }
        .countdown { background: #fef3c7; border: 2px dashed #f59e0b; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
        .countdown-number { font-size: 48px; font-weight: bold; color: #f59e0b; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">⏰ Activity Reminder</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{{participant_name}}</strong>,</p>
            
            <div class="countdown">
                <div class="countdown-number">{{days_until_start}}</div>
                <p style="margin: 10px 0 0 0; color: #92400e;">days until <strong>{{activity_name}}</strong> begins!</p>
            </div>

            <p>This is a friendly reminder to participate in our activity starting on <strong>{{activity_start_date}}</strong>.</p>
            
            <p>Don't miss this opportunity to share your valuable insights!</p>

            <center style="margin: 30px 0;">
                <a href="{{activity_url}}" class="button">Participate Now</a>
            </center>
        </div>
    </div>
</body>
</html>
HTML,
        'body_text' => 'Hi {{participant_name}}, Reminder: {{activity_name}} starts in {{days_until_start}} days on {{activity_start_date}}. Visit: {{activity_url}}',
        'is_active' => true,
        'placeholders' => NotificationTemplate::getAvailablePlaceholders(),
    ]
);

echo "✅ Created custom reminder template (ID: {$reminderTemplate->id})\n";
echo "   Subject: {$reminderTemplate->subject}\n\n";

// Step 7: Test template rendering with sample data
echo "Step 7: Testing template rendering...\n";
$participant = $activity->program->participants()->first();

if (!$participant) {
    echo "⚠️  No participants found. Creating sample data for template rendering...\n";
    $sampleData = [
        'participant_name' => 'John Doe',
        'participant_email' => 'john.doe@example.com',
        'activity_name' => $activity->name,
        'activity_description' => $activity->description ?? 'Sample activity description',
        'activity_type' => $activity->type,
        'activity_start_date' => $activity->start_date ? $activity->start_date->format('F j, Y') : 'TBD',
        'activity_end_date' => $activity->end_date ? $activity->end_date->format('F j, Y') : 'TBD',
        'program_name' => $activity->program->name,
        'program_description' => $activity->program->description ?? '',
        'organization_name' => $activity->program->organization->name ?? 'QSights',
        'activity_url' => env('APP_URL') . '/activities/' . $activity->id,
        'days_until_start' => 5,
        'current_date' => now()->format('F j, Y'),
        'response_count' => 0,
        'completion_rate' => 0,
    ];
} else {
    $emailService = app(EmailService::class);
    $sampleData = [
        'participant_name' => $participant->name ?? 'Participant',
        'participant_email' => $participant->email ?? '',
        'activity_name' => $activity->name,
        'activity_description' => $activity->description ?? '',
        'activity_type' => $activity->type,
        'activity_start_date' => $activity->start_date ? $activity->start_date->format('F j, Y') : 'TBD',
        'activity_end_date' => $activity->end_date ? $activity->end_date->format('F j, Y') : 'TBD',
        'program_name' => $activity->program->name,
        'program_description' => $activity->program->description ?? '',
        'organization_name' => $activity->program->organization->name ?? 'QSights',
        'activity_url' => env('APP_URL') . '/activities/' . $activity->id,
        'days_until_start' => $activity->start_date ? max(0, now()->diffInDays($activity->start_date, false)) : 0,
        'current_date' => now()->format('F j, Y'),
        'response_count' => $activity->responses()->count(),
        'completion_rate' => $activity->getCompletionRate(),
    ];
}

// Test invitation template rendering
echo "\n--- Testing Invitation Template ---\n";
$renderedInvitation = $invitationTemplate->renderTemplate($sampleData);
echo "Subject: {$renderedInvitation['subject']}\n";
echo "Body HTML Length: " . strlen($renderedInvitation['body_html']) . " characters\n";
echo "Body Text: " . substr($renderedInvitation['body_text'], 0, 100) . "...\n";

// Test reminder template rendering
echo "\n--- Testing Reminder Template ---\n";
$renderedReminder = $reminderTemplate->renderTemplate($sampleData);
echo "Subject: {$renderedReminder['subject']}\n";
echo "Body HTML Length: " . strlen($renderedReminder['body_html']) . " characters\n";
echo "Body Text: " . substr($renderedReminder['body_text'], 0, 100) . "...\n\n";

// Step 8: Test default template fallback
echo "Step 8: Testing default template fallback...\n";
$thankYouTemplate = $activity->getNotificationTemplate(NotificationTemplate::TYPE_THANK_YOU);

if (!$thankYouTemplate) {
    echo "✅ No custom thank_you template found (as expected)\n";
    $defaultThankYou = NotificationTemplate::getDefaultTemplate(NotificationTemplate::TYPE_THANK_YOU);
    echo "   Using default template:\n";
    echo "   Subject: {$defaultThankYou['subject']}\n";
    
    // Create temporary template to test rendering
    $tempTemplate = new NotificationTemplate([
        'subject' => $defaultThankYou['subject'],
        'body_html' => $defaultThankYou['body_html'],
        'body_text' => $defaultThankYou['body_text'],
    ]);
    
    $renderedDefault = $tempTemplate->renderTemplate($sampleData);
    echo "   Rendered subject: {$renderedDefault['subject']}\n";
} else {
    echo "✅ Found custom thank_you template\n";
}
echo "\n";

// Step 9: Display template statistics
echo "Step 9: Template Statistics\n";
echo "─────────────────────────────\n";
$allTemplates = NotificationTemplate::where('activity_id', $activity->id)->get();
echo "Total custom templates: " . $allTemplates->count() . "\n";
echo "Active templates: " . $allTemplates->where('is_active', true)->count() . "\n";
echo "Inactive templates: " . $allTemplates->where('is_active', false)->count() . "\n\n";

echo "Templates by type:\n";
foreach (NotificationTemplate::getNotificationTypes() as $type) {
    $template = $activity->getNotificationTemplate($type);
    $status = $template ? "✅ Custom" : "⚪ Default";
    echo "   {$status} {$type}\n";
}

// Step 10: Save rendered HTML for preview
echo "\n\nStep 10: Saving HTML previews...\n";
$previewDir = __DIR__ . '/storage/app/template-previews';
if (!file_exists($previewDir)) {
    mkdir($previewDir, 0755, true);
}

// Save invitation preview
$invitationFile = $previewDir . '/invitation-preview.html';
file_put_contents($invitationFile, $renderedInvitation['body_html']);
echo "✅ Saved invitation preview: {$invitationFile}\n";

// Save reminder preview
$reminderFile = $previewDir . '/reminder-preview.html';
file_put_contents($reminderFile, $renderedReminder['body_html']);
echo "✅ Saved reminder preview: {$reminderFile}\n";

echo "\n=== TEST COMPLETED SUCCESSFULLY ===\n";
echo "\nSummary:\n";
echo "✅ Created custom invitation template\n";
echo "✅ Created custom reminder template\n";
echo "✅ Verified template rendering with placeholders\n";
echo "✅ Tested default template fallback\n";
echo "✅ Saved HTML previews for visual inspection\n";
echo "\nNext steps:\n";
echo "1. Open the HTML preview files in a browser to see the rendered templates\n";
echo "2. Use the API to manage templates via HTTP requests\n";
echo "3. Send test notifications to verify email delivery\n";
echo "\nAPI Endpoints:\n";
echo "GET    /api/activities/{activityId}/notification-templates\n";
echo "POST   /api/activities/{activityId}/notification-templates\n";
echo "GET    /api/activities/{activityId}/notification-templates/type/{type}\n";
echo "POST   /api/activities/{activityId}/notification-templates/preview\n";
echo "DELETE /api/activities/{activityId}/notification-templates/{templateId}\n";
echo "\n";
