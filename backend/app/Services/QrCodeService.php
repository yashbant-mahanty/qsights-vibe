<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class QrCodeService
{
    /**
     * Generate a QR code as base64 image data URL
     *
     * @param string $url The URL to encode in the QR code
     * @param int $size The size of the QR code in pixels
     * @return string Base64 encoded image data URL for embedding in HTML
     */
    public function generateBase64QrCode(string $url, int $size = 200): string
    {
        try {
            // Use Google Charts API for QR code generation (no external library needed)
            $qrUrl = sprintf(
                'https://chart.googleapis.com/chart?chs=%dx%d&cht=qr&chl=%s&choe=UTF-8&chld=H|2',
                $size,
                $size,
                urlencode($url)
            );
            
            // Fetch the QR code image
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'user_agent' => 'QSights/1.0',
                ],
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                ],
            ]);
            
            $imageData = @file_get_contents($qrUrl, false, $context);
            
            if ($imageData === false) {
                Log::warning('Failed to fetch QR code from Google Charts API', ['url' => $url]);
                return $this->generateFallbackQrCode($url, $size);
            }
            
            $base64 = base64_encode($imageData);
            return 'data:image/png;base64,' . $base64;
            
        } catch (\Exception $e) {
            Log::error('QR code generation failed', [
                'url' => $url,
                'error' => $e->getMessage()
            ]);
            return $this->generateFallbackQrCode($url, $size);
        }
    }

    /**
     * Generate a QR code HTML image tag for direct embedding in emails
     *
     * @param string $url The URL to encode
     * @param int $size The size of the QR code
     * @param string $altText Alternative text for the image
     * @return string HTML img tag with embedded QR code
     */
    public function generateQrCodeHtml(string $url, int $size = 200, string $altText = 'Scan QR Code'): string
    {
        $base64 = $this->generateBase64QrCode($url, $size);
        
        return sprintf(
            '<img src="%s" alt="%s" width="%d" height="%d" style="display: block; margin: 10px auto;" />',
            $base64,
            htmlspecialchars($altText),
            $size,
            $size
        );
    }

    /**
     * Generate an activity QR code that links to the activity take page
     *
     * @param int|string $activityId The activity ID
     * @param string|null $participantToken Optional participant token for personalized link
     * @return string HTML img tag with QR code
     */
    public function generateActivityQrCode($activityId, ?string $participantToken = null): string
    {
        $frontendUrl = env('FRONTEND_URL', env('APP_URL', 'https://qsights.co'));
        
        $url = $frontendUrl . '/activities/take/' . $activityId;
        
        if ($participantToken) {
            $url .= '?token=' . $participantToken;
        }
        
        return $this->generateQrCodeHtml($url, 180, 'Scan to access activity');
    }

    /**
     * Generate a fallback QR code using an alternative service
     *
     * @param string $url The URL to encode
     * @param int $size The size of the QR code
     * @return string Base64 data URL or fallback text
     */
    private function generateFallbackQrCode(string $url, int $size = 200): string
    {
        try {
            // Try QR Server API as fallback
            $qrUrl = sprintf(
                'https://api.qrserver.com/v1/create-qr-code/?size=%dx%d&data=%s&format=png',
                $size,
                $size,
                urlencode($url)
            );
            
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'user_agent' => 'QSights/1.0',
                ],
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                ],
            ]);
            
            $imageData = @file_get_contents($qrUrl, false, $context);
            
            if ($imageData !== false) {
                $base64 = base64_encode($imageData);
                return 'data:image/png;base64,' . $base64;
            }
        } catch (\Exception $e) {
            Log::warning('Fallback QR code generation also failed', ['error' => $e->getMessage()]);
        }
        
        // Return a placeholder image if all else fails
        return $this->getPlaceholderQrCode($size);
    }

    /**
     * Generate a simple placeholder when QR generation fails
     */
    private function getPlaceholderQrCode(int $size = 200): string
    {
        // Return a simple gray placeholder
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' . $size . '" height="' . $size . '" viewBox="0 0 200 200">'
            . '<rect width="200" height="200" fill="#f3f4f6"/>'
            . '<rect x="40" y="40" width="120" height="120" fill="#e5e7eb" stroke="#d1d5db" stroke-width="2"/>'
            . '<text x="100" y="105" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="14">QR Code</text>'
            . '</svg>';
        
        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }
}
