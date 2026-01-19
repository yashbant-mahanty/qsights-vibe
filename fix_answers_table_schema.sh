#!/bin/bash

# CRITICAL FIX: Recreate answers table with proper UUID schema
# This will backup existing data, drop table, recreate with UUIDs, restore data

echo "=========================================="
echo "CRITICAL FIX: Answers Table Schema"
echo "=========================================="
echo ""

# Upload and run fix on server
scp -P 3389 -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem \
    backend/database/migrations/2025_12_02_121029_create_answers_table.php \
    ubuntu@127.0.0.1:/tmp/

ssh -p 3389 -i /Users/yash/Documents/PEMs/QSights-Mumbai-12Aug2019.pem ubuntu@127.0.0.1 << 'ENDSSH'
    cd /var/www/QSightsOrg2.0/backend
    
    echo "1. Backing up existing answers table..."
    php artisan tinker --execute="
        \$data = DB::table('answers')->get()->toArray();
        file_put_contents('/tmp/answers_backup.json', json_encode(\$data, JSON_PRETTY_PRINT));
        echo 'Backed up ' . count(\$data) . ' answer records\n';
    "
    
    echo ""
    echo "2. Dropping answers table..."
    php artisan tinker --execute="
        Schema::dropIfExists('answers');
        echo 'Dropped answers table\n';
    "
    
    echo ""
    echo "3. Moving new migration..."
    sudo mv /tmp/2025_12_02_121029_create_answers_table.php database/migrations/
    sudo chown ubuntu:ubuntu database/migrations/2025_12_02_121029_create_answers_table.php
    
    echo ""
    echo "4. Running migration..."
    php artisan migrate --path=database/migrations/2025_12_02_121029_create_answers_table.php --force
    
    echo ""
    echo "5. Now run migrate_json_answers.php to restore all data from JSON"
    
ENDSSH

echo ""
echo "=========================================="
echo "Fix complete! Now run migration script."
echo "==========================================
"
