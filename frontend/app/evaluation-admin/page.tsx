'use client';

import { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GradientStatCard } from '@/components/ui/gradient-stat-card';
import { 
  ClipboardCheck, FileText, Activity, BarChart3, Users, Star, 
  TrendingUp, Award, Target, Trophy, CheckCircle, UserCheck,
  PieChart, Building, MessageSquare, ThumbsUp
} from 'lucide-react';
import { 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, PieChart as RePieChart, Pie
} from 'recharts';
import { fetchWithAuth } from '@/lib/api';

export default function EvaluationAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    questionnaires: 0,
    evaluations: 0,
    events: 0,
    reports: 0
  });
  const [triggeredEvaluations, setTriggeredEvaluations] = useState<any[]>([]);
  const [staffReports, setStaffReports] = useState<any[]>([]);
  const [reportSummary, setReportSummary] = useState<any>(null);
  const [evaluatorReports, setEvaluatorReports] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Analyze staff performance data
  const analyzeStaffPerformance = useMemo(() => {
    return (staffReport: any) => {
      const allScores: any[] = [];

      staffReport.evaluations?.forEach((evaluation: any) => {
        if (evaluation.responses && evaluation.responses.responses && Array.isArray(evaluation.responses.responses)) {
          // The API returns evaluation.responses.responses as an array of numbers
          const templateQuestions = evaluation.template_questions || [];
          
          evaluation.responses.responses.forEach((score: number, idx: number) => {
            if (typeof score === 'number' && !isNaN(score)) {
              // Use actual question text if available, otherwise fallback to Criterion
              const question = templateQuestions[idx]?.question || templateQuestions[idx] || `Criterion ${idx + 1}`;
              allScores.push({
                question,
                score: score
              });
            }
          });
        }
      });

      const strengths = allScores.filter(s => s.score >= 4.0).sort((a, b) => b.score - a.score);
      const improvements = allScores.filter(s => s.score < 4.0).sort((a, b) => a.score - b.score);
      const overallAverage = allScores.length > 0 
        ? allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length 
        : 0;

      return {
        allScores,
        strengths,
        improvements,
        overallAverage: Math.round(overallAverage * 10) / 10,
        totalEvaluations: staffReport.evaluations?.length || 0
      };
    };
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      
      // Fetch triggered evaluations
      let triggeredEvalsData: any[] = [];
      try {
        const triggeredRes = await fetchWithAuth('/evaluation/triggered');
        if (triggeredRes.success && triggeredRes.evaluations) {
          triggeredEvalsData = triggeredRes.evaluations;
          setTriggeredEvaluations(triggeredEvalsData);
        }
      } catch (error) {
        console.log('Triggered evaluations not available:', error);
      }
      
      // Fetch staff reports for analytics
      try {
        const reportsRes = await fetchWithAuth('/evaluation/reports');
        if (reportsRes.success) {
          setStaffReports(reportsRes.reports || []);
        }
      } catch (error) {
        console.log('Reports not available:', error);
      }

      // Fetch report summary
      try {
        const summaryRes = await fetchWithAuth('/evaluation/reports/summary');
        if (summaryRes.success) {
          setReportSummary(summaryRes.summary);
        }
      } catch (error) {
        console.log('Summary not available:', error);
      }

      // Fetch evaluator reports
      try {
        const evaluatorRes = await fetchWithAuth('/evaluation/reports?view=evaluator');
        if (evaluatorRes.success) {
          setEvaluatorReports(evaluatorRes.reports || []);
        }
      } catch (error) {
        console.log('Evaluator reports not available:', error);
      }

      // Fetch departments
      try {
        const deptRes = await fetchWithAuth('/evaluation/departments');
        if (deptRes.success) {
          setDepartments(deptRes.departments || []);
        }
      } catch (error) {
        console.log('Departments not available:', error);
      }
      
      // Count pre-defined evaluation templates (5) + custom questionnaires
      let allTemplatesCount = 5; // Pre-defined templates: Performance Review, 360 Feedback, Competency Rating, Self Assessment, Peer Review
      try {
        const questionnairesRes = await fetchWithAuth('/questionnaires');
        if (questionnairesRes.data) {
          allTemplatesCount += questionnairesRes.data.length; // Add custom questionnaires
        }
      } catch (error) {
        console.log('Questionnaires not available:', error);
      }
      
      // Calculate unique templates actually used in triggered evaluations
      const uniqueTemplatesUsed = new Set(
        triggeredEvalsData.map((t: any) => t.template_name).filter(Boolean)
      );
      
      setStats({
        questionnaires: allTemplatesCount, // Pre-defined (5) + custom questionnaires
        evaluations: triggeredEvalsData.length, // Total evaluation forms created/triggered
        events: uniqueTemplatesUsed.size, // Number of unique templates actually being used
        reports: triggeredEvalsData.filter((e: any) => e.status === 'completed').length // Completed evaluations with submitted responses
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Evaluation Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Comprehensive analytics and evaluation insights</p>
        </div>

        {/* Main Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="relative group">
            <GradientStatCard
              title="Evaluation Templates"
              value={stats.questionnaires.toString()}
              icon={FileText}
              gradient="from-blue-500 to-blue-600"
            />
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              Unique evaluation questionnaires/forms used in the system
            </div>
          </div>
          <div className="relative group">
            <GradientStatCard
              title="Triggered Evaluations"
              value={stats.evaluations.toString()}
              icon={ClipboardCheck}
              gradient="from-purple-500 to-purple-600"
            />
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              Total evaluation forms sent to evaluators for completion
            </div>
          </div>
          <div className="relative group">
            <GradientStatCard
              title="Active Templates"
              value={stats.events.toString()}
              icon={Target}
              gradient="from-green-500 to-green-600"
            />
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              Number of evaluation templates currently in use
            </div>
          </div>
          <div className="relative group">
            <GradientStatCard
              title="Completed Evaluations"
              value={stats.reports.toString()}
              icon={CheckCircle}
              gradient="from-orange-500 to-orange-600"
            />
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              Evaluations submitted with responses by evaluators
            </div>
          </div>
        </div>

        {/* Performance Analytics Section */}
        {staffReports.length > 0 && (
          <>
            {/* Advanced Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Average Rating Card */}
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-white/20 rounded-lg p-2">
                    <Star className="h-6 w-6" />
                  </div>
                  <span className="text-sm bg-white/20 px-2 py-1 rounded">Overall</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm opacity-90">Average Rating</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold">
                      {staffReports.length > 0
                        ? (staffReports.reduce((sum: number, s: any) => {
                            const analysis = analyzeStaffPerformance(s);
                            return sum + analysis.overallAverage;
                          }, 0) / staffReports.length).toFixed(1)
                        : '0.0'}
                    </p>
                    <p className="text-lg opacity-75">/5.0</p>
                  </div>
                </div>
              </div>

              {/* Participation Rate */}
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-white/20 rounded-lg p-2">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <span className="text-sm bg-white/20 px-2 py-1 rounded">Progress</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm opacity-90">Completion Rate</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold">{reportSummary?.completion_rate || 0}%</p>
                  </div>
                </div>
              </div>

              {/* Total Staff Evaluated */}
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-white/20 rounded-lg p-2">
                    <Users className="h-6 w-6" />
                  </div>
                  <span className="text-sm bg-white/20 px-2 py-1 rounded">People</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm opacity-90">Staff Evaluated</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold">{staffReports.length}</p>
                  </div>
                </div>
              </div>

              {/* Active Evaluators */}
              <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-white/20 rounded-lg p-2">
                    <UserCheck className="h-6 w-6" />
                  </div>
                  <span className="text-sm bg-white/20 px-2 py-1 rounded">Evaluators</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm opacity-90">Active Evaluators</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold">{reportSummary?.unique_evaluators || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Performance & Distribution Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Department-wise Performance Comparison */}
              {reportSummary?.department_breakdown && reportSummary.department_breakdown.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-lg">
                      <Building className="h-6 w-6 text-blue-600" />
                      Department Performance
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Evaluation distribution across departments</p>
                  </div>
                  <div className="p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                        data={reportSummary.department_breakdown.map((dept: any) => ({
                          name: (dept.department || 'Unassigned').length > 15 
                            ? (dept.department || 'Unassigned').substring(0, 15) + '...' 
                            : (dept.department || 'Unassigned'),
                          count: dept.count,
                          avg: staffReports
                            .filter((s: any) => s.department === dept.department)
                            .reduce((sum: number, s: any) => {
                              const analysis = analyzeStaffPerformance(s);
                              return sum + analysis.overallAverage;
                            }, 0) / (staffReports.filter((s: any) => s.department === dept.department).length || 1)
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={80}
                          tick={{ fill: '#4b5563', fontSize: 11 }}
                        />
                        <YAxis 
                          yAxisId="left"
                          orientation="left"
                          tick={{ fill: '#4b5563', fontSize: 11 }}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          domain={[0, 5]}
                          tick={{ fill: '#4b5563', fontSize: 11 }}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Staff Count" radius={[8, 8, 0, 0]} />
                        <Bar yAxisId="right" dataKey="avg" fill="#8b5cf6" name="Avg Rating" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Performance Distribution Pie Chart */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-lg">
                    <PieChart className="h-6 w-6 text-green-600" />
                    Performance Distribution
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Staff grouped by performance level</p>
                </div>
                <div className="p-6">
                  {(() => {
                    const distribution = {
                      excellent: staffReports.filter((s: any) => {
                        const analysis = analyzeStaffPerformance(s);
                        return analysis.overallAverage >= 4.5;
                      }).length,
                      veryGood: staffReports.filter((s: any) => {
                        const analysis = analyzeStaffPerformance(s);
                        return analysis.overallAverage >= 4.0 && analysis.overallAverage < 4.5;
                      }).length,
                      good: staffReports.filter((s: any) => {
                        const analysis = analyzeStaffPerformance(s);
                        return analysis.overallAverage >= 3.0 && analysis.overallAverage < 4.0;
                      }).length,
                      needsImprovement: staffReports.filter((s: any) => {
                        const analysis = analyzeStaffPerformance(s);
                        return analysis.overallAverage < 3.0;
                      }).length
                    };

                    const data = [
                      { name: 'Excellent (≥4.5)', value: distribution.excellent, color: '#10b981' },
                      { name: 'Very Good (4.0-4.4)', value: distribution.veryGood, color: '#3b82f6' },
                      { name: 'Good (3.0-3.9)', value: distribution.good, color: '#f59e0b' },
                      { name: 'Needs Improvement (<3.0)', value: distribution.needsImprovement, color: '#ef4444' }
                    ].filter((d: any) => d.value > 0);

                    return (
                      <>
                        <ResponsiveContainer width="100%" height={220}>
                          <RePieChart>
                            <Pie
                              data={data}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                              outerRadius={70}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {data.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RePieChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          {data.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
                              <div className="flex-1">
                                <p className="text-xs text-gray-600">{item.name}</p>
                                <p className="font-bold text-gray-900">{item.value} staff</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Top Performers & Skills Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performers Leaderboard */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-6 border-b bg-gradient-to-r from-amber-50 to-yellow-50">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-lg">
                    <Trophy className="h-6 w-6 text-amber-600" />
                    Top Performers
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Highest rated staff members</p>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {staffReports
                      .map((s: any) => ({
                        ...s,
                        avgScore: analyzeStaffPerformance(s).overallAverage
                      }))
                      .sort((a: any, b: any) => b.avgScore - a.avgScore)
                      .slice(0, 5)
                      .map((staff: any, idx: number) => (
                        <div 
                          key={staff.staff_id} 
                          className={`flex items-center gap-4 p-3 rounded-lg border-2 transition ${
                            idx === 0 ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300' :
                            idx === 1 ? 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300' :
                            idx === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300' :
                            'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                            idx === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500' :
                            idx === 1 ? 'bg-gradient-to-br from-gray-400 to-slate-500' :
                            idx === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-500' :
                            'bg-gray-400'
                          }`}>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{staff.staff_name}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {staff.department || staff.evaluations?.[0]?.department || 'No department'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                              <p className="text-xl font-bold text-gray-900">{staff.avgScore.toFixed(1)}</p>
                            </div>
                            <p className="text-xs text-gray-500">{staff.evaluations.length} eval(s)</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Top Skills Organization-wide */}
              {(() => {
                const skillsMap = new Map<string, { sum: number; count: number }>();
                
                staffReports.forEach((staff: any) => {
                  const analysis = analyzeStaffPerformance(staff);
                  analysis.allScores.forEach((skill: any) => {
                    const existing = skillsMap.get(skill.question) || { sum: 0, count: 0 };
                    skillsMap.set(skill.question, {
                      sum: existing.sum + skill.score,
                      count: existing.count + 1
                    });
                  });
                });

                const topSkills = Array.from(skillsMap.entries())
                  .map(([question, data]) => ({
                    question,
                    avgScore: data.sum / data.count,
                    count: data.count
                  }))
                  .sort((a, b) => b.avgScore - a.avgScore)
                  .slice(0, 5);

                return topSkills.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-6 border-b bg-gradient-to-r from-teal-50 to-cyan-50">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-lg">
                        <Target className="h-6 w-6 text-teal-600" />
                        Top Skills Organization-wide
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">Highest performing competencies</p>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {topSkills.map((skill: any, idx: number) => {
                          const percentage = (skill.avgScore / 5) * 100;
                          return (
                            <div key={idx} className="group">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                                    idx < 3 ? 'bg-gradient-to-br from-teal-500 to-cyan-600' : 'bg-gray-400'
                                  }`}>
                                    {idx + 1}
                                  </div>
                                  <span className="font-medium text-gray-900 flex-1 text-sm">
                                    {skill.question.length > 35 ? skill.question.substring(0, 35) + '...' : skill.question}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 ml-4">
                                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                    {skill.count} ratings
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-yellow-500 text-sm">
                                      {'★'.repeat(Math.round(skill.avgScore))}
                                      {'☆'.repeat(5 - Math.round(skill.avgScore))}
                                    </span>
                                    <span className="font-bold text-gray-700 w-12 text-right text-sm">
                                      {skill.avgScore.toFixed(1)}/5
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-700 group-hover:opacity-80 ${
                                    skill.avgScore >= 4.5 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                                    skill.avgScore >= 4.0 ? 'bg-gradient-to-r from-blue-400 to-cyan-500' :
                                    skill.avgScore >= 3.0 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                                    'bg-gradient-to-r from-orange-400 to-red-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* System Summary Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-white/20 rounded-lg p-3">
                  <Activity className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Evaluation System Summary</h3>
                  <p className="text-indigo-200 text-sm">Key metrics at a glance</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-3xl font-bold">{reportSummary?.total_triggered || 0}</p>
                  <p className="text-sm text-indigo-200 mt-1">Total Triggered</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-3xl font-bold">{reportSummary?.completed || 0}</p>
                  <p className="text-sm text-indigo-200 mt-1">Completed</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-3xl font-bold">
                    {staffReports.reduce((sum: number, s: any) => sum + s.evaluations.length, 0)}
                  </p>
                  <p className="text-sm text-indigo-200 mt-1">Total Reviews</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-3xl font-bold">{stats.events}</p>
                  <p className="text-sm text-indigo-200 mt-1">Active Templates</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <a 
                href="/questionnaires" 
                className="p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Templates</h3>
                </div>
                <p className="text-sm text-gray-600">Create and manage evaluation forms</p>
              </a>
              <a 
                href="/evaluation-new" 
                className="p-4 border-2 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition">
                    <ClipboardCheck className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Staff & Evaluations</h3>
                </div>
                <p className="text-sm text-gray-600">Manage staff and trigger evaluations</p>
              </a>
              <a 
                href="/evaluation-new?tab=reports" 
                className="p-4 border-2 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition">
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Reports & Analytics</h3>
                </div>
                <p className="text-sm text-gray-600">View performance insights and trends</p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

