<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Display mode will be stored in the existing settings JSON field
        // This migration is for documentation purposes
        // Options: 'single' (one question per page) or 'all' (all questions on one page)
        
        // Update existing questionnaires to have default display_mode
        DB::table('questionnaires')->whereNull('settings')->update([
            'settings' => json_encode(['display_mode' => 'all'])
        ]);
        
        DB::table('questionnaires')->whereNotNull('settings')->get()->each(function ($questionnaire) {
            $settings = json_decode($questionnaire->settings, true) ?? [];
            if (!isset($settings['display_mode'])) {
                $settings['display_mode'] = 'all';
                DB::table('questionnaires')
                    ->where('id', $questionnaire->id)
                    ->update(['settings' => json_encode($settings)]);
            }
        });
        
        // Update existing activities to have default display_mode
        DB::table('activities')->whereNull('settings')->update([
            'settings' => json_encode(['display_mode' => 'all'])
        ]);
        
        DB::table('activities')->whereNotNull('settings')->get()->each(function ($activity) {
            $settings = json_decode($activity->settings, true) ?? [];
            if (!isset($settings['display_mode'])) {
                $settings['display_mode'] = 'all';
                DB::table('activities')
                    ->where('id', $activity->id)
                    ->update(['settings' => json_encode($settings)]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove display_mode from settings
        DB::table('questionnaires')->get()->each(function ($questionnaire) {
            $settings = json_decode($questionnaire->settings, true) ?? [];
            unset($settings['display_mode']);
            DB::table('questionnaires')
                ->where('id', $questionnaire->id)
                ->update(['settings' => empty($settings) ? null : json_encode($settings)]);
        });
        
        DB::table('activities')->get()->each(function ($activity) {
            $settings = json_decode($activity->settings, true) ?? [];
            unset($settings['display_mode']);
            DB::table('activities')
                ->where('id', $activity->id)
                ->update(['settings' => empty($settings) ? null : json_encode($settings)]);
        });
    }
};
