<?php

namespace Database\Seeders;

use App\Models\ThemeSetting;
use Illuminate\Database\Seeder;

class AddMissingThemeSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $missingSettings = [
            ['key' => 'login_panel_title', 'value' => 'Welcome Back', 'type' => 'text', 'category' => 'login_panel'],
            ['key' => 'login_panel_subtitle', 'value' => 'Sign in to your account', 'type' => 'text', 'category' => 'login_panel'],
            ['key' => 'login_email_label', 'value' => 'Email Address', 'type' => 'text', 'category' => 'login_panel'],
            ['key' => 'login_email_placeholder', 'value' => 'Enter your email', 'type' => 'text', 'category' => 'login_panel'],
            ['key' => 'login_password_label', 'value' => 'Password', 'type' => 'text', 'category' => 'login_panel'],
            ['key' => 'login_password_placeholder', 'value' => 'Enter your password', 'type' => 'text', 'category' => 'login_panel'],
            ['key' => 'login_button_text', 'value' => 'Sign In', 'type' => 'text', 'category' => 'login_panel'],
            ['key' => 'login_footer_text', 'value' => 'Need help? Contact sales', 'type' => 'text', 'category' => 'login_panel'],
            ['key' => 'login_footer_link', 'value' => '/contact-us', 'type' => 'text', 'category' => 'login_panel'],
            ['key' => 'login_support_text', 'value' => 'Support: support@qsights.com', 'type' => 'text', 'category' => 'login_panel'],
            ['key' => 'footer_text', 'value' => 'QSights © 2025', 'type' => 'text', 'category' => 'footer'],
            ['key' => 'footer_terms_url', 'value' => '/terms-of-service', 'type' => 'text', 'category' => 'footer'],
            ['key' => 'footer_privacy_url', 'value' => '/privacy-policy', 'type' => 'text', 'category' => 'footer'],
            ['key' => 'footer_contact_url', 'value' => '/contact-us', 'type' => 'text', 'category' => 'footer'],
            ['key' => 'footer_contact_label', 'value' => 'Contact Us', 'type' => 'text', 'category' => 'footer'],
        ];

        foreach ($missingSettings as $setting) {
            ThemeSetting::firstOrCreate(['key' => $setting['key']], $setting);
        }

        $this->command->info('✓ Missing theme settings added successfully!');
    }
}
