<?php
require __DIR__.'/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$apiKey = $_ENV['SENDGRID_API_KEY'];
$email = 'info@qsights.com';

echo "=== Adding info@qsights.com as Verified Sender ===\n\n";

$data = [
    'nickname' => 'QSights Info',
    'from_email' => $email,
    'from_name' => 'QSights Platform',
    'reply_to' => $email,
    'reply_to_name' => 'QSights Support',
    'address' => '24, Wellington Street',
    'city' => 'Bangalore',
    'state' => 'KA',
    'zip' => '560025',
    'country' => 'India'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.sendgrid.com/v3/verified_senders");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $apiKey",
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

echo "HTTP Code: $httpCode\n";

if ($httpCode === 201) {
    echo "\n✅ SUCCESS! Verification email sent to info@qsights.com\n\n";
    echo "📧 IMPORTANT: Check info@qsights.com mailbox:\n";
    echo "   1. Look for email from SendGrid\n";
    echo "   2. Subject: 'Please Verify Your Sender'\n";
    echo "   3. Click the verification link\n";
    echo "   4. Once verified, emails will work!\n\n";
    echo "⏱️  After verifying, run:\n";
    echo "   php artisan config:clear\n";
    echo "   php send_test_email.php\n";
} elseif (strpos($response, 'already exists') !== false) {
    echo "\nℹ️  Email already added. Checking verification status...\n\n";
    
    // Get all senders
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.sendgrid.com/v3/verified_senders");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer $apiKey"]);
    $response = curl_exec($ch);
    $data = json_decode($response, true);
    
    foreach ($data['results'] as $sender) {
        if ($sender['from_email'] === $email) {
            if ($sender['verified']) {
                echo "✅ info@qsights.com is ALREADY VERIFIED!\n";
                echo "You can use it right away.\n\n";
                echo "Update .env:\n";
                echo "SENDGRID_FROM_EMAIL=info@qsights.com\n";
                echo "MAIL_FROM_ADDRESS=info@qsights.com\n";
            } else {
                echo "❌ info@qsights.com NOT VERIFIED yet\n\n";
                echo "Resending verification email...\n";
                
                $senderId = $sender['id'];
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, "https://api.sendgrid.com/v3/verified_senders/resend/$senderId");
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer $apiKey"]);
                curl_exec($ch);
                
                echo "✅ Verification email resent to info@qsights.com\n";
                echo "Check mailbox and click verification link!\n";
            }
            break;
        }
    }
} else {
    echo "Response: $response\n";
}

echo "\n📋 To Answer Your Question:\n";
echo "❌ NO! Participants do NOT need to verify their emails!\n";
echo "✅ Only the SENDER email (info@qsights.com) needs verification\n";
echo "✅ Participants will receive emails automatically once sender is verified\n";
