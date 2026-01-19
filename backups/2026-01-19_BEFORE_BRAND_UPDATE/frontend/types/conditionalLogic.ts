// Enhanced Conditional Logic Types

export type LogicOperator = 
  | 'equals' 
  | 'notEquals' 
  | 'contains' 
  | 'notContains'
  | 'greaterThan' 
  | 'lessThan'
  | 'greaterThanOrEquals'
  | 'lessThanOrEquals'
  | 'isAnyOf'
  | 'isNoneOf'
  | 'isEmpty'
  | 'isNotEmpty';

export type LogicCombinator = 'AND' | 'OR';

export interface ConditionalRule {
  id: string;
  sourceQuestionId: number | string;
  operator: LogicOperator;
  value: string | string[] | number | null;
  targetOptions?: string[]; // For option-based logic (e.g., if Q1 option 'OP1' selected)
}

// Option to child questions mapping for Simple Mode branching
export interface OptionMapping {
  [option: string]: (string | number)[];
}

export interface ConditionalLogic {
  id: string;
  enabled: boolean;
  action: 'show' | 'hide'; // Action to take when conditions are met
  combinator: LogicCombinator; // How to combine multiple rules
  rules: ConditionalRule[];
  // Metadata for parent-based Simple Mode branching
  metadata?: {
    type?: 'parent-branching' | 'child-condition';
    optionMappings?: OptionMapping;
  };
}

export interface QuestionWithLogic {
  id: number | string;
  type: string;
  question: string;
  conditionalLogic?: ConditionalLogic | null;
  // Legacy support
  parentQuestionId?: number | string | null;
  conditionalValue?: string | null;
}

// Validation Result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Helper to check if question has valid conditional logic
export function hasConditionalLogic(question: QuestionWithLogic): boolean {
  return !!(
    question.conditionalLogic?.enabled && 
    question.conditionalLogic.rules.length > 0
  );
}

// Helper to get all source questions for a target question
export function getSourceQuestions(
  targetQuestion: QuestionWithLogic,
  allQuestions: QuestionWithLogic[]
): QuestionWithLogic[] {
  if (!hasConditionalLogic(targetQuestion)) return [];
  
  const sourceIds = new Set(
    targetQuestion.conditionalLogic!.rules.map(r => r.sourceQuestionId)
  );
  
  return allQuestions.filter(q => sourceIds.has(q.id));
}

// Helper to detect circular dependencies
export function detectCircularDependency(
  questionId: number | string,
  sourceQuestionId: number | string,
  allQuestions: QuestionWithLogic[]
): boolean {
  const visited = new Set<number | string>();
  
  function hasCycle(currentId: number | string): boolean {
    if (currentId === questionId) return true;
    if (visited.has(currentId)) return false;
    
    visited.add(currentId);
    
    const currentQuestion = allQuestions.find(q => q.id === currentId);
    if (!currentQuestion || !hasConditionalLogic(currentQuestion)) return false;
    
    // Check all source questions
    const sources = getSourceQuestions(currentQuestion, allQuestions);
    return sources.some(src => hasCycle(src.id));
  }
  
  return hasCycle(sourceQuestionId);
}

// Get operator display name
export function getOperatorLabel(operator: LogicOperator): string {
  const labels: Record<LogicOperator, string> = {
    equals: 'is equal to',
    notEquals: 'is not equal to',
    contains: 'contains',
    notContains: 'does not contain',
    greaterThan: 'is greater than',
    lessThan: 'is less than',
    greaterThanOrEquals: 'is greater than or equal to',
    lessThanOrEquals: 'is less than or equal to',
    isAnyOf: 'is any of',
    isNoneOf: 'is none of',
    isEmpty: 'is empty',
    isNotEmpty: 'is not empty',
  };
  return labels[operator];
}

// Get operators available for a question type
export function getAvailableOperators(questionType: string): LogicOperator[] {
  const textOperators: LogicOperator[] = [
    'equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty'
  ];
  
  const numberOperators: LogicOperator[] = [
    'equals', 'notEquals', 'greaterThan', 'lessThan', 
    'greaterThanOrEquals', 'lessThanOrEquals', 'isEmpty', 'isNotEmpty'
  ];
  
  const selectOperators: LogicOperator[] = [
    'equals', 'notEquals', 'isAnyOf', 'isNoneOf', 'isEmpty', 'isNotEmpty'
  ];
  
  switch (questionType) {
    case 'mcq':
    case 'radio':
    case 'multi':
    case 'multiselect':
    case 'boolean':
      return selectOperators;
    
    case 'slider':
    case 'scale':
    case 'rating':
    case 'number':
      return numberOperators;
    
    case 'text':
    case 'textarea':
    case 'email':
    default:
      return textOperators;
  }
}

// Check if operator requires a value
export function operatorRequiresValue(operator: LogicOperator): boolean {
  return !['isEmpty', 'isNotEmpty'].includes(operator);
}

// Check if operator supports multiple values
export function operatorSupportsMultipleValues(operator: LogicOperator): boolean {
  return ['isAnyOf', 'isNoneOf'].includes(operator);
}

// Migrate legacy conditional logic to new format
export function migrateLegacyLogic(question: QuestionWithLogic): ConditionalLogic | null {
  if (question.parentQuestionId && question.conditionalValue) {
    return {
      id: `legacy-${Date.now()}`,
      enabled: true,
      action: 'show',
      combinator: 'AND',
      rules: [{
        id: `rule-${Date.now()}`,
        sourceQuestionId: question.parentQuestionId,
        operator: 'equals',
        value: question.conditionalValue,
        targetOptions: undefined
      }]
    };
  }
  return null;
}
