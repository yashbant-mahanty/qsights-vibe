<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Hierarchy Security Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for hierarchy and manager security features including
    | rate limiting, audit logging, and data access controls.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting
    |--------------------------------------------------------------------------
    |
    | Controls for notification sending rate limits to prevent abuse.
    |
    */
    'rate_limiting' => [
        'notifications' => [
            'max_per_hour' => env('HIERARCHY_MAX_NOTIFICATIONS_PER_HOUR', 50),
            'max_per_day' => env('HIERARCHY_MAX_NOTIFICATIONS_PER_DAY', 200),
            'max_recipients_per_notification' => env('HIERARCHY_MAX_RECIPIENTS_PER_NOTIFICATION', 100),
        ],
        'api_calls' => [
            'max_analytics_requests_per_minute' => env('HIERARCHY_MAX_ANALYTICS_PER_MINUTE', 30),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Audit Logging
    |--------------------------------------------------------------------------
    |
    | Configuration for audit trail logging of manager actions.
    |
    */
    'audit_logging' => [
        'enabled' => env('HIERARCHY_AUDIT_LOGGING_ENABLED', true),
        'log_channel' => env('HIERARCHY_AUDIT_LOG_CHANNEL', 'daily'),
        'retention_days' => env('HIERARCHY_AUDIT_RETENTION_DAYS', 90),
        'log_to_database' => env('HIERARCHY_AUDIT_LOG_TO_DB', true),
        'log_to_file' => env('HIERARCHY_AUDIT_LOG_TO_FILE', true),
        
        // Sensitive fields to redact from logs
        'redacted_fields' => [
            'password',
            'password_confirmation',
            'token',
            'api_key',
            'secret',
            'credit_card',
            'ssn',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Data Access Control
    |--------------------------------------------------------------------------
    |
    | Controls for data scoping and access validation.
    |
    */
    'data_access' => [
        'strict_scoping' => env('HIERARCHY_STRICT_DATA_SCOPING', true),
        'allow_cross_program_access' => env('HIERARCHY_ALLOW_CROSS_PROGRAM', false),
        
        // Roles that bypass data scoping restrictions
        'bypass_roles' => [
            'admin',
            'super-admin',
            'program-admin',
        ],
        
        // Maximum depth for hierarchy queries
        'max_hierarchy_depth' => env('HIERARCHY_MAX_DEPTH', 10),
    ],

    /*
    |--------------------------------------------------------------------------
    | Manager Permissions
    |--------------------------------------------------------------------------
    |
    | Specific permissions for manager actions.
    |
    */
    'manager_permissions' => [
        'can_view_analytics' => true,
        'can_view_team_profiles' => true,
        'can_send_notifications' => true,
        'can_export_data' => true,
        'can_assign_activities' => env('HIERARCHY_MANAGERS_CAN_ASSIGN_ACTIVITIES', false),
        'can_modify_team_structure' => env('HIERARCHY_MANAGERS_CAN_MODIFY_STRUCTURE', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Security Alerts
    |--------------------------------------------------------------------------
    |
    | Configuration for security-related notifications and alerts.
    |
    */
    'security_alerts' => [
        'notify_on_unauthorized_access' => env('HIERARCHY_ALERT_UNAUTHORIZED_ACCESS', true),
        'notify_on_rate_limit_exceeded' => env('HIERARCHY_ALERT_RATE_LIMIT', true),
        'alert_email' => env('HIERARCHY_SECURITY_ALERT_EMAIL', 'security@qsights.com'),
        
        // Threshold for suspicious activity alerts
        'suspicious_activity_threshold' => [
            'failed_access_attempts' => 5,
            'time_window_minutes' => 15,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Data Validation
    |--------------------------------------------------------------------------
    |
    | Validation rules for hierarchy operations.
    |
    */
    'validation' => [
        'notification' => [
            'subject_max_length' => 255,
            'message_max_length' => 5000,
            'subject_required' => true,
            'message_required' => true,
        ],
        'manager_assignment' => [
            'require_program_id' => true,
            'require_role_id' => true,
            'prevent_circular_references' => true,
            'prevent_self_management' => true,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Performance & Caching
    |--------------------------------------------------------------------------
    |
    | Performance optimization settings.
    |
    */
    'performance' => [
        'cache_hierarchy_queries' => env('HIERARCHY_CACHE_QUERIES', true),
        'cache_ttl_minutes' => env('HIERARCHY_CACHE_TTL', 60),
        'max_subordinates_query_limit' => env('HIERARCHY_MAX_SUBORDINATES', 1000),
    ],

];
