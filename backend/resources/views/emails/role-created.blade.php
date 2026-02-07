<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Role Access Created</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 30px 20px;
        }
        .info-box {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-box strong {
            color: #667eea;
        }
        .credentials {
            background: #fffbeb;
            border: 2px solid #fbbf24;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .credentials h3 {
            margin-top: 0;
            color: #92400e;
        }
        .credential-item {
            margin: 10px 0;
            padding: 10px;
            background: #ffffff;
            border-radius: 4px;
        }
        .credential-item label {
            display: block;
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
        }
        .credential-item .value {
            font-size: 16px;
            font-weight: bold;
            color: #1a1a1a;
            font-family: 'Courier New', monospace;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        .warning {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Role Access Created</h1>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            
            <p>A new role has been created for you in the <strong>{{ $program_name }}</strong> program.</p>
            
            <div class="info-box">
                <strong>Role:</strong> {{ $role_name }}<br>
                <strong>Program:</strong> {{ $program_name }}<br>
                <strong>Organization:</strong> {{ $organization_name }}<br>
                <strong>Created By:</strong> {{ $created_by }}
            </div>
            
            <div class="credentials">
                <h3>🔐 Your Login Credentials</h3>
                
                <div class="credential-item">
                    <label>Username</label>
                    <div class="value">{{ $username }}</div>
                </div>
                
                <div class="credential-item">
                    <label>Email</label>
                    <div class="value">{{ $email }}</div>
                </div>
                
                <div class="credential-item">
                    <label>Temporary Password</label>
                    <div class="value">{{ $password }}</div>
                </div>
            </div>
            
            <div class="warning">
                <strong>⚠️ Important Security Notice:</strong><br>
                Please change your password immediately after your first login for security purposes.
            </div>
            
            <div style="text-align: center;">
                <a href="{{ $login_url }}" class="button">Login to Your Account</a>
            </div>
            
            <p>If you have any questions or need assistance, please contact your program administrator.</p>
            
            <p>Best regards,<br>
            <strong>{{ $organization_name }} Team</strong></p>
        </div>
        
        <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; {{ date('Y') }} {{ $organization_name }}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
