// Conditional Logic Runtime Evaluator

import {
  ConditionalLogic,
  ConditionalRule,
  LogicOperator,
  QuestionWithLogic,
  hasConditionalLogic,
  OptionMapping
} from '@/types/conditionalLogic';

/**
 * Helper to get conditionalLogic from either question.conditionalLogic or question.settings.conditionalLogic
 * This handles both frontend (conditionalLogic) and backend (settings.conditionalLogic) formats
 */
function getQuestionConditionalLogic(question: any): ConditionalLogic | null {
  // First try direct conditionalLogic property (frontend format)
  if (question.conditionalLogic) {
    return question.conditionalLogic;
  }
  // Then try settings.conditionalLogic (backend format)
  if (question.settings?.conditionalLogic) {
    return question.settings.conditionalLogic;
  }
  return null;
}

/**
 * Helper to check if question has valid conditional logic (works with both formats)
 */
function questionHasConditionalLogic(question: any): boolean {
  const logic = getQuestionConditionalLogic(question);
  return !!(logic?.enabled && logic.rules && logic.rules.length > 0);
}

/**
 * Checks if a question is a child of a parent question based on parent's optionMappings
 * Returns the option value that makes this question visible, or null if not a child
 */
function getParentOptionForChild(
  childQuestionId: string | number,
  parentQuestion: any
): string | null {
  const logic = getQuestionConditionalLogic(parentQuestion);
  const metadata = (logic as any)?.metadata;
  if (!metadata?.optionMappings) return null;
  
  const optionMappings: OptionMapping = metadata.optionMappings;
  
  for (const [option, childIds] of Object.entries(optionMappings)) {
    const childIdArray = childIds as (string | number)[];
    if (childIdArray.includes(childQuestionId) || childIdArray.includes(String(childQuestionId)) || childIdArray.includes(Number(childQuestionId) as any)) {
      return option;
    }
  }
  return null;
}

/**
 * Builds a mapping from stored IDs to current question IDs based on position
 * This handles cases where question IDs changed but their order/position stayed the same
 */
function buildIdMapping(
  optionMappings: OptionMapping,
  childQuestions: any[]
): Map<string | number, string | number> {
  const mapping = new Map<string | number, string | number>();
  
  // Collect all unique stored IDs in order they appear
  const allStoredIds: (string | number)[] = [];
  Object.values(optionMappings).forEach(ids => {
    ids.forEach(id => {
      if (!allStoredIds.includes(id)) {
        allStoredIds.push(id);
      }
    });
  });
  
  // Map stored IDs to current question IDs by position
  allStoredIds.forEach((storedId, index) => {
    if (index < childQuestions.length) {
      mapping.set(storedId, childQuestions[index].id);
      mapping.set(String(storedId), childQuestions[index].id);
    }
  });
  
  return mapping;
}

/**
 * Checks if a question should be visible based on parent-based Simple Mode branching
 * This checks if any parent question has optionMappings that include this question
 */
