<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Activity;
use App\Models\Response;
use App\Models\Answer;
use Illuminate\Support\Facades\DB;

class ClearActivityResponses extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'responses:clear 
                            {activity_id? : The UUID of the activity to clear responses for}
                            {--all : Clear responses for ALL activities (use with caution)}
                            {--preview : Only clear preview responses}
                            {--force : Skip confirmation prompt}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear responses for an activity (for testing purposes)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $activityId = $this->argument('activity_id');
        $clearAll = $this->option('all');
        $previewOnly = $this->option('preview');
        $force = $this->option('force');

        if (!$activityId && !$clearAll) {
            $this->error('Please provide an activity_id or use --all flag');
            $this->info('Usage: php artisan responses:clear {activity_id}');
            $this->info('   or: php artisan responses:clear --all');
            return 1;
        }

        // Build query
        if ($clearAll) {
            $query = Response::query();
            $activityName = 'ALL ACTIVITIES';
        } else {
            $activity = Activity::find($activityId);
            if (!$activity) {
                $this->error("Activity not found: {$activityId}");
                return 1;
            }
            $query = Response::where('activity_id', $activityId);
            $activityName = $activity->name;
        }

        // Filter preview only
        if ($previewOnly) {
            $query->where('is_preview', true);
        }

        $count = $query->count();

        if ($count === 0) {
            $this->info('No responses found to clear.');
            return 0;
        }

        // Confirmation
        $this->warn("⚠️  WARNING: This will permanently delete responses!");
        $this->line("Activity: {$activityName}");
        $this->line("Responses to delete: {$count}");
        if ($previewOnly) {
            $this->line("Type: Preview responses only");
        } else {
            $this->line("Type: ALL responses (including submitted)");
        }
        
        if (!$force && !$this->confirm('Are you sure you want to proceed?')) {
            $this->info('Operation cancelled.');
            return 0;
        }

        // Delete responses and their answers
        DB::beginTransaction();
        try {
            // Get response IDs
            $responseIds = $query->pluck('id')->toArray();

            // Delete answers first (foreign key constraint)
            $answersDeleted = Answer::whereIn('response_id', $responseIds)->delete();
            
            // Delete responses
            $responsesDeleted = $query->delete();

            DB::commit();

            $this->info("✅ Successfully deleted:");
            $this->line("   - {$responsesDeleted} responses");
            $this->line("   - {$answersDeleted} answers");
            $this->line("Users can now retake the activity with same email.");

            return 0;
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("Failed to delete responses: {$e->getMessage()}");
            return 1;
        }
    }
}
