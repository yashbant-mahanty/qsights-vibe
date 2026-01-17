<?php
require "vendor/autoload.php";
$app = require_once "bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

// Get questionnaires table columns
$columns = DB::select("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'questionnaires' ORDER BY ordinal_position");

echo "Questionnaires table columns:\n";
foreach ($columns as $col) {
    echo "  - {$col->column_name} ({$col->data_type})\n";
}

// Get a sample questionnaire
echo "\n\nSample questionnaire:\n";
$q = DB::table('questionnaires')->first();
if ($q) {
    print_r($q);
}
