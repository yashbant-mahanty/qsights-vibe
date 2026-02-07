<?php
require __DIR__.'/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$apiKey = $_ENV['SENDGRID_API_KEY'];

// Get sender ID
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.sendgrid.com/v3/verified_senders");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer $apiKey"]);
$response = curl_exec($ch);
$data = json_decode($response, true);

$senderId = null;
foreach ($data['results'] as $sender) {
    if ($sender['from_email'] === 'yashbantm@gmail.com') {
        $senderId = $sender['id'];
        break;
    }
}

if ($senderId) {
    echo "Found sender ID: $senderId\n";
    echo "Resending verification email...\n\n";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.sendgrid.com/v3/verified_senders/resend/$senderId");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer $apiKey"]);
    $result = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if ($code === 204) {
        echo "✅ Verification email sent to yashbantm@gmail.com!\n\n";
        echo "📧 CHECK YOUR GMAIL INBOX NOW:\n";
        echo "   1. Look for email from SendGrid\n";
        echo "   2. Subject: 'Please Verify Your Sender'\n";
        echo "   3. Click the verification link\n";
        echo "   4. Return here and run: php send_test_email.php\n";
    } else {
        echo "Response ($code): $result\n";
    }
} else {
    echo "Sender not found\n";
}
