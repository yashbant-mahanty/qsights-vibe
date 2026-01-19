"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  Calendar,
  Download,
  RefreshCw,
  Award,
  Bell,
  AlertCircle
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { toast } from "@/components/ui/toast";

interface TeamAnalytics {
  team_size: number;
  activity_stats: {
    total_activities: number;
    completed_activities: number;
    in_progress_activities: number;
    pending_activities: number;
  };
  notification_stats: {
    total_sent: number;
    total_read: number;
    read_rate: number;
  };
  top_performers: Array<{
    id: number;
    name: string;
    email: string;
    completed_count: number;
  }>;
  completion_trend: Array<{
    date: string;
    count: number;
  }>;
  date_range: {
    start: string | null;
    end: string | null;
  };
}

export default function TeamAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
  const [managerInfo, setManagerInfo] = useState<any>(null);
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [programs, setPrograms] = useState<any[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  };

  useEffect(() => {
    checkManagerAccess();
  }, []);

  useEffect(() => {
    if (managerInfo) {
      loadAnalytics();
    }
  }, [selectedProgram, startDate, endDate, managerInfo]);

  const checkManagerAccess = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        router.push('/dashboard');
        return;
      }

      const data = await response.json();
      setManagerInfo(data.user);
      
      // Load programs
      await loadPrograms();
    } catch (error) {
      console.error('Error checking manager access:', error);
      router.push('/dashboard');
    }
  };

  const loadPrograms = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_URL}/programs`, {
        headers,
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPrograms(data.programs || []);
      }
    } catch (error) {
      console.error('Error loading programs:', error);
    }
  };

  const loadAnalytics = async () => {
    if (!managerInfo) return;

    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const params = new URLSearchParams();
      
      if (selectedProgram !== "all") {
        params.append('program_id', selectedProgram);
      }
      if (startDate) {
        params.append('start_date', startDate);
      }
      if (endDate) {
        params.append('end_date', endDate);
      }

      const response = await fetch(
        `${API_URL}/hierarchy/managers/${managerInfo.id}/analytics?${params.toString()}`,
        { headers, credentials: 'include' }
      );

      const data = await response.json();

      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        throw new Error(data.message || 'Failed to load analytics');
      }
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load analytics",
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!analytics) return;

    const csvContent = [
      ['Team Analytics Report'],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Team Statistics'],
      ['Team Size', analytics.team_size],
      [''],
      ['Activity Statistics'],
      ['Total Activities', analytics.activity_stats.total_activities],
      ['Completed', analytics.activity_stats.completed_activities],
      ['In Progress', analytics.activity_stats.in_progress_activities],
      ['Pending', analytics.activity_stats.pending_activities],
      [''],
      ['Notification Statistics'],
      ['Total Sent', analytics.notification_stats.total_sent],
      ['Total Read', analytics.notification_stats.total_read],
      ['Read Rate', `${analytics.notification_stats.read_rate}%`],
      [''],
      ['Top Performers'],
      ['Name', 'Email', 'Completed Activities'],
      ...analytics.top_performers.map(p => [p.name, p.email, p.completed_count])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success!",
      description: "Analytics exported to CSV",
      variant: "success"
    });
  };

  const completionRate = analytics?.activity_stats.total_activities 
    ? Math.round((analytics.activity_stats.completed_activities / analytics.activity_stats.total_activities) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Team Analytics & Reports</h1>
              <p className="text-gray-600 mt-1">
                Performance insights and activity tracking
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/manager-dashboard')}
              >
                Back to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={loadAnalytics}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleExport} disabled={!analytics}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="program">Program</Label>
                <select
                  id="program"
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="all">All Programs</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="py-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm text-gray-600">Loading analytics...</p>
          </div>
        ) : !analytics ? (
          <div className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">Unable to load analytics data</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                      <Activity className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Activities</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.activity_stats.total_activities}</p>
                  <p className="text-xs text-gray-500 mt-2">Assigned to team</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-green-50 text-green-600">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Completion Rate</p>
                  <p className="text-3xl font-bold text-gray-900">{completionRate}%</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {analytics.activity_stats.completed_activities} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-qsights-light text-qsights-cyan">
                      <Bell className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Notification Read Rate</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.notification_stats.read_rate}%</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {analytics.notification_stats.total_read} of {analytics.notification_stats.total_sent}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-orange-50 text-orange-600">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Team Size</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.team_size}</p>
                  <p className="text-xs text-gray-500 mt-2">Team members</p>
                </CardContent>
              </Card>
            </div>

            {/* Activity Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Completed</span>
                      <span className="text-sm font-semibold text-green-600">
                        {analytics.activity_stats.completed_activities}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${analytics.activity_stats.total_activities ? 
                            (analytics.activity_stats.completed_activities / analytics.activity_stats.total_activities * 100) : 0}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">In Progress</span>
                      <span className="text-sm font-semibold text-blue-600">
                        {analytics.activity_stats.in_progress_activities}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${analytics.activity_stats.total_activities ? 
                            (analytics.activity_stats.in_progress_activities / analytics.activity_stats.total_activities * 100) : 0}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Pending</span>
                      <span className="text-sm font-semibold text-gray-600">
                        {analytics.activity_stats.pending_activities}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gray-400 h-2 rounded-full"
                        style={{
                          width: `${analytics.activity_stats.total_activities ? 
                            (analytics.activity_stats.pending_activities / analytics.activity_stats.total_activities * 100) : 0}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Top Performers
                  </CardTitle>
                  <span className="text-sm text-gray-500">
                    By activities completed
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {analytics.top_performers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No activity data available yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics.top_performers.map((performer, index) => (
                      <div key={performer.id} className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-600' :
                            'bg-blue-500'
                          }`}>
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {performer.name}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {performer.email}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">
                              {performer.completed_count}
                            </p>
                            <p className="text-xs text-gray-500">completed</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completion Trend */}
            {analytics.completion_trend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    7-Day Completion Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-around gap-2">
                    {analytics.completion_trend.map((day, index) => {
                      const maxCount = Math.max(...analytics.completion_trend.map(d => d.count));
                      const height = maxCount > 0 ? (day.count / maxCount * 100) : 0;
                      
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2">
                          <div className="relative w-full bg-blue-200 rounded-t-lg hover:bg-blue-300 transition-colors"
                               style={{ height: `${height}%`, minHeight: day.count > 0 ? '20px' : '0' }}>
                            <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-sm font-semibold text-gray-900">
                              {day.count}
                            </span>
                          </div>
                          <span className="text-xs text-gray-600">
                            {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
