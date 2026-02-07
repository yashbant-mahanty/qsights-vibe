"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";
import {
  Users,
  Activity,
  CheckCircle,
  Clock,
  Globe,
  BarChart3,
  Calendar,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { activitiesApi, participantsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardContent() {
  const { currentUser: authUser, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalParticipants: 0,
    activeParticipants: 0,
    completedActivities: 0,
    pendingResponses: 0,
  });

  useEffect(() => {
    if (!authLoading && authUser) {
      loadDashboardData();
    }
  }, [authLoading, authUser]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      
      // Use authUser from AuthContext instead of fetching
      if (!authUser?.programId) {
        setLoading(false);
        return;
      }

      const [participantsData, activitiesData] = await Promise.all([
        participantsApi.getAll({ program_id: authUser.programId }).catch(() => []),
        activitiesApi.getAll({ program_id: authUser.programId }).catch(() => []),
      ]);

      setActivities(activitiesData.slice(0, 5)); // Show only 5 activities

      setStats({
        totalParticipants: participantsData.length,
        activeParticipants: participantsData.filter((p: any) => p.status === 'active').length,
        completedActivities: activitiesData.filter((a: any) => (a.responses_count || 0) > 0).length,
        pendingResponses: activitiesData.reduce((sum: number, a: any) => {
          const expected = (a.active_participants_count || 0) + (a.anonymous_participants_count || 0);
          const responses = a.responses_count || 0;
          return sum + Math.max(0, expected - responses);
        }, 0),
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-cyan"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor and manage activity participation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GradientStatCard
          title="Total Participants"
          value={stats.totalParticipants.toString()}
          subtitle="Across all activities"
          icon={Users}
          variant="blue"
        />
        <GradientStatCard
          title="Active Participants"
          value={stats.activeParticipants.toString()}
          subtitle={`${stats.totalParticipants > 0 ? Math.round((stats.activeParticipants/stats.totalParticipants)*100) : 0}% of total`}
          icon={UserCheck}
          variant="green"
        />
        <GradientStatCard
          title="Events Completed"
          value={stats.completedActivities.toString()}
          subtitle={`${activities.length} total events`}
          icon={CheckCircle}
          variant="purple"
        />
        <GradientStatCard
          title="Pending Responses"
          value={stats.pendingResponses.toString()}
          subtitle={stats.pendingResponses > 0 ? 'Needs attention' : 'All current'}
          icon={AlertCircle}
          variant="orange"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events Found</h3>
              <p className="text-sm text-gray-500">Events will appear here once they are created.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{activity.name}</h4>
                    <p className="text-sm text-gray-500">
                      {activity.participants_count || 0} participants • {activity.responses_count || 0} responses
                    </p>
                  </div>
                  <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
