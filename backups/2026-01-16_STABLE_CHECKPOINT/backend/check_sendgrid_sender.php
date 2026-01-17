<?php
// Quick SendGrid Sender Verification Check

require __DIR__.'/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$apiKey = $_ENV['SENDGRID_API_KEY'];
$fromEmail = $_ENV['SENDGRID_FROM_EMAIL'];

echo "=== SendGrid Sender Verification Check ===\n\n";
echo "API Key: " . substr($apiKey, 0, 10) . "...\n";
echo "From Email: $fromEmail\n\n";

// Check sender verification via SendGrid API
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.sendgrid.com/v3/verified_senders");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $apiKey",
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $data = json_decode($response, true);
    echo "✅ API Connection Successful\n\n";
    
    if (isset($data['results']) && count($data['results']) > 0) {
        echo "Verified Senders:\n";
        foreach ($data['results'] as $sender) {
            $verified = $sender['verified'] ?? false;
            $status = $verified ? "✅ VERIFIED" : "❌ NOT VERIFIED";
            $email = $sender['from_email'] ?? 'N/A';
            $nickname = $sender['nickname'] ?? 'N/A';
            
            echo "  $status - $email ($nickname)\n";
            
            if ($email === $fromEmail) {
                echo "\n  👆 THIS IS YOUR CURRENT SENDER\n";
                if (!$verified) {
                    echo "  ⚠️  WARNING: Not verified - emails won't be delivered!\n";
                    echo "  📝 Go to: https://app.sendgrid.com/settings/sender_auth/senders\n";
                }
            }
        }
    } else {
        echo "❌ NO VERIFIED SENDERS FOUND\n";
        echo "📝 Add a sender at: https://app.sendgrid.com/settings/sender_auth/senders\n";
    }
} else {
    echo "❌ API Error (HTTP $httpCode)\n";
    echo "Response: $response\n";
    
    if ($httpCode === 401) {
        echo "\n⚠️  API Key is invalid or doesn't have permission\n";
    }
}

echo "\n===========================================\n";
