<?php
/**
 * This file contains the updated saveLandingConfig method
 * that accepts all frontend fields without strict validation
 * 
 * Replace the saveLandingConfig method in ActivityController.php with this
 */

/*
    public function saveLandingConfig(Request $request, $id)
    {
        $activity = Activity::findOrFail($id);
        
        // Accept all config fields without strict validation
        // This allows frontend to send any configuration fields
        $configData = $request->all();
        
        // Remove any non-config fields if they exist
        unset($configData['_token']);
        unset($configData['_method']);
        
        $activity->landing_config = $configData;
        $activity->save();
        
        return response()->json([
            'message' => 'Landing page configuration saved successfully',
            'config' => $activity->landing_config
        ]);
    }
*/
