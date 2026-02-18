#!/bin/bash

# Manual migration script for video question columns
# This bypasses the constraint issue by using ALL actual production types

PEM_KEY="/Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem"
SERVER="ubuntu@13.126.210.220"

echo "Running manual SQL migration for video question columns..."

ssh -i "$PEM_KEY" "$SERVER" << 'ENDSSH'
cd /var/www/QSightsOrg2.0/backend

# Run PHP script to add columns
php artisan tinker --execute="
try {
    // Check if columns exist
    if (!Schema::hasColumn('questions', 'video_url')) {
        echo 'Adding video columns...\n';
        
        // Drop existing constraint first
        DB::statement('ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check');
        echo 'Dropped old constraint\n';
        
        // Add video columns
        Schema::table('questions', function (\$table) {
            \$table->text('video_url')->nullable();
            \$table->text('video_thumbnail_url')->nullable();
            \$table->integer('video_duration_seconds')->nullable();
            \$table->boolean('is_mandatory_watch')->default(false);
            \$table->string('video_play_mode', 20)->default('inline');
        });
        echo 'Added video columns\n';
        
        // Add updated constraint with ALL actual production types plus video
        DB::statement(\"ALTER TABLE questions ADD CONSTRAINT questions_type_check CHECK (type IN (
            'text', 'textarea', 'number', 'email', 'phone', 'url',
            'radio', 'checkbox', 'select', 'multiselect',
            'rating', 'scale', 'date', 'time', 'datetime',
            'file', 'yesno', 'matrix', 'information',
            'slider_scale', 'dial_gauge', 'likert_visual', 'nps', 'nps_scale', 'star_rating',
            'drag_and_drop', 'sct_likert', 'video'
        ))\");
        echo 'Added new constraint with video type\n';
        
        echo 'SUCCESS: Video columns added successfully!\n';
    } else {
        echo 'Video columns already exist\n';
    }
} catch (\Exception \$e) {
    echo 'ERROR: ' . \$e->getMessage() . '\n';
    exit(1);
}
"
ENDSSH

echo "Video columns migration completed"
