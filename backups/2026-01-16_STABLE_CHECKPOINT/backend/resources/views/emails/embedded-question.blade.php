<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $activity->name }}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
        }
        .email-container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            color: #ffffff;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 700;
        }
        .header p {
            margin: 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 30px;
        }
        .question-box {
            background-color: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 8px;
        }
        .question-text {
            font-size: 20px;
            font-weight: 600;
            color: #2d3748;
            margin: 0 0 10px 0;
        }
        .question-meta {
            font-size: 14px;
            color: #718096;
            margin: 0;
        }
        .options-container {
            margin-top: 30px;
        }
        .option-button {
            display: block;
            width: 100%;
            padding: 18px 24px;
            margin-bottom: 12px;
            background-color: #ffffff;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            text-decoration: none;
            color: #2d3748;
            font-size: 16px;
            font-weight: 500;
            text-align: center;
            transition: all 0.2s;
        }
        .option-button:hover {
            background-color: #667eea;
            border-color: #667eea;
            color: #ffffff;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
        }
        .rating-container {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-top: 20px;
        }
        .rating-button {
            flex: 1;
            padding: 16px 12px;
            background-color: #ffffff;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            text-decoration: none;
            color: #2d3748;
            font-size: 18px;
            font-weight: 600;
            text-align: center;
            transition: all 0.2s;
        }
        .rating-button:hover {
            background-color: #667eea;
            border-color: #667eea;
            color: #ffffff;
            transform: scale(1.05);
        }
        .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #718096;
            font-size: 14px;
            border-top: 1px solid #e2e8f0;
        }
        .footer-note {
            margin: 15px 0 0 0;
            font-size: 12px;
        }
        .fallback-link {
            margin-top: 20px;
            padding: 15px;
            background-color: #edf2f7;
            border-radius: 8px;
            text-align: center;
        }
        .fallback-link a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
        }
        @media only screen and (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }
            .content {
                padding: 30px 20px;
            }
            .rating-container {
                flex-wrap: wrap;
            }
            .rating-button {
                min-width: 48px;
            }
        }
    </style>
</head>
<body>
    @if(isset($preheader) && $preheader)
    <!-- Preheader text (hidden preview text) -->
    <div style="display: none; max-height: 0px; overflow: hidden;">
        {{ $preheader }}
    </div>
    @endif
    
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <h1>{{ $activity->name }}</h1>
            @if($activity->description)
            <p>{{ Str::limit($activity->description, 120) }}</p>
            @endif
        </div>

        <!-- Content -->
        <div class="content">
            @if(isset($headerText) && $headerText)
            <p style="color: #4a5568; font-size: 16px; margin-bottom: 25px; line-height: 1.6;">
                {{ $headerText }}
            </p>
            @endif
            
            <div class="question-box">
                <p class="question-text">{{ $question->title ?? $question->text }}</p>
                @if($question->description)
                <p class="question-meta">{{ $question->description }}</p>
                @endif
            </div>

            <p style="color: #4a5568; font-size: 15px; margin-bottom: 20px;">
                👇 Click your answer below to submit instantly:
            </p>

            <!-- Options -->
            @if(in_array($question->type, ['single_choice', 'multiple_choice', 'radio', 'select', 'yes_no', 'yesno']))
            <div class="options-container">
                @foreach($options as $option)
                <a href="{{ $option['url'] }}" class="option-button">
                    {{ $option['text'] }}
                </a>
                @endforeach
            </div>
            @elseif(in_array($question->type, ['rating', 'scale']))
            <div class="rating-container">
                @foreach($options as $option)
                <a href="{{ $option['url'] }}" class="rating-button">
                    {{ $option['text'] }}
                </a>
                @endforeach
            </div>
            @endif

            <!-- Fallback Link -->
            <div class="fallback-link">
                <p style="margin: 0 0 8px 0; color: #718096;">
                    Email not displaying correctly?
                </p>
                <a href="{{ $fallbackUrl }}">Open survey in browser</a>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            @if(isset($footerText) && $footerText)
            <p style="margin: 0 0 15px 0; color: #4a5568; font-size: 15px;">
                {{ $footerText }}
            </p>
            @endif
            <p style="margin: 0;">
                Powered by <strong>QSights</strong>
            </p>
            <p class="footer-note">
                This is a one-time survey link. Your response will be recorded instantly.
            </p>
        </div>
    </div>
</body>
</html>
