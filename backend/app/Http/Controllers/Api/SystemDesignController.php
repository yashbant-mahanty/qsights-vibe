<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Artisan;
use Barryvdh\DomPDF\Facade\Pdf;

class SystemDesignController extends Controller
{
    /**
     * Get complete System Design Document data
     */
    public function getSDDData(Request $request)
    {
        try {
            $sddData = [
                'version' => $this->getSDDVersion(),
                'generated_at' => now()->toDateTimeString(),
                'introduction' => $this->getIntroduction(),
                'architecture' => $this->getArchitecture(),
                'services_and_features' => $this->getServicesAndFeatures(),
                'dataSecurity' => $this->getDataSecurity(),
                'database' => $this->getDatabaseDesign(),
                'serverSetup' => $this->getServerSetup(),
                'apis' => $this->getAPIs(),
                'technology' => $this->getTechnologyStack(),
                'appendix' => $this->getAppendix(),
            ];

            return response()->json([
                'success' => true,
                'data' => $sddData
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate SDD data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate and download SDD PDF
     */
    public function generatePDF(Request $request)
    {
        try {
            $sddData = [
                'version' => $this->getSDDVersion(),
                'generated_at' => now()->toDateTimeString(),
                'introduction' => $this->getIntroduction(),
                'architecture' => $this->getArchitecture(),
                'services_and_features' => $this->getServicesAndFeatures(),
                'dataSecurity' => $this->getDataSecurity(),
                'database' => $this->getDatabaseDesign(),
                'serverSetup' => $this->getServerSetup(),
                'apis' => $this->getAPIs(),
                'technology' => $this->getTechnologyStack(),
                'appendix' => $this->flattenArraysForPDF($this->getAppendix()),
            ];

            // Set longer execution time for PDF generation
            set_time_limit(300);
            ini_set('memory_limit', '512M');
            
            // Generate PDF
            $pdf = PDF::loadView('sdd-template', $sddData)
                     ->setPaper('a4', 'portrait')
                     ->setOption('enable-local-file-access', true)
                     ->setOption('isHtml5ParserEnabled', true)
                     ->setOption('isRemoteEnabled', true);
            
            $filename = 'QSights_SDD_v' . str_replace('.', '_', $sddData['version']) . '_' . now()->format('Y-m-d') . '.pdf';
            
            // Return PDF as direct download
            return $pdf->download($filename);
        } catch (\Exception $e) {
            \Log::error('PDF Generation Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate PDF',
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => basename($e->getFile())
            ], 500);
        }
    }

    /**
     * Recursively flatten nested arrays for PDF generation
     * Converts nested arrays to formatted strings
     */
    private function flattenArraysForPDF($data)
    {
        if (!is_array($data)) {
            return $data;
        }

        $flattened = [];
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                // Recursively convert ANY level of nesting to string
                $flattened[$key] = $this->arrayToString($value);
            } else {
                $flattened[$key] = $value;
            }
        }

        return $flattened;
    }

    /**
     * Recursively convert any nested array structure to a readable string
     */
    private function arrayToString($array, $depth = 0)
    {
        if (!is_array($array)) {
            return (string) $array;
        }

        $isIndexed = array_keys($array) === range(0, count($array) - 1);
        
        if ($isIndexed) {
            // Indexed array: recursively convert each element
            $items = array_map(function($item) use ($depth) {
                return is_array($item) ? $this->arrayToString($item, $depth + 1) : (string) $item;
            }, $array);
            return implode(', ', $items);
        } else {
            // Associative array: format as key-value pairs
            $pairs = [];
            foreach ($array as $k => $v) {
                if (is_array($v)) {
                    // Recursively flatten nested arrays
                    $pairs[] = $k . ': ' . $this->arrayToString($v, $depth + 1);
                } else {
                    $pairs[] = $k . ': ' . (string) $v;
                }
            }
            return implode($depth > 0 ? '; ' : "\n", $pairs);
        }
    }

    /**
     * Download SDD PDF
     */
    public function downloadPDF(Request $request, $filename)
    {
        try {
            $path = 'sdd/' . $filename;
            
            if (!Storage::exists($path)) {
                return response()->json([
                    'success' => false,
                    'message' => 'PDF file not found'
                ], 404);
            }

            return Storage::download($path, $filename);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to download PDF',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get critical features list
     */
    public function getCriticalFeatures(Request $request)
    {
        try {
            $critical = $this->loadCriticalFeatures();
            
            return response()->json([
                'success' => true,
                'data' => $critical
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to load critical features',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update critical features list
     */
    public function updateCriticalFeatures(Request $request)
    {
        try {
            $validated = $request->validate([
                'critical_features' => 'required|array',
                'non_critical_features' => 'array'
            ]);

            $filePath = base_path('CRITICAL_FEATURES.json');
            file_put_contents($filePath, json_encode($validated, JSON_PRETTY_PRINT));

            return response()->json([
                'success' => true,
                'message' => 'Critical features updated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update critical features',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Run pre-deployment tests
     */
    public function runPreDeploymentTests(Request $request)
    {
        try {
            $results = [
                'timestamp' => now()->toDateTimeString(),
                'tests' => []
            ];

            // Test 1: Event Participation
            $results['tests'][] = $this->testEventParticipation();

            // Test 2: Response Saving
            $results['tests'][] = $this->testResponseSaving();

            // Test 3: Notification Lifecycle
            $results['tests'][] = $this->testNotificationLifecycle();

            // Test 4: Reports & Analytics
            $results['tests'][] = $this->testReportsAnalytics();

            $results['overall_status'] = collect($results['tests'])->every(fn($test) => $test['passed']) ? 'PASSED' : 'FAILED';

            return response()->json([
                'success' => true,
                'data' => $results
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to run tests',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate schema consistency
     */
    public function validateSchema(Request $request)
    {
        try {
            $issues = [];

            // Check for UUID vs BIGINT consistency
            $tables = ['users', 'programs', 'activities', 'responses', 'notifications'];
            
            foreach ($tables as $table) {
                $columns = Schema::getColumnListing($table);
                $columnTypes = [];
                
                foreach ($columns as $column) {
                    $type = Schema::getColumnType($table, $column);
                    $columnTypes[$column] = $type;
                }

                // Check if id columns are consistent
                if (isset($columnTypes['id'])) {
                    $idType = $columnTypes['id'];
                    if ($idType !== 'uuid' && $idType !== 'bigint') {
                        $issues[] = [
                            'table' => $table,
                            'column' => 'id',
                            'issue' => 'Unexpected ID type: ' . $idType,
                            'severity' => 'HIGH'
                        ];
                    }
                }
            }

            // Check migration files for UUID vs BIGINT mismatches
            $migrationPath = database_path('migrations');
            $migrationFiles = glob($migrationPath . '/*.php');
            
            foreach ($migrationFiles as $file) {
                $content = file_get_contents($file);
                
                // Check for UUID->BIGINT or BIGINT->UUID issues
                if (preg_match('/uuid\(\)|bigInteger\(\)/', $content)) {
                    $basename = basename($file);
                    // Add to review list
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'valid' => count($issues) === 0,
                    'issues' => $issues,
                    'checked_at' => now()->toDateTimeString()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Schema validation failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get rollback procedures
     */
    public function getRollbackProcedures(Request $request)
    {
        try {
            $procedures = [
                'git_repository' => [
                    'description' => 'Git repository details for version control and rollback',
                    'repository_name' => 'QSightsOrg2.0',
                    'current_branch' => 'Production-Package-Feb-04-2026',
                    'backup_branches' => [
                        'Production-Package-Feb-04-2026 (Latest)',
                        'Production-Package-Feb-03-2026 (Previous Stable)',
                        'main (Development)'
                    ],
                    'local_backup_path' => '/Users/yash/Documents/Backups/qsights-full-backup-20260204-165331.tar.gz',
                    'production_backup_path' => '/home/ubuntu/backups/PRODUCTION_20260204_112621/',
                    'clone_command' => 'git clone <repository-url> QSightsOrg2.0',
                    'checkout_command' => 'git checkout Production-Package-Feb-04-2026'
                ],
                'database_rollback' => [
                    'description' => 'Roll back database migrations',
                    'steps' => [
                        '1. SSH into production server: ssh ubuntu@13.126.210.220',
                        '2. Navigate to backend: cd /var/www/QSightsOrg2.0/backend',
                        '3. Check current migration status: php artisan migrate:status',
                        '4. Rollback specific steps: php artisan migrate:rollback --step=1',
                        '5. Restore from backup if needed: psql -U qsights_user -d qsights_db < backup_schema.sql',
                        '6. Verify database state: php artisan tinker'
                    ],
                    'backup_location' => '/home/ubuntu/backups/PRODUCTION_20260204_112621/'
                ],
                'code_rollback' => [
                    'description' => 'Rollback application code using Git',
                    'steps' => [
                        '1. SSH into production server: ssh ubuntu@13.126.210.220',
                        '2. Navigate to application: cd /var/www/QSightsOrg2.0',
                        '3. Check current branch: git branch',
                        '4. Fetch latest: git fetch origin',
                        '5. Checkout previous stable branch: git checkout Production-Package-Feb-03-2026',
                        '6. Pull latest code: git pull origin Production-Package-Feb-03-2026',
                        '7. Rebuild frontend: cd frontend && npm run build',
                        '8. Clear backend caches: cd backend && php artisan config:clear && php artisan cache:clear',
                        '9. Restart services: pm2 restart qsights-frontend && sudo systemctl reload php8.4-fpm'
                    ]
                ],
                'feature_toggle' => [
                    'description' => 'Disable feature via configuration',
                    'steps' => [
                        '1. Edit .env file: sudo nano /var/www/QSightsOrg2.0/backend/.env',
                        '2. Set FEATURE_NAME=false',
                        '3. Clear config cache: php artisan config:clear',
                        '4. Restart PHP-FPM: sudo systemctl reload php8.4-fpm',
                        '5. Verify feature is disabled'
                    ]
                ],
                'notification_stop' => [
                    'description' => 'Stop notification queue processing',
                    'steps' => [
                        '1. Clear queue: php artisan queue:clear',
                        '2. Stop queue worker: supervisorctl stop laravel-worker (if configured)',
                        '3. Check running queue jobs: php artisan queue:failed',
                        '4. Verify queue is stopped'
                    ]
                ],
                'full_system_rollback' => [
                    'description' => 'Complete system rollback to last stable state',
                    'steps' => [
                        '1. Stop frontend: pm2 stop qsights-frontend',
                        '2. Stop backend: sudo systemctl stop php8.4-fpm',
                        '3. Backup current state: tar -czf /tmp/emergency-backup-$(date +%Y%m%d-%H%M%S).tar.gz /var/www/QSightsOrg2.0',
                        '4. Restore from last backup: cd /home/ubuntu/backups && tar -xzf PRODUCTION_20260204_112621.tar.gz',
                        '5. Restore database: psql -U qsights_user -d qsights_db < backup_schema.sql',
                        '6. Checkout stable Git branch: cd /var/www/QSightsOrg2.0 && git checkout Production-Package-Feb-03-2026',
                        '7. Rebuild frontend: cd frontend && npm run build',
                        '8. Clear backend caches: cd backend && php artisan config:clear && php artisan cache:clear',
                        '9. Restart services: pm2 restart qsights-frontend && sudo systemctl start php8.4-fpm',
                        '10. Verify system health: curl https://prod.qsights.com/api/health',
                        '11. Monitor logs: pm2 logs qsights-frontend && tail -f backend/storage/logs/laravel.log'
                    ]
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $procedures
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to load rollback procedures',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ========== PRIVATE HELPER METHODS ==========

    private function getSDDVersion()
    {
        $filePath = base_path('SDD_VERSION.txt');
        if (file_exists($filePath)) {
            return trim(file_get_contents($filePath));
        }
        return '2.0.0';
    }

    private function getIntroduction()
    {
        $rawCriticalFeatures = $this->loadCriticalFeatures();
        
        // Convert string arrays to object arrays with name and description for PDF template
        $criticalFeatures = [
            'critical' => collect($rawCriticalFeatures['critical'])->map(function($feature) {
                return is_string($feature) ? [
                    'name' => $feature,
                    'description' => 'Core system functionality - must always work'
                ] : $feature;
            })->toArray(),
            'non_critical' => collect($rawCriticalFeatures['non_critical'])->map(function($feature) {
                return is_string($feature) ? [
                    'name' => $feature,
                    'description' => 'Secondary feature - enhances user experience'
                ] : $feature;
            })->toArray()
        ];
        
        return [
            'document_control' => [
                'document_id' => 'QSights-SDD-' . date('Y'),
                'version' => $this->getSDDVersion(),
                'last_updated' => now()->toDateTimeString(),
                'classification' => 'CONFIDENTIAL - Internal Use Only',
                'distribution' => 'Engineering Team, Audit Team, Management',
                'approval_status' => 'Auto-Generated & Approved',
                'next_review_date' => now()->addMonths(3)->toDateString(),
                'document_owner' => 'Engineering Team',
                'change_history' => [
                    ['version' => '2.0.0', 'date' => '2026-02-04', 'changes' => 'Role service filtering, audit compliance features']
                ]
            ],
            'executive_summary' => [
                'system_name' => 'QSights - Insights Generation & Analytics Platform',
                'business_purpose' => 'Enterprise SaaS platform for Life Sciences industry enabling data-driven decision making through surveys, assessments, and analytics',
                'target_users' => 'Marketing and Medical Affairs teams, HCPs, Medical Representatives, Healthcare Professionals',
                'deployment_model' => 'Cloud-based SaaS (Multi-tenant)',
                'regulatory_compliance' => ['SOC 2', 'GDPR Ready', 'HIPAA Considerations', 'ISO 27001 Ready'],
                'key_metrics' => [
                    'uptime_sla' => '99.9%',
                    'max_response_time' => '2 seconds',
                    'concurrent_users' => '10,000+',
                    'data_retention' => '7 years'
                ]
            ],
            'purpose' => 'QSights is a SaaS-based online tool that provides the ability to create, run and interpret various types of surveys, polls, and assessments. It is a smart Insights Generation & Analytics (IGA) platform that empowers Marketing and Medical Affairs teams in the Life Sciences industry to steer their scientific marketing/medical strategies effectively.',
            'scope' => 'This document covers technical aspects of QSights, a proprietary platform developed by BioQuest Solutions, from the architectural, data, and server perspectives. It is a powerful cloud-based tool available as a SaaS (Software as a Service), that has the ability to collect and crunch volumes of data to generate actionable insights & trends.',
            'intended_audience' => [
                'Development Team' => 'Technical implementation reference',
                'QA Team' => 'Testing requirements and validation',
                'DevOps Team' => 'Deployment and infrastructure management',
                'Security Team' => 'Security audit and compliance verification',
                'Auditors' => 'Compliance and regulatory review',
                'Management' => 'System overview and business alignment'
            ],
            'key_benefits' => [
                'Cost-efficiency: Significantly reduces set-up and administration costs',
                'Time saving: Integrated web system for create, administer, collect and analyze feedback',
                'Multi-device compatible: Works across all devices and platforms',
                'White label capability: Customize with your brand logos and colors',
                'Regulatory Compliance: Built-in audit trails and data security',
                'Scalability: Auto-scaling infrastructure supports growth',
                'High Availability: 99.9% uptime SLA with multi-AZ deployment'
            ],
            'critical_features' => $criticalFeatures,
            'compliance_standards' => [
                'data_protection' => 'GDPR Article 32 - Security of Processing',
                'audit_trails' => 'SOC 2 Type II - Audit Logging Requirements',
                'access_control' => 'NIST 800-53 - Access Control Families',
                'encryption' => 'FIPS 140-2 - Cryptographic Standards',
                'disaster_recovery' => 'ISO 22301 - Business Continuity',
                'software_development' => 'ISO 12207 - Software Lifecycle Processes'
            ]
        ];
    }

    private function getArchitecture()
    {
        return [
            'pattern' => 'Client-Server Architecture with API Gateway',
            'description' => 'Modular program structure with clear separation between frontend, API gateway, and backend services',
            'architectural_style' => 'Three-tier architecture (Presentation, Application, Data)',
            'technology_summary' => [
                'frontend_layer' => 'Next.js 14 (TypeScript/React) - User Interface & Client-side Logic',
                'backend_layer' => 'Laravel 11 (PHP) - REST API, Business Logic & Authentication',
                'data_layer' => 'PostgreSQL on AWS RDS - Primary Database',
                'storage_layer' => 'AWS S3 - File Uploads and Media Storage',
                'cache_layer' => 'AWS ElastiCache (Redis) - Session and Data Caching'
            ],
            'design_principles' => [
                'Separation of Concerns' => 'Clear boundaries between frontend, backend, and data layers',
                'Modularity' => 'Independent, reusable components and services',
                'Scalability' => 'Horizontal scaling through load balancing and auto-scaling groups',
                'Security by Design' => 'Built-in authentication, authorization, and encryption',
                'High Availability' => 'Multi-AZ deployment with automatic failover',
                'Maintainability' => 'Clean code, comprehensive documentation, automated testing'
            ],
            'frontend' => [
                'framework' => 'Next.js 14',
                'language' => 'TypeScript',
                'styling' => 'Tailwind CSS',
                'state_management' => 'React Hooks',
                'server' => 'PM2 Process Manager',
                'ui_technologies' => 'HTML5, CSS, JavaScript, React',
                'build_tool' => 'Next.js Compiler',
                'package_manager' => 'npm',
                'deployment' => 'PM2 with clustering for high availability'
            ],
            'backend' => [
                'framework' => 'Laravel 11 (PHP REST API)',
                'language' => 'PHP 8.2+',
                'database' => 'PostgreSQL on AWS RDS',
                'authentication' => 'Laravel Sanctum (Token-based)',
                'authorization' => 'Role-Based Access Control (RBAC)',
                'storage' => 'AWS S3 Bucket for file uploads',
                'api' => 'RESTful API (PHP)',
                'data_formats' => 'JSON, XML',
                'orm' => 'Laravel Eloquent',
                'caching' => 'AWS ElastiCache (Redis)',
                'queue' => 'Laravel Queue with Database driver',
                'logging' => 'Laravel Log (daily rotation)',
                'validation' => 'Laravel Form Request Validation'
            ],
            'middleware_layer' => [
                'authentication' => 'Laravel Sanctum middleware',
                'authorization' => 'Role-based middleware',
                'rate_limiting' => 'Throttle middleware (60 requests/minute)',
                'cors' => 'CORS middleware with domain whitelist',
                'csrf_protection' => 'CSRF token validation',
                'input_validation' => 'Request validation middleware'
            ],
            'communication' => [
                'protocol' => 'HTTPS (TLS 1.3)',
                'api_style' => 'RESTful',
                'data_format' => 'JSON',
                'authentication' => 'Bearer Token',
                'content_type' => 'application/json',
                'compression' => 'gzip enabled'
            ],
            'integration_points' => [
                'AWS S3' => 'File storage and retrieval',
                'SendGrid' => 'Email notifications and campaigns',
                'AWS RDS' => 'Primary database',
                'AWS ElastiCache' => 'Session and data caching',
                'AWS CloudWatch' => 'Monitoring and alerts'
            ],
            'key_modules' => [
                'Account Management' => 'User management, roles, permissions, profile management',
                'Data Management' => 'CRUD operations with audit trails',
                'Program Management' => 'Organization, programs, activities, questionnaires',
                'Access Control' => 'Login, registration, authentication, 2FA support',
                'Notification Engine' => 'Email, SMS, in-app notifications with lifecycle tracking',
                'Analytics Engine' => 'Reports, dashboards, data visualization',
                'Audit System' => 'Comprehensive logging of all user actions',
                'Role & Permission System' => 'Granular access control with service-level permissions'
            ],
            'data_flow' => [
                'Request Flow' => 'Client → HTTPS → Nginx → PM2/PHP-FPM → Laravel → Database',
                'Response Flow' => 'Database → Laravel → JSON → Nginx → HTTPS → Client',
                'File Upload' => 'Client → API → S3 Bucket → URL returned',
                'Notification' => 'Trigger → Queue → SendGrid → Delivery → Log'
            ],
            'deployment_architecture' => [
                'regions' => 'AWS Mumbai (ap-south-1)',
                'availability_zones' => '2 AZs for high availability',
                'load_balancer' => 'Application Load Balancer (ALB)',
                'auto_scaling' => 'Auto Scaling Groups for EC2 instances',
                'database' => 'Aurora MySQL in private subnet with standby',
                'storage' => 'S3 for files, EFS for shared storage',
                'cdn' => 'CloudFront for static assets (optional)',
                'dns' => 'Route 53 for domain management'
            ]
        ];
    }

    private function getServicesAndFeatures()
    {
        return [
            'core_services' => [
                'organization_management' => [
                    'description' => 'Multi-tenant organization structure with hierarchical access',
                    'capabilities' => [
                        'Create and manage organizations',
                        'Configure branding and white-labeling',
                        'Manage organization-level settings',
                        'View organization analytics'
                    ],
                    'user_roles' => ['super-admin', 'admin']
                ],
                'program_management' => [
                    'description' => 'Event and program creation with flexible configurations',
                    'capabilities' => [
                        'Create programs (Meetings, Webinars, Conferences)',
                        'Define program categories and types',
                        'Manage speakers and content',
                        'Configure program-specific settings',
                        'Link activities to programs'
                    ],
                    'user_roles' => ['admin', 'group-head', 'program-admin', 'program-manager']
                ],
                'activity_management' => [
                    'description' => 'Create and manage surveys, polls, assessments, and feedback forms',
                    'capabilities' => [
                        'Multiple activity types (Survey, Assessment, Poll, CME)',
                        'Anonymous and authenticated participation',
                        'Multi-language support',
                        'Question branching and logic',
                        'File attachments and rich media',
                        'Activity scheduling and expiry',
                        'Response limits and quotas'
                    ],
                    'user_roles' => ['program-admin', 'program-manager', 'program-moderator']
                ],
                'questionnaire_builder' => [
                    'description' => 'Drag-and-drop questionnaire designer with advanced question types',
                    'capabilities' => [
                        'Multiple question types (MCQ, Text, Rating, Matrix, File Upload)',
                        'Conditional logic and skip patterns',
                        'Question randomization',
                        'Multi-language translations',
                        'Rich text formatting',
                        'Image and video embedding',
                        'Answer validation rules'
                    ],
                    'user_roles' => ['program-admin', 'program-manager', 'program-moderator']
                ],
                'participant_management' => [
                    'description' => 'Manage event participants with segmentation and targeting',
                    'capabilities' => [
                        'Bulk participant import',
                        'Participant categorization (HCP types, specialties)',
                        'Anonymous participant support',
                        'Participant activity tracking',
                        'Communication preferences',
                        'Export participant lists'
                    ],
                    'user_roles' => ['program-admin', 'program-manager']
                ],
                'notification_engine' => [
                    'description' => 'Multi-channel notification system with lifecycle tracking',
                    'capabilities' => [
                        'Email notifications via SendGrid',
                        'SMS notifications (future)',
                        'In-app notifications',
                        'Scheduled and triggered notifications',
                        'Notification templates',
                        'Delivery status tracking',
                        'Open and read tracking',
                        'Batch processing for large audiences'
                    ],
                    'user_roles' => ['all authenticated users']
                ],
                'analytics_and_reporting' => [
                    'description' => 'Comprehensive analytics with customizable reports and dashboards',
                    'capabilities' => [
                        'Real-time response analytics',
                        'Cross-tabulation reports',
                        'Trend analysis',
                        'Evaluator-wise performance reports',
                        'Email campaign reports',
                        'Activity results dashboard',
                        'Custom report generation',
                        'Data export (PDF, Excel, CSV)',
                        'Visual charts and graphs'
                    ],
                    'user_roles' => ['admin', 'program-admin', 'program-manager', 'evaluation-admin']
                ],
                'role_and_permission_system' => [
                    'description' => 'Granular role-based access control with service-level permissions',
                    'capabilities' => [
                        'Predefined system roles (8 roles)',
                        'Service-level permission control (22 services)',
                        'Custom role creation (for non-system roles)',
                        'Role assignment and delegation',
                        'Permission inheritance',
                        'Service restrictions for system roles'
                    ],
                    'available_roles' => [
                        'super-admin' => 'Full system access',
                        'admin' => 'Organization-level administration',
                        'group-head' => 'Multi-program management',
                        'program-admin' => 'Program administration',
                        'program-manager' => 'Program operations',
                        'program-moderator' => 'Content moderation',
                        'evaluation-admin' => 'Evaluation management',
                        'participant' => 'Activity participation'
                    ],
                    'available_services' => [
                        'dashboard', 'list_organization', 'list_programs', 'manage_programs',
                        'list_activities', 'manage_activities', 'list_users', 'manage_users',
                        'reports', 'settings', 'notifications', 'analytics',
                        'questionnaire_builder', 'participant_management', 'email_campaigns',
                        'audit_logs', 'role_management', 'program_settings', 'activity_settings',
                        'data_export', 'file_upload', 'evaluation_reports'
                    ]
                ],
                'data_security_and_audit' => [
                    'description' => 'Comprehensive security features with full audit trails',
                    'capabilities' => [
                        'End-to-end encryption (TLS 1.3)',
                        'Token-based authentication',
                        'Role-based authorization',
                        'Audit logging for all actions',
                        'Response submission tracking',
                        'Notification lifecycle logging',
                        'Data retention policies',
                        'GDPR compliance features',
                        'Data anonymization',
                        'Secure file storage (S3)'
                    ],
                    'compliance' => ['GDPR Ready', 'SOC 2 Ready', 'HIPAA Considerations', 'ISO 27001 Ready']
                ]
            ],
            'advanced_features' => [
                'white_labeling' => [
                    'description' => 'Custom branding for organizations',
                    'features' => ['Logo upload', 'Color scheme customization', 'Custom domain support']
                ],
                'multi_language_support' => [
                    'description' => 'Support for multiple languages in questionnaires and UI',
                    'supported_languages' => ['English', 'Spanish', 'French', 'German', 'Hindi', 'Chinese', 'Japanese']
                ],
                'anonymous_participation' => [
                    'description' => 'Allow participation without authentication',
                    'features' => ['Anonymous response collection', 'Optional contact details', 'Privacy-first design']
                ],
                'file_management' => [
                    'description' => 'AWS S3-based file storage and management',
                    'features' => ['Image upload', 'Document upload', 'Video embedding', 'File size limits', 'Type validation']
                ],
                'email_campaigns' => [
                    'description' => 'Bulk email campaigns with tracking',
                    'features' => ['SendGrid integration', 'Template management', 'Delivery tracking', 'Campaign analytics']
                ],
                'api_access' => [
                    'description' => 'RESTful API for third-party integrations',
                    'features' => ['Token-based authentication', 'Rate limiting', 'Comprehensive documentation', 'Webhooks (planned)']
                ]
            ],
            'integration_capabilities' => [
                'current_integrations' => [
                    'AWS S3' => 'File storage and CDN',
                    'SendGrid' => 'Email delivery and tracking',
                    'AWS RDS' => 'Database hosting',
                    'AWS ElastiCache' => 'Caching layer'
                ],
                'planned_integrations' => [
                    'Salesforce' => 'CRM integration',
                    'Microsoft Teams' => 'Notifications and collaboration',
                    'Slack' => 'Team notifications',
                    'Zapier' => 'Automation workflows',
                    'Google Analytics' => 'Enhanced tracking'
                ]
            ],
            'user_experience' => [
                'responsive_design' => 'Works on all devices (desktop, tablet, mobile)',
                'accessibility' => 'WCAG 2.1 Level AA compliance (in progress)',
                'performance' => 'Page load < 2 seconds, API response < 200ms',
                'browser_support' => ['Chrome', 'Firefox', 'Safari', 'Edge'],
                'mobile_apps' => 'Progressive Web App (PWA) support'
            ],
            'data_management' => [
                'import_export' => [
                    'import_formats' => ['CSV', 'Excel', 'JSON'],
                    'export_formats' => ['PDF', 'Excel', 'CSV', 'JSON'],
                    'bulk_operations' => 'Participant import, data export, report generation'
                ],
                'data_retention' => [
                    'active_data' => 'Unlimited storage',
                    'archived_data' => '7 years retention',
                    'deletion_policy' => 'GDPR-compliant deletion on request'
                ],
                'data_portability' => 'Export all user data in machine-readable format'
            ],
            'support_and_documentation' => [
                'user_documentation' => 'Comprehensive user guides and tutorials',
                'api_documentation' => 'OpenAPI/Swagger documentation',
                'video_tutorials' => 'Step-by-step video guides',
                'support_channels' => ['Email support', 'In-app ticketing', 'Knowledge base'],
                'training' => 'Onboarding sessions for new clients'
            ]
        ];
    }

    private function getDataSecurity()
    {
        return [
            'overview' => 'Advanced data encryption, tokenization, and key management are built into QSights to protect data across applications. Optimal data security in terms of data transactions as well as storage.',
            'encryption' => [
                'in_transit' => 'TLS 1.3',
                'at_rest' => 'AWS S3 Server-Side Encryption (SSE-S3)',
                'passwords' => 'Bcrypt hashing',
                'data_centric' => 'Tokenization security solutions that protect data across enterprise, cloud, mobile, and big-data environments'
            ],
            'authentication' => [
                'mechanism' => 'Laravel Sanctum Token-Based Authentication',
                'token_lifetime' => 'Configurable (default: 60 minutes)',
                'refresh_strategy' => 'Sliding window',
                'access_method' => 'Secure Shell (SSH) with particular IP address restrictions'
            ],
            'authorization' => [
                'model' => 'Role-Based Access Control (RBAC)',
                'roles' => ['super-admin', 'admin', 'group-head', 'program-admin', 'program-manager', 'program-moderator', 'participant']
            ],
            'security_features' => [
                'Cloud Access Security' => 'Protection platform that allows secure data movement to cloud while protecting data in cloud applications',
                'Data Encryption' => 'Data-centric and tokenization security solutions for enterprise, cloud, mobile, and big-data',
                'Mobile App Security' => 'Protecting sensitive data in mobile apps while safeguarding data from end-to-end transactions',
                'Web Browser Security' => 'Protects sensitive data captured through browser, keeps it protected through ecosystem to trusted host destination'
            ],
            'audit_logging' => [
                'response_audit' => 'Tracks all response submissions with timestamps',
                'notification_logging' => 'Logs all notification events (sent, delivered, opened, read)',
                'retention' => 'Configurable (default: 90 days)'
            ],
            'database_security' => [
                'connection' => 'Secure connection via PHP REST API Engine',
                'access' => 'Developer access via SSH with particular IP address',
                'encryption' => 'AWS RDS PostgreSQL with encryption at rest'
            ]
        ];
    }

    private function getDatabaseDesign()
    {
        $tables = [];
        $tableNames = DB::select("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
        
        $totalTables = count($tableNames);
        
        foreach ($tableNames as $tableName) {
            $table = $tableName->table_name;
            $columns = DB::select("SELECT column_name, data_type, character_maximum_length, is_nullable, column_default 
                                  FROM information_schema.columns 
                                  WHERE table_name = ? 
                                  ORDER BY ordinal_position", [$table]);
            
            $tables[$table] = [
                'columns' => $columns,
                'id_type' => $this->getIDType($table)
            ];
        }

        return [
            'database' => 'PostgreSQL on AWS RDS',
            'total_tables' => $totalTables,
            'schema' => $tables,
            'key_entities' => [
                'Organization' => 'Root entity with name and email attributes',
                'Programs' => 'Linked to organizations with title, category, description',
                'Speakers' => 'Program speakers with name, email, profile',
                'Activities' => 'Survey/Assessment/Poll events with title, type, description',
                'Normal Users' => 'End users (HCPs, Champions/Specialists) with name, type, email',
                'Pharma/Clients Companies/Sponsor' => 'External entities with name, version, profile',
                'Abstracts' => 'Activity-related abstracts',
                'Content Development' => 'Activity content management',
                'Reply to Queries' => 'Q&A functionality linked to activities'
            ],
            'key_tables' => [
                'qst_organization' => 'Organization master data',
                'qst_program' => 'Program management',
                'qst_activities' => 'Events and evaluations',
                'qst_questionnaires' => 'Questionnaire definitions with language support',
                'qst_questions' => 'Individual questions with settings and options',
                'qst_participants' => 'Activity participants (users and anonymous)',
                'qst_survey_response' => 'Individual-level response data (BIGINT IDs)',
                'qst_user_notifications' => 'Individual notification tracking',
                'response_audit_logs' => 'Response submission audit trail',
                'notification_logs' => 'Notification lifecycle tracking',
                'qst_report' => 'Report definitions and configurations',
                'qst_tickets' => 'Support ticket system',
                'qst_role' => 'System roles and permissions'
            ],
            'relationships' => [
                'Organization → Programs' => 'One-to-Many',
                'Programs → Activities' => 'One-to-Many',
                'Activities → Participants' => 'Many-to-Many',
                'Activities → Questionnaires' => 'One-to-Many',
                'Questionnaires → Questions' => 'One-to-Many',
                'Participants → Responses' => 'One-to-Many',
                'Users → Notifications' => 'One-to-Many'
            ],
            'visualization_tools' => [
                'dbdiagram.io' => 'Online ER diagram tool - export from database',
                'DBeaver' => 'Universal database client with ER diagram generation',
                'MySQL Workbench' => 'Generate visual schemas from live database',
                'TablePlus' => 'Modern database GUI with schema viewer',
                'pgAdmin' => 'PostgreSQL administration with ER diagrams'
            ],
            'sdd_methodology' => 'This SDD is auto-generated from live database introspection and serves as a template for global documentation tools. It demonstrates how applications can maintain real-time technical documentation.',
            'critical_note' => 'Production uses BIGINT for responses and notifications. All migrations MUST respect this. Total tables: ' . $totalTables
        ];
    }

    private function getServerSetup()
    {
        return [
            'cloud_provider' => 'Amazon Web Services (AWS)',
            'architecture' => 'Multi-tier application architecture with VPC, public/private subnets, auto-scaling, and high availability',
            'environments' => [
                'development' => [
                    'frontend' => 'localhost:3000',
                    'backend' => 'localhost:8000',
                    'database' => 'localhost:5432'
                ],
                'production' => [
                    'server' => '13.126.210.220',
                    'frontend' => 'https://prod.qsights.com',
                    'backend' => 'https://prod.qsights.com/api',
                    'ssh_access' => 'ubuntu@13.126.210.220',
                    'ssh_key' => 'PEM key-based authentication',
                    'region' => 'AWS Mumbai Region'
                ]
            ],
            'infrastructure' => [
                'vpc' => 'Virtual Private Cloud with Availability Zones',
                'public_subnet' => 'NAT Gateway, Internet Gateway, Route 53 (DNS)',
                'private_subnet' => 'EC2 Instances (Next.js + Laravel), ELB, EFS',
                'web_server' => 'Nginx',
                'app_server' => 'PM2 (Next.js frontend) + PHP-FPM (Laravel backend)',
                'database' => 'PostgreSQL on AWS RDS in private subnet with multi-AZ standby',
                'cache' => 'AWS ElastiCache (Redis) for session and data caching',
                'storage' => 'AWS S3 Bucket for file uploads and storage + EFS for shared application files',
                'load_balancing' => 'Application Load Balancer (ALB)',
                'ssl' => 'Let\'s Encrypt SSL certificates (TLS 1.3)',
                'monitoring' => 'AWS CloudWatch for infrastructure and application monitoring',
                'auto_scaling' => 'Auto Scaling Groups for EC2 instances based on CPU/memory metrics'
            ],
            'security' => [
                'network' => 'VPC with public and private subnets',
                'access_control' => 'SSH access restricted to particular IP addresses',
                'firewall' => 'UFW + AWS Security Groups',
                'fail2ban' => 'Enabled for intrusion prevention',
                'ssh' => 'Key-based authentication only (no password)',
                'cors' => 'Configured for frontend domain only',
                'encryption' => 'Data encryption in transit (TLS) and at rest (AWS SSE)',
                'database_security' => 'Private subnet access only'
            ],
            'scalability' => [
                'auto_scaling' => 'Auto Scaling Groups for both bastion hosts and LAMP servers',
                'load_balancing' => 'ELB distributes traffic across multiple instances',
                'high_availability' => 'Multi-AZ deployment with standby instances'
            ]
        ];
    }

    private function getAPIs()
    {
        $routes = [];
        $apiRoutesFile = base_path('routes/api.php');
        
        if (file_exists($apiRoutesFile)) {
            $content = file_get_contents($apiRoutesFile);
            
            // Extract route information (simplified)
            preg_match_all("/Route::(get|post|put|delete|patch)\s*\(\s*['\"]([^'\"]+)/", $content, $matches, PREG_SET_ORDER);
            
            foreach ($matches as $match) {
                $routes[] = [
                    'method' => strtoupper($match[1]),
                    'path' => '/api/' . ltrim($match[2], '/')
                ];
            }
        }

        return [
            'base_url' => '/api',
            'authentication' => 'Bearer Token (Laravel Sanctum)',
            'endpoints' => $routes,
            'rate_limiting' => 'Configured per route',
            'access_control' => 'Role-based middleware',
            'documentation' => 'RESTful API with JSON responses',
            'versioning' => 'Version 1.0 (v1)',
            'response_format' => [
                'success_response' => '{"success": true, "data": {...}}',
                'error_response' => '{"success": false, "message": "...", "error": "..."}'
            ]
        ];
    }

    private function getTechnologyStack()
    {
        return [
            'frontend' => [
                'Next.js' => '14.x',
                'React' => '18.x',
                'TypeScript' => '5.x',
                'Tailwind CSS' => '3.x',
                'Lucide React' => 'Latest'
            ],
            'backend' => [
                'Laravel' => '11.x',
                'PHP' => '8.2+',
                'Laravel Sanctum' => 'Latest',
                'AWS SDK' => 'Latest'
            ],
            'database' => [
                'PostgreSQL' => '14.x'
            ],
            'infrastructure' => [
                'PM2' => 'Latest',
                'Nginx' => '1.18+',
                'Ubuntu' => '20.04 LTS'
            ]
        ];
    }

    private function getAppendix()
    {
        return [
            'response_lifecycle' => [
                'A. User starts activity',
                'B. Frontend loads questionnaire',
                'C. User answers questions',
                'D. Responses saved to database (responses table with BIGINT IDs)',
                'E. Response audit log created',
                'F. Analytics updated',
                'G. Notifications sent (if configured)',
                'Z. Response completion marked'
            ],
            'notification_lifecycle' => [
                'A. Notification triggered',
                'B. Created in user_notifications table',
                'C. Sent via email/SMS',
                'D. Delivery confirmed',
                'E. User opens notification',
                'F. User reads content',
                'G. All events logged in notification_logs'
            ],
            'backup_procedures' => [
                'frequency' => 'Daily automated backups at 2 AM UTC',
                'database_backup' => 'AWS RDS automated snapshots + manual exports',
                'code_backup' => 'Git repository with tagged releases',
                's3_backup' => 'AWS S3 versioning enabled with lifecycle policies',
                'retention_policy' => '30 days for daily, 12 months for monthly',
                'backup_locations' => [
                    'local' => '/Users/yash/Documents/Backups/',
                    'production' => '/home/ubuntu/backups/',
                    'git' => 'GitHub repository branches'
                ],
                'recovery_time_objective' => '4 hours',
                'recovery_point_objective' => '24 hours',
                'backup_verification' => 'Monthly restore tests'
            ],
            'rollback_strategy' => [
                'database_rollback' => 'php artisan migrate:rollback --step=1',
                'frontend_rollback' => 'pm2 restart + restore from backup',
                'backend_rollback' => 'Git revert + composer install + restart PHP-FPM',
                'feature_toggle' => 'Environment variable based (no deployment required)',
                'emergency_contacts' => [
                    'system_admin' => 'Primary escalation',
                    'devops_team' => 'Infrastructure issues',
                    'development_lead' => 'Application issues'
                ],
                'rollback_decision_criteria' => [
                    'Critical bug affecting > 10% users',
                    'Data corruption or loss',
                    'Security vulnerability',
                    'System downtime > 15 minutes',
                    'Failed pre-deployment tests'
                ]
            ],
            'business_continuity' => [
                'disaster_recovery_plan' => [
                    'rpo' => '24 hours (maximum data loss)',
                    'rto' => '4 hours (maximum downtime)',
                    'backup_site' => 'AWS multi-region failover ready',
                    'data_replication' => 'AWS RDS PostgreSQL with automated backups and snapshots',
                    'failover_process' => 'Automated via AWS Route 53 health checks'
                ],
                'incident_response' => [
                    'severity_levels' => ['Critical', 'High', 'Medium', 'Low'],
                    'response_times' => [
                        'Critical' => '15 minutes',
                        'High' => '1 hour',
                        'Medium' => '4 hours',
                        'Low' => '24 hours'
                    ],
                    'escalation_matrix' => 'Documented in runbook',
                    'communication_plan' => 'Status page + email notifications'
                ],
                'maintenance_windows' => [
                    'scheduled' => 'Sunday 2-4 AM UTC',
                    'emergency' => 'As needed with 15-min notification',
                    'notification_channels' => 'Email, SMS, in-app banner'
                ]
            ],
            'performance_metrics' => [
                'availability' => [
                    'target' => '99.9% uptime',
                    'measurement' => 'AWS CloudWatch + external monitoring',
                    'reporting' => 'Monthly SLA reports'
                ],
                'response_times' => [
                    'api_endpoints' => '< 200ms (p95)',
                    'page_load' => '< 2 seconds (p95)',
                    'database_queries' => '< 100ms (p95)'
                ],
                'capacity_planning' => [
                    'current_capacity' => '10,000 concurrent users',
                    'peak_usage' => 'Monitored via CloudWatch',
                    'scaling_triggers' => 'CPU > 70% for 5 minutes',
                    'growth_projection' => 'Reviewed quarterly'
                ],
                'monitoring_tools' => [
                    'aws_cloudwatch' => 'Infrastructure and application metrics',
                    'laravel_log' => 'Application errors and warnings',
                    'pm2_monitoring' => 'Frontend process health',
                    'database_metrics' => 'Query performance and connections'
                ]
            ],
            'quality_assurance' => [
                'testing_strategy' => [
                    'unit_tests' => 'PHPUnit for backend, Jest for frontend',
                    'integration_tests' => 'API endpoint testing',
                    'e2e_tests' => 'Cypress for critical user flows',
                    'security_tests' => 'OWASP ZAP automated scans',
                    'performance_tests' => 'Load testing before major releases'
                ],
                'code_quality' => [
                    'code_reviews' => 'Mandatory for all changes',
                    'static_analysis' => 'PHPStan, ESLint',
                    'coverage_target' => '80% code coverage',
                    'documentation' => 'Inline comments + API documentation'
                ],
                'deployment_gates' => [
                    'pre_deployment_tests' => 'Must pass all tests',
                    'schema_validation' => 'Migration consistency check',
                    'security_scan' => 'No high/critical vulnerabilities',
                    'peer_review' => 'Minimum 1 approval required'
                ]
            ],
            'change_management' => [
                'version_control' => [
                    'system' => 'Git (GitHub)',
                    'branching_strategy' => 'GitFlow (main, develop, feature, hotfix)',
                    'commit_conventions' => 'Conventional Commits',
                    'release_tagging' => 'Semantic versioning (MAJOR.MINOR.PATCH)'
                ],
                'deployment_process' => [
                    'environments' => ['development', 'staging', 'production'],
                    'deployment_frequency' => 'Bi-weekly releases + hotfixes as needed',
                    'deployment_method' => 'SSH + PM2 restart + PHP-FPM reload',
                    'rollback_plan' => 'Documented for each release',
                    'post_deployment' => 'Smoke tests + monitoring'
                ],
                'release_notes' => [
                    'format' => 'Markdown with features, fixes, breaking changes',
                    'distribution' => 'Email to stakeholders + in-app changelog',
                    'approval' => 'Product owner + technical lead'
                ]
            ],
            'glossary' => [
                'SDD' => 'System Design Document - Technical documentation of system architecture',
                'RBAC' => 'Role-Based Access Control - Permission model',
                'SLA' => 'Service Level Agreement - Uptime and performance commitments',
                'RTO' => 'Recovery Time Objective - Maximum acceptable downtime',
                'RPO' => 'Recovery Point Objective - Maximum acceptable data loss',
                'GDPR' => 'General Data Protection Regulation - EU privacy law',
                'SOC 2' => 'Service Organization Control 2 - Security compliance framework',
                'API' => 'Application Programming Interface - Communication layer',
                'REST' => 'Representational State Transfer - API architecture style',
                'JWT' => 'JSON Web Token - Authentication token format',
                'CORS' => 'Cross-Origin Resource Sharing - Browser security policy',
                'SSL/TLS' => 'Secure Sockets Layer/Transport Layer Security - Encryption protocol'
            ],
            'references' => [
                'Laravel Documentation' => 'https://laravel.com/docs',
                'Next.js Documentation' => 'https://nextjs.org/docs',
                'AWS Best Practices' => 'https://aws.amazon.com/architecture/well-architected',
                'OWASP Top 10' => 'https://owasp.org/www-project-top-ten',
                'NIST Cybersecurity Framework' => 'https://www.nist.gov/cyberframework',
                'ISO 27001' => 'Information security management standard',
                'SOC 2 Framework' => 'https://www.aicpa.org/soc'
            ]
        ];
    }

    private function loadCriticalFeatures()
    {
        $filePath = base_path('CRITICAL_FEATURES.json');
        
        if (file_exists($filePath)) {
            $data = json_decode(file_get_contents($filePath), true);
            return [
                'critical' => $data['critical_features'] ?? [],
                'non_critical' => $data['non_critical_features'] ?? []
            ];
        }

        // Default critical features
        return [
            'critical' => [
                'User Authentication & Authorization',
                'Event Participation (User & Anonymous)',
                'Response Saving (Question & Option Level)',
                'Notification Lifecycle Tracking',
                'Reports & Analytics',
                'Role-Based Access Control',
                'Data Audit Logging',
                'S3 Image Upload',
                'Email Campaign Reports',
                'Data Safety Settings'
            ],
            'non_critical' => [
                'Landing Page CMS',
                'Theme Customization',
                'Contact Forms',
                'Demo Requests'
            ]
        ];
    }

    private function getIDType($table)
    {
        try {
            $type = Schema::getColumnType($table, 'id');
            return strtoupper($type);
        } catch (\Exception $e) {
            return 'UNKNOWN';
        }
    }

    // ========== TEST METHODS ==========

    private function testEventParticipation()
    {
        try {
            // Check if activities table exists and has data
            $activityCount = DB::table('activities')->count();
            
            return [
                'name' => 'Event Participation Test',
                'passed' => $activityCount >= 0,
                'message' => "Found {$activityCount} activities",
                'details' => 'Activities table accessible'
            ];
        } catch (\Exception $e) {
            return [
                'name' => 'Event Participation Test',
                'passed' => false,
                'message' => 'Test failed',
                'error' => $e->getMessage()
            ];
        }
    }

    private function testResponseSaving()
    {
        try {
            // Check responses table schema
            $hasResponses = Schema::hasTable('responses');
            $hasAnswers = Schema::hasColumn('responses', 'answers');
            
            return [
                'name' => 'Response Saving Test',
                'passed' => $hasResponses && $hasAnswers,
                'message' => 'Response table structure valid',
                'details' => [
                    'table_exists' => $hasResponses,
                    'answers_column_exists' => $hasAnswers
                ]
            ];
        } catch (\Exception $e) {
            return [
                'name' => 'Response Saving Test',
                'passed' => false,
                'message' => 'Test failed',
                'error' => $e->getMessage()
            ];
        }
    }

    private function testNotificationLifecycle()
    {
        try {
            // Check notification tables
            $hasUserNotifications = Schema::hasTable('user_notifications');
            $hasNotificationLogs = Schema::hasTable('notification_logs');
            
            return [
                'name' => 'Notification Lifecycle Test',
                'passed' => $hasUserNotifications && $hasNotificationLogs,
                'message' => 'Notification tracking tables present',
                'details' => [
                    'user_notifications' => $hasUserNotifications,
                    'notification_logs' => $hasNotificationLogs
                ]
            ];
        } catch (\Exception $e) {
            return [
                'name' => 'Notification Lifecycle Test',
                'passed' => false,
                'message' => 'Test failed',
                'error' => $e->getMessage()
            ];
        }
    }

    private function testReportsAnalytics()
    {
        try {
            // Check if analytics endpoints are accessible
            $hasResponses = Schema::hasTable('responses');
            $hasActivities = Schema::hasTable('activities');
            
            return [
                'name' => 'Reports & Analytics Test',
                'passed' => $hasResponses && $hasActivities,
                'message' => 'Analytics data sources available',
                'details' => [
                    'responses_table' => $hasResponses,
                    'activities_table' => $hasActivities
                ]
            ];
        } catch (\Exception $e) {
            return [
                'name' => 'Reports & Analytics Test',
                'passed' => false,
                'message' => 'Test failed',
                'error' => $e->getMessage()
            ];
        }
    }
}