function evaluateParentBasedBranching(
  question: any,
  allQuestions: any[],
  responses: Record<string, any>
): { hasParentBranching: boolean; isVisible: boolean } {
  const questionIndex = allQuestions.findIndex(q => q.id === question.id);
  
  // Debug log
  if (typeof window !== 'undefined' && questionIndex <= 6) {
    console.log(`[Eval] Checking Q${questionIndex}: ${(question.title || question.question || '').substring(0, 30)}`);
  }
  
  // Find any parent question that has optionMappings containing this question
  for (const parentQuestion of allQuestions) {
    const logic = getQuestionConditionalLogic(parentQuestion);
    const metadata = (logic as any)?.metadata;
    
    if (metadata?.type === 'parent-branching' && metadata?.optionMappings) {
      const optionMappings: OptionMapping = metadata.optionMappings;
      const optionMappingsWithIndices = metadata?.optionMappingsWithIndices;
      const parentIndex = allQuestions.findIndex(q => q.id === parentQuestion.id);
      
      // Debug: Log parent found
      if (typeof window !== 'undefined' && questionIndex <= 6) {
        console.log(`[Eval] Found parent at index ${parentIndex} with mappings:`, optionMappingsWithIndices);
      }
      
      // Skip if question is before or same as parent
      if (questionIndex <= parentIndex) continue;
      
      // Calculate relative index (1 = first child after parent)
      const relativeIndex = questionIndex - parentIndex;
      
      // Debug
      if (typeof window !== 'undefined' && questionIndex <= 6) {
        console.log(`[Eval] Q${questionIndex} relative index: ${relativeIndex}`);
      }
      
      // Check if this question is mapped to any option
      for (const [option, childIds] of Object.entries(optionMappings)) {
        const childIdArray = childIds as (string | number)[];
        
        // First check by index (most reliable)
        let isChild = false;
        if (optionMappingsWithIndices?.[option]?.indices) {
          const savedIndices = optionMappingsWithIndices[option].indices as number[];
          isChild = savedIndices.includes(relativeIndex);
          
          // Debug
          if (typeof window !== 'undefined' && questionIndex <= 6) {
            console.log(`[Eval] Option "${option}" indices: [${savedIndices}], isChild: ${isChild}`);
          }
        }
        
        // Fall back to ID matching
        if (!isChild) {
          isChild = childIdArray.some((storedId: string | number) => 
            storedId === question.id || String(storedId) === String(question.id)
          );
        }
        
        if (isChild) {
          // This question is a child - check if parent's selected option matches
          const parentResponse = responses[parentQuestion.id] || responses[String(parentQuestion.id)];
          
          // Debug
          if (typeof window !== 'undefined') {
            console.log(`[Eval] Q${questionIndex} is child of "${option}", parentResponse: "${parentResponse}"`);
          }
          
          if (!parentResponse) {
            // Parent not answered yet - hide child
            console.log(`[Eval] Q${questionIndex} HIDDEN - parent not answered`);
            return { hasParentBranching: true, isVisible: false };
          }
          
          // Check if the selected response matches this option
          const normalizedResponse = String(parentResponse).toLowerCase().trim();
          const normalizedOption = String(option).toLowerCase().trim();
          
          if (normalizedResponse === normalizedOption) {
            console.log(`[Eval] Q${questionIndex} VISIBLE - option matches`);
            return { hasParentBranching: true, isVisible: true };
          } else {
            // Response doesn't match this option - need to continue checking other options
            // Don't return yet, as the question might be mapped to another option
          }
        }
      }
      
      // Check if this question is a child of ANY option (to hide it if wrong option selected)
      let isChildOfAnyOption = false;
      let matchedOption = '';
      
      for (const [option, childIds] of Object.entries(optionMappings)) {
        const childIdArray = childIds as (string | number)[];
        
        // Check by index first
        if (optionMappingsWithIndices?.[option]?.indices) {
          const savedIndices = optionMappingsWithIndices[option].indices as number[];
          if (savedIndices.includes(relativeIndex)) {
            isChildOfAnyOption = true;
            matchedOption = option;
            break;
          }
        }
        
        // Fall back to ID matching
        if (childIdArray.some((storedId: string | number) => 
          storedId === question.id || String(storedId) === String(question.id)
        )) {
          isChildOfAnyOption = true;
          matchedOption = option;
          break;
        }
      }
      
      if (isChildOfAnyOption) {
        // This question is controlled by parent but selected option doesn't show it
        const parentResponse = responses[parentQuestion.id] || responses[String(parentQuestion.id)];
        if (typeof window !== 'undefined') {
          console.log(`[Eval] Q${questionIndex} is child of "${matchedOption}", but response is "${parentResponse}" - HIDING`);
        }
        return { hasParentBranching: true, isVisible: false };
      }
    }
  }
  
  // No parent-based branching found for this question
  return { hasParentBranching: false, isVisible: true };
}

/**
 * Evaluates a single conditional rule against a response value
 */
