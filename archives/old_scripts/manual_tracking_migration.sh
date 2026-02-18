#!/bin/bash

# Manual migration script for video_watch_tracking table
# With correct foreign key types matching production

PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"

echo "Running manual SQL migration for video_watch_tracking table..."

ssh -i "$PEM_KEY" "$SERVER" << 'ENDSSH'
cd /var/www/QSightsOrg2.0/backend

# Run PHP script to create table
php artisan tinker --execute="
try {
    // Check if table exists
    if (!Schema::hasTable('video_watch_tracking')) {
        echo 'Creating video_watch_tracking table...\n';
        
        Schema::create('video_watch_tracking', function (\$table) {
            \$table->id();
            \$table->uuid('response_id');
            \$table->unsignedBigInteger('participant_id');
            \$table->uuid('activity_id');
            \$table->unsignedBigInteger('question_id');
            \$table->integer('watch_time_seconds')->default(0);
            \$table->integer('max_watch_position')->default(0);
            \$table->boolean('completed')->default(false);
            \$table->integer('play_count')->default(0);
            \$table->integer('pause_count')->default(0);
            \$table->integer('seek_count')->default(0);
            \$table->timestamps();
            
            // Foreign keys with correct types
            \$table->foreign('response_id')->references('id')->on('responses')->onDelete('cascade');
            \$table->foreign('participant_id')->references('id')->on('participants')->onDelete('cascade');
            \$table->foreign('activity_id')->references('id')->on('activities')->onDelete('cascade');
            \$table->foreign('question_id')->references('id')->on('questions')->onDelete('cascade');
            
            // Unique constraint
            \$table->unique(['response_id', 'question_id']);
        });
        
        echo 'SUCCESS: video_watch_tracking table created successfully!\n';
    } else {
        echo 'video_watch_tracking table already exists\n';
    }
} catch (\Exception \$e) {
    echo 'ERROR: ' . \$e->getMessage() . '\n';
    exit(1);
}
"
ENDSSH

echo "video_watch_tracking table migration completed"
