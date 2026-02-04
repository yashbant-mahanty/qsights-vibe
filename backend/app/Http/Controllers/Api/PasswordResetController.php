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
     * Following Microsoft/Google approach: User enters login email
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

        $inputEmail = strtolower(trim($request->email));

        // Check rate limiting (max 5 requests per hour for the input email)
        $recentRequests = DB::table('password_resets')
            ->where('email', $inputEmail)
            ->where('created_at', '>=', Carbon::now()->subHour())
            ->count();

        if ($recentRequests >= 5) {
            return response()->json([
                'success' => false,
                'message' => 'Too many requests. Please try again later.'
            ], 429);
        }

        // Find user by login email
        $user = User::where('email', $inputEmail)->first();

        if (!$user) {
            // Store a dummy record for rate limiting even if no user found
            DB::table('password_resets')->insert([
                'id' => Str::uuid(),
                'email' => $inputEmail,
                'otp_hash' => Hash::make('dummy'),
                'expires_at' => Carbon::now()->addMinutes(10),
                'used' => true, // Mark as used so it can't be verified
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);

            // Always return success to prevent email enumeration
            return response()->json([
                'success' => true,
                'message' => 'If your email is registered, you will receive an OTP shortly.'
            ]);
        }

        // Generate 6-digit OTP
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $otpHash = Hash::make($otp);

        // IMPORTANT: OTP must be sent to communication_email
        // For auto-generated usernames (like program-admin.evaladmin@qsights.com), 
        // the username is NOT a real email - we MUST have a communication_email
        if (empty($user->communication_email)) {
            \Log::warning('Password reset failed: No communication email set', [
                'username' => $user->email,
                'user_id' => $user->id
            ]);
            return response()->json([
                'success' => false,
                'message' => 'This account does not have a communication email set. Please contact your administrator to set up a communication email for password recovery.'
            ], 400);
        }

        \Log::info('Password reset OTP requested', [
            'username' => $user->email,
            'communication_email' => $user->communication_email,
            'user_id' => $user->id
        ]);

        // Store hashed OTP in database - use the user's LOGIN email (username) as the key
        DB::table('password_resets')->insert([
            'id' => Str::uuid(),
            'email' => $user->email, // Store username for verification
            'otp_hash' => $otpHash,
            'expires_at' => Carbon::now()->addMinutes(10),
            'used' => false,
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        // Send OTP to communication email (the real email where user receives notifications)
        $this->sendOTPEmail($user->communication_email, $otp);

        \Log::info('Password reset OTP sent', [
            'to_email' => $user->communication_email
        ]);

        return response()->json([
            'success' => true,
            'message' => 'OTP has been sent to your communication email.',
        ]);
    }

    /**
     * Find accounts by communication email
     * Similar to Google's "Find my email" feature
     */
    public function findAccounts(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'communication_email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email format',
                'errors' => $validator->errors()
            ], 422);
        }

        $communicationEmail = strtolower(trim($request->communication_email));

        // Find all users with this communication email
        $users = User::where('communication_email', $communicationEmail)->get();

        if ($users->isEmpty()) {
            // Don't reveal if no accounts found (security)
            return response()->json([
                'success' => true,
                'accounts' => [],
                'message' => 'If accounts exist with this email, they will be shown.'
            ]);
        }

        // Return masked accounts list
        $accounts = $users->map(function($user) {
            return [
                'login_email' => $user->email,
                'masked_email' => $this->maskEmail($user->email),
                'name' => $user->name,
                'role' => $user->role,
            ];
        });

        return response()->json([
            'success' => true,
            'accounts' => $accounts,
        ]);
    }

    /**
     * Mask email for display (e.g., y***@example.com)
     */
    private function maskEmail($email)
    {
        $parts = explode('@', $email);
        $local = $parts[0];
        $domain = $parts[1];
        
        if (strlen($local) <= 2) {
            $masked = $local[0] . '***';
        } else {
            $masked = substr($local, 0, 2) . str_repeat('*', strlen($local) - 2);
        }
        
        return $masked . '@' . $domain;
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

        $email = strtolower(trim($request->email));
        $otp = $request->otp;

        // Get most recent unused OTP for this login email
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
            'reset_token' => $resetToken,
            'login_email' => $lookupEmail, // Return the actual login email for password reset
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
     * For single account
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
     * Send consolidated OTP email for multiple accounts
     * Similar to how Google, Microsoft handle multiple accounts with same recovery email
     */
    private function sendMultiAccountOTPEmail($recipientEmail, $accountOTPs)
    {
        $htmlContent = $this->getMultiAccountOTPEmailTemplate($accountOTPs);

        try {
            $subject = count($accountOTPs) > 1 
                ? 'Password Reset OTP for Your QSights Accounts'
                : 'Password Reset OTP - QSights';

            $this->emailService->send(
                $recipientEmail,
                $subject,
                $htmlContent,
                [
                    'event' => 'password_reset_otp',
                    'account_count' => count($accountOTPs),
                ]
            );
            
            \Log::info('Multi-account OTP email sent successfully', [
                'recipient' => $recipientEmail,
                'account_count' => count($accountOTPs),
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to send multi-account OTP email', [
                'recipient' => $recipientEmail,
                'error' => $e->getMessage()
            ]);
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

    /**
     * Get email template for multiple accounts
     * Similar to Google/Microsoft approach for multiple accounts with same recovery email
     */
    private function getMultiAccountOTPEmailTemplate($accountOTPs)
    {
        $accountCount = count($accountOTPs);
        $accountsHtml = '';

        foreach ($accountOTPs as $index => $account) {
            $accountNumber = $index + 1;
            $roleBadge = $this->getRoleBadgeColor($account['role']);
            
            $accountsHtml .= <<<HTML
            <!-- Account {$accountNumber} -->
            <div style="background-color: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div>
                        <p style="margin: 0 0 5px; color: #333333; font-size: 14px; font-weight: 600;">
                            Account {$accountNumber}: {$account['name']}
                        </p>
                        <p style="margin: 0; color: #666666; font-size: 13px;">
                            Login Email: <strong>{$account['login_email']}</strong>
                        </p>
                        <p style="margin: 5px 0 0; color: #888888; font-size: 12px;">
                            Role: <span style="background-color: {$roleBadge['bg']}; color: {$roleBadge['text']}; padding: 2px 8px; border-radius: 4px; font-size: 11px;">{$account['role']}</span>
                        </p>
                    </div>
                </div>
                <div style="background-color: #ffffff; border: 2px dashed #667eea; border-radius: 6px; padding: 15px; text-align: center;">
                    <p style="margin: 0 0 5px; color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">OTP for this account</p>
                    <p style="margin: 0; color: #667eea; font-size: 28px; font-weight: 700; letter-spacing: 6px; font-family: 'Courier New', monospace;">{$account['otp']}</p>
                </div>
            </div>
HTML;
        }

        $headerText = $accountCount > 1 
            ? "Password Reset - {$accountCount} Accounts Found"
            : "Password Reset Request";

        $introText = $accountCount > 1
            ? "You have requested to reset your password. We found <strong>{$accountCount} accounts</strong> associated with this email address. Each account has its own unique OTP:"
            : "You have requested to reset your password. Use the OTP below to complete the process:";

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
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">{$headerText}</h1>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin: 0 0 25px; color: #333333; font-size: 15px; line-height: 1.6;">
                                {$introText}
                            </p>
                            
                            <!-- Account OTPs -->
                            {$accountsHtml}
                            
                            <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin-top: 20px;">
                                <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.5;">
                                    <strong>⚠️ Important:</strong><br>
                                    • Each OTP is valid for <strong>10 minutes</strong><br>
                                    • Use the correct OTP for the account you want to reset<br>
                                    • On the verification page, enter the <strong>Login Email</strong> (not communication email)<br>
                                    • Do not share these codes with anyone
                                </p>
                            </div>
                            
                            <p style="margin: 20px 0 0; color: #999999; font-size: 12px; line-height: 1.6;">
                                If you didn't request this password reset, please ignore this email or contact support if you're concerned.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                © 2026 QSights. All rights reserved.
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

    /**
     * Get badge colors for different roles
     */
    private function getRoleBadgeColor($role)
    {
        $colors = [
            'super-admin' => ['bg' => '#dc3545', 'text' => '#ffffff'],
            'admin' => ['bg' => '#fd7e14', 'text' => '#ffffff'],
            'program-admin' => ['bg' => '#20c997', 'text' => '#ffffff'],
            'program-manager' => ['bg' => '#0dcaf0', 'text' => '#000000'],
            'program-moderator' => ['bg' => '#6f42c1', 'text' => '#ffffff'],
            'evaluation_staff' => ['bg' => '#198754', 'text' => '#ffffff'],
            'evaluation_admin' => ['bg' => '#0d6efd', 'text' => '#ffffff'],
            'participant' => ['bg' => '#6c757d', 'text' => '#ffffff'],
        ];

        return $colors[$role] ?? ['bg' => '#6c757d', 'text' => '#ffffff'];
    }
}
