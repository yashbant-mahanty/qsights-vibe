<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RoleServiceController extends Controller
{
    /**
     * Get available services for a specific role from role_service_definitions table
     */
    public function getAvailableServices(Request $request, string $roleName)
    {
        try {
            // Query the role_service_definitions table
            $definition = DB::table('role_service_definitions')
                ->where('role_name', $roleName)
                ->first();

            if (!$definition) {
                // Role not found in definitions - allow all services (backward compatibility)
                return response()->json([
                    'success' => false,
                    'message' => 'Role definition not found',
                    'available_services' => [],
                    'is_system_role' => false,
                    'allow_custom_services' => true
                ]);
            }

            // Parse available_services (it's stored as JSON string in DB)
            $availableServices = [];
            if (!empty($definition->available_services)) {
                if (is_string($definition->available_services)) {
                    $availableServices = json_decode($definition->available_services, true) ?? [];
                } else {
                    $availableServices = $definition->available_services;
                }
            }

            return response()->json([
                'success' => true,
                'role_name' => $definition->role_name,
                'description' => $definition->description,
                'available_services' => $availableServices,
                'is_system_role' => (bool) $definition->is_system_role,
                'allow_custom_services' => (bool) $definition->allow_custom_services
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching role services: ' . $e->getMessage(),
                'available_services' => [],
                'is_system_role' => false,
                'allow_custom_services' => true
            ], 500);
        }
    }
}