export function evaluateRule(
  rule: ConditionalRule,
  responseValue: any,
  sourceQuestion?: QuestionWithLogic
): boolean {
  const { operator, value } = rule;
  
  // Handle empty/null responses
  if (responseValue === null || responseValue === undefined || responseValue === '') {
    if (operator === 'isEmpty') return true;
    if (operator === 'isNotEmpty') return false;
    return false;
  }
  
  // Handle array responses (multi-select)
  if (Array.isArray(responseValue)) {
    if (operator === 'isEmpty') return responseValue.length === 0;
    if (operator === 'isNotEmpty') return responseValue.length > 0;
    
    // Convert array to comparable format
    const responseArray = responseValue.map(v => String(v).toLowerCase());
    
    switch (operator) {
      case 'equals':
        return responseArray.length === 1 && responseArray[0] === String(value).toLowerCase();
      
      case 'notEquals':
        return !(responseArray.length === 1 && responseArray[0] === String(value).toLowerCase());
      
      case 'contains':
        return responseArray.some(v => v.includes(String(value).toLowerCase()));
      
      case 'notContains':
        return !responseArray.some(v => v.includes(String(value).toLowerCase()));
      
      case 'isAnyOf':
        if (!Array.isArray(value)) return false;
        return value.some(v => responseArray.includes(String(v).toLowerCase()));
      
      case 'isNoneOf':
        if (!Array.isArray(value)) return true;
        return !value.some(v => responseArray.includes(String(v).toLowerCase()));
      
      default:
        return false;
    }
  }
  
  // Handle string responses
  const responseStr = String(responseValue).toLowerCase().trim();
  
  switch (operator) {
    case 'isEmpty':
      return responseStr === '';
    
    case 'isNotEmpty':
      return responseStr !== '';
    
    case 'equals':
      return responseStr === String(value).toLowerCase().trim();
    
    case 'notEquals':
      return responseStr !== String(value).toLowerCase().trim();
    
    case 'contains':
      return responseStr.includes(String(value).toLowerCase().trim());
    
    case 'notContains':
      return !responseStr.includes(String(value).toLowerCase().trim());
    
    case 'isAnyOf':
      if (!Array.isArray(value)) return false;
      return value.some(v => responseStr === String(v).toLowerCase().trim());
    
    case 'isNoneOf':
      if (!Array.isArray(value)) return true;
      return !value.some(v => responseStr === String(v).toLowerCase().trim());
  }
  
  // Handle numeric comparisons
  const responseNum = parseFloat(String(responseValue));
  const valueNum = parseFloat(String(value));
  
  if (!isNaN(responseNum) && !isNaN(valueNum)) {
    switch (operator) {
      case 'greaterThan':
        return responseNum > valueNum;
      
      case 'lessThan':
        return responseNum < valueNum;
      
      case 'greaterThanOrEquals':
        return responseNum >= valueNum;
      
      case 'lessThanOrEquals':
        return responseNum <= valueNum;
    }
  }
  
  return false;
}

/**
 * Evaluates all conditional logic for a question (child-based Advanced Mode logic)
 * Works with both frontend (question.conditionalLogic) and backend (question.settings.conditionalLogic) formats
 */
export function evaluateConditionalLogic(
  question: any,
  responses: Record<string, any>,
  allQuestions: any[]
): boolean {
  // Get conditional logic from either format
  const logic = getQuestionConditionalLogic(question);
  
  // If no conditional logic, always show
  if (!logic) {
    return true;
  }
  
  // Skip parent-branching type logic (this is evaluated separately)
  if ((logic as any).metadata?.type === 'parent-branching') {
    return true;
  }
  
  if (!logic.enabled || !logic.rules || logic.rules.length === 0) {
    return true;
  }
  
  // Evaluate each rule
  const ruleResults = logic.rules.map((rule: ConditionalRule) => {
    const sourceQuestion = allQuestions.find(q => q.id === rule.sourceQuestionId);
    const responseValue = responses[rule.sourceQuestionId] || responses[String(rule.sourceQuestionId)];
    return evaluateRule(rule, responseValue, sourceQuestion);
  });
  
  // Combine results based on combinator
  const conditionMet = logic.combinator === 'AND'
    ? ruleResults.every((result: boolean) => result)
    : ruleResults.some((result: boolean) => result);
  
  // Return based on action (show/hide)
  return logic.action === 'show' ? conditionMet : !conditionMet;
}

/**
 * Filters questions based on conditional logic and current responses
 * Supports both:
 * 1. Parent-based Simple Mode branching (optionMappings on parent)
 * 2. Child-based Advanced Mode logic (conditionalLogic on child)
 * 
 * Works with both frontend and backend question formats
 */
