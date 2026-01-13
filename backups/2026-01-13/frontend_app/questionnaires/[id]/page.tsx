"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
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
} from "lucide-react";
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

export default function ViewQuestionnairePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const questionnaireId = params.id as string;
  const mode = searchParams.get('mode') || 'edit';

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
    { id: "multi", label: "Multi-Select", icon: List, color: "text-purple-600" },
    { id: "text", label: "Text Input", icon: Type, color: "text-green-600" },
    { id: "slider", label: "Slider", icon: Sliders, color: "text-orange-600" },
    { id: "rating", label: "Rating", icon: Star, color: "text-yellow-600" },
    { id: "matrix", label: "Matrix", icon: LayoutGrid, color: "text-pink-600" },
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
          questions: section.questions?.map((q: any) => ({
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
          })) || []
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
        question: `New ${type} question`,
        required: false,
        isRichText: false,
        formattedQuestion: "",
        formattedOptions: [],
        ...(type === "mcq" || type === "multi" ? { options: ["Option 1", "Option 2", "Option 3"], correctAnswers: [] } : {}),
        ...(type === "rating" ? { scale: 5 } : {}),
        ...(type === "matrix" ? { rows: ["Row 1", "Row 2"], columns: ["Column 1", "Column 2", "Column 3"] } : {}),
        ...(type === "slider" ? { min: 0, max: 100 } : {}),
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
          allow_save_continue: allowSaveAndContinue
        },
        sections: sections.map((section, idx) => ({
          id: section.id,
          title: section.title,
          description: section.description,
          order: idx + 1,
          questions: section.questions.map((question: any, qIdx: number) => {
            // Build settings object based on question type
            const settings: any = {};
            
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
            
            const questionData: any = {
              type: mapFrontendTypeToBackend(question.type),
              title: question.question,
              description: null,
              is_required: question.required === true,
              options: (question.type === 'mcq' || question.type === 'multi') && question.options ? question.options : null,
              settings: settings,
              order: qIdx + 1,
            };
            
            // Add translations if they exist
            if (question.translations) {
              questionData.translations = question.translations;
            }
            
            console.log(`Question ${qIdx + 1}:`, question.question, '| Type:', question.type, '| Required:', question.required, '| Settings:', settings);
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
                  className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
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
                  <option value="3">3 Stars</option>
                  <option value="5">5 Stars</option>
                  <option value="7">7 Stars</option>
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
              className="mt-4 px-4 py-2 bg-qsights-blue text-white rounded-lg hover:bg-blue-700"
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
              onClick={() => router.push('/questionnaires')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
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
              className="flex items-center gap-2 px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors disabled:opacity-50"
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
            <Card className="bg-purple-50 border-purple-200">
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
                  className="px-4 py-2 bg-qsights-blue text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
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
