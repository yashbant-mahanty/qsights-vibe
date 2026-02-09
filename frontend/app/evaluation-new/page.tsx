'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Building2, Users, Network, Play, History, Plus, Edit2, Trash2, 
  Search, ChevronRight, ChevronLeft, ChevronDown, Send, CheckCircle, Clock,
  Star, TrendingUp, MessageSquare, UserCheck, Smile, List, X,
  Mail, AlertCircle, Loader2, Power, RefreshCw, Calendar, BarChart3,
  Download, Filter, Eye, FileText, ChevronUp, Award, Target, 
  ThumbsUp, ThumbsDown, Zap, TrendingDown, Activity, PieChart, FileQuestion, Upload, ClipboardList, Bell, Settings
} from 'lucide-react';
import { 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import AppLayout from '@/components/app-layout';
import { fetchWithAuth } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import DeleteConfirmationModal from '@/components/delete-confirmation-modal';
import BulkImportModal from '@/components/evaluation/BulkImportModal';
import NotificationsTab from '@/components/evaluation/NotificationsTab';
import { GradientStatCard } from '@/components/ui/gradient-stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Safe date formatter that prevents hydration mismatches
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    // Use consistent formatting that works server and client side
    const date = new Date(dateString);
    // Use UTC to ensure consistency across environments
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC'
    });
  } catch (e) {
    return 'N/A';
  }
};

// Types
interface Department {
  id: string;
  name: string;
  roles_count?: number;
}

interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  category?: string; // This acts as department
  program_id: string;
  hierarchy_level: number;
  is_active: boolean;
  staff_count?: number;
}

interface Staff {
  id: string;
  name: string;
  email: string;
  employee_id?: string;
  role_id: string;
  role_name?: string;
  department?: string;
  program_id: string;
  is_available_for_evaluation: boolean;
}

interface Mapping {
  id: string;
  evaluator_id: string;
  evaluator_name: string;
  evaluator_role: string;
  evaluator_dept: string;
  program_id?: string;
  subordinates: {
    id: string;
    staff_id: string;
    name: string;
    role: string;
  }[];
}

interface EvaluationTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  questions: {
    question: string;
    type: 'rating' | 'mcq' | 'text';
    options?: string[];
    scale?: number;
    description?: string;
  }[];
}

interface TriggeredEvaluation {
  id: string;
  template_name: string;
  evaluator_name: string;
  subordinates_count: number;
  status: 'pending' | 'in_progress' | 'completed';
  triggered_at: string;
  scheduled_trigger_at?: string;
  completed_at?: string;
  is_active: boolean;
}

interface ReportSummary {
  total_triggered: number;
  completed: number;
  pending: number;
  in_progress: number;
  completion_rate: number;
  total_subordinates_evaluated: number;
  unique_evaluators: number;
  template_breakdown: { template_id: string; template_name: string; count: number }[];
  department_breakdown: { department: string; count: number }[];
}

interface StaffReport {
  staff_id: string;
  staff_name: string;
  staff_email: string;
  employee_id: string;
  evaluations: {
    evaluation_id: string;
    template_id: string;
    template_name: string;
    evaluator_id: string;
    evaluator_name: string;
    evaluator_role: string;
    department: string;
    responses: Record<string, any> | null;
    completed_at: string;
  }[];
}

interface EvaluatorReport {
  evaluator_id: string;
  evaluator_name: string;
  evaluator_email: string;
  department: string;
  role: string;
  total_evaluations: number;
  completed_evaluations: number;
  pending_evaluations: number;
  total_subordinates_evaluated: number;
}

type TabType = 'setup' | 'trigger' | 'history' | 'reports' | 'my-dashboard';

// Predefined Evaluation Templates
const evaluationTemplates: EvaluationTemplate[] = [
  {
    id: 'competency',
    name: 'Competency Rating',
    description: 'Rate skills like Communication, Leadership, Technical',
    icon: Star,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    questions: [
      { question: 'Communication Skills', type: 'rating', scale: 5, description: 'Ability to communicate clearly' },
      { question: 'Leadership & Initiative', type: 'rating', scale: 5, description: 'Demonstrates leadership' },
      { question: 'Technical Proficiency', type: 'rating', scale: 5, description: 'Knowledge in their area' },
      { question: 'Teamwork & Collaboration', type: 'rating', scale: 5, description: 'Works effectively with team' },
      { question: 'Problem Solving', type: 'rating', scale: 5, description: 'Ability to solve problems' },
      { question: 'Time Management', type: 'rating', scale: 5, description: 'Manages time effectively' },
    ]
  },
  {
    id: 'performance',
    name: 'Performance Scale',
    description: 'Overall performance assessment with MCQ options',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    questions: [
      { 
        question: 'Overall Performance Rating', 
        type: 'mcq', 
        options: ['Exceptional', 'Exceeds Expectations', 'Meets Expectations', 'Needs Improvement', 'Unsatisfactory'],
        description: 'Rate overall performance'
      },
      {
        question: 'Goal Achievement',
        type: 'mcq',
        options: ['Exceeded all goals', 'Met all goals', 'Met most goals', 'Met some goals', 'Did not meet goals'],
        description: 'How well goals were achieved'
      }
    ]
  },
  {
    id: 'feedback',
    name: 'Open Feedback',
    description: 'Qualitative feedback with text responses',
    icon: MessageSquare,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    questions: [
      { question: 'Key Strengths', type: 'text', description: 'What are their strongest attributes?' },
      { question: 'Areas for Improvement', type: 'text', description: 'Suggest areas for growth' },
      { question: 'Additional Comments', type: 'text', description: 'Any other observations' },
    ]
  },
  {
    id: '360_manager',
    name: '360° Manager View',
    description: 'Complete manager evaluation set',
    icon: UserCheck,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    questions: [
      { question: 'Quality of Work', type: 'rating', scale: 5, description: 'Accuracy and reliability' },
      { question: 'Productivity', type: 'rating', scale: 5, description: 'Volume and deadlines' },
      { question: 'Job Knowledge', type: 'rating', scale: 5, description: 'Understanding of job' },
      { question: 'Dependability', type: 'rating', scale: 5, description: 'Reliability and commitment' },
      { question: 'Attitude', type: 'rating', scale: 5, description: 'Cooperation and professionalism' },
      { question: 'Key Accomplishments', type: 'text', description: '' },
      { question: 'Development Goals', type: 'text', description: '' },
    ]
  },
  {
    id: 'peer_review',
    name: 'Peer Review',
    description: 'Colleague feedback questions',
    icon: Users,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    questions: [
      { question: 'Collaboration with team', type: 'rating', scale: 5, description: '' },
      { question: 'Reliability in commitments', type: 'rating', scale: 5, description: '' },
      { question: 'Communication with colleagues', type: 'rating', scale: 5, description: '' },
      { question: 'What do they do best?', type: 'text', description: 'Highlight their strengths' },
      { question: 'What could they improve?', type: 'text', description: 'Constructive suggestions' },
    ]
  },
];

