<?php
require __DIR__ . '/backend/vendor/autoload.php';
$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "\n========================================\n";
echo "SCHEMA INVESTIGATION\n";
echo "========================================\n\n";

// Activities (instead of events)
echo "--- ACTIVITIES TABLE STRUCTURE ---\n";
$columns = DB::select("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'activities' ORDER BY ordinal_position");
foreach ($columns as $col) {
    echo "{$col->column_name} ({$col->data_type}) - Null: {$col->is_nullable}\n";
}

echo "\n--- SAMPLE ACTIVITIES (Latest 3) ---\n";
$activities = DB::table('activities')
    ->select('id', 'name', 'type', 'status', 'questionnaire_id', 'start_date')
    ->orderBy('created_at', 'DESC')
    ->limit(3)
    ->get();
foreach ($activities as $act) {
    print_r($act);
}

// Answers table
echo "\n--- ANSWERS TABLE STRUCTURE ---\n";
$columns = DB::select("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'answers' ORDER BY ordinal_position");
foreach ($columns as $col) {
    echo "{$col->column_name} ({$col->data_type}) - Null: {$col->is_nullable}\n";
}

echo "\n--- SAMPLE ANSWERS (Latest 5) ---\n";
$answers = DB::table('answers')
    ->orderBy('created_at', 'DESC')
    ->limit(5)
    ->get();
foreach ($answers as $answer) {
    print_r($answer);
}

// Notification tables
echo "\n--- NOTIFICATION_LOGS TABLE STRUCTURE ---\n";
try {
    $columns = DB::select("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'notification_logs' ORDER BY ordinal_position");
    foreach ($columns as $col) {
        echo "{$col->column_name} ({$col->data_type}) - Null: {$col->is_nullable}\n";
    }
    
    echo "\n--- SAMPLE NOTIFICATION_LOGS (Latest 3) ---\n";
    $logs = DB::table('notification_logs')
        ->orderBy('created_at', 'DESC')
        ->limit(3)
        ->get();
    foreach ($logs as $log) {
        print_r($log);
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\n--- NOTIFICATIONS TABLE STRUCTURE ---\n";
try {
    $columns = DB::select("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'notifications' ORDER BY ordinal_position");
    foreach ($columns as $col) {
        echo "{$col->column_name} ({$col->data_type}) - Null: {$col->is_nullable}\n";
    }
    
    echo "\n--- SAMPLE NOTIFICATIONS (Latest 3) ---\n";
    $notifs = DB::table('notifications')
        ->orderBy('created_at', 'DESC')
        ->limit(3)
        ->get();
    foreach ($notifs as $notif) {
        print_r($notif);
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
