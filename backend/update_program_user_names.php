<?php

require __DIR__.'/vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Starting to update program user usernames...\n\n";

// Get all programs
$programs = DB::table('programs')->whereNull('deleted_at')->get();

echo "Found " . count($programs) . " programs\n\n";

$updated = 0;
$errors = 0;

foreach ($programs as $program) {
    echo "Processing program: {$program->name} (ID: {$program->id})\n";
    
    // Get the program slug for username generation
    $programSlug = Str::slug($program->name);
    
    // Define the roles to update
    $rolesToUpdate = ['program-admin', 'program-manager', 'program-moderator'];
    
    foreach ($rolesToUpdate as $role) {
        try {
            // Find users with this role for this program
            $users = DB::table('users')
                ->where('program_id', $program->id)
                ->where('role', $role)
                ->whereNull('deleted_at')
                ->get();
            
            foreach ($users as $user) {
                // Generate new username based on role
                $roleShort = str_replace('program-', '', $role);
                $newUsername = "{$roleShort}.{$programSlug}@qsights.com";
                
                // Check if username already follows the pattern
                if ($user->name === $newUsername) {
                    echo "  ✓ User {$user->id} ({$role}) already has correct username: {$newUsername}\n";
                    continue;
                }
                
                // Update the username
                DB::table('users')
                    ->where('id', $user->id)
                    ->update([
                        'name' => $newUsername,
                        'updated_at' => now()
                    ]);
                
                echo "  ✓ Updated user {$user->id} ({$role}): {$user->name} → {$newUsername}\n";
                $updated++;
            }
            
        } catch (Exception $e) {
            echo "  ✗ Error updating {$role} for program {$program->id}: {$e->getMessage()}\n";
            $errors++;
        }
    }
    
    echo "\n";
}

echo "\n========================================\n";
echo "Update completed!\n";
echo "Updated: {$updated} users\n";
echo "Errors: {$errors}\n";
echo "========================================\n";
