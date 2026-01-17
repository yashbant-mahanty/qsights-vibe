<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Program Overview Report</title>
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
            border-bottom: 2px solid #10B981;
            padding-bottom: 15px;
        }
        .header h1 {
            color: #10B981;
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
            background: #10B981;
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
            width: 33.33%;
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
            color: #10B981;
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
        <h1>Program Overview Report</h1>
        <div class="subtitle">{{ $program->name }}</div>
        <div class="subtitle">Generated: {{ $generatedAt }}</div>
    </div>

    <div class="section">
        <div class="section-title">Program Summary</div>
        <div class="metrics-grid">
            <div class="metric-row">
                <div class="metric-cell">
                    <div class="metric-label">Total Activities</div>
                    <div class="metric-value">{{ $totalActivities }}</div>
                </div>
                <div class="metric-cell">
                    <div class="metric-label">Live Activities</div>
                    <div class="metric-value">{{ $liveActivities }}</div>
                </div>
                <div class="metric-cell">
                    <div class="metric-label">Total Participants</div>
                    <div class="metric-value">{{ $totalParticipants }}</div>
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Activity Statistics</div>
        <table>
            <thead>
                <tr>
                    <th>Activity Name</th>
                    <th>Status</th>
                    <th>Start Date</th>
                    <th>Responses</th>
                    <th>Submitted</th>
                    <th>Completion %</th>
                </tr>
            </thead>
            <tbody>
                @forelse($activityStats as $stat)
                    <tr>
                        <td>{{ $stat['activity_name'] }}</td>
                        <td>{{ ucfirst($stat['status']) }}</td>
                        <td>{{ $stat['start_date'] }}</td>
                        <td>{{ $stat['response_count'] }}</td>
                        <td>{{ $stat['submitted_count'] }}</td>
                        <td>{{ $stat['completion_rate'] }}%</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="6">No activities available</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="footer">
        QSights Platform - Program Overview Report
    </div>
</body>
</html>
