# Conditional Logic Constraint Rule Implementation

## Requirement
Prevent duplicate question assignment across conditional logic rules in the questionnaire.

## Rule
If a question is already mapped under conditional logic for any option of ANY trigger question,
that same question must be excluded from selection in all other conditional logic mappings.

## Example Scenario
- **Trigger Question 1**: "Please select the option below that best matches your profile."
  - Option "Doctor" → shows Q2, Q3, Q5
  - Option "Patient" → shows Q6, Q7, Q8

- **Trigger Question 2**: "D1. Which guideline do you primarily follow?"
  - When configuring, Q2, Q3, Q5, Q6, Q7, Q8 should NOT be available for selection
  - Only unmapped questions can be selected

## Implementation Approach

### 1. Add Global Mapping Tracker
```typescript
const getAllMappedQuestions = useMemo(() => {
  const mapped: Set<string> = new Set();
  
  allQuestions.forEach((q) => {
    if (q.id === question.id) return; // Skip current question
    
    if (q.conditionalLogic && q.conditionalLogic.enabled) {
      // Check parent-branching (simple mode)
      if (q.conditionalLogic.metadata?.type === 'parent-branching') {
        const optionMappings = q.conditionalLogic.metadata.optionMappings;
        if (optionMappings) {
          Object.values(optionMappings).forEach((questionIds: any) => {
            if (Array.isArray(questionIds)) {
              questionIds.forEach(id => mapped.add(String(id)));
            }
          });
        }
      }
      
      // Check advanced mode rules
      if (q.conditionalLogic.rules && Array.isArray(q.conditionalLogic.rules)) {
        q.conditionalLogic.rules.forEach(rule => {
          if (rule.targetQuestionId) {
            mapped.add(String(rule.targetQuestionId));
          }
        });
      }
    }
  });
  
  return Array.from(mapped);
}, [allQuestions, question.id]);
```

### 2. Filter Available Questions
```typescript
const getAvailableChildQuestions = (currentOption?: string): QuestionWithLogic[] => {
  const globallyMapped = getAllMappedQuestions;
  const locallyAssignedToOthers = currentOption ? getAssignedToOtherOptions(currentOption) : [];
  
  return childQuestions.filter(q => {
    const qIdStr = String(q.id);
    return !globallyMapped.includes(qIdStr) && 
           !locallyAssignedToOthers.some(id => String(id) === qIdStr);
  });
};
```

### 3. Update UI Components
Replace all instances of `childQuestions` with `getAvailableChildQuestions(currentOption)` in:
- Simple mode question selection dropdowns
- Option mapping selectors
- Any UI where child questions are listed for selection

## Benefits
1. **Prevents Conflicts**: No question can be controlled by multiple triggers
2. **Clear Logic**: One-to-one mapping ensures predictable behavior  
3. **Better UX**: Users can't accidentally create conflicting rules
4. **Data Integrity**: Maintains clean conditional logic structure

## Files Modified
- `/var/www/QSightsOrg2.0/frontend/components/EnhancedConditionalLogicEditor.tsx`

## Status
Ready for implementation. Backup created at:
`EnhancedConditionalLogicEditor.tsx.backup.constraint_rule`
