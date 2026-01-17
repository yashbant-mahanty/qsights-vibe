<?php

require __DIR__ . '/vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

echo "═══════════════════════════════════════════════════════════\n";
echo "  SendGrid Email Configuration Test\n";
echo "═══════════════════════════════════════════════════════════\n\n";

// Test SendGrid configuration
$apiKey = $_ENV['SENDGRID_API_KEY'] ?? '';
$fromEmail = $_ENV['MAIL_FROM_ADDRESS'] ?? 'noreply@qsights.com';
$fromName = $_ENV['MAIL_FROM_NAME'] ?? 'QSights';

echo "📋 Configuration Check:\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

if (empty($apiKey) || $apiKey === 'your_sendgrid_api_key_here') {
    echo "❌ API Key: NOT SET or PLACEHOLDER\n";
    echo "\n⚠️  Action Required:\n";
    echo "   1. Get your API key from SendGrid dashboard\n";
    echo "   2. Update SENDGRID_API_KEY in backend/.env\n";
    echo "   3. Restart your server\n\n";
    exit(1);
} else {
    echo "✅ API Key: Set (" . substr($apiKey, 0, 10) . "...)\n";
}

echo "✅ From Email: $fromEmail\n";
echo "✅ From Name: $fromName\n\n";

// Prompt for test email
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "📧 Test Email Sending:\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "Enter recipient email address: ";
$testEmail = trim(fgets(STDIN));

if (empty($testEmail) || !filter_var($testEmail, FILTER_VALIDATE_EMAIL)) {
    echo "❌ Invalid email address\n";
    exit(1);
}

echo "\n🔄 Sending test email to $testEmail...\n\n";

// Test email sending
try {
    $email = new \SendGrid\Mail\Mail();
    $email->setFrom($fromEmail, $fromName);
    $email->setSubject("✅ QSights SendGrid Test - " . date('Y-m-d H:i:s'));
    $email->addTo($testEmail, "Test Recipient");
    
    $htmlContent = "
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
        <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;'>
            <h1 style='margin: 0;'>✅ Success!</h1>
        </div>
        <div style='background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;'>
            <h2 style='color: #333;'>SendGrid is Working!</h2>
            <p style='color: #666; line-height: 1.6;'>
                Your QSights platform is successfully configured to send emails via SendGrid.
            </p>
            
            <div style='background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;'>
                <h3 style='margin-top: 0; color: #667eea;'>Test Details:</h3>
                <ul style='color: #666;'>
                    <li><strong>From:</strong> $fromEmail</li>
                    <li><strong>Sent At:</strong> " . date('F j, Y g:i:s A') . "</li>
                    <li><strong>Status:</strong> Delivered ✅</li>
                </ul>
            </div>
            
            <p style='color: #666;'>
                You can now:
            </p>
            <ul style='color: #666; line-height: 1.8;'>
                <li>✅ Register participants and they'll receive welcome emails</li>
                <li>✅ Send confirmation emails after activity submission</li>
                <li>✅ Send custom notifications from your dashboard</li>
            </ul>
            
            <div style='background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;'>
                <p style='margin: 0; color: #1976d2;'>
                    <strong>💡 Tip:</strong> Check your SendGrid dashboard to monitor email delivery, opens, and clicks.
                </p>
            </div>
        </div>
        <div style='text-align: center; color: #999; padding: 20px; font-size: 12px;'>
            <p>QSights Platform • Powered by SendGrid</p>
        </div>
    </div>
    ";
    
    $email->addContent("text/html", $htmlContent);
    
    $sendgrid = new \SendGrid($apiKey);
    $response = $sendgrid->send($email);
    
    $statusCode = $response->statusCode();
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    
    if ($statusCode >= 200 && $statusCode < 300) {
        echo "✅ SUCCESS! Email sent successfully!\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        echo "📊 Response Details:\n";
        echo "   Status Code: $statusCode\n";
        echo "   Recipient: $testEmail\n\n";
        echo "📬 Next Steps:\n";
        echo "   1. Check your inbox at: $testEmail\n";
        echo "   2. Check spam folder if not in inbox\n";
        echo "   3. Monitor SendGrid dashboard for delivery status\n";
        echo "   4. Test the full registration flow in your app\n\n";
        echo "✅ SendGrid email system is ready to use!\n\n";
    } else {
        echo "⚠️  Email sent with status code: $statusCode\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        echo "Headers:\n";
        print_r($response->headers());
    }
    
} catch (\Exception $e) {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "❌ ERROR: Failed to send email\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    echo "Error Message: " . $e->getMessage() . "\n\n";
    
    echo "🔍 Troubleshooting Steps:\n";
    echo "   1. Verify API key is correct in .env file\n";
    echo "   2. Check sender email is verified in SendGrid\n";
    echo "   3. Ensure API key has 'Mail Send' permissions\n";
    echo "   4. Check SendGrid account status and limits\n";
    echo "   5. Review error details above\n\n";
    
    echo "📚 Documentation: See SENDGRID_EMAIL_SETUP.md\n\n";
    exit(1);
}

echo "═══════════════════════════════════════════════════════════\n";
