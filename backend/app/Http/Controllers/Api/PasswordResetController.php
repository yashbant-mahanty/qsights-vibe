<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Services\EmailService;
use App\Services\NotificationLogService;
use Illuminate\Support\Str;
use App\Models\User;
use Carbon\Carbon;

class PasswordResetController extends Controller
{
    protected $emailService;

    public function __construct()
    {
        // Initialize EmailService with NotificationLogService for proper SendGrid integration
        $this->emailService = new EmailService(new NotificationLogService());
    }

    /**
     * Request OTP for password reset
     */
    public function requestOTP(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email format',
                'errors' => $validator->errors()
            ], 422);
        }

        $email = $request->email;

        // Check rate limiting (max 3 requests per hour)
        $recentRequests = DB::table('password_resets')
            ->where('email', $email)
            ->where('created_at', '>=', Carbon::now()->subHour())
            ->count();

        if ($recentRequests >= 3) {
            return response()->json([
                'success' => false,
                'message' => 'Too many requests. Please try again later.'
            ], 429);
        }

        // Check if user exists (but don't reveal this to prevent email enumeration)
        $user = User::where('email', $email)->first();

        // Generate 6-digit OTP
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $otpHash = Hash::make($otp);

        // Store hashed OTP in database
        DB::table('password_resets')->insert([
            'id' => Str::uuid(),
            'email' => $email,
            'otp_hash' => $otpHash,
            'expires_at' => Carbon::now()->addMinutes(10),
            'used' => false,
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        // Send email only if user exists - use communication_email if set
        if ($user) {
            $recipientEmail = $user->communication_email ?: $user->email;
            $this->sendOTPEmail($recipientEmail, $otp);
        }

        // Always return success to prevent email enumeration
        return response()->json([
            'success' => true,
            'message' => 'If your email is registered, you will receive an OTP shortly.'
        ]);
    }

    /**
     * Verify OTP
     */
    public function verifyOTP(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'otp' => 'required|digits:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid input',
                'errors' => $validator->errors()
            ], 422);
        }

        $email = $request->email;
        $otp = $request->otp;

        // Get most recent unused OTP
        $resetRecord = DB::table('password_resets')
            ->where('email', $email)
            ->where('used', false)
            ->where('expires_at', '>', Carbon::now())
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$resetRecord) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired OTP'
            ], 401);
        }

        // Verify OTP
        if (!Hash::check($otp, $resetRecord->otp_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid OTP'
            ], 401);
        }

        // Generate reset token for next step
        $resetToken = Str::random(60);

        // Mark OTP as used and store reset token
        DB::table('password_resets')
            ->where('id', $resetRecord->id)
            ->update([
                'used' => true,
                'otp_hash' => Hash::make($resetToken), // Reuse field for reset token
                'updated_at' => Carbon::now(),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'OTP verified successfully',
            'reset_token' => $resetToken
        ]);
    }

    /**
     * Reset password
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'reset_token' => 'required|string',
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/'
            ],
        ], [
            'password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid input',
                'errors' => $validator->errors()
            ], 422);
        }

        $email = $request->email;
        $resetToken = $request->reset_token;
        $newPassword = $request->password;

        // Verify reset token
        $resetRecord = DB::table('password_resets')
            ->where('email', $email)
            ->where('used', true)
            ->where('expires_at', '>', Carbon::now())
            ->orderBy('updated_at', 'desc')
            ->first();

        if (!$resetRecord || !Hash::check($resetToken, $resetRecord->otp_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired reset token'
            ], 401);
        }

        // Find user
        $user = User::where('email', $email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        }

        // Update password
        $user->password = Hash::make($newPassword);
        $user->save();

        // Invalidate all password reset records for this email
        DB::table('password_resets')
            ->where('email', $email)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully'
        ]);
    }

    /**
     * Send OTP email via EmailService (uses database SendGrid credentials)
     */
    private function sendOTPEmail($email, $otp)
    {
        $htmlContent = $this->getOTPEmailTemplate($otp);

        try {
            $this->emailService->send(
                $email,
                'Password Reset OTP - QSights',
                $htmlContent,
                [
                    'event' => 'password_reset_otp',
                ]
            );
            
            \Log::info('OTP email sent successfully', ['email' => $email]);
        } catch (\Exception $e) {
            \Log::error('Failed to send OTP email', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            // Don't throw the error to prevent email enumeration
        }
    }

    /**
     * Get OTP email template
     */
    private function getOTPEmailTemplate($otp)
    {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset OTP</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Password Reset Request</h1>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                                You have requested to reset your password. Use the OTP below to complete the process:
                            </p>
                            
                            <!-- OTP Box -->
                            <div style="background-color: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
                                <p style="margin: 0 0 10px; color: #666666; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your OTP</p>
                                <p style="margin: 0; color: #667eea; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">{$otp}</p>
                            </div>
                            
                            <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                <strong>Important:</strong>
                            </p>
                            <ul style="color: #666666; font-size: 14px; line-height: 1.8; margin: 0 0 20px; padding-left: 20px;">
                                <li>This OTP is valid for <strong>10 minutes</strong></li>
                                <li>Do not share this code with anyone</li>
                                <li>If you didn't request this, please ignore this email</li>
                            </ul>
                            
                            <p style="margin: 20px 0 0; color: #999999; font-size: 12px; line-height: 1.6;">
                                This is an automated email. Please do not reply.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                © 2025 QSights. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
    }
}
