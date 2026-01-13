<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

// Create event_contact_messages table
if (!Schema::hasTable('event_contact_messages')) {
    Schema::create('event_contact_messages', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->uuid('activity_id')->nullable();
        $table->string('activity_name')->nullable();
        $table->string('user_type', 50)->default('anonymous');
        $table->unsignedBigInteger('participant_id')->nullable(); // participants use bigint
        $table->string('name');
        $table->string('email');
        $table->text('message');
        $table->string('status', 50)->default('new');
        $table->timestamps();
        $table->softDeletes();
        
        $table->foreign('activity_id')->references('id')->on('activities')->onDelete('set null');
        $table->foreign('participant_id')->references('id')->on('participants')->onDelete('set null');
    });
    echo "Created event_contact_messages table\n";
} else {
    echo "event_contact_messages table already exists\n";
}

// Add contact_us_enabled to activities
if (!Schema::hasColumn('activities', 'contact_us_enabled')) {
    Schema::table('activities', function (Blueprint $table) {
        $table->boolean('contact_us_enabled')->default(false);
    });
    echo "Added contact_us_enabled column to activities\n";
} else {
    echo "contact_us_enabled column already exists\n";
}

// Record migrations as ran
try {
    DB::table('migrations')->insert([
        'migration' => '2026_01_12_create_event_contact_messages_table',
        'batch' => 14
    ]);
} catch (Exception $e) {
    // Already recorded
}

try {
    DB::table('migrations')->insert([
        'migration' => '2026_01_12_add_contact_us_enabled_to_activities',
        'batch' => 14
    ]);
} catch (Exception $e) {
    // Already recorded
}

echo "Migrations complete!\n";