export function filterQuestionsByLogic(
  questions: any[],
  responses: Record<string, any>,
  allQuestions?: any[]
): any[] {
  const questionsToEvaluate = allQuestions || questions;
  
  // Store debug info on window for inspection
  if (typeof window !== 'undefined') {
    (window as any).__conditionalLogicDebug = {
      totalQuestions: questionsToEvaluate.length,
      responses: responses,
      questionsWithLogic: questionsToEvaluate.filter(q => {
        const logic = getQuestionConditionalLogic(q);
        return (logic as any)?.metadata?.type === 'parent-branching';
      }).map(q => ({
        id: q.id,
        title: (q.title || q.question || '').substring(0, 40),
        optionMappings: (getQuestionConditionalLogic(q) as any)?.metadata?.optionMappings,
        optionMappingsWithIndices: (getQuestionConditionalLogic(q) as any)?.metadata?.optionMappingsWithIndices
      }))
    };
  }
  
  const filteredResults: any[] = [];
  
  const result = questions.filter(question => {
    // First check parent-based Simple Mode branching
    const parentBranchingResult = evaluateParentBasedBranching(question, questionsToEvaluate, responses);
    
    if (parentBranchingResult.hasParentBranching) {
      // This question is controlled by parent branching
      filteredResults.push({
        id: question.id,
        title: (question.title || question.question || '').substring(0, 30),
        hasParentBranching: true,
        isVisible: parentBranchingResult.isVisible
      });
      return parentBranchingResult.isVisible;
    }
    
    // Then check child-based Advanced Mode conditional logic
    const visible = evaluateConditionalLogic(question, responses, questionsToEvaluate);
    filteredResults.push({
      id: question.id,
      title: (question.title || question.question || '').substring(0, 30),
      hasParentBranching: false,
      isVisible: visible
    });
    return visible;
  });
  
  // Store filtered results for debugging
  if (typeof window !== 'undefined') {
    (window as any).__conditionalLogicDebug.filteredResults = filteredResults;
    (window as any).__conditionalLogicDebug.visibleCount = result.length;
    (window as any).__conditionalLogicDebug.hiddenCount = questions.length - result.length;
  }
  
  return result;
}

/**
 * Gets all questions that should be visible in a section
 */
export function getVisibleQuestions(
  section: { questions: any[] },
  responses: Record<string, any>,
  allQuestions?: any[]
): any[] {
  const questionsToEvaluate = allQuestions || section.questions;
  return filterQuestionsByLogic(section.questions, responses, questionsToEvaluate);
}

/**
 * Validates if a question should be shown based on cascading logic
 * (checks if all parent questions are also visible)
 */
export function isQuestionVisibleCascading(
  questionId: number | string,
  allQuestions: any[],
  responses: Record<string, any>,
  visited: Set<number | string> = new Set()
): boolean {
  // Prevent infinite loops
  if (visited.has(questionId)) return true;
  visited.add(questionId);
  
  const question = allQuestions.find(q => q.id === questionId);
  if (!question) return false;
  
  // Check if this question's logic is satisfied
  const isVisible = evaluateConditionalLogic(question, responses, allQuestions);
  if (!isVisible) return false;
  
  // Check if all parent questions are also visible (for child-based logic)
  const conditionalLogic = getQuestionConditionalLogic(question);
  if (conditionalLogic && conditionalLogic.rules && conditionalLogic.rules.length > 0) {
    const sourceQuestionIds = conditionalLogic.rules.map((r: any) => r.sourceQuestionId);
    return sourceQuestionIds.every((sourceId: any) => 
      isQuestionVisibleCascading(sourceId, allQuestions, responses, visited)
    );
  }
  
  return true;
}

/**
 * Gets a preview text describing the conditional logic
 */
export function getLogicPreviewText(
  logic: ConditionalLogic,
  allQuestions: QuestionWithLogic[]
): string {
  if (!logic.enabled || logic.rules.length === 0) {
    return 'This question will always be shown.';
  }
  
  const action = logic.action === 'show' ? 'shown' : 'hidden';
  const combinator = logic.combinator === 'AND' ? 'all' : 'any';
  
  if (logic.rules.length === 1) {
    const rule = logic.rules[0];
    const sourceQuestion = allQuestions.find(q => q.id === rule.sourceQuestionId);
    const questionText = sourceQuestion?.question || 'Unknown Question';
    const operator = getOperatorText(rule.operator);
    const value = formatValue(rule.value);
    
    return `This question will be ${action} when "${questionText}" ${operator} ${value}`;
  }
  
  return `This question will be ${action} when ${combinator} of ${logic.rules.length} conditions are met`;
}

function getOperatorText(operator: LogicOperator): string {
  const texts: Record<LogicOperator, string> = {
    equals: 'equals',
    notEquals: 'does not equal',
    contains: 'contains',
    notContains: 'does not contain',
    greaterThan: 'is greater than',
    lessThan: 'is less than',
    greaterThanOrEquals: 'is at least',
    lessThanOrEquals: 'is at most',
    isAnyOf: 'is any of',
    isNoneOf: 'is none of',
    isEmpty: 'is empty',
    isNotEmpty: 'is not empty',
  };
  return texts[operator];
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return 'empty';
  if (Array.isArray(value)) return `[${value.join(', ')}]`;
  return `"${value}"`;
}
