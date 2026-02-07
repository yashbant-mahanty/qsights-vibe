#!/bin/bash

# Migrate answers for Advance Event and Email-Embedded-Event

cd /var/www/QSightsOrg2.0/backend

echo "=== Migrating Advance Event (a0d962df) ==="
php artisan tinker --execute="
\$eventId = 'a0d962df-c62e-4a4e-8fbf-22925cc4b9b9';
\$responses = DB::table('responses')->where('activity_id', \$eventId)->where('is_preview', false)->get();
echo 'Found ' . \$responses->count() . ' responses' . PHP_EOL;

foreach (\$responses as \$response) {
    \$existingAnswers = DB::table('answers')->where('response_id', \$response->id)->count();
    if (\$existingAnswers > 0) {
        echo '  Already has ' . \$existingAnswers . ' answers' . PHP_EOL;
        continue;
    }
    
    \$jsonAnswers = json_decode(\$response->answers, true);
    if (empty(\$jsonAnswers)) {
        echo '  No JSON answers' . PHP_EOL;
        continue;
    }
    
    echo '  Migrating ' . count(\$jsonAnswers) . ' answers...' . PHP_EOL;
    \$maxId = DB::table('answers')->max('id') ?? 0;
    
    foreach (\$jsonAnswers as \$questionId => \$value) {
        \$maxId++;
        DB::table('answers')->insert([
            'id' => \$maxId,
            'response_id' => \$response->id,
            'question_id' => \$questionId,
            'value' => is_array(\$value) ? null : \$value,
            'value_array' => is_array(\$value) ? json_encode(\$value) : null,
            'created_at' => \$response->created_at ?? now(),
            'updated_at' => now(),
        ]);
    }
    echo '  Done!' . PHP_EOL;
}
"

echo ""
echo "=== Migrating Email-Embedded-Event (a0d81515) ==="
php artisan tinker --execute="
\$eventId = 'a0d81515-68bb-4ae3-96c5-83ba9a4ad49c';
\$responses = DB::table('responses')->where('activity_id', \$eventId)->where('is_preview', false)->get();
echo 'Found ' . \$responses->count() . ' responses' . PHP_EOL;

foreach (\$responses as \$response) {
    \$existingAnswers = DB::table('answers')->where('response_id', \$response->id)->count();
    if (\$existingAnswers > 0) {
        echo '  Already has ' . \$existingAnswers . ' answers' . PHP_EOL;
        continue;
    }
    
    \$jsonAnswers = json_decode(\$response->answers, true);
    if (empty(\$jsonAnswers)) {
        echo '  No JSON answers to migrate' . PHP_EOL;
        continue;
    }
    
    echo '  Migrating ' . count(\$jsonAnswers) . ' answers...' . PHP_EOL;
    \$maxId = DB::table('answers')->max('id') ?? 0;
    
    foreach (\$jsonAnswers as \$questionId => \$value) {
        \$maxId++;
        DB::table('answers')->insert([
            'id' => \$maxId,
            'response_id' => \$response->id,
            'question_id' => \$questionId,
            'value' => is_array(\$value) ? null : \$value,
            'value_array' => is_array(\$value) ? json_encode(\$value) : null,
            'created_at' => \$response->created_at ?? now(),
            'updated_at' => now(),
        ]);
    }
    echo '  Done!' . PHP_EOL;
}
"

echo ""
echo "=== Verification ==="
php artisan tinker --execute="
\$events = [
    'a0d962df-c62e-4a4e-8fbf-22925cc4b9b9',
    'a0d81515-68bb-4ae3-96c5-83ba9a4ad49c',
];

foreach (\$events as \$eventId) {
    \$activity = DB::table('activities')->where('id', \$eventId)->first();
    \$answers = DB::table('answers')
        ->join('responses', 'answers.response_id', '=', 'responses.id')
        ->where('responses.activity_id', \$eventId)
        ->where('responses.is_preview', false)
        ->count();
    echo substr(\$eventId, 0, 8) . ' (' . (\$activity ? \$activity->name : 'Unknown') . '): ' . \$answers . ' answers' . PHP_EOL;
}
"
