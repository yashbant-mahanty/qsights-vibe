import React, { useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X, AlertCircle, Info } from 'lucide-react';
import { validateRangeMappings, validateTextMappings, autoGenerateTextMappings } from '@/lib/valueDisplayUtils';

interface ValueDisplayModeConfigProps {
  settings: any;
  questionId: string;
  sectionId: number;
  setSections: React.Dispatch<React.SetStateAction<any[]>>;
}

// Helper to preserve scroll position during state updates
const withScrollPreservation = (fn: () => void) => {
  const scrollY = window.scrollY;
  fn();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    });
  });
};

export function ValueDisplayModeConfig({ 
  settings, 
  questionId, 
  sectionId, 
  setSections 
}: ValueDisplayModeConfigProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const valueDisplayMode = settings.valueDisplayMode || 'number';
  const rangeMappings = settings.rangeMappings || [];
  const textMappings = settings.textMappings || [];
  const min = settings.min ?? 0;
  const max = settings.max ?? 10;
  const step = settings.step ?? 1;

  const updateSettings = useCallback((newSettings: any) => {
    withScrollPreservation(() => {
      setSections(prevSections =>
        prevSections.map(section =>
          section.id === sectionId
            ? {
                ...section,
                questions: section.questions.map((q: any) =>
                  q.id === questionId
                    ? { ...q, settings: { ...settings, ...newSettings } }
                    : q
                )
              }
            : section
        )
      );
    });
  }, [sectionId, questionId, settings, setSections]);

  const handleModeChange = (mode: 'number' | 'range' | 'text') => {
    setValidationErrors([]);
    updateSettings({ valueDisplayMode: mode });
  };

  const addRangeMapping = (type: 'between' | 'lessThan' | 'greaterThan' = 'between') => {
    let newMapping: any;
    
    if (type === 'lessThan') {
      // Less than range: value < max
      newMapping = {
        min: min,
        max: rangeMappings.length > 0 ? rangeMappings[0].min : Math.round((max - min) * 0.2) + min,
        label: `< ${Math.round((max - min) * 0.2) + min}`,
        type: 'lessThan'
      };
    } else if (type === 'greaterThan') {
      // Greater than range: value >= min
      const lastMax = rangeMappings.length > 0 ? rangeMappings[rangeMappings.length - 1].max : Math.round((max - min) * 0.8) + min;
      newMapping = {
        min: lastMax,
        max: max,
        label: `≥ ${lastMax}`,
        type: 'greaterThan'
      };
    } else {
      // Default between range
      newMapping = {
        min: rangeMappings.length > 0 ? rangeMappings[rangeMappings.length - 1].max : min,
        max: max,
        label: `Range ${rangeMappings.length + 1}`,
        type: 'between'
      };
    }
    
    updateSettings({ rangeMappings: [...rangeMappings, newMapping] });
  };

  const updateRangeMapping = (index: number, field: 'min' | 'max' | 'label' | 'type', value: any) => {
    const updated = [...rangeMappings];
    if (field === 'label' || field === 'type') {
      updated[index] = { ...updated[index], [field]: value };
    } else {
      updated[index] = { ...updated[index], [field]: Number(value) };
    }
    updateSettings({ rangeMappings: updated });
    
    // Validate
    const validation = validateRangeMappings(updated, min, max);
    setValidationErrors(validation.errors);
  };

  const deleteRangeMapping = (index: number) => {
    const updated = rangeMappings.filter((_: any, i: number) => i !== index);
    updateSettings({ rangeMappings: updated });
    
    if (updated.length > 0) {
      const validation = validateRangeMappings(updated, min, max);
      setValidationErrors(validation.errors);
    } else {
      setValidationErrors([]);
    }
  };

  const addTextMapping = () => {
    const newValue = textMappings.length > 0 
      ? Math.min(textMappings[textMappings.length - 1].value + step, max)
      : min;
    const newMapping = {
      value: newValue,
      label: `Label ${textMappings.length + 1}`
    };
    updateSettings({ textMappings: [...textMappings, newMapping] });
  };

  const updateTextMapping = (index: number, field: 'value' | 'label', value: any) => {
    const updated = [...textMappings];
    updated[index] = { ...updated[index], [field]: field === 'label' ? value : Number(value) };
    updateSettings({ textMappings: updated });
    
    // Validate
    const validation = validateTextMappings(updated, min, max, step);
    setValidationErrors(validation.errors);
  };

  const deleteTextMapping = (index: number) => {
    const updated = textMappings.filter((_: any, i: number) => i !== index);
    updateSettings({ textMappings: updated });
    
    if (updated.length > 0) {
      const validation = validateTextMappings(updated, min, max, step);
      setValidationErrors(validation.errors);
    } else {
      setValidationErrors([]);
    }
  };

  const handleAutoGenerate = () => {
    const generated = autoGenerateTextMappings(min, max, step);
    updateSettings({ textMappings: generated });
    setValidationErrors([]);
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">Value Display Mode</span>
      </div>

      {/* Mode Selection */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <label className={`flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
          valueDisplayMode === 'number' 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 hover:border-gray-300'
        }`}>
          <input
            type="radio"
            name={`value-mode-${questionId}`}
            value="number"
            checked={valueDisplayMode === 'number'}
            onChange={() => handleModeChange('number')}
            className="sr-only"
          />
          <span className="text-sm font-medium">Number</span>
          <span className="text-xs text-gray-500 mt-1">Display: 8</span>
        </label>

        <label className={`flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
          valueDisplayMode === 'range' 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 hover:border-gray-300'
        }`}>
          <input
            type="radio"
            name={`value-mode-${questionId}`}
            value="range"
            checked={valueDisplayMode === 'range'}
            onChange={() => handleModeChange('range')}
            className="sr-only"
          />
          <span className="text-sm font-medium">Range</span>
          <span className="text-xs text-gray-500 mt-1">Display: High (7-10)</span>
        </label>

        <label className={`flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
          valueDisplayMode === 'text' 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 hover:border-gray-300'
        }`}>
          <input
            type="radio"
            name={`value-mode-${questionId}`}
            value="text"
            checked={valueDisplayMode === 'text'}
            onChange={() => handleModeChange('text')}
            className="sr-only"
          />
          <span className="text-sm font-medium">Text</span>
          <span className="text-xs text-gray-500 mt-1">Display: Excellent</span>
        </label>
      </div>

      {/* Range Mode Configuration */}
      {valueDisplayMode === 'range' && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium text-blue-900">Range Mappings</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => addRangeMapping('lessThan')}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                title="Add a 'less than' range (e.g., < 20%)"
              >
                <Plus className="w-3 h-3 mr-1" />
                &lt; Less Than
              </Button>
              <Button
                type="button"
                onClick={() => addRangeMapping('between')}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                title="Add a 'between' range (e.g., 20-40)"
              >
                <Plus className="w-3 h-3 mr-1" />
                Between
              </Button>
              <Button
                type="button"
                onClick={() => addRangeMapping('greaterThan')}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                title="Add a 'greater than or equal' range (e.g., ≥ 60%)"
              >
                <Plus className="w-3 h-3 mr-1" />
                ≥ Greater Than
              </Button>
            </div>
          </div>
          
          {rangeMappings.length === 0 && (
            <p className="text-xs text-gray-600 mb-3">
              No ranges defined. Add ranges to map numeric values to labels.
              <br />
              <span className="text-blue-600">💡 Example: For percentage questions use "Less Than" for &lt;20%, "Between" for 20-40%, and "Greater Than" for ≥60%</span>
            </p>
          )}

          <div className="space-y-2">
            {rangeMappings.map((mapping: any, index: number) => {
              const rangeType = mapping.type || 'between';
              return (
                <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                  {/* Range Type Indicator */}
                  <select
                    value={rangeType}
                    onChange={(e) => updateRangeMapping(index, 'type', e.target.value)}
                    className="h-8 text-xs px-2 border rounded bg-gray-50 min-w-[90px]"
                  >
                    <option value="lessThan">&lt; Less Than</option>
                    <option value="between">Between</option>
                    <option value="greaterThan">≥ Greater Than</option>
                  </select>
                  
                  {/* Conditional Min/Max fields based on range type */}
                  {rangeType === 'lessThan' ? (
                    <>
                      <span className="text-xs text-gray-500">Value &lt;</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        defaultValue={mapping.max}
                        onBlur={(e) => updateRangeMapping(index, 'max', e.target.value)}
                        key={`range-max-${questionId}-${index}-${mapping.max}`}
                        className="h-8 text-xs w-20"
                      />
                    </>
                  ) : rangeType === 'greaterThan' ? (
                    <>
                      <span className="text-xs text-gray-500">Value ≥</span>
                      <Input
                        type="number"
                        placeholder="Min"
                        defaultValue={mapping.min}
                        onBlur={(e) => updateRangeMapping(index, 'min', e.target.value)}
                        key={`range-min-${questionId}-${index}-${mapping.min}`}
                        className="h-8 text-xs w-20"
                      />
                    </>
                  ) : (
                    <>
                      <Input
                        type="number"
                        placeholder="Min"
                        defaultValue={mapping.min}
                        onBlur={(e) => updateRangeMapping(index, 'min', e.target.value)}
                        key={`range-min-${questionId}-${index}-${mapping.min}`}
                        className="h-8 text-xs w-20"
                      />
                      <span className="text-xs text-gray-500">to</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        defaultValue={mapping.max}
                        onBlur={(e) => updateRangeMapping(index, 'max', e.target.value)}
                        key={`range-max-${questionId}-${index}-${mapping.max}`}
                        className="h-8 text-xs w-20"
                      />
                    </>
                  )}
                  
                  <Input
                    type="text"
                    placeholder="Label (e.g., Low)"
                    defaultValue={mapping.label}
                    onBlur={(e) => updateRangeMapping(index, 'label', e.target.value)}
                    key={`range-label-${questionId}-${index}-${mapping.label}`}
                    className="h-8 text-xs flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => deleteRangeMapping(index)}
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-blue-700 mt-3">
            💡 Use different range types for flexible configurations: "&lt; Less Than" for values below a threshold, "Between" for value ranges, "≥ Greater Than" for values at or above a threshold.
          </p>
        </div>
      )}

      {/* Text Mode Configuration */}
      {valueDisplayMode === 'text' && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium text-green-900">Text Mappings</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleAutoGenerate}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
              >
                Auto Generate
              </Button>
              <Button
                type="button"
                onClick={addTextMapping}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {textMappings.length === 0 && (
            <p className="text-xs text-gray-600 mb-3">
              No mappings defined. Add mappings to assign text labels to specific values.
            </p>
          )}

          <div className="space-y-2">
            {textMappings.map((mapping: any, index: number) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                <span className="text-xs text-gray-500 w-12">Value:</span>
                <Input
                  type="number"
                  placeholder="Value"
                  defaultValue={mapping.value}
                  onBlur={(e) => updateTextMapping(index, 'value', e.target.value)}
                  key={`text-value-${questionId}-${index}-${mapping.value}`}
                  className="h-8 text-xs w-20"
                  step={step}
                  min={min}
                  max={max}
                />
                <span className="text-xs text-gray-500">→</span>
                <Input
                  type="text"
                  placeholder="Label (e.g., Excellent)"
                  defaultValue={mapping.label}
                  onBlur={(e) => updateTextMapping(index, 'label', e.target.value)}
                  key={`text-label-${questionId}-${index}-${mapping.label}`}
                  className="h-8 text-xs flex-1"
                />
                <Button
                  type="button"
                  onClick={() => deleteTextMapping(index)}
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <p className="text-xs text-green-700 mt-3">
            💡 Map each value to a custom text label. Auto-generate creates labels for all possible values based on step.
          </p>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-red-900 mb-1">Validation Errors:</p>
              <ul className="text-xs text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
