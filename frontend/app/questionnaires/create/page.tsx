"use client";

import React, { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import IsolatedTextInput from "@/components/IsolatedTextInput";
import EnhancedConditionalLogicEditor from "@/components/EnhancedConditionalLogicEditor";
import ImportPreviewModal from "@/components/ImportPreviewModal";
import S3ImageUpload from "@/components/S3ImageUpload";
import BulkImageUpload from "@/components/BulkImageUpload";
import { ValueDisplayModeConfig } from "@/components/ValueDisplayModeConfig";
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Trash2,
  Copy,
  Eye,
  Save,
  Settings,
  ChevronDown,
  ChevronUp,
  X,
  XCircle,
  CheckSquare,
  List,
  Type,
  Sliders,
  Star,
  LayoutGrid,
  GitBranch,
  FileText,
  Globe,
  FileSpreadsheet,
  Download,
  Upload,
  Gauge,
  ThumbsUp,
  TrendingUp,
  Smile,
  Heart,
  Image as ImageIcon,
  MoveVertical,
} from "lucide-react";
import {
  SliderScale,
  DialGauge,
  LikertVisual,
  NPSScale,
  StarRating,
  DEFAULT_SETTINGS,
} from "@/components/questions";
import { questionnairesApi, programsApi, type Program } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { ConditionalLogic, QuestionWithLogic } from "@/types/conditionalLogic";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function QuestionnaireBuilderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectionMode = searchParams.get('mode') === 'select-for-evaluation';
  const [questionnaireName, setQuestionnaireName] = useState("");
  const [questionnaireCode, setQuestionnaireCode] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showConditionalLogic, setShowConditionalLogic] = useState(false);
  const [showMultilingualEditor, setShowMultilingualEditor] = useState(false);

  // Preserve scroll position across state updates that rebuild the DOM
  // Uses double requestAnimationFrame to ensure DOM has fully updated
  const withPreservedScroll = useCallback((fn: () => void) => {
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    fn();
    // Use double RAF to ensure DOM has fully updated after React render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      });
    });
  }, []);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [selectedQuestionForTranslation, setSelectedQuestionForTranslation] = useState<any>(null);
  const [translationData, setTranslationData] = useState<any>({});
  const [expandedSections, setExpandedSections] = useState<number[]>([1]);
  const [activeLanguage, setActiveLanguage] = useState("EN");
  const [enabledLanguages, setEnabledLanguages] = useState(["EN"]);
  const [viewMode, setViewMode] = useState<"tabs" | "side-by-side">("tabs");
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [questionnaireType, setQuestionnaireType] = useState("Survey");
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [showProgressBar, setShowProgressBar] = useState(true);
  const [allowSaveAndContinue, setAllowSaveAndContinue] = useState(true);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Display settings for participant view
  const [showHeaderInParticipantView, setShowHeaderInParticipantView] = useState(true);
  const [customHeaderText, setCustomHeaderText] = useState('');
  const [showSectionHeader, setShowSectionHeader] = useState(true);
  const [sectionHeaderFormat, setSectionHeaderFormat] = useState<'numbered' | 'titleOnly'>('numbered');

  useEffect(() => {
    setMounted(true);
  }, []);

  const availableLanguages = [
    { code: "EN", name: "English" },
    { code: "ES", name: "Spanish (Español)" },
    { code: "FR", name: "French (Français)" },
    { code: "DE", name: "German (Deutsch)" },
    { code: "IT", name: "Italian (Italiano)" },
    { code: "PT", name: "Portuguese (Português)" },
    { code: "ZH", name: "Chinese (中文)" },
    { code: "JA", name: "Japanese (日本語)" },
    { code: "KO", name: "Korean (한국어)" },
    { code: "AR", name: "Arabic (العربية)" },
    { code: "RU", name: "Russian (Русский)" },
    { code: "HI", name: "Hindi (हिन्दी)" },
    { code: "BN", name: "Bengali (বাংলা)" },
    { code: "TA", name: "Tamil (தமிழ்)" },
    { code: "TE", name: "Telugu (తెలుగు)" },
    { code: "MR", name: "Marathi (मराठी)" },
    { code: "GU", name: "Gujarati (ગુજરાતી)" },
    { code: "KN", name: "Kannada (ಕನ್ನಡ)" },
    { code: "ML", name: "Malayalam (മലയാളം)" },
    { code: "PA", name: "Punjabi (ਪੰਜਾਬੀ)" },
    { code: "UR", name: "Urdu (اردو)" },
    { code: "NL", name: "Dutch (Nederlands)" },
    { code: "SV", name: "Swedish (Svenska)" },
    { code: "NO", name: "Norwegian (Norsk)" },
    { code: "DA", name: "Danish (Dansk)" },
    { code: "FI", name: "Finnish (Suomi)" },
    { code: "PL", name: "Polish (Polski)" },
    { code: "TR", name: "Turkish (Türkçe)" },
    { code: "VI", name: "Vietnamese (Tiếng Việt)" },
    { code: "TH", name: "Thai (ไทย)" },
    { code: "ID", name: "Indonesian (Bahasa Indonesia)" },
    { code: "MS", name: "Malay (Bahasa Melayu)" },
    { code: "HE", name: "Hebrew (עברית)" },
    { code: "EL", name: "Greek (Ελληνικά)" },
    { code: "CS", name: "Czech (Čeština)" },
    { code: "HU", name: "Hungarian (Magyar)" },
    { code: "RO", name: "Romanian (Română)" },
    { code: "UK", name: "Ukrainian (Українська)" },
    { code: "FA", name: "Persian (فارسی)" },
    { code: "SW", name: "Swahili (Kiswahili)" },
  ];

  // Helper function to get language name from code
  const getLanguageName = (code: string) => {
    const lang = availableLanguages.find(l => l.code === code);
    return lang ? lang.name : code;
  };

  React.useEffect(() => {
    loadPrograms();
  }, []);

  async function loadPrograms() {
    try {
      setLoadingPrograms(true);
      const data = await programsApi.getAll();
      setPrograms(data.filter((p: Program) => p.status === 'active'));
    } catch (err) {
      console.error('Failed to load programs:', err);
    } finally {
      setLoadingPrograms(false);
    }
  }

  // Auto-generate code from questionnaire name
  React.useEffect(() => {
    if (questionnaireName.trim()) {
      const code = questionnaireName
        .toUpperCase()
        .replace(/\s+/g, "-")
        .substring(0, 20);
      const timestamp = Date.now().toString().slice(-4);
      setQuestionnaireCode(`${code}-${timestamp}`);
    } else {
      setQuestionnaireCode("");
    }
  }, [questionnaireName]);

  const [sections, setSections] = useState<any[]>([{
    id: 1,
    title: "Section 1",
    description: "",
    questions: [],
  }]);

  const questionTypes = [
    { id: "mcq", label: "Multiple Choice", icon: CheckSquare, color: "text-blue-600" },
    { id: "multi", label: "Multi-Select", icon: List, color: "text-qsights-cyan" },
    { id: "text", label: "Text Input", icon: Type, color: "text-green-600" },
    { id: "slider", label: "Slider", icon: Sliders, color: "text-orange-600" },
    { id: "rating", label: "Rating", icon: Star, color: "text-yellow-600" },
    { id: "matrix", label: "Matrix", icon: LayoutGrid, color: "text-pink-600" },
    { id: "information", label: "Information Block", icon: FileText, color: "text-teal-600" },
    { id: "slider_scale", label: "Slider Scale", icon: TrendingUp, color: "text-qsights-cyan" },
    { id: "dial_gauge", label: "Dial Gauge", icon: Gauge, color: "text-red-600" },
    { id: "likert_visual", label: "Likert Visual", icon: Smile, color: "text-amber-600" },
    { id: "nps", label: "NPS Scale", icon: ThumbsUp, color: "text-cyan-600" },
    { id: "star_rating", label: "Star Rating", icon: Heart, color: "text-rose-600" },
    { id: "drag_and_drop", label: "Drag & Drop Bucket", icon: MoveVertical, color: "text-purple-600" },
  ];

  // Feedback-specific predefined question templates
  const feedbackTemplates = [
    {
      id: "fb_customer_satisfaction",
      label: "Customer Satisfaction",
      icon: Smile,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Standard CSAT survey questions",
      questions: [
        { question: "How satisfied are you with our service?", type: "rating", scale: 5, required: true, description: "1 = Very Dissatisfied, 5 = Very Satisfied" },
        { question: "How likely are you to recommend us to others?", type: "rating", scale: 10, required: true, description: "Net Promoter Score (0-10)" },
        { question: "How would you rate the quality of our product/service?", type: "rating", scale: 5, required: true, description: "" },
        { question: "How responsive have we been to your questions or concerns?", type: "rating", scale: 5, required: true, description: "" },
        { question: "What did you like most about your experience?", type: "text", required: false, description: "Share positive feedback" },
        { question: "What can we improve?", type: "text", required: false, description: "Share suggestions for improvement" },
      ]
    },
    {
      id: "fb_product",
      label: "Product Feedback",
      icon: Star,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Product experience and usability feedback",
      questions: [
        { question: "How easy is it to use our product?", type: "rating", scale: 5, required: true, description: "1 = Very Difficult, 5 = Very Easy" },
        { question: "How well does our product meet your needs?", type: "rating", scale: 5, required: true, description: "" },
        { question: "How would you rate the value for money?", type: "rating", scale: 5, required: true, description: "" },
        { question: "What features do you use most frequently?", type: "text", required: true, description: "" },
        { question: "What features would you like us to add?", type: "text", required: false, description: "Feature requests and suggestions" },
      ]
    },
    {
      id: "fb_service",
      label: "Service Experience",
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Service quality and support feedback",
      questions: [
        { question: "How would you rate our customer service?", type: "rating", scale: 5, required: true, description: "" },
        { question: "Was your issue resolved to your satisfaction?", type: "mcq", required: true, options: ["Yes, completely", "Partially", "No, not resolved"] },
        { question: "How long did it take to resolve your issue?", type: "mcq", required: true, options: ["Less than expected", "As expected", "Longer than expected", "Still not resolved"] },
        { question: "How professional was our staff?", type: "rating", scale: 5, required: true, description: "" },
        { question: "Any additional comments about your service experience?", type: "text", required: false, description: "" },
      ]
    },
    {
      id: "fb_event",
      label: "Event Feedback",
      icon: LayoutGrid,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "Post-event or training feedback",
      questions: [
        { question: "How would you rate the overall event?", type: "rating", scale: 5, required: true, description: "" },
        { question: "How relevant was the content to you?", type: "rating", scale: 5, required: true, description: "" },
        { question: "How would you rate the speakers/presenters?", type: "rating", scale: 5, required: true, description: "" },
        { question: "Was the event well-organized?", type: "rating", scale: 5, required: true, description: "" },
        { question: "What did you find most valuable?", type: "text", required: true, description: "" },
        { question: "What topics would you like covered in future events?", type: "text", required: false, description: "" },
        { question: "Would you attend future events?", type: "mcq", required: true, options: ["Definitely yes", "Probably yes", "Not sure", "Probably not", "Definitely not"] },
      ]
    },
    {
      id: "fb_website",
      label: "Website Feedback",
      icon: Type,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
      description: "Website usability and experience",
      questions: [
        { question: "How easy was it to find what you were looking for?", type: "rating", scale: 5, required: true, description: "" },
        { question: "How would you rate the website design?", type: "rating", scale: 5, required: true, description: "" },
        { question: "Did you encounter any issues while using our website?", type: "mcq", required: true, options: ["No issues", "Minor issues", "Major issues"] },
        { question: "What could we improve on our website?", type: "text", required: false, description: "" },
      ]
    },
    {
      id: "fb_employee",
      label: "Employee Feedback",
      icon: List,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
      description: "Employee engagement and satisfaction",
      questions: [
        { question: "How satisfied are you with your current role?", type: "rating", scale: 5, required: true, description: "" },
        { question: "Do you feel valued at work?", type: "rating", scale: 5, required: true, description: "" },
        { question: "How would you rate communication within the team?", type: "rating", scale: 5, required: true, description: "" },
        { question: "Do you have the resources you need to do your job effectively?", type: "rating", scale: 5, required: true, description: "" },
        { question: "What do you enjoy most about working here?", type: "text", required: true, description: "" },
        { question: "What changes would improve your work experience?", type: "text", required: false, description: "" },
        { question: "Would you recommend this company as a place to work?", type: "rating", scale: 10, required: true, description: "Employee NPS (0-10)" },
      ]
    },
  ];

  // Evaluation-specific predefined question templates
  const evaluationTemplates = [
    {
      id: "eval_competency",
      label: "Competency Rating",
      icon: Star,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Rate skills like Communication, Leadership, etc.",
      questions: [
        { question: "Communication Skills", type: "rating", scale: 5, required: true, description: "Ability to communicate clearly and effectively" },
        { question: "Leadership & Initiative", type: "rating", scale: 5, required: true, description: "Demonstrates leadership and takes initiative" },
        { question: "Technical Proficiency", type: "rating", scale: 5, required: true, description: "Knowledge and skills in their area of work" },
        { question: "Teamwork & Collaboration", type: "rating", scale: 5, required: true, description: "Works effectively with team members" },
        { question: "Problem Solving", type: "rating", scale: 5, required: true, description: "Ability to analyze and solve problems" },
        { question: "Time Management", type: "rating", scale: 5, required: true, description: "Manages time and priorities effectively" },
      ]
    },
    {
      id: "eval_performance",
      label: "Performance Scale",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Overall performance assessment",
      questions: [
        { 
          question: "Overall Performance Rating", 
          type: "mcq", 
          required: true, 
          description: "Rate the employee's overall performance",
          options: ["Exceptional - Consistently exceeds expectations", "Exceeds Expectations - Often goes above and beyond", "Meets Expectations - Performs job requirements well", "Needs Improvement - Below expected standards", "Unsatisfactory - Does not meet minimum requirements"]
        },
        {
          question: "Goal Achievement",
          type: "mcq",
          required: true,
          description: "How well did the employee achieve their goals?",
          options: ["Exceeded all goals", "Met all goals", "Met most goals", "Met some goals", "Did not meet goals"]
        }
      ]
    },
    {
      id: "eval_feedback",
      label: "Open Feedback",
      icon: Type,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Qualitative feedback questions",
      questions: [
        { question: "What are this person's key strengths?", type: "text", required: true, description: "Describe their strongest attributes and contributions" },
        { question: "What areas could they improve?", type: "text", required: true, description: "Suggest areas for growth and development" },
        { question: "Any additional comments or feedback?", type: "text", required: false, description: "Share any other observations or recommendations" },
      ]
    },
    {
      id: "eval_360_manager",
      label: "360° Manager View",
      icon: LayoutGrid,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "Complete manager evaluation set",
      questions: [
        { question: "Quality of Work", type: "rating", scale: 5, required: true, description: "Accuracy, thoroughness, and reliability of work output" },
        { question: "Productivity", type: "rating", scale: 5, required: true, description: "Volume of work and ability to meet deadlines" },
        { question: "Job Knowledge", type: "rating", scale: 5, required: true, description: "Understanding of job requirements and procedures" },
        { question: "Dependability", type: "rating", scale: 5, required: true, description: "Reliability, attendance, and commitment" },
        { question: "Attitude", type: "rating", scale: 5, required: true, description: "Cooperation, enthusiasm, and professionalism" },
        { question: "Key accomplishments during this period?", type: "text", required: true, description: "" },
        { question: "Development goals for next period?", type: "text", required: true, description: "" },
      ]
    },
    {
      id: "eval_self",
      label: "Self Assessment",
      icon: Smile,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
      description: "Self-evaluation questions",
      questions: [
        { question: "Rate your own performance this period", type: "rating", scale: 5, required: true, description: "Be honest in your self-assessment" },
        { question: "What were your main achievements?", type: "text", required: true, description: "List your key accomplishments" },
        { question: "What challenges did you face?", type: "text", required: true, description: "Describe obstacles you encountered" },
        { question: "What skills would you like to develop?", type: "text", required: true, description: "Identify areas for growth" },
        { question: "What support do you need from your manager?", type: "text", required: false, description: "Suggest how your manager can help" },
      ]
    },
    {
      id: "eval_peer",
      label: "Peer Review",
      icon: List,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
      description: "Peer feedback questions",
      questions: [
        { question: "How well does this person collaborate with the team?", type: "rating", scale: 5, required: true, description: "" },
        { question: "How reliable is this person in meeting commitments?", type: "rating", scale: 5, required: true, description: "" },
        { question: "How well do they communicate with colleagues?", type: "rating", scale: 5, required: true, description: "" },
        { question: "What do they do best?", type: "text", required: true, description: "Highlight their strengths from a peer perspective" },
        { question: "What could they do differently?", type: "text", required: false, description: "Constructive suggestions for improvement" },
      ]
    },
  ];

  // Function to add feedback template questions to a section
  const addFeedbackTemplate = (sectionId: number, templateId: string) => {
    const template = feedbackTemplates.find(t => t.id === templateId);
    if (!template) return;

    setSections(prevSections => {
      const newSections = prevSections.map(section => {
        if (section.id === sectionId) {
          const existingQuestionCount = section.questions.length;
          const newQuestions = template.questions.map((tq, idx) => ({
            id: existingQuestionCount + idx + 1,
            question: tq.question,
            type: tq.type as QuestionType,
            required: tq.required,
            description: tq.description || '',
            options: tq.options || (tq.type === 'mcq' ? ['Option 1', 'Option 2'] : []),
            scale: tq.scale || 5,
            rows: [],
            columns: [],
            imageUrl: '',
            imageSequence: [],
            videoUrl: '',
            minValue: 0,
            maxValue: tq.scale || 5,
            minLabel: '',
            maxLabel: '',
            correctAnswer: undefined,
            points: 0,
            conditionalLogic: undefined,
            translations: {},
          }));
          return {
            ...section,
            questions: [...section.questions, ...newQuestions]
          };
        }
        return section;
      });
      return newSections;
    });
    toast.success(`Added ${template.label} template (${template.questions.length} questions)`);
  };

  // Function to add evaluation template questions to a section
  const addEvaluationTemplate = (sectionId: number, templateId: string) => {
    const template = evaluationTemplates.find(t => t.id === templateId);
    if (!template) return;

    withPreservedScroll(() => {
      const newQuestions = template.questions.map((tq, idx) => ({
        id: Date.now() + idx,
        type: tq.type,
        question: tq.question,
        required: tq.required,
        description: tq.description || "",
        isRichText: false,
        formattedQuestion: "",
        formattedOptions: [],
        conditionalLogic: null,
        parentQuestionId: null,
        conditionalValue: null,
        nestingLevel: 0,
        ...(tq.type === "mcq" || tq.type === "multi" ? { options: (tq as any).options || ["Option 1", "Option 2"], correctAnswers: [] } : {}),
        ...(tq.type === "rating" ? { scale: (tq as any).scale || 5 } : {}),
        ...(tq.type === "slider" ? { min: 0, max: 100 } : {}),
        ...(tq.type === "matrix" ? { rows: ["Row 1", "Row 2"], columns: ["Column 1", "Column 2"] } : {}),
      }));

      setSections(prevSections =>
        prevSections.map((section) =>
          section.id === sectionId
            ? { ...section, questions: [...section.questions, ...newQuestions] }
            : section
        )
      );
      
      toast.success(`Added ${template.label} template (${newQuestions.length} questions)`);
    });
  };

  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const addSection = () => {
    withPreservedScroll(() => {
      setSections(prevSections => {
        const newSection = {
          id: Date.now(),
          title: `Section ${prevSections.length + 1}`,
          description: "",
          questions: [],
        };
        setExpandedSections(prev => [...prev, newSection.id]);
        return [...prevSections, newSection];
      });
    });
  };

  const deleteSection = (sectionId: number) => {
    setSections(prevSections => prevSections.filter((s) => s.id !== sectionId));
  };

  const addQuestion = (sectionId: number, type: string) => {
    withPreservedScroll(() => {
      const newQuestion: QuestionWithLogic = {
        id: Date.now(),
        type,
        question: type === "information" ? "Information Block" : `New ${type} question`,
        required: type === "information" ? false : false,
        isRichText: false,
        formattedQuestion: "",
        formattedOptions: [],
        description: "",
        conditionalLogic: null,
        parentQuestionId: null,
        conditionalValue: null,
        nestingLevel: 0,
        ...(type === "mcq" || type === "multi" ? { options: ["Option 1", "Option 2", "Option 3"], correctAnswers: [] } : {}),
        ...(type === "rating" ? { scale: 5 } : {}),
        ...(type === "slider" ? { min: 0, max: 100 } : {}),
        ...(type === "matrix" ? { rows: ["Row 1", "Row 2"], columns: ["Column 1", "Column 2"] } : {}),
        // Advanced interactive question types
        ...(type === "slider_scale" ? { settings: { ...DEFAULT_SETTINGS.slider_scale } } : {}),
        ...(type === "dial_gauge" ? { settings: { ...DEFAULT_SETTINGS.dial_gauge } } : {}),
        ...(type === "likert_visual" ? { settings: { ...DEFAULT_SETTINGS.likert_visual } } : {}),
        ...(type === "nps" ? { settings: { ...DEFAULT_SETTINGS.nps } } : {}),
        ...(type === "star_rating" ? { settings: { ...DEFAULT_SETTINGS.star_rating } } : {}),
        ...(type === "drag_and_drop" ? { settings: { ...DEFAULT_SETTINGS.drag_and_drop } } : {}),
      };

      setSections(prevSections =>
        prevSections.map((section) =>
          section.id === sectionId
            ? { ...section, questions: [...section.questions, newQuestion] }
            : section
        )
      );
    });
  };

  const deleteQuestion = (sectionId: number, questionId: number) => {
    setSections(prevSections =>
      prevSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.filter((q: any) => q.id !== questionId),
            }
          : section
      )
    );
  };

  const duplicateQuestion = (sectionId: number, questionId: number) => {
    setSections(prevSections =>
      prevSections.map((section) => {
        if (section.id === sectionId) {
          const questionToDuplicate = section.questions.find((q: any) => q.id === questionId);
          if (questionToDuplicate) {
            const duplicated = { ...questionToDuplicate, id: Date.now() };
            return { ...section, questions: [...section.questions, duplicated] };
          }
        }
        return section;
      })
    );
  };

  const getQuestionIcon = (type: string) => {
    const questionType = questionTypes.find((qt) => qt.id === type);
    return questionType ? <questionType.icon className={`w-4 h-4 ${questionType.color}`} /> : null;
  };

  const updateQuestionOption = useCallback((sectionId: number, questionId: number, optionIdx: number, value: string) => {
    setSections(prevSections =>
      prevSections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            questions: section.questions.map((q: any) => {
              if (q.id === questionId && q.options) {
                const newOptions = [...q.options];
                newOptions[optionIdx] = value;
                // Keep formattedOptions in sync
                const newFormattedOptions = q.formattedOptions ? [...q.formattedOptions] : undefined;
                if (newFormattedOptions) {
                  newFormattedOptions[optionIdx] = value;
                }
                return {
                  ...q,
                  options: newOptions,
                  formattedOptions: newFormattedOptions
                };
              }
              return q;
            }),
          };
        }
        return section;
      })
    );
  }, []);

  const addQuestionOption = (sectionId: number, questionId: number) => {
    setSections(prevSections =>
      prevSections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            questions: section.questions.map((q: any) => {
              if (q.id === questionId && q.options) {
                const newOption = `Option ${q.options.length + 1}`;
                return {
                  ...q,
                  options: [...q.options, newOption],
                  // Sync formattedOptions when in rich text mode
                  formattedOptions: q.isRichText
                    ? [...(q.formattedOptions || q.options), newOption]
                    : q.formattedOptions
                };
              }
              return q;
            }),
          };
        }
        return section;
      })
    );
  };

  const removeQuestionOption = (sectionId: number, questionId: number, optionIdx: number) => {
    setSections(prevSections =>
      prevSections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            questions: section.questions.map((q: any) => {
              if (q.id === questionId && q.options) {
                const newOptions = q.options.filter((_: any, idx: number) => idx !== optionIdx);
                const newFormattedOptions = q.formattedOptions?.filter((_: any, idx: number) => idx !== optionIdx);
                return {
                  ...q,
                  options: newOptions,
                  formattedOptions: newFormattedOptions
                };
              }
              return q;
            }),
          };
        }
        return section;
      })
    );
  };

  const toggleCorrectAnswer = (sectionId: number, questionId: number, optionIdx: number) => {
    setSections(prevSections =>
      prevSections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            questions: section.questions.map((q: any) => {
              if (q.id === questionId && q.correctAnswers !== undefined) {
                const correctAnswers = q.correctAnswers || [];
                const isCorrect = correctAnswers.includes(optionIdx);
                
                // For MCQ, only one answer can be correct
                if (q.type === 'mcq') {
                  return { ...q, correctAnswers: isCorrect ? [] : [optionIdx] };
                }
                // For multi-select, multiple answers can be correct
                else if (q.type === 'multi') {
                  return {
                    ...q,
                    correctAnswers: isCorrect
                      ? correctAnswers.filter((i: number) => i !== optionIdx)
                      : [...correctAnswers, optionIdx]
                  };
                }
              }
              return q;
            }),
          };
        }
        return section;
      })
    );
  };

  // Update question property by ID (for text inputs) - memoized
  const updateQuestionProperty = useCallback((sectionId: number, questionId: number, property: string, value: any) => {
    setSections(prevSections =>
      prevSections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map((q: any) => {
                if (q.id === questionId) {
                  const updates: any = { [property]: value };
                  // Keep question and formattedQuestion in sync
                  if (property === 'question' && q.formattedQuestion) {
                    updates.formattedQuestion = value;
                  }
                  return { ...q, ...updates };
                }
                return q;
              })
            }
          : section
      )
    );
  }, []);

  // Update matrix row
  const updateMatrixRow = useCallback((sectionId: number, questionId: number, rowIndex: number, value: string) => {
    setSections(prevSections =>
      prevSections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map((q: any) =>
                q.id === questionId
                  ? {
                      ...q,
                      rows: q.rows.map((r: string, i: number) => i === rowIndex ? value : r)
                    }
                  : q
              )
            }
          : section
      )
    );
  }, []);

  // Update matrix column
  const updateMatrixColumn = useCallback((sectionId: number, questionId: number, colIndex: number, value: string) => {
    setSections(prevSections =>
      prevSections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map((q: any) =>
                q.id === questionId
                  ? {
                      ...q,
                      columns: q.columns.map((c: string, i: number) => i === colIndex ? value : c)
                    }
                  : q
              )
            }
          : section
      )
    );
  }, []);

  // Drag & Drop Handlers
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);

    setSections(prevSections => arrayMove(prevSections, oldIndex, newIndex));
  };

  const handleQuestionDragEnd = (sectionId: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSections(prevSections =>
      prevSections.map((section) => {
        if (section.id === sectionId) {
          const oldIndex = section.questions.findIndex((q: any) => q.id === active.id);
          const newIndex = section.questions.findIndex((q: any) => q.id === over.id);
          return {
            ...section,
            questions: arrayMove(section.questions, oldIndex, newIndex),
          };
        }
        return section;
      })
    );
  };

  const handleSave = async () => {
    if (!questionnaireName.trim()) {
      toast({ title: "Validation Error", description: "Please enter a questionnaire name", variant: "warning" });
      return;
    }

    if (!selectedProgramId) {
      toast({ title: "Validation Error", description: "Please select a program", variant: "warning" });
      return;
    }

    if (sections.length === 0) {
      toast({ title: "Validation Error", description: "Please add at least one section", variant: "warning" });
      return;
    }

    try {
      setSaving(true);
      
      // Map frontend question types to backend types
      const typeMapping: { [key: string]: string } = {
        'mcq': 'radio',
        'multi': 'multiselect',
        'text': 'text',
        'slider': 'scale',
        'rating': 'rating',
        'matrix': 'matrix',
      };
      
      // Transform sections and questions to match backend format
      const questionnaireData = {
        program_id: selectedProgramId,
        title: questionnaireName,
        description: 'Questionnaire created via builder',
        status: 'draft',
        type: questionnaireType.toLowerCase(),
        languages: enabledLanguages,
        settings: {
          randomize_questions: randomizeQuestions,
          randomize_options: randomizeOptions,
          show_progress_bar: showProgressBar,
          allow_save_continue: allowSaveAndContinue,
          show_header_in_participant_view: showHeaderInParticipantView,
          custom_header_text: customHeaderText,
          show_section_header: showSectionHeader,
          section_header_format: sectionHeaderFormat,
        },
        sections: sections.map((section) => ({
          title: section.title,
          description: section.description,
          order: sections.indexOf(section) + 1,
          questions: section.questions.map((question: any) => {
            const questionData: any = {
              type: typeMapping[question.type] || question.type,
              title: question.formattedQuestion || question.question,
              description: null,
              is_required: question.required || false,
              options: question.options || null,
              settings: {
                // Spread the full settings object first (includes customImages, sequenceImages, etc.)
                ...(question.settings || {}),
                // Then overlay individual properties for backwards compatibility
                ...(question.scale ? { scale: question.scale } : {}),
                ...(question.min !== undefined ? { min: question.min } : {}),
                ...(question.max !== undefined ? { max: question.max } : {}),
                ...(question.placeholder ? { placeholder: question.placeholder } : {}),
                ...(question.rows && question.rows.length > 0 ? { rows: question.rows } : {}),
                ...(question.columns && question.columns.length > 0 ? { columns: question.columns } : {}),
                ...(questionnaireType === 'Assessment' && question.correctAnswers ? { correctAnswers: question.correctAnswers } : {}),
                // Save conditional logic in settings
                ...(question.conditionalLogic ? { conditionalLogic: question.conditionalLogic } : {}),
                // Save question image URL
                ...(question.imageUrl ? { imageUrl: question.imageUrl } : {}),
              },
              order: section.questions.indexOf(question) + 1,
            };
            
            // Add translations if they exist
            if (question.translations) {
              questionData.translations = question.translations;
            }
            
            return questionData;
          }),
        })),
      };

      const createdQuestionnaire = await questionnairesApi.create(questionnaireData as any);
      toast({ title: "Success!", description: "Questionnaire saved successfully!", variant: "success" });
      
      // If in selection mode, redirect back to evaluation with the newly created questionnaire
      if (selectionMode && createdQuestionnaire && createdQuestionnaire.id) {
        router.push(`/evaluation-new?tab=trigger&questionnaire_id=${createdQuestionnaire.id}&questionnaire_name=${encodeURIComponent(questionnaireName)}`);
      } else {
        router.push('/questionnaires');
      }
    } catch (err) {
      console.error('Failed to save questionnaire:', err);
      toast({ title: "Error", description: 'Failed to save questionnaire: ' + (err instanceof Error ? err.message : 'Unknown error'), variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const renderQuestionForParticipant = (question: any) => {
    switch (question.type) {
      case "mcq":
        return (
          <div className="space-y-2">
            {question.options?.map((option: string, idx: number) => (
              <div key={idx} className="flex items-center gap-3">
                <input type="radio" name={`question-${question.id}`} className="w-4 h-4 text-blue-600" />
                {question.isRichText && question.formattedOptions?.[idx] ? (
                  <label className="text-sm text-gray-700 flex-1" dangerouslySetInnerHTML={{ __html: question.formattedOptions[idx] }} />
                ) : (
                  <label className="text-sm text-gray-700 flex-1">{option}</label>
                )}
              </div>
            ))}
          </div>
        );
      case "multi":
        return (
          <div className="space-y-2">
            {question.options?.map((option: string, idx: number) => (
              <div key={idx} className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                {question.isRichText && question.formattedOptions?.[idx] ? (
                  <label className="text-sm text-gray-700 flex-1" dangerouslySetInnerHTML={{ __html: question.formattedOptions[idx] }} />
                ) : (
                  <label className="text-sm text-gray-700 flex-1">{option}</label>
                )}
              </div>
            ))}
          </div>
        );
      case "text":
        return (
          <input
            type="text"
            placeholder="Enter your answer"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        );
      case "textarea":
        return (
          <textarea
            placeholder="Enter your answer"
            rows={4}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        );
      case "boolean":
        return (
          <div className="flex gap-4">
            <button className="px-6 py-2 border-2 border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50">
              Yes
            </button>
            <button className="px-6 py-2 border-2 border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50">
              No
            </button>
          </div>
        );
      case "rating":
        return (
          <div className="flex gap-2">
            {[...Array(question.scale || 5)].map((_, i) => (
              <button
                key={i}
                className="w-10 h-10 border-2 border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50"
              >
                {i + 1}
              </button>
            ))}
          </div>
        );
      case "slider":
        return (
          <div className="space-y-2">
            <input
              type="range"
              min={question.min || 0}
              max={question.max || 100}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{question.min || 0}</span>
              <span>{question.max || 100}</span>
            </div>
          </div>
        );
      case "date":
        return (
          <input
            type="date"
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        );
      case "time":
        return (
          <input
            type="time"
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        );
      default:
        return null;
    }
  };

  // Sortable Question Component - Memoized to prevent unnecessary re-renders
  const SortableQuestion = React.memo(({ question, sectionId, updateQuestionProperty, getQuestionIcon, deleteQuestion, duplicateQuestion, updateQuestionOption, addQuestionOption, removeQuestionOption, toggleCorrectAnswer, questionnaireType, renderQuestionPreview, setSelectedQuestionForTranslation, setShowMultilingualEditor, setTranslationData, setSelectedQuestion, setShowConditionalLogic, updateMatrixRow, updateMatrixColumn }: any) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: question.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="p-4 border-2 border-gray-200 rounded-lg bg-white hover:border-qsights-blue/50 transition-all"
      >
        <div className="flex items-start gap-3">
          <div {...attributes} {...listeners} className="cursor-move mt-1">
            <GripVertical className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 space-y-3">
            {/* Question Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-2">
                  {getQuestionIcon(question.type)}
                  {!question.isRichText ? (
                    <IsolatedTextInput
                      value={question.question}
                      onValueChange={(newValue: string) => {
                        updateQuestionProperty(sectionId, question.id, 'question', newValue);
                      }}
                      className="flex-1 text-sm font-medium text-gray-900 bg-transparent border-none focus:outline-none"
                      placeholder="Enter your question..."
                    />
                  ) : (
                    <div className="flex-1">
                      <RichTextEditor
                        value={question.formattedQuestion || question.question}
                        onChange={(value) => {
                          setSections(prevSections =>
                            prevSections.map(section =>
                              section.id === sectionId
                                ? {
                                    ...section,
                                    questions: section.questions.map((q: any) =>
                                      q.id === question.id
                                        ? {
                                            ...q,
                                            formattedQuestion: value,
                                            question: value  // Keep question in sync
                                          }
                                        : q
                                    )
                                  }
                                : section
                            )
                          );
                        }}
                        placeholder="Enter your question..."
                        minHeight="60px"
                      />
                    </div>
                  )}
                  {question.required && <span className="text-red-500 text-sm">*</span>}
                </div>
                {/* Question Image Upload */}
                <div className="mt-2">
                  <Label className="text-xs text-gray-600 mb-1 block">Question Image (Optional)</Label>
                  <div className="max-w-md">
                    <S3ImageUpload
                      value={question.imageUrl || ''}
                      onChange={(url) => {
                        updateQuestionProperty(sectionId, question.id, 'imageUrl', url);
                      }}
                      folder="questionnaire-images/questions"
                      questionId={question.id}
                      placeholder="Upload question image"
                      maxSize={5}
                      showPreview={true}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    withPreservedScroll(() => {
                      const newIsRichText = !question.isRichText;
                      setSections(prevSections =>
                        prevSections.map(section =>
                          section.id === sectionId
                            ? {
                                ...section,
                                questions: section.questions.map((q: any) =>
                                  q.id === question.id
                                    ? {
                                        ...q,
                                        isRichText: newIsRichText,
                                        // Sync question text
                                        formattedQuestion: newIsRichText 
                                          ? (q.formattedQuestion || q.question)
                                          : q.formattedQuestion,
                                        question: !newIsRichText && q.formattedQuestion
                                          ? q.formattedQuestion
                                          : q.question,
                                        // Initialize formattedOptions from options when enabling rich text
                                        formattedOptions: newIsRichText 
                                          ? (q.formattedOptions?.length ? q.formattedOptions : [...(q.options || [])])
                                          : q.formattedOptions,
                                        // Sync options from formattedOptions when disabling rich text
                                        options: !newIsRichText && q.formattedOptions?.length
                                          ? [...q.formattedOptions]
                                          : q.options
                                      }
                                    : q
                                )
                              }
                            : section
                        )
                      );
                    });
                  }}
                  className={`p-1.5 rounded transition-colors ${
                    question.isRichText ? "text-orange-600 bg-orange-50" : "text-gray-600 hover:bg-gray-100"
                  }`}
                  title="Toggle Rich Text"
                >
                  <Type className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedQuestionForTranslation(question);
                    setShowMultilingualEditor(true);
                    if (question.translations) {
                      setTranslationData(question.translations);
                    } else {
                      setTranslationData({});
                    }
                  }}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Translate"
                >
                  <Globe className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedQuestion(question.id);
                    setShowConditionalLogic(true);
                  }}
                  className="p-1.5 text-qsights-cyan hover:bg-qsights-light rounded transition-colors"
                  title="Conditional Logic"
                >
                  <GitBranch className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    updateQuestionProperty(sectionId, question.id, 'required', !question.required);
                  }}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    question.required ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  Required
                </button>
                <button
                  onClick={() => duplicateQuestion(sectionId, question.id)}
                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteQuestion(sectionId, question.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Question Controls */}
            <div className="pl-6">{renderQuestionPreview(question, sectionId)}</div>
          </div>
        </div>
      </div>
    );
  });

  SortableQuestion.displayName = 'SortableQuestion';

  // Sortable Section Component
  function SortableSection({ section, sectionIdx, sections, setSections, expandedSections, toggleSection, deleteSection, questionTypes, addQuestion, getQuestionIcon, deleteQuestion, duplicateQuestion, updateQuestionOption, addQuestionOption, removeQuestionOption, toggleCorrectAnswer, questionnaireType, renderQuestionPreview, handleQuestionDragEnd, setSelectedQuestionForTranslation, setShowMultilingualEditor, setTranslationData, setSelectedQuestion, setShowConditionalLogic }: any) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: section.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <Card ref={setNodeRef} style={style} className="border-2 border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div {...attributes} {...listeners} className="cursor-move">
                <GripVertical className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <IsolatedTextInput
                  value={section.title}
                  onValueChange={(newValue: string) => {
                    setSections((prevSections: any) =>
                      prevSections.map((s: any) =>
                        s.id === section.id
                          ? { ...s, title: newValue }
                          : s
                      )
                    );
                  }}
                  className="text-lg font-bold text-gray-900 bg-transparent border-none focus:outline-none w-full"
                />
                <IsolatedTextInput
                  value={section.description}
                  onValueChange={(newValue: string) => {
                    setSections((prevSections: any) =>
                      prevSections.map((s: any) =>
                        s.id === section.id
                          ? { ...s, description: newValue }
                          : s
                      )
                    );
                  }}
                  placeholder="Section description"
                  className="text-sm text-gray-500 bg-transparent border-none focus:outline-none w-full mt-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleSection(section.id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                {expandedSections.includes(section.id) ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>
              <button
                onClick={() => deleteSection(section.id)}
                className="p-1 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="w-5 h-5 text-red-600" />
              </button>
            </div>
          </div>
        </CardHeader>

        {expandedSections.includes(section.id) && (
          <CardContent className="p-6 space-y-4">
            {/* Questions */}
            {mounted && (
              <DndContext
                sensors={useSensors(
                  useSensor(PointerSensor),
                  useSensor(KeyboardSensor, {
                    coordinateGetter: sortableKeyboardCoordinates,
                  })
                )}
                collisionDetection={closestCenter}
                onDragEnd={handleQuestionDragEnd(section.id)}
              >
                <SortableContext
                  items={section.questions.map((q: any) => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {section.questions.map((question: any, questionIdx: number) => (
                      <SortableQuestion
                        key={question.id}
                        question={question}
                        sectionId={section.id}
                        updateQuestionProperty={updateQuestionProperty}
                        getQuestionIcon={getQuestionIcon}
                        deleteQuestion={deleteQuestion}
                        duplicateQuestion={duplicateQuestion}
                        updateQuestionOption={updateQuestionOption}
                        addQuestionOption={addQuestionOption}
                        removeQuestionOption={removeQuestionOption}
                        toggleCorrectAnswer={toggleCorrectAnswer}
                        questionnaireType={questionnaireType}
                        renderQuestionPreview={renderQuestionPreview}
                        setSelectedQuestionForTranslation={setSelectedQuestionForTranslation}
                        setShowMultilingualEditor={setShowMultilingualEditor}
                        setTranslationData={setTranslationData}
                        setSelectedQuestion={setSelectedQuestion}
                        setShowConditionalLogic={setShowConditionalLogic}
                        updateMatrixRow={updateMatrixRow}
                        updateMatrixColumn={updateMatrixColumn}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Add Question Buttons */}
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">Add Question</p>
              <div className="flex flex-wrap gap-2">
                {questionTypes.map((type: any) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => addQuestion(section.id, type.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 hover:border-qsights-blue transition-colors"
                  >
                    <type.icon className={`w-4 h-4 ${type.color}`} />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Templates - Only show when type is Feedback */}
            {questionnaireType === 'Feedback' && (
              <div className="pt-4 mt-4 border-t-2 border-green-200 bg-green-50/50 -mx-6 px-6 pb-4 rounded-b-lg">
                <p className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <Smile className="w-4 h-4" />
                  Feedback Templates (Predefined Question Sets)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {feedbackTemplates.map((template: any) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => addFeedbackTemplate(section.id, template.id)}
                      className={`flex flex-col items-start p-3 ${template.bgColor} border-2 border-transparent hover:border-green-400 rounded-lg text-left transition-all hover:shadow-md`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <template.icon className={`w-5 h-5 ${template.color}`} />
                        <span className="text-sm font-semibold text-gray-800">{template.label}</span>
                      </div>
                      <span className="text-xs text-gray-600">{template.description}</span>
                      <span className="text-xs text-green-600 mt-1 font-medium">
                        {template.questions.length} questions
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Evaluation Templates - Only show when type is Evaluation */}
            {questionnaireType === 'Evaluation' && (
              <div className="pt-4 mt-4 border-t-2 border-purple-200 bg-purple-50/50 -mx-6 px-6 pb-4 rounded-b-lg">
                <p className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Evaluation Templates (Predefined Question Sets)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {evaluationTemplates.map((template: any) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => addEvaluationTemplate(section.id, template.id)}
                      className={`flex flex-col items-start p-3 ${template.bgColor} border-2 border-transparent hover:border-purple-400 rounded-lg text-left transition-all hover:shadow-md`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <template.icon className={`w-5 h-5 ${template.color}`} />
                        <span className="text-sm font-semibold text-gray-800">{template.label}</span>
                      </div>
                      <span className="text-xs text-gray-600">{template.description}</span>
                      <span className="text-xs text-purple-600 mt-1 font-medium">
                        {template.questions.length} questions
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  }

  const renderQuestionPreview = (question: any, sectionId: number) => {
    switch (question.type) {
      case "mcq":
        return (
          <div className="space-y-3">
            {question.options?.map((option: string, idx: number) => (
              <div key={`${question.id}-opt-${idx}`} className="flex items-start gap-2 group">
                <div className="w-4 h-4 border-2 border-gray-300 rounded-full flex-shrink-0 mt-1"></div>
                <div className="flex-1">
                  {question.isRichText ? (
                    <RichTextEditor
                      value={question.formattedOptions?.[idx] || option}
                      onChange={(value) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? {
                                          ...q,
                                          formattedOptions: (q.formattedOptions || [...q.options]).map((opt: string, i: number) =>
                                            i === idx ? value : opt
                                          ),
                                          // Keep options in sync
                                          options: (q.formattedOptions || [...q.options]).map((opt: string, i: number) =>
                                            i === idx ? value : opt
                                          )
                                        }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      placeholder={`Option ${idx + 1}`}
                      minHeight="40px"
                      showToolbar={true}
                    />
                  ) : (
                    <IsolatedTextInput
                      value={option}
                      onValueChange={(newValue: string) => updateQuestionOption(sectionId, question.id, idx, newValue)}
                      className="w-full text-sm text-gray-700 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                      placeholder={`Option ${idx + 1}`}
                    />
                  )}
                </div>
                {questionnaireType === 'Assessment' && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={question.correctAnswers?.includes(idx)}
                      onChange={() => toggleCorrectAnswer(sectionId, question.id, idx)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      title="Mark as correct answer"
                    />
                    <span className="text-xs text-gray-500">Correct</span>
                  </div>
                )}
                {question.options.length > 2 && (
                  <button
                    onClick={() => removeQuestionOption(sectionId, question.id, idx)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all flex-shrink-0"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => addQuestionOption(sectionId, question.id)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mt-2"
            >
              <Plus className="w-3 h-3" />
              Add Option
            </button>
          </div>
        );
      case "multi":
        return (
          <div className="space-y-3">
            {question.options?.map((option: string, idx: number) => (
              <div key={`${question.id}-multiopt-${idx}`} className="flex items-start gap-2 group">
                <div className="w-4 h-4 border-2 border-gray-300 rounded flex-shrink-0 mt-1"></div>
                <div className="flex-1">
                  {question.isRichText ? (
                    <RichTextEditor
                      value={question.formattedOptions?.[idx] || option}
                      onChange={(value) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? {
                                          ...q,
                                          formattedOptions: (q.formattedOptions || [...q.options]).map((opt: string, i: number) =>
                                            i === idx ? value : opt
                                          ),
                                          // Keep options in sync
                                          options: (q.formattedOptions || [...q.options]).map((opt: string, i: number) =>
                                            i === idx ? value : opt
                                          )
                                        }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      placeholder={`Option ${idx + 1}`}
                      minHeight="40px"
                      showToolbar={true}
                    />
                  ) : (
                    <IsolatedTextInput
                      value={option}
                      onValueChange={(newValue: string) => updateQuestionOption(sectionId, question.id, idx, newValue)}
                      className="w-full text-sm text-gray-700 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                      placeholder={`Option ${idx + 1}`}
                    />
                  )}
                </div>
                {questionnaireType === 'Assessment' && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={question.correctAnswers?.includes(idx)}
                      onChange={() => toggleCorrectAnswer(sectionId, question.id, idx)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      title="Mark as correct answer"
                    />
                    <span className="text-xs text-gray-500">Correct</span>
                  </div>
                )}
                {question.options.length > 2 && (
                  <button
                    onClick={() => removeQuestionOption(sectionId, question.id, idx)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all flex-shrink-0"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => addQuestionOption(sectionId, question.id)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mt-2"
            >
              <Plus className="w-3 h-3" />
              Add Option
            </button>
          </div>
        );
      case "text":
        return (
          <input
            type="text"
            placeholder={question.placeholder || "Enter your answer"}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            disabled
          />
        );
      case "slider":
        return (
          <div className="space-y-2">
            <input type="range" min={question.min} max={question.max} className="w-full" disabled />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{question.min}</span>
              <span>{question.max}</span>
            </div>
          </div>
        );
      case "rating":
        return (
          <div className="flex gap-2">
            {Array.from({ length: question.scale || 5 }).map((_, idx) => (
              <Star key={idx} className="w-6 h-6 text-gray-300" />
            ))}
          </div>
        );
      case "matrix":
        const rows = question.rows || [];
        const columns = question.columns || [];
        
        if (!showPreview) {
          return (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-2">Rows</label>
                <div className="space-y-2">
                  {rows.map((row: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 group">
                      <IsolatedTextInput
                        value={row}
                        onValueChange={(newValue: string) => updateMatrixRow(sectionId, question.id, idx, newValue)}
                        className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded"
                        placeholder={`Row ${idx + 1}`}
                      />
                      {rows.length > 1 && (
                        <button
                          onClick={() => {
                            setSections(prevSections =>
                              prevSections.map(section =>
                                section.id === sectionId
                                  ? {
                                      ...section,
                                      questions: section.questions.map((q: any) =>
                                        q.id === question.id
                                          ? {
                                              ...q,
                                              rows: q.rows.filter((_: any, i: number) => i !== idx)
                                            }
                                          : q
                                      )
                                    }
                                  : section
                              )
                            );
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setSections(prevSections =>
                        prevSections.map(section =>
                          section.id === sectionId
                            ? {
                                ...section,
                                questions: section.questions.map((q: any) =>
                                  q.id === question.id
                                    ? {
                                        ...q,
                                        rows: [...q.rows, `Row ${q.rows.length + 1}`]
                                      }
                                    : q
                                )
                              }
                            : section
                        )
                      );
                    }}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    Add Row
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-2">Columns</label>
                <div className="space-y-2">
                  {columns.map((col: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 group">
                      <IsolatedTextInput
                        value={col}
                        onValueChange={(newValue: string) => updateMatrixColumn(sectionId, question.id, idx, newValue)}
                        className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded"
                        placeholder={`Column ${idx + 1}`}
                      />
                      {columns.length > 1 && (
                        <button
                          onClick={() => {
                            setSections(prevSections =>
                              prevSections.map(section =>
                                section.id === sectionId
                                  ? {
                                      ...section,
                                      questions: section.questions.map((q: any) =>
                                        q.id === question.id
                                          ? {
                                              ...q,
                                              columns: q.columns.filter((_: any, i: number) => i !== idx)
                                            }
                                          : q
                                      )
                                    }
                                  : section
                              )
                            );
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setSections(prevSections =>
                        prevSections.map(section =>
                          section.id === sectionId
                            ? {
                                ...section,
                                questions: section.questions.map((q: any) =>
                                  q.id === question.id
                                    ? {
                                        ...q,
                                        columns: [...q.columns, `Column ${q.columns.length + 1}`]
                                      }
                                    : q
                                )
                              }
                            : section
                        )
                      );
                    }}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    Add Column
                  </button>
                </div>
              </div>
            </div>
          );
        }
        
        // Preview mode
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2"></th>
                  {columns.map((col: string, idx: number) => (
                    <th key={idx} className="text-center p-2 text-gray-700">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: string, rowIdx: number) => (
                  <tr key={rowIdx} className="border-t border-gray-200">
                    <td className="p-2 text-gray-700">{row}</td>
                    {columns.map((_: string, colIdx: number) => (
                      <td key={colIdx} className="text-center p-2">
                        <div className="w-4 h-4 border-2 border-gray-300 rounded-full mx-auto"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "information":
        return (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <RichTextEditor
                  value={question.formattedQuestion || question.description || ""}
                  onChange={(value) => {
                    setSections(prevSections =>
                      prevSections.map(section =>
                        section.id === sectionId
                          ? {
                              ...section,
                              questions: section.questions.map((q: any) =>
                                q.id === question.id
                                  ? {
                                      ...q,
                                      formattedQuestion: value,
                                      description: value.replace(/<[^>]*>/g, '')
                                    }
                                  : q
                              )
                            }
                          : section
                      )
                    );
                  }}
                  placeholder="Enter information text here... This can be instructions, explanations, or important notes. Use the toolbar for formatting."
                  minHeight="150px"
                />
                <p className="text-xs text-blue-600">
                  💡 This is an information block. It will be displayed to participants but won't require a response.
                </p>
              </div>
            </div>
          </div>
        );
      case "slider_scale":
        const sliderSettings = question.settings || DEFAULT_SETTINGS.slider_scale;
        return (
          <div className="py-4 space-y-4">
            <SliderScale
              value={null}
              onChange={() => {}}
              settings={sliderSettings}
              disabled={true}
            />
            {/* Settings Panel */}
            {!showPreview && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Slider Settings</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {/* Min Value */}
                  <div>
                    <Label className="text-xs text-gray-600">Min Value</Label>
                    <Input
                      type="number"
                      defaultValue={sliderSettings.min ?? 0}
                      onBlur={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...sliderSettings, min: parseInt(e.target.value) || 0 } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      key={`slider-min-${question.id}-${sliderSettings.min}`}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  {/* Max Value */}
                  <div>
                    <Label className="text-xs text-gray-600">Max Value</Label>
                    <Input
                      type="number"
                      defaultValue={sliderSettings.max ?? 100}
                      onBlur={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...sliderSettings, max: parseInt(e.target.value) || 100 } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      key={`slider-max-${question.id}-${sliderSettings.max}`}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  {/* Step */}
                  <div>
                    <Label className="text-xs text-gray-600">Step</Label>
                    <Input
                      type="number"
                      defaultValue={sliderSettings.step ?? 1}
                      onBlur={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...sliderSettings, step: parseInt(e.target.value) || 1 } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      key={`slider-step-${question.id}-${sliderSettings.step}`}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {/* Start Label */}
                  <div>
                    <Label className="text-xs text-gray-600">Start Label</Label>
                    <Input
                      type="text"
                      defaultValue={sliderSettings.labels?.start || ''}
                      placeholder="e.g., Low"
                      onBlur={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...sliderSettings, labels: { ...sliderSettings.labels, start: e.target.value } } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      key={`slider-start-${question.id}-${sliderSettings.labels?.start}`}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  {/* Middle Label */}
                  <div>
                    <Label className="text-xs text-gray-600">Middle Label</Label>
                    <Input
                      type="text"
                      defaultValue={sliderSettings.labels?.middle || ''}
                      placeholder="e.g., Medium"
                      onBlur={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...sliderSettings, labels: { ...sliderSettings.labels, middle: e.target.value } } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      key={`slider-middle-${question.id}-${sliderSettings.labels?.middle}`}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  {/* End Label */}
                  <div>
                    <Label className="text-xs text-gray-600">End Label</Label>
                    <Input
                      type="text"
                      defaultValue={sliderSettings.labels?.end || ''}
                      placeholder="e.g., High"
                      onBlur={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...sliderSettings, labels: { ...sliderSettings.labels, end: e.target.value } } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      key={`slider-end-${question.id}-${sliderSettings.labels?.end}`}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-6 mt-4">
                  {/* Show Value Toggle */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`slider-value-${question.id}`}
                      checked={sliderSettings.showValue !== false}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...sliderSettings, showValue: e.target.checked } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <Label htmlFor={`slider-value-${question.id}`} className="text-xs text-gray-600 cursor-pointer">
                      Show Value
                    </Label>
                  </div>
                  {/* Show Ticks Toggle */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`slider-ticks-${question.id}`}
                      checked={sliderSettings.showTicks !== false}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...sliderSettings, showTicks: e.target.checked } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <Label htmlFor={`slider-ticks-${question.id}`} className="text-xs text-gray-600 cursor-pointer">
                      Show Ticks
                    </Label>
                  </div>
                  {/* Use Custom Images Toggle */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`slider-custom-${question.id}`}
                      checked={sliderSettings.useCustomImages === true}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...sliderSettings, useCustomImages: e.target.checked } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <Label htmlFor={`slider-custom-${question.id}`} className="text-xs text-gray-600 cursor-pointer">
                      🖼️ Use Custom Images
                    </Label>
                  </div>
                  {/* Show Image Labels Toggle */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`slider-labels-${question.id}`}
                      checked={sliderSettings.showImageLabels !== false}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...sliderSettings, showImageLabels: e.target.checked } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <Label htmlFor={`slider-labels-${question.id}`} className="text-xs text-gray-600 cursor-pointer">
                      🔢 Show Image Numbers
                    </Label>
                  </div>
                </div>

                {/* Value Display Mode Configuration */}
                <ValueDisplayModeConfig
                  settings={sliderSettings}
                  questionId={question.id}
                  sectionId={sectionId}
                  setSections={setSections}
                />

                {/* Custom Images Section for Slider */}
                {sliderSettings.useCustomImages && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Label className="text-xs text-gray-600 block mb-3">Custom Slider Images</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Thumb/Handle Image */}
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-blue-700">Slider Thumb (Handle)</span>
                          {sliderSettings.customImages?.thumbUrl && (
                            <span className="text-xs text-green-600">✓</span>
                          )}
                        </div>
                        <S3ImageUpload
                          value={sliderSettings.customImages?.thumbUrl || ''}
                          onChange={(url) => {
                            const newCustomImages = { ...(sliderSettings.customImages || {}), thumbUrl: url };
                            setSections(prevSections =>
                              prevSections.map(section =>
                                section.id === sectionId
                                  ? {
                                      ...section,
                                      questions: section.questions.map((q: any) =>
                                        q.id === question.id
                                          ? { ...q, settings: { ...sliderSettings, customImages: newCustomImages } }
                                          : q
                                      )
                                    }
                                  : section
                              )
                            );
                          }}
                          folder="questionnaire-images/slider"
                          placeholder="Upload thumb image"
                          showPreview={true}
                          showUniversalSizeHelper={true}
                          maxSize={5}
                        />
                        <div className="text-xs text-gray-400 text-center my-1">— or URL —</div>
                        <Input
                          type="url"
                          placeholder="https://example.com/thumb.png"
                          defaultValue={sliderSettings.customImages?.thumbUrl || ''}
                          onBlur={(e) => {
                            const newCustomImages = { ...(sliderSettings.customImages || {}), thumbUrl: e.target.value };
                            setSections(prevSections =>
                              prevSections.map(section =>
                                section.id === sectionId
                                  ? {
                                      ...section,
                                      questions: section.questions.map((q: any) =>
                                        q.id === question.id
                                          ? { ...q, settings: { ...sliderSettings, customImages: newCustomImages } }
                                          : q
                                      )
                                    }
                                  : section
                              )
                            );
                          }}
                          key={`slider-thumb-url-${question.id}-${sliderSettings.customImages?.thumbUrl}`}
                          className="text-xs h-7"
                        />
                      </div>
                      {/* Track Image */}
                      <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-700">Track Background</span>
                          {sliderSettings.customImages?.trackUrl && (
                            <span className="text-xs text-green-600">✓</span>
                          )}
                        </div>
                        <S3ImageUpload
                          value={sliderSettings.customImages?.trackUrl || ''}
                          onChange={(url) => {
                            const newCustomImages = { ...(sliderSettings.customImages || {}), trackUrl: url };
                            setSections(prevSections =>
                              prevSections.map(section =>
                                section.id === sectionId
                                  ? {
                                      ...section,
                                      questions: section.questions.map((q: any) =>
                                        q.id === question.id
                                          ? { ...q, settings: { ...sliderSettings, customImages: newCustomImages } }
                                          : q
                                      )
                                    }
                                  : section
                              )
                            );
                          }}
                          folder="questionnaire-images/slider"
                          placeholder="Upload track image"
                          showPreview={true}
                          showUniversalSizeHelper={true}
                          maxSize={5}
                        />
                        <div className="text-xs text-gray-400 text-center my-1">— or URL —</div>
                        <Input
                          type="url"
                          placeholder="https://example.com/track.png"
                          defaultValue={sliderSettings.customImages?.trackUrl || ''}
                          onBlur={(e) => {
                            const newCustomImages = { ...(sliderSettings.customImages || {}), trackUrl: e.target.value };
                            setSections(prevSections =>
                              prevSections.map(section =>
                                section.id === sectionId
                                  ? {
                                      ...section,
                                      questions: section.questions.map((q: any) =>
                                        q.id === question.id
                                          ? { ...q, settings: { ...sliderSettings, customImages: newCustomImages } }
                                          : q
                                      )
                                    }
                                  : section
                              )
                            );
                          }}
                          key={`slider-track-url-${question.id}-${sliderSettings.customImages?.trackUrl}`}
                          className="text-xs h-7"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">💡 Custom thumb replaces the slider handle. Track background appears behind the slider.</p>
                  </div>
                )}
                
                {/* Sequence Images Section */}
                {!showPreview && (
                  <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="w-4 h-4 text-qsights-cyan" />
                      <span className="text-sm font-semibold text-purple-900">Interactive Image Sequence</span>
                      <span className="text-xs bg-qsights-dark text-white px-2 py-0.5 rounded-full">NEW</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">
                      Upload multiple images that highlight interactively as the slider moves. Each value gets its own image!
                    </p>
                    <p className="text-xs text-blue-600 font-medium mb-3">
                      📐 Recommended Size: 1200 × 675 pixels (16:9 ratio) | Max: 1MB per image
                    </p>
                    <BulkImageUpload
                      value={sliderSettings.customImages?.sequenceImages || []}
                      onChange={(urls) => {
                        const newCustomImages = { ...(sliderSettings.customImages || {}), sequenceImages: urls };
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...sliderSettings, customImages: newCustomImages } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      showUniversalSizeHelper={true}
                      maxFiles={20}
                      maxSize={5}
                      placeholder="Upload Sequence Images (1-20)"
                    />
                    <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-800">
                      <strong>💡 Pro Tip:</strong> For a 0-10 slider, upload 11 images. Image #0 = value 0, Image #5 = value 5, etc.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case "dial_gauge":
        const dialSettings = question.settings || DEFAULT_SETTINGS.dial_gauge;
        return (
          <div className="py-4 space-y-4">
            <div className="flex justify-center">
              <DialGauge
                value={null}
                onChange={() => {}}
                settings={dialSettings}
                disabled={true}
              />
            </div>
            {/* Settings Panel */}
            {!showPreview && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Gauge Settings</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {/* Min Value */}
                  <div>
                    <Label className="text-xs text-gray-600">Min Value</Label>
                    <Input
                      type="number"
                      defaultValue={dialSettings.min ?? 0}
                      onBlur={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...dialSettings, min: parseInt(e.target.value) || 0 } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      key={`dial-min-${question.id}-${dialSettings.min}`}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  {/* Max Value */}
                  <div>
                    <Label className="text-xs text-gray-600">Max Value</Label>
                    <Input
                      type="number"
                      defaultValue={dialSettings.max ?? 10}
                      onBlur={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...dialSettings, max: parseInt(e.target.value) || 10 } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      key={`dial-max-${question.id}-${dialSettings.max}`}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  {/* Size */}
                  <div>
                    <Label className="text-xs text-gray-600">Size</Label>
                    <select
                      value={dialSettings.size || 'md'}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...dialSettings, size: e.target.value } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded"
                    >
                      <option value="sm">Small</option>
                      <option value="md">Medium</option>
                      <option value="lg">Large</option>
                      <option value="xl">Extra Large</option>
                    </select>
                  </div>
                </div>
                {/* Show Value Toggle */}
                <div className="flex items-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`dial-value-${question.id}`}
                      checked={dialSettings.showValue !== false}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...dialSettings, showValue: e.target.checked } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <Label htmlFor={`dial-value-${question.id}`} className="text-xs text-gray-600 cursor-pointer">
                      Show Value
                    </Label>
                  </div>
                  {/* Use Custom Images Toggle */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`dial-custom-${question.id}`}
                      checked={dialSettings.useCustomImages === true}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...dialSettings, useCustomImages: e.target.checked } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <Label htmlFor={`dial-custom-${question.id}`} className="text-xs text-gray-600 cursor-pointer">
                      🖼️ Use Custom Images
                    </Label>
                  </div>
                  {/* Show Image Labels Toggle */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`dial-labels-${question.id}`}
                      checked={dialSettings.showImageLabels !== false}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...dialSettings, showImageLabels: e.target.checked } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <Label htmlFor={`dial-labels-${question.id}`} className="text-xs text-gray-600 cursor-pointer">
                      🔢 Show Image Numbers
                    </Label>
                  </div>
                </div>

                {/* Instruction Text */}
                <div className="mt-4">
                  <Label className="text-xs text-gray-600">Instruction Text (Over Text)</Label>
                  <Input
                    type="text"
                    placeholder="Drag the pointer to select"
                    defaultValue={dialSettings.instructionText || 'Drag the pointer to select'}
                    onBlur={(e) => {
                      setSections(prevSections =>
                        prevSections.map(section =>
                          section.id === sectionId
                            ? {
                                ...section,
                                questions: section.questions.map((q: any) =>
                                  q.id === question.id
                                    ? { ...q, settings: { ...dialSettings, instructionText: e.target.value || 'Drag the pointer to select' } }
                                    : q
                                )
                              }
                            : section
                        )
                      );
                    }}
                    key={`dial-instruction-${question.id}-${dialSettings.instructionText}`}
                    className="mt-1 h-8 text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">💡 Text shown below the value (like "over text" in star rating)</p>
                </div>

                {/* Value Display Mode Configuration */}
                <ValueDisplayModeConfig
                  settings={dialSettings}
                  questionId={question.id}
                  sectionId={sectionId}
                  setSections={setSections}
                />

                {/* Custom Images Section for Dial Gauge */}
                {dialSettings.useCustomImages && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Label className="text-xs text-gray-600 block mb-3">Custom Gauge Images</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Gauge Background Image */}
                      <div className="p-3 bg-qsights-light rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-purple-700">Gauge Background</span>
                          {dialSettings.customImages?.backgroundUrl && (
                            <span className="text-xs text-green-600">✓</span>
                          )}
                        </div>
                        <S3ImageUpload
                          value={dialSettings.customImages?.backgroundUrl || ''}
                          onChange={(url) => {
                            const newCustomImages = { ...(dialSettings.customImages || {}), backgroundUrl: url };
                            setSections(prevSections =>
                              prevSections.map(section =>
                                section.id === sectionId
                                  ? {
                                      ...section,
                                      questions: section.questions.map((q: any) =>
                                        q.id === question.id
                                          ? { ...q, settings: { ...dialSettings, customImages: newCustomImages } }
                                          : q
                                      )
                                    }
                                  : section
                              )
                            );
                          }}
                          folder="questionnaire-images/dial-gauge"
                          placeholder="Upload gauge background"
                          showPreview={true}
                          showUniversalSizeHelper={true}
                          maxSize={5}
                        />
                        <div className="text-xs text-gray-400 text-center my-1">— or URL —</div>
                        <Input
                          type="url"
                          placeholder="https://example.com/gauge-bg.png"
                          defaultValue={dialSettings.customImages?.backgroundUrl || ''}
                          onBlur={(e) => {
                            const newCustomImages = { ...(dialSettings.customImages || {}), backgroundUrl: e.target.value };
                            setSections(prevSections =>
                              prevSections.map(section =>
                                section.id === sectionId
                                  ? {
                                      ...section,
                                      questions: section.questions.map((q: any) =>
                                        q.id === question.id
                                          ? { ...q, settings: { ...dialSettings, customImages: newCustomImages } }
                                          : q
                                      )
                                    }
                                  : section
                              )
                            );
                          }}
                          key={`dial-bg-url-${question.id}-${dialSettings.customImages?.backgroundUrl}`}
                          className="text-xs h-7"
                        />
                      </div>
                      {/* Needle/Pointer Image */}
                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-orange-700">Needle/Pointer</span>
                          {dialSettings.customImages?.needleUrl && (
                            <span className="text-xs text-green-600">✓</span>
                          )}
                        </div>
                        <S3ImageUpload
                          value={dialSettings.customImages?.needleUrl || ''}
                          onChange={(url) => {
                            const newCustomImages = { ...(dialSettings.customImages || {}), needleUrl: url };
                            setSections(prevSections =>
                              prevSections.map(section =>
                                section.id === sectionId
                                  ? {
                                      ...section,
                                      questions: section.questions.map((q: any) =>
                                        q.id === question.id
                                          ? { ...q, settings: { ...dialSettings, customImages: newCustomImages } }
                                          : q
                                      )
                                    }
                                  : section
                              )
                            );
                          }}
                          folder="questionnaire-images/dial-gauge"
                          placeholder="Upload needle image"
                          showPreview={true}
                          maxSize={5}
                        />
                        <div className="text-xs text-gray-400 text-center my-1">— or URL —</div>
                        <Input
                          type="url"
                          placeholder="https://example.com/needle.png"
                          defaultValue={dialSettings.customImages?.needleUrl || ''}
                          onBlur={(e) => {
                            const newCustomImages = { ...(dialSettings.customImages || {}), needleUrl: e.target.value };
                            setSections(prevSections =>
                              prevSections.map(section =>
                                section.id === sectionId
                                  ? {
                                      ...section,
                                      questions: section.questions.map((q: any) =>
                                        q.id === question.id
                                          ? { ...q, settings: { ...dialSettings, customImages: newCustomImages } }
                                          : q
                                      )
                                    }
                                  : section
                              )
                            );
                          }}
                          key={`dial-needle-url-${question.id}-${dialSettings.customImages?.needleUrl}`}
                          className="text-xs h-7"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">💡 Custom background replaces the gauge dial. Needle image replaces the pointer.</p>
                  </div>
                )}
                
                {/* Sequence Images Section */}
                {!showPreview && (
                  <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="w-4 h-4 text-qsights-cyan" />
                      <span className="text-sm font-semibold text-purple-900">Interactive Image Sequence</span>
                      <span className="text-xs bg-qsights-dark text-white px-2 py-0.5 rounded-full">NEW</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">
                      Upload multiple images that highlight interactively as the gauge pointer moves. Each value gets its own image!
                    </p>
                    <p className="text-xs text-blue-600 font-medium mb-3">
                      📐 Recommended Size: 1200 × 675 pixels (16:9 ratio) | Max: 1MB per image
                    </p>
                    <BulkImageUpload
                      value={dialSettings.customImages?.sequenceImages || []}
                      onChange={(urls) => {
                        const newCustomImages = { ...(dialSettings.customImages || {}), sequenceImages: urls };
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...dialSettings, customImages: newCustomImages } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      maxFiles={20}
                      maxSize={5}
                      placeholder="Upload Sequence Images (1-20)"
                    />
                    <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-800">
                      <strong>💡 Pro Tip:</strong> For a 0-10 gauge, upload 11 images. Image #0 = value 0, Image #5 = value 5, etc.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case "likert_visual":
        const likertSettings = question.settings || DEFAULT_SETTINGS.likert_visual;
        return (
          <div className="py-4 space-y-4">
            <LikertVisual
              value={null}
              onChange={() => {}}
              settings={likertSettings}
              disabled={true}
            />
            {/* Settings Panel */}
            {!showPreview && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Display Settings</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Scale Selection */}
                  <div>
                    <Label className="text-xs text-gray-600">Scale</Label>
                    <select
                      value={likertSettings.scale || 5}
                      onChange={(e) => {
                        const newScale = parseInt(e.target.value) as 2 | 3 | 5 | 7 | 10;
                        let defaultLabels: string[] = [];
                        
                        // Define default labels for each scale
                        switch(newScale) {
                          case 2:
                            defaultLabels = ['Disagree', 'Agree'];
                            break;
                          case 3:
                            defaultLabels = ['Disagree', 'Neutral', 'Agree'];
                            break;
                          case 5:
                            defaultLabels = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
                            break;
                          case 7:
                            defaultLabels = ['Strongly Disagree', 'Disagree', 'Somewhat Disagree', 'Neutral', 'Somewhat Agree', 'Agree', 'Strongly Agree'];
                            break;
                          case 10:
                            defaultLabels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
                            break;
                        }
                        
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...likertSettings, scale: newScale, labels: defaultLabels } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded"
                    >
                      <option value={2}>2 Point Scale</option>
                      <option value={3}>3 Point Scale</option>
                      <option value={5}>5 Point Scale</option>
                      <option value={7}>7 Point Scale</option>
                      <option value={10}>10 Point Scale</option>
                    </select>
                  </div>
                  {/* Icon Style Selection */}
                  <div>
                    <Label className="text-xs text-gray-600">Icon Style</Label>
                    <select
                      value={likertSettings.iconStyle || 'emoji'}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...likertSettings, iconStyle: e.target.value } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded"
                    >
                      <option value="emoji">Emoji 😀</option>
                      <option value="face">Face Icons</option>
                      <option value="simple">Simple Circles</option>
                      <option value="custom">Custom Images</option>
                    </select>
                  </div>
                  {/* Size Selection */}
                  <div>
                    <Label className="text-xs text-gray-600">Size</Label>
                    <select
                      value={likertSettings.size || 'md'}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...likertSettings, size: e.target.value } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded"
                    >
                      <option value="sm">Small</option>
                      <option value="md">Medium</option>
                      <option value="lg">Large</option>
                    </select>
                  </div>
                  {/* Show Labels Toggle */}
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id={`likert-labels-${question.id}`}
                      checked={likertSettings.showLabels !== false}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...likertSettings, showLabels: e.target.checked } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <Label htmlFor={`likert-labels-${question.id}`} className="text-xs text-gray-600 cursor-pointer">
                      Show Labels
                    </Label>
                  </div>
                </div>
                {/* Custom Labels Section */}
                {likertSettings.showLabels !== false && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Label className="text-xs text-gray-600 block mb-2">Customize Hover Labels</Label>
                    <div className="space-y-2">
                      {Array.from({ length: likertSettings.scale || 5 }).map((_, idx) => {
                        // Get current label text
                        const currentLabels = likertSettings.labels || [];
                        const currentLabel = typeof currentLabels[idx] === 'string' 
                          ? currentLabels[idx] 
                          : (currentLabels[idx]?.label || '');
                        
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-16">Point {idx + 1}:</span>
                            <Input
                              type="text"
                              placeholder={`Label for point ${idx + 1}`}
                              defaultValue={currentLabel}
                              onBlur={(e) => {
                                const newLabels = Array.from({ length: likertSettings.scale || 5 }, (_, i) => {
                                  const existingLabel = likertSettings.labels?.[i];
                                  const existingText = typeof existingLabel === 'string' 
                                    ? existingLabel 
                                    : (existingLabel?.label || `Point ${i + 1}`);
                                  
                                  if (i === idx) {
                                    return e.target.value || existingText;
                                  }
                                  return existingText;
                                });
                                
                                setSections(prevSections =>
                                  prevSections.map(section =>
                                    section.id === sectionId
                                      ? {
                                          ...section,
                                          questions: section.questions.map((q: any) =>
                                            q.id === question.id
                                              ? { ...q, settings: { ...likertSettings, labels: newLabels } }
                                              : q
                                          )
                                        }
                                      : section
                                  )
                                );
                              }}
                              key={`likert-label-${question.id}-${idx}-${currentLabel}`}
                              className="text-xs h-8 flex-1"
                            />
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">💡 Customize the text shown when hovering over each option</p>
                  </div>
                )}
                {/* Icon/Emoji Selector Section */}
                {(likertSettings.iconStyle === 'emoji' || likertSettings.iconStyle === 'face') && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Label className="text-xs text-gray-600 block mb-3">
                      {likertSettings.iconStyle === 'emoji' ? 'Select Emoji for Each Option' : 'Select Face Icon for Each Option'}
                    </Label>
                    <div className="space-y-3">
                      {Array.from({ length: likertSettings.scale || 5 }).map((_, idx) => {
                        const currentLabels = likertSettings.labels || [];
                        const currentLabel = currentLabels[idx];
                        const labelText = typeof currentLabel === 'string' ? currentLabel : currentLabel?.label || `Point ${idx + 1}`;
                        const currentIcon = typeof currentLabel === 'object' ? currentLabel?.icon : undefined;
                        const currentEmoji = typeof currentLabel === 'object' ? currentLabel?.emoji : undefined;
                        
                        // Predefined emoji list
                        const emojiOptions = ['😠', '😡', '😤', '🙁', '😟', '😕', '😐', '😶', '🙂', '😊', '😃', '😄', '😁', '🤩', '😍', '❤️', '💚', '👍', '👎', '✅', '❌', '⭐', '🔥', '💯'];
                        
                        // Face icon options
                        const faceIconOptions = [
                          { value: 'angry', label: '😠 Angry', emoji: '😠' },
                          { value: 'frown', label: '🙁 Frown', emoji: '🙁' },
                          { value: 'meh', label: '😐 Neutral', emoji: '😐' },
                          { value: 'smile', label: '🙂 Smile', emoji: '🙂' },
                          { value: 'smileplus', label: '😄 Big Smile', emoji: '😄' }
                        ];
                        
                        return (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                Point {idx + 1}: {labelText}
                              </span>
                              {(currentEmoji || currentIcon) && (
                                <span className="text-lg">{currentEmoji || (currentIcon === 'angry' ? '😠' : currentIcon === 'frown' ? '🙁' : currentIcon === 'meh' ? '😐' : currentIcon === 'smile' ? '🙂' : '😄')}</span>
                              )}
                            </div>
                            {likertSettings.iconStyle === 'emoji' ? (
                              <div className="flex flex-wrap gap-2">
                                {emojiOptions.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                      const newLabels = Array.from({ length: likertSettings.scale || 5 }, (_, i) => {
                                        const existingLabel = likertSettings.labels?.[i];
                                        const existingText = typeof existingLabel === 'string' 
                                          ? existingLabel 
                                          : (existingLabel?.label || `Point ${i + 1}`);
                                        const existingIcon = typeof existingLabel === 'object' ? existingLabel?.icon : undefined;
                                        
                                        if (i === idx) {
                                          return { 
                                            value: i + 1, 
                                            label: existingText,
                                            emoji: emoji,
                                            icon: existingIcon
                                          };
                                        }
                                        return typeof existingLabel === 'string' 
                                          ? existingLabel 
                                          : existingLabel || existingText;
                                      });
                                      
                                      setSections(prevSections =>
                                        prevSections.map(section =>
                                          section.id === sectionId
                                            ? {
                                                ...section,
                                                questions: section.questions.map((q: any) =>
                                                  q.id === question.id
                                                    ? { ...q, settings: { ...likertSettings, labels: newLabels } }
                                                    : q
                                                )
                                              }
                                            : section
                                        )
                                      );
                                    }}
                                    className={`text-2xl p-2 rounded hover:bg-white transition-colors ${
                                      currentEmoji === emoji ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-white'
                                    }`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {faceIconOptions.map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      const newLabels = Array.from({ length: likertSettings.scale || 5 }, (_, i) => {
                                        const existingLabel = likertSettings.labels?.[i];
                                        const existingText = typeof existingLabel === 'string' 
                                          ? existingLabel 
                                          : (existingLabel?.label || `Point ${i + 1}`);
                                        const existingEmoji = typeof existingLabel === 'object' ? existingLabel?.emoji : undefined;
                                        
                                        if (i === idx) {
                                          return { 
                                            value: i + 1, 
                                            label: existingText,
                                            icon: option.value,
                                            emoji: existingEmoji
                                          };
                                        }
                                        return typeof existingLabel === 'string' 
                                          ? existingLabel 
                                          : existingLabel || existingText;
                                      });
                                      
                                      setSections(prevSections =>
                                        prevSections.map(section =>
                                          section.id === sectionId
                                            ? {
                                                ...section,
                                                questions: section.questions.map((q: any) =>
                                                  q.id === question.id
                                                    ? { ...q, settings: { ...likertSettings, labels: newLabels } }
                                                    : q
                                                )
                                              }
                                            : section
                                        )
                                      );
                                    }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-white transition-colors text-sm ${
                                      currentIcon === option.value ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-white'
                                    }`}
                                  >
                                    <span className="text-xl">{option.emoji}</span>
                                    <span>{option.label.split(' ')[1]}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      💡 {likertSettings.iconStyle === 'emoji' ? 'Select an emoji for each scale point' : 'Select a face icon for each scale point'}
                    </p>
                  </div>
                )}
                {/* Custom Images Section */}
                {likertSettings.iconStyle === 'custom' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Label className="text-xs text-gray-600 block mb-2">Custom Images for Each Scale Point</Label>
                    <div className="space-y-3">
                      {Array.from({ length: likertSettings.scale || 5 }).map((_, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-700">Point {idx + 1}</span>
                            {likertSettings.customImages?.[idx]?.imageUrl && (
                              <span className="text-xs text-green-600">✓ Image set</span>
                            )}
                          </div>
                          <div className="space-y-2">
                            <S3ImageUpload
                              value={likertSettings.customImages?.[idx]?.imageUrl || ''}
                              onChange={(url) => {
                                const newCustomImages = [...(likertSettings.customImages || [])];
                                newCustomImages[idx] = { value: idx + 1, imageUrl: url };
                                setSections(prevSections =>
                                  prevSections.map(section =>
                                    section.id === sectionId
                                      ? {
                                          ...section,
                                          questions: section.questions.map((q: any) =>
                                            q.id === question.id
                                              ? { ...q, settings: { ...likertSettings, customImages: newCustomImages } }
                                              : q
                                          )
                                        }
                                      : section
                                  )
                                );
                              }}
                              folder="questionnaire-images/likert"
                              placeholder={`Upload image for point ${idx + 1}`}
                              showPreview={true}
                              maxSize={10}
                            />
                            <div className="text-xs text-gray-400 text-center">— or enter URL manually —</div>
                            <Input
                              type="url"
                              placeholder={`https://example.com/image-${idx + 1}.png`}
                              defaultValue={likertSettings.customImages?.[idx]?.imageUrl || ''}
                              onBlur={(e) => {
                                const newCustomImages = [...(likertSettings.customImages || [])];
                                newCustomImages[idx] = { value: idx + 1, imageUrl: e.target.value };
                                setSections(prevSections =>
                                  prevSections.map(section =>
                                    section.id === sectionId
                                      ? {
                                          ...section,
                                          questions: section.questions.map((q: any) =>
                                            q.id === question.id
                                              ? { ...q, settings: { ...likertSettings, customImages: newCustomImages } }
                                              : q
                                          )
                                        }
                                      : section
                                  )
                                );
                              }}
                              key={`likert-img-url-${question.id}-${idx}-${likertSettings.customImages?.[idx]?.imageUrl}`}
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">💡 Upload images or enter URLs for each scale point. Images will be displayed instead of icons.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case "nps":
        return (
          <div className="py-4">
            <NPSScale
              value={null}
              onChange={() => {}}
              settings={question.settings || DEFAULT_SETTINGS.nps}
              disabled={true}
            />
          </div>
        );
      case "star_rating":
        const starSettings = question.settings || DEFAULT_SETTINGS.star_rating;
        return (
          <div className="py-4 space-y-4">
            <StarRating
              value={null}
              onChange={() => {}}
              settings={starSettings}
              disabled={true}
            />
            {/* Settings Panel */}
            {!showPreview && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Display Settings</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Max Stars */}
                  <div>
                    <Label className="text-xs text-gray-600">Number of Stars</Label>
                    <select
                      value={starSettings.maxStars || 5}
                      onChange={(e) => {
                        const newMaxStars = parseInt(e.target.value);
                        const defaultLabels = Array.from({ length: newMaxStars }, (_, i) => ({
                          value: i + 1,
                          label: i === 0 ? 'Poor' : i === newMaxStars - 1 ? 'Excellent' : `${i + 1} Stars`
                        }));
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...starSettings, maxStars: newMaxStars, labels: defaultLabels } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded"
                    >
                      <option value={1}>1 Star</option>
                      <option value={2}>2 Stars</option>
                      <option value={3}>3 Stars</option>
                      <option value={4}>4 Stars</option>
                      <option value={5}>5 Stars</option>
                      <option value={6}>6 Stars</option>
                      <option value={7}>7 Stars</option>
                      <option value={8}>8 Stars</option>
                      <option value={9}>9 Stars</option>
                      <option value={10}>10 Stars</option>
                    </select>
                  </div>
                  {/* Icon Type */}
                  <div>
                    <Label className="text-xs text-gray-600">Icon Type</Label>
                    <select
                      value={starSettings.icon || 'star'}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...starSettings, icon: e.target.value } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded"
                    >
                      <option value="star">⭐ Star</option>
                      <option value="heart">❤️ Heart</option>
                      <option value="thumbsup">👍 Thumbs Up</option>
                      <option value="custom">🖼️ Custom Images</option>
                    </select>
                  </div>
                  {/* Size */}
                  <div>
                    <Label className="text-xs text-gray-600">Size</Label>
                    <select
                      value={starSettings.size || 'lg'}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...starSettings, size: e.target.value } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded"
                    >
                      <option value="sm">Small</option>
                      <option value="md">Medium</option>
                      <option value="lg">Large</option>
                      <option value="xl">Extra Large</option>
                    </select>
                  </div>
                  {/* Alignment */}
                  <div>
                    <Label className="text-xs text-gray-600">Alignment</Label>
                    <select
                      value={starSettings.alignment || 'center'}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...starSettings, alignment: e.target.value } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  {/* Active Color - only for non-custom icons */}
                  {starSettings.icon !== 'custom' && (
                    <div>
                      <Label className="text-xs text-gray-600">Active Color</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={starSettings.activeColor || '#fbbf24'}
                          onChange={(e) => {
                            setSections(prevSections =>
                              prevSections.map(section =>
                                section.id === sectionId
                                  ? {
                                      ...section,
                                      questions: section.questions.map((q: any) =>
                                        q.id === question.id
                                          ? { ...q, settings: { ...starSettings, activeColor: e.target.value } }
                                          : q
                                      )
                                    }
                                  : section
                              )
                            );
                          }}
                          className="w-8 h-8 rounded border cursor-pointer"
                        />
                        <span className="text-xs text-gray-500">{starSettings.activeColor || '#fbbf24'}</span>
                      </div>
                    </div>
                  )}
                  {/* Show Labels Toggle */}
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id={`star-labels-${question.id}`}
                      checked={starSettings.showLabel !== false}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...starSettings, showLabel: e.target.checked } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <Label htmlFor={`star-labels-${question.id}`} className="text-xs text-gray-600 cursor-pointer">
                      Show Labels
                    </Label>
                  </div>
                  {/* Allow Half Stars */}
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id={`star-half-${question.id}`}
                      checked={starSettings.allowHalf === true}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...starSettings, allowHalf: e.target.checked } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <Label htmlFor={`star-half-${question.id}`} className="text-xs text-gray-600 cursor-pointer">
                      Allow Half Stars
                    </Label>
                  </div>
                </div>
                {/* Custom Labels Section */}
                {starSettings.showLabel !== false && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Label className="text-xs text-gray-600 block mb-2">Customize Hover Labels</Label>
                    <div className="space-y-2">
                      {Array.from({ length: starSettings.maxStars || 5 }).map((_, idx) => {
                        // Get current label text
                        const currentLabels = starSettings.labels || [];
                        const currentLabel = currentLabels[idx]?.label || `${idx + 1} Stars`;
                        
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-16">{idx + 1} Star{idx > 0 ? 's' : ''}:</span>
                            <Input
                              type="text"
                              placeholder={`Label for ${idx + 1} star${idx > 0 ? 's' : ''}`}
                              defaultValue={currentLabel}
                              onBlur={(e) => {
                                const newLabels = Array.from({ length: starSettings.maxStars || 5 }, (_, i) => {
                                  const existingLabel = starSettings.labels?.[i]?.label || 
                                    (i === 0 ? 'Poor' : i === (starSettings.maxStars || 5) - 1 ? 'Excellent' : `${i + 1} Stars`);
                                  
                                  return {
                                    value: i + 1,
                                    label: i === idx ? (e.target.value || existingLabel) : existingLabel
                                  };
                                });
                                
                                setSections(prevSections =>
                                  prevSections.map(section =>
                                    section.id === sectionId
                                      ? {
                                          ...section,
                                          questions: section.questions.map((q: any) =>
                                            q.id === question.id
                                              ? { ...q, settings: { ...starSettings, labels: newLabels } }
                                              : q
                                          )
                                        }
                                      : section
                                  )
                                );
                              }}
                              key={`star-label-${question.id}-${idx}-${currentLabel}`}
                              className="text-xs h-8 flex-1"
                            />
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">💡 Customize the text shown when hovering over each star</p>
                  </div>
                )}
                {/* Custom Images Section */}
                {starSettings.icon === 'custom' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Label className="text-xs text-gray-600 block mb-2">Custom Images</Label>
                    {/* Image Requirements Info */}
                    <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-xs font-medium text-blue-900 mb-1">📐 Image Requirements:</p>
                      <ul className="text-xs text-blue-700 space-y-0.5 ml-3">
                        <li>• Recommended size: <strong>100×100 pixels (square, 1:1 ratio)</strong></li>
                        <li>• Format: PNG, JPG, GIF, SVG, or WebP</li>
                        <li>• Maximum file size: <strong>1MB</strong></li>
                      </ul>
                    </div>
                    <div className="space-y-4">
                      {/* Active/Selected Image */}
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-green-700">Active State (Selected)</span>
                          {starSettings.customImages?.activeImageUrl && (
                            <span className="text-xs text-green-600">✓ Image set</span>
                          )}
                        </div>
                        <div className="max-w-md mx-auto">
                          <S3ImageUpload
                            value={starSettings.customImages?.activeImageUrl || ''}
                            onChange={(url) => {
                              const newCustomImages = { ...(starSettings.customImages || {}), activeImageUrl: url };
                              setSections(prevSections =>
                                prevSections.map(section =>
                                  section.id === sectionId
                                    ? {
                                        ...section,
                                        questions: section.questions.map((q: any) =>
                                          q.id === question.id
                                            ? { ...q, settings: { ...starSettings, customImages: newCustomImages } }
                                            : q
                                        )
                                      }
                                    : section
                                )
                              );
                            }}
                            folder="questionnaire-images/star-rating"
                            placeholder="Upload image for selected state"
                            showPreview={true}
                            maxSize={1}
                          />
                        </div>
                        <div className="text-xs text-gray-400 text-center my-2">— or enter URL manually —</div>
                        <Input
                          type="url"
                          placeholder="https://example.com/active-star.png"
                          defaultValue={starSettings.customImages?.activeImageUrl || ''}
                          onBlur={(e) => {
                            const newCustomImages = { ...(starSettings.customImages || {}), activeImageUrl: e.target.value };
                            setSections(prevSections =>
                              prevSections.map(section =>
                                section.id === sectionId
                                  ? {
                                      ...section,
                                      questions: section.questions.map((q: any) =>
                                        q.id === question.id
                                          ? { ...q, settings: { ...starSettings, customImages: newCustomImages } }
                                          : q
                                      )
                                    }
                                  : section
                              )
                            );
                          }}
                          key={`star-active-url-${question.id}-${starSettings.customImages?.activeImageUrl}`}
                          className="text-xs h-8"
                        />
                      </div>
                      {/* Inactive/Unselected Image */}
                      <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-700">Inactive State (Unselected)</span>
                          {starSettings.customImages?.inactiveImageUrl && (
                            <span className="text-xs text-green-600">✓ Image set</span>
                          )}
                        </div>
                        <div className="max-w-md mx-auto">
                          <S3ImageUpload
                            value={starSettings.customImages?.inactiveImageUrl || ''}
                            onChange={(url) => {
                              const newCustomImages = { ...(starSettings.customImages || {}), inactiveImageUrl: url };
                              setSections(prevSections =>
                                prevSections.map(section =>
                                  section.id === sectionId
                                    ? {
                                        ...section,
                                        questions: section.questions.map((q: any) =>
                                          q.id === question.id
                                            ? { ...q, settings: { ...starSettings, customImages: newCustomImages } }
                                            : q
                                        )
                                      }
                                    : section
                                )
                              );
                            }}
                            folder="questionnaire-images/star-rating"
                            placeholder="Upload image for unselected state"
                            showPreview={true}
                            maxSize={1}
                          />
                        </div>
                        <div className="text-xs text-gray-400 text-center my-2">— or enter URL manually —</div>
                        <Input
                          type="url"
                          placeholder="https://example.com/inactive-star.png"
                          defaultValue={starSettings.customImages?.inactiveImageUrl || ''}
                          onBlur={(e) => {
                            const newCustomImages = { ...(starSettings.customImages || {}), inactiveImageUrl: e.target.value };
                            setSections(prevSections =>
                              prevSections.map(section =>
                                section.id === sectionId
                                  ? {
                                      ...section,
                                      questions: section.questions.map((q: any) =>
                                        q.id === question.id
                                          ? { ...q, settings: { ...starSettings, customImages: newCustomImages } }
                                          : q
                                      )
                                    }
                                  : section
                              )
                            );
                          }}
                          key={`star-inactive-url-${question.id}-${starSettings.customImages?.inactiveImageUrl}`}
                          className="text-xs h-8"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">💡 Upload or provide URLs for both states: one for selected (filled) and one for unselected (empty).</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case "drag_and_drop":
        const dndSettings = question.settings || DEFAULT_SETTINGS.drag_and_drop;
        return (
          <div className="py-4 space-y-4">
            {/* Settings Panel */}
            {!showPreview && (
              <div className="space-y-4">
                {/* Items Configuration */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Draggable Items</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newItem = {
                          id: `item-${Date.now()}`,
                          text: `Item ${(dndSettings.items?.length || 0) + 1}`,
                        };
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...dndSettings, items: [...(dndSettings.items || []), newItem] } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="px-3 py-1.5 text-xs bg-qsights-blue text-white rounded hover:bg-qsights-dark transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Item
                    </button>
                  </div>
                  <div className="space-y-3">
                    {dndSettings.items?.map((item: any, idx: number) => (
                      <div key={item.id} className="bg-white p-3 rounded border space-y-2">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                          <Input
                            value={item.text}
                            onChange={(e) => {
                              const newItems = [...(dndSettings.items || [])];
                              newItems[idx] = { ...item, text: e.target.value };
                              setSections(prevSections =>
                                prevSections.map(section =>
                                  section.id === sectionId
                                    ? {
                                        ...section,
                                        questions: section.questions.map((q: any) =>
                                          q.id === question.id
                                            ? { ...q, settings: { ...dndSettings, items: newItems } }
                                            : q
                                        )
                                      }
                                    : section
                                )
                              );
                            }}
                            placeholder="Item text"
                            className="flex-1 h-8 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = dndSettings.items.filter((_: any, i: number) => i !== idx);
                              setSections(prevSections =>
                                prevSections.map(section =>
                                  section.id === sectionId
                                    ? {
                                        ...section,
                                        questions: section.questions.map((q: any) =>
                                          q.id === question.id
                                            ? { ...q, settings: { ...dndSettings, items: newItems } }
                                            : q
                                        )
                                      }
                                    : section
                                )
                              );
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="ml-6">
                          <label className="text-xs text-gray-600 mb-1 block">Item Image (Optional)</label>
                          <S3ImageUpload
                            value={item.imageUrl || ''}
                            onChange={(url) => {
                              const newItems = [...(dndSettings.items || [])];
                              newItems[idx] = { ...item, imageUrl: url };
                              setSections(prevSections =>
                                prevSections.map(section =>
                                  section.id === sectionId
                                    ? {
                                        ...section,
                                        questions: section.questions.map((q: any) =>
                                          q.id === question.id
                                            ? { ...q, settings: { ...dndSettings, items: newItems } }
                                            : q
                                        )
                                      }
                                    : section
                                )
                              );
                            }}
                            folder="questionnaire-images/drag-drop/items"
                            questionId={`${question.id}-item-${idx}`}
                            placeholder="Upload item image"
                            maxSize={5}
                            showPreview={true}
                          />
                        </div>
                      </div>
                    ))}
                    {(!dndSettings.items || dndSettings.items.length === 0) && (
                      <p className="text-sm text-gray-500 text-center py-4">No items added yet. Click "Add Item" to start.</p>
                    )}
                  </div>
                </div>

                {/* Buckets Configuration */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Buckets</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                        const newBucket = {
                          id: `bucket-${Date.now()}`,
                          label: `Bucket ${(dndSettings.buckets?.length || 0) + 1}`,
                          color: colors[(dndSettings.buckets?.length || 0) % colors.length],
                        };
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...dndSettings, buckets: [...(dndSettings.buckets || []), newBucket] } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Bucket
                    </button>
                  </div>
                  <div className="space-y-3">
                    {dndSettings.buckets?.map((bucket: any, idx: number) => (
                      <div key={bucket.id} className="bg-white p-3 rounded border space-y-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-8 h-8 rounded flex-shrink-0"
                            style={{ backgroundColor: bucket.color || '#gray' }}
                          />
                          <Input
                            value={bucket.label}
                            onChange={(e) => {
                              const newBuckets = [...(dndSettings.buckets || [])];
                              newBuckets[idx] = { ...bucket, label: e.target.value };
                              setSections(prevSections =>
                                prevSections.map(section =>
                                  section.id === sectionId
                                    ? {
                                        ...section,
                                        questions: section.questions.map((q: any) =>
                                          q.id === question.id
                                            ? { ...q, settings: { ...dndSettings, buckets: newBuckets } }
                                            : q
                                        )
                                      }
                                    : section
                                )
                              );
                            }}
                            placeholder="Bucket label"
                            className="flex-1 h-8 text-sm"
                          />
                          <input
                            type="color"
                            value={bucket.color || '#3b82f6'}
                            onChange={(e) => {
                              const newBuckets = [...(dndSettings.buckets || [])];
                              newBuckets[idx] = { ...bucket, color: e.target.value };
                              setSections(prevSections =>
                                prevSections.map(section =>
                                  section.id === sectionId
                                    ? {
                                        ...section,
                                        questions: section.questions.map((q: any) =>
                                          q.id === question.id
                                            ? { ...q, settings: { ...dndSettings, buckets: newBuckets } }
                                            : q
                                        )
                                      }
                                    : section
                                )
                              );
                            }}
                            className="w-10 h-8 rounded cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newBuckets = dndSettings.buckets.filter((_: any, i: number) => i !== idx);
                              setSections(prevSections =>
                                prevSections.map(section =>
                                  section.id === sectionId
                                    ? {
                                        ...section,
                                        questions: section.questions.map((q: any) =>
                                          q.id === question.id
                                            ? { ...q, settings: { ...dndSettings, buckets: newBuckets } }
                                            : q
                                        )
                                      }
                                    : section
                                )
                              );
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="ml-10">
                          <label className="text-xs text-gray-600 mb-1 block">Bucket Image (Optional)</label>
                          <S3ImageUpload
                            value={bucket.imageUrl || ''}
                            onChange={(url) => {
                              const newBuckets = [...(dndSettings.buckets || [])];
                              newBuckets[idx] = { ...bucket, imageUrl: url };
                              setSections(prevSections =>
                                prevSections.map(section =>
                                  section.id === sectionId
                                    ? {
                                        ...section,
                                        questions: section.questions.map((q: any) =>
                                          q.id === question.id
                                            ? { ...q, settings: { ...dndSettings, buckets: newBuckets } }
                                            : q
                                        )
                                      }
                                    : section
                                )
                              );
                            }}
                            folder="questionnaire-images/drag-drop/buckets"
                            questionId={`${question.id}-bucket-${idx}`}
                            placeholder="Upload bucket image"
                            maxSize={5}
                            showPreview={true}
                          />
                        </div>
                      </div>
                    ))}
                    {(!dndSettings.buckets || dndSettings.buckets.length === 0) && (
                      <p className="text-sm text-gray-500 text-center py-4">No buckets added yet. Click "Add Bucket" to start.</p>
                    )}
                  </div>
                </div>

                {/* Assessment Mode - Correct Answers */}
                {questionnaireType === "Assessment" && dndSettings.items?.length > 0 && dndSettings.buckets?.length > 0 && (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckSquare className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-900">Correct Answers (Assessment Mode)</span>
                    </div>
                    <p className="text-xs text-amber-700 mb-3">Assign items to their correct buckets for scoring:</p>
                    {dndSettings.buckets.map((bucket: any) => (
                      <div key={bucket.id} className="mb-3 p-3 bg-white rounded border">
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: bucket.color }}
                          />
                          <span className="font-medium text-sm">{bucket.label}</span>
                        </div>
                        <div className="space-y-1">
                          {dndSettings.items.map((item: any) => {
                            const isCorrect = question.correctAnswers?.find((b: any) => b.id === bucket.id)?.acceptedItems?.includes(item.id);
                            return (
                              <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={isCorrect || false}
                                  onChange={(e) => {
                                    let correctAnswers = question.correctAnswers || dndSettings.buckets.map((b: any) => ({ id: b.id, label: b.label, acceptedItems: [] }));
                                    correctAnswers = correctAnswers.map((ca: any) => {
                                      if (ca.id === bucket.id) {
                                        const items = ca.acceptedItems || [];
                                        if (e.target.checked) {
                                          return { ...ca, acceptedItems: [...items, item.id] };
                                        } else {
                                          return { ...ca, acceptedItems: items.filter((id: string) => id !== item.id) };
                                        }
                                      }
                                      // Remove from other buckets if checked here
                                      if (e.target.checked) {
                                        return { ...ca, acceptedItems: (ca.acceptedItems || []).filter((id: string) => id !== item.id) };
                                      }
                                      return ca;
                                    });
                                    setSections(prevSections =>
                                      prevSections.map(section =>
                                        section.id === sectionId
                                          ? {
                                              ...section,
                                              questions: section.questions.map((q: any) =>
                                                q.id === question.id
                                                  ? { ...q, correctAnswers }
                                                  : q
                                              )
                                            }
                                          : section
                                      )
                                    );
                                  }}
                                  className="rounded"
                                />
                                <span>{item.text}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Layout & Behavior Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded border">
                    <Label className="text-xs text-gray-600 mb-2 block">Layout</Label>
                    <select
                      value={dndSettings.layout || 'responsive'}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...dndSettings, layout: e.target.value } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                    >
                      <option value="responsive">Responsive (Auto)</option>
                      <option value="horizontal">Horizontal</option>
                      <option value="vertical">Vertical</option>
                    </select>
                  </div>
                  <div className="p-3 bg-gray-50 rounded border">
                    <Label className="text-xs text-gray-600 mb-2 block">Required Mode</Label>
                    <select
                      value={dndSettings.requiredMode || 'all'}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...dndSettings, requiredMode: e.target.value } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                    >
                      <option value="all">All items must be placed</option>
                      <option value="at-least-one">At least one item</option>
                      <option value="custom">Custom requirement</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Message */}
            {dndSettings.items?.length > 0 && dndSettings.buckets?.length > 0 ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Preview:</strong> Participants will drag {dndSettings.items.length} item(s) into {dndSettings.buckets.length} bucket(s).
                  {questionnaireType === "Assessment" && " Answers will be auto-scored based on correct bucket placements."}
                </p>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  Please add at least one item and one bucket to configure this question.
                </p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Selection Mode Banner */}
        {selectionMode && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg p-4 text-white">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-6 w-6" />
              <div>
                <h3 className="text-lg font-semibold">Creating Questionnaire for Evaluation</h3>
                <p className="text-green-100 text-sm">This questionnaire will be used for staff evaluation after saving</p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href={selectionMode ? "/questionnaires?mode=select-for-evaluation" : "/questionnaires"}
              className="group flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Back</span>
            </a>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Questionnaire Builder</h1>
              <p className="text-sm text-gray-500 mt-1">
                Design and configure your questionnaire
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? "Edit Mode" : "Preview"}
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Questionnaire'}
            </button>
          </div>
        </div>

        {/* Info Boxes - Positioned below page title */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stats */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-900">Total Sections</span>
                  <span className="text-lg font-bold text-blue-900">{sections.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-900">Total Questions</span>
                  <span className="text-lg font-bold text-blue-900">
                    {sections.reduce((acc, section) => acc + section.questions.length, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-900">Required Questions</span>
                  <span className="text-lg font-bold text-blue-900">
                    {sections.reduce(
                      (acc, section) =>
                        acc + section.questions.filter((q: any) => q.required).length,
                      0
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Question Types */}
            <Card className="bg-qsights-light border-purple-200">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-purple-900 mb-2">
                  📝 Question Types
                </h4>
                <ul className="text-xs text-purple-800 space-y-1.5">
                  <li>• Multiple Choice & Multi-Select</li>
                  <li>• Text Input & Sliders</li>
                  <li>• Rating & Matrix Grids</li>
                  <li>• Drag to reorder sections</li>
                </ul>
              </CardContent>
            </Card>
          </div>
          <div className="hidden lg:block"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Builder Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Questionnaire Details */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-qsights-blue" />
                  Questionnaire Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="program" className="text-sm font-medium text-gray-700">
                      Program <span className="text-red-500">*</span>
                    </Label>
                    {loadingPrograms ? (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500">
                        Loading programs...
                      </div>
                    ) : (
                      <select
                        id="program"
                        value={selectedProgramId}
                        onChange={(e) => setSelectedProgramId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a program</option>
                        {programs.map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                      Questionnaire Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={questionnaireName}
                      onChange={(e) => setQuestionnaireName(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Code</Label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-700 flex items-center">
                      {questionnaireCode || "Auto-generated code"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Import from Excel/CSV Section */}
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Bulk Import Questions</h3>
                      <p className="text-sm text-gray-500">Import questions from Excel or CSV file</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const blob = await questionnairesApi.downloadImportTemplate();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "questionnaire_import_template.xlsx";
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                          toast({ title: "Success", description: "Template downloaded!", variant: "success" });
                        } catch (err) {
                          toast({ title: "Error", description: "Failed to download template", variant: "error" });
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Template
                    </button>
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Import Excel/CSV
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sections */}
            {!showPreview ? (
              <div className="space-y-4">
                {mounted && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleSectionDragEnd}
                  >
                    <SortableContext
                      items={sections.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {sections.map((section, sectionIdx) => (
                          <SortableSection
                            key={section.id}
                            section={section}
                            sectionIdx={sectionIdx}
                            sections={sections}
                            setSections={setSections}
                            expandedSections={expandedSections}
                            toggleSection={toggleSection}
                            deleteSection={deleteSection}
                            questionTypes={questionTypes}
                            addQuestion={addQuestion}
                            getQuestionIcon={getQuestionIcon}
                            deleteQuestion={deleteQuestion}
                            duplicateQuestion={duplicateQuestion}
                            updateQuestionOption={updateQuestionOption}
                            addQuestionOption={addQuestionOption}
                            removeQuestionOption={removeQuestionOption}
                            toggleCorrectAnswer={toggleCorrectAnswer}
                            questionnaireType={questionnaireType}
                            renderQuestionPreview={renderQuestionPreview}
                            handleQuestionDragEnd={handleQuestionDragEnd}
                            setSelectedQuestionForTranslation={setSelectedQuestionForTranslation}
                            setShowMultilingualEditor={setShowMultilingualEditor}
                            setTranslationData={setTranslationData}
                            setSelectedQuestion={setSelectedQuestion}
                            setShowConditionalLogic={setShowConditionalLogic}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                {/* Add Section Button */}
                <button
                  onClick={addSection}
                  className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-qsights-blue hover:text-qsights-blue hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Add Section
                </button>
              </div>
            ) : (
              /* Preview Mode */
              <Card>
                <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-qsights-blue to-qsights-blue/80 text-white">
                  <CardTitle className="text-xl font-bold">{questionnaireName}</CardTitle>
                  <p className="text-sm text-blue-100 mt-1">Preview Mode</p>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  {sections.map((section, sectionIdx) => (
                    <div key={section.id} className="space-y-4">
                      <div className="border-l-4 border-qsights-blue pl-4">
                        <h3 className="text-lg font-bold text-gray-900">{section.title}</h3>
                        {section.description && (
                          <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                        )}
                      </div>
                      <div className="space-y-6 pl-6">
                        {section.questions.map((question: any, questionIdx: number) => (
                          <div key={question.id} className="space-y-2">
                            {question.type !== "information" && (
                              <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                <span>
                                  {sectionIdx + 1}.{questionIdx + 1}
                                </span>
                                {question.isRichText && question.formattedQuestion ? (
                                  <span dangerouslySetInnerHTML={{ __html: question.formattedQuestion }} />
                                ) : (
                                  <span>{question.question}</span>
                                )}
                                {question.required && <span className="text-red-500">*</span>}
                              </label>
                            )}
                            {question.type === "information" && (
                              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                                {question.isRichText && question.formattedQuestion ? (
                                  <div dangerouslySetInnerHTML={{ __html: question.formattedQuestion }} className="text-sm text-blue-900" />
                                ) : (
                                  <p className="text-sm text-blue-900">{question.description || question.question}</p>
                                )}
                              </div>
                            )}
                            {question.type !== "information" && renderQuestionForParticipant(question)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                    <button className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors">
                      Cancel
                    </button>
                    <button className="px-6 py-2 bg-qsights-cyan text-white rounded-lg font-medium hover:bg-qsights-cyan/90 transition-colors">
                      Submit Questionnaire
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-qsights-blue" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700">Questionnaire Type</label>
                  <select 
                    value={questionnaireType}
                    onChange={(e) => setQuestionnaireType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option>Survey</option>
                    <option>Poll</option>
                    <option>Assessment</option>
                    <option>Feedback</option>
                    <option>Evaluation</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700">Languages</label>
                  <div className="flex flex-wrap gap-2">
                    {enabledLanguages.map((lang) => (
                      <span
                        key={lang}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-gray-200">
                  <span className="text-xs font-medium text-gray-700">Randomize Questions</span>
                  <input 
                    type="checkbox" 
                    checked={randomizeQuestions}
                    onChange={(e) => setRandomizeQuestions(e.target.checked)}
                    className="w-4 h-4 cursor-pointer" 
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-medium text-gray-700">Randomize Options</span>
                  <input 
                    type="checkbox" 
                    checked={randomizeOptions}
                    onChange={(e) => setRandomizeOptions(e.target.checked)}
                    className="w-4 h-4 cursor-pointer" 
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-medium text-gray-700">Show Progress Bar</span>
                  <input 
                    type="checkbox" 
                    checked={showProgressBar}
                    onChange={(e) => setShowProgressBar(e.target.checked)}
                    className="w-4 h-4 cursor-pointer" 
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-medium text-gray-700">Allow Save & Continue</span>
                  <input 
                    type="checkbox" 
                    checked={allowSaveAndContinue}
                    onChange={(e) => setAllowSaveAndContinue(e.target.checked)}
                    className="w-4 h-4 cursor-pointer" 
                  />
                </div>
                {/* Participant View Display Settings */}
                <div className="pt-3 mt-3 border-t border-gray-200">
                  <span className="text-xs font-semibold text-gray-800 block mb-2">Participant View Display</span>
                  
                  {/* Header (Main Title) Settings */}
                  <div className="p-2 bg-gray-50 rounded mb-2">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs font-medium text-gray-700">Show Header</span>
                      <input 
                        type="checkbox" 
                        checked={showHeaderInParticipantView}
                        onChange={(e) => setShowHeaderInParticipantView(e.target.checked)}
                        className="w-4 h-4 cursor-pointer" 
                      />
                    </div>
                    {showHeaderInParticipantView && (
                      <div className="py-1">
                        <Input
                          type="text"
                          placeholder="Custom header text (leave empty for questionnaire title)"
                          value={customHeaderText}
                          onChange={(e) => setCustomHeaderText(e.target.value)}
                          className="text-xs h-7"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Section Header (Subheader) Settings */}
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs font-medium text-gray-700">Show Section Header</span>
                      <input 
                        type="checkbox" 
                        checked={showSectionHeader}
                        onChange={(e) => setShowSectionHeader(e.target.checked)}
                        className="w-4 h-4 cursor-pointer" 
                      />
                    </div>
                    {showSectionHeader && (
                      <div className="py-1">
                        <select
                          value={sectionHeaderFormat}
                          onChange={(e) => setSectionHeaderFormat(e.target.value as 'numbered' | 'titleOnly')}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded"
                        >
                          <option value="numbered">Section 1: Title</option>
                          <option value="titleOnly">Title Only</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Question Types */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Settings className="w-4 h-4 text-qsights-blue" />
                  Question Types
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {questionTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-move"
                  >
                    <type.icon className={`w-5 h-5 ${type.color}`} />
                    <span className="text-sm font-medium text-gray-700">{type.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Conditional Logic Drawer */}
      {showConditionalLogic && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end">
          <div className="w-full max-w-md h-full bg-white shadow-xl animate-in slide-in-from-right">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Conditional Logic</h3>
                <p className="text-sm text-gray-500 mt-1">Show/hide questions based on answers</p>
              </div>
              <button
                onClick={() => setShowConditionalLogic(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-qsights-light border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <GitBranch className="w-5 h-5 text-qsights-cyan mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-900 mb-2">Show this question if:</p>
                      <div className="space-y-3">
                        <select className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm">
                          <option>Select a question...</option>
                          <option>Q1: What is your employee ID?</option>
                          <option>Q2: What is your department?</option>
                        </select>
                        <select className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm">
                          <option>is equal to</option>
                          <option>is not equal to</option>
                          <option>contains</option>
                          <option>is greater than</option>
                          <option>is less than</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Enter value..."
                          className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button className="w-full py-2 border-2 border-dashed border-purple-300 text-qsights-cyan rounded-lg text-sm font-medium hover:bg-qsights-light transition-colors">
                  + Add Condition
                </button>

                <div className="pt-4 border-t border-gray-200">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="logic" defaultChecked />
                    <span className="text-gray-700">Match ALL conditions (AND)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm mt-2">
                    <input type="radio" name="logic" />
                    <span className="text-gray-700">Match ANY condition (OR)</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => setShowConditionalLogic(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowConditionalLogic(false)}
                  className="flex-1 px-4 py-2 bg-qsights-cyan text-white rounded-lg font-medium hover:bg-qsights-cyan/90 transition-colors"
                >
                  Apply Logic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multilingual Editor Modal */}
      {showMultilingualEditor && selectedQuestionForTranslation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-qsights-blue to-qsights-blue/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <Globe className="w-6 h-6" />
                  <div>
                    <h3 className="text-xl font-bold">Multilingual Editor</h3>
                    <p className="text-sm text-blue-100 mt-1">
                      Translate question across languages
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-2 bg-white/20 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode("tabs")}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        viewMode === "tabs"
                          ? "bg-white text-qsights-blue"
                          : "text-white hover:bg-white/10"
                      }`}
                    >
                      Tabs
                    </button>
                    <button
                      onClick={() => setViewMode("side-by-side")}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        viewMode === "side-by-side"
                          ? "bg-white text-qsights-blue"
                          : "text-white hover:bg-white/10"
                      }`}
                    >
                      Side-by-Side
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setShowMultilingualEditor(false);
                      setSelectedQuestionForTranslation(null);
                    }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {viewMode === "tabs" ? (
                /* Tab View */
                <div className="space-y-4">
                  {/* Language Tabs */}
                  <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto">
                    {enabledLanguages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setActiveLanguage(lang)}
                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                          activeLanguage === lang
                            ? "border-qsights-blue text-qsights-blue"
                            : "border-transparent text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {getLanguageName(lang)}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowLanguageSelector(true)}
                      className="px-4 py-2 text-sm font-medium text-qsights-blue hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 ml-2 border-2 border-qsights-blue"
                    >
                      <Plus className="w-4 h-4" />
                      Add Language
                    </button>
                  </div>

                  {/* Question Editor for Active Language */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Question Text ({activeLanguage})
                      </Label>
                      <textarea
                        value={
                          activeLanguage === "EN"
                            ? selectedQuestionForTranslation.question
                            : (translationData[activeLanguage]?.question || selectedQuestionForTranslation.translations?.[activeLanguage]?.question || "")
                        }
                        onChange={(e) => {
                          if (activeLanguage !== "EN") {
                            setTranslationData({
                              ...translationData,
                              [activeLanguage]: {
                                ...translationData[activeLanguage],
                                question: e.target.value
                              }
                            });
                          }
                        }}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent"
                        placeholder={`Enter question in ${activeLanguage}...`}
                        disabled={activeLanguage === "EN"}
                      />
                    </div>

                    {/* Options for MCQ/Multi */}
                    {(selectedQuestionForTranslation.type === "mcq" ||
                      selectedQuestionForTranslation.type === "multi") && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Options ({activeLanguage})
                        </Label>
                        <div className="space-y-2">
                          {selectedQuestionForTranslation.options?.map(
                            (option: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 w-8">
                                  {idx + 1}.
                                </span>
                                <input
                                  type="text"
                                  value={
                                    activeLanguage === "EN" 
                                      ? option 
                                      : (translationData[activeLanguage]?.options?.[idx] || selectedQuestionForTranslation.translations?.[activeLanguage]?.options?.[idx] || "")
                                  }
                                  onChange={(e) => {
                                    if (activeLanguage !== "EN") {
                                      const currentOptions = translationData[activeLanguage]?.options || [];
                                      const newOptions = [...currentOptions];
                                      newOptions[idx] = e.target.value;
                                      setTranslationData({
                                        ...translationData,
                                        [activeLanguage]: {
                                          ...translationData[activeLanguage],
                                          options: newOptions
                                        }
                                      });
                                    }
                                  }}
                                  placeholder={`Option ${idx + 1} in ${activeLanguage}...`}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                                  disabled={activeLanguage === "EN"}
                                />
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Matrix Rows/Columns */}
                    {selectedQuestionForTranslation.type === "matrix" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Rows ({activeLanguage})
                          </Label>
                          <div className="space-y-2">
                            {selectedQuestionForTranslation.rows?.map(
                              (row: string, idx: number) => (
                                <input
                                  key={idx}
                                  type="text"
                                  value={
                                    activeLanguage === "EN" 
                                      ? row 
                                      : (translationData[activeLanguage]?.rows?.[idx] || selectedQuestionForTranslation.translations?.[activeLanguage]?.rows?.[idx] || "")
                                  }
                                  onChange={(e) => {
                                    if (activeLanguage !== "EN") {
                                      const currentRows = translationData[activeLanguage]?.rows || [];
                                      const newRows = [...currentRows];
                                      newRows[idx] = e.target.value;
                                      setTranslationData({
                                        ...translationData,
                                        [activeLanguage]: {
                                          ...translationData[activeLanguage],
                                          rows: newRows
                                        }
                                      });
                                    }
                                  }}
                                  placeholder={`Row ${idx + 1} in ${activeLanguage}...`}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                                  disabled={activeLanguage === "EN"}
                                />
                              )
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Columns ({activeLanguage})
                          </Label>
                          <div className="space-y-2">
                            {selectedQuestionForTranslation.columns?.map(
                              (col: string, idx: number) => (
                                <input
                                  key={idx}
                                  type="text"
                                  value={
                                    activeLanguage === "EN" 
                                      ? col 
                                      : (translationData[activeLanguage]?.columns?.[idx] || selectedQuestionForTranslation.translations?.[activeLanguage]?.columns?.[idx] || "")
                                  }
                                  onChange={(e) => {
                                    if (activeLanguage !== "EN") {
                                      const currentColumns = translationData[activeLanguage]?.columns || [];
                                      const newColumns = [...currentColumns];
                                      newColumns[idx] = e.target.value;
                                      setTranslationData({
                                        ...translationData,
                                        [activeLanguage]: {
                                          ...translationData[activeLanguage],
                                          columns: newColumns
                                        }
                                      });
                                    }
                                  }}
                                  placeholder={`Column ${idx + 1} in ${activeLanguage}...`}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                                  disabled={activeLanguage === "EN"}
                                />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Placeholder for Text */}
                    {selectedQuestionForTranslation.type === "text" &&
                      selectedQuestionForTranslation.placeholder && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Placeholder ({activeLanguage})
                          </Label>
                          <input
                            type="text"
                            value={
                              activeLanguage === "EN"
                                ? selectedQuestionForTranslation.placeholder
                                : (translationData[activeLanguage]?.placeholder || selectedQuestionForTranslation.translations?.[activeLanguage]?.placeholder || "")
                            }
                            onChange={(e) => {
                              if (activeLanguage !== "EN") {
                                setTranslationData({
                                  ...translationData,
                                  [activeLanguage]: {
                                    ...translationData[activeLanguage],
                                    placeholder: e.target.value
                                  }
                                });
                              }
                            }}
                            placeholder={`Enter placeholder in ${activeLanguage}...`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                            disabled={activeLanguage === "EN"}
                          />
                        </div>
                      )}
                  </div>
                </div>
              ) : (
                /* Side-by-Side View */
                <div className="space-y-4">
                  {/* Add Language Button */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Translate your question across multiple languages
                    </p>
                    <button
                      onClick={() => setShowLanguageSelector(true)}
                      className="px-4 py-2 text-sm font-medium text-qsights-blue hover:bg-blue-50 border border-qsights-blue rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Language
                    </button>
                  </div>

                  {/* Side-by-Side Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {enabledLanguages.map((lang) => (
                      <Card key={lang} className="border-2 border-gray-200">
                        <CardHeader className="bg-gray-50 border-b border-gray-200 py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  lang === "EN"
                                    ? "bg-blue-500"
                                    : lang === "ES"
                                    ? "bg-red-500"
                                    : lang === "FR"
                                    ? "bg-qsights-light0"
                                    : "bg-yellow-500"
                                }`}
                              ></div>
                              <h4 className="font-bold text-sm text-gray-900">
                                {getLanguageName(lang)}
                              </h4>
                            </div>
                            {lang !== "EN" && (
                              <button
                                className="p-1 hover:bg-red-50 rounded transition-colors"
                                title="Remove language"
                              >
                                <X className="w-4 h-4 text-red-600" />
                              </button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                          {/* Question */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">
                              Question
                            </label>
                            <textarea
                              value={
                                lang === "EN"
                                  ? selectedQuestionForTranslation.question
                                  : (translationData[lang]?.question || selectedQuestionForTranslation.translations?.[lang]?.question || "")
                              }
                              onChange={(e) => {
                                if (lang !== "EN") {
                                  setTranslationData({
                                    ...translationData,
                                    [lang]: {
                                      ...translationData[lang],
                                      question: e.target.value
                                    }
                                  });
                                }
                              }}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                              placeholder={`Question in ${lang}...`}
                              disabled={lang === "EN"}
                            />
                          </div>

                          {/* Options */}
                          {(selectedQuestionForTranslation.type === "mcq" ||
                            selectedQuestionForTranslation.type === "multi") && (
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">
                                Options
                              </label>
                              <div className="space-y-1">
                                {selectedQuestionForTranslation.options?.map(
                                  (option: string, idx: number) => (
                                    <input
                                      key={idx}
                                      type="text"
                                      value={
                                        lang === "EN" 
                                          ? option 
                                          : (translationData[lang]?.options?.[idx] || selectedQuestionForTranslation.translations?.[lang]?.options?.[idx] || "")
                                      }
                                      onChange={(e) => {
                                        if (lang !== "EN") {
                                          const currentOptions = translationData[lang]?.options || [];
                                          const newOptions = [...currentOptions];
                                          newOptions[idx] = e.target.value;
                                          setTranslationData({
                                            ...translationData,
                                            [lang]: {
                                              ...translationData[lang],
                                              options: newOptions
                                            }
                                          });
                                        }
                                      }}
                                      placeholder={`Option ${idx + 1}...`}
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-qsights-blue"
                                      disabled={lang === "EN"}
                                    />
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {/* Placeholder */}
                          {selectedQuestionForTranslation.type === "text" &&
                            selectedQuestionForTranslation.placeholder && (
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">
                                  Placeholder
                                </label>
                                <input
                                  type="text"
                                  value={
                                    lang === "EN"
                                      ? selectedQuestionForTranslation.placeholder
                                      : (translationData[lang]?.placeholder || selectedQuestionForTranslation.translations?.[lang]?.placeholder || "")
                                  }
                                  onChange={(e) => {
                                    if (lang !== "EN") {
                                      setTranslationData({
                                        ...translationData,
                                        [lang]: {
                                          ...translationData[lang],
                                          placeholder: e.target.value
                                        }
                                      });
                                    }
                                  }}
                                  placeholder={`Placeholder in ${lang}...`}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-qsights-blue"
                                  disabled={lang === "EN"}
                                />
                              </div>
                            )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{enabledLanguages.length}</span> languages
                configured
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMultilingualEditor(false);
                    setSelectedQuestionForTranslation(null);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Save translations to the question
                    if (selectedQuestionForTranslation) {
                      const updatedSections = sections.map(section => ({
                        ...section,
                        questions: section.questions.map(q => {
                          if (q.id === selectedQuestionForTranslation.id) {
                            return {
                              ...q,
                              translations: {
                                ...(q.translations || {}),
                                ...translationData
                              }
                            };
                          }
                          return q;
                        })
                      }));
                      setSections(updatedSections);
                      toast({ 
                        title: "Success!", 
                        description: "Translations saved successfully!", 
                        variant: "success" 
                      });
                    }
                    setShowMultilingualEditor(false);
                    setSelectedQuestionForTranslation(null);
                    setTranslationData({});
                  }}
                  className="px-6 py-2 bg-qsights-cyan text-white rounded-lg font-medium hover:bg-qsights-cyan/90 transition-colors"
                >
                  Save Translations
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Language Selector Modal */}
      {showLanguageSelector && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-qsights-blue to-blue-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <Globe className="w-6 h-6" />
                  <div>
                    <h3 className="text-xl font-bold">Add Language</h3>
                    <p className="text-sm text-blue-100 mt-1">
                      Select a language to add to your questionnaire
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLanguageSelector(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Language List */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableLanguages
                  .filter(lang => !enabledLanguages.includes(lang.code))
                  .map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setEnabledLanguages([...enabledLanguages, lang.code]);
                        setActiveLanguage(lang.code);
                        setShowLanguageSelector(false);
                        toast({ 
                          title: "Success!", 
                          description: `Added ${lang.name}`, 
                          variant: "success" 
                        });
                      }}
                      className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-qsights-blue hover:bg-blue-50 transition-all text-left group"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-qsights-blue to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform">
                        {lang.code}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 group-hover:text-qsights-blue transition-colors">
                          {lang.name}
                        </p>
                        <p className="text-xs text-gray-500">Click to add</p>
                      </div>
                      <Plus className="w-5 h-5 text-gray-400 group-hover:text-qsights-blue transition-colors" />
                    </button>
                  ))}
              </div>
              {availableLanguages.filter(lang => !enabledLanguages.includes(lang.code)).length === 0 && (
                <div className="text-center py-12">
                  <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">All available languages have been added</p>
                  <p className="text-sm text-gray-500 mt-2">You've configured all supported languages</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{enabledLanguages.length}</span> of <span className="font-medium">{availableLanguages.length}</span> languages configured
                </p>
                <button
                  onClick={() => setShowLanguageSelector(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Conditional Logic Modal */}
      {showConditionalLogic && selectedQuestion !== null && (
        <EnhancedConditionalLogicEditor
          question={sections.flatMap(s => s.questions).find((q: any) => q.id === selectedQuestion)!}
          allQuestions={sections.flatMap(s => s.questions) as QuestionWithLogic[]}
          onSave={(logic: ConditionalLogic | null) => {
            setSections(prevSections =>
              prevSections.map(section => ({
                ...section,
                questions: section.questions.map((q: any) =>
                  q.id === selectedQuestion
                    ? { ...q, conditionalLogic: logic }
                    : q
                )
              }))
            );
            setShowConditionalLogic(false);
            setSelectedQuestion(null);
            toast({
              title: "Success!",
              description: logic ? "Conditional logic saved" : "Conditional logic removed",
              variant: "success",
            });
          }}
          onCancel={() => {
            setShowConditionalLogic(false);
            setSelectedQuestion(null);
          }}
        />
      )}

      {/* Import Modal */}
      <ImportPreviewModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={async (importedSections) => {
          // Convert imported sections to the internal format
          const newSections = importedSections.map((importedSection, idx) => ({
            id: Date.now() + idx,
            title: importedSection.title,
            description: "",
            questions: importedSection.questions.map((q, qIdx) => {
              const typeMapping: Record<string, string> = {
                radio: "mcq",
                checkbox: "multi",
                text: "text",
                textarea: "text",
                rating: "rating",
                scale: "slider",
                matrix: "matrix",
                information: "information",
              };
              
              const questionBase: any = {
                id: Date.now() + idx * 1000 + qIdx,
                type: typeMapping[q.type] || q.type,
                question: q.title,
                required: q.is_required,
                isRichText: false,
                formattedQuestion: "",
                formattedOptions: [],
                description: "",
                conditionalLogic: null,
                parentQuestionId: null,
                conditionalValue: null,
                nestingLevel: 0,
              };

              // Add type-specific fields
              if (q.type === "radio" || q.type === "checkbox") {
                questionBase.options = q.options?.map(opt => opt.text) || [];
                questionBase.correctAnswers = q.options?.filter(opt => opt.is_correct).map(opt => opt.text) || [];
              } else if (q.type === "rating") {
                questionBase.scale = q.settings?.scale || 5;
              } else if (q.type === "scale") {
                questionBase.min = q.settings?.min || 0;
                questionBase.max = q.settings?.max || 100;
              } else if (q.type === "matrix") {
                questionBase.rows = q.settings?.rows || ["Row 1"];
                questionBase.columns = q.settings?.columns || ["Column 1"];
              }

              return questionBase;
            }),
          }));

          // Append to existing sections or replace first empty section
          setSections(prevSections => {
            // If only one empty section exists, replace it
            if (prevSections.length === 1 && prevSections[0].questions.length === 0) {
              return newSections;
            }
            // Otherwise append
            return [...prevSections, ...newSections];
          });

          // Expand all new sections
          setExpandedSections(prev => [...prev, ...newSections.map(s => s.id)]);

          toast({
            title: "Import Successful",
            description: `Imported ${newSections.length} sections with ${newSections.reduce((acc, s) => acc + s.questions.length, 0)} questions`,
            variant: "success",
          });
        }}
      />
    </AppLayout>
  );
}

export default function QuestionnaireBuilderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading questionnaire builder...</p>
        </div>
      </div>
    }>
      <QuestionnaireBuilderPageContent />
    </Suspense>
  );
}
