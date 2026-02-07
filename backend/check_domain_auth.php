<?php

require __DIR__.'/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$apiKey = $_ENV['SENDGRID_API_KEY'];

echo "=== SendGrid Domain Authentication Check ===\n\n";

// Check authenticated domains
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.sendgrid.com/v3/whitelabel/domains");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $apiKey",
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

echo "Domain Authentication Status (HTTP $httpCode):\n";

if ($httpCode === 200) {
    $domains = json_decode($response, true);
    
    if (empty($domains)) {
        echo "\n❌ NO AUTHENTICATED DOMAINS FOUND!\n\n";
        echo "⚠️  This is likely why emails aren't being delivered.\n\n";
        echo "SendGrid requires domain authentication for reliable delivery.\n";
        echo "Without it, emails may be accepted (202) but silently dropped.\n\n";
        echo "🔧 TO FIX:\n";
        echo "   1. Go to: https://app.sendgrid.com/settings/sender_auth\n";
        echo "   2. Click 'Authenticate Your Domain'\n";
        echo "   3. Follow the DNS setup instructions\n";
        echo "   4. Add DNS records to your domain\n";
        echo "   5. Wait for verification (can take up to 48 hours)\n\n";
        echo "📝 ALTERNATIVE (Quick Fix):\n";
        echo "   Use 'Single Sender Verification' instead:\n";
        echo "   1. Go to: https://app.sendgrid.com/settings/sender_auth/senders\n";
        echo "   2. Verify you already have: " . $_ENV['SENDGRID_FROM_EMAIL'] . "\n";
        echo "   3. But note: Without domain auth, deliverability is limited\n";
    } else {
        echo "\n✅ Found " . count($domains) . " authenticated domain(s):\n\n";
        
        foreach ($domains as $domain) {
            $domainName = $domain['domain'] ?? 'N/A';
            $valid = $domain['valid'] ?? false;
            $status = $valid ? '✅ VALID' : '❌ NOT VALID';
            
            echo "   $status - $domainName\n";
            
            if (!$valid) {
                echo "      ⚠️  Domain not fully authenticated\n";
                echo "      Check DNS records at: https://app.sendgrid.com/settings/sender_auth\n";
            }
        }
    }
} else {
    echo "Response: $response\n";
}

echo "\n===========================================\n\n";

// Check if we're using single sender verification (less reliable)
echo "Current sender email: " . $_ENV['SENDGRID_FROM_EMAIL'] . "\n";
$fromDomain = substr(strrchr($_ENV['SENDGRID_FROM_EMAIL'], "@"), 1);
echo "Sender domain: $fromDomain\n\n";

echo "📊 Check SendGrid Activity Feed for actual delivery status:\n";
echo "   https://app.sendgrid.com/email_activity\n\n";

echo "🔍 Look for recent emails and check:\n";
echo "   • Status: Delivered/Processed/Dropped/Bounced\n";
echo "   • Reason: If dropped, shows why\n";
echo "   • Events: Processing > Delivered > Opened\n";
