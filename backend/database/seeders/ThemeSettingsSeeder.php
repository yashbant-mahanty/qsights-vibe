<?php

namespace Database\Seeders;

use App\Models\ThemeSetting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ThemeSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $defaultSettings = [
            // Template style
            [
                'key' => 'template_style',
                'value' => 'advanced',
                'type' => 'text',
                'category' => 'general',
            ],
            
            // Colors
            [
                'key' => 'primary_color',
                'value' => '#3B82F6',
                'type' => 'color',
                'category' => 'colors',
            ],
            [
                'key' => 'secondary_color',
                'value' => '#10B981',
                'type' => 'color',
                'category' => 'colors',
            ],
            [
                'key' => 'accent_color',
                'value' => '#F59E0B',
                'type' => 'color',
                'category' => 'colors',
            ],
            [
                'key' => 'login_bg_color',
                'value' => '#FFFFFF',
                'type' => 'color',
                'category' => 'colors',
            ],
            
            // Fonts
            [
                'key' => 'primary_font',
                'value' => 'Inter',
                'type' => 'text',
                'category' => 'fonts',
            ],
            [
                'key' => 'heading_font',
                'value' => 'Poppins',
                'type' => 'text',
                'category' => 'fonts',
            ],
        ];

        foreach ($defaultSettings as $setting) {
            ThemeSetting::updateOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }

        $this->command->info('Theme settings seeded successfully!');
    }
}
