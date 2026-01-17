<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SystemSetting;

class SystemSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            [
                'key' => 'email_sendgrid_api_key',
                'value' => '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',
                'type' => 'string',
                'description' => 'SendGrid API Key for email delivery',
                'is_encrypted' => true,
            ],
            [
                'key' => 'email_sendgrid_api_id',
                'value' => 'dFz6dyicT3C61aTtN019Ew',
                'type' => 'string',
                'description' => 'SendGrid API Key ID',
                'is_encrypted' => false,
            ],
            [
                'key' => 'email_sender_email',
                'value' => 'info@qsights.com',
                'type' => 'string',
                'description' => 'Verified sender email address',
                'is_encrypted' => false,
            ],
            [
                'key' => 'email_sender_name',
                'value' => 'QSights Support',
                'type' => 'string',
                'description' => 'Sender name shown in emails',
                'is_encrypted' => false,
            ],
        ];

        foreach ($settings as $setting) {
            SystemSetting::updateOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }

        $this->command->info('System settings seeded successfully!');
    }
}
