"use client";

import React, { useState, useEffect } from "react";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  TrendingUp,
  Download,
  Filter,
  Calendar,
  Building2,
  FolderOpen,
  Activity,
  Users,
  FileText,
  Clock,
  Minus,
} from "lucide-react";
import { 
  organizationsApi, 
  programsApi, 
  activitiesApi, 
  participantsApi 
} from "@/lib/api";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";

export default function ReportsPage() {
  const [filters, setFilters] = useState({
    organization: "all",
    program: "all",
    activityType: "all",
    dateRange: "30days",
    startDate: "",
    endDate: "",
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    loadData();

    // Listen for global search events
    const handleGlobalSearch = (e: CustomEvent) => {
      if (e.detail.pathname === '/reports') {
        setSearchQuery(e.detail.query);
      }
    };

    const handleGlobalSearchClear = () => {
      setSearchQuery("");
    };

    window.addEventListener('global-search' as any, handleGlobalSearch);
    window.addEventListener('global-search-clear' as any, handleGlobalSearchClear);

    return () => {
      window.removeEventListener('global-search' as any, handleGlobalSearch);
      window.removeEventListener('global-search-clear' as any, handleGlobalSearchClear);
    };
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      // Get current user to check role and programId
      const userResponse = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      let user = null;
      if (userResponse.ok) {
        const userData = await userResponse.json();
        user = userData.user;
        setCurrentUser(user);
      }
      
      // If user is program-admin, program-manager, or program-moderator, filter by their program
      if (user && user.programId && ['program-admin', 'program-manager', 'program-moderator'].includes(user.role)) {
        const [orgsData, progsData, actsData, partsData] = await Promise.all([
          organizationsApi.getAll().catch(() => []),
          programsApi.getAll({ program_id: user.programId }).catch(() => []),
          activitiesApi.getAll({ program_id: user.programId }).catch(() => []),
          participantsApi.getAll({ program_id: user.programId }).catch(() => []),
        ]);
        setOrganizations(orgsData);
        setPrograms(progsData);
        setActivities(actsData);
        setParticipants(partsData);
      } else {
        // Super-admin, admin, or other roles see all data
        const [orgsData, progsData, actsData, partsData] = await Promise.all([
          organizationsApi.getAll().catch(() => []),
          programsApi.getAll().catch(() => []),
          activitiesApi.getAll().catch(() => []),
          participantsApi.getAll().catch(() => []),
        ]);
        setOrganizations(orgsData);
        setPrograms(progsData);
        setActivities(actsData);
        setParticipants(partsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filter data based on current filters
  const getFilteredActivities = () => {
    let filtered = activities;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(a => 
        a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.organization !== "all") {
      filtered = filtered.filter(a => a.organization_id === filters.organization);
    }

    if (filters.program !== "all") {
      filtered = filtered.filter(a => a.program_id === filters.program);
    }

    if (filters.activityType !== "all") {
      filtered = filtered.filter(a => a.type === filters.activityType);
    }

    // Date filtering
    if (filters.dateRange !== "custom") {
      const now = new Date();
      let startDate = new Date();
      
      switch (filters.dateRange) {
        case "7days":
          startDate.setDate(now.getDate() - 7);
          break;
        case "30days":
          startDate.setDate(now.getDate() - 30);
          break;
        case "90days":
          startDate.setDate(now.getDate() - 90);
          break;
        case "6months":
          startDate.setMonth(now.getMonth() - 6);
          break;
        case "1year":
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(a => {
        const activityDate = new Date(a.created_at);
        return activityDate >= startDate;
      });
    } else if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      filtered = filtered.filter(a => {
        const activityDate = new Date(a.created_at);
        return activityDate >= start && activityDate <= end;
      });
    }

    return filtered;
  };

  const filteredActivities = getFilteredActivities();
  
  // Calculate statistics from real data (Active + Anonymous, excluding Preview)
  const totalResponses = filteredActivities.reduce((sum, a) => sum + (a.responses_count || 0), 0);
  const totalActiveParticipants = filteredActivities.reduce((sum, a) => sum + ((a.active_participants_count || 0) + (a.anonymous_participants_count || 0)), 0);
  const totalParticipantsResponded = filteredActivities.reduce((sum, a) => sum + (a.participants_responded_count || 0), 0);
  const completionRate = totalActiveParticipants > 0 ? Math.round((totalParticipantsResponded / totalActiveParticipants) * 100) : 0;

  const stats = [
    {
      title: "Total Responses",
      value: totalResponses.toString(),
      icon: FileText,
      variant: "blue" as const,
    },
    {
      title: "Active Participants",
      value: totalParticipantsResponded.toString(),
      icon: Users,
      variant: "green" as const,
    },
    {
      title: "Completion Rate",
      value: `${completionRate}%`,
      icon: TrendingUp,
      variant: "purple" as const,
    },
    {
      title: "Avg. Response Time",
      value: "0m",
      icon: Clock,
      variant: "orange" as const,
    },
  ];

  const getTrendIcon = (trend: string) => {
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (trend: string) => {
    return "text-gray-500";
  };

  const hasData = filteredActivities.length > 0;

  const exportToPDF = () => {
    // Create CSV content from the filtered activities data
    const headers = ['Activity', 'Type', 'Program', 'Active', 'Anonymous', 'Total', 'Responded', 'Responses', 'Completion Rate', 'Status'];
    const rows = filteredActivities.map(activity => {
      const active = activity.active_participants_count || 0;
      const anonymous = activity.anonymous_participants_count || 0;
      const participants = active + anonymous;
      const responded = activity.participants_responded_count || 0;
      const responses = activity.responses_count || 0;
      const completion = participants > 0 ? Math.round((responded / participants) * 100) : 0;
      
      return [
        activity.name,
        activity.type,
        String(activity.program_id || '').substring(0, 8).toUpperCase() || 'N/A',
        active,
        anonymous,
        participants,
        responded,
        responses,
        `${completion}%`,
        activity.status
      ];
    });

    // Create a simple text report
    let content = 'REPORTS & ANALYTICS\n\n';
    content += `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
    content += `SUMMARY STATISTICS\n`;
    content += `Total Responses: ${totalResponses}\n`;
    content += `Active Participants: ${totalParticipantsResponded}\n`;
    content += `Completion Rate: ${completionRate}%\n\n`;
    content += `ACTIVITY BREAKDOWN\n\n`;
    content += headers.join('\t') + '\n';
    content += '-'.repeat(100) + '\n';
    rows.forEach(row => {
      content += row.join('\t') + '\n';
    });

    // Create a blob and download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-analytics-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    // Create CSV content
    const headers = ['Activity', 'Code', 'Type', 'Program', 'Participants', 'Responded', 'Responses', 'Completion Rate', 'Status', 'Start Date', 'End Date'];
    const rows = filteredActivities.map(activity => {
      const participants = activity.participants_count || 0;
      const responded = activity.participants_responded_count || 0;
      const responses = activity.responses_count || 0;
      const completion = participants > 0 ? Math.round((responded / participants) * 100) : 0;
      
      return [
        `"${activity.name}"`,
        String(activity.id).padStart(8, '0'),
        activity.type,
        activity.program_id ? String(activity.program_id).padStart(8, '0') : 'N/A',
        participants,
        responded,
        responses,
        `${completion}%`,
        activity.status,
        activity.start_date || 'N/A',
        activity.end_date || 'N/A'
      ];
    });

    // Build CSV content
    let csvContent = 'REPORTS & ANALYTICS\n';
    csvContent += `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
    csvContent += `SUMMARY\n`;
    csvContent += `Total Responses,${totalResponses}\n`;
    csvContent += `Active Participants,${totalParticipantsResponded}\n`;
    csvContent += `Total Participants,${totalActiveParticipants}\n`;
    csvContent += `Completion Rate,${completionRate}%\n\n`;
    csvContent += `ACTIVITY BREAKDOWN\n`;
    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">
              View insights and analyze activity responses
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={exportToPDF}
              disabled={!hasData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
            <button 
              onClick={exportToExcel}
              disabled={!hasData}
              className="flex items-center gap-2 px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Filter className="w-5 h-5 text-qsights-blue" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Organization Filter - Only show for super-admin and admin */}
              {currentUser && !['program-admin', 'program-manager', 'program-moderator'].includes(currentUser.role) && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    Organization
                  </label>
                  <select
                    value={filters.organization}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, organization: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                  >
                    <option value="all">All Organizations</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Program Filter */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <FolderOpen className="w-4 h-4 text-gray-500" />
                  Program
                </label>
                <select
                  value={filters.program}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, program: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                >
                  <option value="all">All Programs</option>
                  {programs
                    .filter(p => filters.organization === "all" || p.organization_id === filters.organization)
                    .map(prog => (
                      <option key={prog.id} value={prog.id}>
                        {prog.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Activity Type Filter */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Activity className="w-4 h-4 text-gray-500" />
                  Activity Type
                </label>
                <select
                  value={filters.activityType}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, activityType: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="survey">Surveys</option>
                  <option value="poll">Polls</option>
                  <option value="assessment">Assessments</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, dateRange: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="1year">Last Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
            </div>

            {/* Custom Date Range */}
            {filters.dateRange === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Filter Actions */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setFilters({...filters})}
                className="px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors"
              >
                Apply Filters
              </button>
              <button
                onClick={() =>
                  setFilters({
                    organization: "all",
                    program: "all",
                    activityType: "all",
                    dateRange: "30days",
                    startDate: "",
                    endDate: "",
                  })
                }
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <GradientStatCard
                key={index}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                variant={stat.variant}
              />
            ))}
          </div>
        )}

        {!hasData && !loading ? (
          /* Placeholder State */
          <div className="space-y-4">
            {/* Placeholder Message */}
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-dashed border-blue-200">
              <CardContent className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
                  <BarChart3 className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  No Data Available Yet
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Reports will appear once responses are collected from your activities.
                  Start by creating and launching activities to gather insights.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <a
                    href="/activities/create"
                    className="px-6 py-3 bg-qsights-blue text-white rounded-lg font-medium hover:bg-qsights-blue/90 transition-colors"
                  >
                    Create Activity
                  </a>
                  <a
                    href="/activities"
                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    View Activities
                  </a>
                </div>
              </CardContent>
            </Card>


          </div>
        ) : (
          /* Activity Breakdown Table */
          <Card>
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-qsights-blue" />
                Activity Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Program
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participants
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Responded
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Responses
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completion
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredActivities.map((activity) => {
                      const activeParticipants = activity.active_participants_count || 0;
                      const anonymousParticipants = activity.anonymous_participants_count || 0;
                      const totalParticipants = activeParticipants + anonymousParticipants;
                      const responded = activity.participants_responded_count || 0;
                      const responses = activity.responses_count || 0;
                      const completion = totalParticipants > 0 ? Math.round((responded / totalParticipants) * 100) : 0;

                      return (
                        <tr key={activity.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-gray-900">{activity.name}</p>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">
                              {String(activity.id).padStart(8, '0')}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              activity.type === 'survey' ? 'bg-blue-100 text-blue-700' :
                              activity.type === 'poll' ? 'bg-green-100 text-green-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {activity.type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-900">
                              {activity.program_id ? String(activity.program_id).padStart(8, '0') : 'N/A'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-600">
                              ({activeParticipants} / {anonymousParticipants})
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900">{responded}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900">{responses}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 min-w-[60px]">
                                <div className="text-xs font-medium text-gray-900 mb-1">
                                  {completion}%
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      completion >= 80 ? 'bg-green-500' :
                                      completion >= 50 ? 'bg-blue-500' :
                                      completion >= 25 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(completion, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              activity.status === 'live' ? 'bg-green-100 text-green-700' :
                              activity.status === 'upcoming' ? 'bg-yellow-100 text-yellow-700' :
                              activity.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                              activity.status === 'closed' ? 'bg-blue-100 text-blue-700' :
                              activity.status === 'expired' ? 'bg-red-100 text-red-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {activity.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleBasedLayout>
  );
}
