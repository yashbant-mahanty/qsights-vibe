<?php

namespace App\Services;

use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

/**
 * Secure token generation for email-embedded surveys
 * Tokens are HMAC-signed and expire after configured time
 */
class EmailResponseTokenService
{
    private string $secret;
    private int $expiryHours;

    public function __construct()
    {
        $this->secret = config('app.key');
        $this->expiryHours = config('qsights.email_response_token_expiry', 72); // 72 hours default
    }

    /**
     * Generate a secure signed token for email response submission
     * 
     * @param string $activityId
     * @param string $questionId
     * @param string $recipientEmail
     * @param string $optionValue The answer value (e.g., "Doctor", "Patient", "5 stars")
     * @return string Base64-encoded signed token
     */
    public function generateToken(
        string $activityId,
        string $questionId,
        string $recipientEmail,
        string $optionValue
    ): string {
        $expiry = Carbon::now()->addHours($this->expiryHours)->timestamp;
        
        $payload = [
            'activity_id' => $activityId,
            'question_id' => $questionId,
            'email' => strtolower(trim($recipientEmail)),
            'answer' => $optionValue,
            'exp' => $expiry,
            'iat' => time(),
        ];

        $encoded = base64_encode(json_encode($payload));
        $signature = $this->sign($encoded);

        return base64_encode($encoded . '.' . $signature);
    }

    /**
     * Verify and decode token
     * 
     * @param string $token
     * @return array|null Returns payload if valid, null if invalid/expired
     */
    public function verifyToken(string $token): ?array
    {
        try {
            $decoded = base64_decode($token);
            $parts = explode('.', $decoded);

            if (count($parts) !== 2) {
                return null;
            }

            [$encoded, $signature] = $parts;

            // Verify signature
            if (!$this->verify($encoded, $signature)) {
                return null;
            }

            $payload = json_decode(base64_decode($encoded), true);

            // Check expiry
            if ($payload['exp'] < time()) {
                return null;
            }

            return $payload;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Generate HMAC signature
     */
    private function sign(string $data): string
    {
        return hash_hmac('sha256', $data, $this->secret);
    }

    /**
     * Verify HMAC signature
     */
    private function verify(string $data, string $signature): bool
    {
        return hash_equals($this->sign($data), $signature);
    }

    /**
     * Generate submission URL for an answer option
     */
    public function generateSubmissionUrl(
        string $activityId,
        string $questionId,
        string $recipientEmail,
        string $optionValue
    ): string {
        $token = $this->generateToken($activityId, $questionId, $recipientEmail, $optionValue);
        return url("/api/public/email-response?token={$token}");
    }
}
