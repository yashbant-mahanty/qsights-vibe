<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\Request;

class AppSettingsController extends Controller
{
    /**
     * Get app settings
     */
    public function get(Request $request)
    {
        try {
            $appVersion = AppSetting::where('key', 'app_version')->first();
            $copyrightText = AppSetting::where('key', 'copyright_text')->first();
            
            return response()->json([
                'status' => 'success',
                'data' => [
                    'app_version' => $appVersion ? $appVersion->value : '2.0',
                    'copyright_text' => $copyrightText ? $copyrightText->value : '© 2025 QSights. All rights reserved.',
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch app settings'
            ], 500);
        }
    }

    /**
     * Update app settings
     */
    public function update(Request $request)
    {
        try {
            $validated = $request->validate([
                'app_version' => 'sometimes|string|max:255',
                'copyright_text' => 'sometimes|string|max:255',
            ]);

            // Update or create settings
            $data = [];
            
            if (isset($validated['app_version'])) {
                AppSetting::updateOrCreate(
                    ['key' => 'app_version'],
                    ['value' => $validated['app_version']]
                );
                $data['app_version'] = $validated['app_version'];
            }
            
            if (isset($validated['copyright_text'])) {
                AppSetting::updateOrCreate(
                    ['key' => 'copyright_text'],
                    ['value' => $validated['copyright_text']]
                );
                $data['copyright_text'] = $validated['copyright_text'];
            }

            return response()->json([
                'status' => 'success',
                'message' => 'App settings updated successfully',
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update app settings: ' . $e->getMessage()
            ], 500);
        }
    }
}
