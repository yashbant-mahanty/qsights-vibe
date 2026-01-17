"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  ClipboardCheck,
  Calendar,
  Settings,
  Users,
  BarChart3,
  Play,
  Pause,
  CheckCircle,
  Edit,
  Send,
  FileText,
  Clock,
  Mail,
  RefreshCw,
} from "lucide-react";
import { evaluationEventsApi, type EvaluationEvent, type EvaluationAssignment } from "@/lib/api";
import { toast } from "@/components/ui/toast";

export default function EvaluationEventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<EvaluationEvent | null>(null);
  const [assignments, setAssignments] = useState<EvaluationAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  async function loadEventData() {
    try {
      setLoading(true);
      const [eventData, assignmentsData] = await Promise.all([
        evaluationEventsApi.get(eventId),
        evaluationEventsApi.getMyAssignments(eventId).catch(() => []),
      ]);
      setEvent(eventData);
      setAssignments(assignmentsData);
    } catch (err) {
      console.error('Error loading event:', err);
      toast({ title: "Error", description: "Failed to load evaluation event", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  const handleActivate = async () => {
    try {
      await evaluationEventsApi.activate(eventId);
      await loadEventData();
      toast({ title: "Success!", description: "Evaluation event activated!", variant: "success" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : 'Failed to activate', variant: "error" });
    }
  };

  const handlePause = async () => {
    try {
      await evaluationEventsApi.pause(eventId);
      await loadEventData();
      toast({ title: "Success!", description: "Evaluation event paused!", variant: "success" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : 'Failed to pause', variant: "error" });
    }
  };

  const handleComplete = async () => {
    if (!confirm('Are you sure you want to mark this evaluation as complete? This cannot be undone.')) return;
    try {
      await evaluationEventsApi.complete(eventId);
      await loadEventData();
      toast({ title: "Success!", description: "Evaluation event completed!", variant: "success" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : 'Failed to complete', variant: "error" });
    }
  };

  const handleSendReminder = async (assignmentId: string) => {
    try {
      setSendingReminder(assignmentId);
      await evaluationEventsApi.sendReminder(eventId, assignmentId);
      await loadEventData();
      toast({ title: "Success!", description: "Reminder sent!", variant: "success" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : 'Failed to send reminder', variant: "error" });
    } finally {
      setSendingReminder(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      draft: { color: "bg-gray-100 text-gray-700", icon: <FileText className="w-4 h-4" /> },
      active: { color: "bg-green-100 text-green-700", icon: <Play className="w-4 h-4" /> },
      paused: { color: "bg-yellow-100 text-yellow-700", icon: <Pause className="w-4 h-4" /> },
      completed: { color: "bg-blue-100 text-blue-700", icon: <CheckCircle className="w-4 h-4" /> },
      pending: { color: "bg-orange-100 text-orange-700", icon: <Clock className="w-4 h-4" /> },
      in_progress: { color: "bg-blue-100 text-blue-700", icon: <RefreshCw className="w-4 h-4" /> },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.color}`}>
        {config.icon}
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading evaluation event...</p>
        </div>
      </AppLayout>
    );
  }

  if (!event) {
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <p className="text-red-600">Evaluation event not found</p>
          <button
            onClick={() => router.push('/evaluation-events')}
            className="mt-4 text-indigo-600 hover:text-indigo-700"
          >
            Back to list
          </button>
        </div>
      </AppLayout>
    );
  }

  const completedAssignments = assignments.filter(a => a.status === 'completed').length;
  const pendingAssignments = assignments.filter(a => a.status === 'pending').length;
  const inProgressAssignments = assignments.filter(a => a.status === 'in_progress').length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/evaluation-events')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
              <p className="text-gray-500 text-sm mt-1">
                {event.description || 'No description'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(event.status)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {event.status !== 'completed' && (
            <button
              onClick={() => router.push(`/evaluation-events/${eventId}/edit`)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}

          {event.status === 'active' && (
            <button
              onClick={() => router.push(`/evaluation-events/${eventId}/trigger`)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Send className="w-4 h-4" />
              Trigger for Team
            </button>
          )}

          {event.status === 'draft' && (
            <button
              onClick={handleActivate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              Activate
            </button>
          )}

          {event.status === 'active' && (
            <button
              onClick={handlePause}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          )}

          {event.status === 'paused' && (
            <button
              onClick={handleActivate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              Resume
            </button>
          )}

          {(event.status === 'active' || event.status === 'paused') && (
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Mark Complete
            </button>
          )}

          <button
            onClick={() => router.push(`/evaluation-events/${eventId}/reports`)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            View Reports
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Questionnaire</p>
                    <p className="font-medium">{event.questionnaire?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Organization</p>
                    <p className="font-medium">{event.organization?.name || 'All Organizations'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Program</p>
                    <p className="font-medium">{event.program?.name || 'All Programs'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Created By</p>
                    <p className="font-medium">{event.creator?.name || 'Unknown'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="font-medium">
                      {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="font-medium">
                      {event.end_date ? new Date(event.end_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${event.allow_self_evaluation ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-sm">Self-evaluation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${event.is_anonymous ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-sm">Anonymous</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${event.show_individual_responses ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-sm">Show individual responses</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Hierarchy depth: </span>
                    <span className="text-sm font-medium">
                      {event.hierarchy_levels === null ? 'All Levels' : `${event.hierarchy_levels} level(s)`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* My Team's Assignments */}
            {assignments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    My Team&apos;s Evaluations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Evaluatee</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Sent</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {assignments.map((assignment) => (
                          <tr key={assignment.id} className="hover:bg-gray-50">
                            <td className="py-3 px-3">
                              <p className="font-medium text-gray-900">{assignment.evaluatee_name}</p>
                              <p className="text-sm text-gray-500">{assignment.evaluatee_email}</p>
                            </td>
                            <td className="py-3 px-3">
                              {getStatusBadge(assignment.status)}
                            </td>
                            <td className="py-3 px-3 text-sm text-gray-600">
                              {assignment.sent_at ? new Date(assignment.sent_at).toLocaleString() : 'Not sent'}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {assignment.status !== 'completed' && (
                                <button
                                  onClick={() => handleSendReminder(assignment.id)}
                                  disabled={sendingReminder === assignment.id}
                                  className="inline-flex items-center gap-1 px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <Mail className="w-4 h-4" />
                                  {sendingReminder === assignment.id ? 'Sending...' : 'Remind'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-6">
            {/* Progress Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-indigo-600">
                    {assignments.length > 0 
                      ? Math.round((completedAssignments / assignments.length) * 100)
                      : 0}%
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Completion Rate</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Assignments</span>
                    <span className="font-medium">{assignments.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-600">Completed</span>
                    <span className="font-medium text-green-600">{completedAssignments}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-600">In Progress</span>
                    <span className="font-medium text-blue-600">{inProgressAssignments}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-orange-600">Pending</span>
                    <span className="font-medium text-orange-600">{pendingAssignments}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${assignments.length > 0 
                        ? (completedAssignments / assignments.length) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {event.status === 'active' && (
                  <button
                    onClick={() => router.push(`/evaluation-events/${eventId}/trigger`)}
                    className="w-full flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Trigger for Team Members
                  </button>
                )}
                <button
                  onClick={() => router.push(`/evaluation-events/${eventId}/reports`)}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <BarChart3 className="w-4 h-4" />
                  View Full Reports
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
