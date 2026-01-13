"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  BarChart3,
  Users,
  TrendingUp,
  Download,
  Loader2,
  CheckCircle,
  Clock,
  PieChart,
  Mail,
  List,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Send,
  Eye,
  MousePointer,
  X,
  Calendar,
  Activity as ActivityIcon,
} from "lucide-react";
import { activitiesApi, responsesApi, notificationsApi, type Activity } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";

interface NotificationReport {
  id: string;
  activity_id: string;
  template_type: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  failed_emails: string[] | null;
  error_details: string | null;
  created_at: string;
  updated_at: string;
}

export default function ActivityResultsPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [questionnaire, setQuestionnaire] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [activeTab, setActiveTab] = useState('overview');
  const [notificationReports, setNotificationReports] = useState<NotificationReport[]>([]);

  useEffect(() => {
    loadData();
  }, [activityId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportMenu && !target.closest('.export-dropdown')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [activityData, stats, responsesData] = await Promise.all([
        activitiesApi.getById(activityId),
        responsesApi.getStatistics(activityId).catch((err) => {
          console.error('Failed to load statistics:', err);
          return {
            total_responses: 0,
            submitted: 0,
            in_progress: 0,
            guest_responses: 0,
            average_completion: 0,
            average_time_per_question: 0,
          };
        }),
        responsesApi.getByActivity(activityId).catch((err) => {
          console.error('Failed to load responses:', err);
          return [];
        }),
      ]);

      setActivity(activityData);
      setStatistics(stats);
      setResponses(responsesData);

      // Debug log for data consistency verification
      console.log('=== DATA CONSISTENCY CHECK ===');
      console.log('Statistics Total Responses:', stats.total_responses);
      console.log('Loaded Responses Array Length:', responsesData.length);
      console.log('Responses with answers:', responsesData.filter((r: any) => r.answers && r.answers.length > 0).length);
      if (responsesData.length > 0) {
        console.log('First Response Sample:', {
          id: responsesData[0].id,
          status: responsesData[0].status,
          participant_id: responsesData[0].participant_id,
          answers_count: responsesData[0].answers?.length || 0,
          sample_answer: responsesData[0].answers?.[0]
        });
      }
      console.log('==============================');

      // Load notification reports for this activity
      try {
        console.log('🔍 Loading notification reports for activity:', activityId);
        const notifData = await notificationsApi.getReportsForActivity(activityId);
        console.log('✅ Notification reports loaded:', notifData);
        console.log('Reports count:', notifData.data?.length || 0);
        setNotificationReports(notifData.data || []);
      } catch (err) {
        console.error('❌ Failed to load notification reports:', err);
        setNotificationReports([]);
      }

      // Load questionnaire if available
      console.log('🔍 Activity questionnaire_id:', activityData.questionnaire_id);
      if (activityData.questionnaire_id) {
        try {
          console.log('📡 Fetching questionnaire from:', `/api/public/questionnaire/${activityData.questionnaire_id}`);
          const questionnaireData = await fetch(`/api/public/questionnaire/${activityData.questionnaire_id}`);
          console.log('📥 Questionnaire response status:', questionnaireData.status, questionnaireData.ok);
          
          if (questionnaireData.ok) {
            const qData = await questionnaireData.json();
            console.log('✅ Questionnaire data received:', {
              hasData: !!qData.data,
              hasSections: !!qData.data?.sections,
              sectionsCount: qData.data?.sections?.length || 0,
              firstSectionQuestions: qData.data?.sections?.[0]?.questions?.length || 0
            });
            setQuestionnaire(qData.data);
          } else {
            console.error('❌ Questionnaire fetch failed with status:', questionnaireData.status);
            const errorText = await questionnaireData.text();
            console.error('Error response:', errorText);
          }
        } catch (err) {
          console.error('Failed to load questionnaire:', err);
        }
      } else {
        console.warn('⚠️ No questionnaire_id found for this activity');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load results");
      console.error("Error loading results:", err);
    } finally {
      setLoading(false);
    }
  }

  // Export to Excel/CSV
  async function exportToExcel(format: 'xlsx' | 'csv') {
    try {
      // Dynamically import xlsx (client-side only)
      const XLSX = await import('xlsx');
      
      // Validate that we have data to export
      if (!responses || responses.length === 0) {
        toast({
          title: "No Data",
          description: "There are no responses to export yet.",
          variant: "warning"
        });
        return;
      }

      console.log('Starting export...', { format, responsesCount: responses.length });

      // Prepare data for export
      const exportData = responses.map((response, index) => {
        const row: any = {
          '#': index + 1,
          'Participant': response.participant?.name || response.participant?.email || 'Anonymous',
          'Email': response.participant?.email || response.guest_email || 'N/A',
          'Status': response.status || 'N/A',
          'Submitted At': response.submitted_at 
            ? new Date(response.submitted_at).toLocaleString()
            : 'N/A',
        };

        // Add question responses
        // answers is an array of {question_id, value, value_array}
        questionnaire?.sections?.forEach((section: any) => {
          section.questions?.forEach((question: any) => {
            const questionLabel = question.title || question.text || `Question ${question.id}`;
            
            // Find answer for this question
            if (Array.isArray(response.answers)) {
              const answerObj = response.answers.find((a: any) => a.question_id === question.id);
              if (answerObj) {
                const answerValue = answerObj.value_array || answerObj.value;
                row[questionLabel] = Array.isArray(answerValue) ? answerValue.join(', ') : answerValue || 'No response';
              } else {
                row[questionLabel] = 'No response';
              }
            } else {
              row[questionLabel] = 'No response';
            }
          });
        });

        return row;
      });

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const colWidths = [
        { wch: 5 },  // #
        { wch: 20 }, // Participant
        { wch: 25 }, // Email
        { wch: 15 }, // Status
        { wch: 20 }, // Submitted At
      ];
      ws['!cols'] = colWidths;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Activity Results');

      // Generate filename
      const filename = `${activity?.name || 'activity'}_results_${new Date().toISOString().split('T')[0]}`;

      console.log('Writing file...', { filename, format });

      // Export file
      if (format === 'csv') {
        XLSX.writeFile(wb, `${filename}.csv`, { bookType: 'csv' });
      } else {
        XLSX.writeFile(wb, `${filename}.xlsx`);
      }

      console.log('File written successfully!');

      toast({ 
        title: "Success", 
        description: `Results exported as ${format.toUpperCase()} successfully!`,
        variant: "success" 
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({ 
        title: "Error", 
        description: 'Failed to export results',
        variant: "error" 
      });
    }
  }

  // Export to PDF
  async function exportToPDF() {
    try {
      // Dynamically import jspdf (client-side only)
      // @ts-ignore - jspdf types may not be available
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;
      // @ts-ignore - jspdf-autotable extends jsPDF prototype
      await import('jspdf-autotable');
      
      // Validate that we have data to export
      if (!responses || responses.length === 0) {
        toast({
          title: "No Data",
          description: "There are no responses to export yet.",
          variant: "warning"
        });
        return;
      }

      console.log('Starting PDF export...', { responsesCount: responses.length });

      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
      
      // Add title
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text(`Activity Results: ${activity?.name || 'Activity'}`, 14, 15);
      
      // Add metadata
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
      doc.text(`Total Responses: ${responses.length}`, 14, 27);

      // Prepare table data
      const tableData = responses.map((response, index) => {
        const answers = response.metadata?.answers || response.answers || {};
        const row = [
          index + 1,
          response.participant?.name || response.participant?.email || 'Anonymous',
          response.participant?.email || response.guest_email || 'N/A',
          response.status || 'N/A',
          response.submitted_at 
            ? new Date(response.submitted_at).toLocaleDateString()
            : 'N/A',
        ];
        return row;
      });

      // Add responses table
      // @ts-ignore - autoTable extends jsPDF prototype
      doc.autoTable({
        head: [['#', 'Participant', 'Email', 'Status', 'Submitted']],
        body: tableData,
        startY: 32,
        theme: 'grid',
        headStyles: {
          fillColor: [59, 130, 246], // qsights-blue
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 50 },
          2: { cellWidth: 60 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30 },
        },
      });

      // Add question-wise analysis if questionnaire exists
      if (questionnaire?.sections && questionnaire.sections.length > 0) {
        let currentY = (doc as any).lastAutoTable.finalY + 15;

        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text('Question-wise Analysis', 14, currentY);
        currentY += 8;

        questionnaire.sections.forEach((section: any, sectionIndex: number) => {
          section.questions?.forEach((question: any, qIndex: number) => {
            // Check if we need a new page
            if (currentY > 180) {
              doc.addPage();
              currentY = 15;
            }

            // Question title
            doc.setFontSize(11);
            doc.setTextColor(59, 130, 246);
            doc.text(`Q${sectionIndex + 1}.${qIndex + 1}: ${question.title || question.text || 'Question'}`, 14, currentY);
            currentY += 7;

            // Get responses for this question
            const questionResponses = responses
              .map(r => {
                // answers is an array of {question_id, value, value_array}
                if (Array.isArray(r.answers)) {
                  const answerObj = r.answers.find((a: any) => a.question_id === question.id);
                  if (answerObj) {
                    return answerObj.value_array || answerObj.value;
                  }
                }
                return null;
              })
              .filter(a => a !== undefined && a !== null && a !== '');

            // Calculate statistics for choice questions
            if (['single_choice', 'multiple_choice', 'radio', 'checkbox'].includes(question.type)) {
              const stats: Record<string, number> = {};
              questionResponses.forEach((answer: any) => {
                const value = Array.isArray(answer) ? answer : [answer];
                value.forEach((v: any) => {
                  const key = String(v);
                  stats[key] = (stats[key] || 0) + 1;
                });
              });

              const statsData = Object.entries(stats).map(([option, count]) => [
                option,
                count,
                `${((count / questionResponses.length) * 100).toFixed(1)}%`,
              ]);

              // @ts-ignore - autoTable extends jsPDF prototype
              doc.autoTable({
                head: [['Option', 'Count', 'Percentage']],
                body: statsData,
                startY: currentY,
                theme: 'striped',
                headStyles: {
                  fillColor: [229, 231, 235],
                  textColor: [40, 40, 40],
                  fontStyle: 'bold',
                },
                styles: {
                  fontSize: 9,
                  cellPadding: 2,
                },
                margin: { left: 20 },
              });

              currentY = (doc as any).lastAutoTable.finalY + 8;
            } else {
              // Text responses
              doc.setFontSize(9);
              doc.setTextColor(100, 100, 100);
              doc.text(`${questionResponses.length} text ${questionResponses.length === 1 ? 'response' : 'responses'}`, 20, currentY);
              currentY += 8;
            }
          });
        });
      }

      // Save PDF
      const filename = `${activity?.name || 'activity'}_results_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      toast({ 
        title: "Success", 
        description: 'Results exported as PDF successfully!',
        variant: "success" 
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({ 
        title: "Error", 
        description: 'Failed to export PDF',
        variant: "error" 
      });
    }
  }

  if (loading) {
    return (
      <RoleBasedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-qsights-blue mx-auto" />
            <p className="mt-2 text-sm text-gray-500">Loading results...</p>
          </div>
        </div>
      </RoleBasedLayout>
    );
  }

  if (error || !activity) {
    return (
      <RoleBasedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600">{error || "Activity not found"}</p>
            <button
              onClick={() => router.push("/activities")}
              className="mt-4 px-4 py-2 bg-qsights-blue text-white rounded-lg"
            >
              Back to Activities
            </button>
          </div>
        </div>
      </RoleBasedLayout>
    );
  }

  // Map backend statistics to frontend format
  const stats = {
    total_responses: statistics?.total_responses || 0,
    completed_responses: statistics?.submitted || 0,
    in_progress_responses: statistics?.in_progress || 0,
    completion_rate: statistics?.submitted && statistics?.total_responses 
      ? Math.round((statistics.submitted / statistics.total_responses) * 100)
      : 0,
  };

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        {/* Enhanced Page Header */}
        <div className="bg-gradient-to-r from-blue-50 via-white to-purple-50 rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/activities")}
                className="p-2.5 hover:bg-white rounded-lg transition-all shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300"
                title="Back to Events"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Event Results
                </h1>
                <p className="text-base text-gray-600 font-medium mt-1">{activity.name}</p>
              </div>
            </div>
            <div className="relative export-dropdown">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-bold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="py-2">
                  <button
                    onClick={() => {
                      try {
                        exportToExcel('xlsx');
                        setShowExportMenu(false);
                      } catch (error) {
                        console.error('Excel export error:', error);
                        toast({
                          title: "Export Error",
                          description: error instanceof Error ? error.message : 'Failed to export',
                          variant: "error"
                        });
                      }
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="font-medium">Export as Excel</div>
                      <div className="text-xs text-gray-500">Download .xlsx file</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      try {
                        exportToExcel('csv');
                        setShowExportMenu(false);
                      } catch (error) {
                        console.error('CSV export error:', error);
                        toast({
                          title: "Export Error",
                          description: error instanceof Error ? error.message : 'Failed to export',
                          variant: "error"
                        });
                      }
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-medium">Export as CSV</div>
                      <div className="text-xs text-gray-500">Download .csv file</div>
                    </div>
                  </button>
                  
                  <div className="border-t border-gray-100 my-1"></div>
                  
                  <button
                    onClick={() => {
                      try {
                        exportToPDF();
                        setShowExportMenu(false);
                      } catch (error) {
                        console.error('PDF export error:', error);
                        toast({
                          title: "Export Error",
                          description: error instanceof Error ? error.message : 'Failed to export',
                          variant: "error"
                        });
                      }
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-red-600" />
                    <div>
                      <div className="font-medium">Export as PDF</div>
                      <div className="text-xs text-gray-500">Download .pdf file</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Modern Activity Details Card */}
        <Card className="overflow-hidden border-2 border-gray-200 hover:border-blue-300 transition-all shadow-md hover:shadow-xl">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 relative overflow-hidden">
            {/* Decorative Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-16 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-24 -mb-12 blur-2xl"></div>
            </div>
            
            <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Activity Type */}
              <div className="group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg group-hover:bg-white/30 transition-all">
                    <ActivityIcon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Event Type</p>
                </div>
                <p className="text-xl font-bold text-white capitalize pl-11">{activity.type}</p>
              </div>

              {/* Status */}
              <div className="group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg group-hover:bg-white/30 transition-all">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Status</p>
                </div>
                <div className="pl-11">
                  <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold ${
                    activity.status === 'live' ? 'bg-green-500 text-white' :
                    activity.status === 'upcoming' ? 'bg-yellow-500 text-white' :
                    activity.status === 'closed' ? 'bg-blue-500 text-white' :
                    activity.status === 'expired' ? 'bg-red-500 text-white' :
                    'bg-gray-500 text-white'
                  } shadow-lg capitalize`}>
                    {activity.status}
                  </span>
                </div>
              </div>

              {/* Start Date */}
              {activity.start_date && (
                <div className="group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg group-hover:bg-white/30 transition-all">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Start Date</p>
                  </div>
                  <p className="text-lg font-bold text-white pl-11">
                    {new Date(activity.start_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              )}

              {/* End Date */}
              {activity.end_date && (
                <div className="group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg group-hover:bg-white/30 transition-all">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">End Date</p>
                  </div>
                  <p className="text-lg font-bold text-white pl-11">
                    {new Date(activity.end_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Enhanced Statistics Grid with Modern Design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <GradientStatCard
            title="Total Responses"
            value={stats.total_responses || 0}
            subtitle="All submissions tracked"
            icon={Users}
            variant="blue"
          />

          <GradientStatCard
            title="Completed"
            value={stats.completed_responses || 0}
            subtitle="Successfully submitted"
            icon={CheckCircle}
            variant="green"
          />

          <GradientStatCard
            title="In Progress"
            value={stats.in_progress_responses || 0}
            subtitle="Currently active"
            icon={Clock}
            variant="amber"
          />

          <GradientStatCard
            title="Completion Rate"
            value={`${stats.completion_rate}%`}
            icon={TrendingUp}
            variant="purple"
          />
        </div>

        {/* Tabs for Different Views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="inline-flex h-auto items-center justify-start rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 p-1.5 text-gray-600 shadow-inner border border-gray-200 flex-wrap gap-1 mb-6">
            <TabsTrigger 
              value="overview" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100 hover:text-gray-900"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="detailed" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-100 hover:text-gray-900"
            >
              <PieChart className="w-4 h-4 mr-2" />
              Detailed Analysis
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-lg data-[state=active]:shadow-amber-100 hover:text-gray-900"
            >
              <Mail className="w-4 h-4 mr-2" />
              Notification Reports
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <List className="w-5 h-5 text-blue-600" />
                </div>
                <span>Response List</span>
                <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                  {responses.length} {responses.length === 1 ? 'Response' : 'Responses'}
                </span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {responses.length > 0 ? (
              <div>
                {/* Enhanced Response List Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Participant
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Completion
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Submitted At
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {responses.map((response: any, index: number) => (
                        <tr key={response.id} className="hover:bg-blue-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">{index + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                                {(response.participant?.name || response.participant?.email || 'G')[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {response.participant?.name || 
                                   response.metadata?.participant_name || 
                                   (response.guest_identifier ? `Anonymous User` : 'Anonymous User')}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {response.participant?.email || 
                                   response.metadata?.participant_email ||
                                   (response.guest_identifier ? String(response.guest_identifier).substring(0, 12) : 'No email')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                              response.guest_identifier || 
                              response.participant?.additional_data?.participant_type === 'anonymous' ||
                              (response.participant?.email && response.participant.email.includes('@anonymous.local'))
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}>
                              {response.guest_identifier || 
                               response.participant?.additional_data?.participant_type === 'anonymous' ||
                               (response.participant?.email && response.participant.email.includes('@anonymous.local'))
                                ? '🕶️ Anonymous' 
                                : '👥 Participant'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                              response.status === 'submitted'
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}>
                              {response.status === 'submitted' ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Completed
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5" />
                                  In Progress
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    response.status === 'submitted' 
                                      ? 'bg-gradient-to-r from-green-500 to-green-600' 
                                      : 'bg-gradient-to-r from-blue-500 to-blue-600'
                                  }`}
                                  style={{ 
                                    width: `${response.status === 'submitted' 
                                      ? 100 
                                      : (response.completion_percentage || 0)}%` 
                                  }}
                                ></div>
                              </div>
                              <span className="font-semibold text-gray-900 min-w-[45px]">
                                {response.status === 'submitted' 
                                  ? '100%' 
                                  : response.completion_percentage 
                                    ? `${Math.round(response.completion_percentage)}%` 
                                    : '0%'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {response.submitted_at
                                  ? new Date(response.submitted_at).toLocaleDateString('en-US', { 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })
                                  : response.status === 'submitted' && response.updated_at
                                    ? new Date(response.updated_at).toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })
                                    : '-'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {response.submitted_at
                                  ? new Date(response.submitted_at).toLocaleTimeString('en-US', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })
                                  : response.status === 'submitted' && response.updated_at
                                    ? new Date(response.updated_at).toLocaleTimeString('en-US', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })
                                    : ''}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            ) : (
              <div className="text-center py-20 px-6">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BarChart3 className="w-12 h-12 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No responses yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Responses will appear here once participants complete the event
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>Waiting for submissions...</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Detailed Analysis Tab */}
          <TabsContent value="detailed">
            <div className="space-y-6">
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-500 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                        <PieChart className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Question-wise Analysis</h2>
                        <p className="text-sm text-gray-600 mt-1">Detailed breakdown of responses with participant-level insights</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setChartType('bar')}
                        className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                          chartType === 'bar'
                            ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                            : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-green-500 hover:text-green-600'
                        }`}
                      >
                        <BarChart3 className="w-4 h-4 inline mr-2" />
                        Bar Chart
                      </button>
                      <button 
                        onClick={() => setChartType('pie')}
                        className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                          chartType === 'pie'
                            ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                            : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-green-500 hover:text-green-600'
                        }`}
                      >
                        <PieChart className="w-4 h-4 inline mr-2" />
                        Pie Chart
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {questionnaire?.sections && questionnaire.sections.length > 0 ? (
                questionnaire.sections.map((section: any, sectionIndex: number) => (
                  <div key={section.id || sectionIndex} className="space-y-6">
                    {section.title && (
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{section.title}</h3>
                    )}
                    {section.questions?.map((question: any, qIndex: number) => {
                      // Debug question structure (can be removed after verification)
                      if (qIndex === 0) {
                        console.log(`\n=== Question ${qIndex + 1} ===`);
                        console.log('Question ID:', question.id);
                        console.log('Question Type:', question.type);
                        console.log('Question Title:', question.title);
                        console.log('Total Responses:', responses.length);
                      }
                      
                      // Get all responses for this question
                      const questionResponses = responses
                        .map((r, idx) => {
                          // Debug first response (can be removed after verification)
                          if (idx === 0 && qIndex === 0) {
                            console.log('First Response Structure:', {
                              id: r.id,
                              answersCount: Array.isArray(r.answers) ? r.answers.length : 0,
                              sampleAnswer: Array.isArray(r.answers) && r.answers[0] ? {
                                question_id: r.answers[0].question_id,
                                value: r.answers[0].value,
                                value_array: r.answers[0].value_array
                              } : null
                            });
                          }
                          
                          // Answer records are loaded via answers() relationship
                          // Format: [{id: 'xxx', question_id: 'yyy', value: 'zzz', value_array: [...]}]
                          
                          if (Array.isArray(r.answers) && r.answers.length > 0) {
                            // Find the answer for this specific question by question_id
                            const answer = r.answers.find((a: any) => a.question_id === question.id);
                            
                            if (answer) {
                              // Get the actual answer value
                              // value_array is used for multi-select, checkbox, matrix
                              // value is used for single-select, text, number, etc.
                              const answerValue = answer.value_array || answer.value;
                              
                              if (idx < 3) {
                                console.log(`Response ${idx + 1} found answer:`, {
                                  question_id: answer.question_id,
                                  value: answer.value,
                                  value_array: answer.value_array,
                                  final_value: answerValue
                                });
                              }
                              
                              return answerValue;
                            }
                            
                            if (idx < 3) {
                              console.log(`Response ${idx + 1} - No answer found for question ${question.id}`);
                            }
                          }
                          
                          return null;
                        })
                        .filter(a => a !== undefined && a !== null && a !== '');
                      
                      // Show summary for first question only
                      if (qIndex === 0) {
                        console.log(`Question Responses Count: ${questionResponses.length}`);
                        console.log('Sample Responses:', questionResponses.slice(0, 3));
                      }

                      // Calculate statistics for multiple choice questions
                      const calculateChoiceStats = () => {
                        const stats: Record<string, number> = {};
                        questionResponses.forEach((answer: any) => {
                          const value = Array.isArray(answer) ? answer : [answer];
                          value.forEach((v: any) => {
                            const key = String(v);
                            stats[key] = (stats[key] || 0) + 1;
                          });
                        });
                        return stats;
                      };

                      const stats = ['single_choice', 'multiple_choice', 'radio', 'checkbox'].includes(question.type)
                        ? calculateChoiceStats()
                        : null;

                      const totalResponses = questionResponses.length;

                      // Get participants who responded to this question
                      const participantResponses = responses.map((r) => {
                        const answer = Array.isArray(r.answers) ? r.answers.find((a: any) => a.question_id === question.id) : null;
                        const answerValue = answer ? (answer.value_array || answer.value) : null;
                        return {
                          participantName: r.participant?.name || r.participant?.email || 'Anonymous',
                          participantEmail: r.participant?.email || 'N/A',
                          answer: answerValue,
                          submittedAt: r.submitted_at || r.updated_at,
                        };
                      }).filter(pr => pr.answer !== null && pr.answer !== undefined && pr.answer !== '');

                      return (
                        <Card key={question.id || qIndex} className="overflow-hidden border-2 border-gray-200 hover:border-green-300 transition-all">
                          <CardHeader className="bg-gradient-to-r from-gray-50 to-green-50 border-b-2 border-gray-200">
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className="text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-1 rounded-full">
                                    Q{sectionIndex + 1}.{qIndex + 1}
                                  </span>
                                  <span className="text-xs px-3 py-1 bg-white border-2 border-gray-300 rounded-full font-semibold text-gray-700">
                                    {question.type || 'text'}
                                  </span>
                                  {question.required && (
                                    <span className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-full font-semibold">
                                      Required
                                    </span>
                                  )}
                                </div>
                                <CardTitle className="text-lg font-bold text-gray-900 break-words">
                                  {question.title || question.text || question.question || `Question ${qIndex + 1}`}
                                </CardTitle>
                                {question.description && (
                                  <p className="text-sm text-gray-600 mt-2">{question.description}</p>
                                )}
                              </div>
                              <div className="flex gap-4">
                                <div className="text-center px-4 py-2 bg-white rounded-lg border-2 border-gray-200 shadow-sm">
                                  <p className="text-xs text-gray-500 mb-1">Responses</p>
                                  <p className="text-2xl font-bold text-green-600">{totalResponses}</p>
                                </div>
                                {stats && (
                                  <div className="text-center px-4 py-2 bg-white rounded-lg border-2 border-gray-200 shadow-sm">
                                    <p className="text-xs text-gray-500 mb-1">Options</p>
                                    <p className="text-2xl font-bold text-blue-600">{Object.keys(stats).length}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6">
                            {totalResponses > 0 ? (
                              <div className="space-y-6">
                                {/* Summary Stats Banner */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border-2 border-blue-100">
                                  <div className="text-center">
                                    <p className="text-xs text-gray-600 mb-1">Total Responses</p>
                                    <p className="text-2xl font-bold text-gray-900">{totalResponses}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs text-gray-600 mb-1">Response Rate</p>
                                    <p className="text-2xl font-bold text-green-600">
                                      {responses.length > 0 ? ((totalResponses / responses.length) * 100).toFixed(0) : 0}%
                                    </p>
                                  </div>
                                  {stats && (
                                    <>
                                      <div className="text-center">
                                        <p className="text-xs text-gray-600 mb-1">Most Popular</p>
                                        <p className="text-sm font-bold text-blue-600 truncate">
                                          {Object.entries(stats).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A'}
                                        </p>
                                      </div>
                                      <div className="text-center">
                                        <p className="text-xs text-gray-600 mb-1">Unique Answers</p>
                                        <p className="text-2xl font-bold text-purple-600">{Object.keys(stats).length}</p>
                                      </div>
                                    </>
                                  )}
                                </div>

                                {stats ? (
                                  chartType === 'bar' ? (
                                    // Enhanced Bar chart for choice questions
                                    <div className="space-y-4">
                                      <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4" />
                                        Response Distribution
                                      </h4>
                                      {Object.entries(stats).sort((a: any, b: any) => b[1] - a[1]).map(([option, count], idx) => {
                                        const percentage = ((count / totalResponses) * 100).toFixed(1);
                                        const colors = [
                                          'from-blue-500 to-blue-600',
                                          'from-green-500 to-green-600',
                                          'from-purple-500 to-purple-600',
                                          'from-orange-500 to-orange-600',
                                          'from-pink-500 to-pink-600',
                                          'from-indigo-500 to-indigo-600',
                                          'from-teal-500 to-teal-600',
                                          'from-red-500 to-red-600'
                                        ];
                                        return (
                                          <div key={option} className="space-y-2 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                            <div className="flex items-center justify-between">
                                              <span className="font-semibold text-gray-800 break-words flex-1">{option}</span>
                                              <div className="flex items-center gap-3 ml-3">
                                                <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{count} responses</span>
                                                <span className="text-sm font-bold text-green-600 min-w-[50px] text-right">{percentage}%</span>
                                              </div>
                                            </div>
                                            <div className="w-full bg-gradient-to-r from-gray-100 to-gray-200 rounded-full h-10 overflow-hidden shadow-inner">
                                              <div
                                                className={`bg-gradient-to-r ${colors[idx % colors.length]} h-full flex items-center px-3 text-white text-sm font-bold transition-all duration-500 ease-out`}
                                                style={{ width: `${Math.max(parseFloat(percentage), 3)}%` }}
                                              >
                                                {parseFloat(percentage) > 10 && `${percentage}%`}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    // Enhanced Pie chart view for choice questions
                                    <div>
                                      <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                        <PieChart className="w-4 h-4" />
                                        Response Distribution
                                      </h4>
                                      <div className="flex flex-col lg:flex-row items-center gap-8 p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-gray-200">
                                        <div className="relative w-72 h-72">
                                          <svg viewBox="0 0 200 200" className="transform -rotate-90 drop-shadow-lg">
                                            {(() => {
                                              const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
                                              let currentAngle = 0;
                                              return Object.entries(stats).sort((a: any, b: any) => b[1] - a[1]).map(([option, count], idx) => {
                                                const percentage = (count / totalResponses) * 100;
                                                const angle = (percentage / 100) * 360;
                                                const endAngle = currentAngle + angle;
                                                const largeArcFlag = angle > 180 ? 1 : 0;
                                                
                                                const startX = 100 + 85 * Math.cos((currentAngle * Math.PI) / 180);
                                                const startY = 100 + 85 * Math.sin((currentAngle * Math.PI) / 180);
                                                const endX = 100 + 85 * Math.cos((endAngle * Math.PI) / 180);
                                                const endY = 100 + 85 * Math.sin((endAngle * Math.PI) / 180);
                                                
                                                const path = `M 100 100 L ${startX} ${startY} A 85 85 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
                                                currentAngle = endAngle;
                                                
                                                return (
                                                  <g key={idx}>
                                                    <path
                                                      d={path}
                                                      fill={colors[idx % colors.length]}
                                                      className="hover:opacity-80 transition-all cursor-pointer"
                                                      stroke="white"
                                                      strokeWidth="2"
                                                    />
                                                  </g>
                                                );
                                              });
                                            })()}
                                            <circle cx="100" cy="100" r="45" fill="white" className="drop-shadow" />
                                            <text x="100" y="95" textAnchor="middle" className="text-2xl font-bold fill-gray-800">
                                              {totalResponses}
                                            </text>
                                            <text x="100" y="110" textAnchor="middle" className="text-xs fill-gray-600">
                                              Total
                                            </text>
                                          </svg>
                                        </div>
                                        <div className="flex-1 space-y-3 w-full">
                                          {(() => {
                                            const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
                                            return Object.entries(stats).sort((a: any, b: any) => b[1] - a[1]).map(([option, count], idx) => {
                                              const percentage = ((count / totalResponses) * 100).toFixed(1);
                                              return (
                                                <div key={idx} className="flex items-center gap-3 p-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                                                  <div 
                                                    className="w-5 h-5 rounded-full shadow-md flex-shrink-0" 
                                                    style={{ backgroundColor: colors[idx % colors.length] }}
                                                  ></div>
                                                  <span className="flex-1 text-sm font-semibold text-gray-800 break-words">{option}</span>
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">{count}</span>
                                                    <span className="text-sm font-bold text-green-600 min-w-[50px] text-right">{percentage}%</span>
                                                  </div>
                                                </div>
                                              );
                                            });
                                          })()}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                ) : (
                                  // Text/Open-ended responses
                                  <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                      <List className="w-4 h-4" />
                                      Individual Responses ({totalResponses})
                                    </h4>
                                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                      {questionResponses.map((answer: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-gradient-to-r from-blue-50 to-white rounded-lg border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                                          <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                                              {idx + 1}
                                            </div>
                                            <p className="text-sm text-gray-800 flex-1 break-words">
                                              {typeof answer === 'object' ? JSON.stringify(answer, null, 2) : String(answer)}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Per-Participant Response Details */}
                                {participantResponses.length > 0 && (
                                  <div className="mt-6 pt-6 border-t-2 border-gray-200">
                                    <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                      <Users className="w-4 h-4" />
                                      Per-Participant Response Details
                                    </h4>
                                    <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                                      <div className="overflow-x-auto">
                                        <table className="w-full">
                                          <thead className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
                                            <tr>
                                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">#</th>
                                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Participant</th>
                                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Response</th>
                                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Submitted</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-200">
                                            {participantResponses.map((pr, idx) => (
                                              <tr key={idx} className="hover:bg-blue-50 transition-colors">
                                                <td className="px-4 py-3 text-sm font-bold text-gray-600">{idx + 1}</td>
                                                <td className="px-4 py-3">
                                                  <div className="text-sm">
                                                    <p className="font-semibold text-gray-900">{pr.participantName}</p>
                                                    <p className="text-xs text-gray-500">{pr.participantEmail}</p>
                                                  </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                  <div className="text-sm text-gray-800 break-words max-w-md">
                                                    {Array.isArray(pr.answer) ? (
                                                      <div className="flex flex-wrap gap-1">
                                                        {pr.answer.map((ans: any, i: number) => (
                                                          <span key={i} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                                            {String(ans)}
                                                          </span>
                                                        ))}
                                                      </div>
                                                    ) : (
                                                      <span className="font-medium">{String(pr.answer)}</span>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                  {pr.submittedAt ? new Date(pr.submittedAt).toLocaleString() : 'N/A'}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-12 bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                                <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                                  <BarChart3 className="w-10 h-10 text-gray-500" />
                                </div>
                                <p className="text-gray-800 font-bold text-base mb-2">No Responses for this Question</p>
                                <p className="text-gray-600 text-sm max-w-md mx-auto">
                                  {responses.length > 0 
                                    ? 'Participants may have skipped this question or need to re-submit their responses' 
                                    : 'Waiting for participants to complete the survey'}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <PieChart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">No questionnaire data available</p>
                    <p className="text-sm text-gray-400">
                      Questions will appear here once the activity has an associated questionnaire
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Notification Reports Tab */}
          <TabsContent value="notifications">
            <div className="space-y-6">
              {/* Header Card */}
              <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-l-amber-500 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500 rounded-xl shadow-lg">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Email Notification Tracking</h2>
                      <p className="text-sm text-gray-600 mt-1">Monitor email delivery, open rates, and engagement metrics</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <GradientStatCard
                  title="Total Campaigns"
                  value={notificationReports.length}
                  subtitle="Email campaigns sent"
                  icon={Mail}
                  variant="blue"
                />

                <GradientStatCard
                  title="Total Sent"
                  value={notificationReports.reduce((sum, r) => sum + r.sent_count, 0)}
                  subtitle="Emails successfully delivered"
                  icon={CheckCircle}
                  variant="green"
                />

                <GradientStatCard
                  title="Failed"
                  value={notificationReports.reduce((sum, r) => sum + r.failed_count, 0)}
                  subtitle={`${notificationReports.reduce((sum, r) => sum + r.total_recipients, 0) > 0
                    ? ((notificationReports.reduce((sum, r) => sum + r.failed_count, 0) / notificationReports.reduce((sum, r) => sum + r.total_recipients, 0)) * 100).toFixed(1)
                    : 0}% failure rate`}
                  icon={X}
                  variant="red"
                />

                <GradientStatCard
                  title="Success Rate"
                  value={`${notificationReports.reduce((sum, r) => sum + r.total_recipients, 0) > 0
                    ? ((notificationReports.reduce((sum, r) => sum + r.sent_count, 0) / notificationReports.reduce((sum, r) => sum + r.total_recipients, 0)) * 100).toFixed(1)
                    : 0}%`}
                  subtitle="Overall delivery success"
                  icon={TrendingUp}
                  variant="purple"
                />
              </div>

              {/* Notification Reports Table */}
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Mail className="w-5 h-5 text-amber-600" />
                      </div>
                      <span>Email Campaign Reports</span>
                      <span className="ml-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
                        {notificationReports.length} {notificationReports.length === 1 ? 'Campaign' : 'Campaigns'}
                      </span>
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Template Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Recipients
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sent Successfully
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Failed
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Success Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sent At
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {notificationReports.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                              <div className="flex flex-col items-center gap-3">
                                <Mail className="w-12 h-12 text-gray-300" />
                                <p className="text-lg font-medium">No email campaigns sent yet</p>
                                <p className="text-sm">Send notifications to participants to see reports here</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          notificationReports.map((report) => (
                            <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                  {report.template_type.replace(/_/g, ' ').toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-semibold text-gray-900">{report.total_recipients}</p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  <p className="text-sm font-semibold text-green-600">{report.sent_count}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {report.failed_count > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <X className="w-4 h-4 text-red-500" />
                                    <p className="text-sm font-semibold text-red-600">{report.failed_count}</p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">-</p>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                                    <div
                                      className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full"
                                      style={{ width: `${(report.sent_count / report.total_recipients) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-semibold text-gray-700">
                                    {((report.sent_count / report.total_recipients) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-xs text-gray-900">
                                  {new Date(report.created_at).toLocaleString()}
                                </p>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RoleBasedLayout>
  );
}
