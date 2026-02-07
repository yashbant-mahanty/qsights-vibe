<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Exception;

class EvaluationBulkImportController extends Controller
{
    /**
     * Bulk import departments, roles, and staff from CSV file
     * Expected CSV format:
     * Department,Role,Staff,Email
     * ITES,AGM,"Yash, Ram, Richa","yash@example.com, ram@example.com, richa@example.com"
     * ITES,AVP,"Lokesh, Rachita","lokesh@example.com, rachita@example.com"
     */
    public function import(Request $request)
    {
        try {
            $user = $request->user();
            
            // Validate that user has permission (evaluation-admin or super-admin)
            if (!in_array($user->role, ['evaluation-admin', 'super-admin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Only Evaluation Admin and Super Admin can perform bulk imports.'
                ], 403);
            }
            
            // Validate file upload
            $request->validate([
                'file' => 'required|file|mimes:csv,txt|max:5120' // Max 5MB
            ]);
            
            $file = $request->file('file');
            
            // Parse CSV file
            $csvData = $this->parseCSV($file->getPathname());
            
            if (empty($csvData)) {
                return response()->json([
                    'success' => false,
                    'message' => 'CSV file is empty or invalid format'
                ], 400);
            }
            
            // Determine program_id based on user role
            if ($user->role === 'super-admin') {
                $programId = $request->input('program_id') ?? $user->program_id;
            } else {
                $programId = $user->program_id;
                
                if (!$programId) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You must be assigned to a program to perform bulk import'
                    ], 403);
                }
            }
            
            // Start transaction for atomicity
            DB::beginTransaction();
            
            $stats = [
                'departments' => 0,
                'roles' => 0,
                'staff' => 0
            ];
            $errors = [];
            
            // Process each row
            $currentDepartment = null;
            $currentDepartmentId = null;
            $lineNumber = 1;
            
            foreach ($csvData as $row) {
                $lineNumber++;
                
                try {
                    // Skip empty rows
                    if (empty($row['Department']) && empty($row['Role']) && empty($row['Staff'])) {
                        continue;
                    }
                    
                    // If Department column has value, it's a new department
                    if (!empty($row['Department']) && $row['Department'] !== $currentDepartment) {
                        $currentDepartment = trim($row['Department']);
                        
                        // Create or get department
                        $departmentId = DB::table('evaluation_departments')
                            ->where('name', $currentDepartment)
                            ->where(function($q) use ($programId) {
                                if ($programId) {
                                    $q->where('program_id', $programId);
                                } else {
                                    $q->whereNull('program_id');
                                }
                            })
                            ->whereNull('deleted_at')
                            ->value('id');
                        
                        if (!$departmentId) {
                            // Create new department
                            $departmentId = DB::table('evaluation_departments')->insertGetId([
                                'id' => (string) Str::uuid(),
                                'name' => $currentDepartment,
                                'code' => strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $currentDepartment), 0, 10)),
                                'program_id' => $programId,
                                'is_active' => true,
                                'created_at' => now(),
                                'updated_at' => now()
                            ]);
                            $stats['departments']++;
                        }
                        
                        $currentDepartmentId = $departmentId;
                    }
                    
                    // Process Role
                    if (empty($row['Role'])) {
                        $errors[] = "Line $lineNumber: Role is required";
                        continue;
                    }
                    
                    if (!$currentDepartmentId) {
                        $errors[] = "Line $lineNumber: Department must be specified before roles";
                        continue;
                    }
                    
                    $roleName = trim($row['Role']);
                    
                    // Check if role already exists
                    $roleId = DB::table('evaluation_roles')
                        ->where('name', $roleName)
                        ->where('category', $currentDepartment)
                        ->where(function($q) use ($programId) {
                            if ($programId) {
                                $q->where('program_id', $programId);
                            } else {
                                $q->whereNull('program_id');
                            }
                        })
                        ->whereNull('deleted_at')
                        ->value('id');
                    
                    if (!$roleId) {
                        // Create new role
                        $roleId = DB::table('evaluation_roles')->insertGetId([
                            'id' => (string) Str::uuid(),
                            'name' => $roleName,
                            'category' => $currentDepartment,
                            'department_id' => $currentDepartmentId,
                            'program_id' => $programId,
                            'is_active' => true,
                            'created_at' => now(),
                            'updated_at' => now()
                        ]);
                        $stats['roles']++;
                    }
                    
                    // Process Staff (comma-separated)
                    if (!empty($row['Staff'])) {
                        $staffNames = array_map('trim', explode(',', $row['Staff']));
                        $staffEmails = [];
                        
                        // Process emails if provided
                        if (!empty($row['Email'])) {
                            $staffEmails = array_map('trim', explode(',', $row['Email']));
                        }
                        
                        foreach ($staffNames as $index => $staffName) {
                            if (empty($staffName)) {
                                continue;
                            }
                            
                            // Get corresponding email or generate placeholder
                            $staffEmail = isset($staffEmails[$index]) && !empty($staffEmails[$index])
                                ? $staffEmails[$index]
                                : strtolower(str_replace(' ', '.', $staffName)) . '@example.com';
                            
                            // Check if staff already exists
                            $staffExists = DB::table('evaluation_staff')
                                ->where('name', $staffName)
                                ->where('role_id', $roleId)
                                ->where(function($q) use ($programId) {
                                    if ($programId) {
                                        $q->where('program_id', $programId);
                                    } else {
                                        $q->whereNull('program_id');
                                    }
                                })
                                ->whereNull('deleted_at')
                                ->exists();
                            
                            if (!$staffExists) {
                                // Create new staff
                                DB::table('evaluation_staff')->insert([
                                    'id' => (string) Str::uuid(),
                                    'name' => $staffName,
                                    'email' => $staffEmail,
                                    'role_id' => $roleId,
                                    'role_name' => $roleName,
                                    'department' => $currentDepartment,
                                    'program_id' => $programId,
                                    'is_active' => true,
                                    'created_at' => now(),
                                    'updated_at' => now()
                                ]);
                                $stats['staff']++;
                            }
                        }
                    }
                    
                } catch (Exception $e) {
                    $errors[] = "Line $lineNumber: " . $e->getMessage();
                }
            }
            
            // Commit transaction
            DB::commit();
            
            $message = "Successfully imported {$stats['departments']} departments, {$stats['roles']} roles, and {$stats['staff']} staff members.";
            
            if (!empty($errors)) {
                $message .= " Some rows had errors.";
            }
            
            return response()->json([
                'success' => true,
                'message' => $message,
                'created' => $stats,
                'errors' => $errors
            ]);
            
        } catch (Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Bulk import failed: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Parse CSV file and return array of rows
     */
    private function parseCSV($filePath)
    {
        $rows = [];
        $headers = [];
        
        if (($handle = fopen($filePath, 'r')) !== false) {
            $lineNumber = 0;
            
            while (($data = fgetcsv($handle, 1000, ',')) !== false) {
                $lineNumber++;
                
                // First line is headers
                if ($lineNumber === 1) {
                    $headers = array_map('trim', $data);
                    
                    // Validate required columns
                    $requiredColumns = ['Department', 'Role', 'Staff'];
                    foreach ($requiredColumns as $col) {
                        if (!in_array($col, $headers)) {
                            throw new Exception("Missing required column: $col");
                        }
                    }
                    
                    // Email column is optional but recommended
                    if (!in_array('Email', $headers)) {
                        // Add warning in logs but continue processing
                        \Log::warning('CSV upload: Email column not found. Placeholder emails will be generated.');
                    }
                    
                    continue;
                }
                
                // Create associative array for each row
                $row = [];
                foreach ($headers as $index => $header) {
                    $row[$header] = isset($data[$index]) ? $data[$index] : '';
                }
                
                $rows[] = $row;
            }
            
            fclose($handle);
        }
        
        return $rows;
    }
    
    /**
     * Download sample CSV template
     */
    public function downloadSample()
    {
        $csv = "Department,Role,Staff,Email\n";
        $csv .= "ITES,AGM,\"Yash, Ram, Richa\",\"yash@example.com, ram@example.com, richa@example.com\"\n";
        $csv .= "ITES,AVP,\"Lokesh, Rachita\",\"lokesh@example.com, rachita@example.com\"\n";
        $csv .= "ITES,Leads,\"Arun, Ashwin\",\"arun@example.com, ashwin@example.com\"\n";
        $csv .= "Sales,Manager,\"John, Sarah\",\"john@example.com, sarah@example.com\"\n";
        $csv .= "Sales,Executive,\"Mike, Lisa, Tom\",\"mike@example.com, lisa@example.com, tom@example.com\"\n";
        $csv .= "HR,Head,\"Emma\",\"emma@example.com\"\n";
        $csv .= "HR,Recruiter,\"David, Anna\",\"david@example.com, anna@example.com\"\n";
        
        return response($csv, 200)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="bulk_import_sample.csv"');
    }
}
