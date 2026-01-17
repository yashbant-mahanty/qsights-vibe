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

echo "Testing S3 Presigned URL generation...\n";

try {
    $s3Client = new S3Client([
        "region" => $settings["s3_region"],
        "version" => "latest",
        "credentials" => [
            "key" => $settings["s3_access_key"],
            "secret" => $settings["s3_secret_key"],
        ],
    ]);

    // Test with the image we uploaded earlier
    $s3Key = "qsightsprod/test-uploads/20260116_132510_test.png";
    
    $cmd = $s3Client->getCommand('GetObject', [
        'Bucket' => $settings["s3_bucket"],
        'Key' => $s3Key,
    ]);

    $presignedRequest = $s3Client->createPresignedRequest($cmd, "+3600 seconds");
    $presignedUrl = (string) $presignedRequest->getUri();

    echo "\n=== SUCCESS ===\n";
    echo "Presigned URL (valid for 1 hour):\n";
    echo $presignedUrl . "\n";
    
    // Test accessing it
    echo "\nTesting URL accessibility...\n";
    $ch = curl_init($presignedUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_NOBODY, true);
    curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "HTTP Status: " . $httpCode . "\n";
    echo ($httpCode == 200 ? "Image is accessible!" : "Error accessing image") . "\n";
    
} catch (Exception $e) {
    echo "\n=== ERROR ===\n";
    echo $e->getMessage() . "\n";
}
