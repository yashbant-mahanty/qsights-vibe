<?php
require "vendor/autoload.php";
$app = require_once "bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

// Get questions table columns
$columns = DB::select("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'questions' ORDER BY ordinal_position");

echo "Questions table columns:\n";
foreach ($columns as $col) {
    echo "  - {$col->column_name} ({$col->data_type})\n";
}

// Get a sample question
echo "\n\nSample question:\n";
$q = DB::table('questions')->first();
if ($q) {
    print_r($q);
} else {
    echo "No questions found\n";
}
