"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import S3ImageUpload from "@/components/S3ImageUpload";
import BulkImageUpload from "@/components/BulkImageUpload";
import { ValueDisplayModeConfig } from "@/components/ValueDisplayModeConfig";
import { getPresignedUrl, isS3Url, isPresignedUrl } from '@/lib/s3Utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import IsolatedTextInput from "@/components/IsolatedTextInput";
import EnhancedConditionalLogicEditor from "@/components/EnhancedConditionalLogicEditor";
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Trash2,
  Eye,
  Save,
  ChevronDown,
  ChevronUp,
  XCircle,
  CheckSquare,
  CheckCircle,
  List,
  Type,
  Sliders,
  Star,
  LayoutGrid,
  Settings,
  Globe,
  GitBranch,
  X,
  Copy,
  FileText,
  Gauge,
  ThumbsUp,
  TrendingUp,
  Smile,
  Heart,
  Image as ImageIcon,
  MoveVertical,
  Link2,
  ClipboardList,
} from "lucide-react";
import { questionnairesApi, programsApi, type Program } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { ConditionalLogic, QuestionWithLogic } from "@/types/conditionalLogic";
import {
  SliderScale,
  DialGauge,
  LikertVisual,
  NPSScale,
  StarRating,
  DragDropBucket,
  DEFAULT_SETTINGS,
} from "@/components/questions";
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

