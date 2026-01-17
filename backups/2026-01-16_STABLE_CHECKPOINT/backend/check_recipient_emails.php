<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$notifications = \App\Models\Notification::where('event', 'activity_created')
    ->orWhere('event', 'activity_reminder')
    ->orderBy('created_at', 'desc')
    ->take(10)
    ->get();
    
echo "=== Recent Notification Emails ===\n\n";

$testEmails = 0;
$invalidEmails = 0;
$realEmails = 0;

foreach ($notifications as $n) {
    $email = $n->recipient_email;
    
    echo "📧 " . $n->created_at . "\n";
    echo "   To: $email\n";
    echo "   Event: " . $n->event . "\n";
    echo "   Status: " . $n->status . "\n";
    echo "   Subject: " . $n->subject . "\n";
    
    // Check if email is valid
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo "   ❌ INVALID EMAIL FORMAT!\n";
        $invalidEmails++;
    }
    // Check for test/fake domains
    elseif (strpos($email, '@example.com') !== false || 
        strpos($email, '@test.com') !== false ||
        strpos($email, '@anonymous.local') !== false) {
        echo "   ⚠️  TEST/FAKE EMAIL - SendGrid will NOT deliver!\n";
        $testEmails++;
    }
    // Real email
    else {
        echo "   ✅ REAL EMAIL - Should be delivered\n";
        $realEmails++;
    }
    
    echo "\n";
}

echo "===========================================\n";
echo "Summary:\n";
echo "  Real emails: $realEmails\n";
echo "  Test emails: $testEmails\n";
echo "  Invalid emails: $invalidEmails\n\n";

if ($testEmails > 0) {
    echo "⚠️  WARNING: Emails to @example.com, @test.com, @anonymous.local\n";
    echo "   will NOT be delivered by SendGrid (API returns 202 but drops them).\n";
    echo "   Use REAL email addresses for testing!\n\n";
}

if ($realEmails > 0) {
    echo "✅ Real emails should be delivered. Check:\n";
    echo "   1. Inbox\n";
    echo "   2. Spam/Junk folder\n";
    echo "   3. Promotions tab (Gmail)\n";
    echo "   4. SendGrid Activity: https://app.sendgrid.com/email_activity\n";
}