function EvaluationNewPageContent() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // URL search params for questionnaire selection return - defined early for initial tab
  const searchParams = useSearchParams();
  
  // Ref to prevent double email sends
  const triggerInProgressRef = useRef(false);
  
  // Program ID (for multi-tenancy) and user - defined early
  const [programId, setProgramId] = useState<string>('');
  const [programs, setPrograms] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('all'); // For superadmin filter
  
  // Set default active tab - will be updated in useEffect after mount
  const [activeTab, setActiveTab] = useState<TabType>('setup');
  
  // Toast helper functions for uniform styling
  const showToast = {
    success: (message: string) => toast({ title: 'Success', description: message, variant: 'success' }),
    error: (message: string) => toast({ title: 'Error', description: message, variant: 'error' }),
    warning: (message: string) => toast({ title: 'Warning', description: message, variant: 'warning' }),
  };
  
  // Setup state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  
  // Search, Filter and Pagination states for Lists
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [roleDeptFilter, setRoleDeptFilter] = useState('all');
  const [roleCurrentPage, setRoleCurrentPage] = useState(1);
  const roleItemsPerPage = 10;
  
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('all');
  const [staffCurrentPage, setStaffCurrentPage] = useState(1);
  const staffItemsPerPage = 10;
  
  // New Joinee Evaluation Settings
  const [newJoineeQuestionnaireId, setNewJoineeQuestionnaireId] = useState<string>('');
  
  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Handle URL params for custom questionnaire selection and tab navigation
  useEffect(() => {
    const questionnaireId = searchParams.get('questionnaire_id');
    const questionnaireName = searchParams.get('questionnaire_name');
    const tab = searchParams.get('tab');
    
    // Handle tab parameter - set trigger tab if specified
    if (tab === 'trigger') {
      setActiveTab('trigger');
    }
    
    if (questionnaireId && questionnaireName) {
      const decodedName = decodeURIComponent(questionnaireName);
      
      // Fetch the questionnaire data
      fetchQuestionnaireData(questionnaireId, decodedName);
      
      // Clear URL params but keep tab=trigger
      window.history.replaceState({}, '', '/evaluation-new?tab=trigger');
    } else if (tab === 'trigger') {
      // Keep tab=trigger in URL to prevent reset - don't clear it
      // Only update history if URL has extra params we want to remove
      if (window.location.search !== '?tab=trigger') {
        window.history.replaceState({}, '', '/evaluation-new?tab=trigger');
      }
    }
  }, [searchParams]);
  
  // Fetch questionnaire data for custom form and save to DB
  const fetchQuestionnaireData = async (id: string, name?: string) => {
    try {
      const response = await fetchWithAuth(`/questionnaires/${id}`);
      if (response) {
        // The API returns { data: questionnaire } - extract it
        const questionnaire = response.data || response;
        
        // Extract all questions from sections
        const allQuestions: any[] = [];
        if (questionnaire.sections && Array.isArray(questionnaire.sections)) {
          questionnaire.sections.forEach((section: any) => {
            if (section.questions && Array.isArray(section.questions)) {
              allQuestions.push(...section.questions);
            }
          });
        }
        
        // Create the questionnaire object with extracted questions
        const questionnaireWithQuestions = {
          ...questionnaire,
          questions: allQuestions
        };
        
        const questionnaireName = name || questionnaire.title || 'Custom Questionnaire';
        const templateId = `custom_${id}`;
        
        // Check if this questionnaire already exists in the list
        const exists = customQuestionnaires.find(q => q.id === id);
        
        if (!exists) {
          // Save to database for persistence
          try {
            await fetchWithAuth('/evaluation-custom-questionnaires', {
              method: 'POST',
              body: JSON.stringify({
                questionnaire_id: id,
                questionnaire_name: questionnaireName,
              }),
            });
          } catch (dbError) {
            console.error('Failed to save custom questionnaire to DB:', dbError);
            // Continue anyway - sessionStorage will still work as fallback
          }
        }
        
        // Update local state
        setCustomQuestionnaires(prev => {
          if (exists) {
            // Update existing
            return prev.map(q => q.id === id ? { 
              id, 
              name: questionnaireName, 
              data: questionnaireWithQuestions,
              status: questionnaire.status 
            } : q);
          } else {
            // Add new
            return [...prev, { 
              id, 
              name: questionnaireName, 
              data: questionnaireWithQuestions,
              status: questionnaire.status 
            }];
          }
        });
        
        // Select this questionnaire
        setSelectedTemplate(templateId);
        
        console.log('[Evaluation] Loaded questionnaire with', allQuestions.length, 'questions');
      }
    } catch (error) {
      console.error('Failed to fetch questionnaire:', error);
    }
  };
  
  // Get selected custom questionnaire data
  const getSelectedCustomQuestionnaire = () => {
    if (!selectedTemplate?.startsWith('custom_')) return null;
    const questionnaireId = selectedTemplate.replace('custom_', '');
    return customQuestionnaires.find(q => String(q.id) === questionnaireId);
  };
  
  // Selected state for cascading
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  
  // Modal states
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  
  // Edit mode states
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  
  // Delete confirmation states
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'department' | 'role' | 'staff' | 'mapping' | null;
    id: string;
    name: string;
  }>({ isOpen: false, type: null, id: '', name: '' });
  
  // Form states
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '', program_id: '' });
  const [roleForm, setRoleForm] = useState({ name: '', code: '', description: '', department_id: '' });
  const [staffForm, setStaffForm] = useState({ 
    name: '', 
    email: '', 
    employee_id: '', 
    role_id: '', 
    create_account: false,
    is_new_joinee: false,
    joining_date: '',
    new_joinee_days: 30,
    reporting_manager_id: '',
    scheduled_timezone: 'Asia/Kolkata'
  });
  
  // Trigger state
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedEvaluators, setSelectedEvaluators] = useState<string[]>([]);
  const [selectedSubordinates, setSelectedSubordinates] = useState<Record<string, string[]>>({}); // evaluatorId -> subordinateIds[]
  const [triggering, setTriggering] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [evaluatorDeptFilter, setEvaluatorDeptFilter] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTimezone, setScheduledTimezone] = useState(() => {
    // Default to user's local timezone
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  });
  
  // Common timezones list
  const timezones = [
    { value: 'Asia/Kolkata', label: 'India Standard Time (IST) - UTC+5:30' },
    { value: 'America/New_York', label: 'Eastern Time (ET) - UTC-5/-4' },
    { value: 'America/Chicago', label: 'Central Time (CT) - UTC-6/-5' },
    { value: 'America/Denver', label: 'Mountain Time (MT) - UTC-7/-6' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT) - UTC-8/-7' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT) - UTC+0/+1' },
    { value: 'Europe/Paris', label: 'Central European Time (CET) - UTC+1/+2' },
    { value: 'Europe/Berlin', label: 'Central European Time (CET) - UTC+1/+2' },
    { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST) - UTC+4' },
    { value: 'Asia/Singapore', label: 'Singapore Time (SGT) - UTC+8' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST) - UTC+9' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET) - UTC+10/+11' },
    { value: 'Pacific/Auckland', label: 'New Zealand Time (NZT) - UTC+12/+13' },
    { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
  ];
  
  // Custom questionnaires state - support multiple custom questionnaires
  interface CustomQuestionnaire {
    id: string;
    name: string;
    data: any;
    status?: string;
  }
  const [customQuestionnaires, setCustomQuestionnaires] = useState<CustomQuestionnaire[]>([]);
  const [loadingCustomQuestionnaires, setLoadingCustomQuestionnaires] = useState(false);
  
  // Load custom questionnaires from database on mount
  useEffect(() => {
    const loadCustomQuestionnaires = async () => {
      setLoadingCustomQuestionnaires(true);
      try {
        // For evaluation-staff, tasks are loaded via fetchMyPerformance, skip here
        if (user?.role === 'evaluation-staff' || user?.role === 'evaluation_staff') {
          setLoadingCustomQuestionnaires(false);
          return;
        }
        
        // For other roles, load custom questionnaires
        const response = await fetchWithAuth('/evaluation-custom-questionnaires');
        if (response?.success && response?.data) {
          const questionnaires = response.data.map((q: any) => ({
            id: q.id,
            name: q.name,
            data: q.data,
            status: q.status,
          }));
          setCustomQuestionnaires(questionnaires);
        }
      } catch (error) {
        console.error('Failed to load custom questionnaires from DB:', error);
        // Fallback to sessionStorage if DB fails (only for non-evaluation-staff)
        if (user?.role !== 'evaluation-staff' && user?.role !== 'evaluation_staff') {
          const saved = sessionStorage.getItem('evaluation_custom_questionnaires');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setCustomQuestionnaires(parsed);
            } catch (e) {
              console.error('Failed to parse saved questionnaires:', e);
            }
          }
        }
      } finally {
        setLoadingCustomQuestionnaires(false);
      }
    };
    
    // Only load questionnaires if user data is available
    if (user) {
      loadCustomQuestionnaires();
    }
    
    // Also restore selected template from sessionStorage
    const savedSelection = sessionStorage.getItem('evaluation_selected_template');
    if (savedSelection) {
      setSelectedTemplate(savedSelection);
    }
  }, [user]);
  
  // Save custom questionnaires to sessionStorage as backup
  useEffect(() => {
    if (customQuestionnaires.length > 0) {
      sessionStorage.setItem('evaluation_custom_questionnaires', JSON.stringify(customQuestionnaires));
    }
  }, [customQuestionnaires]);
  
  // Save selected template to sessionStorage
  useEffect(() => {
    if (selectedTemplate) {
      sessionStorage.setItem('evaluation_selected_template', selectedTemplate);
    }
  }, [selectedTemplate]);
  
  // History state
  const [triggeredEvaluations, setTriggeredEvaluations] = useState<TriggeredEvaluation[]>([]);
  const [editingTriggered, setEditingTriggered] = useState<TriggeredEvaluation | null>(null);
  const [showEditTriggeredModal, setShowEditTriggeredModal] = useState(false);
  
  // History tab filters
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  
  // Reports state
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
  const [staffReports, setStaffReports] = useState<StaffReport[]>([]);
  const [evaluatorReports, setEvaluatorReports] = useState<EvaluatorReport[]>([]);
  const [reportFilters, setReportFilters] = useState({
    department_id: '',
    evaluator_id: '',
    template_id: '',
    staff_id: '',
    date_from: '',
    date_to: ''
  });
  const [reportLoading, setReportLoading] = useState(false);
  const [expandedStaff, setExpandedStaff] = useState<string[]>([]);
  const [reportViewMode, setReportViewMode] = useState<'staff' | 'evaluator' | 'analysis'>('staff');
  const [selectedStaffForAnalysis, setSelectedStaffForAnalysis] = useState<string | null>(null);
  
  // Staff Performance Dashboard states (for evaluation-staff role)
  const [myPerformanceData, setMyPerformanceData] = useState<any>(null);
  const [teamPerformanceData, setTeamPerformanceData] = useState<any>(null);
  const [staffDashboardLoading, setStaffDashboardLoading] = useState(false);
  
  // Helper function to analyze staff performance
  const analyzeStaffPerformance = useMemo(() => {
    return (staffReport: StaffReport) => {
      const allScores: { question: string; score: number; count: number }[] = [];
      const textFeedback: { question: string; answer: string; evaluator: string }[] = [];
      
      staffReport.evaluations.forEach(evaluation => {
        if (evaluation.responses) {
          // Handle new API format where responses is an object with responses array
          if (evaluation.responses.responses && Array.isArray(evaluation.responses.responses)) {
            // Map array responses to template questions
            const responsesArray = evaluation.responses.responses;
            evaluation.template_questions?.forEach((questionObj: any, index: number) => {
              const answer = responsesArray[index];
              const questionText = questionObj.question;
              
              if (typeof answer === 'number') {
                const existing = allScores.find(s => s.question === questionText);
                if (existing) {
                  existing.score = (existing.score * existing.count + answer) / (existing.count + 1);
                  existing.count++;
                } else {
                  allScores.push({ question: questionText, score: answer, count: 1 });
                }
              } else if (typeof answer === 'string' && answer.trim()) {
                textFeedback.push({ 
                  question: questionText, 
                  answer: String(answer), 
                  evaluator: evaluation.evaluator_name 
                });
              }
            });
          } else {
            // Handle old format where responses is an object with question keys
            Object.entries(evaluation.responses).forEach(([question, answer]) => {
              if (typeof answer === 'number') {
                const existing = allScores.find(s => s.question === question);
                if (existing) {
                  existing.score = (existing.score * existing.count + answer) / (existing.count + 1);
                  existing.count++;
                } else {
                  allScores.push({ question, score: answer, count: 1 });
                }
              } else if (typeof answer === 'string' && answer.trim()) {
                textFeedback.push({ 
                  question, 
                  answer: String(answer), 
                  evaluator: evaluation.evaluator_name 
                });
              }
            });
          }
        }
      });
      
      // Sort scores to find strengths and improvements
      const sortedScores = [...allScores].sort((a, b) => b.score - a.score);
      const strengths = sortedScores.filter(s => s.score >= 4).slice(0, 3);
      const improvements = sortedScores.filter(s => s.score < 4).sort((a, b) => a.score - b.score).slice(0, 3);
      const overallAverage = allScores.length > 0 
        ? allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length 
        : 0;
      
      return {
        allScores,
        textFeedback,
        strengths,
        improvements,
        overallAverage: Math.round(overallAverage * 10) / 10,
        totalEvaluations: staffReport.evaluations.length
      };
    };
  }, []);

  // Filtered and paginated Role list
  const filteredRoles = useMemo(() => {
    let filtered = roles;
    
    // Department filter
    if (roleDeptFilter !== 'all') {
      filtered = filtered.filter(r => r.category === roleDeptFilter);
    }
    
    // Search filter
    if (roleSearchQuery.trim()) {
      const query = roleSearchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.name?.toLowerCase().includes(query) ||
        r.code?.toLowerCase().includes(query) ||
        r.category?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [roles, roleDeptFilter, roleSearchQuery]);

  const paginatedRoles = useMemo(() => {
    const startIndex = (roleCurrentPage - 1) * roleItemsPerPage;
    return filteredRoles.slice(startIndex, startIndex + roleItemsPerPage);
  }, [filteredRoles, roleCurrentPage]);

  const roleTotalPages = Math.ceil(filteredRoles.length / roleItemsPerPage);

  // Filtered and paginated Staff list
  const filteredStaff = useMemo(() => {
    let filtered = staff;
    
    // Role filter
    if (staffRoleFilter !== 'all') {
      filtered = filtered.filter(s => s.role_id === staffRoleFilter);
    }
    
    // Search filter
    if (staffSearchQuery.trim()) {
      const query = staffSearchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.name?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query) ||
        s.employee_id?.toLowerCase().includes(query) ||
        s.role_name?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [staff, staffRoleFilter, staffSearchQuery]);

  const paginatedStaff = useMemo(() => {
    const startIndex = (staffCurrentPage - 1) * staffItemsPerPage;
    return filteredStaff.slice(startIndex, startIndex + staffItemsPerPage);
  }, [filteredStaff, staffCurrentPage]);

  const staffTotalPages = Math.ceil(filteredStaff.length / staffItemsPerPage);

  // Fetch program from user - moved up in component
  useEffect(() => {
    const fetchProgramId = async () => {
      try {
        const response = await fetchWithAuth('/auth/me');
        console.log('[Evaluation Page] Full response:', JSON.stringify(response));
        console.log('[Evaluation Page] Response has success?', 'success' in response);
        console.log('[Evaluation Page] Response has user?', 'user' in response);
        
        // Handle both response formats
        const userData = response.user || response;
        console.log('[Evaluation Page] User data:', JSON.stringify(userData));
        
        if (userData) {
          setUser(userData);
          const userProgramId = userData.programId || userData.program_id || '';
          console.log('[Evaluation Page] Extracted programId:', userProgramId);
          setProgramId(userProgramId);
          console.log('[Evaluation Page] State set to programId:', userProgramId);
          
          // Set default tab based on role - BUT only if URL doesn't have a tab param
          // This prevents overwriting the tab when returning from questionnaires page
          const tabFromUrl = searchParams.get('tab');
          
          if (!tabFromUrl) {
            // Only set default tab if no tab specified in URL
            if (userData.role === 'program-moderator' || userData.role === 'program-manager' || userData.role === 'evaluation-staff' || userData.role === 'evaluation_staff') {
              setActiveTab('my-dashboard');
            } else {
              setActiveTab('setup');
            }
          } else {
            // Apply tab from URL if present
            if (tabFromUrl === 'trigger' || tabFromUrl === 'history' || tabFromUrl === 'reports' || tabFromUrl === 'my-dashboard') {
              setActiveTab(tabFromUrl as TabType);
            }
          }
          
          // If super-admin, fetch all programs (including expired)
          if (userData.role === 'super-admin') {
            const programsRes = await fetchWithAuth('/programs?all_statuses=true');
            if (programsRes.data || programsRes.programs) {
              setPrograms(programsRes.data || programsRes.programs || []);
            }
          }
        }
      } catch (error) {
        console.error('[Evaluation Page] Failed to fetch user:', error);
      }
    };
    fetchProgramId();
  }, [searchParams]);

  // Fetch data - Derive departments from roles categories
  const fetchDepartments = useCallback(async (filterProgramId?: string) => {
    // Use filterProgramId if provided and non-empty, otherwise fall back to user's programId
    const effectiveProgramId = (filterProgramId && filterProgramId !== '') ? filterProgramId : programId;
    console.log('[Evaluation Page] fetchDepartments called, effectiveProgramId:', effectiveProgramId, 'programId:', programId, 'user role:', user?.role);
    if (!effectiveProgramId && user?.role !== 'super-admin') return;
    try {
      const url = effectiveProgramId 
        ? `/evaluation/departments?program_id=${effectiveProgramId}`
        : '/evaluation/departments'; // Fetch all for superadmin
      const response = await fetchWithAuth(url);
      console.log('[Evaluation Page] Departments response:', response);
      if (response.success) {
        setDepartments(response.departments || []);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  }, [programId, user]);

  const fetchRoles = useCallback(async (filterProgramId?: string) => {
    // Use filterProgramId if provided and non-empty, otherwise fall back to user's programId
    const effectiveProgramId = (filterProgramId && filterProgramId !== '') ? filterProgramId : programId;
    console.log('[Evaluation Page] fetchRoles called, effectiveProgramId:', effectiveProgramId, 'programId:', programId);
    if (!effectiveProgramId && user?.role !== 'super-admin') return;
    try {
      const url = effectiveProgramId 
        ? `/evaluation/roles?program_id=${effectiveProgramId}`
        : '/evaluation/roles'; // Fetch all for superadmin
      const response = await fetchWithAuth(url);
      console.log('[Evaluation Page] Roles response:', response);
      if (response.success) {
        setRoles(response.roles || []);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  }, [programId, user]);

  const fetchStaff = useCallback(async (filterProgramId?: string) => {
    // Use filterProgramId if provided and non-empty, otherwise fall back to user's programId
    const effectiveProgramId = (filterProgramId && filterProgramId !== '') ? filterProgramId : programId;
    console.log('[Evaluation Page] fetchStaff called, effectiveProgramId:', effectiveProgramId, 'programId:', programId);
    if (!effectiveProgramId && user?.role !== 'super-admin') return;
    try {
      const url = effectiveProgramId 
        ? `/evaluation/staff?program_id=${effectiveProgramId}`
        : '/evaluation/staff'; // Fetch all for superadmin
      const response = await fetchWithAuth(url);
      console.log('[Evaluation Page] Staff response:', response);
      if (response.success) {
        setStaff(response.staff || []);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  }, [programId, user]);

  const fetchMappings = useCallback(async (filterProgramId?: string) => {
    // Use filterProgramId if provided and non-empty, otherwise fall back to user's programId
    const effectiveProgramId = (filterProgramId && filterProgramId !== '') ? filterProgramId : programId;
    console.log('[Evaluation Page] fetchMappings called, effectiveProgramId:', effectiveProgramId, 'programId:', programId);
    if (!effectiveProgramId && user?.role !== 'super-admin') return;
    try {
      const url = effectiveProgramId 
        ? `/evaluation/hierarchy?program_id=${effectiveProgramId}`
        : '/evaluation/hierarchy'; // Fetch all for superadmin
      const response = await fetchWithAuth(url);
      if (response.success) {
        // Transform hierarchy data into mapping format
        const hierarchyData = response.hierarchies || response.hierarchy || [];
        const mappedData: Mapping[] = [];
        
        // Group by evaluator (reports_to_id = manager_id)
        const grouped: { [key: string]: any[] } = {};
        hierarchyData.forEach((h: any) => {
          const managerId = h.reports_to_id;
          if (!grouped[managerId]) {
            grouped[managerId] = [];
          }
          grouped[managerId].push(h);
        });
        
        // Create mapping objects - use hierarchy data directly since it includes names
        Object.keys(grouped).forEach(managerId => {
          const firstItem = grouped[managerId][0];
          mappedData.push({
            id: managerId,
            evaluator_id: managerId,
            evaluator_name: firstItem.manager_name || 'Unknown',
            evaluator_role: firstItem.manager_role_name || '',
            evaluator_dept: firstItem.manager_role_category || firstItem.manager_department || '',
            program_id: firstItem.program_id, // Include program_id from hierarchy
            subordinates: grouped[managerId].map((h: any) => ({
              id: h.id,
              staff_id: h.staff_id,
              name: h.staff_name || 'Unknown',
              role: h.staff_role_name || ''
            }))
          });
        });
        
        setMappings(mappedData);
      }
    } catch (error) {
      console.error('Failed to fetch mappings:', error);
    }
  }, [programId, user]);

  const fetchTriggeredEvaluations = useCallback(async () => {
    // Superadmin can view all programs, regular users need programId
    if (!programId && user?.role !== 'super-admin') return;
    try {
      const effectiveProgramId = selectedProgramFilter !== 'all' ? selectedProgramFilter : programId;
      const url = effectiveProgramId 
        ? `/evaluation/triggered?program_id=${effectiveProgramId}`
        : '/evaluation/triggered'; // Fetch all for superadmin with "All Programs" filter
      const response = await fetchWithAuth(url);
      if (response.success) {
        setTriggeredEvaluations(response.evaluations || []);
      }
    } catch (error) {
      console.error('Failed to fetch triggered evaluations:', error);
    }
  }, [programId, selectedProgramFilter, user]);

  // Fetch report data
  const fetchReportSummary = useCallback(async () => {
    if (!programId && user?.role !== 'super-admin') return;
    try {
      const effectiveProgramId = selectedProgramFilter !== 'all' ? selectedProgramFilter : programId;
      const url = effectiveProgramId
        ? `/evaluation/reports/summary?program_id=${effectiveProgramId}`
        : '/evaluation/reports/summary'; // Fetch all for superadmin
      const response = await fetchWithAuth(url);
      if (response.success) {
        setReportSummary(response.summary);
      }
    } catch (error) {
      console.error('Failed to fetch report summary:', error);
    }
  }, [programId, selectedProgramFilter, user]);

  const fetchStaffReports = useCallback(async () => {
    if (!programId && user?.role !== 'super-admin') return;
    try {
      setReportLoading(true);
      const effectiveProgramId = selectedProgramFilter !== 'all' ? selectedProgramFilter : programId;
      const params = new URLSearchParams();
      
      // Only add program_id if we have one (superadmin with "All Programs" won't have one)
      if (effectiveProgramId) {
        params.append('program_id', effectiveProgramId);
      }
      
      if (reportFilters.department_id) params.append('department_id', reportFilters.department_id);
      if (reportFilters.evaluator_id) params.append('evaluator_id', reportFilters.evaluator_id);
      if (reportFilters.template_id) params.append('template_id', reportFilters.template_id);
      if (reportFilters.staff_id) params.append('staff_id', reportFilters.staff_id);
      if (reportFilters.date_from) params.append('date_from', reportFilters.date_from);
      if (reportFilters.date_to) params.append('date_to', reportFilters.date_to);
      
      const response = await fetchWithAuth(`/evaluation/reports?${params.toString()}`);
      if (response.success) {
        setStaffReports(response.reports || []);
      }
    } catch (error) {
      console.error('Failed to fetch staff reports:', error);
    } finally {
      setReportLoading(false);
    }
  }, [programId, selectedProgramFilter, reportFilters, user]);

  const fetchEvaluatorReports = useCallback(async () => {
    if (!programId && user?.role !== 'super-admin') return;
    try {
      const effectiveProgramId = selectedProgramFilter !== 'all' ? selectedProgramFilter : programId;
      const url = effectiveProgramId
        ? `/evaluation/reports/evaluators?program_id=${effectiveProgramId}`
        : '/evaluation/reports/evaluators'; // Fetch all for superadmin
      const response = await fetchWithAuth(url);
      if (response.success) {
        setEvaluatorReports(response.evaluators || []);
      }
    } catch (error) {
      console.error('Failed to fetch evaluator reports:', error);
    }
  }, [programId, selectedProgramFilter, user]);

  // Fetch staff performance data (for evaluation-staff, moderators, and managers)
  const fetchMyPerformance = useCallback(async () => {
    if (user?.role !== 'evaluation-staff' && user?.role !== 'evaluation_staff' && user?.role !== 'program-moderator' && user?.role !== 'program-manager') return;
    try {
      setStaffDashboardLoading(true);
      
      // Fetch performance data
      const response = await fetchWithAuth('/evaluation/my-performance');
      if (response.success) {
        setMyPerformanceData(response);
      }
      
      // Fetch pending evaluation tasks
      const tasksResponse = await fetchWithAuth('/my-evaluations/pending');
      if (tasksResponse?.data) {
        // Transform to match TriggeredEvaluation format expected by the UI
        const tasks = tasksResponse.data.map((task: any) => ({
          id: task.triggered_id, // Use triggered_id for the URL
          template_name: task.event_name,
          evaluator_name: task.evaluator_name,
          subordinates_count: task.subordinates_count || 1, // Use actual count from API with fallback
          status: task.status,
          triggered_at: task.sent_at,
          start_date: task.sent_at,
          end_date: task.due_date,
          evaluatee_name: task.evaluatee_name,
          access_token: task.access_token,
          triggered_id: task.triggered_id
        }));
        setTriggeredEvaluations(tasks);
      }
    } catch (error) {
      console.error('Failed to fetch my performance:', error);
    } finally {
      setStaffDashboardLoading(false);
    }
  }, [user]);

  const fetchTeamPerformance = useCallback(async () => {
    if (user?.role !== 'evaluation-staff' && user?.role !== 'evaluation_staff' && user?.role !== 'program-moderator' && user?.role !== 'program-manager') return;
    try {
      setStaffDashboardLoading(true);
      const response = await fetchWithAuth('/evaluation/team-performance');
      if (response.success) {
        setTeamPerformanceData(response);
      }
    } catch (error) {
      console.error('Failed to fetch team performance:', error);
    } finally {
      setStaffDashboardLoading(false);
    }
  }, [user]);

  const handleExportReport = async (format: 'json' | 'csv') => {
    try {
      const effectiveProgramId = selectedProgramFilter !== 'all' ? selectedProgramFilter : programId;
      const params = new URLSearchParams({ format });
      if (effectiveProgramId) {
        params.append('program_id', effectiveProgramId);
      }
      
      if (format === 'csv') {
        window.open(`${process.env.NEXT_PUBLIC_API_URL}/evaluation/reports/export?${params.toString()}`, '_blank');
      } else {
        const response = await fetchWithAuth(`/evaluation/reports/export?${params.toString()}`);
        if (response.success) {
          const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `evaluation_report_${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
      showToast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      showToast.error('Failed to export report');
      console.error('Export error:', error);
    }
  };

  useEffect(() => {
    if (programId || user?.role === 'super-admin') {
      const filterProgramId = selectedProgramFilter === 'all' ? '' : selectedProgramFilter;
      fetchDepartments(filterProgramId);
      fetchRoles(filterProgramId);
      fetchStaff(filterProgramId);
    }
  }, [programId, selectedProgramFilter, user, fetchDepartments, fetchRoles, fetchStaff]);

  useEffect(() => {
    if (programId || user?.role === 'super-admin') {
      const filterProgramId = selectedProgramFilter === 'all' ? '' : selectedProgramFilter;
      fetchMappings(filterProgramId);
    }
  }, [programId, selectedProgramFilter, user, fetchMappings]);

  useEffect(() => {
    // For evaluation-staff, moderators, and managers tasks are loaded via fetchMyPerformance
    if (user?.role === 'evaluation-staff' || user?.role === 'evaluation_staff' || user?.role === 'program-moderator' || user?.role === 'program-manager') {
      return; // Skip this hook - they use fetchMyPerformance instead
    }
    
    if ((programId || user?.role === 'super-admin') && (activeTab === 'history' || activeTab === 'my-dashboard')) {
      fetchTriggeredEvaluations();
    }
  }, [programId, activeTab, user, fetchTriggeredEvaluations]);

  useEffect(() => {
    if ((programId || user?.role === 'super-admin') && activeTab === 'reports') {
      fetchReportSummary();
      fetchStaffReports();
      fetchEvaluatorReports();
    }
  }, [programId, activeTab, user, fetchReportSummary, fetchStaffReports, fetchEvaluatorReports]);

  // Load New Joinee questionnaire setting
  useEffect(() => {
    const loadNewJoineeQuestionnaireSetting = async () => {
      if (!programId) return;
      try {
        const response = await fetchWithAuth(`/evaluation/settings/new-joinee-questionnaire?program_id=${programId}`);
        if (response?.success && response?.questionnaire_id) {
          setNewJoineeQuestionnaireId(response.questionnaire_id);
        }
      } catch (error) {
        console.error('Failed to load new joinee questionnaire setting:', error);
      }
    };
    
    if (programId) {
      loadNewJoineeQuestionnaireSetting();
    }
  }, [programId]);

  // Fetch team performance data for evaluation-staff, moderators, and managers on Reports tab
  useEffect(() => {
    if ((user?.role === 'evaluation-staff' || user?.role === 'evaluation_staff' || user?.role === 'program-moderator' || user?.role === 'program-manager') && activeTab === 'reports') {
      fetchTeamPerformance();
    }
  }, [user, activeTab, fetchTeamPerformance]);

  // Fetch my performance data for evaluation-staff, moderators, and managers on My Dashboard
  useEffect(() => {
    if ((user?.role === 'evaluation-staff' || user?.role === 'evaluation_staff' || user?.role === 'program-moderator' || user?.role === 'program-manager') && activeTab === 'my-dashboard') {
      fetchMyPerformance();
    }
  }, [user, activeTab, fetchMyPerformance]);

  // Refetch staff reports when filters change
  useEffect(() => {
    if ((programId || user?.role === 'super-admin') && activeTab === 'reports') {
      fetchStaffReports();
    }
  }, [reportFilters, programId, activeTab, user, fetchStaffReports]);

  // CRUD handlers for Department
  const handleAddDepartment = async () => {
    if (!deptForm.name.trim()) {
      showToast.error('Department name is required');
      return;
    }
    
    // For super-admin, program selection is required
    if (user?.role === 'super-admin' && !deptForm.program_id) {
      showToast.error('Please select a program');
      return;
    }
    
    try {
      setLoading(true);
      // Use form program_id for super-admin, or user's program_id for others
      const selectedProgramId = user?.role === 'super-admin' ? deptForm.program_id : programId;
      
      const requestBody = {
        name: deptForm.name,
        code: deptForm.code || deptForm.name.substring(0, 3).toUpperCase(),
        description: deptForm.description,
        program_id: selectedProgramId || null
      };
      console.log('[Department Add] Request body:', requestBody);
      
      const response = await fetchWithAuth('/evaluation/departments', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      
      if (response.success) {
        showToast.success('Department added successfully');
        setShowDeptModal(false);
        setDeptForm({ name: '', code: '', description: '', program_id: '' });
        fetchDepartments();
      } else {
        showToast.error(response.message || 'Failed to add department');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to add department';
      console.error('[Department Add Error]:', errorMessage);
      showToast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditDepartment = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      program_id: dept.program_id
    });
    setShowDeptModal(true);
  };

  const openDeleteDepartmentModal = (dept: Department) => {
    setDeleteModal({
      isOpen: true,
      type: 'department',
      id: dept.id,
      name: dept.name
    });
  };

  const handleDeleteDepartment = async () => {
    const id = deleteModal.id;
    try {
      const response = await fetchWithAuth(`/evaluation/departments/${id}?cascade=true`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        showToast.success('Department deleted');
        setDeleteModal({ isOpen: false, type: null, id: '', name: '' });
        fetchDepartments();
        fetchRoles(); // Refresh roles as they may have been cascade deleted
        fetchStaff(); // Refresh staff as they may have been cascade deleted
        if (selectedDepartment === id) {
          setSelectedDepartment(null);
          setSelectedRole(null);
        }
      } else {
        showToast.error(response.message || 'Failed to delete');
        setDeleteModal({ isOpen: false, type: null, id: '', name: '' });
      }
    } catch (error: any) {
      showToast.error(error.message || 'Failed to delete department');
      setDeleteModal({ isOpen: false, type: null, id: '', name: '' });
    }
  };

  // CRUD handlers for Role
  const handleAddRole = async () => {
    if (!roleForm.name.trim()) {
      showToast.error('Role name is required');
      return;
    }
    
    if (!roleForm.department_id) {
      showToast.error('Please select a department');
      return;
    }
    
    const selectedDept = departments.find(d => d.id === roleForm.department_id);
    
    try {
      setLoading(true);
      
      const url = editingRole ? `/evaluation/roles/${editingRole.id}` : '/evaluation/roles';
      const method = editingRole ? 'PUT' : 'POST';
      
      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({
          name: roleForm.name,
          code: roleForm.code || roleForm.name.substring(0, 3).toUpperCase(),
          description: roleForm.description,
          hierarchy_level: 1,
          category: selectedDept?.name || '', // Use department name as category
          program_id: programId
        })
      });
      
      if (response.success) {
        showToast.success(editingRole ? 'Role updated successfully' : 'Role added successfully');
        setShowRoleModal(false);
        setRoleForm({ name: '', code: '', description: '', department_id: '' });
        setEditingRole(null);
        fetchRoles();
      } else {
        showToast.error(response.message || `Failed to ${editingRole ? 'update' : 'add'} role`);
      }
    } catch (error) {
      showToast.error(`Failed to ${editingRole ? 'update' : 'add'} role`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    // Find department by matching category name
    const dept = departments.find(d => d.name === role.category);
    setRoleForm({
      name: role.name,
      code: role.code || '',
      description: role.description || '',
      department_id: dept?.id || ''
    });
    setShowRoleModal(true);
  };

  const openDeleteRoleModal = (role: Role) => {
    setDeleteModal({
      isOpen: true,
      type: 'role',
      id: role.id,
      name: role.name
    });
  };

  const handleDeleteRole = async () => {
    const id = deleteModal.id;
    try {
      const response = await fetchWithAuth(`/evaluation/roles/${id}?cascade=true`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        showToast.success('Role deleted');
        setDeleteModal({ isOpen: false, type: null, id: '', name: '' });
        fetchRoles();
        fetchStaff(); // Refresh staff as they may have been cascade deleted
      } else {
        showToast.error(response.message || 'Failed to delete');
        setDeleteModal({ isOpen: false, type: null, id: '', name: '' });
      }
    } catch (error: any) {
      showToast.error(error.message || 'Failed to delete role');
      setDeleteModal({ isOpen: false, type: null, id: '', name: '' });
    }
  };

  // CRUD handlers for Staff
  const handleAddStaff = async () => {
    if (!staffForm.name.trim() || !staffForm.email.trim()) {
      showToast.error('Name and email are required');
      return;
    }
    
    if (!staffForm.role_id) {
      showToast.error('Please select a role');
      return;
    }
    
    // Validate new joinee fields
    if (staffForm.is_new_joinee && !staffForm.joining_date) {
      showToast.error('Please provide joining date for new joinee');
      return;
    }
    
    if (staffForm.is_new_joinee && !staffForm.reporting_manager_id) {
      showToast.error('Please select reporting manager for new joinee');
      return;
    }
    
    try {
      setLoading(true);
      
      const url = editingStaff ? `/evaluation/staff/${editingStaff.id}` : '/evaluation/staff';
      const method = editingStaff ? 'PUT' : 'POST';
      
      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({
          name: staffForm.name,
          email: staffForm.email,
          employee_id: staffForm.employee_id,
          role_id: staffForm.role_id,
          department: selectedDepartment || '',
          program_id: programId,
          is_available_for_evaluation: true,
          create_account: !editingStaff ? staffForm.create_account : undefined,
          is_new_joinee: !editingStaff ? staffForm.is_new_joinee : undefined,
          joining_date: !editingStaff && staffForm.is_new_joinee ? staffForm.joining_date : undefined,
          new_joinee_days: !editingStaff && staffForm.is_new_joinee ? staffForm.new_joinee_days : undefined,
          reporting_manager_id: !editingStaff && staffForm.is_new_joinee && staffForm.reporting_manager_id ? staffForm.reporting_manager_id : undefined,
          scheduled_timezone: !editingStaff && staffForm.is_new_joinee ? staffForm.scheduled_timezone : undefined
        })
      });
      
      if (response.success) {
        const successMsg = editingStaff 
          ? 'Staff updated successfully' 
          : staffForm.create_account && staffForm.is_new_joinee
            ? 'Staff added, account created, and trainee evaluation scheduled. Manager will receive evaluation notification automatically.'
            : staffForm.create_account 
            ? 'Staff added and account created. Login credentials sent via email.' 
            : staffForm.is_new_joinee
            ? 'Staff added successfully. Trainee evaluation scheduled for manager.'
            : 'Staff added successfully';
        showToast.success(successMsg);
        setShowStaffModal(false);
        setStaffForm({ name: '', email: '', employee_id: '', role_id: '', create_account: false, is_new_joinee: false, joining_date: '', new_joinee_days: 30, reporting_manager_id: '', scheduled_timezone: 'Asia/Kolkata' });
        setEditingStaff(null);
        fetchStaff();
        // Refresh triggered evaluations to show the new joinee evaluation
        if (!editingStaff && staffForm.is_new_joinee) {
          fetchTriggeredEvaluations();
        }
      } else {
        showToast.error(response.message || `Failed to ${editingStaff ? 'update' : 'add'} staff`);
      }
    } catch (error) {
      showToast.error(`Failed to ${editingStaff ? 'update' : 'add'} staff`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStaff = (member: Staff) => {
    setEditingStaff(member);
    setStaffForm({
      name: member.name,
      email: member.email,
      employee_id: member.employee_id || '',
      role_id: member.role_id
    });
    setShowStaffModal(true);
  };

  const openDeleteStaffModal = (member: Staff) => {
    setDeleteModal({
      isOpen: true,
      type: 'staff',
      id: member.id,
      name: member.name
    });
  };

  const handleDeleteStaff = async () => {
    const id = deleteModal.id;
    try {
      const response = await fetchWithAuth(`/evaluation/staff/${id}?cascade=true`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        showToast.success('Staff deleted');
        setDeleteModal({ isOpen: false, type: null, id: '', name: '' });
        fetchStaff();
      } else {
        showToast.error(response.message || 'Failed to delete');
        setDeleteModal({ isOpen: false, type: null, id: '', name: '' });
      }
    } catch (error: any) {
      showToast.error(error.message || 'Failed to delete staff');
      setDeleteModal({ isOpen: false, type: null, id: '', name: '' });
    }
  };

  // Mapping handlers
  const [mappingEvaluator, setMappingEvaluator] = useState<string>('');
  const [mappingSubordinates, setMappingSubordinates] = useState<string[]>([]);

  const handleAddMapping = async () => {
    if (!mappingEvaluator || mappingSubordinates.length === 0) {
      showToast.error('Select evaluator and at least one subordinate');
      return;
    }
    
    try {
      setLoading(true);
      
      // If editing, delete old mappings for this evaluator first
      if (editingMappingId) {
        // Find all existing hierarchy entries for this evaluator
        const existingMapping = mappings.find(m => m.evaluator_id === mappingEvaluator);
        if (existingMapping) {
          for (const sub of existingMapping.subordinates) {
            try {
              await fetchWithAuth(`/evaluation/hierarchy/${sub.id}`, {
                method: 'DELETE'
              });
            } catch (e) {
              // Continue even if one fails
            }
          }
        }
      }
      
      // Create hierarchy entries for each subordinate
      for (const subId of mappingSubordinates) {
        await fetchWithAuth('/evaluation/hierarchy', {
          method: 'POST',
          body: JSON.stringify({
            staff_id: subId,
            reports_to_id: mappingEvaluator,
            program_id: programId,
            relationship_type: 'direct',
            is_active: true,
            is_primary: true
          })
        });
      }
      
      showToast.success(editingMappingId ? 'Mapping updated successfully' : 'Mapping created successfully');
      setShowMappingModal(false);
      setMappingEvaluator('');
      setMappingSubordinates([]);
      setEditingMappingId(null);
      fetchMappings();
    } catch (error) {
      showToast.error('Failed to save mapping');
    } finally {
      setLoading(false);
    }
  };

  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  
  const handleEditMapping = (mapping: Mapping) => {
    setMappingEvaluator(mapping.evaluator_id);
    // Use staff_id not id for subordinates selection
    setMappingSubordinates(mapping.subordinates.map(s => s.staff_id));
    setEditingMappingId(mapping.id);
    setShowMappingModal(true);
  };

  const handleDeleteMapping = async (mappingId: string, evaluatorName?: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'mapping',
      id: mappingId,
      name: evaluatorName || 'this mapping'
    });
  };

  const confirmDeleteMapping = async () => {
    const mappingId = deleteModal.id;
    setDeleteModal({ isOpen: false, type: null, id: '', name: '' });
    
    try {
      setLoading(true);
      await fetchWithAuth(`/evaluation/hierarchy/${mappingId}?cascade=true`, {
        method: 'DELETE'
      });
      showToast.success('Mapping deleted successfully');
      fetchMappings();
    } catch (error: any) {
      showToast.error(error.message || 'Failed to delete mapping');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to map questionnaire question types to evaluation types
  const mapQuestionType = (type: string): 'rating' | 'mcq' | 'text' => {
    const typeMap: Record<string, 'rating' | 'mcq' | 'text'> = {
      // Rating types
      'rating': 'rating',
      'scale': 'rating',
      'slider': 'rating',
      'slider_scale': 'rating',
      'dial_gauge': 'rating',
      'likert': 'rating',
      'likert_visual': 'rating',
      'nps': 'rating',
      'nps_scale': 'rating',
      'star_rating': 'rating',
      // MCQ types - single and multi choice (includes actual DB types)
      'single_choice': 'mcq',
      'multiple_choice': 'mcq',
      'single_select': 'mcq',  // Actual DB type
      'multiselect': 'mcq',    // Actual DB type
      'radio': 'mcq',          // Actual DB type
      'mcq': 'mcq',
      'multi': 'mcq',
      'dropdown': 'mcq',
      'matrix': 'mcq',
      'drag_and_drop': 'mcq',
      // Text types
      'text': 'text',
      'textarea': 'text',
      'short_answer': 'text',
      'long_answer': 'text',
      'open_ended': 'text',
      'information': 'text',
    };
    return typeMap[type?.toLowerCase()] || 'text';
  };

  // Trigger evaluation
  const handleTriggerEvaluation = async () => {
    if (!selectedTemplate) {
      showToast.error('Please select an evaluation form');
      return;
    }
    
    // Check for custom questionnaire selection
    if (selectedTemplate.startsWith('custom_')) {
      const customQ = getSelectedCustomQuestionnaire();
      if (!customQ) {
        showToast.error('Please select a questionnaire first');
        return;
      }
      
      // Fetch the latest questionnaire status from API to ensure it's up-to-date
      try {
        const questionnaireId = selectedTemplate.replace('custom_', '');
        const response = await fetchWithAuth(`/questionnaires/${questionnaireId}`);
        const latestQuestionnaire = response?.data || response;
        const latestStatus = latestQuestionnaire?.status?.toLowerCase();
        
        // Update local state with latest status
        if (latestStatus) {
          setCustomQuestionnaires(prev => prev.map(q => 
            q.id === questionnaireId ? { ...q, status: latestQuestionnaire.status } : q
          ));
        }
        
        // Check if questionnaire status is live/published
        if (latestStatus && latestStatus !== 'live' && latestStatus !== 'published' && latestStatus !== 'active') {
          showToast.error(`Cannot trigger evaluation: The questionnaire "${customQ.name}" is currently in "${latestQuestionnaire.status}" status. Please publish the questionnaire first to make it LIVE.`);
          return;
        }
      } catch (error) {
        console.error('Failed to fetch latest questionnaire status:', error);
        // Fall back to cached status check
        const status = customQ.status?.toLowerCase();
        if (status && status !== 'live' && status !== 'published' && status !== 'active') {
          showToast.error(`Cannot trigger evaluation: The questionnaire "${customQ.name}" is currently in "${customQ.status}" status. Please publish the questionnaire first to make it LIVE.`);
          return;
        }
      }
    }
    
    if (selectedEvaluators.length === 0) {
      showToast.error('Please select at least one evaluator');
      return;
    }
    
    // Validate that at least one evaluator has subordinates selected
    const evaluatorsWithSelectedSubs = selectedEvaluators.filter(evalId => {
      const subs = selectedSubordinates[evalId] || [];
      return subs.length > 0;
    });
    
    if (evaluatorsWithSelectedSubs.length === 0) {
      showToast.error('Please select at least one subordinate for evaluation');
      return;
    }
    
    // Prepare email preview
    const template = evaluationTemplates.find(t => t.id === selectedTemplate);
    const customQ = getSelectedCustomQuestionnaire();
    const templateName = selectedTemplate.startsWith('custom_') 
      ? customQ?.name 
      : template?.name;
    const evaluatorsList = mappings
      .filter(m => selectedEvaluators.includes(m.evaluator_id))
      .map(m => m.evaluator_name)
      .join(', ');
    
    setEmailSubject(`Evaluation Request: ${templateName || 'Staff Evaluation'}`);
    setEmailBody(`Hello {evaluator_name},\n\nYou have been requested to complete a ${templateName || 'Staff'} evaluation for your team members.\n\nEvaluation Period: {start_date} to {end_date}\n\nYour subordinates to evaluate:\n{subordinates_list}\n\nPlease complete the evaluation by clicking the button in your email.\n\nBest regards,\nQSights Team`);
    setShowTriggerModal(true);
  };

  const handleConfirmTrigger = async () => {
    // Prevent double sends using ref (more reliable than state)
    if (triggerInProgressRef.current) {
      console.log('[Evaluation] Trigger already in progress, ignoring duplicate call');
      return;
    }
    triggerInProgressRef.current = true;
    
    try {
      setTriggering(true);
      
      const template = evaluationTemplates.find(t => t.id === selectedTemplate);
      const customQ = getSelectedCustomQuestionnaire();
      
      // Determine template data based on selection type
      let triggerTemplateId = selectedTemplate;
      let triggerTemplateName = template?.name;
      let triggerTemplateQuestions = template?.questions;
      let questionnaireId: string | null = null;
      
      // If custom questionnaire is selected, use its data
      if (selectedTemplate?.startsWith('custom_') && customQ?.data) {
        const actualQuestionnaireId = selectedTemplate.replace('custom_', '');
        triggerTemplateId = `questionnaire_${actualQuestionnaireId}`;
        triggerTemplateName = customQ.name || 'Custom Questionnaire';
        questionnaireId = actualQuestionnaireId;
        
        // Log the questionnaire data for debugging
        console.log('[Evaluation] Custom questionnaire data:', customQ.data);
        console.log('[Evaluation] Questions available:', customQ.data.questions);
        
        // Convert questionnaire questions to evaluation format
        const questions = customQ.data.questions || [];
        triggerTemplateQuestions = questions.map((q: any) => {
          // Get options from various possible locations - may be JSON string or array
          let rawOptions = q.options || q.choices || q.settings?.options || [];
          
          // Parse JSON string if needed
          if (typeof rawOptions === 'string') {
            try {
              rawOptions = JSON.parse(rawOptions);
            } catch (e) {
              rawOptions = [];
            }
          }
          
          const options = Array.isArray(rawOptions) ? rawOptions : [];
          
          console.log('[Evaluation] Question:', q.title || q.text, 'Type:', q.type, '→', mapQuestionType(q.type), 'Options:', options);
          
          return {
            question: q.title || q.question || q.text || '',
            type: mapQuestionType(q.type),
            options: options,
            scale: q.scale || q.settings?.scale || 5,
            description: q.description || '',
          };
        });
        
        console.log('[Evaluation] Converted questions:', triggerTemplateQuestions);
        
        // Validate we have questions
        if (!triggerTemplateQuestions || triggerTemplateQuestions.length === 0) {
          showToast.error('The selected questionnaire has no questions. Please add questions or select a different questionnaire.');
          setTriggering(false);
          return;
        }
      }
      
      // For superadmin, get program_id from the selected evaluators' mappings
      // For regular users, use their programId
      let effectiveProgramId = programId;
      if (user?.role === 'super-admin' && !programId) {
        // Priority 1: Use selected program filter if not 'all'
        if (selectedProgramFilter && selectedProgramFilter !== 'all') {
          effectiveProgramId = selectedProgramFilter;
        }
        // Priority 2: Get from the first selected evaluator's mapping
        else if (selectedEvaluators.length > 0) {
          const firstMapping = mappings.find(m => selectedEvaluators.includes(m.evaluator_id));
          if (firstMapping?.program_id) {
            effectiveProgramId = firstMapping.program_id;
          }
        }
        // Priority 3: If still no program_id, get from first program in list (for super-admin)
        if (!effectiveProgramId && programs.length > 0) {
          effectiveProgramId = programs[0].id;
        }
      }
      
      console.log('[Evaluation] Triggering with program_id:', effectiveProgramId, 'selectedFilter:', selectedProgramFilter, 'mappings:', mappings.length);
      
      // Prepare evaluator data with selected subordinates
      const evaluatorData = selectedEvaluators.map(evaluatorId => ({
        evaluator_id: evaluatorId,
        subordinate_ids: selectedSubordinates[evaluatorId] || []
      })).filter(data => data.subordinate_ids.length > 0); // Only include evaluators with subordinates
      
      console.log('[Evaluation] Sending evaluator data:', evaluatorData);
      
      const response = await fetchWithAuth('/evaluation/trigger', {
        method: 'POST',
        body: JSON.stringify({
          template_id: triggerTemplateId,
          template_name: triggerTemplateName,
          template_questions: triggerTemplateQuestions,
          questionnaire_id: questionnaireId,
          evaluator_data: evaluatorData, // New: send evaluators with their selected subordinates
          program_id: effectiveProgramId,
          email_subject: emailSubject,
          email_body: emailBody,
          start_date: startDate || null,
          end_date: endDate || null,
          scheduled_trigger_at: scheduledDate || null,
          scheduled_timezone: scheduledDate ? scheduledTimezone : null,
        })
      });
      
      if (response.success) {
        if (response.skipped_count > 0 && response.triggered_count === 0) {
          // All were skipped
          showToast.warning(
            `All evaluators skipped - they already have active evaluations. Delete existing or wait until end date passes. Skipped: ${response.skipped_evaluators.join(', ')}`
          );
        } else if (response.skipped_count > 0) {
          showToast.warning(
            `Triggered ${response.triggered_count} evaluation(s). Skipped ${response.skipped_count} (active evaluation exists): ${response.skipped_evaluators.join(', ')}`
          );
        } else {
          showToast.success(`Successfully triggered ${response.triggered_count} evaluation(s) and sent ${response.emails_sent} email(s)`);
        }
        // Clear selection but keep custom questionnaires (they're stored in DB now)
        setSelectedTemplate(null);
        setSelectedEvaluators([]);
        setSelectedSubordinates({});
        sessionStorage.removeItem('evaluation_selected_template');
        setShowTriggerModal(false);
        setActiveTab('history');
        fetchTriggeredEvaluations();
      } else {
        showToast.error(response.message || 'Failed to trigger evaluation');
      }
    } catch (error: any) {
      showToast.error(error.message || 'Failed to trigger evaluation');
    } finally {
      setTriggering(false);
      triggerInProgressRef.current = false; // Reset the ref
    }
  };

  // History management handlers
  const handleEditTriggered = (evaluation: TriggeredEvaluation) => {
    setEditingTriggered(evaluation);
    setEmailSubject(evaluation.email_subject || 'Evaluation Request: ' + evaluation.template_name);
    setEmailBody(evaluation.email_body || '');
    setStartDate(evaluation.start_date || '');
    setEndDate(evaluation.end_date || '');
    setShowEditTriggeredModal(true);
  };

  const handleUpdateTriggered = async () => {
    if (!editingTriggered) return;
    
    try {
      const response = await fetchWithAuth(`/evaluation/triggered/${editingTriggered.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          email_subject: emailSubject,
          email_body: emailBody,
          start_date: startDate,
          end_date: endDate
        })
      });
      
      if (response.success) {
        showToast.success('Evaluation updated successfully');
        setShowEditTriggeredModal(false);
        setEditingTriggered(null);
        fetchTriggeredEvaluations();
      } else {
        showToast.error(response.message || 'Failed to update evaluation');
      }
    } catch (error: any) {
      showToast.error(error.message || 'Failed to update evaluation');
      console.error('Failed to update evaluation:', error);
    }
  };

  const handleDeleteTriggered = (id: string) => {
    const evaluation = triggeredEvaluations.find(e => e.id === id);
    setDeleteModal({
      isOpen: true,
      type: 'triggered',
      id: id,
      name: `${evaluation?.evaluator_name}'s evaluation for ${evaluation?.template_name}`
    });
  };

  const confirmDeleteTriggered = async () => {
    const id = deleteModal.id;
    try {
      const response = await fetchWithAuth(`/evaluation/triggered/${id}`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        showToast.success('Evaluation deleted successfully');
        fetchTriggeredEvaluations();
      } else {
        showToast.error(response.message || 'Failed to delete evaluation');
      }
    } catch (error: any) {
      showToast.error(error.message || 'Failed to delete evaluation');
      console.error('Failed to delete evaluation:', error);
    } finally {
      setDeleteModal({ isOpen: false, type: '', id: '', name: '' });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetchWithAuth(`/evaluation/triggered/${id}/toggle-active`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive })
      });
      
      if (response.success) {
        showToast.success(`Evaluation ${isActive ? 'activated' : 'deactivated'} successfully`);
        fetchTriggeredEvaluations();
      } else {
        showToast.error(response.message || 'Failed to update status');
      }
    } catch (error: any) {
      showToast.error(error.message || 'Failed to toggle active status');
      console.error('Failed to toggle active status:', error);
    }
  };

  const handleResendEmail = async (id: string) => {
    try {
      const response = await fetchWithAuth(`/evaluation/triggered/${id}/resend`, {
        method: 'POST'
      });
      
      if (response.success) {
        showToast.success('Email resent successfully!');
        fetchTriggeredEvaluations();
      } else {
        showToast.error(response.message || 'Failed to resend email');
      }
    } catch (error: any) {
      showToast.error(error.message || 'Failed to resend email');
      console.error('Failed to resend email:', error);
    }
  };

  // Filter roles by selected department (for cascading filter in modals)
  const selectedDeptObj = departments.find(d => d.id === selectedDepartment);
  const cascadeFilteredRoles = selectedDepartment 
    ? roles.filter(r => r.category === selectedDeptObj?.name)
    : roles;

  // Filter staff by selected role (for cascading filter in modals)
  const cascadeFilteredStaff = selectedRole
    ? staff.filter(s => s.role_id === selectedRole)
    : staff;

  // Get evaluators with subordinates (for trigger tab)
  const evaluatorsWithSubordinates = mappings.filter(m => m.subordinates.length > 0);

  // Define tabs based on user role
  const getTabs = () => {
    const isModeratorOrManager = user?.role === 'program-moderator' || user?.role === 'program-manager';
    const isEvaluationStaff = user?.role === 'evaluation-staff' || user?.role === 'evaluation_staff';
    
    if (isModeratorOrManager || isEvaluationStaff) {
      // Moderators, Managers, and Evaluation Staff only see My Dashboard and Reports
      return [
        { id: 'my-dashboard' as TabType, label: 'My Dashboard', icon: CheckCircle, description: 'View evaluations assigned to me' },
        { id: 'reports' as TabType, label: 'Report Dashboard', icon: BarChart3, description: 'View my team reports' },
      ];
    }
    
    // Admins see all tabs
    return [
      { id: 'setup' as TabType, label: 'Setup', icon: Building2, description: 'Departments, Roles, Staff & Mapping' },
      { id: 'trigger' as TabType, label: 'Trigger', icon: Play, description: 'Send evaluation forms' },
      { id: 'history' as TabType, label: 'Notification Management', icon: Bell, description: 'History & notification settings' },
      { id: 'reports' as TabType, label: 'Reports', icon: BarChart3, description: 'View evaluation reports' },
    ];
  };
  
  const tabs = getTabs();

  return (
    <AppLayout>
      {!mounted && (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}
      {mounted && (
        <div className="min-h-screen" suppressHydrationWarning>
          {/* Header with Tabs */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Evaluation System</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Setup, trigger, and manage staff performance evaluations
                </p>
              </div>
              <div className="flex items-center gap-3">
                {user?.role === 'super-admin' && programs.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Program:</label>
                    <select
                      value={selectedProgramFilter}
                      onChange={(e) => {
                        setSelectedProgramFilter(e.target.value);
                        // Refetch data when program changes
                        const newProgramId = e.target.value === 'all' ? '' : e.target.value;
                        if (activeTab === 'setup') {
                          fetchDepartments(newProgramId);
                          fetchRoles(newProgramId);
                          fetchStaff(newProgramId);
                          fetchMappings(newProgramId);
                        }
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                    >
                      <option value="all">All Programs</option>
                      {programs.map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

          {/* Modern Tabs */}
          <div className="inline-flex h-auto items-center justify-start rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 p-1.5 text-gray-600 shadow-inner border border-gray-200 flex-wrap gap-1 mt-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const colorClasses = 
                tab.id === 'my-dashboard' ? 'data-[active=true]:bg-white data-[active=true]:text-green-600 data-[active=true]:shadow-lg data-[active=true]:shadow-green-100' :
                tab.id === 'setup' ? 'data-[active=true]:bg-white data-[active=true]:text-blue-600 data-[active=true]:shadow-lg data-[active=true]:shadow-blue-100' :
                tab.id === 'trigger' ? 'data-[active=true]:bg-white data-[active=true]:text-purple-600 data-[active=true]:shadow-lg data-[active=true]:shadow-purple-100' :
                tab.id === 'history' ? 'data-[active=true]:bg-white data-[active=true]:text-indigo-600 data-[active=true]:shadow-lg data-[active=true]:shadow-indigo-100' :
                tab.id === 'notifications' ? 'data-[active=true]:bg-white data-[active=true]:text-indigo-600 data-[active=true]:shadow-lg data-[active=true]:shadow-indigo-100' :
                'data-[active=true]:bg-white data-[active=true]:text-cyan-600 data-[active=true]:shadow-lg data-[active=true]:shadow-cyan-100';
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  data-active={activeTab === tab.id}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-gray-900 ${colorClasses}`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* MY DASHBOARD TAB - For Moderators, Managers, and Evaluation Staff */}
          {activeTab === 'my-dashboard' && (
            <div className="space-y-6">
              {/* Evaluation Staff: Show Both Performance Received and Evaluation Tasks */}
              {(user?.role === 'evaluation-staff' || user?.role === 'evaluation_staff') && (
                <>
                  {/* Section 1: My Performance - Ratings received from manager */}
                  {myPerformanceData && (
                    <div className="bg-white rounded-xl shadow-sm border">
                      <div className="p-4 border-b bg-blue-50">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <Star className="h-5 w-5 text-yellow-600" />
                          My Performance Reviews
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Evaluation ratings I have received from my reporting manager</p>
                      </div>
                      <div className="p-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-blue-600 font-medium">Overall Score</p>
                                <p className="text-2xl font-bold text-blue-900 mt-1">{myPerformanceData.overallScore}/5</p>
                              </div>
                              <Star className="h-8 w-8 text-yellow-500" />
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-green-600 font-medium">Total Reviews</p>
                                <p className="text-2xl font-bold text-green-900 mt-1">{myPerformanceData.totalEvaluations}</p>
                              </div>
                              <FileText className="h-8 w-8 text-green-600" />
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-purple-600 font-medium">Latest Review</p>
                                <p className="text-sm font-bold text-purple-900 mt-1">
                                  {formatDate(myPerformanceData.latestEvaluation)}
                                </p>
                              </div>
                              <Calendar className="h-8 w-8 text-purple-600" />
                            </div>
                          </div>
                        </div>

                        {/* Recent Evaluations */}
                        {myPerformanceData.evaluations && myPerformanceData.evaluations.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900">Recent Evaluations</h4>
                            {myPerformanceData.evaluations.slice(0, 3).map((evaluation: any, idx: number) => (
                              <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-gray-900">{evaluation.template_name}</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                      Evaluated by: {evaluation.evaluator_name}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <div className="flex items-center gap-1">
                                      <Star className="h-4 w-4 text-yellow-500" />
                                      <span className="font-bold text-gray-900">{evaluation.score || 'N/A'}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {formatDate(evaluation.completed_at)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Section 2: Evaluation Tasks - Forms assigned to evaluate subordinates */}
                  <div className="bg-white rounded-xl shadow-sm border">
                    <div className="p-4 border-b bg-green-50">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        My Evaluation Tasks
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">Evaluation forms assigned to me to review and rate my subordinates</p>
                    </div>
                    <div className="p-4">
                      {triggeredEvaluations.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>No evaluation tasks assigned yet</p>
                          <p className="text-sm">Evaluation forms will appear here when assigned by your administrator</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left text-sm text-gray-500 border-b">
                                <th className="pb-3 font-medium">Form Name</th>
                                <th className="pb-3 font-medium">Subordinates to Evaluate</th>
                                <th className="pb-3 font-medium">Start Date</th>
                                <th className="pb-3 font-medium">End Date</th>
                                <th className="pb-3 font-medium">Status</th>
                                <th className="pb-3 font-medium text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {triggeredEvaluations.map((evaluation) => (
                                <tr key={evaluation.id} className="text-sm">
                                  <td className="py-4 font-medium text-gray-900">
                                    {evaluation.template_name}
                                  </td>
                                  <td className="py-4 text-gray-600">
                                    {evaluation.subordinates_count} staff member(s)
                                  </td>
                                  <td className="py-4 text-gray-500">
                                    {formatDate(evaluation.start_date) !== 'N/A' ? formatDate(evaluation.start_date) : '-'}
                                  </td>
                                  <td className="py-4 text-gray-500">
                                    {formatDate(evaluation.end_date) !== 'N/A' ? formatDate(evaluation.end_date) : '-'}
                                  </td>
                                  <td className="py-4">
                                    {evaluation.status === 'completed' ? (
                                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                        Completed
                                      </span>
                                    ) : evaluation.status === 'in_progress' ? (
                                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                        In Progress
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                        Pending
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-4 text-right">
                                    {evaluation.status !== 'completed' && (
                                      <button
                                        onClick={() => {
                                          const url = (evaluation as any).access_token 
                                            ? `/e/evaluate/${evaluation.id}?token=${(evaluation as any).access_token}`
                                            : `/e/evaluate/${evaluation.id}`;
                                          window.open(url, '_blank');
                                        }}
                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium inline-flex items-center gap-1"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                        {evaluation.status === 'in_progress' ? 'Continue' : 'Start Evaluation'}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Moderator/Manager: Show Same as Evaluation Staff - Performance + Tasks */}
              {(user?.role === 'program-moderator' || user?.role === 'program-manager') && (
                <>
                  {/* Summary Cards */}
                  {myPerformanceData && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-600 font-medium">Overall Score</p>
                            <p className="text-3xl font-bold text-blue-900 mt-2">
                              {myPerformanceData.overallScore || '0.0'}/5
                            </p>
                          </div>
                          <div className="bg-blue-200 rounded-full p-3">
                            <Star className="h-6 w-6 text-blue-700" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-green-600 font-medium">Evaluations Received</p>
                            <p className="text-3xl font-bold text-green-900 mt-2">{myPerformanceData.totalEvaluations}</p>
                          </div>
                          <div className="bg-green-200 rounded-full p-3">
                            <CheckCircle className="h-6 w-6 text-green-700" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-amber-600 font-medium">Tasks Assigned</p>
                            <p className="text-3xl font-bold text-amber-900 mt-2">{triggeredEvaluations.length}</p>
                          </div>
                          <div className="bg-amber-200 rounded-full p-3">
                            <Activity className="h-6 w-6 text-amber-700" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 1: My Performance - Ratings received from manager */}
                  {myPerformanceData && (
                    <div className="bg-white rounded-xl shadow-sm border">
                      <div className="p-4 border-b bg-blue-50">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <Star className="h-5 w-5 text-yellow-600" />
                          My Performance Reviews
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Evaluation ratings I have received from my reporting manager</p>
                      </div>
                      <div className="p-6">
                        {myPerformanceData.evaluations.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">
                            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>No performance reviews yet</p>
                            <p className="text-sm">Your manager's evaluations will appear here</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {myPerformanceData.evaluations.map((evaluation: any, idx: number) => (
                              <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <p className="font-semibold text-gray-900">{evaluation.template_name}</p>
                                    <p className="text-sm text-gray-500">
                                      Evaluated by {evaluation.evaluator_name} • {formatDate(evaluation.completed_at)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border">
                                    <Star className="h-5 w-5 text-amber-500" />
                                    <span className="text-2xl font-bold text-gray-900">{evaluation.average_score.toFixed(1)}</span>
                                    <span className="text-sm text-gray-500">/5.0</span>
                                  </div>
                                </div>
                                {evaluation.responses && Object.keys(evaluation.responses).length > 0 && (
                                  <div className="mt-3 pt-3 border-t">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Response Details:</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {Object.entries(evaluation.responses).map(([question, answer], qIdx) => (
                                        <div key={qIdx} className="bg-white p-3 rounded border">
                                          <p className="text-xs text-gray-500 mb-1">{question}</p>
                                          <p className="font-medium text-gray-900">
                                            {typeof answer === 'number' ? (
                                              <span className="flex items-center gap-1">
                                                <span className="text-yellow-500">{'★'.repeat(answer)}</span>
                                                <span className="text-gray-300">{'★'.repeat(5 - answer)}</span>
                                                <span className="text-sm text-gray-600 ml-2">({answer}/5)</span>
                                              </span>
                                            ) : (
                                              String(answer)
                                            )}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Section 2: My Evaluation Tasks */}
                  <div className="bg-white rounded-xl shadow-sm border">
                    <div className="p-4 border-b bg-purple-50">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-purple-600" />
                        My Evaluation Tasks
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">Evaluations assigned to me for completion</p>
                    </div>
                    <div className="p-4">
                      {staffDashboardLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                      ) : triggeredEvaluations.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>No evaluations assigned yet</p>
                          <p className="text-sm">Evaluations will appear here when assigned by your administrator</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left text-sm text-gray-500 border-b">
                                <th className="pb-3 font-medium">Form</th>
                                <th className="pb-3 font-medium">Subordinates to Evaluate</th>
                                <th className="pb-3 font-medium">Status</th>
                                <th className="pb-3 font-medium">Start Date</th>
                                <th className="pb-3 font-medium">End Date</th>
                                <th className="pb-3 font-medium text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {triggeredEvaluations.map((evaluation) => (
                                <tr key={evaluation.id} className="text-sm">
                                  <td className="py-4 font-medium text-gray-900">
                                    {evaluation.template_name}
                                  </td>
                                  <td className="py-4 text-gray-600">
                                    {evaluation.subordinates_count} staff member(s)
                                  </td>
                                  <td className="py-4">
                                    {evaluation.status === 'completed' ? (
                                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                        Completed
                                      </span>
                                    ) : evaluation.status === 'in_progress' ? (
                                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                        In Progress
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                        Pending
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-4 text-gray-500">
                                    {formatDate(evaluation.start_date)}
                                  </td>
                                  <td className="py-4 text-gray-500">
                                    {formatDate(evaluation.end_date)}
                                  </td>
                                  <td className="py-4 text-right">
                                    {evaluation.status !== 'completed' && (
                                      <button
                                        onClick={() => {
                                          const url = (evaluation as any).access_token 
                                            ? `/e/evaluate/${evaluation.id}?token=${(evaluation as any).access_token}`
                                            : `/e/evaluate/${evaluation.id}`;
                                          window.open(url, '_blank');
                                        }}
                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium inline-flex items-center gap-1"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                        {evaluation.status === 'in_progress' ? 'Continue' : 'Start Evaluation'}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* SETUP TAB */}
          {activeTab === 'setup' && (
            <div className="space-y-6">
              {/* Stats Cards - Using GradientStatCard for Professional Look */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div onClick={() => {
                  setEditingDept(null);
                  setDeptForm({ name: '', code: '', description: '', program_id: '' });
                  setShowDeptModal(true);
                }} className="cursor-pointer">
                  <GradientStatCard
                    title="Departments"
                    value={departments.length}
                    subtitle="Click to add new"
                    icon={Building2}
                    variant="purple"
                  />
                </div>

                <div onClick={() => {
                  setEditingRole(null);
                  setRoleForm({ name: '', code: '', description: '', department_id: '' });
                  setShowRoleModal(true);
                }} className="cursor-pointer">
                  <GradientStatCard
                    title="Roles"
                    value={roles.length}
                    subtitle="Click to add new"
                    icon={Network}
                    variant="blue"
                  />
                </div>

                <div onClick={() => {
                  setEditingStaff(null);
                  setStaffForm({ name: '', email: '', employee_id: '', role_id: '', create_account: false, is_new_joinee: false, joining_date: '', new_joinee_days: 30 });
                  setShowStaffModal(true);
                }} className="cursor-pointer">
                  <GradientStatCard
                    title="Staff Members"
                    value={staff.length}
                    subtitle="Click to add new"
                    icon={Users}
                    variant="green"
                  />
                </div>

                <div onClick={() => setShowMappingModal(true)} className="cursor-pointer">
                  <GradientStatCard
                    title="Hierarchies"
                    value={mappings.length}
                    subtitle="Click to add new"
                    icon={Network}
                    variant="orange"
                  />
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 rounded-lg p-2.5">
                      <Zap className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-lg">Quick Actions</p>
                      <p className="text-sm text-gray-600">Manage your evaluation system efficiently</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setEditingDept(null);
                        setDeptForm({ name: '', code: '', description: '', program_id: '' });
                        setShowDeptModal(true);
                      }}
                      className="px-4 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all text-sm font-medium flex items-center gap-2 shadow-sm"
                    >
                      <Building2 className="h-4 w-4" />
                      Add Department
                    </button>
                    <button
                      onClick={() => {
                        setEditingRole(null);
                        setRoleForm({ name: '', code: '', description: '', department_id: '' });
                        setShowRoleModal(true);
                      }}
                      className="px-4 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all text-sm font-medium flex items-center gap-2 shadow-sm"
                    >
                      <Network className="h-4 w-4" />
                      Add Role
                    </button>
                    <button
                      onClick={() => {
                        setEditingStaff(null);
                        setStaffForm({ name: '', email: '', employee_id: '', role_id: '', create_account: false, is_new_joinee: false, joining_date: '', new_joinee_days: 30 });
                        setShowStaffModal(true);
                      }}
                      className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-medium flex items-center gap-2 shadow-md"
                    >
                      <Users className="h-4 w-4" />
                      Add Staff
                    </button>
                    <button
                      onClick={() => setBulkImportOpen(true)}
                      className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all text-sm font-medium flex items-center gap-2 shadow-md"
                    >
                      <Upload className="h-4 w-4" />
                      Bulk Import
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Departments Table */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-purple-600" />
                      Departments List
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {departments.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-gray-500 text-sm">
                              No departments yet
                            </td>
                          </tr>
                        ) : (
                          departments.map((dept) => (
                            <tr key={dept.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{dept.name}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{dept.code}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleEditDepartment(dept)}
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded transition"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => openDeleteDepartmentModal(dept)}
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded transition"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Roles Table */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b space-y-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Network className="h-5 w-5 text-blue-600" />
                      Roles List
                      <span className="ml-auto text-sm font-normal text-gray-500">
                        {filteredRoles.length} {filteredRoles.length === 1 ? 'role' : 'roles'}
                      </span>
                    </h3>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="text"
                          placeholder="Search roles..."
                          value={roleSearchQuery}
                          onChange={(e) => {
                            setRoleSearchQuery(e.target.value);
                            setRoleCurrentPage(1);
                          }}
                          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <select
                        value={roleDeptFilter}
                        onChange={(e) => {
                          setRoleDeptFilter(e.target.value);
                          setRoleCurrentPage(1);
                        }}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Departments</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.name}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Level</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedRoles.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                              {roleSearchQuery || roleDeptFilter !== 'all' ? 'No roles match your filters' : 'No roles yet'}
                            </td>
                          </tr>
                        ) : (
                          paginatedRoles.map((role) => (
                            <tr key={role.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{role.name}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{role.category || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-center">{role.hierarchy_level}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleEditRole(role)}
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded transition"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => openDeleteRoleModal(role)}
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded transition"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {roleTotalPages > 1 && (
                    <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        Showing {((roleCurrentPage - 1) * roleItemsPerPage) + 1} to {Math.min(roleCurrentPage * roleItemsPerPage, filteredRoles.length)} of {filteredRoles.length}
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setRoleCurrentPage(p => Math.max(1, p - 1))}
                          disabled={roleCurrentPage === 1}
                          className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="px-3 py-1 text-sm">
                          Page {roleCurrentPage} of {roleTotalPages}
                        </span>
                        <button
                          onClick={() => setRoleCurrentPage(p => Math.min(roleTotalPages, p + 1))}
                          disabled={roleCurrentPage === roleTotalPages}
                          className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Staff Table */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b space-y-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-600" />
                      Staff List
                      <span className="ml-auto text-sm font-normal text-gray-500">
                        {filteredStaff.length} {filteredStaff.length === 1 ? 'member' : 'members'}
                      </span>
                    </h3>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="text"
                          placeholder="Search staff..."
                          value={staffSearchQuery}
                          onChange={(e) => {
                            setStaffSearchQuery(e.target.value);
                            setStaffCurrentPage(1);
                          }}
                          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <select
                        value={staffRoleFilter}
                        onChange={(e) => {
                          setStaffRoleFilter(e.target.value);
                          setStaffCurrentPage(1);
                        }}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="all">All Roles</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedStaff.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                              {staffSearchQuery || staffRoleFilter !== 'all' ? 'No staff match your filters' : 'No staff yet'}
                            </td>
                          </tr>
                        ) : (
                          paginatedStaff.map((member) => (
                            <tr key={member.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{member.name}</p>
                                  {member.employee_id && (
                                    <p className="text-xs text-gray-500">ID: {member.employee_id}</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{member.email}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{member.role_name || '-'}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleEditStaff(member)}
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded transition"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => openDeleteStaffModal(member)}
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded transition"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {staffTotalPages > 1 && (
                    <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        Showing {((staffCurrentPage - 1) * staffItemsPerPage) + 1} to {Math.min(staffCurrentPage * staffItemsPerPage, filteredStaff.length)} of {filteredStaff.length}
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setStaffCurrentPage(p => Math.max(1, p - 1))}
                          disabled={staffCurrentPage === 1}
                          className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="px-3 py-1 text-sm">
                          Page {staffCurrentPage} of {staffTotalPages}
                        </span>
                        <button
                          onClick={() => setStaffCurrentPage(p => Math.min(staffTotalPages, p + 1))}
                          disabled={staffCurrentPage === staffTotalPages}
                          className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Hierarchy Mappings Table - Full Width */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 bg-gray-50 border-b">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Network className="h-5 w-5 text-orange-600" />
                    Hierarchy Mappings
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manager/Evaluator</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subordinates</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {mappings.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                            No hierarchy mappings yet
                          </td>
                        </tr>
                      ) : (
                        mappings.map((mapping) => (
                          <tr key={mapping.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{mapping.evaluator_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{mapping.evaluator_role}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {mapping.subordinates.map((sub) => (
                                  <span key={sub.id} className="inline-flex items-center px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-full">
                                    {sub.name}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                                Direct
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEditMapping(mapping)}
                                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded transition"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMapping(mapping.id, mapping.evaluator_name)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded transition"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Stats - Removed old card layout */}
              <div className="grid grid-cols-4 gap-4" style={{display: 'none'}}>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-700">{departments.length}</p>
                  <p className="text-sm text-purple-600">Departments</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{roles.length}</p>
                  <p className="text-sm text-blue-600">Roles</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{staff.length}</p>
                  <p className="text-sm text-green-600">Staff Members</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-orange-700">{mappings.length}</p>
                  <p className="text-sm text-orange-600">Evaluators</p>
                </div>
              </div>
            </div>
          )}

          {/* TRIGGER TAB */}
          {activeTab === 'trigger' && (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <GradientStatCard
                  title="Forms Available"
                  value={evaluationTemplates.length + customQuestionnaires.length}
                  subtitle="Templates & Custom"
                  icon={FileQuestion}
                  variant="purple"
                  onClick={() => {
                    // Scroll to forms section
                    document.getElementById('trigger-forms-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
                <GradientStatCard
                  title="Total Evaluators"
                  value={evaluatorsWithSubordinates.length}
                  subtitle="With subordinates"
                  icon={UserCheck}
                  variant="blue"
                  onClick={() => {
                    document.getElementById('trigger-evaluators-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
                <GradientStatCard
                  title="Selected Evaluators"
                  value={selectedEvaluators.length}
                  subtitle="Ready to trigger"
                  icon={CheckCircle}
                  variant="green"
                />
                <GradientStatCard
                  title="Subordinates"
                  value={Object.values(selectedSubordinates).reduce((sum, subs) => sum + subs.length, 0)}
                  subtitle="To be evaluated"
                  icon={Users}
                  variant="orange"
                />
              </div>

              {/* New Joinee Evaluation Settings */}
              <Card className="border-purple-200 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-100">
                  <div className="flex items-start gap-3">
                    <div className="bg-purple-100 rounded-lg p-2.5 shadow-sm">
                      <Target className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl text-gray-900 mb-2">
                        New Joinee Evaluation Settings
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        Select which evaluation form will be automatically triggered for new employees marked as "New Joinee"
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      Default Questionnaire for New Joinee Evaluations
                    </label>
                    <select
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                        value={newJoineeQuestionnaireId}
                        onChange={async (e) => {
                          const value = e.target.value;
                          setNewJoineeQuestionnaireId(value);
                          
                          // Save to backend
                          try {
                            await fetchWithAuth('/evaluation/settings/new-joinee-questionnaire', {
                              method: 'POST',
                              body: JSON.stringify({
                                program_id: programId,
                                questionnaire_id: value
                              })
                            });
                            showToast.success('New joinee evaluation form saved successfully');
                          } catch (error) {
                            console.error('Failed to save new joinee questionnaire setting:', error);
                            showToast.error('Failed to save setting');
                          }
                        }}
                      >
                        <option value="">Select a questionnaire...</option>
                        <optgroup label="Pre-defined Templates">
                          {evaluationTemplates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Custom Questionnaires">
                          {customQuestionnaires.map((customQ) => (
                            <option key={customQ.id} value={`custom_${customQ.id}`}>
                              {customQ.name}
                            </option>
                          ))}
                        </optgroup>
                    </select>
                    <p className="mt-3 text-xs text-gray-500 flex items-center gap-1.5 bg-purple-50 px-3 py-2 rounded-md">
                      <AlertCircle className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                      <span>This questionnaire will be used when adding new staff with "Is New Joinee" checked</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Step 1: Select Form */}
              <Card id="trigger-forms-section" className="shadow-md">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-md">
                      1
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-900">Select Evaluation Form</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">Choose from pre-defined templates or your custom questionnaires</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {evaluationTemplates.map((template) => {
                    const Icon = template.icon;
                    return (
                      <button
                        key={template.id}
                        onClick={() => {
                          setSelectedTemplate(template.id === selectedTemplate ? null : template.id);
                        }}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          selectedTemplate === template.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className={`w-10 h-10 ${template.bgColor} rounded-lg flex items-center justify-center mb-3`}>
                          <Icon className={`h-5 w-5 ${template.color}`} />
                        </div>
                        <h4 className="font-semibold text-gray-900">{template.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                        <p className="text-xs text-blue-600 mt-2">{template.questions.length} questions</p>
                      </button>
                    );
                  })}
                  
                  {/* Custom Questionnaires - Show all added custom questionnaires */}
                  {customQuestionnaires.map((customQ) => {
                    const templateId = `custom_${customQ.id}`;
                    return (
                      <button
                        key={templateId}
                        onClick={() => {
                          setSelectedTemplate(templateId === selectedTemplate ? null : templateId);
                        }}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          selectedTemplate === templateId
                            ? 'border-green-500 bg-green-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                            <FileQuestion className="h-5 w-5 text-green-600" />
                          </div>
                          {/* Status Badge */}
                          {customQ.status && (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              customQ.status.toLowerCase() === 'live' || 
                              customQ.status.toLowerCase() === 'published' || 
                              customQ.status.toLowerCase() === 'active'
                                ? 'bg-green-100 text-green-700'
                                : customQ.status.toLowerCase() === 'draft'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {customQ.status}
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-900 truncate" title={customQ.name}>
                          {customQ.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">Custom Questionnaire</p>
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <p className="text-xs text-green-600">
                            {customQ.data?.questions?.length || 0} questions
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/questionnaires/${customQ.id}?mode=edit&return=evaluation`);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                // Remove this custom questionnaire from database
                                try {
                                  await fetchWithAuth(`/evaluation-custom-questionnaires/${customQ.id}`, {
                                    method: 'DELETE',
                                  });
                                } catch (err) {
                                  console.error('Failed to remove from DB:', err);
                                }
                                // Remove from local state
                                setCustomQuestionnaires(prev => prev.filter(q => q.id !== customQ.id));
                                if (selectedTemplate === templateId) {
                                  setSelectedTemplate(null);
                                }
                              }}
                              className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  
                  {/* Add Custom Questionnaire Button - Always visible */}
                  <button
                    onClick={() => {
                      router.push('/questionnaires?mode=select-for-evaluation');
                    }}
                    className="p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50/50 text-left transition-all"
                  >
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-3">
                      <Plus className="h-5 w-5 text-green-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Add Custom Form</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Select or create a questionnaire
                    </p>
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <FileQuestion className="h-3 w-3" /> Browse questionnaires
                    </p>
                  </button>
                </div>
                </CardContent>
              </Card>

              {/* Step 2: Select Evaluators */}
              <Card id="trigger-evaluators-section" className="shadow-md">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-md">
                        2
                      </div>
                      <div>
                        <CardTitle className="text-xl text-gray-900">Select Evaluators</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">Choose evaluators and their subordinates to be evaluated</p>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2 bg-white px-4 py-2 rounded-lg border shadow-sm">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">{selectedEvaluators.length} Selected</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                
                {evaluatorsWithSubordinates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No evaluators with subordinates found.</p>
                    <p className="text-sm">Create mappings in the Setup tab first.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Filter Bar */}
                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <Filter className="h-5 w-5 text-gray-600" />
                        <h4 className="font-semibold text-gray-900">Filter Evaluators</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                          <select
                            value={evaluatorDeptFilter}
                            onChange={(e) => {
                              setEvaluatorDeptFilter(e.target.value);
                              setSelectedEvaluators([]);
                              setSelectedSubordinates({});
                            }}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm"
                          >
                            <option value="">All Departments</option>
                            {departments.map((dept) => (
                              <option key={dept.id} value={dept.name}>{dept.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end">
                          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 w-full shadow-sm">
                            <div className="text-xs text-gray-500 mb-1">Showing Results</div>
                            <div className="text-lg font-bold text-gray-900">
                              {evaluatorDeptFilter 
                                ? evaluatorsWithSubordinates.filter(e => {
                                    const staffMember = staff.find(s => s.id === e.evaluator_id);
                                    if (staffMember?.role_id) {
                                      const role = roles.find(r => r.id === staffMember.role_id);
                                      return role?.category === evaluatorDeptFilter;
                                    }
                                    return false;
                                  }).length
                                : evaluatorsWithSubordinates.length} Evaluators
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Select All (filtered) */}
                    {(() => {
                      // Helper function to get evaluator's department (from role category)
                      const getEvaluatorDepartment = (evaluatorId: string): string => {
                        const staffMember = staff.find(s => s.id === evaluatorId);
                        if (staffMember?.role_id) {
                          const role = roles.find(r => r.id === staffMember.role_id);
                          return role?.category || '';
                        }
                        return '';
                      };

                      const filteredEvaluators = evaluatorDeptFilter 
                        ? evaluatorsWithSubordinates.filter(e => getEvaluatorDepartment(e.evaluator_id) === evaluatorDeptFilter)
                        : evaluatorsWithSubordinates;
                      
                      return (
                        <>
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 shadow-sm">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={filteredEvaluators.length > 0 && filteredEvaluators.every(e => selectedEvaluators.includes(e.evaluator_id))}
                                onChange={(e) => {
                                if (e.target.checked) {
                                  const newEvaluators = [...new Set([...selectedEvaluators, ...filteredEvaluators.map(m => m.evaluator_id)])];
                                  setSelectedEvaluators(newEvaluators);
                                  // Select all subordinates for each evaluator
                                  const newSubordinates = { ...selectedSubordinates };
                                  filteredEvaluators.forEach(m => {
                                    newSubordinates[m.evaluator_id] = m.subordinates.map(s => s.staff_id);
                                  });
                                  setSelectedSubordinates(newSubordinates);
                                } else {
                                  setSelectedEvaluators(selectedEvaluators.filter(id => !filteredEvaluators.some(e => e.evaluator_id === id)));
                                  // Remove subordinate selections for deselected evaluators
                                  const newSubordinates = { ...selectedSubordinates };
                                  filteredEvaluators.forEach(m => {
                                    delete newSubordinates[m.evaluator_id];
                                  });
                                  setSelectedSubordinates(newSubordinates);
                                }
                              }}
                              className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                            />
                            <div className="flex-1">
                              <span className="font-semibold text-gray-900 block">
                                Select All Evaluators
                              </span>
                              <span className="text-sm text-gray-600">
                                {evaluatorDeptFilter ? `${filteredEvaluators.length} in ${evaluatorDeptFilter}` : `${filteredEvaluators.length} total`}
                              </span>
                            </div>
                            {filteredEvaluators.length > 0 && filteredEvaluators.every(e => selectedEvaluators.includes(e.evaluator_id)) && (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                          </label>
                          </div>
                    
                          {filteredEvaluators.map((mapping) => {
                            const isSelected = selectedEvaluators.includes(mapping.evaluator_id);
                            const evaluatorSubordinates = selectedSubordinates[mapping.evaluator_id] || [];
                            const allSubordinateIds = mapping.subordinates.map(s => s.staff_id);
                            const allSelected = evaluatorSubordinates.length === allSubordinateIds.length && allSubordinateIds.length > 0;
                            
                            return (
                              <div key={mapping.evaluator_id} className="space-y-2">
                                <label
                                  className={`flex items-center gap-3 p-5 rounded-xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-md ${
                                    isSelected
                                      ? 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-md'
                                      : 'border-gray-200 hover:border-green-300 bg-white'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedEvaluators([...selectedEvaluators, mapping.evaluator_id]);
                                        // By default, select all subordinates
                                        setSelectedSubordinates({
                                          ...selectedSubordinates,
                                          [mapping.evaluator_id]: allSubordinateIds
                                        });
                                      } else {
                                        setSelectedEvaluators(selectedEvaluators.filter(id => id !== mapping.evaluator_id));
                                        // Remove subordinates selection
                                        const newSubordinates = { ...selectedSubordinates };
                                        delete newSubordinates[mapping.evaluator_id];
                                        setSelectedSubordinates(newSubordinates);
                                      }
                                    }}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                  />
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900 text-lg">{mapping.evaluator_name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Building2 className="h-3.5 w-3.5 text-gray-400" />
                                      <p className="text-sm text-gray-600">{mapping.evaluator_dept}</p>
                                      <span className="text-gray-300">•</span>
                                      <p className="text-sm text-gray-600">{mapping.evaluator_role}</p>
                                    </div>
                                  </div>
                                  <div className="text-right bg-white rounded-lg px-4 py-2 border border-gray-200 shadow-sm">
                                    <p className="text-2xl font-bold text-green-600">{mapping.subordinates.length}</p>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Subordinates</p>
                                  </div>
                                </label>
                                
                                {/* Subordinates List - Only shown when evaluator is selected */}
                                {isSelected && (
                                  <div className="ml-8 pl-5 border-l-3 border-green-300 space-y-2 bg-gradient-to-r from-green-50/30 to-transparent py-3 rounded-r-lg">
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-green-200">
                                      <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                        <Users className="h-4 w-4 text-green-600" />
                                        Select Subordinates to Evaluate
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (allSelected) {
                                            // Deselect all
                                            setSelectedSubordinates({
                                              ...selectedSubordinates,
                                              [mapping.evaluator_id]: []
                                            });
                                          } else {
                                            // Select all
                                            setSelectedSubordinates({
                                              ...selectedSubordinates,
                                              [mapping.evaluator_id]: allSubordinateIds
                                            });
                                          }
                                        }}
                                        className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                                          allSelected 
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                      >
                                        {allSelected ? '✓ Deselect All' : 'Select All'}
                                      </button>
                                    </div>
                                    {mapping.subordinates.map((sub) => (
                                      <label
                                        key={sub.staff_id}
                                        className={`flex items-center gap-2.5 p-3 rounded-lg cursor-pointer transition-all border ${
                                          evaluatorSubordinates.includes(sub.staff_id)
                                            ? 'bg-green-50 border-green-200 hover:bg-green-100'
                                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={evaluatorSubordinates.includes(sub.staff_id)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedSubordinates({
                                                ...selectedSubordinates,
                                                [mapping.evaluator_id]: [...evaluatorSubordinates, sub.staff_id]
                                              });
                                            } else {
                                              setSelectedSubordinates({
                                                ...selectedSubordinates,
                                                [mapping.evaluator_id]: evaluatorSubordinates.filter(id => id !== sub.staff_id)
                                              });
                                            }
                                          }}
                                          className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                        />
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-900">{sub.name}</p>
                                          <p className="text-xs text-gray-500">{sub.role}</p>
                                        </div>
                                        {evaluatorSubordinates.includes(sub.staff_id) && (
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                        )}
                                      </label>
                                    ))}
                                    {evaluatorSubordinates.length === 0 && (
                                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-700 font-medium">No subordinates selected - this evaluator won't receive evaluation</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                )}
                </CardContent>
              </Card>

              {/* Step 3: Trigger Button */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Ready to send?</h3>
                    <p className="text-blue-100 text-sm mt-1">
                      {selectedTemplate?.startsWith('custom_') 
                        ? (getSelectedCustomQuestionnaire()?.name || 'Custom Questionnaire')
                        : (selectedTemplate ? evaluationTemplates.find(t => t.id === selectedTemplate)?.name : 'No form selected')}
                      {' • '}
                      {selectedEvaluators.length} evaluator(s) selected
                      {' • '}
                      {Object.values(selectedSubordinates).reduce((sum, subs) => sum + subs.length, 0)} subordinate(s) to evaluate
                    </p>
                  </div>
                  <button
                    onClick={handleTriggerEvaluation}
                    disabled={!selectedTemplate || selectedEvaluators.length === 0 || triggering}
                    className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {triggering ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Trigger Evaluation
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Triggered Evaluations</h3>
                    <div className="text-sm text-gray-500">
                      {triggeredEvaluations.length} total evaluation{triggeredEvaluations.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search by form, evaluator, or subordinates..."
                          value={historySearchQuery}
                          onChange={(e) => setHistorySearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    {/* Status Filter */}
                    <div className="sm:w-48">
                      <select
                        value={historyStatusFilter}
                        onChange={(e) => setHistoryStatusFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    
                    {/* Clear Filters */}
                    {(historySearchQuery || historyStatusFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setHistorySearchQuery('');
                          setHistoryStatusFilter('all');
                        }}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  {triggeredEvaluations.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No evaluations triggered yet</p>
                      <p className="text-sm">Go to the Trigger tab to send evaluations</p>
                    </div>
                  ) : (() => {
                    // Filter evaluations based on search and status
                    const filteredEvaluations = triggeredEvaluations.filter((evaluation) => {
                      // Status filter
                      if (historyStatusFilter !== 'all' && evaluation.status !== historyStatusFilter) {
                        return false;
                      }
                      
                      // Search filter
                      if (historySearchQuery) {
                        const searchLower = historySearchQuery.toLowerCase();
                        const matchesForm = evaluation.template_name?.toLowerCase().includes(searchLower);
                        const matchesEvaluator = evaluation.evaluator_name?.toLowerCase().includes(searchLower);
                        const matchesSubordinates = String(evaluation.subordinates_count || '').includes(searchLower);
                        
                        if (!matchesForm && !matchesEvaluator && !matchesSubordinates) {
                          return false;
                        }
                      }
                      
                      return true;
                    });
                    
                    return filteredEvaluations.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Filter className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No evaluations match your filters</p>
                        <p className="text-sm">Try adjusting your search or filter criteria</p>
                      </div>
                    ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-sm text-gray-500 border-b">
                            <th className="pb-3 font-medium">Form</th>
                            <th className="pb-3 font-medium">Evaluator</th>
                            <th className="pb-3 font-medium">Subordinates</th>
                            <th className="pb-3 font-medium">Status</th>
                            <th className="pb-3 font-medium">Scheduled For</th>
                            <th className="pb-3 font-medium">Email Delivered</th>
                            <th className="pb-3 font-medium">Triggered</th>
                            <th className="pb-3 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredEvaluations.map((evaluation) => (
                            <tr key={evaluation.id} className="text-sm">
                              <td className="py-4 font-medium text-gray-900">{evaluation.template_name}</td>
                              <td className="py-4 text-gray-600">{evaluation.evaluator_name}</td>
                              <td className="py-4 text-gray-600">{evaluation.subordinates_count}</td>
                              <td className="py-4">
                                {evaluation.status === 'completed' ? (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                    Completed
                                  </span>
                                ) : evaluation.status === 'in_progress' ? (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                    In Progress
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="py-4 text-gray-500">
                                {evaluation.scheduled_trigger_at ? (
                                  <div className="flex flex-col">
                                    <span className="text-blue-600 font-medium">
                                      {evaluation.scheduled_display?.date || formatDate(evaluation.scheduled_trigger_at)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {evaluation.scheduled_display?.day || ''} {evaluation.scheduled_display?.time || ''}
                                    </span>
                                    <span className="text-xs text-blue-500">
                                      {evaluation.scheduled_display?.ist?.split(',')[0] || 'IST'}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">Immediate</span>
                                )}
                              </td>
                              <td className="py-4 text-gray-500">
                                {evaluation.email_sent_at ? (
                                  <div className="flex flex-col">
                                    <span className="text-green-600 font-medium">
                                      {evaluation.email_sent_display?.date || formatDate(evaluation.email_sent_at)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {evaluation.email_sent_display?.day || ''} {evaluation.email_sent_display?.time || ''}
                                    </span>
                                    <span className="text-xs text-green-500">
                                      {evaluation.email_sent_display?.ist?.split(',')[0] || 'IST'}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-orange-500">Pending</span>
                                )}
                              </td>
                              <td className="py-4 text-gray-500">
                                <div className="flex flex-col">
                                  <span className="text-gray-700">
                                    {evaluation.triggered_display?.date || formatDate(evaluation.triggered_at)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {evaluation.triggered_display?.time || ''}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4">
                                <div className="flex items-center justify-end gap-2">
                                  {evaluation.is_active ? (
                                    <button
                                      onClick={() => handleToggleActive(evaluation.id, false)}
                                      className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition"
                                      title="Deactivate"
                                    >
                                      <Power className="h-4 w-4" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleToggleActive(evaluation.id, true)}
                                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"
                                      title="Activate"
                                    >
                                      <Power className="h-4 w-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleResendEmail(evaluation.id)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                    title="Resend Email"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEditTriggered(evaluation)}
                                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTriggered(evaluation.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    );
                  })()}
                </div>
              </div>

              {/* Notification Settings Section - Below History */}
              <NotificationsTab 
                programId={selectedProgramFilter !== 'all' ? selectedProgramFilter : programId}
                userRole={user?.role || ''}
                programs={programs}
              />
            </div>
          )}

          {/* REPORTS TAB */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Evaluation Staff, Moderator, Manager - Comprehensive Report Dashboard */}
              {(user?.role === 'evaluation-staff' || user?.role === 'evaluation_staff' || user?.role === 'program-moderator' || user?.role === 'program-manager') && (
                <>
                  {/* Summary Cards for Staff */}
                  {teamPerformanceData && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-600 font-medium">Total Subordinates</p>
                            <p className="text-3xl font-bold text-blue-900 mt-2">{teamPerformanceData.subordinates_count}</p>
                          </div>
                          <div className="bg-blue-200 rounded-full p-3">
                            <Users className="h-6 w-6 text-blue-700" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-green-600 font-medium">Total Evaluations</p>
                            <p className="text-3xl font-bold text-green-900 mt-2">
                              {teamPerformanceData.staff_reports.reduce((sum: number, s: any) => sum + s.total_evaluations, 0)}
                            </p>
                          </div>
                          <div className="bg-green-200 rounded-full p-3">
                            <CheckCircle className="h-6 w-6 text-green-700" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-amber-600 font-medium">Team Avg Score</p>
                            <p className="text-3xl font-bold text-amber-900 mt-2">
                              {teamPerformanceData.staff_reports.length > 0 
                                ? (teamPerformanceData.staff_reports.reduce((sum: number, s: any) => sum + s.overall_average, 0) / teamPerformanceData.staff_reports.length).toFixed(1)
                                : '0.0'}/5
                            </p>
                          </div>
                          <div className="bg-amber-200 rounded-full p-3">
                            <Star className="h-6 w-6 text-amber-700" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* View Mode Toggle */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setReportViewMode('staff')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        reportViewMode === 'staff' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
                      }`}
                    >
                      <Users className="inline h-4 w-4 mr-2" />
                      Staff-wise View
                    </button>
                    <button
                      onClick={() => setReportViewMode('analysis')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        reportViewMode === 'analysis' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
                      }`}
                    >
                      <PieChart className="inline h-4 w-4 mr-2" />
                      Performance Analysis
                    </button>
                  </div>

                  {/* Staff-wise Report View */}
                  {reportViewMode === 'staff' && (
                    <div className="bg-white rounded-xl shadow-sm border">
                      <div className="p-4 border-b">
                        <h3 className="font-semibold text-gray-900">My Team Evaluation Reports</h3>
                        <p className="text-sm text-gray-500">Detailed performance evaluations for your direct reports</p>
                      </div>
                      <div className="p-4">
                        {staffDashboardLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                          </div>
                        ) : !teamPerformanceData || teamPerformanceData.staff_reports.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">
                            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>No evaluation data found</p>
                            <p className="text-sm">Your team's evaluations will appear here</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {teamPerformanceData.staff_reports.map((staffReport: any) => {
                              const analysis = analyzeStaffPerformance(staffReport);
                              return (
                                <div key={staffReport.staff_id} className="border rounded-lg overflow-hidden">
                                  <button
                                    onClick={() => {
                                      if (expandedStaff.includes(staffReport.staff_id)) {
                                        setExpandedStaff(expandedStaff.filter(id => id !== staffReport.staff_id));
                                      } else {
                                        setExpandedStaff([...expandedStaff, staffReport.staff_id]);
                                      }
                                    }}
                                    className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition"
                                  >
                                    <div className="flex items-center gap-4 flex-1 text-left">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <p className="font-semibold text-gray-900">{staffReport.staff_name}</p>
                                          {staffReport.role_name && (
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                              {staffReport.role_name}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                          <span>{staffReport.staff_email}</span>
                                          {staffReport.employee_id && (
                                            <>
                                              <span className="text-gray-300">•</span>
                                              <span>ID: {staffReport.employee_id}</span>
                                            </>
                                          )}
                                          {staffReport.department && (
                                            <>
                                              <span className="text-gray-300">•</span>
                                              <span>{staffReport.department}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-6">
                                        <div className="text-center">
                                          <p className="text-2xl font-bold text-blue-600">{staffReport.total_evaluations}</p>
                                          <p className="text-xs text-gray-500">Evaluations</p>
                                        </div>
                                        <div className="text-center">
                                          <div className="flex items-center gap-1">
                                            <Star className="h-5 w-5 text-amber-500" />
                                            <p className="text-2xl font-bold text-gray-900">{staffReport.overall_average.toFixed(1)}</p>
                                          </div>
                                          <p className="text-xs text-gray-500">Avg Score</p>
                                        </div>
                                      </div>
                                    </div>
                                    {expandedStaff.includes(staffReport.staff_id) ? (
                                      <ChevronUp className="h-5 w-5 text-gray-400" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5 text-gray-400" />
                                    )}
                                  </button>
                                  
                                  {expandedStaff.includes(staffReport.staff_id) && (
                                    <div className="border-t bg-white p-4 space-y-6">
                                      {/* Radar Chart - Skills Overview */}
                                      {analysis.allScores.length > 0 && (
                                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
                                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <Activity className="h-5 w-5 text-purple-600" />
                                            Skills Performance Overview
                                          </h4>
                                          <div className="bg-white rounded-lg p-4">
                                            <ResponsiveContainer width="100%" height={300}>
                                              <RadarChart data={analysis.allScores.slice(0, 8).map((skill: any) => ({
                                                skill: skill.question.length > 25 ? skill.question.substring(0, 25) + '...' : skill.question,
                                                score: parseFloat(skill.score.toFixed(1)),
                                                fullMark: 5
                                              }))}>
                                                <PolarGrid stroke="#e5e7eb" />
                                                <PolarAngleAxis dataKey="skill" tick={{ fill: '#6b7280', fontSize: 12 }} />
                                                <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: '#6b7280' }} />
                                                <Radar name="Performance" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                                                <Tooltip 
                                                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                                  formatter={(value: any) => [`${value}/5`, 'Score']}
                                                />
                                              </RadarChart>
                                            </ResponsiveContainer>
                                          </div>
                                        </div>
                                      )}

                                      {/* Bar Chart - Detailed Ratings */}
                                      {analysis.allScores.length > 0 && (
                                        <div className="bg-white rounded-xl border">
                                          <div className="p-4 border-b bg-blue-50">
                                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                              <BarChart3 className="h-5 w-5 text-blue-600" />
                                              Detailed Skill Ratings
                                            </h4>
                                            <p className="text-sm text-gray-600 mt-1">Individual competency scores with visual breakdown</p>
                                          </div>
                                          <div className="p-4">
                                            <ResponsiveContainer width="100%" height={Math.max(300, analysis.allScores.length * 40)}>
                                              <BarChart 
                                                data={analysis.allScores.map((skill: any) => ({
                                                  name: skill.question.length > 30 ? skill.question.substring(0, 30) + '...' : skill.question,
                                                  score: parseFloat(skill.score.toFixed(1)),
                                                  fullName: skill.question
                                                }))}
                                                layout="vertical"
                                                margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                                              >
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis type="number" domain={[0, 5]} tick={{ fill: '#6b7280' }} />
                                                <YAxis type="category" dataKey="name" tick={{ fill: '#374151', fontSize: 12 }} width={140} />
                                                <Tooltip 
                                                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                                  formatter={(value: any, name: any, props: any) => [`${value}/5.0`, props.payload.fullName]}
                                                />
                                                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                                                  {analysis.allScores.map((skill: any, index: number) => {
                                                    const score = skill.score;
                                                    let color = '#ef4444'; // red for low scores
                                                    if (score >= 4) color = '#22c55e'; // green for high scores
                                                    else if (score >= 3) color = '#3b82f6'; // blue for medium scores
                                                    else if (score >= 2) color = '#f59e0b'; // amber for below average
                                                    return <Cell key={`cell-${index}`} fill={color} />;
                                                  })}
                                                </Bar>
                                              </BarChart>
                                            </ResponsiveContainer>
                                          </div>
                                          {/* Legend */}
                                          <div className="px-4 pb-4 flex items-center justify-center gap-6 text-sm">
                                            <div className="flex items-center gap-2">
                                              <div className="w-3 h-3 rounded bg-green-500"></div>
                                              <span className="text-gray-600">Excellent (4.0-5.0)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <div className="w-3 h-3 rounded bg-blue-500"></div>
                                              <span className="text-gray-600">Good (3.0-3.9)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <div className="w-3 h-3 rounded bg-amber-500"></div>
                                              <span className="text-gray-600">Average (2.0-2.9)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <div className="w-3 h-3 rounded bg-red-500"></div>
                                              <span className="text-gray-600">Needs Improvement (&lt;2.0)</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Strengths & Improvements */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Strengths */}
                                        {analysis.strengths.length > 0 && (
                                          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                            <h5 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                                              <Award className="h-4 w-4" />
                                              Top Strengths
                                            </h5>
                                            <ul className="space-y-2">
                                              {analysis.strengths.slice(0, 3).map((item: any, idx: number) => (
                                                <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
                                                  <span className="text-green-500 mt-0.5">✓</span>
                                                  <span>{item.question} ({item.score.toFixed(1)}/5)</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {/* Improvements */}
                                        {analysis.improvements.length > 0 && (
                                          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                                            <h5 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                                              <Target className="h-4 w-4" />
                                              Areas to Improve
                                            </h5>
                                            <ul className="space-y-2">
                                              {analysis.improvements.slice(0, 3).map((item: any, idx: number) => (
                                                <li key={idx} className="text-sm text-orange-700 flex items-start gap-2">
                                                  <span className="text-orange-500 mt-0.5">•</span>
                                                  <span>{item.question} ({item.score.toFixed(1)}/5)</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>

                                      {/* Text Feedback */}
                                      {analysis.textFeedback.length > 0 && (
                                        <div>
                                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                            <MessageSquare className="h-5 w-5 text-purple-600" />
                                            Qualitative Feedback
                                          </h4>
                                          <div className="space-y-2">
                                            {analysis.textFeedback.map((feedback: any, idx: number) => (
                                              <div key={idx} className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                                                <p className="text-xs text-purple-600 font-medium mb-1">{feedback.question}</p>
                                                <p className="text-sm text-gray-800">{feedback.answer}</p>
                                                <p className="text-xs text-gray-500 mt-1">— {feedback.evaluator}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Evaluation History */}
                                      <div>
                                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                          <Calendar className="h-5 w-5 text-gray-600" />
                                          Evaluation History
                                        </h4>
                                        {staffReport.evaluations.length === 0 ? (
                                          <p className="text-sm text-gray-500 italic">No evaluations completed yet</p>
                                        ) : (
                                          <div className="space-y-2">
                                            {staffReport.evaluations.map((evaluation: any, evalIndex: number) => (
                                              <div key={evalIndex} className="bg-gray-50 rounded-lg p-3 border">
                                                <div className="flex items-center justify-between">
                                                  <div>
                                                    <p className="font-medium text-gray-900">{evaluation.template_name}</p>
                                                    <p className="text-xs text-gray-500">
                                                      Evaluated by {evaluation.evaluator_name} • {formatDate(evaluation.evaluated_at)}
                                                    </p>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <Star className="h-4 w-4 text-amber-500" />
                                                    <span className="font-bold text-lg text-gray-900">{evaluation.average_score.toFixed(1)}</span>
                                                    <span className="text-sm text-gray-500">/5.0</span>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Performance Analysis View */}
                  {reportViewMode === 'analysis' && (
                    <div className="space-y-6">
                      {staffDashboardLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                        </div>
                      ) : !teamPerformanceData || teamPerformanceData.staff_reports.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                          <p className="text-gray-500 text-lg">No evaluation data available for analysis</p>
                          <p className="text-sm text-gray-400 mt-2">Complete some evaluations to see performance insights</p>
                        </div>
                      ) : (
                        <>
                          {/* Staff Selection for Detailed Analysis */}
                          <div className="bg-white rounded-xl shadow-sm border p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Target className="h-5 w-5 text-purple-600" />
                                Select Staff for Detailed Analysis
                              </h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                              {teamPerformanceData.staff_reports.map((staff: any) => {
                                const analysis = analyzeStaffPerformance(staff);
                                return (
                                  <button
                                    key={staff.staff_id}
                                    onClick={() => setSelectedStaffForAnalysis(
                                      selectedStaffForAnalysis === staff.staff_id ? null : staff.staff_id
                                    )}
                                    className={`p-3 rounded-lg border-2 transition text-left ${
                                      selectedStaffForAnalysis === staff.staff_id
                                        ? 'border-purple-500 bg-purple-50'
                                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    <p className="font-medium text-gray-900 truncate text-sm">{staff.staff_name}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                      <Star className="h-3 w-3 text-yellow-500" />
                                      <span className="text-xs font-bold text-gray-700">{analysis.overallAverage}</span>
                                      <span className="text-xs text-gray-400">/ 5</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Detailed Analysis for Selected Staff */}
                          {selectedStaffForAnalysis && (() => {
                            const selectedStaff = teamPerformanceData.staff_reports.find((s: any) => s.staff_id === selectedStaffForAnalysis);
                            if (!selectedStaff) return null;
                            const analysis = analyzeStaffPerformance(selectedStaff);
                            
                            return (
                              <div className="space-y-6">
                                {/* Staff Header Card */}
                                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                        <Users className="h-8 w-8 text-white" />
                                      </div>
                                      <div>
                                        <h2 className="text-2xl font-bold">{selectedStaff.staff_name}</h2>
                                        <p className="text-purple-200">{selectedStaff.staff_email}</p>
                                        {selectedStaff.employee_id && (
                                          <p className="text-purple-300 text-sm">ID: {selectedStaff.employee_id}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-5xl font-bold">{analysis.overallAverage}</div>
                                      <div className="text-purple-200">Overall Score</div>
                                      <div className="text-sm text-purple-300 mt-1">{analysis.totalEvaluations} evaluation(s)</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-5 border border-green-200">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm text-green-600 font-medium">Strengths</p>
                                        <p className="text-3xl font-bold text-green-800 mt-2">{analysis.strengths.length}</p>
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
                                        <p className="text-3xl font-bold text-orange-800 mt-2">{analysis.improvements.length}</p>
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
                                        <p className="text-3xl font-bold text-blue-800 mt-2">{analysis.allScores.length}</p>
                                      </div>
                                      <div className="bg-white/80 rounded-xl p-3">
                                        <Activity className="h-6 w-6 text-blue-500" />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl p-5 border border-purple-200">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm text-purple-600 font-medium">Feedback Received</p>
                                        <p className="text-3xl font-bold text-purple-800 mt-2">{analysis.textFeedback.length}</p>
                                      </div>
                                      <div className="bg-white/80 rounded-xl p-3">
                                        <MessageSquare className="h-6 w-6 text-purple-500" />
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
                                      <p className="text-sm text-green-600 mt-1">Top performing competencies</p>
                                    </div>
                                    <div className="p-4 space-y-4">
                                      {analysis.strengths.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">No high-scoring areas yet</p>
                                      ) : (
                                        analysis.strengths.map((item: any, idx: number) => (
                                          <div key={idx} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium text-gray-900">{item.question}</span>
                                              <span className="text-sm font-bold text-green-600 flex items-center gap-1">
                                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                                {Math.round(item.score * 10) / 10}
                                              </span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-3">
                                              <div 
                                                className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-500"
                                                style={{ width: `${(item.score / 5) * 100}%` }}
                                              />
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>

                                  {/* Areas of Improvement */}
                                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                    <div className="p-4 bg-orange-50 border-b border-orange-100">
                                      <h3 className="font-semibold text-orange-800 flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-orange-600" />
                                        Areas for Improvement
                                      </h3>
                                      <p className="text-sm text-orange-600 mt-1">Competencies to develop</p>
                                    </div>
                                    <div className="p-4 space-y-4">
                                      {analysis.improvements.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">No areas needing improvement</p>
                                      ) : (
                                        analysis.improvements.map((item: any, idx: number) => (
                                          <div key={idx} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium text-gray-900">{item.question}</span>
                                              <span className="text-sm font-bold text-orange-600 flex items-center gap-1">
                                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                                {Math.round(item.score * 10) / 10}
                                              </span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-3">
                                              <div 
                                                className="bg-gradient-to-r from-orange-400 to-amber-500 h-3 rounded-full transition-all duration-500"
                                                style={{ width: `${(item.score / 5) * 100}%` }}
                                              />
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* All Skills Overview */}
                                {analysis.allScores.length > 0 && (
                                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                    <div className="p-4 border-b bg-gray-50">
                                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-blue-600" />
                                        Competency Scores Overview
                                      </h3>
                                      <p className="text-sm text-gray-500 mt-1">All rated skills and competencies</p>
                                    </div>
                                    <div className="p-6">
                                      <div className="space-y-4">
                                        {analysis.allScores.map((item: any, idx: number) => {
                                          const percentage = (item.score / 5) * 100;
                                          const getColor = (score: number) => {
                                            if (score >= 4) return 'from-green-400 to-emerald-500';
                                            if (score >= 3) return 'from-blue-400 to-cyan-500';
                                            if (score >= 2) return 'from-yellow-400 to-amber-500';
                                            return 'from-orange-400 to-red-500';
                                          };
                                          return (
                                            <div key={idx} className="group">
                                              <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                  <span className="font-medium text-gray-900">{item.question}</span>
                                                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                                    {item.count} rating(s)
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-yellow-500 text-sm">
                                                    {'★'.repeat(Math.round(item.score))}
                                                    {'☆'.repeat(5 - Math.round(item.score))}
                                                  </span>
                                                  <span className="font-bold text-gray-700 w-12 text-right">
                                                    {Math.round(item.score * 10) / 10}/5
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                                                <div 
                                                  className={`bg-gradient-to-r ${getColor(item.score)} h-4 rounded-full transition-all duration-700 group-hover:opacity-80`}
                                                  style={{ width: `${percentage}%` }}
                                                />
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Qualitative Feedback */}
                                {analysis.textFeedback.length > 0 && (
                                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                    <div className="p-4 border-b bg-gray-50">
                                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5 text-purple-600" />
                                        Qualitative Feedback
                                      </h3>
                                      <p className="text-sm text-gray-500 mt-1">Written feedback from evaluators</p>
                                    </div>
                                    <div className="p-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {analysis.textFeedback.map((feedback: any, idx: number) => (
                                          <div key={idx} className="bg-gray-50 rounded-lg p-4 border">
                                            <div className="flex items-start gap-3">
                                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                                <MessageSquare className="h-4 w-4 text-purple-600" />
                                              </div>
                                              <div className="flex-1">
                                                <p className="text-xs text-purple-600 font-medium mb-1">{feedback.question}</p>
                                                <p className="text-gray-800">{feedback.answer}</p>
                                                <p className="text-xs text-gray-400 mt-2">— {feedback.evaluator}</p>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Overall Team Performance Overview */}
                          {!selectedStaffForAnalysis && (
                            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                              <div className="p-4 border-b bg-gray-50">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                  <PieChart className="h-5 w-5 text-purple-600" />
                                  Team Performance Overview
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">Quick comparison of all evaluated staff</p>
                              </div>
                              <div className="p-4">
                                <div className="space-y-3">
                                  {teamPerformanceData.staff_reports.map((staff: any) => {
                                    const analysis = analyzeStaffPerformance(staff);
                                    const percentage = (analysis.overallAverage / 5) * 100;
                                    return (
                                      <div 
                                        key={staff.staff_id} 
                                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                                        onClick={() => setSelectedStaffForAnalysis(staff.staff_id)}
                                      >
                                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                          <Users className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-gray-900 truncate">{staff.staff_name}</p>
                                          <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                                            <div 
                                              className={`h-2 rounded-full transition-all duration-500 ${
                                                analysis.overallAverage >= 4 ? 'bg-green-500' :
                                                analysis.overallAverage >= 3 ? 'bg-blue-500' :
                                                analysis.overallAverage >= 2 ? 'bg-yellow-500' : 'bg-orange-500'
                                              }`}
                                              style={{ width: `${percentage}%` }}
                                            />
                                          </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                          <p className="text-lg font-bold text-gray-900">{analysis.overallAverage}</p>
                                          <p className="text-xs text-gray-500">{analysis.totalEvaluations} eval(s)</p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-400" />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Admin Reports View */}
              {user?.role !== 'evaluation-staff' && user?.role !== 'evaluation_staff' && user?.role !== 'program-moderator' && user?.role !== 'program-manager' && (
                <>
              {/* Summary Cards */}
              {reportSummary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Total Triggered</p>
                        <p className="text-3xl font-bold text-blue-900 mt-2">{reportSummary.total_triggered}</p>
                      </div>
                      <div className="bg-blue-200 rounded-full p-3">
                        <Send className="h-6 w-6 text-blue-700" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">Completed</p>
                        <p className="text-3xl font-bold text-green-900 mt-2">{reportSummary.completed}</p>
                      </div>
                      <div className="bg-green-200 rounded-full p-3">
                        <CheckCircle className="h-6 w-6 text-green-700" />
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-green-600">{reportSummary.completion_rate}% completion rate</p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-600 font-medium">Staff Evaluated</p>
                        <p className="text-3xl font-bold text-orange-900 mt-2">{reportSummary.total_subordinates_evaluated}</p>
                      </div>
                      <div className="bg-orange-200 rounded-full p-3">
                        <Users className="h-6 w-6 text-orange-700" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600 font-medium">Unique Evaluators</p>
                        <p className="text-3xl font-bold text-purple-900 mt-2">{reportSummary.unique_evaluators}</p>
                      </div>
                      <div className="bg-purple-200 rounded-full p-3">
                        <UserCheck className="h-6 w-6 text-purple-700" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters & Export */}
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <span className="font-medium text-gray-700">Filters:</span>
                  </div>
                  
                  <select
                    value={reportFilters.department_id}
                    onChange={(e) => setReportFilters({ ...reportFilters, department_id: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                  
                  <select
                    value={reportFilters.evaluator_id}
                    onChange={(e) => setReportFilters({ ...reportFilters, evaluator_id: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Evaluators</option>
                    {evaluatorReports.map((ev) => (
                      <option key={ev.evaluator_id} value={ev.evaluator_id}>{ev.evaluator_name}</option>
                    ))}
                  </select>
                  
                  <select
                    value={reportFilters.template_id}
                    onChange={(e) => setReportFilters({ ...reportFilters, template_id: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Forms</option>
                    {evaluationTemplates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={reportFilters.date_from}
                    onChange={(e) => setReportFilters({ ...reportFilters, date_from: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="From"
                  />
                  
                  <input
                    type="date"
                    value={reportFilters.date_to}
                    onChange={(e) => setReportFilters({ ...reportFilters, date_to: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="To"
                  />

                  <button
                    onClick={() => setReportFilters({
                      department_id: '',
                      evaluator_id: '',
                      template_id: '',
                      staff_id: '',
                      date_from: '',
                      date_to: ''
                    })}
                    className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Clear
                  </button>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => handleExportReport('csv')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setReportViewMode('staff')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    reportViewMode === 'staff'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Users className="h-4 w-4 inline mr-2" />
                  Staff-wise Report
                </button>
                <button
                  onClick={() => setReportViewMode('evaluator')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    reportViewMode === 'evaluator'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <UserCheck className="h-4 w-4 inline mr-2" />
                  Evaluator-wise Report
                </button>
                <button
                  onClick={() => setReportViewMode('analysis')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    reportViewMode === 'analysis'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <BarChart3 className="h-4 w-4 inline mr-2" />
                  Performance Analysis
                </button>
              </div>

              {/* Staff-wise Report */}
              {reportViewMode === 'staff' && (
                <div className="bg-white rounded-xl shadow-sm border">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold text-gray-900">Staff Evaluation Reports</h3>
                    <p className="text-sm text-gray-500">All evaluations received by each staff member from their managers</p>
                  </div>
                  <div className="p-4">
                    {reportLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      </div>
                    ) : staffReports.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No completed evaluations found</p>
                        <p className="text-sm">Evaluations will appear here once managers submit their reviews</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {staffReports.map((staffReport) => {
                          const analysis = analyzeStaffPerformance(staffReport);
                          return (
                            <div key={staffReport.staff_id} className="border rounded-lg overflow-hidden">
                              <button
                                onClick={() => {
                                  if (expandedStaff.includes(staffReport.staff_id)) {
                                    setExpandedStaff(expandedStaff.filter(id => id !== staffReport.staff_id));
                                  } else {
                                    setExpandedStaff([...expandedStaff, staffReport.staff_id]);
                                  }
                                }}
                                className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition"
                              >
                                <div className="flex items-center gap-4 flex-1 text-left">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-gray-900">{staffReport.staff_name}</p>
                                      {staffReport.role_name && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                          {staffReport.role_name}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                      <span>{staffReport.staff_email}</span>
                                      {staffReport.employee_id && (
                                        <>
                                          <span className="text-gray-300">•</span>
                                          <span>ID: {staffReport.employee_id}</span>
                                        </>
                                      )}
                                      {staffReport.department && (
                                        <>
                                          <span className="text-gray-300">•</span>
                                          <span>{staffReport.department}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-6">
                                    <div className="text-center">
                                      <p className="text-2xl font-bold text-blue-600">{staffReport.evaluations.length}</p>
                                      <p className="text-xs text-gray-500">Evaluations</p>
                                    </div>
                                    <div className="text-center">
                                      <div className="flex items-center gap-1">
                                        <Star className="h-5 w-5 text-amber-500" />
                                        <p className="text-2xl font-bold text-gray-900">{analysis.overallAverage}</p>
                                      </div>
                                      <p className="text-xs text-gray-500">Avg Score</p>
                                    </div>
                                  </div>
                                </div>
                                {expandedStaff.includes(staffReport.staff_id) ? (
                                  <ChevronUp className="h-5 w-5 text-gray-400" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-gray-400" />
                                )}
                              </button>
                              
                              {expandedStaff.includes(staffReport.staff_id) && (
                                <div className="border-t bg-white p-4 space-y-6">
                                  {/* Radar Chart - Skills Overview */}
                                  {analysis.allScores.length > 0 && (
                                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
                                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-purple-600" />
                                        Skills Performance Overview
                                      </h4>
                                      <div className="bg-white rounded-lg p-4">
                                        <ResponsiveContainer width="100%" height={300}>
                                          <RadarChart data={analysis.allScores.slice(0, 8).map((skill: any) => ({
                                            skill: skill.question.length > 25 ? skill.question.substring(0, 25) + '...' : skill.question,
                                            score: parseFloat(skill.score.toFixed(1)),
                                            fullMark: 5
                                          }))}>
                                            <PolarGrid stroke="#e5e7eb" />
                                            <PolarAngleAxis dataKey="skill" tick={{ fill: '#6b7280', fontSize: 12 }} />
                                            <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: '#6b7280' }} />
                                            <Radar name="Performance" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                                            <Tooltip 
                                              contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                              formatter={(value: any) => [`${value}/5`, 'Score']}
                                            />
                                          </RadarChart>
                                        </ResponsiveContainer>
                                      </div>
                                    </div>
                                  )}

                                  {/* Bar Chart - Detailed Ratings */}
                                  {analysis.allScores.length > 0 && (
                                    <div className="bg-white rounded-xl border">
                                      <div className="p-4 border-b bg-blue-50">
                                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                          <BarChart3 className="h-5 w-5 text-blue-600" />
                                          Detailed Skill Ratings
                                        </h4>
                                        <p className="text-sm text-gray-600 mt-1">Individual competency scores with visual breakdown</p>
                                      </div>
                                      <div className="p-4">
                                        <ResponsiveContainer width="100%" height={Math.max(300, analysis.allScores.length * 40)}>
                                          <BarChart 
                                            data={analysis.allScores.map((skill: any) => ({
                                              name: skill.question.length > 30 ? skill.question.substring(0, 30) + '...' : skill.question,
                                              score: parseFloat(skill.score.toFixed(1)),
                                              fullName: skill.question
                                            }))}
                                            layout="vertical"
                                            margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                                          >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis type="number" domain={[0, 5]} tick={{ fill: '#6b7280' }} />
                                            <YAxis type="category" dataKey="name" tick={{ fill: '#374151', fontSize: 12 }} width={140} />
                                            <Tooltip 
                                              contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                              formatter={(value: any, name: any, props: any) => [`${value}/5.0`, props.payload.fullName]}
                                            />
                                            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                                              {analysis.allScores.map((skill: any, index: number) => {
                                                const score = skill.score;
                                                let color = '#ef4444'; // red for low scores
                                                if (score >= 4) color = '#22c55e'; // green for high scores
                                                else if (score >= 3) color = '#3b82f6'; // blue for medium scores
                                                else if (score >= 2) color = '#f59e0b'; // amber for below average
                                                return <Cell key={`cell-${index}`} fill={color} />;
                                              })}
                                            </Bar>
                                          </BarChart>
                                        </ResponsiveContainer>
                                      </div>
                                      {/* Legend */}
                                      <div className="px-4 pb-4 flex items-center justify-center gap-6 text-sm">
                                        <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 rounded bg-green-500"></div>
                                          <span className="text-gray-600">Excellent (4.0-5.0)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 rounded bg-blue-500"></div>
                                          <span className="text-gray-600">Good (3.0-3.9)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 rounded bg-amber-500"></div>
                                          <span className="text-gray-600">Average (2.0-2.9)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 rounded bg-red-500"></div>
                                          <span className="text-gray-600">Needs Improvement (&lt;2.0)</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Strengths & Improvements */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Strengths */}
                                    {analysis.strengths.length > 0 && (
                                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                        <h5 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                                          <Award className="h-4 w-4" />
                                          Top Strengths
                                        </h5>
                                        <ul className="space-y-2">
                                          {analysis.strengths.slice(0, 3).map((item: any, idx: number) => (
                                            <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
                                              <span className="text-green-500 mt-0.5">✓</span>
                                              <span>{item.question} ({item.score.toFixed(1)}/5)</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Improvements */}
                                    {analysis.improvements.length > 0 && (
                                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                                        <h5 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                                          <Target className="h-4 w-4" />
                                          Areas to Improve
                                        </h5>
                                        <ul className="space-y-2">
                                          {analysis.improvements.slice(0, 3).map((item: any, idx: number) => (
                                            <li key={idx} className="text-sm text-orange-700 flex items-start gap-2">
                                              <span className="text-orange-500 mt-0.5">•</span>
                                              <span>{item.question} ({item.score.toFixed(1)}/5)</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>

                                  {/* Text Feedback */}
                                  {analysis.textFeedback.length > 0 && (
                                    <div>
                                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5 text-blue-600" />
                                        Qualitative Feedback
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {analysis.textFeedback.map((feedback: any, idx: number) => (
                                          <div key={idx} className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                            <p className="text-xs text-blue-600 font-medium mb-1">{feedback.question}</p>
                                            <p className="text-gray-800 text-sm">{feedback.answer}</p>
                                            <p className="text-xs text-gray-500 mt-2">— {feedback.evaluator}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Evaluator-wise Report */}
              {reportViewMode === 'evaluator' && (
                <div className="space-y-4">
                  {evaluatorReports.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                      <UserCheck className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 text-lg">No evaluator data available</p>
                      <p className="text-sm text-gray-400 mt-2">Evaluations will appear here once evaluators are assigned</p>
                    </div>
                  ) : (
                    evaluatorReports.map((evaluator) => {
                      // Calculate evaluator performance metrics
                      const completionRate = evaluator.total_evaluations > 0 
                        ? Math.round((evaluator.completed_evaluations / evaluator.total_evaluations) * 100) 
                        : 0;
                      const pendingRate = 100 - completionRate;
                      
                      return (
                        <div key={evaluator.evaluator_id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                          {/* Evaluator Header */}
                          <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                  {evaluator.evaluator_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                <div>
                                  <h3 className="font-bold text-gray-900 text-lg">{evaluator.evaluator_name}</h3>
                                  <p className="text-sm text-gray-600">{evaluator.evaluator_email}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    {evaluator.role && (
                                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
                                        {evaluator.role}
                                      </span>
                                    )}
                                    {evaluator.department && (
                                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                                        {evaluator.department}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-4xl font-bold text-indigo-600">{completionRate}%</div>
                                <div className="text-sm text-gray-500 font-medium">Completion Rate</div>
                              </div>
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                              {/* Total Evaluations */}
                              <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-lg p-4 border border-blue-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm text-blue-600 font-medium">Total Assigned</p>
                                    <p className="text-3xl font-bold text-blue-800 mt-1">
                                      {evaluator.total_evaluations}
                                    </p>
                                  </div>
                                  <div className="bg-white/70 rounded-lg p-2">
                                    <ClipboardList className="h-6 w-6 text-blue-500" />
                                  </div>
                                </div>
                              </div>

                              {/* Completed */}
                              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-4 border border-green-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm text-green-600 font-medium">Completed</p>
                                    <p className="text-3xl font-bold text-green-800 mt-1">
                                      {evaluator.completed_evaluations}
                                    </p>
                                  </div>
                                  <div className="bg-white/70 rounded-lg p-2">
                                    <CheckCircle className="h-6 w-6 text-green-500" />
                                  </div>
                                </div>
                              </div>

                              {/* Pending */}
                              <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-lg p-4 border border-yellow-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm text-yellow-600 font-medium">Pending</p>
                                    <p className="text-3xl font-bold text-yellow-800 mt-1">
                                      {evaluator.pending_evaluations}
                                    </p>
                                  </div>
                                  <div className="bg-white/70 rounded-lg p-2">
                                    <Clock className="h-6 w-6 text-yellow-500" />
                                  </div>
                                </div>
                              </div>

                              {/* Staff Evaluated */}
                              <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-lg p-4 border border-purple-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm text-purple-600 font-medium">Staff Evaluated</p>
                                    <p className="text-3xl font-bold text-purple-800 mt-1">
                                      {evaluator.total_subordinates_evaluated || 0}
                                    </p>
                                  </div>
                                  <div className="bg-white/70 rounded-lg p-2">
                                    <Users className="h-6 w-6 text-purple-500" />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Progress Visualization */}
                            <div className="space-y-4">
                              {/* Completion Progress Bar */}
                              <div className="bg-gray-50 rounded-lg p-4 border">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                                    Evaluation Progress
                                  </h4>
                                  <span className="text-sm text-gray-500">
                                    {evaluator.completed_evaluations} of {evaluator.total_evaluations} completed
                                  </span>
                                </div>
                                <div className="space-y-3">
                                  {/* Completed Progress */}
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-green-700 flex items-center gap-1">
                                        <CheckCircle className="h-4 w-4" />
                                        Completed Evaluations
                                      </span>
                                      <span className="text-sm font-bold text-green-700">{completionRate}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                      <div 
                                        className="bg-gradient-to-r from-green-400 to-emerald-500 h-4 rounded-full transition-all duration-700"
                                        style={{ width: `${completionRate}%` }}
                                      />
                                    </div>
                                  </div>
                                  
                                  {/* Pending Progress */}
                                  {evaluator.pending_evaluations > 0 && (
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-yellow-700 flex items-center gap-1">
                                          <Clock className="h-4 w-4" />
                                          Pending Evaluations
                                        </span>
                                        <span className="text-sm font-bold text-yellow-700">{pendingRate}%</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                        <div 
                                          className="bg-gradient-to-r from-yellow-400 to-amber-500 h-4 rounded-full transition-all duration-700"
                                          style={{ width: `${pendingRate}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Performance Indicator */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Completion Status Badge */}
                                <div className={`rounded-lg p-4 border ${
                                  completionRate === 100 
                                    ? 'bg-green-50 border-green-200' 
                                    : completionRate >= 50 
                                    ? 'bg-blue-50 border-blue-200' 
                                    : 'bg-orange-50 border-orange-200'
                                }`}>
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                      completionRate === 100 
                                        ? 'bg-green-500' 
                                        : completionRate >= 50 
                                        ? 'bg-blue-500' 
                                        : 'bg-orange-500'
                                    }`}>
                                      {completionRate === 100 ? (
                                        <Award className="h-5 w-5 text-white" />
                                      ) : (
                                        <TrendingUp className="h-5 w-5 text-white" />
                                      )}
                                    </div>
                                    <div>
                                      <p className={`text-sm font-medium ${
                                        completionRate === 100 
                                          ? 'text-green-700' 
                                          : completionRate >= 50 
                                          ? 'text-blue-700' 
                                          : 'text-orange-700'
                                      }`}>
                                        {completionRate === 100 
                                          ? 'All Evaluations Complete!' 
                                          : completionRate >= 50 
                                          ? 'Good Progress' 
                                          : 'Needs Attention'}
                                      </p>
                                      <p className={`text-xs ${
                                        completionRate === 100 
                                          ? 'text-green-600' 
                                          : completionRate >= 50 
                                          ? 'text-blue-600' 
                                          : 'text-orange-600'
                                      }`}>
                                        {completionRate === 100 
                                          ? 'Outstanding performance' 
                                          : completionRate >= 50 
                                          ? 'On track to complete' 
                                          : `${evaluator.pending_evaluations} pending`}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Staff Coverage */}
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                                      <Users className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-purple-700">Team Coverage</p>
                                      <p className="text-xs text-purple-600">
                                        Evaluating {evaluator.total_subordinates_evaluated || 0} team member{(evaluator.total_subordinates_evaluated || 0) !== 1 ? 's' : ''}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Performance Analysis View */}
              {reportViewMode === 'analysis' && (
                <div className="space-y-6">
                  {reportLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    </div>
                  ) : staffReports.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                      <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 text-lg">No evaluation data available for analysis</p>
                      <p className="text-sm text-gray-400 mt-2">Complete some evaluations to see performance insights</p>
                    </div>
                  ) : (
                    <>
                      {/* Staff Selection for Detailed Analysis */}
                      <div className="bg-white rounded-xl shadow-sm border p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Target className="h-5 w-5 text-purple-600" />
                            Select Staff for Detailed Analysis
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {staffReports.map((staff) => {
                            const analysis = analyzeStaffPerformance(staff);
                            return (
                              <button
                                key={staff.staff_id}
                                onClick={() => setSelectedStaffForAnalysis(
                                  selectedStaffForAnalysis === staff.staff_id ? null : staff.staff_id
                                )}
                                className={`p-3 rounded-lg border-2 transition text-left ${
                                  selectedStaffForAnalysis === staff.staff_id
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                                }`}
                              >
                                <p className="font-medium text-gray-900 truncate text-sm">{staff.staff_name}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  <span className="text-xs font-bold text-gray-700">{analysis.overallAverage}</span>
                                  <span className="text-xs text-gray-400">/ 5</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Detailed Analysis for Selected Staff */}
                      {selectedStaffForAnalysis && (() => {
                        const selectedStaff = staffReports.find(s => s.staff_id === selectedStaffForAnalysis);
                        if (!selectedStaff) return null;
                        const analysis = analyzeStaffPerformance(selectedStaff);
                        
                        return (
                          <div className="space-y-6">
                            {/* Staff Header Card */}
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                    <Users className="h-8 w-8 text-white" />
                                  </div>
                                  <div>
                                    <h2 className="text-2xl font-bold">{selectedStaff.staff_name}</h2>
                                    <p className="text-purple-200">{selectedStaff.staff_email}</p>
                                    {selectedStaff.employee_id && (
                                      <p className="text-purple-300 text-sm">ID: {selectedStaff.employee_id}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-5xl font-bold">{analysis.overallAverage}</div>
                                  <div className="text-purple-200">Overall Score</div>
                                  <div className="text-sm text-purple-300 mt-1">{analysis.totalEvaluations} evaluation(s)</div>
                                </div>
                              </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-5 border border-green-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm text-green-600 font-medium">Strengths</p>
                                    <p className="text-3xl font-bold text-green-800 mt-2">{analysis.strengths.length}</p>
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
                                    <p className="text-3xl font-bold text-orange-800 mt-2">{analysis.improvements.length}</p>
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
                                    <p className="text-3xl font-bold text-blue-800 mt-2">{analysis.allScores.length}</p>
                                  </div>
                                  <div className="bg-white/80 rounded-xl p-3">
                                    <Activity className="h-6 w-6 text-blue-500" />
                                  </div>
                                </div>
                              </div>
                              <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl p-5 border border-purple-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm text-purple-600 font-medium">Feedback Received</p>
                                    <p className="text-3xl font-bold text-purple-800 mt-2">{analysis.textFeedback.length}</p>
                                  </div>
                                  <div className="bg-white/80 rounded-xl p-3">
                                    <MessageSquare className="h-6 w-6 text-purple-500" />
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
                                  <p className="text-sm text-green-600 mt-1">Top performing competencies</p>
                                </div>
                                <div className="p-4 space-y-4">
                                  {analysis.strengths.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">No high-scoring areas yet</p>
                                  ) : (
                                    analysis.strengths.map((item, idx) => (
                                      <div key={idx} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-gray-900">{item.question}</span>
                                          <span className="text-sm font-bold text-green-600 flex items-center gap-1">
                                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                            {Math.round(item.score * 10) / 10}
                                          </span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-3">
                                          <div 
                                            className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${(item.score / 5) * 100}%` }}
                                          />
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>

                              {/* Areas of Improvement */}
                              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                <div className="p-4 bg-orange-50 border-b border-orange-100">
                                  <h3 className="font-semibold text-orange-800 flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-orange-600" />
                                    Areas for Improvement
                                  </h3>
                                  <p className="text-sm text-orange-600 mt-1">Competencies to develop</p>
                                </div>
                                <div className="p-4 space-y-4">
                                  {analysis.improvements.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">No areas needing improvement</p>
                                  ) : (
                                    analysis.improvements.map((item, idx) => (
                                      <div key={idx} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-gray-900">{item.question}</span>
                                          <span className="text-sm font-bold text-orange-600 flex items-center gap-1">
                                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                            {Math.round(item.score * 10) / 10}
                                          </span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-3">
                                          <div 
                                            className="bg-gradient-to-r from-orange-400 to-amber-500 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${(item.score / 5) * 100}%` }}
                                          />
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* All Skills Radar/Chart */}
                            {analysis.allScores.length > 0 && (
                              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                <div className="p-4 border-b bg-gray-50">
                                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-blue-600" />
                                    Competency Scores Overview
                                  </h3>
                                  <p className="text-sm text-gray-500 mt-1">All rated skills and competencies</p>
                                </div>
                                <div className="p-6">
                                  <div className="space-y-4">
                                    {analysis.allScores.map((item, idx) => {
                                      const percentage = (item.score / 5) * 100;
                                      const getColor = (score: number) => {
                                        if (score >= 4) return 'from-green-400 to-emerald-500';
                                        if (score >= 3) return 'from-blue-400 to-cyan-500';
                                        if (score >= 2) return 'from-yellow-400 to-amber-500';
                                        return 'from-orange-400 to-red-500';
                                      };
                                      return (
                                        <div key={idx} className="group">
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                              <span className="font-medium text-gray-900">{item.question}</span>
                                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                                {item.count} rating(s)
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-yellow-500 text-sm">
                                                {'★'.repeat(Math.round(item.score))}
                                                {'☆'.repeat(5 - Math.round(item.score))}
                                              </span>
                                              <span className="font-bold text-gray-700 w-12 text-right">
                                                {Math.round(item.score * 10) / 10}/5
                                              </span>
                                            </div>
                                          </div>
                                          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                                            <div 
                                              className={`bg-gradient-to-r ${getColor(item.score)} h-4 rounded-full transition-all duration-700 group-hover:opacity-80`}
                                              style={{ width: `${percentage}%` }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Qualitative Feedback */}
                            {analysis.textFeedback.length > 0 && (
                              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                <div className="p-4 border-b bg-gray-50">
                                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-purple-600" />
                                    Qualitative Feedback
                                  </h3>
                                  <p className="text-sm text-gray-500 mt-1">Written feedback from evaluators</p>
                                </div>
                                <div className="p-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {analysis.textFeedback.map((feedback, idx) => (
                                      <div key={idx} className="bg-gray-50 rounded-lg p-4 border">
                                        <div className="flex items-start gap-3">
                                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                            <MessageSquare className="h-4 w-4 text-purple-600" />
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-xs text-purple-600 font-medium mb-1">{feedback.question}</p>
                                            <p className="text-gray-800">{feedback.answer}</p>
                                            <p className="text-xs text-gray-400 mt-2">— {feedback.evaluator}</p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Overall Team Performance Overview */}
                      {!selectedStaffForAnalysis && (
                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                          <div className="p-4 border-b bg-gray-50">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              <PieChart className="h-5 w-5 text-purple-600" />
                              Team Performance Overview
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Quick comparison of all evaluated staff</p>
                          </div>
                          <div className="p-4">
                            <div className="space-y-3">
                              {staffReports.map((staff) => {
                                const analysis = analyzeStaffPerformance(staff);
                                const percentage = (analysis.overallAverage / 5) * 100;
                                return (
                                  <div 
                                    key={staff.staff_id} 
                                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                                    onClick={() => setSelectedStaffForAnalysis(staff.staff_id)}
                                  >
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <Users className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-900 truncate">{staff.staff_name}</p>
                                      <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                                        <div 
                                          className={`h-2 rounded-full transition-all duration-500 ${
                                            analysis.overallAverage >= 4 ? 'bg-green-500' :
                                            analysis.overallAverage >= 3 ? 'bg-blue-500' :
                                            analysis.overallAverage >= 2 ? 'bg-yellow-500' : 'bg-orange-500'
                                          }`}
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <p className="text-lg font-bold text-gray-900">{analysis.overallAverage}</p>
                                      <p className="text-xs text-gray-500">{analysis.totalEvaluations} eval(s)</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-400" />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Template Breakdown - For Admin/Manager only */}
              {reportSummary && reportSummary.template_breakdown.length > 0 && user?.role !== 'evaluation-staff' && user?.role !== 'evaluation_staff' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">By Form Type</h3>
                    <div className="space-y-3">
                      {reportSummary.template_breakdown.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-gray-700">{item.template_name}</span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {reportSummary.department_breakdown.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border p-4">
                      <h3 className="font-semibold text-gray-900 mb-4">By Department</h3>
                      <div className="space-y-3">
                        {reportSummary.department_breakdown.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-gray-700">{item.department || 'Unassigned'}</span>
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                              {item.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              </>
              )}
            </div>
          )}
        </div>

        {/* MODALS */}
        
        {/* Department Modal */}
        {showDeptModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{editingDept ? 'Edit Department' : 'Add Department'}</h3>
                <button onClick={() => {
                  setShowDeptModal(false);
                  setEditingDept(null);
                  setDeptForm({ name: '', code: '', description: '', program_id: '' });
                }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                {/* Program Selector - Only for super-admin */}
                {user?.role === 'super-admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Program *</label>
                    <select
                      value={deptForm.program_id}
                      onChange={(e) => setDeptForm({ ...deptForm, program_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Program</option>
                      {programs.map((prog) => (
                        <option key={prog.id} value={prog.id}>{prog.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Human Resources"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., HR"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={deptForm.description}
                    onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowDeptModal(false);
                    setEditingDept(null);
                    setDeptForm({ name: '', code: '', description: '', program_id: '' });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDepartment}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingDept ? 'Update Department' : 'Add Department')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Role Modal */}
        {showRoleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{editingRole ? 'Edit Role' : 'Add Role'}</h3>
                <button onClick={() => {
                  setShowRoleModal(false);
                  setEditingRole(null);
                  setRoleForm({ name: '', code: '', description: '', department_id: '' });
                }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                  <select
                    value={roleForm.department_id}
                    onChange={(e) => setRoleForm({ ...roleForm, department_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Manager"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setEditingRole(null);
                    setRoleForm({ name: '', code: '', description: '', department_id: '' });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRole}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingRole ? 'Update Role' : 'Add Role')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Staff Modal */}
        {showStaffModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl w-full max-w-md my-8 shadow-2xl">
              <div className="sticky top-0 bg-white rounded-t-xl px-6 pt-6 pb-4 border-b z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{editingStaff ? 'Edit Staff' : 'Add Staff'}</h3>
                  <button onClick={() => {
                    setShowStaffModal(false);
                    setEditingStaff(null);
                    setStaffForm({ name: '', email: '', employee_id: '', role_id: '', create_account: false, is_new_joinee: false, joining_date: '', new_joinee_days: 30, reporting_manager_id: '' });
                  }} className="text-gray-400 hover:text-gray-600 transition">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 max-h-[calc(90vh-180px)] overflow-y-auto">
                <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    value={staffForm.role_id}
                    onChange={(e) => setStaffForm({ ...staffForm, role_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select Role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>{role.name} - {role.category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={staffForm.employee_id}
                    onChange={(e) => setStaffForm({ ...staffForm, employee_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional"
                  />
                </div>
                
                {/* Reporting Manager - Always visible, required only for new joinee */}
                {!editingStaff && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reporting Manager (Evaluator) {staffForm.is_new_joinee && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={staffForm.reporting_manager_id}
                      onChange={(e) => setStaffForm({ ...staffForm, reporting_manager_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required={staffForm.is_new_joinee}
                    >
                      <option value="">Select Manager (Optional)</option>
                      {staff
                        .filter(s => s.role_id !== staffForm.role_id) // Different role
                        .map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name} - {manager.role_name || 'No Role'}
                          </option>
                        ))}
                    </select>
                    {staffForm.is_new_joinee && (
                      <p className="text-xs text-blue-600 mt-1">
                        Required: Select the manager who will evaluate this new joinee
                      </p>
                    )}
                  </div>
                )}
                
                {/* Create Account Option - Only show when adding new staff */}
                {!editingStaff && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={staffForm.create_account}
                        onChange={(e) => setStaffForm({ ...staffForm, create_account: e.target.checked })}
                        className="w-5 h-5 text-purple-600 rounded mt-0.5"
                      />
                      <div>
                        <span className="font-medium text-purple-900">Create Login Account</span>
                        <p className="text-xs text-purple-600 mt-1">
                          Send welcome email with login credentials. Staff can view their performance reports.
                        </p>
                      </div>
                    </label>
                  </div>
                )}
                
                {/* New Joinee Option - Only show when adding new staff */}
                {!editingStaff && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={staffForm.is_new_joinee}
                        onChange={(e) => setStaffForm({ ...staffForm, is_new_joinee: e.target.checked })}
                        className="w-5 h-5 text-green-600 rounded mt-0.5"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-green-900">New Joinee</span>
                        <p className="text-xs text-green-600 mt-1">
                          Auto-schedule "Trainee Evaluation - NJ" to be sent to their manager after X days.
                        </p>
                      </div>
                    </label>
                    
                    {staffForm.is_new_joinee && (
                      <div className="mt-3 space-y-3 pl-8">
                        <div>
                          <label className="block text-sm font-medium text-green-900 mb-1">Joining Date *</label>
                          <input
                            type="date"
                            value={staffForm.joining_date}
                            onChange={(e) => setStaffForm({ ...staffForm, joining_date: e.target.value })}
                            className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            required={staffForm.is_new_joinee}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-green-900 mb-1">
                            Evaluation After (Days)
                          </label>
                          <input
                            type="number"
                            value={staffForm.new_joinee_days}
                            onChange={(e) => setStaffForm({ ...staffForm, new_joinee_days: parseInt(e.target.value) || 30 })}
                            min="1"
                            max="365"
                            className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                          <p className="text-xs text-green-600 mt-1">
                            Manager will receive evaluation {staffForm.new_joinee_days} days after joining date
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-green-900 mb-1">Timezone</label>
                          <select
                            value={staffForm.scheduled_timezone}
                            onChange={(e) => setStaffForm({ ...staffForm, scheduled_timezone: e.target.value })}
                            className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          >
                            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                            <option value="America/New_York">America/New_York (EST)</option>
                            <option value="America/Chicago">America/Chicago (CST)</option>
                            <option value="America/Denver">America/Denver (MST)</option>
                            <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                            <option value="Europe/London">Europe/London (GMT)</option>
                            <option value="Europe/Paris">Europe/Paris (CET)</option>
                            <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                            <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                            <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                            <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
                            <option value="UTC">UTC</option>
                          </select>
                          <p className="text-xs text-green-600 mt-1">
                            Evaluation will be scheduled in this timezone
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>
              <div className="sticky bottom-0 bg-white rounded-b-xl px-6 py-4 border-t">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowStaffModal(false);
                      setEditingStaff(null);
                      setStaffForm({ name: '', email: '', employee_id: '', role_id: '', create_account: false, is_new_joinee: false, joining_date: '', new_joinee_days: 30, reporting_manager_id: '', scheduled_timezone: 'Asia/Kolkata' });
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddStaff}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                  >
                    {loading ? 'Saving...' : (editingStaff ? 'Update Staff' : 'Add Staff')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mapping Modal */}
        {showMappingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{editingMappingId ? 'Edit Mapping' : 'Create Mapping'}</h3>
                <button onClick={() => { setShowMappingModal(false); setEditingMappingId(null); setMappingEvaluator(''); setMappingSubordinates([]); }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Evaluator (Manager)</label>
                  <select
                    value={mappingEvaluator}
                    onChange={(e) => setMappingEvaluator(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select evaluator...</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.department} - {roles.find(r => r.id === s.role_id)?.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subordinates (Select multiple)</label>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {staff
                      .filter(s => {
                        if (s.id === mappingEvaluator) return false;
                        if (!mappingEvaluator) return true;
                        const selectedEvaluator = staff.find(st => st.id === mappingEvaluator);
                        if (!selectedEvaluator) return false;
                        const evaluatorRole = roles.find(r => r.id === selectedEvaluator.role_id);
                        const subordinateRole = roles.find(r => r.id === s.role_id);
                        return evaluatorRole && subordinateRole && subordinateRole.category === evaluatorRole.category;
                      })
                      .map((s) => (
                        <label
                          key={s.id}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={mappingSubordinates.includes(s.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setMappingSubordinates([...mappingSubordinates, s.id]);
                              } else {
                                setMappingSubordinates(mappingSubordinates.filter(id => id !== s.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{s.name}</p>
                            <p className="text-xs text-gray-500">{s.department} - {roles.find(r => r.id === s.role_id)?.name}</p>
                          </div>
                        </label>
                      ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowMappingModal(false);
                    setMappingEvaluator('');
                    setMappingSubordinates([]);
                    setEditingMappingId(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMapping}
                  disabled={loading || !mappingEvaluator || mappingSubordinates.length === 0}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingMappingId ? 'Update Mapping' : 'Create Mapping')}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      )}



      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: null, id: '', name: '' })}
        onConfirm={async () => {
          if (deleteModal.type === 'department') {
            await handleDeleteDepartment();
          } else if (deleteModal.type === 'role') {
            await handleDeleteRole();
          } else if (deleteModal.type === 'staff') {
            await handleDeleteStaff();
          } else if (deleteModal.type === 'triggered') {
            await confirmDeleteTriggered();
          } else if (deleteModal.type === 'mapping') {
            await confirmDeleteMapping();
          }
          setDeleteModal({ isOpen: false, type: null, id: '', name: '' });
        }}
        title={`Delete ${deleteModal.type === 'mapping' ? 'Hierarchy Mapping' : deleteModal.type ? deleteModal.type.charAt(0).toUpperCase() + deleteModal.type.slice(1) : ''}`}
        itemName={deleteModal.name}
        itemType={deleteModal.type === 'mapping' ? 'hierarchy mapping' : deleteModal.type || 'item'}
        message={deleteModal.type === 'mapping' 
          ? `This will remove all subordinate relationships for this evaluator. This action cannot be undone.`
          : `Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`}
      />

      {/* Trigger Evaluation Modal with Email Preview */}
      {showTriggerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Review & Send Evaluation</h2>
                    <p className="text-sm text-gray-500">Preview email and set evaluation period</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTriggerModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Evaluation Period */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Evaluation Period</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date (Deadline)
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule Option */}
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Schedule Send (Optional)
                </h3>
                <p className="text-sm text-gray-600 mb-3">Leave empty to send immediately</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time Zone
                    </label>
                    <select
                      value={scheduledTimezone}
                      onChange={(e) => setScheduledTimezone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white"
                    >
                      {timezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {scheduledDate && (
                  <p className="text-xs text-yellow-700 mt-2">
                    Evaluation will be sent at {scheduledDate.replace('T', ' ')} ({scheduledTimezone})
                  </p>
                )}
              </div>

              {/* Email Preview */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Email Content</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Body
                  </label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs font-medium text-blue-800 mb-2">Available Placeholders:</p>
                    <div className="flex flex-wrap gap-2">
                      <code className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{'{evaluator_name}'}</code>
                      <code className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{'{start_date}'}</code>
                      <code className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{'{end_date}'}</code>
                      <code className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{'{subordinates_list}'}</code>
                    </div>
                  </div>
                </div>

                {/* Email Preview Box */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                    <p className="text-xs font-medium text-gray-600">Email Preview</p>
                  </div>
                  <div className="p-4 bg-white">
                    <div className="text-sm text-gray-700 whitespace-pre-wrap mb-4">
                      {emailBody.replace('{evaluator_name}', 'John Doe')
                        .replace('{start_date}', startDate || 'Start Date')
                        .replace('{end_date}', endDate || 'End Date')
                        .replace('{subordinates_list}', '- Team Member 1\n- Team Member 2')}
                    </div>
                    <div className="text-center">
                      <span className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg shadow-md">
                        Start Evaluation →
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 text-center mt-3">
                      Button will link to the evaluation form
                    </p>
                  </div>
                </div>
              </div>

              {/* Recipients Summary */}
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Recipients</h3>
                <p className="text-sm text-gray-600">
                  {selectedEvaluators.length} evaluator(s) selected
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {mappings
                    .filter(m => selectedEvaluators.includes(m.evaluator_id))
                    .map(m => (
                      <span key={m.evaluator_id} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        {m.evaluator_name} ({m.subordinates.length} subordinates)
                      </span>
                    ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowTriggerModal(false)}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmTrigger}
                  disabled={triggering || !emailSubject || !emailBody}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {triggering ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {scheduledDate ? 'Schedule' : 'Send Now'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Triggered Modal */}
      {showEditTriggeredModal && editingTriggered && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Edit2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Edit Triggered Evaluation</h2>
                    <p className="text-sm text-gray-500">{editingTriggered.evaluator_name} • {editingTriggered.template_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditTriggeredModal(false);
                    setEditingTriggered(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Evaluation Period */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Evaluation Period</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Email Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Email subject..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Body
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Email message..."
                />
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs font-medium text-blue-800 mb-2">Available Placeholders:</p>
                  <div className="flex flex-wrap gap-2">
                    <code className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{'{evaluator_name}'}</code>
                    <code className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{'{start_date}'}</code>
                    <code className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{'{end_date}'}</code>
                    <code className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{'{subordinates_list}'}</code>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Note: "Start Evaluation" button is automatically added to the email
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowEditTriggeredModal(false);
                    setEditingTriggered(null);
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTriggered}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onSuccess={() => {
          setBulkImportOpen(false);
          // Refresh data after successful import
          if (activeTab === 'setup') {
            const programIdForRefresh = user?.role === 'super-admin' && selectedProgramFilter !== 'all' 
              ? selectedProgramFilter 
              : programId;
            fetchDepartments(programIdForRefresh);
            fetchRoles(programIdForRefresh);
            fetchStaff(programIdForRefresh);
          }
        }}
      />
    </AppLayout>
  );
}

export default function EvaluationNewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading evaluation...</p>
        </div>
      </div>
    }>
      <EvaluationNewPageContent />
    </Suspense>
  );
}
