"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  User,
  Mail,
  Briefcase,
  Award,
  Activity,
  Clock,
  CheckCircle2,
  Circle,
  PlayCircle,
  XCircle,
  TrendingUp,
  Calendar
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { toast } from "@/components/ui/toast";

interface TeamMemberProfileModalProps {
  memberId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

interface MemberProfile {
  id: number;
  name: string;
  email: string;
  role?: {
    role_name: string;
    role_type: string;
  };
  manager?: {
    name: string;
    email: string;
  };
  activity_stats: {
    total_assigned: number;
    completed: number;
    in_progress: number;
    not_started: number;
    avg_score: number | null;
  };
  recent_activities: Array<{
    id: number;
    title: string;
    status: string;
    completed_at: string | null;
    score: number | null;
  }>;
  notification_stats: {
    total_received: number;
    total_read: number;
    read_rate: number;
  };
}

export default function TeamMemberProfileModal({
  memberId,
  isOpen,
  onClose,
}: TeamMemberProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<MemberProfile | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  };

  useEffect(() => {
    if (isOpen && memberId) {
      loadMemberProfile();
    }
  }, [isOpen, memberId]);

  const loadMemberProfile = async () => {
    if (!memberId) return;

    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(
        `${API_URL}/hierarchy/team-members/${memberId}`,
        { headers, credentials: 'include' }
      );

      const data = await response.json();

      if (data.success) {
        setProfile(data.member);
      } else {
        throw new Error(data.message || 'Failed to load member profile');
      }
    } catch (error: any) {
      console.error('Error loading member profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load member profile",
        variant: "error"
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'in_progress':
      case 'in progress':
        return <PlayCircle className="w-4 h-4 text-blue-600" />;
      case 'not_started':
      case 'not started':
        return <Circle className="w-4 h-4 text-gray-400" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    const colorClasses = {
      'completed': 'bg-green-100 text-green-700 border-green-200',
      'in_progress': 'bg-blue-100 text-blue-700 border-blue-200',
      'in progress': 'bg-blue-100 text-blue-700 border-blue-200',
      'not_started': 'bg-gray-100 text-gray-600 border-gray-200',
      'not started': 'bg-gray-100 text-gray-600 border-gray-200',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
        colorClasses[statusLower as keyof typeof colorClasses] || 'bg-gray-100 text-gray-600 border-gray-200'
      }`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const completionRate = profile?.activity_stats.total_assigned
    ? Math.round((profile.activity_stats.completed / profile.activity_stats.total_assigned) * 100)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Team Member Profile</DialogTitle>
          <DialogDescription>
            Detailed activity and performance information
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">Loading profile...</p>
          </div>
        ) : !profile ? (
          <div className="py-12 text-center">
            <XCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600">Unable to load member profile</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Member Info Header */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-full shadow-sm">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{profile.name}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {profile.email}
                    </span>
                    {profile.role && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {profile.role.role_name} ({profile.role.role_type})
                      </span>
                    )}
                  </div>
                  {profile.manager && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Reports to:</span> {profile.manager.name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Performance Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-gray-600">Total Activities</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {profile.activity_stats.total_assigned}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-gray-600">Completed</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {profile.activity_stats.completed}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-qsights-cyan" />
                    <span className="text-xs font-medium text-gray-600">Completion Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-qsights-cyan">
                    {completionRate}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-yellow-600" />
                    <span className="text-xs font-medium text-gray-600">Avg Score</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {profile.activity_stats.avg_score 
                      ? Math.round(profile.activity_stats.avg_score) 
                      : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Activity Status Breakdown */}
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Activity Status Breakdown</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-700">Completed</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${profile.activity_stats.total_assigned ? 
                              (profile.activity_stats.completed / profile.activity_stats.total_assigned * 100) : 0}%`
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                        {profile.activity_stats.completed}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-700">In Progress</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${profile.activity_stats.total_assigned ? 
                              (profile.activity_stats.in_progress / profile.activity_stats.total_assigned * 100) : 0}%`
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                        {profile.activity_stats.in_progress}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Circle className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">Not Started</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gray-400 h-2 rounded-full"
                          style={{
                            width: `${profile.activity_stats.total_assigned ? 
                              (profile.activity_stats.not_started / profile.activity_stats.total_assigned * 100) : 0}%`
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                        {profile.activity_stats.not_started}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Recent Activities</h4>
                {profile.recent_activities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No activities assigned yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profile.recent_activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          {getStatusIcon(activity.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(activity.status)}
                            {activity.completed_at && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(activity.completed_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        {activity.score !== null && (
                          <div className="flex-shrink-0">
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900">{activity.score}</p>
                              <p className="text-xs text-gray-500">score</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notification Stats */}
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Notification Engagement</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {profile.notification_stats.total_received}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Total Received</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {profile.notification_stats.total_read}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Read</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {profile.notification_stats.read_rate}%
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Read Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Footer Actions */}
            <div className="flex justify-end">
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
