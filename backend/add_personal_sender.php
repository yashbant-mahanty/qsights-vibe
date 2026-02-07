<?php
require __DIR__.'/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$apiKey = $_ENV['SENDGRID_API_KEY'];
$email = 'yashbantm@gmail.com';

echo "=== Adding Personal Email as Verified Sender ===\n\n";

$data = [
    'nickname' => 'Yash Personal',
    'from_email' => $email,
    'from_name' => 'QSights Platform',
    'reply_to' => $email,
    'reply_to_name' => 'QSights Platform',
    'address' => '123 Street',
    'city' => 'City',
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
echo "Response: $response\n\n";

if ($httpCode === 201) {
    echo "✅ Verification email sent to $email\n\n";
    echo "📧 CHECK YOUR GMAIL INBOX:\n";
    echo "   1. Look for email from SendGrid\n";
    echo "   2. Click verification link\n";
    echo "   3. Come back and update .env\n\n";
} elseif ($httpCode === 400 && strpos($response, 'already exists') !== false) {
    echo "ℹ️  Email already added. Check if verified:\n";
    echo "   https://app.sendgrid.com/settings/sender_auth/senders\n\n";
} else {
    echo "❌ Error adding sender\n";
}
