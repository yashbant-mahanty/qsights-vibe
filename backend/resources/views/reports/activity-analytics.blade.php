<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Activity Analytics Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #4F46E5;
            padding-bottom: 15px;
        }
        .header h1 {
            color: #4F46E5;
            margin: 0;
            font-size: 24px;
        }
        .header .subtitle {
            color: #666;
            font-size: 14px;
            margin-top: 5px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            background: #4F46E5;
            color: white;
            padding: 8px 12px;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .metrics-grid {
            display: table;
            width: 100%;
            margin-bottom: 15px;
        }
        .metric-row {
            display: table-row;
        }
        .metric-cell {
            display: table-cell;
            width: 50%;
            padding: 10px;
            border: 1px solid #ddd;
        }
        .metric-label {
            font-weight: bold;
            color: #666;
            font-size: 11px;
        }
        .metric-value {
            font-size: 20px;
            color: #4F46E5;
            margin-top: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        table th {
            background: #F3F4F6;
            padding: 8px;
            text-align: left;
            font-size: 11px;
            border: 1px solid #ddd;
        }
        table td {
            padding: 8px;
            border: 1px solid #ddd;
            font-size: 11px;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Activity Analytics Report</h1>
        <div class="subtitle">{{ $activity->name }}</div>
        <div class="subtitle">Program: {{ $activity->program->name }}</div>
        <div class="subtitle">Generated: {{ $generatedAt }}</div>
    </div>

    <div class="section">
        <div class="section-title">Participation Overview</div>
        <div class="metrics-grid">
            <div class="metric-row">
                <div class="metric-cell">
                    <div class="metric-label">Total Participants</div>
                    <div class="metric-value">{{ $totalParticipants }}</div>
                </div>
                <div class="metric-cell">
                    <div class="metric-label">Total Responses</div>
                    <div class="metric-value">{{ $totalResponses }}</div>
                </div>
            </div>
            <div class="metric-row">
                <div class="metric-cell">
                    <div class="metric-label">Submitted Responses</div>
                    <div class="metric-value">{{ $submittedResponses }}</div>
                </div>
                <div class="metric-cell">
                    <div class="metric-label">In Progress</div>
                    <div class="metric-value">{{ $inProgressResponses }}</div>
                </div>
            </div>
            <div class="metric-row">
                <div class="metric-cell">
                    <div class="metric-label">Participation Rate</div>
                    <div class="metric-value">{{ $participationRate }}%</div>
                </div>
                <div class="metric-cell">
                    <div class="metric-label">Completion Rate</div>
                    <div class="metric-value">{{ $completionRate }}%</div>
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Completion Distribution</div>
        <table>
            <thead>
                <tr>
                    <th>Range</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody>
                @forelse($completionDistribution as $range => $count)
                    <tr>
                        <td>{{ $range }}</td>
                        <td>{{ $count }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="2">No data available</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Question-Level Completion</div>
        <table>
            <thead>
                <tr>
                    <th>Question</th>
                    <th>Type</th>
                    <th>Answers</th>
                    <th>Completion %</th>
                </tr>
            </thead>
            <tbody>
                @forelse($questionCompletion as $q)
                    <tr>
                        <td>{{ $q['title'] }}</td>
                        <td>{{ $q['type'] }}</td>
                        <td>{{ $q['answer_count'] }}</td>
                        <td>{{ $q['completion_rate'] }}%</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="4">No questions available</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="footer">
        QSights Platform - Activity Analytics Report
    </div>
</body>
</html>
