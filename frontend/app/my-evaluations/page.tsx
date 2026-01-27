'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/api';
import { 
  BarChart3, Star, TrendingUp, Users, Award, Target, 
  ThumbsUp, MessageSquare, Calendar, ChevronRight, 
  Loader2, Activity, PieChart, AlertCircle, Building2
} from 'lucide-react';

interface SkillScore {
  question: string;
  average: number;
  count: number;
}

interface Evaluation {
  id: string;
  template_name: string;
  evaluator_name: string;
  evaluated_at: string;
  average_score: number;
  scores?: { question: string; score: number }[];
  feedback?: string;
}

interface StaffReport {
  staff_id: string;
  staff_name: string;
  staff_email: string;
  employee_id: string;
  department: string;
  role_name: string;
  total_evaluations: number;
  overall_average: number;
  evaluations: Evaluation[];
}

export default function MyEvaluationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'my-performance' | 'team-performance'>('my-performance');
  const [loading, setLoading] = useState(true);
  
  // My Performance state
  const [myPerformance, setMyPerformance] = useState<{
    staff: { id: string; name: string; email: string; employee_id: string; department: string } | null;
    summary: {
      total_evaluations: number;
      overall_average: number;
      strengths: SkillScore[];
      improvements: SkillScore[];
    };
    skill_scores: SkillScore[];
    evaluations: Evaluation[];
  } | null>(null);
  
  // Team Performance state
  const [teamPerformance, setTeamPerformance] = useState<{
    manager: { id: string; name: string } | null;
    subordinates_count: number;
    staff_reports: StaffReport[];
  } | null>(null);
  
  const [selectedSubordinate, setSelectedSubordinate] = useState<string | null>(null);
  const [teamViewMode, setTeamViewMode] = useState<'list' | 'analysis'>('list');

  const fetchMyPerformance = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/evaluation/my-performance');
      if (response.success) {
        setMyPerformance(response);
      }
    } catch (error) {
      console.error('Failed to fetch my performance:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeamPerformance = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/evaluation/team-performance');
      if (response.success) {
        setTeamPerformance(response);
      }
    } catch (error) {
      console.error('Failed to fetch team performance:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'my-performance') {
      fetchMyPerformance();
    } else {
      fetchTeamPerformance();
    }
  }, [activeTab, fetchMyPerformance, fetchTeamPerformance]);

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-blue-600';
    if (score >= 2) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 4) return 'from-green-400 to-emerald-500';
    if (score >= 3) return 'from-blue-400 to-cyan-500';
    if (score >= 2) return 'from-yellow-400 to-amber-500';
    return 'from-orange-400 to-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-purple-200 mt-2">View your evaluation results and team performance</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('my-performance')}
              className={`px-6 py-4 font-medium transition border-b-2 ${
                activeTab === 'my-performance'
                  ? 'text-purple-600 border-purple-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                My Performance
              </div>
            </button>
            <button
              onClick={() => setActiveTab('team-performance')}
              className={`px-6 py-4 font-medium transition border-b-2 ${
                activeTab === 'team-performance'
                  ? 'text-purple-600 border-purple-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Performance Reports
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
          </div>
        ) : activeTab === 'my-performance' ? (
          /* MY PERFORMANCE TAB */
          <div className="space-y-6">
            {!myPerformance?.staff ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900">No Performance Data</h3>
                <p className="text-gray-500 mt-2">You haven't been evaluated yet.</p>
              </div>
            ) : (
              <>
                {/* Profile Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                        <Users className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">{myPerformance.staff.name}</h2>
                        <p className="text-purple-200">{myPerformance.staff.email}</p>
                        {myPerformance.staff.department && (
                          <p className="text-purple-300 text-sm">{myPerformance.staff.department}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-5xl font-bold">{myPerformance.summary.overall_average}</div>
                      <div className="text-purple-200">Overall Score</div>
                      <div className="text-sm text-purple-300 mt-1">{myPerformance.summary.total_evaluations} evaluation(s)</div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-5 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">Strengths</p>
                        <p className="text-3xl font-bold text-green-800 mt-2">{myPerformance.summary.strengths.length}</p>
                      </div>
                      <div className="bg-white/80 rounded-xl p-3">
                        <ThumbsUp className="h-6 w-6 text-green-500" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl p-5 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-600 font-medium">Areas to Improve</p>
                        <p className="text-3xl font-bold text-orange-800 mt-2">{myPerformance.summary.improvements.length}</p>
                      </div>
                      <div className="bg-white/80 rounded-xl p-3">
                        <Target className="h-6 w-6 text-orange-500" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-sky-100 rounded-xl p-5 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Skills Rated</p>
                        <p className="text-3xl font-bold text-blue-800 mt-2">{myPerformance.skill_scores.length}</p>
                      </div>
                      <div className="bg-white/80 rounded-xl p-3">
                        <Activity className="h-6 w-6 text-blue-500" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strengths & Improvements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-4 bg-green-50 border-b border-green-100">
                      <h3 className="font-semibold text-green-800 flex items-center gap-2">
                        <Award className="h-5 w-5 text-green-600" />
                        Areas of Strength
                      </h3>
                    </div>
                    <div className="p-4 space-y-4">
                      {myPerformance.summary.strengths.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Keep up the great work!</p>
                      ) : (
                        myPerformance.summary.strengths.map((item, idx) => (
                          <div key={idx} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 text-sm">{item.question}</span>
                              <span className="text-sm font-bold text-green-600 flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                {item.average}
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full"
                                style={{ width: `${(item.average / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Improvements */}
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-4 bg-orange-50 border-b border-orange-100">
                      <h3 className="font-semibold text-orange-800 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-orange-600" />
                        Areas for Improvement
                      </h3>
                    </div>
                    <div className="p-4 space-y-4">
                      {myPerformance.summary.improvements.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Great job! No areas needing improvement.</p>
                      ) : (
                        myPerformance.summary.improvements.map((item, idx) => (
                          <div key={idx} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 text-sm">{item.question}</span>
                              <span className="text-sm font-bold text-orange-600 flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                {item.average}
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-orange-400 to-amber-500 h-2 rounded-full"
                                style={{ width: `${(item.average / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* All Skills */}
                {myPerformance.skill_scores.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-4 border-b bg-gray-50">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        All Competency Scores
                      </h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {myPerformance.skill_scores.map((item, idx) => (
                        <div key={idx} className="group">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">{item.question}</span>
                            <span className={`font-bold ${getScoreColor(item.average)}`}>
                              {item.average}/5
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3">
                            <div 
                              className={`bg-gradient-to-r ${getProgressColor(item.average)} h-3 rounded-full transition-all duration-500`}
                              style={{ width: `${(item.average / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Evaluations */}
                {myPerformance.evaluations.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-4 border-b bg-gray-50">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-purple-600" />
                        Evaluation History
                      </h3>
                    </div>
                    <div className="divide-y">
                      {myPerformance.evaluations.map((eval_item) => (
                        <div key={eval_item.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{eval_item.template_name}</p>
                              <p className="text-sm text-gray-500">Evaluated by: {eval_item.evaluator_name}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(eval_item.evaluated_at).toLocaleDateString('en-US', {
                                  year: 'numeric', month: 'long', day: 'numeric'
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${getScoreColor(eval_item.average_score)}`}>
                                {eval_item.average_score}
                              </div>
                              <p className="text-xs text-gray-500">avg score</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* TEAM PERFORMANCE TAB */
          <div className="space-y-6">
            {!teamPerformance || teamPerformance.staff_reports.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900">No Team Data</h3>
                <p className="text-gray-500 mt-2">You don't have any subordinates with evaluation data.</p>
              </div>
            ) : (
              <>
                {/* Team Summary Header */}
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">Team Performance Overview</h2>
                      <p className="text-blue-200 mt-1">Monitor your team members' evaluation results</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold">{teamPerformance.subordinates_count}</div>
                      <div className="text-blue-200">Team Members</div>
                    </div>
                  </div>
                </div>

                {/* View Mode Toggle */}
                <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm border w-fit">
                  <button
                    onClick={() => { setTeamViewMode('list'); setSelectedSubordinate(null); }}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                      teamViewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Staff List
                  </button>
                  <button
                    onClick={() => setTeamViewMode('analysis')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                      teamViewMode === 'analysis' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Performance Analysis
                  </button>
                </div>

                {teamViewMode === 'list' ? (
                  /* Staff List View */
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-4 border-b bg-gray-50">
                      <h3 className="font-semibold text-gray-900">Team Members ({teamPerformance.staff_reports.length})</h3>
                    </div>
                    <div className="divide-y">
                      {teamPerformance.staff_reports.map((staff) => (
                        <div 
                          key={staff.staff_id} 
                          className="p-4 hover:bg-gray-50 cursor-pointer transition"
                          onClick={() => { setSelectedSubordinate(staff.staff_id); setTeamViewMode('analysis'); }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                              <Users className="h-6 w-6 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900">{staff.staff_name}</p>
                              <p className="text-sm text-gray-500">{staff.department || 'No department'} • {staff.role_name || 'No role'}</p>
                              <div className="w-full bg-gray-100 rounded-full h-2 mt-2 max-w-xs">
                                <div 
                                  className={`h-2 rounded-full ${
                                    staff.overall_average >= 4 ? 'bg-green-500' :
                                    staff.overall_average >= 3 ? 'bg-blue-500' :
                                    staff.overall_average >= 2 ? 'bg-yellow-500' : 'bg-orange-500'
                                  }`}
                                  style={{ width: `${(staff.overall_average / 5) * 100}%` }}
                                />
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-2xl font-bold ${getScoreColor(staff.overall_average)}`}>
                                {staff.overall_average || '-'}
                              </p>
                              <p className="text-xs text-gray-500">{staff.total_evaluations} eval(s)</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Analysis View */
                  <div className="space-y-6">
                    {/* Staff Selector */}
                    <div className="bg-white rounded-xl shadow-sm border p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Team Member</label>
                      <select
                        value={selectedSubordinate || ''}
                        onChange={(e) => setSelectedSubordinate(e.target.value || null)}
                        className="w-full md:w-1/2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Select a team member --</option>
                        {teamPerformance.staff_reports.map((staff) => (
                          <option key={staff.staff_id} value={staff.staff_id}>
                            {staff.staff_name} ({staff.overall_average}/5)
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedSubordinate && (() => {
                      const staff = teamPerformance.staff_reports.find(s => s.staff_id === selectedSubordinate);
                      if (!staff) return null;

                      return (
                        <div className="space-y-6">
                          {/* Staff Header */}
                          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                  <Users className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                  <h2 className="text-2xl font-bold">{staff.staff_name}</h2>
                                  <p className="text-purple-200">{staff.staff_email}</p>
                                  <p className="text-purple-300 text-sm">{staff.department} • {staff.role_name}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-5xl font-bold">{staff.overall_average}</div>
                                <div className="text-purple-200">Overall Score</div>
                                <div className="text-sm text-purple-300">{staff.total_evaluations} evaluation(s)</div>
                              </div>
                            </div>
                          </div>

                          {/* Evaluation History */}
                          {staff.evaluations.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                              <div className="p-4 border-b bg-gray-50">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                  <Calendar className="h-5 w-5 text-purple-600" />
                                  Evaluation History
                                </h3>
                              </div>
                              <div className="divide-y">
                                {staff.evaluations.map((eval_item) => (
                                  <div key={eval_item.id} className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-medium text-gray-900">{eval_item.template_name}</p>
                                        <p className="text-sm text-gray-500">Evaluated by: {eval_item.evaluator_name}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                          {new Date(eval_item.evaluated_at).toLocaleDateString('en-US', {
                                            year: 'numeric', month: 'long', day: 'numeric'
                                          })}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <div className={`text-2xl font-bold ${getScoreColor(eval_item.average_score)}`}>
                                          {eval_item.average_score}
                                        </div>
                                        <p className="text-xs text-gray-500">avg score</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {!selectedSubordinate && (
                      <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                        <PieChart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">Select a team member to view detailed analysis</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
