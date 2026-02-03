<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

$program = DB::table('programs')->where('name', 'BQ-Evaluation')->first();
if (!$program) {
    echo "❌ Program 'BQ-Evaluation' not found\n";
    exit(1);
}

echo "✅ Found program: {$program->name} (ID: {$program->id})\n";

// Check if evaluation-admin already exists
$exists = DB::table('users')
    ->where('program_id', $program->id)
    ->where('role', 'evaluation-admin')
    ->exists();

if ($exists) {
    echo "⚠️  evaluation-admin already exists for this program\n";
    exit(0);
}

// Generate evaluation-admin user
$password = Str::random(12);
$email = 'bq-evaluation.evaladmin@qsights.com';

// Default services for evaluation-admin
$defaultServices = [
    'dashboard',
    'programs-view',
    'questionnaires-view', 'questionnaires-create', 'questionnaires-edit', 'questionnaires-delete',
    'activities-view', 'activities-create', 'activities-edit', 'activities-delete',
    'activities-send-notification', 'activities-set-reminder', 'activities-landing-config',
    'reports-view', 'reports-export',
    'evaluation-view', 'evaluation-manage',
];

$userId = DB::table('users')->insertGetId([
    'name' => $email,
    'email' => $email,
    'password' => Hash::make($password),
    'role' => 'evaluation-admin',
    'program_id' => $program->id,
    'default_services' => json_encode($defaultServices),
    'status' => 'active',
    'created_at' => now(),
    'updated_at' => now(),
]);

echo "\n✅ Created evaluation-admin user successfully!\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "Username: $email\n";
echo "Password: $password\n";
echo "Role:     evaluation-admin\n";
echo "Program:  {$program->name}\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "⚠️  IMPORTANT: Save this password! It will not be shown again.\n";
