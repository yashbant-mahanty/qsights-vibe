<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Evaluation Request</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px 12px 0 0;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            background: #fff;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 20px 0;
        }
        .button:hover {
            opacity: 0.9;
        }
        .subordinates-list {
            background: #f9fafb;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
        }
        .subordinates-list ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .footer {
            background: #f9fafb;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            border-radius: 0 0 12px 12px;
            border: 1px solid #e5e7eb;
            border-top: none;
        }
        .highlight {
            color: #667eea;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📋 Evaluation Request</h1>
    </div>
    
    <div class="content">
        <p>Hello <strong>{{ $evaluatorName }}</strong>,</p>
        
        <p>You have been requested to complete a <span class="highlight">{{ $templateName }}</span> evaluation for your team members.</p>
        
        <div class="subordinates-list">
            <strong>Team members to evaluate ({{ $subordinatesCount }}):</strong>
            <ul>
                @foreach($subordinates as $subordinate)
                    <li>{{ $subordinate->name }}</li>
                @endforeach
            </ul>
        </div>
        
        <p>Please click the button below to access the evaluation form:</p>
        
        <center>
            <a href="{{ $evaluationUrl }}" class="button">Start Evaluation →</a>
        </center>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
            This link is unique to you and should not be shared with others. 
            Please complete the evaluation at your earliest convenience.
        </p>
    </div>
    
    <div class="footer">
        <p>This email was sent by QSights Evaluation System</p>
        <p>If you have any questions, please contact your administrator.</p>
    </div>
</body>
</html>
