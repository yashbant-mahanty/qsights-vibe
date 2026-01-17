"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Plus, Trash2, AlertCircle, CheckCircle, Info, ChevronDown, ChevronRight, GitBranch, Eye, EyeOff, Settings2, Zap, ArrowRight, HelpCircle, ChevronUp } from 'lucide-react';

// Helper function to check if an ID matches (handles string/number comparison)
// Defined at module level to ensure availability throughout the component
function idMatchesHelper(id1: string | number, id2: string | number): boolean {
  return String(id1) === String(id2);
}

// Helper function to check if a question ID is in a list of IDs
function isIdInListHelper(id: string | number, idList: (string | number)[]): boolean {
  if (!idList || !Array.isArray(idList)) return false;
  return idList.some(listId => String(listId) === String(id));
}

import {
  ConditionalLogic,
  ConditionalRule,
  LogicOperator,
  LogicCombinator,
  QuestionWithLogic,
  getOperatorLabel,
  getAvailableOperators,
  operatorRequiresValue,
  operatorSupportsMultipleValues,
  detectCircularDependency,
} from '@/types/conditionalLogic';
import { getLogicPreviewText } from '@/utils/conditionalLogicEvaluator';

// Tab type for the editor
type EditorTab = 'simple' | 'advanced';

// Type for option-to-questions mapping
interface OptionMapping {
  [option: string]: (string | number)[];
}

interface EnhancedConditionalLogicEditorProps {
  question: QuestionWithLogic;
  allQuestions: QuestionWithLogic[];
  onSave: (logic: ConditionalLogic | null) => void;
  onCancel: () => void;
}

