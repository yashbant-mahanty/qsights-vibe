'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Send, Bot, User, ThumbsUp, ThumbsDown, Loader2, Sparkles,
  TrendingUp, BarChart3, PieChart, Table, AlertCircle, Copy,
  ChevronDown, ChevronUp, Lightbulb, Clock
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { aiAgentApi } from '@/lib/api';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface AIAgentChatProps {
  activityId: string;
  activityName?: string;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  data?: any;
  chartType?: string;
  sqlQuery?: string;
  intent?: any;
  cached?: boolean;
  responseTime?: number;
  timestamp: Date;
}

export default function AIAgentChat({ activityId, activityName }: AIAgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [suggestedQueries, setSuggestedQueries] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSuggestedQueries();
    loadHistory();
  }, [activityId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSuggestedQueries = async () => {
    try {
      const response = await aiAgentApi.getPopularQueries(activityId, 5);
      if (response.success && response.queries.length > 0) {
        setSuggestedQueries(response.queries.map(q => q.query_text));
      } else {
        // Default suggested queries
        setSuggestedQueries([
          'How many participants completed the survey?',
          'Show submission trends over time',
          'Which country has the highest completion rate?',
          'What is the average completion time?',
          'Compare responses by demographic groups',
        ]);
      }
    } catch (error) {
      // Use default queries on error
      setSuggestedQueries([
        'How many participants completed the survey?',
        'Show submission trends over time',
        'Which country has the highest completion rate?',
      ]);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await aiAgentApi.getHistory(sessionId, 10);
      if (response.success && response.history.length > 0) {
        const historyMessages: Message[] = response.history.flatMap((item) => [
          {
            id: `${item.id}-user`,
            type: 'user' as const,
            content: item.user_message,
            timestamp: new Date(item.created_at),
          },
          {
            id: item.id,
            type: 'ai' as const,
            content: item.ai_response,
            data: item.query_result,
            chartType: item.chart_type,
            timestamp: new Date(item.created_at),
          },
        ]);
        setMessages(historyMessages);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleSendMessage = async (query?: string) => {
    const messageText = query || input.trim();
    if (!messageText || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Get context from last 3 messages
      const context = messages
        .filter((m) => m.type === 'user' || m.type === 'ai')
        .slice(-6)
        .map((m) => ({
          user_message: m.type === 'user' ? m.content : '',
          ai_response: m.type === 'ai' ? m.content : '',
        }));

      const response = await aiAgentApi.ask({
        query: messageText,
        activity_id: activityId,
        session_id: sessionId,
        context,
      });

      if (response.success) {
        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: response.summary,
          data: response.data,
          chartType: response.chart_type,
          sqlQuery: response.sql_query,
          intent: response.intent,
          cached: response.cached,
          responseTime: response.response_time_ms,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } else {
        const errorMessage: Message = {
          id: `ai-error-${Date.now()}`,
          type: 'ai',
          content: `Sorry, I encountered an error: ${response.error || 'Unknown error'}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: `ai-error-${Date.now()}`,
        type: 'ai',
        content: `Sorry, I couldn't process your request: ${error.message || 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-qsights-cyan to-blue-600 rounded-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">AI Report Agent</h2>
            <p className="text-sm text-gray-600">
              Ask questions about {activityName || 'your event'} data in natural language
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block p-4 bg-gradient-to-br from-qsights-cyan to-blue-600 rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome to AI Report Agent!
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              I can help you analyze your event data. Try asking questions like:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
              {suggestedQueries.map((query, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="text-left justify-start h-auto py-3 px-4 hover:bg-qsights-cyan hover:text-white hover:border-qsights-cyan transition-colors"
                  onClick={() => handleSendMessage(query)}
                >
                  <Lightbulb className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-sm">{query}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gradient-to-br from-qsights-cyan to-blue-600 rounded-lg flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Analyzing your query...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t px-6 py-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your event data..."
            className="flex-1"
            disabled={loading}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-qsights-cyan to-blue-600 hover:from-qsights-cyan/90 hover:to-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: Ask about counts, trends, comparisons, or distributions in your data
        </p>
      </div>
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ message }: { message: Message }) {
  const [showDetails, setShowDetails] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const copySQL = () => {
    if (message.sqlQuery) {
      navigator.clipboard.writeText(message.sqlQuery);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    }
  };

  if (message.type === 'user') {
    return (
      <div className="flex items-start gap-3 justify-end">
        <div className="flex-1 max-w-2xl bg-gradient-to-br from-qsights-cyan to-blue-600 text-white rounded-lg shadow-sm p-4">
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
        <div className="p-2 bg-gray-200 rounded-lg flex-shrink-0">
          <User className="w-5 h-5 text-gray-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-gradient-to-br from-qsights-cyan to-blue-600 rounded-lg flex-shrink-0">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 max-w-3xl">
        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-4">
            {/* AI Response Text */}
            <p className="text-sm text-gray-700 leading-relaxed">{message.content}</p>

            {/* Visualization */}
            {message.data && message.chartType && (
              <div className="mt-4">
                <DataVisualization
                  data={message.data}
                  chartType={message.chartType}
                />
              </div>
            )}

            {/* Metadata Footer */}
            <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t">
              {message.cached && (
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Cached
                </span>
              )}
              {message.responseTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {message.responseTime}ms
                </span>
              )}
              <span className="text-gray-400">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>

            {/* Technical Details (Collapsible) */}
            {message.sqlQuery && (
              <div className="mt-2">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-qsights-cyan transition-colors"
                >
                  {showDetails ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  Technical Details
                </button>

                {showDetails && (
                  <div className="mt-2 space-y-2">
                    {message.intent && (
                      <div className="bg-gray-50 rounded p-2 text-xs">
                        <div className="font-semibold text-gray-700 mb-1">Intent:</div>
                        <div className="text-gray-600">
                          Type: {message.intent.intent_type} | Confidence: {(message.intent.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-50 rounded p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-700 text-xs">SQL Query:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copySQL}
                          className="h-6 px-2 text-xs"
                        >
                          {sqlCopied ? 'Copied!' : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                      <pre className="text-xs text-gray-600 overflow-x-auto">
                        <code>{message.sqlQuery}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Data Visualization Component
function DataVisualization({ data, chartType }: { data: any; chartType: string }) {
  if (chartType === 'card') {
    return (
      <div className="bg-gradient-to-br from-qsights-cyan to-blue-600 rounded-lg p-6 text-white text-center">
        <div className="text-4xl font-bold mb-2">{data.count || 0}</div>
        <div className="text-sm opacity-90">{data.metric || 'Total'}</div>
      </div>
    );
  }

  if (chartType === 'line' && data.trend) {
    const chartData = {
      labels: data.trend.map((item: any) => item.period),
      datasets: [
        {
          label: 'Count',
          data: data.trend.map((item: any) => item.count),
          borderColor: 'rgb(6, 182, 212)',
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          tension: 0.4,
        },
      ],
    };

    return (
      <div className="h-64">
        <Line
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
            },
          }}
        />
      </div>
    );
  }

  if (chartType === 'bar' && (data.comparison || data.ranking)) {
    const items = data.comparison || data.ranking || [];
    const chartData = {
      labels: items.map((item: any) => item.group || 'Unknown'),
      datasets: [
        {
          label: 'Count',
          data: items.map((item: any) => item.count || item.value || 0),
          backgroundColor: 'rgba(6, 182, 212, 0.8)',
          borderColor: 'rgb(6, 182, 212)',
          borderWidth: 1,
        },
      ],
    };

    return (
      <div className="h-64">
        <Bar
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
            },
          }}
        />
      </div>
    );
  }

  if (chartType === 'pie' && (data.comparison || data.ranking)) {
    const items = data.comparison || data.ranking || [];
    const chartData = {
      labels: items.map((item: any) => item.group || 'Unknown'),
      datasets: [
        {
          data: items.map((item: any) => item.count || item.value || 0),
          backgroundColor: [
            'rgba(6, 182, 212, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(236, 72, 153, 0.8)',
            'rgba(251, 146, 60, 0.8)',
          ],
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    };

    return (
      <div className="h-64 flex items-center justify-center">
        <Pie
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom' },
            },
          }}
        />
      </div>
    );
  }

  if (chartType === 'table') {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {Object.keys(data[0] || {}).map((key) => (
                <th
                  key={key}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row: any, idx: number) => (
              <tr key={idx}>
                {Object.values(row).map((value: any, i) => (
                  <td key={i} className="px-4 py-2 whitespace-nowrap text-gray-900">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="text-center text-gray-500 py-4">
      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
      <p className="text-sm">Unable to visualize this data type</p>
    </div>
  );
}
