<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    /**
     * Update user profile
     */
    public function update(Request $request)
    {
        try {
            $user = $request->user();
            
            // Log incoming request data
            \Log::info('Profile update request', [
                'user_id' => $user->id,
                'request_data' => $request->all()
            ]);

            // Only validate fields that are actually being updated
            $rules = [
                'name' => 'sometimes|nullable|string|max:255',
                'email' => 'sometimes|nullable|email|max:255|unique:users,email,' . $user->id,
                'communication_email' => 'sometimes|nullable|email|max:255',
                'communicationEmail' => 'sometimes|nullable|email|max:255',
                'phone' => 'sometimes|nullable|string|max:20',
                'address' => 'sometimes|nullable|string|max:255',
                'city' => 'sometimes|nullable|string|max:100',
                'state' => 'sometimes|nullable|string|max:100',
                'country' => 'sometimes|nullable|string|max:100',
                'postalCode' => 'sometimes|nullable|string|max:20',
                'postal_code' => 'sometimes|nullable|string|max:20',
                'bio' => 'sometimes|nullable|string|max:1000',
            ];
            
            $validated = $request->validate($rules);
            
            \Log::info('Validated data', ['validated' => $validated]);

            // Prepare update data - only update fields that were provided
            $updateData = [];
            
            if (isset($validated['name'])) $updateData['name'] = $validated['name'];
            if (isset($validated['email'])) $updateData['email'] = $validated['email'];
            if (isset($validated['communication_email'])) $updateData['communication_email'] = $validated['communication_email'];
            if (isset($validated['communicationEmail'])) $updateData['communication_email'] = $validated['communicationEmail'];
            if (isset($validated['phone'])) $updateData['phone'] = $validated['phone'];
            if (isset($validated['address'])) $updateData['address'] = $validated['address'];
            if (isset($validated['city'])) $updateData['city'] = $validated['city'];
            if (isset($validated['state'])) $updateData['state'] = $validated['state'];
            if (isset($validated['country'])) $updateData['country'] = $validated['country'];
            if (isset($validated['postalCode'])) $updateData['postal_code'] = $validated['postalCode'];
            if (isset($validated['postal_code'])) $updateData['postal_code'] = $validated['postal_code'];
            if (isset($validated['bio'])) $updateData['bio'] = $validated['bio'];
            
            \Log::info('Update data prepared', ['updateData' => $updateData]);
            
            if (!empty($updateData)) {
                $user->update($updateData);
                $user->refresh(); // Reload from database
                \Log::info('User updated', ['user' => $user->toArray()]);
            }

            return response()->json([
                'message' => 'Profile updated successfully',
                'user' => $user
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Profile validation failed', [
                'errors' => $e->errors(),
                'input' => $request->except(['password'])
            ]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Profile update failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Failed to update profile: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Change user password
     */
    public function changePassword(Request $request)
    {
        try {
            $user = $request->user();

            $request->validate([
                'current_password' => 'required|string',
                'new_password' => 'required|string|min:8|confirmed',
            ]);

            if (!Hash::check($request->current_password, $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['The current password is incorrect.'],
                ]);
            }

            $user->update([
                'password' => Hash::make($request->new_password),
            ]);

            return response()->json([
                'message' => 'Password changed successfully'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Password change failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to change password: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update user preferences
     */
    public function updatePreferences(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'emailNotifications' => 'nullable|boolean',
            'activityReminders' => 'nullable|boolean',
            'weeklyReports' => 'nullable|boolean',
            'language' => 'nullable|string|in:EN,HI,AR,FR',
            'timezone' => 'nullable|string',
        ]);

        $preferences = [
            'email_notifications' => $validated['emailNotifications'] ?? true,
            'activity_reminders' => $validated['activityReminders'] ?? true,
            'weekly_reports' => $validated['weeklyReports'] ?? false,
            'language' => $validated['language'] ?? 'EN',
            'timezone' => $validated['timezone'] ?? 'UTC',
        ];

        $user->update([
            'preferences' => json_encode($preferences),
        ]);

        return response()->json([
            'message' => 'Preferences updated successfully',
            'preferences' => $preferences
        ]);
    }
}