export default function EnhancedConditionalLogicEditor({
  question,
  allQuestions,
  onSave,
  onCancel,
}: EnhancedConditionalLogicEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('simple');
  const [logic, setLogic] = useState<ConditionalLogic>(() => {
    if (question.conditionalLogic) {
      return { ...question.conditionalLogic };
    }
    return {
      id: `logic-${Date.now()}`,
      enabled: true,
      action: 'show',
      combinator: 'AND',
      rules: []
    };
  });

  // Simple mode state - mapping of option -> selected child question IDs
  const [optionMappings, setOptionMappings] = useState<OptionMapping>({});
  
  // Track which option accordion is expanded
  const [expandedOption, setExpandedOption] = useState<string | null>(null);

  const [errors, setErrors] = useState<string[]>([]);

  // Use module-level helper functions directly in JSX
  // idMatchesHelper and isIdInListHelper are available at module scope

  // Get options for the CURRENT question
  const currentQuestionOptions = useMemo(() => {
    if (question.type === 'boolean') {
      return ['Yes', 'No'];
    }
    if ((question.type === 'mcq' || question.type === 'multi') && question.options) {
      return question.options;
    }
    return [];
  }, [question]);

  // Check if current question has options (can be a parent)
  const canBeParent = useMemo(() => {
    return ['mcq', 'multi', 'boolean'].includes(question.type) && currentQuestionOptions.length > 0;
  }, [question.type, currentQuestionOptions]);

  // Get questions that come AFTER this question (potential children)
  const childQuestions = useMemo(() => {
    const currentIndex = allQuestions.findIndex(q => q.id === question.id);
    
    // Build a set of indices of questions already mapped in ANY conditional logic
    const globallyMappedIndices = new Set<number>();
    
    allQuestions.forEach((triggerQ, triggerIdx) => {
      // Skip the current question being edited
      if (String(triggerQ.id) === String(question.id)) return;
      
      // Check if this question has optionMappingsWithIndices (the reliable source)
      if (triggerQ.conditionalLogic?.metadata?.optionMappingsWithIndices) {
        const indicesData = triggerQ.conditionalLogic.metadata.optionMappingsWithIndices;
        
        Object.values(indicesData).forEach((data: any) => {
          if (data?.indices && Array.isArray(data.indices)) {
            data.indices.forEach((relativeIdx: number) => {
              // Convert relative index (1-based from trigger) to absolute index
              const absoluteIdx = triggerIdx + relativeIdx;
              if (absoluteIdx < allQuestions.length) {
                globallyMappedIndices.add(absoluteIdx);
              }
            });
          }
        });
      }
    });
    
    return allQuestions.filter((q, idx) => {
      if (idx <= currentIndex) return false; // Only questions after this one
      if (globallyMappedIndices.has(idx)) return false; // Exclude globally mapped
      return true;
    });
  }, [allQuestions, question.id]);

  // Get questions already assigned to other options
  const getAssignedToOtherOptions = (currentOption: string): (string | number)[] => {
    const assigned: (string | number)[] = [];
    Object.entries(optionMappings).forEach(([opt, questionIds]) => {
      if (opt !== currentOption) {
        assigned.push(...questionIds);
      }
    });
    return assigned;
  };

  // Get all available source questions for advanced mode
  const availableSourceQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      if (q.id === question.id) return false;
      const validTypes = ['mcq', 'multi', 'boolean', 'text', 'slider', 'rating', 'scale', 'number', 'email', 'textarea'];
      return validTypes.includes(q.type);
    });
  }, [allQuestions, question.id]);

  // Initialize option mappings from existing logic (if any) - for loading saved data
  useEffect(() => {
    // Load saved optionMappings from conditionalLogic.metadata
    if (question.conditionalLogic?.metadata?.optionMappings) {
      console.log('[ConditionalLogicEditor] Loading saved optionMappings:', question.conditionalLogic.metadata.optionMappings);
      console.log('[ConditionalLogicEditor] Loading saved indices:', question.conditionalLogic.metadata.optionMappingsWithIndices);
      console.log('[ConditionalLogicEditor] Current childQuestions IDs:', childQuestions.map(q => q.id));
      
      const savedMappings = question.conditionalLogic.metadata.optionMappings;
      const savedIndices = question.conditionalLogic.metadata.optionMappingsWithIndices;
      const convertedMappings: OptionMapping = {};
      
      for (const [option, savedIds] of Object.entries(savedMappings)) {
        const validIds: (string | number)[] = [];
        const savedIdArray = savedIds as (string | number)[];
        
        // Get saved indices for this option if available
        const indicesData = savedIndices?.[option];
        const savedIndicesArray = indicesData?.indices as number[] || [];
        
        // First try to match by saved indices (most reliable)
        if (savedIndicesArray.length > 0) {
          for (const relativeIdx of savedIndicesArray) {
            // relativeIdx is relative to parent, 1 = first child, 2 = second child
            if (relativeIdx > 0 && relativeIdx <= childQuestions.length) {
              const childQ = childQuestions[relativeIdx - 1];
              if (childQ) {
                validIds.push(childQ.id);
              }
            }
          }
        }
        
        // If no indices or they didn't match, fall back to ID matching
        if (validIds.length === 0) {
          for (const savedId of savedIdArray) {
            // Try direct match
            const directMatch = childQuestions.find(q => idMatchesHelper(q.id, savedId));
            if (directMatch) {
              validIds.push(directMatch.id);
            }
          }
        }
        
        if (validIds.length > 0) {
          convertedMappings[option] = validIds;
        }
      }
      
      console.log('[ConditionalLogicEditor] Converted optionMappings:', convertedMappings);
      setOptionMappings(convertedMappings);
      
      // If it's parent-branching type, switch to simple mode
      if (question.conditionalLogic.metadata.type === 'parent-branching') {
        setActiveTab('simple');
      }
    } else if (question.conditionalLogic?.rules && question.conditionalLogic.rules.length > 0) {
      // Has advanced mode rules
      setActiveTab('advanced');
    }
  }, [question.conditionalLogic, childQuestions]);

  // Validate logic
  useEffect(() => {
    const newErrors: string[] = [];

    if (activeTab === 'simple') {
      // Check if at least one option has questions selected
      const hasAnyMapping = Object.values(optionMappings).some(arr => arr.length > 0);
      if (!canBeParent && activeTab === 'simple') {
        newErrors.push('This question type does not support branching. Use Advanced Mode or add options to this question.');
      }
    } else {
      logic.rules.forEach((rule, index) => {
        if (!rule.sourceQuestionId) {
          newErrors.push(`Condition ${index + 1}: Please select a source question`);
        }
        if (operatorRequiresValue(rule.operator) && (!rule.value || (Array.isArray(rule.value) && rule.value.length === 0))) {
          newErrors.push(`Condition ${index + 1}: Please enter a value`);
        }
        if (rule.sourceQuestionId) {
          const hasCircular = detectCircularDependency(question.id, rule.sourceQuestionId, allQuestions);
          if (hasCircular) {
            newErrors.push(`Condition ${index + 1}: Circular dependency detected`);
          }
        }
      });
    }

    setErrors(newErrors);
  }, [logic, activeTab, optionMappings, canBeParent, question.id, allQuestions]);

  const handleSave = () => {
    if (errors.length > 0) return;

    if (activeTab === 'simple') {
      // Convert option mappings to logic rules for child questions
      const hasAnyMapping = Object.values(optionMappings).some(arr => arr.length > 0);
      
      if (!hasAnyMapping) {
        onSave(null);
      } else {
        // Convert IDs to indices for reliable matching after reload
        // This is necessary because question IDs change on backend save
        const currentQuestionIndex = allQuestions.findIndex(q => q.id === question.id);
        
        // Build optionMappings with both IDs and indices
        const mappingsWithIndices: { [option: string]: { ids: (string | number)[]; indices: number[] } } = {};
        
        for (const [option, questionIds] of Object.entries(optionMappings)) {
          const indices: number[] = [];
          for (const qId of questionIds) {
            const idx = allQuestions.findIndex(q => idMatchesHelper(q.id, qId));
            if (idx > currentQuestionIndex) {
              // Store relative index from parent (1 = first child, 2 = second child, etc.)
              indices.push(idx - currentQuestionIndex);
            }
          }
          mappingsWithIndices[option] = {
            ids: questionIds,
            indices: indices
          };
        }
        
        // Store the branching configuration with indices for reliability
        const branchingConfig: ConditionalLogic = {
          id: `logic-${Date.now()}`,
          enabled: true,
          action: 'show',
          combinator: 'OR',
          rules: [],
          // Store option mappings with both IDs and indices
          metadata: {
            type: 'parent-branching',
            optionMappings: optionMappings,
            optionMappingsWithIndices: mappingsWithIndices
          }
        };
        
        console.log('[ConditionalLogicEditor] Saving with indices:', mappingsWithIndices);
        onSave(branchingConfig);
      }
    } else {
      if (logic.rules.length === 0) {
        onSave(null);
      } else {
        onSave(logic);
      }
    }
  };

  const handleClear = () => {
    setOptionMappings({});
    setExpandedOption(null);
    setLogic({
      id: `logic-${Date.now()}`,
      enabled: true,
      action: 'show',
      combinator: 'AND',
      rules: []
    });
  };

  const addAdvancedRule = () => {
    const newRule: ConditionalRule = {
      id: `rule-${Date.now()}`,
      sourceQuestionId: '',
      operator: 'equals',
      value: '',
    };
    setLogic(prev => ({
      ...prev,
      rules: [...prev.rules, newRule]
    }));
  };

  const updateRule = (ruleId: string, updates: Partial<ConditionalRule>) => {
    setLogic(prev => ({
      ...prev,
      rules: prev.rules.map(rule =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    }));
  };

  const deleteRule = (ruleId: string) => {
    setLogic(prev => ({
      ...prev,
      rules: prev.rules.filter(rule => rule.id !== ruleId)
    }));
  };

  const getSourceQuestionOptions = (sourceQuestionId: number | string) => {
    const sourceQuestion = allQuestions.find(q => q.id === sourceQuestionId);
    if (!sourceQuestion) return [];
    if ((sourceQuestion.type === 'mcq' || sourceQuestion.type === 'multi') && sourceQuestion.options) {
      return sourceQuestion.options;
    }
    if (sourceQuestion.type === 'boolean') {
      return ['Yes', 'No'];
    }
    return [];
  };

  // Toggle question selection for an option
  const toggleQuestionForOption = (option: string, questionId: string | number) => {
    setOptionMappings(prev => {
      const current = prev[option] || [];
      if (current.includes(questionId)) {
        return {
          ...prev,
          [option]: current.filter(id => id !== questionId)
        };
      } else {
        return {
          ...prev,
          [option]: [...current, questionId]
        };
      }
    });
  };

  // Get total assigned questions count
  const getTotalAssignedCount = () => {
    return Object.values(optionMappings).reduce((sum, arr) => sum + arr.length, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <GitBranch className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Question Branching Logic</h2>
                <p className="text-sm text-white/80">Define which questions appear based on answers</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="px-5 pt-4 bg-gray-50 border-b border-gray-200">
          <div className="flex gap-1 p-1 bg-gray-200/80 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('simple')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'simple'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Zap className="w-4 h-4" />
              Simple Mode
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'advanced'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              Advanced Mode
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'simple' ? (
            <SimpleMode
              currentQuestion={question}
              currentQuestionOptions={currentQuestionOptions}
              canBeParent={canBeParent}
              childQuestions={childQuestions}
              optionMappings={optionMappings}
              expandedOption={expandedOption}
              setExpandedOption={setExpandedOption}
              toggleQuestionForOption={toggleQuestionForOption}
              getAssignedToOtherOptions={getAssignedToOtherOptions}
            />
          ) : (
            <AdvancedMode
              logic={logic}
              setLogic={setLogic}
              availableSourceQuestions={availableSourceQuestions}
              allQuestions={allQuestions}
              addRule={addAdvancedRule}
              updateRule={updateRule}
              deleteRule={deleteRule}
              getSourceQuestionOptions={getSourceQuestionOptions}
            />
          )}

          {/* Preview Section - Simple Mode */}
          {activeTab === 'simple' && getTotalAssignedCount() > 0 && (
            <div className="mt-5 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Eye className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-900 mb-2">Branching Summary</p>
                  <div className="space-y-2">
                    {Object.entries(optionMappings).map(([option, questionIds]) => {
                      if (questionIds.length === 0) return null;
                      const questionTexts = questionIds.map(id => {
                        const q = childQuestions.find(cq => idMatchesHelper(cq.id, id));
                        return q ? q.question.substring(0, 40) + (q.question.length > 40 ? '...' : '') : '';
                      }).filter(Boolean);
                      return (
                        <div key={option} className="text-sm text-emerald-700">
                          <span className="font-medium">&quot;{option}&quot;</span>
                          <span className="mx-1">→</span>
                          <span>{questionIds.length} question{questionIds.length !== 1 ? 's' : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview Section - Advanced Mode */}
          {activeTab === 'advanced' && logic.rules.length > 0 && (
            <div className="mt-5 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Eye className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-900 mb-1">Preview</p>
                  <p className="text-sm text-emerald-700">
                    {getLogicPreviewText(logic, allQuestions)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900 mb-1">Please fix the following:</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {errors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-between gap-3">
          <button
            onClick={handleClear}
            className="px-4 py-2.5 text-gray-600 bg-white border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            Clear All
          </button>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={errors.length > 0}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                errors.length > 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:-translate-y-0.5'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Apply Logic
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SIMPLE MODE COMPONENT - New Design
// ============================================================================
interface SimpleModeProps {
  currentQuestion: QuestionWithLogic;
  currentQuestionOptions: string[];
  canBeParent: boolean;
  childQuestions: QuestionWithLogic[];
  optionMappings: OptionMapping;
  expandedOption: string | null;
  setExpandedOption: (option: string | null) => void;
  toggleQuestionForOption: (option: string, questionId: string | number) => void;
  getAssignedToOtherOptions: (currentOption: string) => (string | number)[];
}

function SimpleMode({
  currentQuestion,
  currentQuestionOptions,
  canBeParent,
  childQuestions,
  optionMappings,
  expandedOption,
  setExpandedOption,
  toggleQuestionForOption,
  getAssignedToOtherOptions,
}: SimpleModeProps) {
  
  if (!canBeParent) {
    return (
      <div className="space-y-6">
        {/* Info Card for non-option questions */}
        <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-amber-900 mb-2">Simple Mode Not Available</p>
              <p className="text-sm text-amber-700 mb-3">
                This question doesn&apos;t have selectable options (like Multiple Choice or Yes/No), 
                so Simple Mode branching isn&apos;t available.
              </p>
              <p className="text-sm text-amber-700">
                Use <span className="font-semibold">Advanced Mode</span> to create conditional logic 
                based on other questions in your survey.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Current Question Display */}
      <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-white">Q</span>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Current Question</p>
            <p className="text-base font-medium text-gray-900">{currentQuestion.question}</p>
            <p className="text-xs text-gray-500 mt-1">
              {currentQuestion.type === 'mcq' ? 'Multiple Choice' : currentQuestion.type === 'multi' ? 'Multi-Select' : 'Yes/No'}
              {' • '}
              {currentQuestionOptions.length} options
            </p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Click on each option below</span> to select which questions should appear 
            when respondents choose that answer. Questions can only be assigned to one option.
          </p>
        </div>
      </div>

      {/* Options with Child Question Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">
          Options &amp; Branching
        </label>
        
        {currentQuestionOptions.map((option, optionIdx) => {
          const isExpanded = expandedOption === option;
          const assignedQuestions = optionMappings[option] || [];
          const assignedToOthers = getAssignedToOtherOptions(option);
          
          return (
            <div key={optionIdx} className="border-2 border-gray-200 rounded-xl overflow-hidden">
              {/* Option Header - Clickable */}
              <button
                onClick={() => setExpandedOption(isExpanded ? null : option)}
                className={`w-full p-4 flex items-center justify-between transition-all ${
                  isExpanded 
                    ? 'bg-indigo-50 border-b-2 border-indigo-200' 
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    isExpanded ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {optionIdx + 1}
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${isExpanded ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {option}
                    </p>
                    {assignedQuestions.length > 0 && (
                      <p className="text-xs text-emerald-600 mt-0.5">
                        {assignedQuestions.length} question{assignedQuestions.length !== 1 ? 's' : ''} will show
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {assignedQuestions.length > 0 && (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                      {assignedQuestions.length}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded Content - Child Question Selection */}
              {isExpanded && (
                <div className="p-4 bg-gray-50 animate-in slide-in-from-top-2 duration-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                    Select questions to show when &quot;{option}&quot; is selected:
                  </p>
                  
                  {childQuestions.length === 0 ? (
                    <div className="p-4 bg-white border border-gray-200 rounded-lg text-center">
                      <p className="text-sm text-gray-500">No questions available for mapping</p>
                      <p className="text-xs text-gray-400 mt-1">All questions are already assigned to other conditional logic</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {childQuestions.map((childQ, childIdx) => {
                        const isSelected = isIdInListHelper(childQ.id, assignedQuestions);
                        const isAssignedToOther = isIdInListHelper(childQ.id, assignedToOthers);
                        
                        return (
                          <button
                            key={childQ.id}
                            onClick={() => !isAssignedToOther && toggleQuestionForOption(option, childQ.id)}
                            disabled={isAssignedToOther}
                            className={`w-full p-3 rounded-lg border-2 text-left transition-all flex items-start gap-3 ${
                              isAssignedToOther
                                ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                                : isSelected
                                  ? 'border-emerald-500 bg-emerald-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500'
                                : 'border-gray-300 bg-white'
                            }`}>
                              {isSelected && (
                                <CheckCircle className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${
                                isAssignedToOther 
                                  ? 'text-gray-400' 
                                  : isSelected 
                                    ? 'text-emerald-900' 
                                    : 'text-gray-800'
                              }`}>
                                {childQ.question}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {childQ.type === 'mcq' ? 'Multiple Choice' : 
                                 childQ.type === 'multi' ? 'Multi-Select' : 
                                 childQ.type === 'boolean' ? 'Yes/No' :
                                 childQ.type === 'text' ? 'Text' :
                                 childQ.type === 'textarea' ? 'Long Text' :
                                 childQ.type === 'rating' ? 'Rating' :
                                 childQ.type === 'scale' ? 'Scale' :
                                 childQ.type}
                                {isAssignedToOther && (
                                  <span className="ml-2 text-amber-600">(Assigned to another option)</span>
                                )}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// ADVANCED MODE COMPONENT
// ============================================================================
interface AdvancedModeProps {
  logic: ConditionalLogic;
  setLogic: React.Dispatch<React.SetStateAction<ConditionalLogic>>;
  availableSourceQuestions: QuestionWithLogic[];
  allQuestions: QuestionWithLogic[];
  addRule: () => void;
  updateRule: (ruleId: string, updates: Partial<ConditionalRule>) => void;
  deleteRule: (ruleId: string) => void;
  getSourceQuestionOptions: (questionId: number | string) => string[];
}

function AdvancedMode({
  logic,
  setLogic,
  availableSourceQuestions,
  allQuestions,
  addRule,
  updateRule,
  deleteRule,
  getSourceQuestionOptions,
}: AdvancedModeProps) {
  return (
    <div className="space-y-5">
      {/* Info Card */}
      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Settings2 className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900 mb-1">Advanced Mode</p>
            <p className="text-sm text-amber-700">
              Create complex conditions with multiple rules, different operators (equals, contains, greater than, etc.), 
              and AND/OR logic. Ideal for sophisticated branching scenarios.
            </p>
          </div>
        </div>
      </div>

      {/* Action Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">
          When conditions match:
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLogic(prev => ({ ...prev, action: 'show' }))}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
              logic.action === 'show'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <Eye className={`w-6 h-6 ${logic.action === 'show' ? 'text-emerald-600' : 'text-gray-400'}`} />
            <span className={`text-sm font-medium ${logic.action === 'show' ? 'text-emerald-700' : 'text-gray-600'}`}>
              Show Question
            </span>
          </button>
          <button
            onClick={() => setLogic(prev => ({ ...prev, action: 'hide' }))}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
              logic.action === 'hide'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <EyeOff className={`w-6 h-6 ${logic.action === 'hide' ? 'text-red-600' : 'text-gray-400'}`} />
            <span className={`text-sm font-medium ${logic.action === 'hide' ? 'text-red-700' : 'text-gray-600'}`}>
              Hide Question
            </span>
          </button>
        </div>
      </div>

      {/* Conditions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-700">Conditions</label>
          <button
            onClick={addRule}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Condition
          </button>
        </div>

        {logic.rules.length === 0 ? (
          <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl text-center">
            <Plus className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 font-medium">No conditions yet</p>
            <p className="text-xs text-gray-500 mt-1">Click &quot;Add Condition&quot; to create branching logic</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logic.rules.map((rule, index) => (
              <React.Fragment key={rule.id}>
                <AdvancedRuleEditor
                  rule={rule}
                  index={index}
                  availableQuestions={availableSourceQuestions}
                  allQuestions={allQuestions}
                  onUpdate={(updates) => updateRule(rule.id, updates)}
                  onDelete={() => deleteRule(rule.id)}
                  getQuestionOptions={getSourceQuestionOptions}
                />
                {/* Combinator Badge */}
                {index < logic.rules.length - 1 && (
                  <div className="flex justify-center">
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      logic.combinator === 'AND' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {logic.combinator}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Combinator Toggle */}
      {logic.rules.length > 1 && (
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Match</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setLogic(prev => ({ ...prev, combinator: 'AND' }))}
              className={`p-3 rounded-xl border-2 transition-all ${
                logic.combinator === 'AND'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className={`text-sm font-medium ${logic.combinator === 'AND' ? 'text-purple-700' : 'text-gray-600'}`}>
                ALL conditions (AND)
              </span>
            </button>
            <button
              onClick={() => setLogic(prev => ({ ...prev, combinator: 'OR' }))}
              className={`p-3 rounded-xl border-2 transition-all ${
                logic.combinator === 'OR'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className={`text-sm font-medium ${logic.combinator === 'OR' ? 'text-blue-700' : 'text-gray-600'}`}>
                ANY condition (OR)
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ADVANCED RULE EDITOR COMPONENT
// ============================================================================
interface AdvancedRuleEditorProps {
  rule: ConditionalRule;
  index: number;
  availableQuestions: QuestionWithLogic[];
  allQuestions: QuestionWithLogic[];
  onUpdate: (updates: Partial<ConditionalRule>) => void;
  onDelete: () => void;
  getQuestionOptions: (questionId: number | string) => string[];
}

function AdvancedRuleEditor({
  rule,
  index,
  availableQuestions,
  allQuestions,
  onUpdate,
  onDelete,
  getQuestionOptions,
}: AdvancedRuleEditorProps) {
  const sourceQuestion = allQuestions.find(q => q.id === rule.sourceQuestionId);
  const availableOperators = sourceQuestion ? getAvailableOperators(sourceQuestion.type) : [];
  const requiresValue = operatorRequiresValue(rule.operator);
  const supportsMultiple = operatorSupportsMultipleValues(rule.operator);
  const questionOptions = rule.sourceQuestionId ? getQuestionOptions(rule.sourceQuestionId) : [];

  return (
    <div className="p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Condition {index + 1}
        </span>
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Question Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">If question:</label>
          <select
            value={rule.sourceQuestionId || ''}
            onChange={(e) => onUpdate({
              sourceQuestionId: e.target.value ? parseInt(e.target.value) || e.target.value : '',
              operator: 'equals',
              value: ''
            })}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all"
          >
            <option value="">Select a question...</option>
            {availableQuestions.map(q => (
              <option key={q.id} value={q.id}>
                {q.question}
              </option>
            ))}
          </select>
        </div>

        {/* Operator Selection */}
        {rule.sourceQuestionId && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Condition:</label>
            <select
              value={rule.operator}
              onChange={(e) => onUpdate({ operator: e.target.value as LogicOperator, value: '' })}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all"
            >
              {availableOperators.map(op => (
                <option key={op} value={op}>
                  {getOperatorLabel(op)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Value Selection */}
        {rule.sourceQuestionId && requiresValue && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Value:</label>
            {questionOptions.length > 0 ? (
              supportsMultiple ? (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                  {questionOptions.map((option, idx) => (
                    <label key={idx} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Array.isArray(rule.value) && rule.value.includes(option)}
                        onChange={(e) => {
                          const currentValues = Array.isArray(rule.value) ? rule.value : [];
                          const newValues = e.target.checked
                            ? [...currentValues, option]
                            : currentValues.filter(v => v !== option);
                          onUpdate({ value: newValues });
                        }}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <select
                  value={String(rule.value || '')}
                  onChange={(e) => onUpdate({ value: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all"
                >
                  <option value="">Select a value...</option>
                  {questionOptions.map((option, idx) => (
                    <option key={idx} value={option}>{option}</option>
                  ))}
                </select>
              )
            ) : (
              <input
                type="text"
                value={String(rule.value || '')}
                onChange={(e) => onUpdate({ value: e.target.value })}
                placeholder="Enter value..."
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
