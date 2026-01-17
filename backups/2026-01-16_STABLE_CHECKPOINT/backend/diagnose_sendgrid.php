<?php
require __DIR__.'/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

echo "=== TESTING SENDGRID EMAIL DELIVERY - COMPLETE DIAGNOSIS ===\n\n";

// Step 1: Test API connectivity
echo "1️⃣  Testing SendGrid API Connection...\n";
$apiKey = $_ENV['SENDGRID_API_KEY'];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.sendgrid.com/v3/user/account");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer $apiKey"]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($httpCode === 200) {
    $account = json_decode($response, true);
    echo "   ✅ API Connected\n";
    echo "   Account: " . ($account['company'] ?? $account['username'] ?? 'N/A') . "\n";
    echo "   Type: " . ($account['type'] ?? 'N/A') . "\n\n";
} else {
    echo "   ❌ API Connection Failed (HTTP $httpCode)\n";
    echo "   Response: $response\n\n";
    exit(1);
}

// Step 2: Check verified senders
echo "2️⃣  Checking Verified Senders...\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.sendgrid.com/v3/verified_senders");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer $apiKey"]);
$response = curl_exec($ch);
$senders = json_decode($response, true);

$verifiedCount = 0;
$currentSender = $_ENV['SENDGRID_FROM_EMAIL'];
$currentSenderVerified = false;

if (isset($senders['results'])) {
    foreach ($senders['results'] as $sender) {
        if ($sender['verified']) {
            $verifiedCount++;
            if ($sender['from_email'] === $currentSender) {
                $currentSenderVerified = true;
                echo "   ✅ Current sender verified: $currentSender\n\n";
            }
        }
    }
}

if (!$currentSenderVerified) {
    echo "   ❌ Current sender NOT verified: $currentSender\n";
    echo "   This is WHY emails aren't being delivered!\n\n";
    echo "   FIX: Go to https://app.sendgrid.com/settings/sender_auth/senders\n";
    echo "        and verify $currentSender\n\n";
    exit(1);
}

// Step 3: Check domain authentication (critical for delivery)
echo "3️⃣  Checking Domain Authentication...\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.sendgrid.com/v3/whitelabel/domains");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer $apiKey"]);
$response = curl_exec($ch);
$domains = json_decode($response, true);

$domainAuthenticated = false;
$senderDomain = substr(strrchr($currentSender, "@"), 1);

if (!empty($domains)) {
    foreach ($domains as $domain) {
        if ($domain['domain'] === $senderDomain && $domain['valid']) {
            $domainAuthenticated = true;
            echo "   ✅ Domain authenticated: $senderDomain\n\n";
            break;
        }
    }
}

if (!$domainAuthenticated) {
    echo "   ⚠️  Domain NOT authenticated: $senderDomain\n";
    echo "   This causes POOR DELIVERABILITY - emails may be dropped!\n\n";
}

// Step 4: Send actual test email
echo "4️⃣  Sending Test Email...\n";
$testEmail = 'yashbantm@gmail.com';
echo "   To: $testEmail\n";
echo "   From: $currentSender\n";

$emailData = [
    'personalizations' => [[
        'to' => [['email' => $testEmail]],
        'subject' => 'QSights Email Test - ' . date('H:i:s')
    ]],
    'from' => ['email' => $currentSender, 'name' => 'QSights Platform'],
    'content' => [[
        'type' => 'text/html',
        'value' => '<h1>✅ Email Delivery Working!</h1><p>If you receive this, SendGrid is configured correctly.</p><p>Sent at: ' . date('Y-m-d H:i:s') . '</p>'
    ]]
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.sendgrid.com/v3/mail/send");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $apiKey",
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headers = curl_getinfo($ch, CURLINFO_HEADER_OUT);

echo "   Status: HTTP $httpCode\n";

if ($httpCode === 202) {
    echo "   ✅ SendGrid ACCEPTED the email\n\n";
    
    // Get message ID from headers
    preg_match('/x-message-id: ([^\r\n]+)/i', curl_getinfo($ch, CURLINFO_HEADER_OUT), $matches);
    
    echo "5️⃣  Email Status:\n";
    echo "   ✅ Accepted by SendGrid (202)\n";
    
    if (!$domainAuthenticated) {
        echo "   ⚠️  WARNING: Without domain authentication, email may be:\n";
        echo "      • Delivered to spam folder\n";
        echo "      • Dropped by recipient's email provider\n";
        echo "      • Delayed significantly\n\n";
        
        echo "   🔧 PERMANENT FIX REQUIRED:\n";
        echo "      1. Go to: https://app.sendgrid.com/settings/sender_auth\n";
        echo "      2. Click 'Authenticate Your Domain'\n";
        echo "      3. Follow DNS setup for: $senderDomain\n";
        echo "      4. Wait for DNS propagation (15 min - 48 hours)\n\n";
    }
    
    echo "   📧 CHECK YOUR EMAIL NOW:\n";
    echo "      Email: $testEmail\n";
    echo "      Check: Inbox, Spam, Promotions tab\n";
    echo "      Wait: 1-5 minutes\n\n";
    
} else {
    echo "   ❌ SendGrid REJECTED the email\n";
    echo "   Response: $response\n\n";
    exit(1);
}

echo "===========================================\n";
echo "📊 SendGrid Activity Feed: https://app.sendgrid.com/email_activity\n";
echo "   Check this to see actual delivery status!\n\n";

// Final recommendation
if (!$domainAuthenticated) {
    echo "🎯 RECOMMENDED ACTION:\n";
    echo "   Your emails are being ACCEPTED but may not be DELIVERED\n";
    echo "   because domain authentication is missing.\n\n";
    echo "   QUICK FIX (for testing NOW):\n";
    echo "   Use a free email service sender (doesn't need domain auth):\n";
    echo "   Example: Create a Gmail account for QSights\n";
    echo "            qsights.notifications@gmail.com\n";
    echo "            Verify it in SendGrid (one-time)\n";
    echo "            Use it as sender\n\n";
    echo "   PROPER FIX (for production):\n";
    echo "   Authenticate your domain in SendGrid (requires DNS access)\n";
}