export default function ViewQuestionnairePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const questionnaireId = params.id as string;
  const mode = searchParams.get('mode') || 'edit';
  const returnTo = searchParams.get('return');

  // Preserve scroll position across state updates that rebuild the DOM
  const withPreservedScroll = useCallback((fn: () => void) => {
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    fn();
    requestAnimationFrame(() => window.scrollTo(0, scrollY));
  }, []);
  
  const [questionnaire, setQuestionnaire] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(mode === 'preview');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<number[]>([]);
  const [questionnaireType, setQuestionnaireType] = useState("Survey");
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [showProgressBar, setShowProgressBar] = useState(true);
  const [allowSaveAndContinue, setAllowSaveAndContinue] = useState(true);
  const [showHeaderInParticipantView, setShowHeaderInParticipantView] = useState(true);
  const [customHeaderText, setCustomHeaderText] = useState('');
  const [showSectionHeader, setShowSectionHeader] = useState(true);
  const [sectionHeaderFormat, setSectionHeaderFormat] = useState<'numbered' | 'titleOnly'>('numbered');
  const [enabledLanguages, setEnabledLanguages] = useState(["EN"]);
  const [activeLanguage, setActiveLanguage] = useState("EN");
  const [showMultilingualEditor, setShowMultilingualEditor] = useState(false);
  const [selectedQuestionForTranslation, setSelectedQuestionForTranslation] = useState<any>(null);
  const [showConditionalLogic, setShowConditionalLogic] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"tabs" | "side-by-side">("tabs");
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [translationData, setTranslationData] = useState<any>({});

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
    { id: "sct_likert", label: "Script Concordance (SCT) Likert", icon: ClipboardList, color: "text-indigo-600" },
  ];

  useEffect(() => {
    loadQuestionnaire();
    loadPrograms();
  }, [questionnaireId]);

  // Memoized update callbacks to prevent re-renders
  const updateQuestionProperty = React.useCallback((sectionId: number, questionId: number, property: string, value: any) => {
    setSections((prevSections: any) =>
      prevSections.map((section: any) =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map((q: any) =>
                q.id === questionId
                  ? { ...q, [property]: value }
                  : q
              )
            }
          : section
      )
    );
  }, []);

  const updateQuestionOption = React.useCallback((sectionId: number, questionId: number, optionIdx: number, value: string) => {
    setSections((prevSections: any) =>
      prevSections.map((section: any) =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map((q: any) =>
                q.id === questionId
                  ? {
                      ...q,
                      options: q.options.map((opt: string, i: number) => i === optionIdx ? value : opt)
                    }
                  : q
              )
            }
          : section
      )
    );
  }, []);

  const updateMatrixRow = React.useCallback((sectionId: number, questionId: number, rowIndex: number, value: string) => {
    setSections((prevSections: any) =>
      prevSections.map((section: any) =>
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

  const updateMatrixColumn = React.useCallback((sectionId: number, questionId: number, colIndex: number, value: string) => {
    setSections((prevSections: any) =>
      prevSections.map((section: any) =>
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

  async function loadQuestionnaire() {
    try {
      setLoading(true);
      setError(null);
      const data = await questionnairesApi.getById(questionnaireId);
      setQuestionnaire(data);
      
      // Set questionnaire type
      if (data.type) {
        setQuestionnaireType(data.type.charAt(0).toUpperCase() + data.type.slice(1));
      }
      
      // Load settings
      if (data.settings) {
        setRandomizeQuestions(data.settings.randomize_questions || false);
        setRandomizeOptions(data.settings.randomize_options || false);
        setShowProgressBar(data.settings.show_progress_bar !== false);
        setAllowSaveAndContinue(data.settings.allow_save_continue !== false);
        setShowHeaderInParticipantView(data.settings.show_header_in_participant_view !== false);
        setCustomHeaderText(data.settings.custom_header_text || '');
        setShowSectionHeader(data.settings.show_section_header !== false);
        setSectionHeaderFormat(data.settings.section_header_format || 'numbered');
      }
      
      // Load enabled languages
      if ((data as any).languages && (data as any).languages.length > 0) {
        setEnabledLanguages((data as any).languages);
      }
      
      // Transform backend sections/questions to frontend format
      if (data.sections && data.sections.length > 0) {
        const transformedSections = data.sections.map((section: any) => ({
          id: section.id || Date.now(),
          title: section.title,
          description: section.description || '',
          questions: section.questions?.map((q: any) => {
            const isInformationBlock = q.type === 'information';
            return {
              id: q.id || Date.now(),
              type: mapBackendTypeToFrontend(q.type),
              question: q.title,
              required: q.is_required || false,
              options: q.options || [],
              correctAnswers: q.settings?.correctAnswers || [],
              scale: q.settings?.scale || 5,
              min: q.settings?.min || 0,
              max: q.settings?.max || 100,
              placeholder: q.settings?.placeholder || '',
              rows: q.settings?.rows?.length > 0 ? q.settings.rows : (mapBackendTypeToFrontend(q.type) === 'matrix' ? ["Row 1", "Row 2"] : []),
              columns: q.settings?.columns?.length > 0 ? q.settings.columns : (mapBackendTypeToFrontend(q.type) === 'matrix' ? ["Column 1", "Column 2", "Column 3"] : []),
              translations: q.translations || {},
              conditionalLogic: q.settings?.conditionalLogic || null,
              imageUrl: q.settings?.imageUrl || '', // Load question image
              // For information blocks, restore formattedQuestion, hyperlinks, and hyperlinksPosition from settings
              formattedQuestion: isInformationBlock ? (q.settings?.formattedContent || q.description || '') : undefined,
              description: isInformationBlock ? (q.settings?.formattedContent || q.description || '') : undefined,
              hyperlinks: isInformationBlock ? (q.settings?.hyperlinks || []) : undefined,
              hyperlinksPosition: isInformationBlock ? (q.settings?.hyperlinksPosition || 'bottom') : undefined,
              // Preserve the entire settings object to include customImages, etc.
              settings: q.settings || {},
            };
          }) || []
        }));
        setSections(transformedSections);
        setExpandedSections(transformedSections.map((s: any) => s.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questionnaire');
      console.error('Error loading questionnaire:', err);
    } finally {
      setLoading(false);
    }
  }

  function mapBackendTypeToFrontend(backendType: string): string {
    const mapping: { [key: string]: string } = {
      'radio': 'mcq',
      'multiselect': 'multi',
      'text': 'text',
      'scale': 'slider',
      'rating': 'rating',
      'matrix': 'matrix',
    };
    return mapping[backendType] || backendType;
  }

  function mapFrontendTypeToBackend(frontendType: string): string {
    const mapping: { [key: string]: string } = {
      'mcq': 'radio',
      'multi': 'multiselect',
      'text': 'text',
      'slider': 'scale',
      'rating': 'rating',
      'matrix': 'matrix',
    };
    return mapping[frontendType] || frontendType;
  }

  async function loadPrograms() {
    try {
      const data = await programsApi.getAll();
      setPrograms(data.filter((p: Program) => p.status === 'active'));
    } catch (err) {
      console.error('Failed to load programs:', err);
    }
  }

  const addSection = () => {
    withPreservedScroll(() => {
      setSections(prevSections => {
        const newSection = {
          id: Date.now(),
          title: "New Section",
          description: "Section description",
          questions: []
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
      const newQuestion = {
        id: Date.now(),
        type,
        question: type === "information" ? "Information Block" : `New ${type} question`,
        required: type === "information" ? false : false,
        isRichText: false,
        formattedQuestion: "",
        formattedOptions: [],
        ...(type === "mcq" || type === "multi" ? { options: ["Option 1", "Option 2", "Option 3"], correctAnswers: [] } : {}),
        ...(type === "rating" ? { scale: 5 } : {}),
        ...(type === "matrix" ? { rows: ["Row 1", "Row 2"], columns: ["Column 1", "Column 2", "Column 3"] } : {}),
        ...(type === "slider" ? { min: 0, max: 100 } : {}),
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

  const addQuestionOption = (sectionId: number, questionId: number) => {
    setSections(prevSections =>
      prevSections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            questions: section.questions.map((q: any) => {
              if (q.id === questionId && q.options) {
                return { ...q, options: [...q.options, `Option ${q.options.length + 1}`] };
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
                return { ...q, options: newOptions };
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

  const handleSaveQuestionnaire = async (sectionsToSave: any[] = sections) => {
    console.log('=== SAVING QUESTIONNAIRE ===');
    console.log('Sections to save:', sectionsToSave);
      
      const questionnaireData = {
        program_id: questionnaire.program_id,
        title: questionnaire.title,
        description: questionnaire.description || 'Questionnaire',
        status: questionnaire.status,
        type: questionnaireType.toLowerCase(),
        languages: enabledLanguages,
        settings: {
          display_mode: questionnaire.settings?.display_mode || 'all',
          randomize_questions: randomizeQuestions,
          randomize_options: randomizeOptions,
          show_progress_bar: showProgressBar,
          allow_save_continue: allowSaveAndContinue,
          show_header_in_participant_view: showHeaderInParticipantView,
          custom_header_text: customHeaderText,
          show_section_header: showSectionHeader,
          section_header_format: sectionHeaderFormat,
        },
        sections: sectionsToSave.map((section, idx) => ({
          id: section.id,
          title: section.title,
          description: section.description,
          order: idx + 1,
          questions: section.questions.map((question: any, qIdx: number) => {
            // Start with existing settings object to preserve all fields (like customImages)
            const settings: any = question.settings ? { ...question.settings } : {};
            
            // Update/add specific settings based on question type
            if (question.type === 'rating' && question.scale) {
              settings.scale = question.scale;
            }
            
            if (question.type === 'slider') {
              if (question.min !== undefined) settings.min = question.min;
              if (question.max !== undefined) settings.max = question.max;
            }
            
            if (question.type === 'text' && question.placeholder) {
              settings.placeholder = question.placeholder;
            }
            
            if (question.type === 'matrix') {
              if (question.rows && question.rows.length > 0) {
                settings.rows = question.rows;
              }
              if (question.columns && question.columns.length > 0) {
                settings.columns = question.columns;
              }
            }
            
            // Add correct answers for assessments
            if (questionnaireType === 'Assessment' && question.correctAnswers) {
              settings.correctAnswers = question.correctAnswers;
            }
            
            // Save conditional logic
            if (question.conditionalLogic) {
              settings.conditionalLogic = question.conditionalLogic;
            }
            
            // Save question image URL
            if (question.imageUrl) {
              settings.imageUrl = question.imageUrl;
            }
            
            // For information blocks, store the full HTML content and hyperlinks in settings
            const isInformationBlock = question.type === 'information';
            if (isInformationBlock) {
              settings.formattedContent = question.formattedQuestion || question.description || '';
              settings.hyperlinks = question.hyperlinks || [];
              settings.hyperlinksPosition = question.hyperlinksPosition || 'bottom';
            }
            
            // For information blocks, use a short title; otherwise truncate to 255 chars
            const questionTitle = isInformationBlock 
              ? 'Information Block' 
              : (question.formattedQuestion || question.question || '').substring(0, 255);
            
            const questionData: any = {
              type: mapFrontendTypeToBackend(question.type),
              title: questionTitle,
              description: isInformationBlock ? (question.description || '').substring(0, 500) : null,
              is_required: question.required === true,
              options: (question.type === 'mcq' || question.type === 'multi') && question.options ? question.options : null,
              settings: settings,
              order: qIdx + 1,
            };
            
            // Add translations if they exist
            if (question.translations) {
              questionData.translations = question.translations;
            }
            
            console.log(`Question ${qIdx + 1}:`, question.formattedQuestion || question.question, '| Type:', question.type, '| Required:', question.required, '| Settings:', settings);
            return questionData;
          }),
        })),
      };

      console.log('=== FINAL PAYLOAD ===');
      console.log(JSON.stringify(questionnaireData, null, 2));
      console.log('=== SENDING TO API ===');
      const result = await questionnairesApi.update(questionnaireId, questionnaireData);
      console.log('=== API RESPONSE ===');
      console.log(result);
      return result;
  };

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

    setSections(arrayMove(sections, oldIndex, newIndex));
  };

  const handleQuestionDragEnd = (sectionId: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSections(
      sections.map((section) => {
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
    if (!questionnaire) return;

    // Validation
    if (!questionnaire.program_id) {
      toast({
        title: "Validation Error",
        description: "Please select a program before saving",
        variant: "error"
      });
      return;
    }

    if (!questionnaire.title || !questionnaire.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a questionnaire name",
        variant: "error"
      });
      return;
    }

    try {
      setSaving(true);
      await handleSaveQuestionnaire();
      toast({ 
        title: "Success!", 
        description: "Questionnaire updated successfully!", 
        variant: "success" 
      });
      router.push('/questionnaires');
    } catch (err) {
      console.error('Failed to update questionnaire:', err);
      toast({ 
        title: "Error", 
        description: 'Failed to update questionnaire: ' + (err instanceof Error ? err.message : 'Unknown error'),
        variant: "error" 
      });
    } finally {
      setSaving(false);
    }
  };

  // Sortable Question Component for Edit Page
  function SortableQuestionEdit({ question, sectionId, sectionIdx, questionIdx, sections, setSections }: any) {
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

    const getQuestionIcon = (type: string) => {
      const typeMap: any = {
        mcq: CheckSquare,
        multi: List,
        text: Type,
        slider: Sliders,
        rating: Star,
        matrix: LayoutGrid,
      };
      const Icon = typeMap[type];
      return Icon ? <Icon className="w-4 h-4" /> : null;
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
                        setSections((prevSections: any) => 
                          prevSections.map((section: any) => 
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) => 
                                    q.id === question.id
                                      ? { ...q, question: newValue }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="flex-1 text-sm font-medium text-gray-900 bg-transparent border-none focus:outline-none"
                      placeholder="Enter your question..."
                    />
                  ) : (
                    <div className="flex-1">
                      <RichTextEditor
                        value={question.formattedQuestion || question.question}
                        onChange={(value) => {
                          setSections((prevSections: any) =>
                            prevSections.map((section: any, idx: number) =>
                              idx === sectionIdx
                                ? {
                                    ...section,
                                    questions: section.questions.map((q: any, qIdx: number) =>
                                      qIdx === questionIdx ? { ...q, formattedQuestion: value } : q
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
                {!showPreview && (
                  <div className="mt-2">
                    <Label className="text-xs text-gray-600 mb-1 block">Question Image (Optional)</Label>
                    <div className="max-w-md">
                      <S3ImageUpload
                        value={question.imageUrl || ''}
                        onChange={(url) => {
                          setSections((prevSections: any) =>
                            prevSections.map((section: any) =>
                              section.id === sectionId
                                ? {
                                    ...section,
                                    questions: section.questions.map((q: any) =>
                                      q.id === question.id ? { ...q, imageUrl: url } : q
                                    )
                                  }
                                : section
                            )
                          );
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
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    withPreservedScroll(() => {
                      setSections((prevSections: any) =>
                        prevSections.map((section: any, idx: number) =>
                          idx === sectionIdx
                            ? {
                                ...section,
                                questions: section.questions.map((q: any, qIdx: number) =>
                                  qIdx === questionIdx ? { ...q, isRichText: !q.isRichText } : q
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
                    setSections((prevSections: any) =>
                      prevSections.map((section: any, idx: number) =>
                        idx === sectionIdx
                          ? {
                              ...section,
                              questions: section.questions.map((q: any, qIdx: number) =>
                                qIdx === questionIdx ? { ...q, required: !q.required } : q
                              )
                            }
                          : section
                      )
                    );
                  }}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    question.required ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  Required
                </button>
                <button
                  onClick={() => {
                    const duplicated = { ...question, id: Date.now() };
                    setSections((prevSections: any) =>
                      prevSections.map((section: any, idx: number) =>
                        idx === sectionIdx
                          ? {
                              ...section,
                              questions: [
                                ...section.questions.slice(0, questionIdx + 1),
                                duplicated,
                                ...section.questions.slice(questionIdx + 1)
                              ]
                            }
                          : section
                      )
                    );
                  }}
                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSections((prevSections: any) =>
                      prevSections.map((section: any, idx: number) =>
                        idx === sectionIdx
                          ? {
                              ...section,
                              questions: section.questions.filter((_: any, i: number) => i !== questionIdx)
                            }
                          : section
                      )
                    );
                  }}
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
  }

  // Sortable Section Component for Edit Page
  function SortableSectionEdit({ section, sectionIdx, sections, setSections, expandedSections, setExpandedSections, handleQuestionDragEnd, renderQuestionPreview }: any) {
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

    const toggleSection = (sectionId: number) => {
      setExpandedSections((prev: number[]) =>
        prev.includes(sectionId)
          ? prev.filter((id) => id !== sectionId)
          : [...prev, sectionId]
      );
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
                  placeholder="Section title"
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
                onClick={() => {
                  setSections((prevSections: any) => prevSections.filter((s: any) => s.id !== section.id));
                }}
                className="p-1 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="w-5 h-5 text-red-600" />
              </button>
            </div>
          </div>
        </CardHeader>

        {expandedSections.includes(section.id) && (
          <CardContent className="p-6 space-y-4">
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
                    <SortableQuestionEdit
                      key={question.id}
                      question={question}
                      sectionId={section.id}
                      sectionIdx={sectionIdx}
                      questionIdx={questionIdx}
                      sections={sections}
                      setSections={setSections}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

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
          </CardContent>
        )}
      </Card>
    );
  }

  // Helper component for displaying SCT question images with presigned URLs
  const SCTQuestionImage = ({ imageUrl }: { imageUrl: string }) => {
    const [presignedUrl, setPresignedUrl] = useState<string>(imageUrl);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
      const loadPresignedUrl = async () => {
        if (!imageUrl) {
          setPresignedUrl('');
          return;
        }

        // If already presigned or not an S3 URL, use as-is
        if (isPresignedUrl(imageUrl) || !isS3Url(imageUrl)) {
          setPresignedUrl(imageUrl);
          return;
        }

        // Get presigned URL for S3 images
        try {
          const signed = await getPresignedUrl(imageUrl);
          setPresignedUrl(signed || imageUrl);
        } catch (error) {
          console.error('Failed to get presigned URL:', error);
          setPresignedUrl(imageUrl); // Fallback to original
        }
      };

      loadPresignedUrl();
    }, [imageUrl]);

    if (!presignedUrl || imageError) return null;

    return (
      <div className="relative rounded-lg border border-gray-200 overflow-hidden max-w-2xl">
        <img
          src={presignedUrl}
          alt="Clinical scenario"
          className="w-full h-auto object-contain"
          style={{ maxHeight: '300px' }}
          onError={() => setImageError(true)}
        />
      </div>
    );
  };

  const renderQuestionPreview = (question: any, sectionId: number) => {
    switch (question.type) {
      case "mcq":
      case "multi":
        return (
          <div className="space-y-2">
            {question.options?.map((option: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2 group">
                <div className={`w-4 h-4 border-2 border-gray-300 ${question.type === 'mcq' ? 'rounded-full' : 'rounded'} flex-shrink-0`}></div>
                {!showPreview ? (
                  <>
                    <div className="flex-1">
                      {question.isRichText ? (
                        <RichTextEditor
                          value={question.formattedOptions?.[idx] || option}
                          onChange={(value) => {
                            setSections((prevSections: any) => {
                              return prevSections.map((s: any) => {
                                if (s.id === sectionId) {
                                  return {
                                    ...s,
                                    questions: s.questions.map((q: any) => {
                                      if (q.id === question.id) {
                                        const newFormattedOptions = q.formattedOptions ? [...q.formattedOptions] : [...question.options];
                                        newFormattedOptions[idx] = value;
                                        return { ...q, formattedOptions: newFormattedOptions };
                                      }
                                      return q;
                                    })
                                  };
                                }
                                return s;
                              });
                            });
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
                      <div className="flex items-center gap-1">
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
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-gray-700">{option}</span>
                )}
              </div>
            ))}

            {!showPreview && (
              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={question.settings?.allow_other === true}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSections((prevSections: any) =>
                        prevSections.map((s: any) =>
                          s.id === sectionId
                            ? {
                                ...s,
                                questions: s.questions.map((q: any) =>
                                  q.id === question.id
                                    ? { ...q, settings: { ...(q.settings || {}), allow_other: checked } }
                                    : q
                                )
                              }
                            : s
                        )
                      );
                    }}
                    className="w-4 h-4"
                  />
                  <span>Allow “Other (Please Specify)”</span>
                </label>
              </div>
            )}

            {!showPreview && (
              <button
                onClick={() => addQuestionOption(sectionId, question.id)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mt-2"
              >
                <Plus className="w-3 h-3" />
                Add Option
              </button>
            )}
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
        if (!showPreview) {
          return (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-2">Number of Stars</label>
                <select
                  value={question.scale || 5}
                  onChange={(e) => {
                    setSections((prevSections: any) =>
                      prevSections.map((s: any) =>
                        s.id === sectionId
                          ? {
                              ...s,
                              questions: s.questions.map((q: any) =>
                                q.id === question.id ? { ...q, scale: parseInt(e.target.value) } : q
                              )
                            }
                          : s
                      )
                    );
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                >
                  <option value="1">1 Star</option>
                  <option value="2">2 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="5">5 Stars</option>
                  <option value="6">6 Stars</option>
                  <option value="7">7 Stars</option>
                  <option value="8">8 Stars</option>
                  <option value="9">9 Stars</option>
                  <option value="10">10 Stars</option>
                </select>
              </div>
              <div className="flex gap-2">
                {Array.from({ length: question.scale || 5 }).map((_, idx) => (
                  <Star key={idx} className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
            </div>
          );
        }
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
                            setSections((prevSections: any) =>
                              prevSections.map((s: any) =>
                                s.id === sectionId
                                  ? {
                                      ...s,
                                      questions: s.questions.map((q: any) =>
                                        q.id === question.id
                                          ? { ...q, rows: rows.filter((_: any, i: number) => i !== idx) }
                                          : q
                                      )
                                    }
                                  : s
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
                      setSections((prevSections: any) =>
                        prevSections.map((s: any) =>
                          s.id === sectionId
                            ? {
                                ...s,
                                questions: s.questions.map((q: any) =>
                                  q.id === question.id
                                    ? { ...q, rows: [...rows, `Row ${rows.length + 1}`] }
                                    : q
                                )
                              }
                            : s
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
                            setSections((prevSections: any) =>
                              prevSections.map((s: any) =>
                                s.id === sectionId
                                  ? {
                                      ...s,
                                      questions: s.questions.map((q: any) =>
                                        q.id === question.id
                                          ? { ...q, columns: columns.filter((_: any, i: number) => i !== idx) }
                                          : q
                                      )
                                    }
                                  : s
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
                      setSections((prevSections: any) =>
                        prevSections.map((s: any) =>
                          s.id === sectionId
                            ? {
                                ...s,
                                questions: s.questions.map((q: any) =>
                                  q.id === question.id
                                    ? { ...q, columns: [...columns, `Column ${columns.length + 1}`] }
                                    : q
                                )
                              }
                            : s
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
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-3 py-2"></th>
                  {columns.map((col: string, idx: number) => (
                    <th key={idx} className="border border-gray-300 px-3 py-2 bg-gray-50">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: string, idx: number) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium">{row}</td>
                    {columns.map((_: string, colIdx: number) => (
                      <td key={colIdx} className="border border-gray-300 px-3 py-2 text-center">
                        <input type="radio" disabled className="cursor-not-allowed" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "information":
        const infoHyperlinks = question.hyperlinks || [];
        const hyperlinksPosition = question.hyperlinksPosition || 'bottom';
        return (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-3">
                <RichTextEditor
                  value={question.formattedQuestion || question.description || ""}
                  onChange={(value) => {
                    setSections((prevSections: any) =>
                      prevSections.map((s: any) =>
                        s.id === sectionId
                          ? {
                              ...s,
                              questions: s.questions.map((q: any) =>
                                q.id === question.id
                                  ? {
                                      ...q,
                                      formattedQuestion: value,
                                      description: value.replace(/<[^>]*>/g, '')
                                    }
                                  : q
                              )
                            }
                          : s
                      )
                    );
                  }}
                  placeholder="Enter information text here... You can add links using the link button in toolbar, or add separate hyperlink buttons below."
                  minHeight="150px"
                />
                
                {/* Hyperlinks Section */}
                <div className="border-t border-blue-200 pt-3 mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-blue-700 flex items-center gap-1">
                      <Link2 className="w-3 h-3" />
                      Hyperlink Buttons
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Position selector */}
                      <select
                        value={hyperlinksPosition}
                        onChange={(e) => {
                          setSections((prevSections: any) =>
                            prevSections.map((s: any) =>
                              s.id === sectionId
                                ? {
                                    ...s,
                                    questions: s.questions.map((q: any) =>
                                      q.id === question.id
                                        ? { ...q, hyperlinksPosition: e.target.value }
                                        : q
                                    )
                                  }
                                : s
                            )
                          );
                        }}
                        className="text-xs border border-blue-200 rounded px-1 py-0.5 bg-white"
                      >
                        <option value="top">Show at Top</option>
                        <option value="bottom">Show at Bottom</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const newHyperlinks = [...infoHyperlinks, { id: Date.now(), text: '', url: '' }];
                          setSections((prevSections: any) =>
                            prevSections.map((s: any) =>
                              s.id === sectionId
                                ? {
                                    ...s,
                                    questions: s.questions.map((q: any) =>
                                      q.id === question.id
                                        ? { ...q, hyperlinks: newHyperlinks }
                                        : q
                                    )
                                  }
                                : s
                            )
                          );
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Link
                      </button>
                    </div>
                  </div>
                  
                  {infoHyperlinks.length === 0 ? (
                    <p className="text-xs text-blue-500 italic">No hyperlink buttons. Use the link button in the toolbar above to add inline links, or click "Add Link" to add button-style links.</p>
                  ) : (
                    <div className="space-y-2">
                      {infoHyperlinks.map((link: any, linkIdx: number) => (
                        <div key={link.id || linkIdx} className="flex items-center gap-2 bg-white/50 p-2 rounded-lg">
                          <input
                            type="text"
                            placeholder="Link text (e.g., Privacy Policy)"
                            defaultValue={link.text}
                            onBlur={(e) => {
                              const newHyperlinks = [...infoHyperlinks];
                              newHyperlinks[linkIdx] = { ...link, text: e.target.value };
                              setSections((prevSections: any) =>
                                prevSections.map((s: any) =>
                                  s.id === sectionId
                                    ? {
                                        ...s,
                                        questions: s.questions.map((q: any) =>
                                          q.id === question.id
                                            ? { ...q, hyperlinks: newHyperlinks }
                                            : q
                                        )
                                      }
                                    : s
                                )
                              );
                            }}
                            className="flex-1 px-2 py-1 text-xs border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          <input
                            type="url"
                            placeholder="URL (https://...)"
                            defaultValue={link.url}
                            onBlur={(e) => {
                              const newHyperlinks = [...infoHyperlinks];
                              newHyperlinks[linkIdx] = { ...link, url: e.target.value };
                              setSections((prevSections: any) =>
                                prevSections.map((s: any) =>
                                  s.id === sectionId
                                    ? {
                                        ...s,
                                        questions: s.questions.map((q: any) =>
                                          q.id === question.id
                                            ? { ...q, hyperlinks: newHyperlinks }
                                            : q
                                        )
                                      }
                                    : s
                                )
                              );
                            }}
                            className="flex-1 px-2 py-1 text-xs border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newHyperlinks = infoHyperlinks.filter((_: any, i: number) => i !== linkIdx);
                              setSections((prevSections: any) =>
                                prevSections.map((s: any) =>
                                  s.id === sectionId
                                    ? {
                                        ...s,
                                        questions: s.questions.map((q: any) =>
                                          q.id === question.id
                                            ? { ...q, hyperlinks: newHyperlinks }
                                            : q
                                        )
                                      }
                                    : s
                                )
                              );
                            }}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
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
                            setSections(prevSections =>
                              prevSections.map(section =>
                                section.id === sectionId
                                  ? {
                                      ...section,
                                      questions: section.questions.map((q: any) => {
                                        if (q.id === question.id) {
                                          const currentSettings = q.settings || {};
                                          const newCustomImages = { ...(currentSettings.customImages || {}), thumbUrl: url };
                                          return { ...q, settings: { ...currentSettings, customImages: newCustomImages } };
                                        }
                                        return q;
                                      })
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
                            setSections(prevSections =>
                              prevSections.map(section =>
                                section.id === sectionId
                                  ? {
                                      ...section,
                                      questions: section.questions.map((q: any) => {
                                        if (q.id === question.id) {
                                          const currentSettings = q.settings || {};
                                          const newCustomImages = { ...(currentSettings.customImages || {}), trackUrl: url };
                                          return { ...q, settings: { ...currentSettings, customImages: newCustomImages } };
                                        }
                                        return q;
                                      })
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
                      maxFiles={20}
                      maxSize={5}
                      showUniversalSizeHelper={true}
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
                          showUniversalSizeHelper={true}
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
                          }}
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
                      showUniversalSizeHelper={true}
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
                    <Label className="text-xs text-gray-600 block mb-2">Custom Images (URL for each scale point)</Label>
                    <div className="space-y-3">
                      {Array.from({ length: likertSettings.scale || 5 }).map((_, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-gray-700">Point {idx + 1}</span>
                            {likertSettings.customImages?.[idx]?.imageUrl && (
                              <span className="text-xs text-green-600">✓ Image set</span>
                            )}
                          </div>
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
                          showUniversalSizeHelper={true}
                            maxSize={10}
                          />
                          <div className="text-xs text-gray-400 text-center my-2">— or enter URL manually —</div>
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
                            key={`likert-custom-img-${question.id}-${idx}-${likertSettings.customImages?.[idx]?.imageUrl}`}
                            className="text-xs h-8"
                          />
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
      case "sct_likert":
        const sctSettings = question.settings || DEFAULT_SETTINGS.sct_likert;
        const sctScale = sctSettings.scale || 5;
        const sctChoiceType = sctSettings.choiceType || 'single';
        const sctScores = sctSettings.scores || Array.from({ length: sctScale }, (_, i) => i + 1);
        const sctShowScores = sctSettings.showScores !== false;
        const sctNormalize = sctSettings.normalizeMultiSelect !== false;
        
        // Initialize options with default labels if empty or length doesn't match scale
        const defaultLabels = sctScale === 3 
          ? ['Disagree', 'Neutral', 'Agree']
          : sctScale === 5
          ? ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
          : sctScale === 7
          ? ['Strongly Disagree', 'Disagree', 'Somewhat Disagree', 'Neutral', 'Somewhat Agree', 'Agree', 'Strongly Agree']
          : ['Strongly Disagree', 'Disagree', 'Somewhat Disagree', 'Slightly Disagree', 'Slightly Agree', 'Somewhat Agree', 'Agree', 'Strongly Agree', 'Completely Agree'];
        
        // Ensure options array exists and matches scale length - MUST be called unconditionally (React Hooks rule)
        React.useEffect(() => {
          if (!question.options || question.options.length !== sctScale) {
            setSections(prevSections =>
              prevSections.map(section =>
                section.id === sectionId
                  ? {
                      ...section,
                      questions: section.questions.map((q: any) =>
                        q.id === question.id && (!q.options || q.options.length !== sctScale)
                          ? { ...q, options: defaultLabels }
                          : q
                      )
                    }
                  : section
              )
            );
          }
        }, [question.options, sctScale]);
        
        return (
          <div className="py-4 space-y-4 w-full overflow-hidden" style={{ maxWidth: '100%' }}>
            {/* Settings Panel */}
            {!showPreview && (
              <div className="space-y-4 w-full overflow-hidden" style={{ maxWidth: '100%' }}>
                {/* Configuration Panel */}
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 w-full overflow-hidden" style={{ maxWidth: '100%' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-medium text-gray-700">SCT Configuration</span>
                  </div>
                  
                  {/* Scale Selector */}
                  <div className="mb-4">
                    <Label htmlFor={`sct-scale-${question.id}`} className="text-xs text-gray-600 block mb-1">
                      Likert Scale
                    </Label>
                    <select
                      id={`sct-scale-${question.id}`}
                      value={sctScale}
                      onChange={(e) => {
                        withPreservedScroll(() => {
                          const newScale = parseInt(e.target.value) as 3 | 5 | 7 | 9;
                        const newLabels = newScale === 3 
                          ? ['Disagree', 'Neutral', 'Agree']
                          : newScale === 5
                          ? ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
                          : newScale === 7
                          ? ['Strongly Disagree', 'Disagree', 'Somewhat Disagree', 'Neutral', 'Somewhat Agree', 'Agree', 'Strongly Agree']
                          : ['Strongly Disagree', 'Disagree', 'Somewhat Disagree', 'Slightly Disagree', 'Slightly Agree', 'Somewhat Agree', 'Agree', 'Strongly Agree', 'Completely Agree'];
                        
                        const newScores = Array.from({ length: newScale }, (_, i) => i + 1);
                        const newOptions = newLabels;
                        
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { 
                                          ...q, 
                                          settings: { ...sctSettings, scale: newScale, labels: newLabels, scores: newScores },
                                          options: newOptions
                                        }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                        });
                      }}
                      className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="3">3-Point Scale</option>
                      <option value="5">5-Point Scale</option>
                      <option value="7">7-Point Scale</option>
                      <option value="9">9-Point Scale</option>
                    </select>
                  </div>

                  {/* Choice Type Toggle */}
                  <div className="mb-4">
                    <Label className="text-xs text-gray-600 block mb-2">Response Type</Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          withPreservedScroll(() => {
                            setSections(prevSections =>
                              prevSections.map(section =>
                                section.id === sectionId
                                  ? {
                                      ...section,
                                      questions: section.questions.map((q: any) =>
                                        q.id === question.id
                                          ? { ...q, settings: { ...sctSettings, choiceType: 'single' } }
                                          : q
                                      )
                                    }
                                  : section
                              )
                            );
                          });
                        }}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                          sctChoiceType === 'single'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Single Choice
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          withPreservedScroll(() => {
                            setSections(prevSections =>
                            prevSections.map(section =>
                              section.id === sectionId
                                ? {
                                    ...section,
                                    questions: section.questions.map((q: any) =>
                                      q.id === question.id
                                        ? { ...q, settings: { ...sctSettings, choiceType: 'multi' } }
                                        : q
                                    )
                                  }
                                : section
                            )
                          );
                          });
                        }}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                          sctChoiceType === 'multi'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Multiple Choice
                      </button>
                    </div>
                  </div>

                  {/* Multi-Select Normalization */}
                  {sctChoiceType === 'multi' && (
                    <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                      <input
                        type="checkbox"
                        id={`sct-normalize-${question.id}`}
                        checked={sctNormalize}
                        onChange={(e) => {
                          setSections(prevSections =>
                            prevSections.map(section =>
                              section.id === sectionId
                                ? {
                                    ...section,
                                    questions: section.questions.map((q: any) =>
                                      q.id === question.id
                                        ? { ...q, settings: { ...sctSettings, normalizeMultiSelect: e.target.checked } }
                                        : q
                                    )
                                  }
                                : section
                            )
                          );
                        }}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <Label htmlFor={`sct-normalize-${question.id}`} className="text-xs text-gray-700 cursor-pointer">
                        Normalize multi-select scores (divide by number of selections)
                      </Label>
                    </div>
                  )}
                </div>

                {/* Score Configuration */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-gray-700">Score Assignment</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Assign scores to each option. These scores will be used to calculate the assessment result.
                  </p>
                  
                  {/* Show Scores Toggle */}
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      id={`sct-show-scores-${question.id}`}
                      checked={sctShowScores}
                      onChange={(e) => {
                        setSections(prevSections =>
                          prevSections.map(section =>
                            section.id === sectionId
                              ? {
                                  ...section,
                                  questions: section.questions.map((q: any) =>
                                    q.id === question.id
                                      ? { ...q, settings: { ...sctSettings, showScores: e.target.checked } }
                                      : q
                                  )
                                }
                              : section
                          )
                        );
                      }}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <Label htmlFor={`sct-show-scores-${question.id}`} className="text-xs text-gray-600 cursor-pointer">
                      Show scores to admin (preview only)
                    </Label>
                  </div>

                  <div className="space-y-2">
                    {(question.options || []).map((option: string, idx: number) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="text-xs text-gray-500 w-6 flex-shrink-0">{idx + 1}.</span>
                        <Input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            withPreservedScroll(() => {
                              const newOptions = [...(question.options || [])];
                              newOptions[idx] = e.target.value;
                              setSections(prevSections =>
                                prevSections.map(section =>
                                  section.id === sectionId
                                    ? {
                                        ...section,
                                        questions: section.questions.map((q: any) =>
                                          q.id === question.id
                                            ? { ...q, options: newOptions }
                                            : q
                                        )
                                      }
                                    : section
                                )
                              );
                            });
                          }}
                          placeholder={`Option ${idx + 1}`}
                          className="flex-1 min-w-0 text-xs h-9"
                        />
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Label className="text-xs text-gray-500 whitespace-nowrap">Score:</Label>
                          <Input
                            type="number"
                            value={sctScores[idx] || 0}
                            onChange={(e) => {
                              withPreservedScroll(() => {
                                const newScores = [...sctScores];
                                newScores[idx] = parseFloat(e.target.value) || 0;
                                setSections(prevSections =>
                                  prevSections.map(section =>
                                    section.id === sectionId
                                      ? {
                                          ...section,
                                          questions: section.questions.map((q: any) =>
                                            q.id === question.id
                                              ? { ...q, settings: { ...sctSettings, scores: newScores } }
                                              : q
                                          )
                                        }
                                      : section
                                  )
                                );
                              });
                            }}
                            className="w-20 text-xs h-9"
                            step="0.5"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case "drag_and_drop":
        const dndSettings = question.settings || DEFAULT_SETTINGS.drag_and_drop;
        // Debug logging
        console.log('🔍 [DRAG_DROP] Loading settings:', { 
          questionId: question.id, 
          hasSettings: !!question.settings,
          items: dndSettings.items,
          buckets: dndSettings.buckets,
          itemsCount: dndSettings.items?.length || 0,
          bucketsCount: dndSettings.buckets?.length || 0
        });
        return (
          <div className="py-4 space-y-4 max-w-full overflow-x-auto">
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
                    {dndSettings.items?.map((item: any, idx: number) => {
                      console.log(`🖼️ [DRAG_DROP_ITEM_${idx}]`, { text: item.text, imageUrl: item.imageUrl, hasImage: !!item.imageUrl });
                      return (
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
                        <div className="ml-6 max-w-xs">
                          <label className="text-xs text-gray-600 mb-1 block">Item Image (Optional)</label>
                          <div className="text-xs text-gray-500 mb-2">
                            Recommended: 200 × 200 pixels (1:1 ratio) | Max: 5MB
                          </div>
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
                    )})}
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
                    {dndSettings.buckets?.map((bucket: any, idx: number) => {
                      console.log(`🪣 [DRAG_DROP_BUCKET_${idx}]`, { label: bucket.label, imageUrl: bucket.imageUrl, hasImage: !!bucket.imageUrl });
                      return (
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
                        <div className="ml-10 max-w-xs">
                          <label className="text-xs text-gray-600 mb-1 block">Bucket Image (Optional)</label>
                          <div className="text-xs text-gray-500 mb-2">
                            Recommended: 200 × 200 pixels (1:1 ratio) | Max: 5MB
                          </div>
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
                    )})}
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
                      <option value="custom">Custom count</option>
                    </select>
                  </div>
                </div>

                {/* Preview Message */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700">
                    📦 <strong>{dndSettings.items?.length || 0}</strong> draggable items, 
                    <strong> {dndSettings.buckets?.length || 0}</strong> buckets
                    {questionnaireType === "Assessment" && " (Assessment mode enabled)"}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <RoleBasedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-blue mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading questionnaire...</p>
          </div>
        </div>
      </RoleBasedLayout>
    );
  }

  if (error || !questionnaire) {
    return (
      <RoleBasedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 font-semibold">{error || 'Questionnaire not found'}</p>
            <button
              onClick={() => router.push('/questionnaires')}
              className="mt-4 px-4 py-2 bg-qsights-cyan text-white rounded-lg hover:bg-blue-700"
            >
              Back to Questionnaires
            </button>
          </div>
        </div>
      </RoleBasedLayout>
    );
  }

  const selectedProgram = programs.find(p => p.id === questionnaire.program_id);

  return (
    <RoleBasedLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(returnTo === 'evaluation' ? '/evaluation-new?tab=trigger' : '/questionnaires')}
              className="group flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">{returnTo === 'evaluation' ? 'Back to Evaluation' : 'Back'}</span>
            </button>
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
              disabled={saving || showPreview}
              className="flex items-center gap-2 px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Questionnaire'}
            </button>
          </div>
        </div>

        {/* Info Boxes - Positioned below page title */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick Stats */}
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
          <div className="lg:col-span-3 space-y-6">
            {/* Questionnaire Details */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <span>📋</span> Questionnaire Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="program" className="text-sm font-medium text-gray-700">
                      Program <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="program"
                      value={selectedProgram?.name || 'N/A'}
                      disabled
                      className="w-full bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                      Questionnaire Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={questionnaire.title}
                      onChange={(e) => setQuestionnaire({ ...questionnaire, title: e.target.value })}
                      className="w-full"
                      disabled={showPreview}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                      Status <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="status"
                      value={questionnaire.status || 'draft'}
                      onChange={(e) => setQuestionnaire({ ...questionnaire, status: e.target.value })}
                      disabled={showPreview}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue disabled:bg-gray-50"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published (Live)</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sections */}
            {!showPreview ? (
              <>
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
                        <SortableSectionEdit
                          key={section.id}
                          section={section}
                          sectionIdx={sectionIdx}
                          sections={sections}
                          setSections={setSections}
                          expandedSections={expandedSections}
                          setExpandedSections={setExpandedSections}
                          handleQuestionDragEnd={handleQuestionDragEnd}
                          renderQuestionPreview={renderQuestionPreview}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                <button
                  onClick={addSection}
                  className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-qsights-blue hover:text-qsights-blue transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Section
                </button>
              </>
            ) : (
              <>
                {/* Preview Mode */}
                <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-2">{questionnaire.title}</h2>
                    <p className="text-blue-100">Preview Mode</p>
                  </CardContent>
                </Card>

                {sections.map((section) => (
                  <Card key={section.id}>
                    <CardHeader className="border-b border-gray-200 bg-gray-50">
                      <div className="flex items-start gap-3">
                        <div className="w-1 h-full bg-blue-500 rounded-full"></div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{section.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {section.questions.map((question: any, idx: number) => (
                        <div key={question.id} className="space-y-3">
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-medium text-gray-700">
                              {idx + 1}.{idx + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {question.question}
                                {question.required && <span className="text-red-500 ml-1">*</span>}
                              </p>
                              <div className="mt-3">{renderQuestionPreview(question, section.id)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
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
                    disabled={showPreview}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"
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
                    disabled={showPreview}
                    className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed" 
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-medium text-gray-700">Randomize Options</span>
                  <input 
                    type="checkbox" 
                    checked={randomizeOptions}
                    onChange={(e) => setRandomizeOptions(e.target.checked)}
                    disabled={showPreview}
                    className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed" 
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-medium text-gray-700">Show Progress Bar</span>
                  <input 
                    type="checkbox" 
                    checked={showProgressBar}
                    onChange={(e) => setShowProgressBar(e.target.checked)}
                    disabled={showPreview}
                    className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed" 
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-medium text-gray-700">Allow Save & Continue</span>
                  <input 
                    type="checkbox" 
                    checked={allowSaveAndContinue}
                    onChange={(e) => setAllowSaveAndContinue(e.target.checked)}
                    disabled={showPreview}
                    className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed" 
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
                        disabled={showPreview}
                        className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed" 
                      />
                    </div>
                    {showHeaderInParticipantView && (
                      <div className="py-1">
                        <Input
                          type="text"
                          placeholder="Custom header text (leave empty for questionnaire title)"
                          value={customHeaderText}
                          onChange={(e) => setCustomHeaderText(e.target.value)}
                          disabled={showPreview}
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
                        disabled={showPreview}
                        className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed" 
                      />
                    </div>
                    {showSectionHeader && (
                      <div className="py-1">
                        <select
                          value={sectionHeaderFormat}
                          onChange={(e) => setSectionHeaderFormat(e.target.value as 'numbered' | 'titleOnly')}
                          disabled={showPreview}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded disabled:bg-gray-100"
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

            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Settings className="w-4 h-4 text-qsights-blue" />
                  Question Types
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {questionTypes.map((type) => (
                  <div key={type.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <type.icon className={`w-5 h-5 ${type.color}`} />
                    <span className="text-sm font-medium text-gray-700">{type.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Enhanced Conditional Logic Modal */}
      {showConditionalLogic && selectedQuestion !== null && (
        <EnhancedConditionalLogicEditor
          question={sections.flatMap((s: any) => s.questions).find((q: any) => q.id === selectedQuestion)!}
          allQuestions={sections.flatMap((s: any) => s.questions) as QuestionWithLogic[]}
          onSave={async (logic: ConditionalLogic | null) => {
            // Update local state first
            const updatedSections = sections.map((section: any) => ({
              ...section,
              questions: section.questions.map((q: any) =>
                q.id === selectedQuestion
                  ? { ...q, conditionalLogic: logic }
                  : q
              )
            }));
            setSections(updatedSections);
            setShowConditionalLogic(false);
            setSelectedQuestion(null);
            
            // Auto-save to backend
            try {
              await handleSaveQuestionnaire(updatedSections);
              toast({
                title: "Success!",
                description: logic ? "Conditional logic saved to database" : "Conditional logic removed",
                variant: "success",
              });
            } catch (err) {
              console.error('Failed to save conditional logic:', err);
              toast({
                title: "Warning",
                description: "Logic applied locally but failed to save to database. Please save the questionnaire manually.",
                variant: "warning",
              });
            }
          }}
          onCancel={() => {
            setShowConditionalLogic(false);
            setSelectedQuestion(null);
          }}
        />
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
                  <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-2">
                    {enabledLanguages.map((lang) => (
                      <div key={lang} className="flex items-center gap-1 relative group">
                        <button
                          onClick={() => setActiveLanguage(lang)}
                          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                            activeLanguage === lang
                              ? "border-qsights-blue text-qsights-blue"
                              : "border-transparent text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          {availableLanguages.find(l => l.code === lang)?.name || lang}
                        </button>
                        {lang !== "EN" && (
                          <button
                            onClick={() => {
                              // Remove language from enabled languages
                              const newLanguages = enabledLanguages.filter(l => l !== lang);
                              setEnabledLanguages(newLanguages);
                              
                              // Switch to EN if removing active language
                              if (activeLanguage === lang) {
                                setActiveLanguage("EN");
                              }
                              
                              // Remove translations for this language from all questions
                              if (selectedQuestionForTranslation) {
                                const updatedTranslations = { ...translationData };
                                delete updatedTranslations[lang];
                                setTranslationData(updatedTranslations);
                              }
                              
                              toast({ 
                                title: "Language Removed", 
                                description: `${lang} has been removed from the questionnaire`, 
                                variant: "success" 
                              });
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove language"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
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
                      selectedQuestionForTranslation.type === "multi") && selectedQuestionForTranslation.options && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Options ({activeLanguage})
                        </Label>
                        <div className="space-y-2">
                          {selectedQuestionForTranslation.options.map(
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
                  </div>
                </div>
              ) : (
                /* Side-by-Side View */
                <div className="space-y-4">
                  {/* Add Language Button */}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-600">
                      Compare and translate across multiple languages
                    </p>
                    <button
                      onClick={() => setShowLanguageSelector(true)}
                      className="px-4 py-2 text-sm font-medium text-qsights-blue hover:bg-blue-50 border border-qsights-blue rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Language
                    </button>
                  </div>

                  {/* Languages Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {enabledLanguages.map((lang) => (
                      <div key={lang} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-qsights-blue uppercase tracking-wide">{lang}</span>
                            <span className="text-xs text-gray-500">
                              {availableLanguages.find(l => l.code === lang)?.name || lang}
                            </span>
                          </div>
                        </div>

                        {/* Question Text */}
                        <div className="space-y-2 mb-4">
                          <Label className="text-xs font-medium text-gray-700">Question Text</Label>
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
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue focus:border-transparent bg-white"
                            placeholder={`Enter question in ${lang}...`}
                            disabled={lang === "EN"}
                          />
                        </div>

                        {/* Options for MCQ/Multi */}
                        {(selectedQuestionForTranslation.type === "mcq" ||
                          selectedQuestionForTranslation.type === "multi") && selectedQuestionForTranslation.options && (
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-gray-700">Options</Label>
                            <div className="space-y-2">
                              {selectedQuestionForTranslation.options.map(
                                (option: string, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 w-6">{idx + 1}.</span>
                                    <input
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
                                      placeholder={`Option ${idx + 1}`}
                                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue bg-white"
                                      disabled={lang === "EN"}
                                    />
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{enabledLanguages.length}</span> languages configured
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMultilingualEditor(false);
                    setSelectedQuestionForTranslation(null);
                    setTranslationData({});
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    // Save translations to the question object
                    if (selectedQuestionForTranslation) {
                      const updatedSections = sections.map(section => ({
                        ...section,
                        questions: section.questions.map((q: any) => {
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
                      
                      // Auto-save to database immediately
                      try {
                        await handleSaveQuestionnaire(updatedSections);
                        toast({ title: "Success!", description: "Translations saved successfully!", variant: "success" });
                      } catch (err) {
                        toast({ title: "Error", description: "Failed to save translations", variant: "error" });
                      }
                    }
                    setShowMultilingualEditor(false);
                    setSelectedQuestionForTranslation(null);
                    setTranslationData({});
                  }}
                  className="px-4 py-2 bg-qsights-cyan text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
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
    </RoleBasedLayout>
  );
}
