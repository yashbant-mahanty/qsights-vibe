<?php

require __DIR__.'/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$apiKey = $_ENV['SENDGRID_API_KEY'];

echo "=== SendGrid Email Activity Check ===\n\n";

// Get email activity from last hour
$ch = curl_init();
$query = http_build_query([
    'limit' => 10,
]);

curl_setopt($ch, CURLOPT_URL, "https://api.sendgrid.com/v3/messages?$query");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $apiKey",
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

echo "HTTP Code: $httpCode\n\n";

if ($httpCode === 200) {
    $data = json_decode($response, true);
    
    if (isset($data['messages']) && count($data['messages']) > 0) {
        echo "Recent Email Activity:\n";
        echo str_repeat("-", 80) . "\n";
        
        foreach ($data['messages'] as $msg) {
            $msgId = $msg['msg_id'] ?? 'N/A';
            $to = $msg['to_email'] ?? 'N/A';
            $from = $msg['from_email'] ?? 'N/A';
            $subject = $msg['subject'] ?? 'N/A';
            $status = $msg['status'] ?? 'N/A';
            $lastEventTime = $msg['last_event_time'] ?? 'N/A';
            
            echo "\n📧 Message ID: $msgId\n";
            echo "   To: $to\n";
            echo "   From: $from\n";
            echo "   Subject: $subject\n";
            echo "   Status: $status\n";
            echo "   Last Event: $lastEventTime\n";
            
            // Check for events
            if (isset($msg['events']) && is_array($msg['events'])) {
                echo "   Events:\n";
                foreach ($msg['events'] as $event) {
                    $eventName = $event['event_name'] ?? 'unknown';
                    $processed = $event['processed'] ?? 'N/A';
                    echo "     - $eventName at $processed\n";
                }
            }
            
            echo str_repeat("-", 80) . "\n";
        }
    } else {
        echo "❌ No recent messages found\n";
        echo "This could mean:\n";
        echo "  1. No emails sent recently\n";
        echo "  2. SendGrid Activity API access not enabled\n";
        echo "  3. API key doesn't have 'Email Activity' permission\n\n";
        echo "To enable:\n";
        echo "  1. Go to: https://app.sendgrid.com/settings/api_keys\n";
        echo "  2. Edit your API key\n";
        echo "  3. Enable 'Email Activity' permission\n";
        echo "  4. Save and use new key\n";
    }
} else {
    echo "❌ API Error\n";
    echo "Response: $response\n\n";
    
    if ($httpCode === 401) {
        echo "⚠️  API Key invalid or missing permissions\n";
    } elseif ($httpCode === 403) {
        echo "⚠️  Email Activity API not enabled\n";
        echo "Enable at: https://app.sendgrid.com/settings/api_keys\n";
    }
}

echo "\n===========================================\n";
echo "📊 Check full activity at: https://app.sendgrid.com/email_activity\n";
