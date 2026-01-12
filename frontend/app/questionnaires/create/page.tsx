"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import IsolatedTextInput from "@/components/IsolatedTextInput";
import EnhancedConditionalLogicEditor from "@/components/EnhancedConditionalLogicEditor";
import ImportPreviewModal from "@/components/ImportPreviewModal";
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

export default function QuestionnaireBuilderPage() {
  const router = useRouter();
  const [questionnaireName, setQuestionnaireName] = useState("");
  const [questionnaireCode, setQuestionnaireCode] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showConditionalLogic, setShowConditionalLogic] = useState(false);
  const [showMultilingualEditor, setShowMultilingualEditor] = useState(false);

  // Preserve scroll position across state updates that rebuild the DOM
  const withPreservedScroll = useCallback((fn: () => void) => {
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    fn();
    requestAnimationFrame(() => window.scrollTo(0, scrollY));
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
    { id: "multi", label: "Multi-Select", icon: List, color: "text-purple-600" },
    { id: "text", label: "Text Input", icon: Type, color: "text-green-600" },
    { id: "slider", label: "Slider", icon: Sliders, color: "text-orange-600" },
    { id: "rating", label: "Rating", icon: Star, color: "text-yellow-600" },
    { id: "matrix", label: "Matrix", icon: LayoutGrid, color: "text-pink-600" },
    { id: "information", label: "Information Block", icon: FileText, color: "text-teal-600" },
  ];

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
        },
        sections: sections.map((section) => ({
          title: section.title,
          description: section.description,
          order: sections.indexOf(section) + 1,
          questions: section.questions.map((question: any) => {
            const questionData: any = {
              type: typeMapping[question.type] || question.type,
              title: question.question,
              description: null,
              is_required: question.required || false,
              options: question.options || null,
              settings: {
                ...(question.scale ? { scale: question.scale } : {}),
                ...(question.min !== undefined ? { min: question.min } : {}),
                ...(question.max !== undefined ? { max: question.max } : {}),
                ...(question.placeholder ? { placeholder: question.placeholder } : {}),
                ...(question.rows && question.rows.length > 0 ? { rows: question.rows } : {}),
                ...(question.columns && question.columns.length > 0 ? { columns: question.columns } : {}),
                ...(questionnaireType === 'Assessment' && question.correctAnswers ? { correctAnswers: question.correctAnswers } : {}),
                // Save conditional logic in settings
                ...(question.conditionalLogic ? { conditionalLogic: question.conditionalLogic } : {}),
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

      await questionnairesApi.create(questionnaireData as any);
      toast({ title: "Success!", description: "Questionnaire saved successfully!", variant: "success" });
      router.push('/questionnaires');
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
                  className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
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
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/questionnaires"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
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
              className="flex items-center gap-2 px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <button className="px-6 py-2 bg-qsights-blue text-white rounded-lg font-medium hover:bg-qsights-blue/90 transition-colors">
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
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <GitBranch className="w-5 h-5 text-purple-600 mt-0.5" />
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

                <button className="w-full py-2 border-2 border-dashed border-purple-300 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors">
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
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
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
                                    ? "bg-purple-500"
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
                  className="px-6 py-2 bg-qsights-blue text-white rounded-lg font-medium hover:bg-qsights-blue/90 transition-colors"
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
