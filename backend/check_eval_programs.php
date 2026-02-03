<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "Checking evaluation programs...\n\n";

$evalIds = [
    '654e38c2-3d9a-4792-a1e8-4f223f749cac',  // New program
    '38656518-712c-4eed-a0fc-1a9795cba13a',  // Old program
    'a262635a-6491-44eb-a005-3b470519e4c9',  // Old program
    '92d283c4-7226-4930-9b57-40c62f1d5cab'   // Old program
];

$evals = DB::table('evaluation_triggered')
    ->whereIn('id', $evalIds)
    ->select('id', 'program_id', 'evaluator_name', 'deleted_at')
    ->get();

echo "Evaluations:\n";
foreach ($evals as $eval) {
    echo "  ID: " . substr($eval->id, 0, 8) . "... \n";
    echo "  Program ID: " . $eval->program_id . "\n";
    echo "  Evaluator: " . $eval->evaluator_name . "\n";
    echo "  Deleted: " . ($eval->deleted_at ?? 'NO') . "\n\n";
}

$programIds = $evals->pluck('program_id')->unique();
$programs = DB::table('programs')
    ->whereIn('id', $programIds)
    ->select('id', 'name', 'deleted_at')
    ->get();

echo "\nPrograms:\n";
foreach ($programs as $prog) {
    echo "  Name: " . $prog->name . "\n";
    echo "  ID: " . $prog->id . "\n";
    echo "  Deleted: " . ($prog->deleted_at ?? 'NO') . "\n\n";
}

// Check if the old program evaluations should be filtered
echo "\nEvaluations with programs JOIN:\n";
$reportsQuery = DB::table('evaluation_triggered as et')
    ->join('programs as p', 'et.program_id', '=', 'p.id')
    ->where('et.status', 'completed')
    ->whereNull('et.deleted_at')
    ->whereNull('p.deleted_at')
    ->whereIn('et.id', $evalIds)
    ->select('et.id', 'p.name as program_name', 'et.evaluator_name')
    ->get();

echo "  Found " . $reportsQuery->count() . " evaluations after filtering:\n";
foreach ($reportsQuery as $r) {
    echo "    - " . substr($r->id, 0, 8) . "... from program: " . $r->program_name . "\n";
}

echo "\nDone.\n";
