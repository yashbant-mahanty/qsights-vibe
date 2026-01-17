<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SystemSetting;

class SetupSendGridWebhook extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sendgrid:setup-webhook';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Configure SendGrid Event Webhook programmatically';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔧 Setting up SendGrid Event Webhook...');

        // Get SendGrid API key from system settings or env
        $apiKey = SystemSetting::getValue('email_sendgrid_api_key');
        if (!$apiKey) {
            $apiKey = env('SENDGRID_API_KEY');
        }

        if (!$apiKey) {
            $this->error('❌ SendGrid API key not found in system settings or .env file');
            return 1;
        }

        $this->info('✓ Found SendGrid API key');

        // Webhook configuration
        $webhookUrl = env('APP_URL', 'https://prod.qsights.com') . '/api/webhooks/sendgrid';
        
        $this->info("📍 Webhook URL: {$webhookUrl}");

        // Configure webhook via SendGrid API
        $webhookConfig = [
            'enabled' => true,
            'url' => $webhookUrl,
            'group_resubscribe' => true,
            'delivered' => true,
            'group_unsubscribe' => true,
            'spam_report' => true,
            'bounce' => true,
            'deferred' => true,
            'unsubscribe' => true,
            'dropped' => true,
            'open' => true,
            'click' => true,
            'processed' => true,
        ];

        try {
            // Check if webhook already exists
            $this->info('🔍 Checking existing webhook configuration...');
            
            $ch = curl_init('https://api.sendgrid.com/v3/user/webhooks/event/settings');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $apiKey,
                'Content-Type: application/json',
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200) {
                $existing = json_decode($response, true);
                $this->info('✓ Found existing webhook configuration');
                $this->line('Current URL: ' . ($existing['url'] ?? 'Not set'));
                $this->line('Enabled: ' . ($existing['enabled'] ? 'Yes' : 'No'));
            }

            // Update webhook configuration
            $this->info('📤 Updating webhook configuration...');
            
            $ch = curl_init('https://api.sendgrid.com/v3/user/webhooks/event/settings');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($webhookConfig));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $apiKey,
                'Content-Type: application/json',
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($httpCode === 200) {
                $this->info('✅ Webhook configured successfully!');
                $this->newLine();
                $this->info('📋 Configuration:');
                $this->line("   URL: {$webhookUrl}");
                $this->line('   Status: Enabled');
                $this->line('   Events: delivered, open, click, bounce, dropped, etc.');
                $this->newLine();
                $this->info('🎉 SendGrid will now send events to your webhook!');
                $this->info('💡 Test by sending an email notification from QSights');
                return 0;
            } else {
                $this->error('❌ Failed to configure webhook');
                $this->error("HTTP Code: {$httpCode}");
                if ($error) {
                    $this->error("Error: {$error}");
                }
                if ($response) {
                    $this->error("Response: {$response}");
                }
                return 1;
            }

        } catch (\Exception $e) {
            $this->error('❌ Exception: ' . $e->getMessage());
            return 1;
        }
    }
}
