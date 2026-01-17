<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$emailService = app(\App\Services\EmailService::class);

echo "📧 Sending test emails...\n\n";

// Test email 1: Gmail
echo "Sending to yashbantm@gmail.com...\n";
$result1 = $emailService->send(
    'yashbantm@gmail.com',
    'QSights SendGrid Test - Please Check Your Inbox',
    '<html><body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="color: #4F46E5;">✅ SendGrid is Working!</h1>
        <p><strong>Congratulations!</strong> If you receive this email, your SendGrid integration is working perfectly.</p>
        <p><strong>Test Details:</strong></p>
        <ul>
            <li>Sent at: ' . now() . '</li>
            <li>From: ' . env('SENDGRID_FROM_EMAIL') . '</li>
            <li>Service: SendGrid Email API</li>
        </ul>
        <p>You can now send notifications to participants with confidence!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">QSights Platform - Email Delivery Test</p>
    </body></html>',
    ['event' => 'manual_test', 'recipient' => 'yashbantm@gmail.com']
);

echo "  Status: " . ($result1['success'] ? '✅ SENT' : '❌ FAILED') . " (Code: " . $result1['status_code'] . ")\n\n";

// Test email 2: BioQuest
echo "Sending to yashbant.mahanty@bioquestglobal.com...\n";
$result2 = $emailService->send(
    'yashbant.mahanty@bioquestglobal.com',
    'QSights SendGrid Test - Please Check Your Inbox',
    '<html><body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="color: #4F46E5;">✅ SendGrid is Working!</h1>
        <p><strong>Congratulations!</strong> If you receive this email, your SendGrid integration is working perfectly.</p>
        <p><strong>Test Details:</strong></p>
        <ul>
            <li>Sent at: ' . now() . '</li>
            <li>From: ' . env('SENDGRID_FROM_EMAIL') . '</li>
            <li>Service: SendGrid Email API</li>
        </ul>
        <p>You can now send notifications to participants with confidence!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">QSights Platform - Email Delivery Test</p>
    </body></html>',
    ['event' => 'manual_test', 'recipient' => 'yashbant.mahanty@bioquestglobal.com']
);

echo "  Status: " . ($result2['success'] ? '✅ SENT' : '❌ FAILED') . " (Code: " . $result2['status_code'] . ")\n\n";

$result = $result1; // For backward compatibility

echo "===========================================\n";
echo "✅ Test emails sent successfully!\n\n";
echo "📬 CHECK YOUR INBOXES:\n";
echo "   1. yashbantm@gmail.com\n";
echo "   2. yashbant.mahanty@bioquestglobal.com\n\n";
echo "⏱️  Emails should arrive in 1-2 minutes. Check:\n";
echo "   • Inbox\n";
echo "   • Spam/Junk folder\n";
echo "   • Promotions tab (Gmail)\n\n";
echo "📊 SendGrid Activity: https://app.sendgrid.com/email_activity\n";
