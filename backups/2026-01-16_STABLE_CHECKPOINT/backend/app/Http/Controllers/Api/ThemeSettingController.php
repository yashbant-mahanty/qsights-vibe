<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ThemeSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ThemeSettingController extends Controller
{
    /**
     * Get all theme settings
     */
    public function index()
    {
        $settings = ThemeSetting::all()->groupBy('category');
        
        // Transform to key-value pairs
        $result = [];
        foreach ($settings as $category => $items) {
            $result[$category] = [];
            foreach ($items as $item) {
                $result[$category][$item->key] = [
                    'value' => $item->type === 'json' ? json_decode($item->value, true) : $item->value,
                    'type' => $item->type,
                ];
            }
        }
        
        return response()->json($result);
    }

    /**
     * Get a specific theme setting by key
     */
    public function show($key)
    {
        $setting = ThemeSetting::where('key', $key)->first();
        
        if (!$setting) {
            return response()->json(['error' => 'Setting not found'], 404);
        }
        
        return response()->json([
            'key' => $setting->key,
            'value' => $setting->type === 'json' ? json_decode($setting->value, true) : $setting->value,
            'type' => $setting->type,
            'category' => $setting->category,
        ]);
    }

    /**
     * Update or create theme setting
     */
    public function update(Request $request, $key)
    {
        $request->validate([
            'value' => 'nullable',
            'type' => 'sometimes|in:text,image,color,json',
            'category' => 'sometimes|string',
        ]);

        $value = $request->value;
        
        // If type is json, encode it
        if ($request->type === 'json' || is_array($value)) {
            $value = json_encode($value);
        }

        $setting = ThemeSetting::updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'type' => $request->type ?? 'text',
                'category' => $request->category ?? 'general',
            ]
        );

        return response()->json([
            'message' => 'Theme setting updated successfully',
            'setting' => [
                'key' => $setting->key,
                'value' => $setting->type === 'json' ? json_decode($setting->value, true) : $setting->value,
                'type' => $setting->type,
                'category' => $setting->category,
            ],
        ]);
    }

    /**
     * Upload image for theme (logo, favicon, banners, etc.)
     */
    public function uploadImage(Request $request)
    {
        $request->validate([
            'file' => 'required|image|mimes:jpeg,png,jpg,gif,svg,ico|max:2048',
            'key' => 'required|string',
            'category' => 'sometimes|string',
        ]);

        $file = $request->file('file');
        $key = $request->key;
        
        // Generate filename
        $filename = Str::slug($key) . '_' . time() . '.' . $file->getClientOriginalExtension();
        
        // Store in public/theme directory
        $path = $file->storeAs('theme', $filename, 'public');
        
        // Get URL
        $url = Storage::url($path);

        // Save to theme settings
        $setting = ThemeSetting::updateOrCreate(
            ['key' => $key],
            [
                'value' => $url,
                'type' => 'image',
                'category' => $request->category ?? 'branding',
            ]
        );

        return response()->json([
            'message' => 'Image uploaded successfully',
            'url' => $url,
            'setting' => [
                'key' => $setting->key,
                'value' => $setting->value,
                'type' => $setting->type,
                'category' => $setting->category,
            ],
        ]);
    }

    /**
     * Delete theme setting
     */
    public function destroy($key)
    {
        $setting = ThemeSetting::where('key', $key)->first();
        
        if (!$setting) {
            return response()->json(['error' => 'Setting not found'], 404);
        }

        // If it's an image, delete from storage
        if ($setting->type === 'image' && $setting->value) {
            $path = str_replace('/storage/', '', $setting->value);
            Storage::disk('public')->delete($path);
        }

        $setting->delete();

        return response()->json(['message' => 'Theme setting deleted successfully']);
    }

    /**
     * Bulk update theme settings
     */
    public function bulkUpdate(Request $request)
    {
        $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'nullable',
            'settings.*.type' => 'sometimes|in:text,image,color,json',
            'settings.*.category' => 'sometimes|string',
        ]);

        $updated = [];
        
        foreach ($request->settings as $settingData) {
            $value = $settingData['value'];
            
            // If type is json or value is array, encode it
            if (($settingData['type'] ?? null) === 'json' || is_array($value)) {
                $value = json_encode($value);
            }

            $setting = ThemeSetting::updateOrCreate(
                ['key' => $settingData['key']],
                [
                    'value' => $value,
                    'type' => $settingData['type'] ?? 'text',
                    'category' => $settingData['category'] ?? 'general',
                ]
            );

            $updated[] = [
                'key' => $setting->key,
                'value' => $setting->type === 'json' ? json_decode($setting->value, true) : $setting->value,
                'type' => $setting->type,
                'category' => $setting->category,
            ];
        }

        return response()->json([
            'message' => 'Theme settings updated successfully',
            'settings' => $updated,
        ]);
    }
}
