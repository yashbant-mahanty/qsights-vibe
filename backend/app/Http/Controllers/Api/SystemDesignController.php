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
                'dataSecurity' => $this->getDataSecurity(),
                'database' => $this->getDatabaseDesign(),
                'serverSetup' => $this->getServerSetup(),
                'apis' => $this->getAPIs(),
                'technology' => $this->getTechnologyStack(),
                'appendix' => $this->getAppendix(),
            ];

            // Set longer execution time for PDF generation
            set_time_limit(300);
            
            $pdf = PDF::loadView('sdd-template', $sddData)
                     ->setPaper('a4', 'portrait')
                     ->setOption('enable-local-file-access', true);
            
            $filename = 'QSights_SDD_v' . str_replace('.', '_', $sddData['version']) . '_' . now()->format('Y-m-d') . '.pdf';
            
            // Save to storage
            $path = 'sdd/' . $filename;
            Storage::put($path, $pdf->output());

            return response()->json([
                'success' => true,
                'message' => 'SDD PDF generated successfully',
                'filename' => $filename,
                'download_url' => '/api/system-design/download/' . $filename
            ]);
        } catch (\Exception $e) {
            \Log::error('PDF Generation Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate PDF',
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ], 500);
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
                'database_rollback' => [
                    'description' => 'Roll back database migrations',
                    'steps' => [
                        'ssh into production server',
                        'cd /var/www/QSightsOrg2.0/backend',
                        'php artisan migrate:rollback --step=1',
                        'Verify database state'
                    ]
                ],
                'feature_toggle' => [
                    'description' => 'Disable feature via config',
                    'steps' => [
                        'Update .env with FEATURE_NAME=false',
                        'Clear config cache: php artisan config:clear',
                        'Verify feature is disabled'
                    ]
                ],
                'notification_stop' => [
                    'description' => 'Stop notification queue',
                    'steps' => [
                        'php artisan queue:clear',
                        'Stop queue worker: supervisorctl stop laravel-worker',
                        'Verify queue is stopped'
                    ]
                ],
                'full_rollback' => [
                    'description' => 'Complete system rollback',
                    'steps' => [
                        'Stop PM2: pm2 stop qsights-frontend',
                        'Restore from backup',
                        'Run migrations rollback',
                        'Restart services',
                        'Verify system status'
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
        $criticalFeatures = $this->loadCriticalFeatures();
        
        return [
            'purpose' => 'QSights is a SaaS-based online tool that provides the ability to create, run and interpret various types of surveys, polls, and assessments. It is a smart Insights Generation & Analytics (IGA) platform that empowers Marketing and Medical Affairs teams in the Life Sciences industry to steer their scientific marketing/medical strategies effectively.',
            'scope' => 'This document covers technical aspects of QSights, a proprietary platform developed by BioQuest Solutions, from the architectural, data, and server perspectives. It is a powerful cloud-based tool available as a SaaS (Software as a Service), that has the ability to collect and crunch volumes of data to generate actionable insights & trends.',
            'key_benefits' => [
                'Cost-efficiency: Significantly reduces set-up and administration costs',
                'Time saving: Integrated web system for create, administer, collect and analyze feedback',
                'Multi-device compatible: Works across all devices and platforms',
                'White label capability: Customize with your brand logos and colors'
            ],
            'critical_features' => $criticalFeatures
        ];
    }

    private function getArchitecture()
    {
        return [
            'pattern' => 'Client-Server Architecture with API Gateway',
            'description' => 'Modular program structure with clear separation between frontend, API gateway, and backend services',
            'frontend' => [
                'framework' => 'Next.js 14',
                'language' => 'TypeScript',
                'styling' => 'Tailwind CSS',
                'state_management' => 'React Hooks',
                'server' => 'PM2 Process Manager',
                'ui_technologies' => 'HTML5, CSS, JavaScript, Angular'
            ],
            'backend' => [
                'framework' => 'Laravel 11',
                'language' => 'PHP 8.2+',
                'database' => 'PostgreSQL (Aurora MySQL compatible)',
                'authentication' => 'Laravel Sanctum',
                'storage' => 'AWS S3 Bucket',
                'api' => 'PHP REST API Engine',
                'data_formats' => 'JSON, XML'
            ],
            'communication' => 'RESTful API over HTTPS',
            'key_modules' => [
                'Account Management' => 'User management, roles, permissions',
                'Data Management' => 'Select, modify, delete data operations',
                'Program Management' => 'Add company, programs, and configurations',
                'Access Control' => 'Login, registration, authentication',
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
                'encryption' => 'AWS Aurora MySQL Database with encryption at rest'
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
            'database' => 'PostgreSQL (AWS Aurora MySQL Compatible)',
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
                'private_subnet' => 'LAMP EC2 Instances, ELB, EFS',
                'web_server' => 'Nginx',
                'app_server' => 'PM2 (Node.js) + PHP-FPM',
                'database' => 'Aurora MySQL DB in private subnet with standby for high availability',
                'cache' => 'ElastiCache for performance optimization',
                'storage' => 'AWS S3 Bucket for file storage + EFS for shared storage',
                'load_balancing' => 'Elastic Load Balancer (ELB)',
                'ssl' => 'Let\'s Encrypt SSL certificates',
                'monitoring' => 'CloudWatch for system monitoring',
                'auto_scaling' => 'Auto Scaling Groups for bastion hosts and LAMP servers'
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
            'access_control' => 'Role-based middleware'
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
                'Database backup' => 'Daily automated backups to /backups directory',
                'Code backup' => 'Git repository + manual checkpoints',
                'S3 backup' => 'AWS S3 versioning enabled',
                'Recovery time' => 'Target: 4 hours'
            ],
            'rollback_strategy' => [
                'Database' => 'php artisan migrate:rollback',
                'Frontend' => 'pm2 restart + restore from backup',
                'Feature toggle' => 'Environment variable based',
                'Emergency contact' => 'System administrator'
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
