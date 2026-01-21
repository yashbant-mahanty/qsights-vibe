"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ClipboardCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  User,
  Calendar,
  Play,
  RefreshCw,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { toast } from "@/components/ui/toast";

interface EvaluationAssignment {
  id: string;
  evaluation_event_id: string;
  evaluator_id: string;
  evaluatee_id: string;
  evaluator_type: string;
  status: string;
  access_token: string;
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
  due_date: string | null;
  evaluation_title: string;
  evaluation_status: string;
  evaluator_name: string;
  evaluator_email: string;
  evaluatee_name: string;
  evaluatee_email: string;
  response_status: string | null;
}

export default function MyEvaluationsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<EvaluationAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    loadMyAssignments();
  }, []);

  async function loadMyAssignments() {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/evaluation/my-assignments');
      if (response.success) {
        setAssignments(response.assignments || []);
      } else {
        toast({ title: "Error", description: response.message || "Failed to load assignments", variant: "error" });
      }
    } catch (err) {
      console.error('Error loading assignments:', err);
      toast({ title: "Error", description: "Failed to load your evaluations", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  const pendingCount = assignments.filter(a => a.status === 'pending').length;
  const inProgressCount = assignments.filter(a => a.status === 'in_progress').length;
  const completedCount = assignments.filter(a => a.status === 'completed').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Play className="w-3 h-3" />
            In Progress
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3" />
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const getEvaluatorTypeLabel = (type: string) => {
    switch (type) {
      case 'downward':
        return 'Manager → Subordinate';
      case 'upward':
        return 'Subordinate → Manager';
      case 'self':
        return 'Self Evaluation';
      case 'peer':
        return 'Peer Evaluation';
      default:
        return type;
    }
  };

  const handleStartEvaluation = (assignment: EvaluationAssignment) => {
    router.push(`/evaluation/take/${assignment.id}`);
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Evaluations</h1>
            <p className="text-gray-500 text-sm mt-1">
              View and complete your assigned evaluations
            </p>
          </div>
          <button
            onClick={loadMyAssignments}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:border-blue-300 transition-colors" onClick={() => setFilter('all')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
                </div>
                <ClipboardCheck className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer hover:border-yellow-300 transition-colors ${filter === 'pending' ? 'border-yellow-500 bg-yellow-50' : ''}`} onClick={() => setFilter('pending')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer hover:border-blue-300 transition-colors ${filter === 'in_progress' ? 'border-blue-500 bg-blue-50' : ''}`} onClick={() => setFilter('in_progress')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
                </div>
                <Play className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer hover:border-green-300 transition-colors ${filter === 'completed' ? 'border-green-500 bg-green-50' : ''}`} onClick={() => setFilter('completed')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignments List */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-lg">
              {filter === 'all' ? 'All Evaluations' : `${filter.charAt(0).toUpperCase() + filter.slice(1).replace('_', ' ')} Evaluations`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading your evaluations...</p>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="p-8 text-center">
                <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {filter === 'all' 
                    ? 'No evaluations assigned to you yet'
                    : `No ${filter.replace('_', ' ')} evaluations`}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {assignment.evaluation_title}
                          </h3>
                          {getStatusBadge(assignment.status)}
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>Evaluating: <strong>{assignment.evaluatee_name}</strong></span>
                          </div>
                          <div className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                            {getEvaluatorTypeLabel(assignment.evaluator_type)}
                          </div>
                          {assignment.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {assignment.status === 'pending' && (
                          <button
                            onClick={() => handleStartEvaluation(assignment)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Play className="w-4 h-4" />
                            Start
                          </button>
                        )}
                        {assignment.status === 'in_progress' && (
                          <button
                            onClick={() => handleStartEvaluation(assignment)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <ArrowRight className="w-4 h-4" />
                            Continue
                          </button>
                        )}
                        {assignment.status === 'completed' && (
                          <span className="text-sm text-gray-500">
                            Completed {assignment.completed_at ? new Date(assignment.completed_at).toLocaleDateString() : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
