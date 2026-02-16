"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
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
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Send,
  Eye,
  MousePointer,
  X,
  Trash2,
  Calendar,
  Activity as ActivityIcon,
  Award,
  ClipboardList,
  TrendingDown,
  Hash,
  MessageSquare,
} from "lucide-react";
import { activitiesApi, responsesApi, notificationsApi, type Activity } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";

// Participant Details Modal Component
interface ParticipantDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: any;
  registrationFields: any[];
}

function ParticipantDetailsModal({ isOpen, onClose, participant, registrationFields }: ParticipantDetailsModalProps) {
  if (!isOpen || !participant) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-xl">
              {(participant.participant?.name || participant.participant?.email || 'A')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Participant Details</h2>
              <p className="text-sm text-blue-100">Complete registration information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {/* Basic Information Section */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Basic Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Name</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {participant.participant?.name || 
                     participant.metadata?.participant_name || 
                     (participant.guest_identifier ? 'Anonymous User' : 'Anonymous User')}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Email</label>
                  <p className="text-sm font-medium text-gray-900 mt-1 break-all">
                    {participant.participant?.email || 
                     participant.metadata?.participant_email ||
                     (participant.guest_identifier ? String(participant.guest_identifier).substring(0, 20) : 'No email')}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Registration Date</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {participant.participant?.created_at
                      ? new Date(participant.participant.created_at).toLocaleString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Participant Type</label>
                  <p className="text-sm font-medium mt-1">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      participant.guest_identifier || 
                      participant.participant?.additional_data?.participant_type === 'anonymous' ||
                      (participant.participant?.email && participant.participant.email.includes('@anonymous.local'))
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                      {participant.guest_identifier || 
                       participant.participant?.additional_data?.participant_type === 'anonymous' ||
                       (participant.participant?.email && participant.participant.email.includes('@anonymous.local'))
                        ? '🕶️ Anonymous' 
                        : '👥 Registered'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Status Section */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ActivityIcon className="w-4 h-4" />
              Activity Status
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                  <p className="text-sm font-medium mt-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      participant.status === 'submitted'
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      {participant.status === 'submitted' ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Completed
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          In Progress
                        </>
                      )}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Completion</label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          participant.status === 'submitted' 
                            ? 'bg-gradient-to-r from-green-500 to-green-600' 
                            : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}
                        style={{ 
                          width: `${participant.status === 'submitted' 
                            ? 100 
                            : (participant.completion_percentage || 0)}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {participant.status === 'submitted' 
                        ? '100%' 
                        : participant.completion_percentage 
                          ? `${Math.round(participant.completion_percentage)}%` 
                          : '0%'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Submitted At</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {participant.submitted_at
                      ? new Date(participant.submitted_at).toLocaleString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : participant.status === 'submitted' && participant.updated_at
                        ? new Date(participant.updated_at).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Registration Fields Section */}
          {registrationFields.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Custom Registration Fields
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {registrationFields.map((field: any) => (
                    <div key={field.name}>
                      <label className="text-xs font-semibold text-gray-500 uppercase">{field.label || field.name}</label>
                      <p className="text-sm font-medium text-gray-900 mt-1 break-words">
                        {participant.participant?.additional_data?.[field.name] || '-'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {registrationFields.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No custom registration fields for this event</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to format video duration seconds to HH:MM:SS format
function formatVideoDuration(seconds: number): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to format answer values for display
// Handles JSON objects from dial_gauge and slider_scale (e.g., {"value_type":"range","raw_value":2,"display_value":"40-60%"})
function formatAnswerForDisplay(answer: any): string {
  if (answer === null || answer === undefined) return 'No response';
  
  // Check if it's a JSON object with display_value (dial_gauge/slider_scale)
  if (typeof answer === 'object' && answer !== null && !Array.isArray(answer)) {
    // If it has display_value, use that
    if (answer.display_value !== undefined) {
      return String(answer.display_value);
    }
    // If it has value_type and raw_value but no display_value, format it
    if (answer.value_type && answer.raw_value !== undefined) {
      return String(answer.raw_value);
    }
    // Try to parse if it's a stringified JSON
    try {
      return JSON.stringify(answer);
    } catch {
      return String(answer);
    }
  }
  
  // Check if it's a JSON string that needs parsing
  if (typeof answer === 'string') {
    try {
      const parsed = JSON.parse(answer);
      if (parsed && typeof parsed === 'object' && parsed.display_value !== undefined) {
        return String(parsed.display_value);
      }
    } catch {
      // Not JSON, just return as is
    }
  }
  
  return String(answer);
}

const OTHER_OPTION_VALUE = '__other__';

function formatAnswerObjectForExport(answerObj: any): string {
  if (!answerObj) return 'No response';

  const answerValue = answerObj.value_array || answerObj.value;
  const otherText = typeof answerObj.other_text === 'string' ? answerObj.other_text.trim() : '';

  if (Array.isArray(answerValue)) {
    const parts = answerValue
      .map((v: any) => {
        if (v === OTHER_OPTION_VALUE) {
          return otherText ? `Other: ${otherText}` : 'Other';
        }
        return formatAnswerForDisplay(v);
      })
      .filter((p: string) => p && p !== 'No response');
    return parts.length > 0 ? parts.join(', ') : 'No response';
  }

  if (answerValue === OTHER_OPTION_VALUE) {
    return otherText ? `Other: ${otherText}` : 'Other';
  }

  const base = formatAnswerForDisplay(answerValue);
  if (otherText) {
    return `${base} (Other: ${otherText})`;
  }
  return base;
}

// Helper function to format drag & drop responses with item/bucket names
function formatDragDropResponse(answer: any, questionSettings: any): React.ReactNode {
  if (!answer || typeof answer !== 'object') return formatAnswerForDisplay(answer);
  
  // Handle both parsed object and string
  const response = typeof answer === 'string' ? JSON.parse(answer) : answer;
  
  // Check if this is a drag_and_drop response
  if (!response.placements && !response.unplacedItems) {
    return formatAnswerForDisplay(answer);
  }

  const items = questionSettings?.items || [];
  const buckets = questionSettings?.buckets || [];

  // Create lookup maps
  const itemMap = new Map(items.map((item: any) => [item.id, item.text || item.id]));
  const bucketMap = new Map(buckets.map((bucket: any) => [bucket.id, bucket.label || bucket.id]));

  return (
    <div className="space-y-3">
      {/* Placements */}
      {response.placements && response.placements.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-gray-700 uppercase">Placed Items:</div>
          {response.placements.map((placement: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                {itemMap.get(placement.itemId) || placement.itemId}
              </span>
              <span className="text-gray-500">→</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-medium">
                {bucketMap.get(placement.bucketId) || placement.bucketId}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* Unplaced Items */}
      {response.unplacedItems && response.unplacedItems.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-gray-700 uppercase">Unplaced Items:</div>
          <div className="flex flex-wrap gap-2">
            {response.unplacedItems.map((itemId: string, idx: number) => (
              <span key={idx} className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-sm font-medium">
                {itemMap.get(itemId) || itemId}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Timestamp */}
      {response.timestamp && (
        <div className="text-xs text-gray-500 italic">
          Submitted: {new Date(response.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
}

// SCT Report Section Component
interface SCTReportSectionProps {
  activityId: string;
  questionnaire: any;
  responses: any[];
  activity: any;
}

function SCTReportSection({ activityId, questionnaire, responses, activity }: SCTReportSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState('breakdown');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<'totalScore' | 'averageScore' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Check if activity allows anonymous responses
  const isAnonymous = activity?.allow_anonymous || false;
  
  // Extract SCT questions from questionnaire
  const sctQuestions = useMemo(() => {
    if (!questionnaire?.sections) return [];
    
    const questions: any[] = [];
    questionnaire.sections.forEach((section: any, sectionIdx: number) => {
      section.questions?.forEach((q: any, qIdx: number) => {
        if (q.type === 'sct_likert' || q.type === 'likert_visual') {
          questions.push({
            ...q,
            sectionIndex: sectionIdx,
            questionIndex: qIdx,
            questionCode: `Q${questions.length + 1}`,
          });
        }
      });
    });
    return questions;
  }, [questionnaire]);
  
  // Calculate participant-wise SCT scores
  const participantScores = useMemo(() => {
    const scores: any[] = [];
    
    responses.forEach((response: any) => {
      const participantId = response.participant_id || response.guest_identifier || response.id;
      const participantName = response.participant?.name || `P${String(response.id).padStart(3, '0')}`;
      const participantEmail = response.participant?.email || response.guest_identifier || '';
      
      const questionScores: any[] = [];
      let totalScore = 0;
      let questionsAttempted = 0;
      
      sctQuestions.forEach((question) => {
        const answer = response.answers?.find((a: any) => a.question_id === question.id);
        
        if (answer) {
          let questionScore = 0;
          let selectedOptions = [];
          let questionType = '';
          
          // Determine question type and calculate score
          if (question.type === 'sct_likert') {
            const settings = question.settings || {};
            const responseType = settings.responseType || settings.choiceType || 'single';
            const scores = settings.scores || [];
            const labels = settings.labels || [];
            const normalizeMulti = settings.normalizeMultiSelect !== false;
            
            questionType = responseType === 'likert' ? 'SCT Likert' :
                          responseType === 'multi' ? 'SCT Multi Select' : 'SCT Single Choice';
            
            if (responseType === 'likert') {
              // Likert scale - could be label string or numeric point
              const answerValue = answer.value || answer.answer;
              
              // Try to find label index first
              let labelIndex = labels.findIndex((label: string) => label === answerValue);
              
              if (labelIndex >= 0 && labelIndex < scores.length) {
                questionScore = scores[labelIndex] || 0;
                selectedOptions = [labels[labelIndex]];
              } else {
                // Fallback: try as numeric point (1-based)
                const selectedPoint = parseInt(answerValue);
                if (!isNaN(selectedPoint) && selectedPoint >= 1 && selectedPoint <= scores.length) {
                  questionScore = scores[selectedPoint - 1] || 0;
                  selectedOptions = [`Point ${selectedPoint}`];
                }
              }
            } else if (responseType === 'multi') {
              // Multiple select - use value_array
              const answerArray = answer.value_array || (Array.isArray(answer.value) ? answer.value : [answer.value]);
              
              answerArray.forEach((selectedValue: any) => {
                // Find index of the selected label
                let labelIndex = labels.findIndex((label: string) => label === selectedValue);
                
                if (labelIndex >= 0 && labelIndex < scores.length) {
                  questionScore += scores[labelIndex] || 0;
                  selectedOptions.push(labels[labelIndex]);
                } else {
                  // Fallback: try as numeric index
                  const index = parseInt(selectedValue);
                  if (!isNaN(index) && index >= 0 && index < scores.length) {
                    questionScore += scores[index] || 0;
                    selectedOptions.push(labels[index] || `Option ${index + 1}`);
                  }
                }
              });
              
              // Normalize if enabled
              if (normalizeMulti && answerArray.length > 0) {
                questionScore = questionScore / answerArray.length;
              }
            } else {
              // Single select - value is the label string
              const selectedLabel = answer.value || answer.answer;
              const labelIndex = labels.findIndex((label: string) => label === selectedLabel);
              
              if (labelIndex >= 0 && labelIndex < scores.length) {
                questionScore = scores[labelIndex] || 0;
                selectedOptions = [labels[labelIndex]];
              } else {
                // Fallback: try as numeric index
                const selectedIndex = parseInt(selectedLabel);
                if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < scores.length) {
                  questionScore = scores[selectedIndex] || 0;
                  selectedOptions = [labels[selectedIndex] || `Option ${selectedIndex + 1}`];
                }
              }
            }
          } else if (question.type === 'likert_visual') {
            // Likert Visual - handle numeric value
            questionType = 'SCT Visual';
            const answerValue = answer.value || answer.answer;
            const selectedValue = parseInt(answerValue);
            if (!isNaN(selectedValue)) {
              // For likert_visual, score is typically the selected value itself
              // or you can configure custom scoring in settings
              questionScore = selectedValue;
              selectedOptions = [`${selectedValue}`];
            }
          }
          
          questionScores.push({
            questionId: question.id,
            questionCode: question.questionCode,
            questionText: question.question,
            questionType,
            selectedOptions: selectedOptions.join(', '),
            questionScore: parseFloat(questionScore.toFixed(2)),
          });
          
          totalScore += questionScore;
          questionsAttempted++;
        }
      });
      
      // Only include participants who attempted at least one SCT question
      if (questionsAttempted > 0) {
        scores.push({
          participantId,
          participantName: isAnonymous ? `P${String(scores.length + 1).padStart(3, '0')}` : participantName,
          participantEmail: isAnonymous ? '' : participantEmail,
          questionScores,
          totalScore: parseFloat(totalScore.toFixed(2)),
          questionsAttempted,
          averageScore: questionsAttempted > 0 ? parseFloat((totalScore / questionsAttempted).toFixed(1)) : 0,
        });
      }
    });
    
    return scores;
  }, [responses, sctQuestions, isAnonymous]);
  
  // Filtered and sorted participants
  const filteredParticipants = useMemo(() => {
    let filtered = participantScores;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = participantScores.filter(p => 
        p.participantName.toLowerCase().includes(query) ||
        p.participantEmail.toLowerCase().includes(query) ||
        p.questionScores.some((qs: any) => 
          qs.questionText.toLowerCase().includes(query) ||
          qs.selectedOptions.toLowerCase().includes(query)
        )
      );
    }
    
    // Apply sorting if a column is selected
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        if (sortDirection === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
    }
    
    return filtered;
  }, [participantScores, searchQuery, sortColumn, sortDirection]);
  
  // Leaderboard (sorted by total score)
  const leaderboard = useMemo(() => {
    return [...participantScores]
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((p, idx) => ({ ...p, rank: idx + 1 }));
  }, [participantScores]);
  
  // Export to CSV
  const exportToCSV = (type: 'breakdown' | 'leaderboard') => {
    let csvRows: string[] = [];
    
    if (type === 'breakdown') {
      // CSV Header
      csvRows.push('Participant,Email,Question Code,Question Type,Selected Options,Question Score,Total Score,Average Score');
      
      // CSV Data
      filteredParticipants.forEach(participant => {
        participant.questionScores.forEach((qs: any, idx: number) => {
          const row = [
            `"${participant.participantName}"`,
            `"${participant.participantEmail}"`,
            qs.questionCode,
            qs.questionType,
            `"${qs.selectedOptions}"`,
            qs.questionScore,
            idx === 0 ? participant.totalScore : '', // Only show total on first row
            idx === 0 ? participant.averageScore : '', // Only show average on first row
          ];
          csvRows.push(row.join(','));
        });
      });
    } else {
      // Leaderboard CSV
      csvRows.push('Rank,Participant,Email,Total Score,Questions Attempted,Average Score');
      
      leaderboard.forEach(p => {
        const row = [
          p.rank,
          `"${p.participantName}"`,
          `"${p.participantEmail}"`,
          p.totalScore,
          p.questionsAttempted,
          p.averageScore,
        ];
        csvRows.push(row.join(','));
      });
    }
    
    // Download CSV
    const csvContent = '\\uFEFF' + csvRows.join('\\n'); // Add BOM for UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sct-report-${type}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`${type === 'breakdown' ? 'Participant Breakdown' : 'Leaderboard'} exported successfully`);
  };
  
  // Check if no SCT questions
  if (sctQuestions.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-12 text-center">
          <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-500 mb-2">
            This Event/Activity does not contain any Script Concordance (SCT) type questionnaire.
          </p>
          <p className="text-sm text-gray-400">
            SCT questions include: SCT Single Choice, SCT Multi Select, SCT Likert, and SCT Visual
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* SCT Report Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-l-purple-500 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Script Concordance (SCT) Report</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Dedicated scoring report for {sctQuestions.length} SCT question{sctQuestions.length !== 1 ? 's' : ''} •{' '}
                  {participantScores.length} participant{participantScores.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => exportToCSV(activeSubTab === 'breakdown' ? 'breakdown' : 'leaderboard')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-purple-300 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Sub-tabs for Breakdown and Leaderboard */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveSubTab('breakdown')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeSubTab === 'breakdown'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <List className="w-4 h-4" />
                  Participant Breakdown
                </div>
              </button>
              <button
                onClick={() => setActiveSubTab('leaderboard')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeSubTab === 'leaderboard'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Leaderboard
                </div>
              </button>
            </div>
            
            {activeSubTab === 'breakdown' && (
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search participants or questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileSpreadsheet className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {activeSubTab === 'breakdown' ? (
            /* Participant Breakdown Table */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-100 to-pink-100 border-b-2 border-purple-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Participant
                    </th>
                    {!isAnonymous && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Email
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Question Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Question Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Selected Options
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Question Score
                    </th>
                    <th 
                      className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-purple-200 transition-colors"
                      onClick={() => {
                        if (sortColumn === 'totalScore') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortColumn('totalScore');
                          setSortDirection('desc');
                        }
                      }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Total Score</span>
                        {sortColumn === 'totalScore' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-purple-200 transition-colors"
                      onClick={() => {
                        if (sortColumn === 'averageScore') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortColumn('averageScore');
                          setSortDirection('desc');
                        }
                      }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Average</span>
                        {sortColumn === 'averageScore' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={isAnonymous ? 7 : 8} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-3">
                          <ClipboardList className="w-12 h-12 text-gray-300" />
                          <p className="text-lg font-medium">No SCT responses found</p>
                          <p className="text-sm">
                            {searchQuery ? 'Try a different search term' : 'Participants will appear here after completing SCT questions'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map((participant, pIdx) => (
                      participant.questionScores.map((qs: any, qIdx: number) => (
                        <tr key={`${participant.participantId}-${qs.questionId}`} className="hover:bg-purple-50 transition-colors">
                          {qIdx === 0 && (
                            <>
                              <td rowSpan={participant.questionScores.length} className="px-6 py-4 border-r border-gray-200 bg-gray-50">
                                <p className="text-sm font-semibold text-gray-900">{participant.participantName}</p>
                              </td>
                              {!isAnonymous && (
                                <td rowSpan={participant.questionScores.length} className="px-6 py-4 border-r border-gray-200 bg-gray-50">
                                  <p className="text-xs text-gray-600 break-all">{participant.participantEmail}</p>
                                </td>
                              )}
                            </>
                          )}
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">{qs.questionCode}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-medium text-gray-700">{qs.questionType}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-gray-900 max-w-xs truncate" title={qs.selectedOptions}>
                              {qs.selectedOptions}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                              qs.questionScore > 0 ? 'bg-green-100 text-green-700' :
                              qs.questionScore < 0 ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {qs.questionScore > 0 ? '+' : ''}{qs.questionScore}
                            </span>
                          </td>
                          {qIdx === 0 && (
                            <>
                              <td rowSpan={participant.questionScores.length} className="px-6 py-4 text-center border-l border-gray-200 bg-purple-50">
                                <p className="text-lg font-bold text-purple-700">
                                  {participant.totalScore > 0 ? '+' : ''}{participant.totalScore}
                                </p>
                              </td>
                              <td rowSpan={participant.questionScores.length} className="px-6 py-4 text-center border-l border-gray-200 bg-purple-50">
                                <p className="text-sm font-semibold text-gray-700">{participant.averageScore}</p>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Leaderboard Table */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-amber-100 to-yellow-100 border-b-2 border-amber-200">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Participant
                    </th>
                    {!isAnonymous && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Email
                      </th>
                    )}
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Total Score
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Questions Attempted
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Average Score
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={isAnonymous ? 5 : 6} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-3">
                          <Award className="w-12 h-12 text-gray-300" />
                          <p className="text-lg font-medium">No participants yet</p>
                          <p className="text-sm">Leaderboard will update as participants complete SCT questions</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((participant) => (
                      <tr key={participant.participantId} className="hover:bg-amber-50 transition-colors">
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center">
                            {participant.rank === 1 ? (
                              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-sm">🏆</span>
                              </div>
                            ) : participant.rank === 2 ? (
                              <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center shadow-md">
                                <span className="text-white font-bold text-sm">🥈</span>
                              </div>
                            ) : participant.rank === 3 ? (
                              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-md">
                                <span className="text-white font-bold text-sm">🥉</span>
                              </div>
                            ) : (
                              <span className="text-lg font-bold text-gray-600">#{participant.rank}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-gray-900">{participant.participantName}</p>
                        </td>
                        {!isAnonymous && (
                          <td className="px-6 py-4">
                            <p className="text-xs text-gray-600 break-all">{participant.participantEmail}</p>
                          </td>
                        )}
                        <td className="px-6 py-4 text-center">
                          <span className={`px-4 py-2 rounded-full text-base font-bold ${
                            participant.totalScore > 0 ? 'bg-green-100 text-green-700' :
                            participant.totalScore < 0 ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {participant.totalScore > 0 ? '+' : ''}{participant.totalScore}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-gray-700">{participant.questionsAttempted}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-semibold text-gray-900">{participant.averageScore}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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
  const [videoStatistics, setVideoStatistics] = useState<any>(null);
  const [videoViewLogs, setVideoViewLogs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [activeTab, setActiveTab] = useState('overview');
  const [notificationReports, setNotificationReports] = useState<NotificationReport[]>([]);
  const [orphanedResponses, setOrphanedResponses] = useState<string[]>([]);
  const [deletingResponses, setDeletingResponses] = useState<Set<string>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<{ id: string; name: string } | null>(null);
  
  // Modal state for participant details
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  
  // SCT Report state
  const [sctReportData, setSctReportData] = useState<any>(null);
  const [loadingSctReport, setLoadingSctReport] = useState(false);
  
  // Pagination state for responses
  const [responsePage, setResponsePage] = useState(1);
  const [responsesPerPage, setResponsesPerPage] = useState(50);

  // Search/filter for response list (includes Other free-text)
  const [responseSearch, setResponseSearch] = useState('');

  // Search/filter for notification reports
  const [notificationSearch, setNotificationSearch] = useState('');

  // Check if questionnaire has SCT questions
  const hasSCTQuestions = useMemo(() => {
    if (!questionnaire?.sections) return false;
    
    return questionnaire.sections.some((section: any) => 
      section.questions?.some((q: any) => 
        q.type === 'sct_likert' || q.type === 'likert_visual'
      )
    );
  }, [questionnaire]);

  const filteredResponses = useMemo(() => {
    const q = responseSearch.trim().toLowerCase();
    if (!q) return responses;

    return (responses || []).filter((r: any) => {
      const participantName = r?.participant?.name || r?.metadata?.participant_name || '';
      const participantEmail = r?.participant?.email || r?.metadata?.participant_email || '';
      const guestIdentifier = r?.guest_identifier || '';
      const status = r?.status || '';
      const submittedAt = r?.submitted_at || r?.updated_at || r?.created_at || '';

      let haystack = `${participantName} ${participantEmail} ${guestIdentifier} ${status} ${submittedAt}`.toLowerCase();

      if (Array.isArray(r?.answers)) {
        for (const ans of r.answers) {
          try {
            haystack += ` ${formatAnswerObjectForExport(ans)}`.toLowerCase();
          } catch {
            // ignore formatting errors; continue searching other fields
          }
          if (typeof ans?.other_text === 'string' && ans.other_text.trim()) {
            haystack += ` ${ans.other_text.trim()}`.toLowerCase();
          }
        }
      }

      return haystack.includes(q);
    });
  }, [responses, responseSearch]);

  // Filter notification reports by search query
  const filteredNotificationReports = useMemo(() => {
    const q = notificationSearch.trim().toLowerCase();
    if (!q) return notificationReports;

    return (notificationReports || []).filter((log: any) => {
      const participantName = log?.participant_name || log?.user_name || '';
      const participantEmail = log?.participant_email || '';
      const notificationType = log?.notification_type || '';
      const status = log?.status || '';
      const sentAt = log?.sent_at || '';
      const deliveredAt = log?.delivered_at || '';
      const openedAt = log?.opened_at || '';

      const haystack = `${participantName} ${participantEmail} ${notificationType} ${status} ${sentAt} ${deliveredAt} ${openedAt}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [notificationReports, notificationSearch]);

  useEffect(() => {
    setResponsePage(1);
  }, [responseSearch]);

  // Pagination calculations
  const totalResponsePages = Math.ceil(filteredResponses.length / responsesPerPage);
  const paginatedResponses = useMemo(() => {
    const startIndex = (responsePage - 1) * responsesPerPage;
    return filteredResponses.slice(startIndex, startIndex + responsesPerPage);
  }, [filteredResponses, responsePage, responsesPerPage]);

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
      
      // Sort responses by latest first (most recent at top)
      const sortedResponses = [...responsesData].sort((a, b) => {
        const dateA = new Date(a.submitted_at || a.updated_at || a.created_at || 0).getTime();
        const dateB = new Date(b.submitted_at || b.updated_at || b.created_at || 0).getTime();
        return dateB - dateA; // Descending order (latest first)
      });
      
      // Deduplicate responses: Keep only the most recent response per participant
      // This prevents duplicate entries in all analytics, charts, and tables
      const responsesMap = new Map<string, any>();
      sortedResponses.forEach((response) => {
        const participantKey = String(response.participant_id || response.guest_identifier || response.id);
        const existing = responsesMap.get(participantKey);
        
        // If no existing entry or this response is more recent, use this one
        if (!existing) {
          responsesMap.set(participantKey, response);
        } else {
          const existingDate = new Date(existing.submitted_at || existing.updated_at || existing.created_at || 0).getTime();
          const currentDate = new Date(response.submitted_at || response.updated_at || response.created_at || 0).getTime();
          
          if (currentDate > existingDate) {
            responsesMap.set(participantKey, response);
          }
        }
      });
      
      const deduplicatedResponses = Array.from(responsesMap.values());
      setResponses(deduplicatedResponses);

      // Debug log for data consistency verification
      console.log('=== DATA CONSISTENCY CHECK ===');
      console.log('Statistics Total Responses:', stats.total_responses);
      console.log('Loaded Responses Array Length (Raw):', responsesData.length);
      console.log('Deduplicated Responses Length:', deduplicatedResponses.length);
      console.log('Duplicates Removed:', responsesData.length - deduplicatedResponses.length);
      console.log('Responses with answers:', deduplicatedResponses.filter((r: any) => r.answers && r.answers.length > 0).length);
      if (deduplicatedResponses.length > 0) {
        console.log('First Response Sample:', {
          id: deduplicatedResponses[0].id,
          status: deduplicatedResponses[0].status,
          participant_id: deduplicatedResponses[0].participant_id,
          answers_count: deduplicatedResponses[0].answers?.length || 0,
          sample_answer: deduplicatedResponses[0].answers?.[0]
        });
      }
      console.log('==============================');

      // Load notification logs for this activity (NEW API with participant details)
      try {
        console.log('🔍 Loading notification logs for activity:', activityId);
        const notifData = await notificationsApi.getLogsForActivity(activityId);
        console.log('✅ Notification logs loaded:', notifData);
        console.log('Logs count:', notifData.data?.length || 0);
        if (notifData.data && notifData.data.length >  0) {
          console.log('Sample log data:', notifData.data[0]);
          console.log('Sample log delivered_at:', notifData.data[0]?.delivered_at);
          console.log('Sample log opened_at:', notifData.data[0]?.opened_at);
        }
        setNotificationReports(notifData.data || []);
      } catch (err) {
        console.error('❌ Failed to load notification logs:', err);
        setNotificationReports([]);
      }

      // Load questionnaire if available
      console.log('🔍 Activity questionnaire_id:', activityData.questionnaire_id);
      if (activityData.questionnaire_id) {
        try {
          console.log('📡 Fetching questionnaire from:', `/api/public/questionnaire/${activityData.questionnaire_id}`);
          const questionnaireData = await fetch(`/api/public/questionnaire/${activityData.questionnaire_id}`);
          console.log('📥 Questionnaire response status:', questionnaireData.status, questionnaireData.ok);
          
          // Fetch video statistics if questionnaire exists
          try {
            const videoStatsResponse = await fetch(`/api/videos/statistics/${activityData.questionnaire_id}`);
            if (videoStatsResponse.ok) {
              const videoStatsData = await videoStatsResponse.json();
              console.log('📹 Video statistics loaded:', videoStatsData.data);
              setVideoStatistics(videoStatsData.data);
              
              // Fetch video view logs for all participants
              if (videoStatsData.data && videoStatsData.data.video_id) {
                try {
                  const viewLogsResponse = await fetch(`/api/videos/${videoStatsData.data.video_id}/view-logs`);
                  if (viewLogsResponse.ok) {
                    const viewLogsData = await viewLogsResponse.json();
                    // Create a map of participant_id -> video view data
                    const logsMap: Record<string, any> = {};
                    viewLogsData.data.forEach((log: any) => {
                      if (log.participant_id) {
                        logsMap[log.participant_id] = log;
                      }
                    });
                    setVideoViewLogs(logsMap);
                    console.log('📹 Video view logs loaded:', Object.keys(logsMap).length, 'participants');
                  }
                } catch (viewErr) {
                  console.log('No video view logs available:', viewErr);
                }
              }
            }
          } catch (videoErr) {
            console.log('No video statistics available:', videoErr);
          }
          
          if (questionnaireData.ok) {
            const qData = await questionnaireData.json();
            console.log('✅ Questionnaire data received:', {
              hasData: !!qData.data,
              hasSections: !!qData.data?.sections,
              sectionsCount: qData.data?.sections?.length || 0,
              firstSectionQuestions: qData.data?.sections?.[0]?.questions?.length || 0
            });
            setQuestionnaire(qData.data);
            
            // Load video question statistics and view logs
            if (qData.data?.sections) {
              try {
                console.log('🔍 Checking for video questions...');
                const videoQuestions: any[] = [];
                qData.data.sections.forEach((section: any) => {
                  section.questions?.forEach((q: any) => {
                    if (q.type === 'video') {
                      videoQuestions.push(q);
                    }
                  });
                });
                
                if (videoQuestions.length > 0) {
                  console.log(`📹 Found ${videoQuestions.length} video question(s):`, videoQuestions.map(q => `ID ${q.id}`));
                  const videoLogsMap = { ...videoViewLogs };
                  
                  // Load statistics and logs for each video question
                  for (const vq of videoQuestions) {
                    try {
                      console.log(`📡 Loading data for video question ${vq.id}...`);
                      
                      // Fetch view logs for this video question
                      const viewLogsResponse = await fetch(`/api/videos/question/${vq.id}/view-logs`);
                      if (viewLogsResponse.ok) {
                        const viewLogsData = await viewLogsResponse.json();
                        console.log(`📹 Video question ${vq.id} view logs:`, viewLogsData.data?.length || 0, 'participants');
                        
                        // Add each participant's video log to the map
                        // Use participant_id as key, store array of video logs by question
                        // Handle both registered and anonymous users
                        
                        // CRITICAL FIX: Deduplicate video logs by participant_id BEFORE storing
                        const videoLogsByParticipant = new Map<string, any>();
                        viewLogsData.data?.forEach((log: any) => {
                          // Get participant ID - ONLY use participant_id to avoid duplicates
                          const participantKey = String(log.participant_id || log.guest_identifier || log.response_id || log.id);
                          if (participantKey) {
                            const existing = videoLogsByParticipant.get(participantKey);
                            // Keep the most recent log if duplicates exist
                            if (!existing) {
                              videoLogsByParticipant.set(participantKey, log);
                            } else {
                              const existingDate = new Date(existing.last_watched_at || existing.created_at || 0).getTime();
                              const currentDate = new Date(log.last_watched_at || log.created_at || 0).getTime();
                              if (currentDate > existingDate) {
                                videoLogsByParticipant.set(participantKey, log);
                              }
                            }
                          }
                        });
                        
                        // Store deduplicated logs with SINGLE key per participant
                        videoLogsByParticipant.forEach((log, participantKey) => {
                          if (!videoLogsMap[participantKey]) {
                            videoLogsMap[participantKey] = {};
                          }
                          videoLogsMap[participantKey][vq.id] = log;
                        });
                      } else {
                        console.log(`No view logs for video question ${vq.id}`);
                      }
                    } catch (vqErr) {
                      console.error(`Failed to load video question ${vq.id} data:`, vqErr);
                    }
                  }
                  
                  // Update state with all video logs (intro + questions)
                  setVideoViewLogs(videoLogsMap);
                  console.log('📹 Total video logs loaded:', Object.keys(videoLogsMap).length, 'participants');
                } else {
                  console.log('No video questions found in questionnaire');
                }
              } catch (videoQuestionsErr) {
                console.error('Failed to load video question data:', videoQuestionsErr);
              }
            }
            
            // Identify orphaned responses (responses with question IDs that don't exist in current questionnaire)
            if (qData.data?.sections && responsesData.length > 0) {
              const currentQuestionIds = new Set<number>();
              qData.data.sections.forEach((section: any) => {
                section.questions?.forEach((q: any) => {
                  currentQuestionIds.add(q.id);
                });
              });
              
              const orphaned: string[] = [];
              responsesData.forEach((response: any) => {
                if (Array.isArray(response.answers) && response.answers.length > 0) {
                  const hasOrphanedAnswers = response.answers.some((ans: any) => 
                    !currentQuestionIds.has(ans.question_id)
                  );
                  if (hasOrphanedAnswers) {
                    orphaned.push(response.id);
                  }
                }
              });
              
              setOrphanedResponses(orphaned);
              if (orphaned.length > 0) {
                console.warn(`⚠️ Found ${orphaned.length} orphaned responses with old question IDs`);
              }
            }
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
  async function exportToExcel(format: 'xlsx' | 'csv', includeOrphaned: boolean = false) {
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

      console.log('Starting export...', { format, responsesCount: responses.length, includeOrphaned });

      if (includeOrphaned) {
        // Export ALL answers including orphaned ones
        const exportData = responses.map((response, index) => {
          const row: any = {
            '#': index + 1,
            'Response ID': response.id,
            'Participant': response.participant?.name || response.participant?.email || 'Anonymous',
            'Email': response.participant?.email || response.guest_email || 'N/A',
          };

          // Add custom registration fields
          if (activity?.registration_form_fields && Array.isArray(activity.registration_form_fields)) {
            activity.registration_form_fields
              .filter((field: any) => !field.isMandatory && field.name !== 'name' && field.name !== 'email')
              .forEach((field: any) => {
                row[field.label || field.name] = response.participant?.additional_data?.[field.name] || 'N/A';
              });
          }

          // Add standard fields
          row['Registration Date'] = response.participant?.created_at 
            ? new Date(response.participant.created_at).toLocaleString()
            : 'N/A';
          row['Status'] = response.status || 'N/A';
          row['Submitted At'] = response.submitted_at 
            ? new Date(response.submitted_at).toLocaleString()
            : 'N/A';
          row['Is Orphaned'] = orphanedResponses.includes(response.id) ? 'YES' : 'NO';

          // Add video watch data for all video questions
          // Try multiple keys to match video logs (handles both registered and anonymous users)
          // Try both string and numeric versions of IDs
          const participantKey = response.participant_id || response.id;
          const participantVideoLogs = videoViewLogs?.[participantKey] || 
                                       videoViewLogs?.[response.id] || 
                                       videoViewLogs?.[String(participantKey)] || 
                                       videoViewLogs?.[String(response.id)] ||
                                       videoViewLogs?.[response.guest_identifier] || 
                                       null;
          
          if (participantVideoLogs && Object.keys(participantVideoLogs).length > 0) {
            // Loop through all video questions for this participant
            Object.entries(participantVideoLogs).forEach(([questionId, videoLog]: [string, any]) => {
              const prefix = Object.keys(participantVideoLogs).length > 1 ? `Q${questionId} - ` : '';
              row[`${prefix}Video Watch Duration`] = videoLog.watch_duration || '0:00';
              row[`${prefix}Completed Video?`] = videoLog.completed ? 'Yes' : 'No';
              row[`${prefix}Video Completion %`] = videoLog.completion_percentage ? `${Math.round(videoLog.completion_percentage)}%` : '0%';
              row[`${prefix}Video Play Count`] = videoLog.play_count || 0;
              row[`${prefix}Video Pause Count`] = videoLog.pause_count || 0;
            });
          } else if (videoStatistics && videoStatistics.total_views > 0) {
            row['Video Watch Duration'] = 'Not watched';
            row['Completed Video?'] = 'No';
            row['Video Completion %'] = '0%';
          }

          // Add ALL answers regardless of whether question exists in current questionnaire
          if (Array.isArray(response.answers) && response.answers.length > 0) {
            response.answers.forEach((answer: any, idx: number) => {
              const questionLabel = `Q${answer.question_id}`;
              row[questionLabel] = formatAnswerObjectForExport(answer);
              // Add comment if present
              if (answer.comment_text) {
                row[`${questionLabel} - Comment`] = answer.comment_text;
              }
            });
          }

          return row;
        });

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'All Responses');

        // Generate file
        const filename = `${activity?.name || 'activity'}_complete_export_${new Date().toISOString().split('T')[0]}.${format}`;
        if (format === 'csv') {
          XLSX.writeFile(wb, filename, { bookType: 'csv' });
        } else {
          XLSX.writeFile(wb, filename);
        }

        toast({ 
          title: "Success", 
          description: `Complete data exported as ${format.toUpperCase()} successfully (including ${orphanedResponses.length} orphaned responses)!`,
          variant: "success" 
        });
        return;
      }

      // Standard export - only current questionnaire questions
      const exportData = responses.map((response, index) => {
        const row: any = {
          '#': index + 1,
          'Participant': response.participant?.name || response.participant?.email || 'Anonymous',
          'Email': response.participant?.email || response.guest_email || 'N/A',
        };

        // Add custom registration fields
        if (activity?.registration_form_fields && Array.isArray(activity.registration_form_fields)) {
          activity.registration_form_fields
            .filter((field: any) => !field.isMandatory && field.name !== 'name' && field.name !== 'email')
            .forEach((field: any) => {
              row[field.label || field.name] = response.participant?.additional_data?.[field.name] || 'N/A';
            });
        }

        // Add standard fields
        row['Registration Date'] = response.participant?.created_at 
          ? new Date(response.participant.created_at).toLocaleString()
          : 'N/A';
        row['Status'] = response.status || 'N/A';
        row['Submitted At'] = response.submitted_at 
            ? new Date(response.submitted_at).toLocaleString()
            : 'N/A';

        // Add video watch data for all video questions
        // Try multiple keys to match video logs (handles both registered and anonymous users)
        // Try both string and numeric versions of IDs
        const participantKey = response.participant_id || response.id;
        const participantVideoLogs = videoViewLogs?.[participantKey] || 
                                     videoViewLogs?.[response.id] || 
                                     videoViewLogs?.[String(participantKey)] || 
                                     videoViewLogs?.[String(response.id)] ||
                                     videoViewLogs?.[response.guest_identifier] || 
                                     null;
        
        if (participantVideoLogs && Object.keys(participantVideoLogs).length > 0) {
          // Loop through all video questions for this participant
          Object.entries(participantVideoLogs).forEach(([questionId, videoLog]: [string, any]) => {
            const prefix = Object.keys(participantVideoLogs).length > 1 ? `Q${questionId} - ` : '';
            row[`${prefix}Video Watch Duration`] = videoLog.watch_duration || '0:00';
            row[`${prefix}Completed Video?`] = videoLog.completed ? 'Yes' : 'No';
            row[`${prefix}Video Completion %`] = videoLog.completion_percentage ? `${Math.round(videoLog.completion_percentage)}%` : '0%';
            row[`${prefix}Video Play Count`] = videoLog.play_count || 0;
            row[`${prefix}Video Pause Count`] = videoLog.pause_count || 0;
          });
        } else if (videoStatistics && videoStatistics.total_views > 0) {
          // Video exists but this participant didn't watch it
          row['Video Watch Duration'] = 'Not watched';
          row['Completed Video?'] = 'No';
          row['Video Completion %'] = '0%';
        }

        // Add question responses
        // answers is an array of {question_id, value, value_array}
        questionnaire?.sections?.forEach((section: any) => {
          section.questions?.forEach((question: any) => {
            const questionLabel = question.title || question.text || `Question ${question.id}`;
            
            // Find answer for this question
            if (Array.isArray(response.answers)) {
              const answerObj = response.answers.find((a: any) => a.question_id === question.id);
              if (answerObj) {
                row[questionLabel] = formatAnswerObjectForExport(answerObj);
                
                // Add comment column if comment exists
                if (answerObj.comment_text) {
                  row[`${questionLabel} - Comment`] = answerObj.comment_text;
                }
                
                // Add score column for SCT Likert questions
                if (question.type === 'sct_likert') {
                  const scores = question.settings?.scores || [];
                  const options = question.settings?.labels || question.options || [];
                  const responseType = question.settings?.responseType || question.settings?.choiceType || 'single';
                  const answerValue = answerObj.value_array || answerObj.value;
                  
                  if (answerValue && scores.length > 0) {
                    // Handle Likert response type (numeric point selection)
                    if (responseType === 'likert') {
                      const selectedPoint = parseInt(String(answerValue));
                      if (!isNaN(selectedPoint) && selectedPoint >= 1 && selectedPoint <= scores.length) {
                        const scoreIndex = selectedPoint - 1; // Convert to 0-based index
                        row[`${questionLabel} - Score`] = Number(scores[scoreIndex]);
                      } else {
                        row[`${questionLabel} - Score`] = 'N/A';
                      }
                    } else if (options.length > 0) {
                      // Handle Single/Multiple choice (text-based selection)
                      const selectedOption = String(answerValue);
                      const optionIndex = options.findIndex((opt: string) => String(opt) === selectedOption);
                      if (optionIndex !== -1 && scores[optionIndex] !== undefined) {
                        row[`${questionLabel} - Score`] = Number(scores[optionIndex]);
                      } else {
                        row[`${questionLabel} - Score`] = 'N/A';
                      }
                    } else {
                      row[`${questionLabel} - Score`] = 'N/A';
                    }
                  } else {
                    row[`${questionLabel} - Score`] = 'N/A';
                  }
                }
              } else {
                row[questionLabel] = 'No response';
                if (question.type === 'sct_likert') {
                  row[`${questionLabel} - Score`] = 'N/A';
                }
              }
            } else {
              row[questionLabel] = 'No response';
              if (question.type === 'sct_likert') {
                row[`${questionLabel} - Score`] = 'N/A';
              }
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

  // Export to PDF (Fixed: 2026-01-29 v3 - Call autoTable as function)
  async function exportToPDF() {
    try {
      // Import jsPDF and autoTable function
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;
      const autoTableModule = await import('jspdf-autotable');
      const autoTable = autoTableModule.default;
      
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

      // Build dynamic headers for custom registration fields
      const customFieldHeaders: string[] = [];
      if (activity?.registration_form_fields && Array.isArray(activity.registration_form_fields)) {
        activity.registration_form_fields
          .filter((field: any) => !field.isMandatory && field.name !== 'name' && field.name !== 'email')
          .forEach((field: any) => {
            customFieldHeaders.push(field.label || field.name);
          });
      }

      // Prepare table data with custom registration fields
      const tableData = responses.map((response, index) => {
        const row = [
          String(index + 1),
          response.participant?.name || response.participant?.email || 'Anonymous',
          response.participant?.email || response.guest_email || 'N/A',
        ];

        // Add custom registration field values
        if (activity?.registration_form_fields && Array.isArray(activity.registration_form_fields)) {
          activity.registration_form_fields
            .filter((field: any) => !field.isMandatory && field.name !== 'name' && field.name !== 'email')
            .forEach((field: any) => {
              row.push(response.participant?.additional_data?.[field.name] || 'N/A');
            });
        }

        // Add registration date
        row.push(
          response.participant?.created_at
            ? new Date(response.participant.created_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric'
              })
            : 'N/A'
        );

        // Add status and submitted date
        row.push(response.status || 'N/A');
        row.push(
          response.submitted_at 
            ? new Date(response.submitted_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric'
              })
            : 'N/A'
        );

        return row;
      });

      // Build dynamic table headers
      const tableHeaders = ['#', 'Participant', 'Email', ...customFieldHeaders, 'Registration Date', 'Status', 'Submitted'];

      // Add responses table - Call autoTable as a function
      autoTable(doc, {
        head: [tableHeaders],
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

      // Add question-wise analysis with charts if questionnaire exists
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

            // Question title - strip HTML tags
            const cleanTitle = (question.title || question.text || 'Question').replace(/<[^>]*>/g, '');
            doc.setFontSize(11);
            doc.setTextColor(59, 130, 246);
            doc.text(`Q${sectionIndex + 1}.${qIndex + 1}: ${cleanTitle}`, 14, currentY);
            currentY += 7;

            // Get responses with participant details for this question
            const questionResponsesWithDetails = responses
              .map(r => {
                if (Array.isArray(r.answers)) {
                  const answerObj = r.answers.find((a: any) => a.question_id === question.id);
                  if (answerObj) {
                    return {
                      value: answerObj.value_array || answerObj.value,
                      otherText: answerObj.other_text,
                      participant: r.participant?.name || r.participant?.email || 'Anonymous',
                      submittedAt: r.submitted_at
                    };
                  }
                }
                return null;
              })
              .filter(a => a !== null && a.value !== undefined && a.value !== null && a.value !== '');

            const questionResponses = questionResponsesWithDetails.map(r => r!.value);

            // Calculate statistics for SCT Likert questions (with scores)
            if (question.type === 'sct_likert') {
              const scores = question.settings?.scores || [];
              const options = question.settings?.labels || question.options || [];
              
              const stats: Record<string, number> = {};
              const scoreStats: Record<string, number> = {};
              let totalScore = 0;
              let scoreCount = 0;
              
              questionResponses.forEach((answer: any) => {
                const key = String(answer);
                stats[key] = (stats[key] || 0) + 1;
                
                // Calculate score
                const optionIndex = options.findIndex((opt: string) => String(opt) === key);
                if (optionIndex !== -1 && scores[optionIndex] !== undefined) {
                  const score = Number(scores[optionIndex]);
                  scoreStats[key] = score;
                  totalScore += score;
                  scoreCount++;
                }
              });

              const avgScore = scoreCount > 0 ? (totalScore / scoreCount).toFixed(2) : '0';
              const maxPossibleScore = scores.length > 0 ? Math.max(...scores) : 0;

              // Display average score info
              doc.setFontSize(9);
              doc.setTextColor(147, 51, 234); // Purple color for SCT
              doc.text(`SCT Likert - Average Score: ${avgScore} / ${maxPossibleScore} (${questionResponses.length} responses)`, 20, currentY);
              currentY += 7;

              const statsData = Object.entries(stats).map(([option, count]) => [
                option,
                count,
                `${((count / questionResponses.length) * 100).toFixed(1)}%`,
                scoreStats[option] !== undefined ? `${scoreStats[option]} pts` : 'N/A'
              ]);

              // Draw a simple bar chart
              const chartX = 20;
              const chartY = currentY;
              const chartWidth = 120;
              const chartHeight = 60;
              const maxCount = Math.max(...Object.values(stats));

              // Chart title
              doc.setFontSize(9);
              doc.setTextColor(100, 100, 100);
              doc.text(`Response & Score Distribution`, chartX, chartY);
              
              // Draw bars
              const barSpacing = 4;
              const barWidth = Math.min(15, (chartWidth - (statsData.length - 1) * barSpacing) / statsData.length);
              let barX = chartX;

              statsData.forEach(([option, count], index) => {
                const barHeight = (Number(count) / maxCount) * chartHeight;
                const barY = chartY + 10 + chartHeight - barHeight;

                // Bar with purple color for SCT
                doc.setFillColor(147, 51, 234); // Purple
                doc.rect(barX, barY, barWidth, barHeight, 'F');

                // Count label on top of bar
                doc.setFontSize(8);
                doc.setTextColor(40, 40, 40);
                doc.text(String(count), barX + barWidth / 2, barY - 2, { align: 'center' });

                // Option label (truncated)
                doc.setFontSize(7);
                doc.setTextColor(100, 100, 100);
                const optionLabel = String(option).length > 10 ? String(option).substring(0, 10) + '...' : String(option);
                doc.text(optionLabel, barX + barWidth / 2, chartY + 12 + chartHeight + 3, { 
                  align: 'center',
                  maxWidth: barWidth + 5
                });

                barX += barWidth + barSpacing;
              });

              currentY = chartY + 12 + chartHeight + 10;

              // Add stats table below chart with scores
              autoTable(doc, {
                head: [['Option', 'Count', 'Percentage', 'Score']],
                body: statsData,
                startY: currentY,
                theme: 'striped',
                headStyles: {
                  fillColor: [147, 51, 234],
                  textColor: [255, 255, 255],
                  fontStyle: 'bold',
                },
                styles: {
                  fontSize: 9,
                  cellPadding: 2,
                },
                margin: { left: 20, right: 20 },
              });

              currentY = (doc as any).lastAutoTable.finalY + 10;
            }
            // Calculate statistics for choice questions (MCQ, Radio, Checkboxes)
            else if (['single_choice', 'multiple_choice', 'radio', 'checkbox'].includes(question.type)) {
              const stats: Record<string, number> = {};
              questionResponses.forEach((answer: any) => {
                const value = Array.isArray(answer) ? answer : [answer];
                value.forEach((v: any) => {
                  const key = v === OTHER_OPTION_VALUE ? 'Other' : String(v);
                  stats[key] = (stats[key] || 0) + 1;
                });
              });

              const statsData = Object.entries(stats).map(([option, count]) => [
                option,
                count,
                `${((count / questionResponses.length) * 100).toFixed(1)}%`,
              ]);

              // Draw a simple bar chart
              const chartX = 20;
              const chartY = currentY;
              const chartWidth = 120;
              const chartHeight = 60;
              const maxCount = Math.max(...Object.values(stats));

              // Chart title
              doc.setFontSize(9);
              doc.setTextColor(100, 100, 100);
              doc.text(`Response Distribution (${questionResponses.length} total)`, chartX, chartY);
              
              // Draw bars
              const barSpacing = 4;
              const barWidth = Math.min(15, (chartWidth - (statsData.length - 1) * barSpacing) / statsData.length);
              let barX = chartX;

              statsData.forEach(([option, count], index) => {
                const barHeight = (Number(count) / maxCount) * chartHeight;
                const barY = chartY + 10 + chartHeight - barHeight;

                // Bar
                doc.setFillColor(59, 130, 246); // Blue
                doc.rect(barX, barY, barWidth, barHeight, 'F');

                // Count label on top of bar
                doc.setFontSize(8);
                doc.setTextColor(40, 40, 40);
                doc.text(String(count), barX + barWidth / 2, barY - 2, { align: 'center' });

                // Option label (truncated)
                doc.setFontSize(7);
                doc.setTextColor(100, 100, 100);
                const optionLabel = String(option).length > 10 ? String(option).substring(0, 10) + '...' : String(option);
                doc.text(optionLabel, barX + barWidth / 2, chartY + 12 + chartHeight + 3, { 
                  align: 'center',
                  maxWidth: barWidth + 5
                });

                barX += barWidth + barSpacing;
              });

              currentY = chartY + 12 + chartHeight + 10;

              // Add stats table below chart
              autoTable(doc, {
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
                margin: { left: 20, right: 20 },
              });

              currentY = (doc as any).lastAutoTable.finalY + 10;

              // Include a small sample of "Other" free-text responses (if any)
              const otherSample = questionResponsesWithDetails
                .filter((r: any) => {
                  const val = r?.value;
                  const hasOther = Array.isArray(val) ? val.includes(OTHER_OPTION_VALUE) : val === OTHER_OPTION_VALUE;
                  return hasOther && typeof r?.otherText === 'string' && r.otherText.trim().length > 0;
                })
                .slice(0, 5)
                .map((r: any) => [
                  r.participant,
                  String(r.otherText).substring(0, 120) + (String(r.otherText).length > 120 ? '...' : ''),
                ]);

              if (otherSample.length > 0) {
                if (currentY > 180) {
                  doc.addPage();
                  currentY = 15;
                }

                doc.setFontSize(9);
                doc.setTextColor(40, 40, 40);
                doc.text('Other responses (sample)', 20, currentY);
                currentY += 4;

                autoTable(doc, {
                  head: [['Participant', 'Other Text']],
                  body: otherSample,
                  startY: currentY,
                  theme: 'striped',
                  headStyles: {
                    fillColor: [229, 231, 235],
                    textColor: [40, 40, 40],
                    fontStyle: 'bold',
                  },
                  styles: {
                    fontSize: 8,
                    cellPadding: 2,
                  },
                  margin: { left: 20, right: 20 },
                  columnStyles: {
                    0: { cellWidth: 50 },
                  },
                });

                currentY = (doc as any).lastAutoTable.finalY + 10;
              }
            } 
            // Rating questions (Star Rating, Likert Scale)
            else if (['star_rating', 'likert_scale', 'likert_visual'].includes(question.type)) {
              const ratings: Record<string, number> = {};
              questionResponses.forEach((answer: any) => {
                const rating = String(answer);
                ratings[rating] = (ratings[rating] || 0) + 1;
              });

              // Calculate average
              const total = questionResponses.reduce((sum: number, r: any) => sum + Number(r), 0);
              const average = questionResponses.length > 0 ? (total / questionResponses.length).toFixed(2) : 0;

              doc.setFontSize(9);
              doc.setTextColor(40, 40, 40);
              doc.text(`Average Rating: ${average} (${questionResponses.length} responses)`, 20, currentY);
              currentY += 6;

              // Draw rating distribution chart
              const chartX = 20;
              const chartY = currentY;
              const maxRating = Math.max(...Object.keys(ratings).map(Number));
              const barWidth = 15;
              const barSpacing = 3;
              const chartHeight = 40;
              const maxCount = Math.max(...Object.values(ratings));

              for (let i = 1; i <= maxRating; i++) {
                const count = ratings[String(i)] || 0;
                const barHeight = maxCount > 0 ? (count / maxCount) * chartHeight : 0;
                const barX = chartX + (i - 1) * (barWidth + barSpacing);
                const barY = chartY + chartHeight - barHeight;

                // Bar
                doc.setFillColor(245, 158, 11); // Amber
                doc.rect(barX, barY, barWidth, barHeight, 'F');

                // Count on top
                if (count > 0) {
                  doc.setFontSize(8);
                  doc.setTextColor(40, 40, 40);
                  doc.text(String(count), barX + barWidth / 2, barY - 2, { align: 'center' });
                }

                // Rating label
                doc.setFontSize(7);
                doc.setTextColor(100, 100, 100);
                doc.text(String(i), barX + barWidth / 2, chartY + chartHeight + 4, { align: 'center' });
              }

              currentY = chartY + chartHeight + 10;
            }
            // Slider/Gauge questions
            else if (['slider_scale', 'dial_gauge'].includes(question.type)) {
              const valueDistribution: Record<string, number> = {};
              
              questionResponses.forEach((answer: any) => {
                let displayValue = String(answer);
                try {
                  const parsed = typeof answer === 'string' ? JSON.parse(answer) : answer;
                  displayValue = parsed.display_value || parsed.raw_value || String(answer);
                } catch (e) {
                  displayValue = String(answer);
                }
                valueDistribution[displayValue] = (valueDistribution[displayValue] || 0) + 1;
              });

              const distribData = Object.entries(valueDistribution).map(([value, count]) => [
                value,
                count,
                `${((count / questionResponses.length) * 100).toFixed(1)}%`,
              ]);

              doc.setFontSize(9);
              doc.setTextColor(40, 40, 40);
              doc.text(`Value Distribution (${questionResponses.length} responses)`, 20, currentY);
              currentY += 6;

              autoTable(doc, {
                head: [['Value', 'Count', 'Percentage']],
                body: distribData,
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
                margin: { left: 20, right: 20 },
              });

              currentY = (doc as any).lastAutoTable.finalY + 10;
            }
            // Text responses (Short Answer, Long Answer, Email, etc.)
            else if (['short_answer', 'long_answer', 'email', 'number', 'text'].includes(question.type)) {
              doc.setFontSize(9);
              doc.setTextColor(40, 40, 40);
              doc.text(`${questionResponses.length} text ${questionResponses.length === 1 ? 'response' : 'responses'}`, 20, currentY);
              currentY += 6;

              // Show sample responses (first 5)
              const sampleResponses = questionResponsesWithDetails.slice(0, 5);
              if (sampleResponses.length > 0) {
                const responseData = sampleResponses.map((r, idx) => [
                  r!.participant,
                  String(r!.value).substring(0, 80) + (String(r!.value).length > 80 ? '...' : ''),
                ]);

                autoTable(doc, {
                  head: [['Participant', 'Response']],
                  body: responseData,
                  startY: currentY,
                  theme: 'striped',
                  headStyles: {
                    fillColor: [229, 231, 235],
                    textColor: [40, 40, 40],
                    fontStyle: 'bold',
                  },
                  styles: {
                    fontSize: 8,
                    cellPadding: 2,
                  },
                  margin: { left: 20, right: 20 },
                  columnStyles: {
                    0: { cellWidth: 50 },
                    1: { cellWidth: 180 },
                  },
                });

                currentY = (doc as any).lastAutoTable.finalY + 5;

                if (questionResponses.length > 5) {
                  doc.setFontSize(8);
                  doc.setTextColor(100, 100, 100);
                  doc.text(`... and ${questionResponses.length - 5} more responses`, 20, currentY);
                  currentY += 5;
                }
              }

              currentY += 5;
            }
            // Video question responses
            else if (question.type === 'video') {
              doc.setFontSize(9);
              doc.setTextColor(40, 40, 40);
              
              // Get video logs for this question
              const videoLogs: Array<{
                participant: string;
                duration: string;
                completed: string;
                completionPercentage: string;
                playCount: number;
                pauseCount: number;
              }> = [];

              // Loop through all participants with video logs
              // Handle both registered and anonymous users
              Object.entries(videoViewLogs).forEach(([participantKey, logs]: [string, any]) => {
                if (logs && logs[question.id]) {
                  const log = logs[question.id];
                  // Try multiple ways to find the participant
                  const participant = responses.find(r => 
                    String(r.participant_id) === String(participantKey) || 
                    String(r.id) === String(participantKey)
                  );
                  const participantName = participant?.participant?.name || 
                                         participant?.participant?.email || 
                                         (participant?.guest_identifier || participant?.participant?.additional_data?.participant_type === 'anonymous' 
                                           ? 'Anonymous User' 
                                           : `Participant ${participantKey}`);
                  
                  videoLogs.push({
                    participant: participantName,
                    duration: log.watch_duration || '00:00:00',
                    completed: log.completed ? 'Yes' : 'No',
                    completionPercentage: log.completion_percentage ? `${Math.round(log.completion_percentage)}%` : '0%',
                    playCount: log.play_count || 0,
                    pauseCount: log.pause_count || 0
                  });
                }
              });

              if (videoLogs.length > 0) {
                doc.text(`${videoLogs.length} video ${videoLogs.length === 1 ? 'response' : 'responses'}`, 20, currentY);
                currentY += 6;

                // Create video statistics table
                const videoTableData = videoLogs.map(log => [
                  log.participant,
                  log.duration,
                  log.completed,
                  log.completionPercentage,
                  log.playCount.toString(),
                  log.pauseCount.toString()
                ]);

                autoTable(doc, {
                  head: [['Participant', 'Watch Duration', 'Completed', 'Completion %', 'Plays', 'Pauses']],
                  body: videoTableData,
                  startY: currentY,
                  theme: 'striped',
                  headStyles: {
                    fillColor: [229, 231, 235],
                    textColor: [40, 40, 40],
                    fontStyle: 'bold',
                    fontSize: 8,
                  },
                  styles: {
                    fontSize: 8,
                    cellPadding: 2,
                  },
                  margin: { left: 20, right: 20 },
                  columnStyles: {
                    0: { cellWidth: 60 },  // Participant
                    1: { cellWidth: 35 },  // Watch Duration
                    2: { cellWidth: 30 },  // Completed
                    3: { cellWidth: 35 },  // Completion %
                    4: { cellWidth: 20 },  // Plays
                    5: { cellWidth: 20 },  // Pauses
                  },
                });

                currentY = (doc as any).lastAutoTable.finalY + 5;
              } else {
                doc.text('No video responses', 20, currentY);
                currentY += 8;
              }

              currentY += 5;
            } else {
              // Other question types
              doc.setFontSize(9);
              doc.setTextColor(100, 100, 100);
              doc.text(`${questionResponses.length} ${questionResponses.length === 1 ? 'response' : 'responses'}`, 20, currentY);
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

  // Delete orphaned response
  async function deleteResponse(responseId: string, participantName: string) {
    setResponseToDelete({ id: responseId, name: participantName });
    setDeleteModalOpen(true);
  }

  async function confirmDelete() {
    if (!responseToDelete) return;

    try {
      setDeletingResponses(prev => new Set(prev).add(responseToDelete.id));
      setDeleteModalOpen(false);
      
      const response = await fetch(`/api/activities/${activityId}/responses/${responseToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete response');
      }

      // Remove from local state
      setResponses(prev => prev.filter(r => r.id !== responseToDelete.id));
      setOrphanedResponses(prev => prev.filter(id => id !== responseToDelete.id));
      
      toast({ 
        title: "Success", 
        description: 'Response deleted successfully',
        variant: "success" 
      });
      
      // Reload data to update statistics
      await loadData();
    } catch (error) {
      console.error('Delete error:', error);
      toast({ 
        title: "Error", 
        description: 'Failed to delete response',
        variant: "error" 
      });
    } finally {
      setDeletingResponses(prev => {
        const newSet = new Set(prev);
        newSet.delete(responseToDelete.id);
        return newSet;
      });
      setResponseToDelete(null);
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
              className="mt-4 px-4 py-2 bg-qsights-cyan text-white rounded-lg"
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
                <h1 className="text-3xl font-bold bg-gradient-to-r from-qsights-cyan to-qsights-navy bg-clip-text text-transparent">
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
                  
                  {orphanedResponses.length > 0 && (
                    <>
                      <button
                        onClick={() => {
                          try {
                            exportToExcel('xlsx', true);
                            setShowExportMenu(false);
                          } catch (error) {
                            console.error('Export error:', error);
                            toast({
                              title: "Export Error",
                              description: error instanceof Error ? error.message : 'Failed to export',
                              variant: "error"
                            });
                          }
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-amber-50 flex items-center gap-3 transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                        <div>
                          <div className="font-medium">Export All Data (Orphaned)</div>
                          <div className="text-xs text-amber-600">Includes {orphanedResponses.length} orphaned responses</div>
                        </div>
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                    </>
                  )}
                  
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
          <div className="bg-gradient-to-r bg-qsights-dark p-6 relative overflow-hidden">
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

        {/* Video Engagement Statistics (if video intro exists) */}
        {videoStatistics && videoStatistics.total_views > 0 && (
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg">
            <CardHeader className="border-b border-purple-200 bg-white/50 backdrop-blur-sm">
              <CardTitle className="text-lg font-bold flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Eye className="w-5 h-5 text-purple-600" />
                </div>
                <span>Video Intro Engagement</span>
                <span className="ml-auto px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                  {videoStatistics.total_views} {videoStatistics.total_views === 1 ? 'View' : 'Views'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-purple-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed Views</p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{videoStatistics.completed_views}</p>
                  <p className="text-sm text-gray-600">{videoStatistics.total_views > 0 ? Math.round((videoStatistics.completed_views / videoStatistics.total_views) * 100) : 0}% completion rate</p>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-purple-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Watch Time</p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{videoStatistics.average_watch_duration || '0:00'}</p>
                  <p className="text-sm text-gray-600">Per participant</p>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-purple-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completion Rate</p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{Math.round(videoStatistics.completion_rate)}%</p>
                  <p className="text-sm text-gray-600">Watched to ≥90%</p>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-purple-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Eye className="w-5 h-5 text-amber-600" />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Engagement</p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{videoStatistics.total_views}</p>
                  <p className="text-sm text-gray-600">Total video views</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
            
            {/* SCT Report Tab - Show only if SCT questions exist */}
            {hasSCTQuestions && (
              <TabsTrigger 
                value="sct-report" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-100 hover:text-gray-900"
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Script Concordance (SCT) Report
              </TabsTrigger>
            )}
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
                  {filteredResponses.length}
                  {responseSearch.trim() ? ` of ${responses.length}` : ''}
                  {filteredResponses.length === 1 ? ' Response' : ' Responses'}
                </span>
              </CardTitle>

              <div className="flex items-center gap-2">
                <input
                  value={responseSearch}
                  onChange={(e) => setResponseSearch(e.target.value)}
                  placeholder="Search responses (includes Other text)…"
                  className="w-72 max-w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {responseSearch.trim().length > 0 && (
                  <button
                    onClick={() => setResponseSearch('')}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    title="Clear search"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {responses.length > 0 && filteredResponses.length === 0 ? (
              <div className="text-center py-20 px-6">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BarChart3 className="w-12 h-12 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No matching responses</h3>
                  <p className="text-gray-500 mb-6">Try a different search term.</p>
                </div>
              </div>
            ) : responses.length > 0 ? (
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
                          Registration Date
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
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {paginatedResponses.map((response: any, index: number) => {
                        const isOrphaned = orphanedResponses.includes(response.id);
                        const isDeleting = deletingResponses.has(response.id);
                        const actualIndex = (responsePage - 1) * responsesPerPage + index;
                        
                        return (
                        <tr key={response.id} className={`hover:bg-blue-50 transition-colors ${isOrphaned ? 'bg-yellow-50' : ''}`}>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">{actualIndex + 1}</td>
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
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {response.participant?.created_at
                              ? new Date(response.participant.created_at).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })
                              : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                              response.guest_identifier || 
                              response.participant?.additional_data?.participant_type === 'anonymous' ||
                              (response.participant?.email && response.participant.email.includes('@anonymous.local'))
                                ? 'bg-cyan-50 text-purple-700 border border-purple-200'
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
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              {isOrphaned && (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
                                  ⚠️ Old Data
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedParticipant(response);
                                  setDetailsModalOpen(true);
                                }}
                                title="View Details"
                                className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteResponse(
                                  response.id,
                                  response.participant?.name || response.participant?.email || 'Anonymous User'
                                )}
                                disabled={isDeleting}
                                title="Delete Response"
                                className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {filteredResponses.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600">
                          Showing {filteredResponses.length > 0 ? (responsePage - 1) * responsesPerPage + 1 : 0} to{" "}
                          {Math.min(responsePage * responsesPerPage, filteredResponses.length)} of{" "}
                          {filteredResponses.length} responses
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Per page:</span>
                          <select
                            value={responsesPerPage}
                            onChange={(e) => {
                              setResponsesPerPage(Number(e.target.value));
                              setResponsePage(1);
                            }}
                            className="px-2 py-1 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setResponsePage(1)}
                          disabled={responsePage === 1}
                          className="px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          title="First page"
                        >
                          «
                        </button>
                        <button
                          onClick={() => setResponsePage(Math.max(1, responsePage - 1))}
                          disabled={responsePage === 1}
                          className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4 text-gray-600" />
                        </button>
                        {(() => {
                          const pages: (number | string)[] = [];
                          const maxVisible = 5;
                          if (totalResponsePages <= maxVisible + 2) {
                            for (let i = 1; i <= totalResponsePages; i++) pages.push(i);
                          } else {
                            pages.push(1);
                            let start = Math.max(2, responsePage - Math.floor(maxVisible / 2));
                            let end = Math.min(totalResponsePages - 1, start + maxVisible - 1);
                            if (end === totalResponsePages - 1) start = Math.max(2, end - maxVisible + 1);
                            if (start > 2) pages.push('...');
                            for (let i = start; i <= end; i++) pages.push(i);
                            if (end < totalResponsePages - 1) pages.push('...');
                            if (totalResponsePages > 1) pages.push(totalResponsePages);
                          }
                          return pages.map((page, idx) => (
                            page === '...' ? (
                              <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400 text-sm">...</span>
                            ) : (
                              <button
                                key={page}
                                onClick={() => setResponsePage(page as number)}
                                className={`min-w-[36px] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  responsePage === page
                                    ? "bg-qsights-dark text-white shadow-sm"
                                    : "text-gray-700 hover:bg-gray-100 border border-gray-300"
                                }`}
                              >
                                {page}
                              </button>
                            )
                          ));
                        })()}
                        <button
                          onClick={() => setResponsePage(Math.min(totalResponsePages, responsePage + 1))}
                          disabled={responsePage === totalResponsePages || totalResponsePages === 0}
                          className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => setResponsePage(totalResponsePages)}
                          disabled={responsePage === totalResponsePages || totalResponsePages === 0}
                          className="px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          title="Last page"
                        >
                          »
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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
                            const key = v === OTHER_OPTION_VALUE ? 'Other' : String(v);
                            stats[key] = (stats[key] || 0) + 1;
                          });
                        });
                        return stats;
                      };

                      // Calculate SCT Likert scores
                      const calculateSctLikertScores = () => {
                        if (question.type !== 'sct_likert') return null;
                        
                        const scores = question.settings?.scores || [];
                        // For SCT Likert, use labels from settings instead of options
                        const options = question.settings?.labels || question.options || [];
                        const responseType = question.settings?.responseType || question.settings?.choiceType || 'single';
                        const choiceType = responseType; // For backward compatibility
                        const normalizeMultiSelect = question.settings?.normalizeMultiSelect !== false;
                        const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
                        
                        let totalScore = 0;
                        let responseCount = 0;
                        const scoreDistribution: Record<string, { count: number; score: number }> = {};
                        const individualScores: number[] = [];
                        
                        questionResponses.forEach((answer: any) => {
                          if (answer === null || answer === undefined) return;
                          
                          let questionScore = 0;
                          
                          if (responseType === 'likert') {
                            // Likert Scale: answer is a numeric value (1-based point selection)
                            const selectedPoint = parseInt(String(answer));
                            if (!isNaN(selectedPoint) && selectedPoint >= 1 && selectedPoint <= scores.length) {
                              const index = selectedPoint - 1; // Convert to 0-based index
                              questionScore = scores[index] || 0;
                            }
                          } else if (choiceType === 'multi') {
                            const answerArray = Array.isArray(answer) ? answer : [answer];
                            const selectedScores: number[] = [];
                            
                            answerArray.forEach((ans: any) => {
                              const answerStr = String(ans);
                              const index = options.findIndex((opt: string) => String(opt) === answerStr);
                              if (index !== -1 && scores[index] !== undefined) {
                                selectedScores.push(scores[index]);
                              }
                            });
                            
                            if (selectedScores.length > 0) {
                              questionScore = selectedScores.reduce((sum, s) => sum + s, 0);
                              if (normalizeMultiSelect && selectedScores.length > 1) {
                                questionScore = questionScore / selectedScores.length;
                              }
                            }
                          } else {
                            const answerStr = String(answer);
                            const index = options.findIndex((opt: string) => String(opt) === answerStr);
                            if (index !== -1 && scores[index] !== undefined) {
                              questionScore = scores[index];
                            }
                          }
                          
                          totalScore += questionScore;
                          responseCount++;
                          individualScores.push(questionScore);
                          
                          // Track score distribution
                          let answerKey: string;
                          if (responseType === 'likert') {
                            // For Likert, use the label of the selected point
                            const selectedPoint = parseInt(String(answer));
                            if (!isNaN(selectedPoint) && selectedPoint >= 1 && selectedPoint <= options.length) {
                              answerKey = options[selectedPoint - 1] || `Point ${selectedPoint}`;
                            } else {
                              answerKey = String(answer);
                            }
                          } else {
                            answerKey = Array.isArray(answer) ? answer.join(', ') : String(answer);
                          }
                          if (!scoreDistribution[answerKey]) {
                            scoreDistribution[answerKey] = { count: 0, score: questionScore };
                          }
                          scoreDistribution[answerKey].count++;
                        });
                        
                        const avgScore = responseCount > 0 ? parseFloat((totalScore / responseCount).toFixed(1)) : 0;
                        const minScore = individualScores.length > 0 ? Math.min(...individualScores) : 0;
                        const maxIndividualScore = individualScores.length > 0 ? Math.max(...individualScores) : 0;
                        
                        return {
                          totalScore,
                          avgScore,
                          minScore,
                          maxIndividualScore,
                          maxPossibleScore: maxScore,
                          responseCount,
                          scoreDistribution,
                          individualScores,
                          scores,
                          options
                        };
                      };

                      const sctScoreData = calculateSctLikertScores();

                      const stats = ['single_choice', 'multiple_choice', 'radio', 'checkbox', 'sct_likert'].includes(question.type)
                        ? calculateChoiceStats()
                        : null;

                      // For video questions, count video views instead of answer records
                      const totalResponses = question.type === 'video' && Object.keys(videoViewLogs).length > 0
                        ? Object.keys(videoViewLogs).length
                        : questionResponses.length;

                      // Debug logging for video questions
                      if (question.type === 'video') {
                        console.log('📹 [Video Question Debug]', {
                          questionId: question.id,
                          questionTitle: question.title || question.text,
                          videoViewLogsCount: Object.keys(videoViewLogs).length,
                          totalResponses,
                          videoViewLogsKeys: Object.keys(videoViewLogs),
                          sampleVideoLog: Object.values(videoViewLogs)[0]
                        });
                      }

                      // Get participants who responded to this question
                      // For video questions, use video view logs instead of answer records
                      const allParticipantResponses = question.type === 'video' && Object.keys(videoViewLogs).length > 0
                        ? Object.entries(videoViewLogs).map(([participantId, participantLogs]: [string, any]) => {
                            // Access the specific question's video log from nested structure
                            const videoLog = participantLogs[question.id];
                            if (!videoLog) return null; // Skip if no log for this question
                            
                            // Find the matching response to get participant details
                            const matchingResponse = responses.find((r: any) => 
                              String(r.participant_id) === String(participantId)
                            );
                            
                            return {
                              participantId: participantId,
                              participantName: matchingResponse?.participant?.name || videoLog.participant_name || 'Anonymous',
                              participantEmail: matchingResponse?.participant?.email || videoLog.participant_email || 'N/A',
                              answer: videoLog, // Pass the specific question's video log as the answer
                              otherText: null,
                              commentText: null,
                              submittedAt: videoLog.last_watched_at || videoLog.created_at,
                              score: null,
                            };
                          }).filter(Boolean as any)
                        : responses.map((r) => {
                            const answer = Array.isArray(r.answers) ? r.answers.find((a: any) => a.question_id === question.id) : null;
                            const answerValue = answer ? (answer.value_array || answer.value) : null;
                            
                            // Calculate score for sct_likert questions
                            let participantScore: number | null = null;
                            if (question.type === 'sct_likert' && answerValue && sctScoreData) {
                              const responseType = question.settings?.responseType || question.settings?.choiceType || 'single';
                              
                              if (responseType === 'likert') {
                                // Likert Scale: answerValue is a numeric point selection
                                const selectedPoint = parseInt(String(answerValue));
                                if (!isNaN(selectedPoint) && selectedPoint >= 1 && sctScoreData.scores && selectedPoint <= sctScoreData.scores.length) {
                                  participantScore = Number(sctScoreData.scores[selectedPoint - 1]);
                                }
                              } else {
                                // Single/Multiple choice: answerValue is option text
                                const selectedOption = String(answerValue);
                                const optionIndex = sctScoreData.options?.findIndex((opt: string) => String(opt) === selectedOption);
                                if (optionIndex !== undefined && optionIndex !== -1 && sctScoreData.scores && sctScoreData.scores[optionIndex] !== undefined) {
                                  participantScore = Number(sctScoreData.scores[optionIndex]);
                                }
                              }
                            }
                            
                            return {
                              participantId: r.participant_id || r.guest_identifier,
                              participantName: r.participant?.name || r.participant?.email || 'Anonymous',
                              participantEmail: r.participant?.email || 'N/A',
                              answer: answerValue,
                              otherText: answer?.other_text,
                              commentText: answer?.comment_text,
                              submittedAt: r.submitted_at || r.updated_at,
                              score: participantScore,
                            };
                          }).filter(pr => pr.answer !== null && pr.answer !== undefined && pr.answer !== '');
                      
                      // Deduplicate by participant: keep only the most recent response for each participant
                      const participantResponsesMap = new Map<string, any>();
                      allParticipantResponses.forEach((pr) => {
                        const key = String(pr.participantId);
                        const existing = participantResponsesMap.get(key);
                        
                        // If no existing entry or this response is more recent, use this one
                        if (!existing || new Date(pr.submittedAt || 0).getTime() > new Date(existing.submittedAt || 0).getTime()) {
                          participantResponsesMap.set(key, pr);
                        }
                      });
                      
                      const participantResponses = Array.from(participantResponsesMap.values());

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
                                  <div dangerouslySetInnerHTML={{ __html: question.title || question.text || question.question || `Question ${qIndex + 1}` }} />
                                </CardTitle>
                                {question.description && (
                                  <div className="text-sm text-gray-600 mt-2" dangerouslySetInnerHTML={{ __html: question.description }} />
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
                                        <p className="text-2xl font-bold text-qsights-cyan">{Object.keys(stats).length}</p>
                                      </div>
                                    </>
                                  )}
                                </div>

                                {/* SCT Likert Score Summary */}
                                {question.type === 'sct_likert' && sctScoreData && (
                                  <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200">
                                    <h4 className="text-sm font-bold text-purple-800 mb-4 flex items-center gap-2">
                                      <Award className="w-4 h-4" />
                                      SCT Likert Score Analysis
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                      <div className="text-center p-3 bg-white rounded-lg border border-purple-200 shadow-sm">
                                        <p className="text-xs text-gray-600 mb-1">Average Score</p>
                                        <p className="text-2xl font-bold text-purple-600">{sctScoreData.avgScore}</p>
                                        <p className="text-xs text-gray-500">per response</p>
                                      </div>
                                      <div className="text-center p-3 bg-white rounded-lg border border-purple-200 shadow-sm">
                                        <p className="text-xs text-gray-600 mb-1">Total Score</p>
                                        <p className="text-2xl font-bold text-indigo-600">{sctScoreData.totalScore}</p>
                                        <p className="text-xs text-gray-500">all responses</p>
                                      </div>
                                      <div className="text-center p-3 bg-white rounded-lg border border-purple-200 shadow-sm">
                                        <p className="text-xs text-gray-600 mb-1">Score Range</p>
                                        <p className="text-2xl font-bold text-blue-600">{sctScoreData.minScore} - {sctScoreData.maxIndividualScore}</p>
                                        <p className="text-xs text-gray-500">min - max</p>
                                      </div>
                                      <div className="text-center p-3 bg-white rounded-lg border border-purple-200 shadow-sm">
                                        <p className="text-xs text-gray-600 mb-1">Max Possible</p>
                                        <p className="text-2xl font-bold text-green-600">{sctScoreData.maxPossibleScore}</p>
                                        <p className="text-xs text-gray-500">per question</p>
                                      </div>
                                      <div className="text-center p-3 bg-white rounded-lg border border-purple-200 shadow-sm">
                                        <p className="text-xs text-gray-600 mb-1">Avg. Score %</p>
                                        <p className="text-2xl font-bold text-orange-600">
                                          {sctScoreData.maxPossibleScore > 0 ? ((sctScoreData.avgScore / sctScoreData.maxPossibleScore) * 100).toFixed(0) : 0}%
                                        </p>
                                        <p className="text-xs text-gray-500">of maximum</p>
                                      </div>
                                    </div>
                                    
                                    {/* Score per Option breakdown */}
                                    {sctScoreData.options && sctScoreData.scores && sctScoreData.options.length > 0 && (
                                      <div className="mt-4 pt-4 border-t border-purple-200">
                                        <p className="text-xs font-semibold text-gray-700 mb-3">Score per Option:</p>
                                        <div className="flex flex-wrap gap-2">
                                          {sctScoreData.options.map((option: string, idx: number) => (
                                            <div key={idx} className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                                              <span className="text-sm text-gray-700">{option}</span>
                                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                                                {sctScoreData.scores[idx]} pts
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Score Distribution */}
                                    {sctScoreData.scoreDistribution && Object.keys(sctScoreData.scoreDistribution).length > 0 && (
                                      <div className="mt-4 pt-4 border-t border-purple-200">
                                        <p className="text-xs font-semibold text-gray-700 mb-3">Response Distribution by Score:</p>
                                        <div className="flex flex-wrap gap-3">
                                          {Object.entries(sctScoreData.scoreDistribution)
                                            .sort((a, b) => (b[1] as any).score - (a[1] as any).score)
                                            .map(([answer, data]: [string, any]) => (
                                              <div key={answer} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                                                <span className="text-sm font-medium text-gray-700">{answer}</span>
                                                <span className="w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-700 rounded-full font-bold text-sm">
                                                  {data.score}
                                                </span>
                                                <span className="text-xs text-gray-500">pts</span>
                                                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-semibold text-sm">
                                                  {data.count} {data.count === 1 ? 'response' : 'responses'}
                                                </span>
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

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
                                          'from-qsights-cyan to-qsights-cyan',
                                          'from-orange-500 to-orange-600',
                                          'from-pink-500 to-pink-600',
                                          'from-qsights-cyan to-qsights-cyan',
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
                                  // Text/Open-ended responses and drag_and_drop
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
                                            <div className="text-sm text-gray-800 flex-1 break-words">
                                              {question.type === 'drag_and_drop' 
                                                ? formatDragDropResponse(answer, question.settings)
                                                : (typeof answer === 'object' ? JSON.stringify(answer, null, 2) : String(answer))
                                              }
                                            </div>
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
                                      {question.type === 'sct_likert' && (
                                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full ml-2">
                                          Includes Scores
                                        </span>
                                      )}
                                      {question.type === 'video' && (
                                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full ml-2">
                                          Video Watch Data
                                        </span>
                                      )}
                                    </h4>
                                    <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                                      <div className="overflow-x-auto">
                                        <table className="w-full">
                                          <thead className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
                                            <tr>
                                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">#</th>
                                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Participant</th>
                                              {question.type === 'video' ? (
                                                <>
                                                  <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Watch Duration</th>
                                                  <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Status</th>
                                                </>
                                              ) : (
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Response</th>
                                              )}
                                              {question.type === 'sct_likert' && (
                                                <th className="px-4 py-3 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Score</th>
                                              )}
                                              {question.type !== 'video' && (
                                                <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Comment</th>
                                              )}
                                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Submitted</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-200">
                                            {participantResponses.map((pr, idx) => {
                                              // Get video view log for this participant if it's a video question
                                              // For video questions, pr.answer IS the videoLog object
                                              const videoLog = question.type === 'video' 
                                                ? (typeof pr.answer === 'object' && pr.answer !== null ? pr.answer : videoViewLogs[pr.participantId]?.[question.id])
                                                : null;
                                              const isVideoCompleted = videoLog?.completed || pr.answer?.watchedAtLeast95 || false;
                                              const watchDurationSeconds = videoLog?.watch_duration_seconds || 0;
                                              const watchDurationFormatted = videoLog?.watch_duration || formatVideoDuration(watchDurationSeconds);
                                              
                                              return (
                                              <tr key={pr.participantId || idx} className="hover:bg-blue-50 transition-colors">
                                                <td className="px-4 py-3 text-sm font-bold text-gray-600">{idx + 1}</td>
                                                <td className="px-4 py-3">
                                                  <div className="text-sm">
                                                    <p className="font-semibold text-gray-900">{pr.participantName}</p>
                                                    <p className="text-xs text-gray-500">{pr.participantEmail}</p>
                                                  </div>
                                                </td>
                                                {question.type === 'video' ? (
                                                  <>
                                                    <td className="px-4 py-3">
                                                      <div className="flex items-center gap-2 text-sm">
                                                        <Clock className="w-4 h-4 text-blue-500" />
                                                        <span className="font-mono font-semibold text-gray-900">{watchDurationFormatted}</span>
                                                      </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                      {isVideoCompleted ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full font-semibold text-sm">
                                                          <CheckCircle className="w-3.5 h-3.5" />
                                                          Completed
                                                        </span>
                                                      ) : (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-semibold text-sm">
                                                          <Clock className="w-3.5 h-3.5" />
                                                          In Progress
                                                        </span>
                                                      )}
                                                    </td>
                                                  </>
                                                ) : (
                                                <td className="px-4 py-3">
                                                  <div className="text-sm text-gray-800 break-words max-w-md">
                                                    {Array.isArray(pr.answer) ? (
                                                      <div className="flex flex-wrap gap-1">
                                                        {pr.answer.map((ans: any, i: number) => (
                                                          <span key={i} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                                            {ans === OTHER_OPTION_VALUE
                                                              ? (typeof pr.otherText === 'string' && pr.otherText.trim().length > 0
                                                                  ? `Other: ${pr.otherText.trim()}`
                                                                  : 'Other')
                                                              : formatAnswerForDisplay(ans)}
                                                          </span>
                                                        ))}
                                                      </div>
                                                    ) : question.type === 'drag_and_drop' ? (
                                                      formatDragDropResponse(pr.answer, question.settings)
                                                    ) : (
                                                      <span className="font-medium">
                                                        {pr.answer === OTHER_OPTION_VALUE
                                                          ? (typeof pr.otherText === 'string' && pr.otherText.trim().length > 0
                                                              ? `Other: ${pr.otherText.trim()}`
                                                              : 'Other')
                                                          : formatAnswerForDisplay(pr.answer)}
                                                      </span>
                                                    )}
                                                  </div>
                                                </td>
                                                )}
                                                {question.type === 'sct_likert' && (
                                                  <td className="px-4 py-3">
                                                    {pr.score !== null && pr.score !== undefined ? (
                                                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-bold text-sm">
                                                        <Award className="w-3.5 h-3.5" />
                                                        {pr.score} pts
                                                      </span>
                                                    ) : (
                                                      <span className="text-xs text-gray-400">N/A</span>
                                                    )}
                                                  </td>
                                                )}
                                                {question.type !== 'video' && (
                                                  <td className="px-4 py-3">
                                                    {pr.commentText && pr.commentText.trim().length > 0 ? (
                                                      <div className="text-sm text-gray-700 max-w-xs">
                                                        <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                                                          <MessageSquare className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                                          <span className="italic break-words">{pr.commentText.trim()}</span>
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                  </td>
                                                )}
                                                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                  {pr.submittedAt ? new Date(pr.submittedAt).toLocaleString() : 'N/A'}
                                                </td>
                                              </tr>
                                              );
                                            })}
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
                  title="Total Notifications"
                  value={notificationReports.filter((r:any) => r.status === 'sent' || r.status === 'delivered' || r.status === 'opened' || r.status === 'read' || r.status === 'clicked').length}
                  subtitle="Email notifications sent"
                  icon={Mail}
                  variant="blue"
                />

                <GradientStatCard
                  title="Delivered"
                  value={notificationReports.filter((r:any) => r.status === 'delivered' || r.status === 'opened' || r.status === 'read' || r.status === 'clicked').length}
                  subtitle="Successfully delivered"
                  icon={CheckCircle}
                  variant="green"
                />

                <GradientStatCard
                  title="Opened"
                  value={notificationReports.filter((r:any) => r.status === 'opened' || r.status === 'read' || r.status === 'clicked').length}
                  subtitle="Emails opened by recipients"
                  icon={Eye}
                  variant="purple"
                />

                <GradientStatCard
                  title="Failed"
                  value={notificationReports.filter((r:any) => r.status === 'failed').length}
                  subtitle={`${notificationReports.filter((r:any) => r.status === 'sent' || r.status === 'delivered' || r.status === 'opened' || r.status === 'read' || r.status === 'clicked').length > 0
                    ? ((notificationReports.filter((r:any) => r.status === 'failed').length / notificationReports.filter((r:any) => r.status === 'sent' || r.status === 'delivered' || r.status === 'opened' || r.status === 'read' || r.status === 'clicked').length) * 100).toFixed(1)
                    : 0}% failure rate`}
                  icon={X}
                  variant="red"
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
                      <span>Email Notification Details</span>
                      <span className="ml-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
                        {filteredNotificationReports.length}
                        {notificationSearch.trim() ? ` of ${notificationReports.length}` : ''}
                        {filteredNotificationReports.length === 1 ? ' Notification' : ' Notifications'}
                      </span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <input
                        value={notificationSearch}
                        onChange={(e) => setNotificationSearch(e.target.value)}
                        placeholder="Search by name, email, type, status…"
                        className="w-72 max-w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                      {notificationSearch.trim().length > 0 && (
                        <button
                          onClick={() => setNotificationSearch('')}
                          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                          title="Clear search"
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Participant
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sent At
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Delivered At
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Opened At
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {notificationReports.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                              <div className="flex flex-col items-center gap-3">
                                <Mail className="w-12 h-12 text-gray-300" />
                                <p className="text-lg font-medium">No email notifications sent yet</p>
                                <p className="text-sm">Send notifications to participants to see tracking details here</p>
                              </div>
                            </td>
                          </tr>
                        ) : filteredNotificationReports.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                              <div className="flex flex-col items-center gap-3">
                                <Mail className="w-12 h-12 text-gray-300" />
                                <p className="text-lg font-medium">No matching notifications</p>
                                <p className="text-sm">Try a different search term</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredNotificationReports.map((log: any) => (
                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <p className="text-sm font-semibold text-gray-900">
                                  {log.participant_name || log.user_name || 'Unknown'}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm text-gray-600">{log.participant_email}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                  {(log.notification_type || 'email').replace(/_/g, ' ').toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {log.status === 'sent' || log.status === 'delivered' ? (
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span className="text-sm font-semibold text-green-600 capitalize">{log.status}</span>
                                  </div>
                                ) : log.status === 'opened' || log.status === 'read' || log.status === 'clicked' ? (
                                  <div className="flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-purple-500" />
                                    <span className="text-sm font-semibold text-qsights-cyan capitalize">{log.status}</span>
                                  </div>
                                ) : log.status === 'failed' ? (
                                  <div className="flex items-center gap-2">
                                    <X className="w-4 h-4 text-red-500" />
                                    <span className="text-sm font-semibold text-red-600">Failed</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-500 capitalize">{log.status}</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-xs text-gray-900">
                                  {log.sent_at ? new Date(log.sent_at).toLocaleString() : '-'}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-xs text-gray-600">
                                  {(() => {
                                    const deliveredAt = log.delivered_at || log.deliveredAt;
                                    if (!deliveredAt || deliveredAt === 'null' || deliveredAt === null) return '-';
                                    try {
                                      const date = new Date(deliveredAt);
                                      return isNaN(date.getTime()) ? '-' : date.toLocaleString();
                                    } catch {
                                      return '-';
                                    }
                                  })()}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-xs text-gray-600">
                                  {(() => {
                                    const openedAt = log.opened_at || log.openedAt;
                                    if (!openedAt || openedAt === 'null' || openedAt === null) return '-';
                                    try {
                                      const date = new Date(openedAt);
                                      return isNaN(date.getTime()) ? '-' : date.toLocaleString();
                                    } catch {
                                      return '-';
                                    }
                                  })()}
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

          {/* SCT Report Tab */}
          {hasSCTQuestions && (
            <TabsContent value="sct-report">
              <SCTReportSection 
                activityId={activityId}
                questionnaire={questionnaire}
                responses={responses}
                activity={activity}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setResponseToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Orphaned Response?"
        itemName={responseToDelete?.name}
        itemType="response with old question IDs"
      />

      {/* Participant Details Modal */}
      <ParticipantDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedParticipant(null);
        }}
        participant={selectedParticipant}
        registrationFields={
          activity?.registration_form_fields
            ? activity.registration_form_fields.filter((field: any) => !field.isMandatory && field.name !== 'name' && field.name !== 'email')
            : []
        }
      />
    </RoleBasedLayout>
  );
}
