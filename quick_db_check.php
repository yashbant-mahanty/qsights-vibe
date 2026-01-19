<?php
// Quick DB check script
require __DIR__ . '/backend/vendor/autoload.php';
$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "\n=== DATABASE CHECK ===\n";
echo "Connection: " . config('database.default') . "\n";
echo "Database: " . DB::connection()->getDatabaseName() . "\n\n";

// List all tables
echo "--- TABLES ---\n";
$tables = DB::select("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
foreach ($tables as $table) {
    echo "- {$table->tablename}\n";
}

// Check for events
echo "\n--- EVENTS COUNT ---\n";
try {
    $eventCount = DB::table('events')->count();
    echo "Total events: $eventCount\n";
    
    $activeEvents = DB::table('events')
        ->whereNotNull('questionnaire_id')
        ->where('status', 'active')
        ->count();
    echo "Active events with questionnaire: $activeEvents\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

// Check for answers
echo "\n--- ANSWERS COUNT ---\n";
try {
    $answerCount = DB::table('answers')->count();
    echo "Total answers: $answerCount\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

// Check for notifications
echo "\n--- NOTIFICATION_TRACKING COUNT ---\n";
try {
    $notifCount = DB::table('notification_tracking')->count();
    echo "Total notifications: $notifCount\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
