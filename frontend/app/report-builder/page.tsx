"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/app-layout';
import AIAgentChat from '@/components/ai-agent-chat';
import AdvancedFilters from '@/components/report-builder/AdvancedFilters';
import DragDropReportBuilder from '@/components/report-builder/DragDropReportBuilder';
import ExportService from '@/components/report-builder/ExportService';
import { reportBuilderApi, activitiesApi, AIInsight, QuestionAnalytics } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3, PieChart, TrendingUp, Brain, Download, Filter,
  Save, Eye, Clock, Users, CheckCircle2, AlertCircle,
  Sparkles, FileText, LayoutGrid, Activity, MessageSquare
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
import ReactWordcloud from 'react-d3-cloud';

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

interface ReportBuilderProps {
  activityId: string;
  activityName?: string;
}

function ReportBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activityId = searchParams?.get('activity_id') || '';
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [advancedFilters, setAdvancedFilters] = useState<any[]>([]);
  const [selectedDimensions, setSelectedDimensions] = useState<any[]>([]);
  const [selectedMeasures, setSelectedMeasures] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'builder' | 'preview' | 'advanced'>('preview');
  const [activeTab, setActiveTab] = useState<'builder' | 'agent' | 'bi'>('builder');
  const [showFilters, setShowFilters] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activityId) {
      loadReportData();
    } else {
      loadActivities();
    }
  }, [activityId]);

  async function loadActivities() {
    try {
      setLoading(true);
      const data = await activitiesApi.getAll({});
      console.log('[Report Builder] Activities loaded:', data);
      setActivities(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('[Report Builder] Error loading activities:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load activities',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadReportData() {
    try {
      setLoading(true);
      console.log('[Report Builder] Loading analytics for activity:', activityId);
      const data = await reportBuilderApi.getAnalytics(activityId, filters, true);
      console.log('[Report Builder] Analytics data received:', data);
      setAnalytics(data.analytics);
      setAIInsights(data.ai_insights || []);
    } catch (error: any) {
      console.error('[Report Builder] Error loading report data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load report data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  if (!activityId) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Report Builder</h1>
            <p className="text-gray-600 mt-1">Generate intelligent reports with AI-powered insights</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-qsights-cyan"></div>
            </div>
          ) : activities.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Events Available</h2>
                <p className="text-gray-600 mb-4">Create an event first to generate reports</p>
                <Button onClick={() => router.push('/activities')}>
                  Go to Events
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Select an Event</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activities.map((activity) => (
                    <Card
                      key={activity.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-qsights-cyan"
                      onClick={() => router.push(`/report-builder?activity_id=${activity.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg">
                            {activity.title || activity.name || 'Untitled Event'}
                          </h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            activity.status === 'live' ? 'bg-green-100 text-green-700' :
                            activity.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {activity.status}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{activity.description}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {activity.participants_count || 0} participants
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {activity.responses_count || 0} responses
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">Loading report data...</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const overview = analytics?.overview || {};
  const participation = analytics?.participation || {};
  const questionBreakdown = analytics?.question_breakdown || [];

  // Show loading state
  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Report Builder</h1>
            <p className="text-gray-600 mt-1">Loading analytics data...</p>
          </div>
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-cyan mx-auto mb-4"></div>
              <p className="text-gray-600">Analyzing responses and generating insights...</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Show empty state if no analytics data
  if (!analytics || Object.keys(analytics).length === 0) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Report Builder</h1>
              <p className="text-gray-600 mt-1">Activity Analytics & AI-Powered Insights</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/report-builder')}>
              ← Back to Events
            </Button>
          </div>
          <Card>
            <CardContent className="p-12 text-center">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
              <p className="text-gray-600 mb-4">Unable to load analytics data for this event.</p>
              <Button onClick={() => loadReportData()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Get activity name
  const selectedActivity = activities.find(a => a.id === activityId);
  const activityName = selectedActivity?.title || selectedActivity?.name || 'Event';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Reports</h1>
            <p className="text-gray-600 mt-1">{activityName} - Analytics & Insights</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/report-builder')}>
              ← Back to Events
            </Button>
            {(activeTab === 'builder' || activeTab === 'bi') && (
              <>
                <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="w-4 h-4 mr-2" />
                  Filters {advancedFilters.length > 0 && `(${advancedFilters.length})`}
                </Button>
                <Button variant="outline">
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </Button>
                <ExportService 
                  activityId={activityId}
                  reportData={analytics}
                  chartRef={chartContainerRef}
                />
              </>
            )}
          </div>
        </div>

        {/* Tabs for Builder, BI Builder, and ASK Agent */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'builder' | 'bi' | 'agent')} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="builder" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Quick Reports
            </TabsTrigger>
            <TabsTrigger value="bi" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              BI Builder
            </TabsTrigger>
            <TabsTrigger value="agent" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              ASK Agent
            </TabsTrigger>
          </TabsList>

          {/* Report Builder Tab */}
          <TabsContent value="builder" className="space-y-6 mt-6">
            {/* AI Insights Section */}
        {aiInsights.length > 0 && (
          <Card className="mb-6 border-l-4 border-l-purple-500">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI-Powered Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiInsights.map((insight, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      insight.priority === 'critical' ? 'border-l-red-500 bg-red-50' :
                      insight.priority === 'high' ? 'border-l-orange-500 bg-orange-50' :
                      insight.priority === 'medium' ? 'border-l-blue-500 bg-blue-50' :
                      'border-l-gray-500 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm">{insight.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        insight.priority === 'critical' ? 'bg-red-200 text-red-800' :
                        insight.priority === 'high' ? 'bg-orange-200 text-orange-800' :
                        insight.priority === 'medium' ? 'bg-blue-200 text-blue-800' :
                        'bg-gray-200 text-gray-800'
                      }`}>
                        {insight.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{insight.description}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <Brain className="w-3 h-3" />
                      <span>Confidence: {insight.confidence_score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Responses</p>
                  <p className="text-3xl font-bold text-gray-900">{overview.total_responses || 0}</p>
                </div>
                <Users className="w-12 h-12 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completion Rate</p>
                  <p className="text-3xl font-bold text-green-600">{overview.completion_rate || 0}%</p>
                </div>
                <CheckCircle2 className="w-12 h-12 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Submitted</p>
                  <p className="text-3xl font-bold text-purple-600">{overview.submitted_responses || 0}</p>
                </div>
                <FileText className="w-12 h-12 text-purple-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-3xl font-bold text-amber-600">{overview.in_progress_responses || 0}</p>
                </div>
                <Clock className="w-12 h-12 text-amber-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Participation Trend Chart */}
        {participation.daily_participation && participation.daily_participation.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Participation Trend (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Line
                data={{
                  labels: participation.daily_participation.map((d: any) => d.date),
                  datasets: [
                    {
                      label: 'Total Responses',
                      data: participation.daily_participation.map((d: any) => d.count),
                      borderColor: 'rgb(59, 130, 246)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      tension: 0.4,
                    },
                    {
                      label: 'Submitted',
                      data: participation.daily_participation.map((d: any) => d.submitted_count),
                      borderColor: 'rgb(16, 185, 129)',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      tension: 0.4,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
                height={300}
              />
            </CardContent>
          </Card>
        )}

        {/* Question Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5" />
              Question-by-Question Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {questionBreakdown.length === 0 ? (
              <div className="text-center py-12">
                <LayoutGrid className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Question Data Available</h3>
                <p className="text-gray-600">
                  {analytics?.overview?.total_responses === 0 
                    ? "No responses have been submitted for this event yet."
                    : "Question analytics will appear here once responses are processed."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {questionBreakdown.map((question: QuestionAnalytics, index: number) => (
                  <QuestionChart key={question.question_id} question={question} index={index} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* BI Builder Tab */}
          <TabsContent value="bi" className="space-y-6 mt-6">
            {/* Advanced Filters Panel */}
            {showFilters && (
              <AdvancedFilters
                availableFields={{
                  demographics: [
                    { id: 'country', name: 'Country', type: 'text' },
                    { id: 'age', name: 'Age', type: 'number' },
                    { id: 'department', name: 'Department', type: 'text' },
                    { id: 'role', name: 'Role', type: 'text' },
                    { id: 'specialty', name: 'Specialty', type: 'text' },
                    { id: 'submitted_at', name: 'Submission Date', type: 'date' },
                  ],
                  questions: questionBreakdown.map((q: any) => ({
                    id: q.question_id,
                    question: q.question_title,
                    type: q.question_type,
                  })),
                }}
                onFiltersChange={setAdvancedFilters}
              />
            )}

            {/* Drag & Drop Report Builder */}
            <DragDropReportBuilder
              availableFields={{
                dimensions: [
                  { id: 'country', name: 'Country', type: 'dimension', dataType: 'text', category: 'demographic' },
                  { id: 'age_group', name: 'Age Group', type: 'dimension', dataType: 'text', category: 'demographic' },
                  { id: 'department', name: 'Department', type: 'dimension', dataType: 'text', category: 'demographic' },
                  { id: 'role', name: 'Role', type: 'dimension', dataType: 'text', category: 'demographic' },
                  { id: 'specialty', name: 'Specialty', type: 'dimension', dataType: 'text', category: 'demographic' },
                  { id: 'status', name: 'Completion Status', type: 'dimension', dataType: 'text', category: 'system' },
                  { id: 'submitted_date', name: 'Submission Date', type: 'dimension', dataType: 'date', category: 'system' },
                  { id: 'device_type', name: 'Device Type', type: 'dimension', dataType: 'text', category: 'system' },
                ],
                measures: [
                  { id: 'response_count', name: 'Response Count', type: 'measure', dataType: 'number', category: 'system' },
                  { id: 'avg_completion_time', name: 'Avg Completion Time', type: 'measure', dataType: 'number', category: 'system' },
                  { id: 'participation_rate', name: 'Participation Rate', type: 'measure', dataType: 'number', category: 'system' },
                  ...questionBreakdown.slice(0, 10).map((q: any) => ({
                    id: `q_${q.question_id}`,
                    name: q.question_title.substring(0, 40) + '...',
                    type: 'measure',
                    dataType: 'number',
                    category: 'question',
                  })),
                ],
              }}
              selectedDimensions={selectedDimensions}
              selectedMeasures={selectedMeasures}
              onDimensionsChange={setSelectedDimensions}
              onMeasuresChange={setSelectedMeasures}
              onGenerateReport={() => {
                console.log('Generating custom report:', { selectedDimensions, selectedMeasures, advancedFilters });
                toast({
                  title: 'Generating Report',
                  description: 'Custom report is being generated...',
                });
                loadReportData();
              }}
            />

            {/* Generated Report Display Area */}
            {(selectedDimensions.length > 0 || selectedMeasures.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Generated Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div ref={chartContainerRef} className="min-h-[400px] flex items-center justify-center">
                    {analytics ? (
                      <div className="w-full space-y-6">
                        {/* Preview of what would be generated */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-800">
                            <strong>Report Configuration:</strong><br/>
                            Dimensions: {selectedDimensions.map(d => d.field.name).join(', ') || 'None'}<br/>
                            Measures: {selectedMeasures.map(m => `${m.aggregation}(${m.field.name})`).join(', ') || 'None'}<br/>
                            Filters: {advancedFilters.length} active
                          </p>
                        </div>
                        
                        {/* Show existing analytics as placeholder */}
                        <div className="grid grid-cols-4 gap-4">
                          <div className="bg-white p-4 rounded-lg border text-center">
                            <p className="text-sm text-gray-600">Total Records</p>
                            <p className="text-2xl font-bold">{overview.total_responses || 0}</p>
                          </div>
                          <div className="bg-white p-4 rounded-lg border text-center">
                            <p className="text-sm text-gray-600">Completion Rate</p>
                            <p className="text-2xl font-bold text-green-600">{overview.completion_rate || 0}%</p>
                          </div>
                          <div className="bg-white p-4 rounded-lg border text-center">
                            <p className="text-sm text-gray-600">Submitted</p>
                            <p className="text-2xl font-bold">{overview.submitted_responses || 0}</p>
                          </div>
                          <div className="bg-white p-4 rounded-lg border text-center">
                            <p className="text-sm text-gray-600">In Progress</p>
                            <p className="text-2xl font-bold">{overview.in_progress_responses || 0}</p>
                          </div>
                        </div>

                        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                          ℹ️ <strong>Note:</strong> Backend API enhancement needed to fully support custom dimension/measure queries. 
                          Currently showing existing analytics. Once backend is updated, this will display your custom report.
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400">
                        <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p>Configure dimensions and measures above, then click "Generate Report"</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ASK Agent Tab */}
          <TabsContent value="agent" className="mt-6">
            <Card className="h-[calc(100vh-250px)] overflow-hidden">
              <AIAgentChat 
                activityId={activityId}
                activityName={activityName}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

export default function ReportBuilderPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <ReportBuilderContent />
    </Suspense>
  );
}

// Question Chart Component
function QuestionChart({ question, index }: { question: QuestionAnalytics; index: number }) {
  const chartType = question.suggested_chart_type;

  const renderChart = () => {
    if (chartType === 'wordcloud' && question.chart_data) {
      const words = question.chart_data.map((item: any) => ({
        text: item.word,
        value: item.count,
      }));

      return (
        <div className="h-64">
          <ReactWordcloud
            data={words}
            fontSize={(word) => Math.log2(word.value) * 10}
            rotate={(word) => (word.value % 2 === 0 ? 0 : 90)}
          />
        </div>
      );
    }

    if (chartType === 'pie' && question.chart_data) {
      return (
        <Pie
          data={{
            labels: question.chart_data.map((item: any) => item.label),
            datasets: [
              {
                data: question.chart_data.map((item: any) => item.count),
                backgroundColor: [
                  'rgba(59, 130, 246, 0.8)',
                  'rgba(16, 185, 129, 0.8)',
                  'rgba(245, 158, 11, 0.8)',
                  'rgba(239, 68, 68, 0.8)',
                  'rgba(139, 92, 246, 0.8)',
                  'rgba(236, 72, 153, 0.8)',
                ],
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
              },
            },
          }}
          height={250}
        />
      );
    }

    if (chartType === 'bar' && question.chart_data) {
      return (
        <Bar
          data={{
            labels: question.chart_data.map((item: any) => item.label),
            datasets: [
              {
                label: 'Responses',
                data: question.chart_data.map((item: any) => item.count),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
              },
            },
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          }}
          height={250}
        />
      );
    }

    return (
      <div className="text-center py-8 text-gray-500">
        <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-20" />
        <p>No chart available for this question type</p>
      </div>
    );
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-lg">
            Q{index + 1}. {question.question_title}
          </h4>
          <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
            {question.question_type}
          </span>
        </div>
        <div className="flex gap-4 text-sm text-gray-600">
          <span>{question.answer_count} responses</span>
          <span>•</span>
          <span>{question.response_rate}% response rate</span>
        </div>
      </div>
      {renderChart()}
      {question.statistics && (
        <div className="mt-4 grid grid-cols-4 gap-4 text-center text-sm">
          {question.statistics.average !== undefined && (
            <div>
              <p className="text-gray-600">Average</p>
              <p className="font-semibold">{question.statistics.average}</p>
            </div>
          )}
          {question.statistics.median !== undefined && (
            <div>
              <p className="text-gray-600">Median</p>
              <p className="font-semibold">{question.statistics.median}</p>
            </div>
          )}
          {question.statistics.min !== undefined && (
            <div>
              <p className="text-gray-600">Min</p>
              <p className="font-semibold">{question.statistics.min}</p>
            </div>
          )}
          {question.statistics.max !== undefined && (
            <div>
              <p className="text-gray-600">Max</p>
              <p className="font-semibold">{question.statistics.max}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
