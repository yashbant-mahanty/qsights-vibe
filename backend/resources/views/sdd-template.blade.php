<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QSights System Design Document v{{ $version }}</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 11px;
            line-height: 1.6;
            color: #333;
            margin: 40px;
        }
        h1 {
            font-size: 24px;
            color: #1e40af;
            border-bottom: 3px solid #1e40af;
            padding-bottom: 10px;
            margin-top: 30px;
        }
        h2 {
            font-size: 18px;
            color: #2563eb;
            margin-top: 25px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 5px;
        }
        h3 {
            font-size: 14px;
            color: #3b82f6;
            margin-top: 15px;
        }
        h4 {
            font-size: 12px;
            color: #6b7280;
            margin-top: 10px;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border: 2px solid #1e40af;
            padding: 20px;
            background-color: #eff6ff;
        }
        .header h1 {
            border: none;
            margin: 0;
        }
        .version-info {
            background-color: #dbeafe;
            padding: 15px;
            border-left: 4px solid #1e40af;
            margin: 20px 0;
        }
        .critical-note {
            background-color: #fee2e2;
            padding: 15px;
            border-left: 4px solid #dc2626;
            margin: 20px 0;
        }
        .info-box {
            background-color: #f3f4f6;
            padding: 12px;
            border: 1px solid #d1d5db;
            margin: 15px 0;
            border-radius: 4px;
        }
        ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        li {
            margin: 5px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 10px;
        }
        table th {
            background-color: #1e40af;
            color: white;
            padding: 8px;
            text-align: left;
            border: 1px solid #1e40af;
        }
        table td {
            padding: 6px 8px;
            border: 1px solid #d1d5db;
        }
        table tr:nth-child(even) {
            background-color: #f9fafb;
        }
        .page-break {
            page-break-after: always;
        }
        .footer {
            position: fixed;
            bottom: 20px;
            right: 40px;
            font-size: 9px;
            color: #6b7280;
        }
        code {
            background-color: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 10px;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <h1>QSights System Design Document</h1>
        <p style="margin: 5px 0;"><strong>Version {{ $version }}</strong></p>
        <p style="margin: 5px 0; font-size: 10px;">Generated: {{ $generated_at }}</p>
        <p style="margin: 5px 0; font-size: 10px; color: #6b7280;">AUTO-MAINTAINED • ALWAYS CURRENT</p>
    </div>

    <!-- Footer -->
    <div class="footer">
        Page {PAGENO} of {nb}
    </div>

    <!-- 1. INTRODUCTION -->
    <h1>1. INTRODUCTION</h1>
    
    <h2>1.1 Purpose</h2>
    <p>{{ $introduction['purpose'] }}</p>

    <h2>1.2 Scope</h2>
    <p>{{ $introduction['scope'] }}</p>

    <h2>1.3 Critical Features (MUST ALWAYS WORK)</h2>
    <div class="critical-note">
        <strong>⚠️ CRITICAL:</strong> These features are essential and must pass all tests before deployment.
    </div>
    <ul>
        @foreach($introduction['critical_features']['critical'] as $feature)
            <li><strong>{{ $feature['name'] }}</strong> - {{ $feature['description'] }}</li>
        @endforeach
    </ul>

    <h2>1.4 Non-Critical Features</h2>
    <ul>
        @foreach($introduction['critical_features']['non_critical'] as $feature)
            <li><strong>{{ $feature['name'] }}</strong> - {{ $feature['description'] }}</li>
        @endforeach
    </ul>

    <div class="page-break"></div>

    <!-- 2. SYSTEM ARCHITECTURE -->
    <h1>2. SYSTEM ARCHITECTURE</h1>
    
    <h2>2.1 Architecture Pattern</h2>
    <p>{{ $architecture['pattern'] }}</p>

    <h2>2.2 Frontend Stack</h2>
    <div class="info-box">
        <ul>
            <li><strong>Framework:</strong> {{ $architecture['frontend']['framework'] }}</li>
            <li><strong>Language:</strong> {{ $architecture['frontend']['language'] }}</li>
            <li><strong>Styling:</strong> {{ $architecture['frontend']['styling'] }}</li>
            <li><strong>State Management:</strong> {{ $architecture['frontend']['state_management'] }}</li>
            <li><strong>Server:</strong> {{ $architecture['frontend']['server'] }}</li>
        </ul>
    </div>

    <h2>2.3 Backend Stack</h2>
    <div class="info-box">
        <ul>
            <li><strong>Framework:</strong> {{ $architecture['backend']['framework'] }}</li>
            <li><strong>Language:</strong> {{ $architecture['backend']['language'] }}</li>
            <li><strong>Database:</strong> {{ $architecture['backend']['database'] }}</li>
            <li><strong>Authentication:</strong> {{ $architecture['backend']['authentication'] }}</li>
            <li><strong>Storage:</strong> {{ $architecture['backend']['storage'] }}</li>
        </ul>
    </div>

    <h2>2.4 Communication</h2>
    <p>{{ $architecture['communication'] }}</p>

    <div class="page-break"></div>

    <!-- 3. DATA SECURITY -->
    <h1>3. DATA SECURITY</h1>
    
    <h2>3.1 Encryption</h2>
    <ul>
        <li><strong>In Transit:</strong> {{ $dataSecurity['encryption']['in_transit'] }}</li>
        <li><strong>At Rest:</strong> {{ $dataSecurity['encryption']['at_rest'] }}</li>
        <li><strong>Passwords:</strong> {{ $dataSecurity['encryption']['passwords'] }}</li>
    </ul>

    <h2>3.2 Authentication</h2>
    <ul>
        <li><strong>Mechanism:</strong> {{ $dataSecurity['authentication']['mechanism'] }}</li>
        <li><strong>Token Lifetime:</strong> {{ $dataSecurity['authentication']['token_lifetime'] }}</li>
        <li><strong>Refresh Strategy:</strong> {{ $dataSecurity['authentication']['refresh_strategy'] }}</li>
    </ul>

    <h2>3.3 Authorization (RBAC)</h2>
    <p><strong>Model:</strong> {{ $dataSecurity['authorization']['model'] }}</p>
    <p><strong>Roles:</strong></p>
    <ul>
        @foreach($dataSecurity['authorization']['roles'] as $role)
            <li>{{ $role }}</li>
        @endforeach
    </ul>

    <h2>3.4 Audit Logging</h2>
    <ul>
        <li><strong>Response Audit:</strong> {{ $dataSecurity['audit_logging']['response_audit'] }}</li>
        <li><strong>Notification Logging:</strong> {{ $dataSecurity['audit_logging']['notification_logging'] }}</li>
        <li><strong>Retention:</strong> {{ $dataSecurity['audit_logging']['retention'] }}</li>
    </ul>

    <div class="page-break"></div>

    <!-- 4. DATABASE DESIGN -->
    <h1>4. DATABASE DESIGN</h1>
    
    <div class="critical-note">
        <strong>⚠️ CRITICAL:</strong> {{ $database['critical_note'] }}
    </div>

    <h2>4.1 Database System</h2>
    <p><strong>{{ $database['database'] }}</strong></p>

    <h2>4.2 Key Tables</h2>
    <table>
        <thead>
            <tr>
                <th>Table Name</th>
                <th>Description</th>
            </tr>
        </thead>
        <tbody>
            @foreach($database['key_tables'] as $table => $description)
            <tr>
                <td><code>{{ $table }}</code></td>
                <td>{{ $description }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="page-break"></div>

    <!-- 5. SERVER SETUP & SECURITY -->
    <h1>5. SERVER SETUP & SECURITY</h1>
    
    <h2>5.1 Production Environment</h2>
    <div class="info-box">
        <ul>
            <li><strong>Server:</strong> {{ $serverSetup['environments']['production']['server'] }}</li>
            <li><strong>Frontend URL:</strong> {{ $serverSetup['environments']['production']['frontend'] }}</li>
            <li><strong>Backend URL:</strong> {{ $serverSetup['environments']['production']['backend'] }}</li>
        </ul>
    </div>

    <h2>5.2 Infrastructure</h2>
    <ul>
        <li><strong>Web Server:</strong> {{ $serverSetup['infrastructure']['web_server'] }}</li>
        <li><strong>App Server:</strong> {{ $serverSetup['infrastructure']['app_server'] }}</li>
        <li><strong>Database:</strong> {{ $serverSetup['infrastructure']['database'] }}</li>
        <li><strong>Storage:</strong> {{ $serverSetup['infrastructure']['storage'] }}</li>
        <li><strong>SSL:</strong> {{ $serverSetup['infrastructure']['ssl'] }}</li>
    </ul>

    <h2>5.3 Security Measures</h2>
    <ul>
        <li><strong>Firewall:</strong> {{ $serverSetup['security']['firewall'] }}</li>
        <li><strong>Fail2Ban:</strong> {{ $serverSetup['security']['fail2ban'] }}</li>
        <li><strong>SSH:</strong> {{ $serverSetup['security']['ssh'] }}</li>
        <li><strong>CORS:</strong> {{ $serverSetup['security']['cors'] }}</li>
    </ul>

    <div class="page-break"></div>

    <!-- 6. APPLICATION PROGRAMMING INTERFACES -->
    <h1>6. APPLICATION PROGRAMMING INTERFACES</h1>
    
    <h2>6.1 API Configuration</h2>
    <ul>
        <li><strong>Base URL:</strong> <code>{{ $apis['base_url'] }}</code></li>
        <li><strong>Authentication:</strong> {{ $apis['authentication'] }}</li>
        <li><strong>Rate Limiting:</strong> {{ $apis['rate_limiting'] }}</li>
        <li><strong>Access Control:</strong> {{ $apis['access_control'] }}</li>
    </ul>

    <h2>6.2 API Endpoints</h2>
    <p><em>Total Endpoints: {{ count($apis['endpoints']) }}</em></p>
    <div class="info-box">
        <p>Complete endpoint documentation available through Laravel API routes.</p>
    </div>

    <div class="page-break"></div>

    <!-- 7. TECHNOLOGY STACK -->
    <h1>7. TECHNOLOGY STACK</h1>
    
    <h2>7.1 Frontend Technologies</h2>
    <table>
        <thead>
            <tr>
                <th>Technology</th>
                <th>Version</th>
            </tr>
        </thead>
        <tbody>
            @foreach($technology['frontend'] as $tech => $version)
            <tr>
                <td>{{ $tech }}</td>
                <td>{{ $version }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <h2>7.2 Backend Technologies</h2>
    <table>
        <thead>
            <tr>
                <th>Technology</th>
                <th>Version</th>
            </tr>
        </thead>
        <tbody>
            @foreach($technology['backend'] as $tech => $version)
            <tr>
                <td>{{ $tech }}</td>
                <td>{{ $version }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <h2>7.3 Infrastructure Technologies</h2>
    <table>
        <thead>
            <tr>
                <th>Technology</th>
                <th>Version</th>
            </tr>
        </thead>
        <tbody>
            @foreach($technology['infrastructure'] as $tech => $version)
            <tr>
                <td>{{ $tech }}</td>
                <td>{{ $version }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="page-break"></div>

    <!-- 8. APPENDIX -->
    <h1>8. APPENDIX</h1>
    
    <h2>8.1 Response Lifecycle</h2>
    <ol>
        @foreach($appendix['response_lifecycle'] as $step)
            <li>{{ $step }}</li>
        @endforeach
    </ol>

    <h2>8.2 Notification Lifecycle</h2>
    <ol>
        @foreach($appendix['notification_lifecycle'] as $step)
            <li>{{ $step }}</li>
        @endforeach
    </ol>

    <h2>8.3 Backup Procedures</h2>
    <table>
        <thead>
            <tr>
                <th>Backup Type</th>
                <th>Procedure</th>
            </tr>
        </thead>
        <tbody>
            @foreach($appendix['backup_procedures'] as $type => $procedure)
            <tr>
                <td><strong>{{ $type }}</strong></td>
                <td>{{ $procedure }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <h2>8.4 Rollback Strategy</h2>
    <table>
        <thead>
            <tr>
                <th>Component</th>
                <th>Rollback Method</th>
            </tr>
        </thead>
        <tbody>
            @foreach($appendix['rollback_strategy'] as $component => $method)
            <tr>
                <td><strong>{{ $component }}</strong></td>
                <td>{{ $method }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div style="margin-top: 50px; text-align: center; padding: 20px; background-color: #eff6ff; border: 2px solid #1e40af;">
        <p style="margin: 0; font-weight: bold;">END OF DOCUMENT</p>
        <p style="margin: 5px 0; font-size: 10px;">QSights System Design Document v{{ $version }}</p>
        <p style="margin: 5px 0; font-size: 9px; color: #6b7280;">Generated: {{ $generated_at }}</p>
    </div>
</body>
</html>
