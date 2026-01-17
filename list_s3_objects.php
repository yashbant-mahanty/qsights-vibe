<?php
require "vendor/autoload.php";
$app = require_once "bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\SystemSetting;
use Aws\S3\S3Client;

$settings = SystemSetting::whereIn("key", [
    "s3_bucket", "s3_folder", "s3_region", "s3_access_key", "s3_secret_key"
])->pluck("value", "key")->toArray();

$s3Client = new S3Client([
    "region" => $settings["s3_region"],
    "version" => "latest",
    "credentials" => [
        "key" => $settings["s3_access_key"],
        "secret" => $settings["s3_secret_key"],
    ],
]);

// List objects in the test-uploads folder
$result = $s3Client->listObjectsV2([
    "Bucket" => $settings["s3_bucket"],
    "Prefix" => "qsightsprod/test-uploads/",
    "MaxKeys" => 10
]);

echo "Objects found:\n";
if (isset($result["Contents"])) {
    foreach ($result["Contents"] as $obj) {
        echo "- " . $obj["Key"] . " (" . $obj["Size"] . " bytes)\n";
    }
} else {
    echo "No objects found\n";
}

// Now try to generate a presigned URL for the first object and test it
if (isset($result["Contents"][0])) {
    $key = $result["Contents"][0]["Key"];
    echo "\nGenerating presigned URL for: $key\n";
    
    $cmd = $s3Client->getCommand('GetObject', [
        'Bucket' => $settings["s3_bucket"],
        'Key' => $key,
    ]);

    $request = $s3Client->createPresignedRequest($cmd, '+1 hour');
    $url = (string) $request->getUri();
    
    echo "URL: " . substr($url, 0, 100) . "...\n";
    
    // Actually try to get the object directly
    echo "\nTrying direct getObject...\n";
    try {
        $objResult = $s3Client->getObject([
            'Bucket' => $settings["s3_bucket"],
            'Key' => $key,
        ]);
        echo "SUCCESS! Object retrieved, size: " . $objResult['ContentLength'] . " bytes\n";
    } catch (Exception $e) {
        echo "ERROR: " . $e->getMessage() . "\n";
    }
}
