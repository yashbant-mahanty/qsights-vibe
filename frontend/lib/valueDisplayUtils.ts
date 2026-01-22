/**
 * Utility functions for value display mode resolution
 * Used by slider_scale and dial_gauge question types
 */

export interface RangeMapping {
  min: number;
  max: number;
  label: string;
  // Optional: Support for inequality ranges
  // 'lessThan' means value < max (ignores min)
  // 'greaterThan' means value >= min (ignores max)  
  // 'between' (default) means min <= value < max (or <= for last range)
  type?: 'lessThan' | 'greaterThan' | 'between';
}

export interface TextMapping {
  value: number;
  label: string;
}

export interface ResolvedValueDisplay {
  displayValue: string;
  rawValue: number;
}

/**
 * Resolve the display value based on the value display mode
 */
export function resolveDisplayValue(
  rawValue: number,
  mode: 'number' | 'range' | 'text' = 'number',
  rangeMappings?: RangeMapping[],
  textMappings?: TextMapping[]
): string {
  if (mode === 'number') {
    return String(rawValue);
  }

  if (mode === 'range' && rangeMappings && rangeMappings.length > 0) {
    console.log('🔍 [resolveDisplayValue] Looking up value:', rawValue, 'in mappings:', rangeMappings);
    
    // POSITION-BASED MAPPING: If rawValue is a small integer (0-10) and ranges use large values (>10),
    // treat rawValue as an array index to map positions to labels directly
    const hasLargeRangeValues = rangeMappings.some(m => m.min > 10 || m.max > 10);
    const isSmallValue = rawValue >= 0 && rawValue <= 10;
    
    if (hasLargeRangeValues && isSmallValue) {
      // Use position-based mapping: map dial/slider position directly to label by index
      const sortedByType = [...rangeMappings].sort((a, b) => {
        if (a.type === 'lessThan' && b.type !== 'lessThan') return -1;
        if (b.type === 'lessThan' && a.type !== 'lessThan') return 1;
        if (a.type === 'greaterThan' && b.type !== 'greaterThan') return 1;
        if (b.type === 'greaterThan' && a.type !== 'greaterThan') return -1;
        return (a.min || 0) - (b.min || 0);
      });
      
      const index = Math.floor(rawValue);
      if (index >= 0 && index < sortedByType.length) {
        console.log('🎯 [resolveDisplayValue] Position-based match:', sortedByType[index]);
        return sortedByType[index].label;
      }
      // Handle edge case: value equals or exceeds number of mappings, use last mapping
      if (index >= sortedByType.length && sortedByType.length > 0) {
        console.log('🎯 [resolveDisplayValue] Using last mapping for value', rawValue);
        return sortedByType[sortedByType.length - 1].label;
      }
    }
    
    // VALUE-BASED MAPPING: Traditional range matching when values align with range min/max
    const sortedMappings = [...rangeMappings].sort((a, b) => {
      if (a.type === 'lessThan' && b.type !== 'lessThan') return -1;
      if (b.type === 'lessThan' && a.type !== 'lessThan') return 1;
      if (a.type === 'greaterThan' && b.type !== 'greaterThan') return 1;
      if (b.type === 'greaterThan' && a.type !== 'greaterThan') return -1;
      return a.min - b.min;
    });
    
    const mapping = sortedMappings.find((m, index) => {
      const rangeType = m.type || 'between';
      
      if (rangeType === 'lessThan') {
        return rawValue < m.max;
      }
      
      if (rangeType === 'greaterThan') {
        return rawValue >= m.min;
      }
      
      const isLastRange = index === sortedMappings.length - 1;
      if (isLastRange) {
        return rawValue >= m.min && rawValue <= m.max;
      } else {
        return rawValue >= m.min && rawValue < m.max;
      }
    });
    
    if (mapping) {
      console.log('🎯 [resolveDisplayValue] Value-based match:', mapping);
      return mapping.label;
    }
    
    console.log('⚠️ [resolveDisplayValue] No mapping found for value', rawValue);
    return String(rawValue);
  }

  if (mode === 'text' && textMappings && textMappings.length > 0) {
    const mapping = textMappings.find((m) => m.value === rawValue);
    if (mapping) {
      return mapping.label;
    }
    // Fallback to numeric if no mapping found
    return String(rawValue);
  }

  // Default fallback
  return String(rawValue);
}

/**
 * Validate range mappings for gaps and overlaps
 * Supports lessThan, greaterThan, and between (default) range types
 */
export function validateRangeMappings(
  mappings: RangeMapping[],
  min: number,
  max: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!mappings || mappings.length === 0) {
    errors.push('At least one range mapping is required');
    return { valid: false, errors };
  }

  // Separate ranges by type
  const lessThanRanges = mappings.filter(m => m.type === 'lessThan');
  const greaterThanRanges = mappings.filter(m => m.type === 'greaterThan');
  const betweenRanges = mappings.filter(m => !m.type || m.type === 'between');

  // Validate each range
  for (let i = 0; i < mappings.length; i++) {
    const current = mappings[i];
    const rangeType = current.type || 'between';

    // Check if label is provided
    if (!current.label || current.label.trim() === '') {
      errors.push(`Range ${i + 1}: label is required`);
    }

    // Type-specific validation
    if (rangeType === 'lessThan') {
      // For lessThan, only max matters
      if (current.max <= min) {
        errors.push(`Range "${current.label}": threshold (${current.max}) must be greater than min (${min})`);
      }
    } else if (rangeType === 'greaterThan') {
      // For greaterThan, only min matters
      if (current.min >= max) {
        errors.push(`Range "${current.label}": threshold (${current.min}) must be less than max (${max})`);
      }
    } else {
      // For between ranges, check min <= max
      if (current.min > current.max) {
        errors.push(`Range "${current.label}": min (${current.min}) cannot be greater than max (${current.max})`);
      }
    }
  }

  // Sort between ranges by min value for overlap checking
  const sortedBetween = [...betweenRanges].sort((a, b) => a.min - b.min);
  
  // Check for overlaps between 'between' ranges
  for (let i = 0; i < sortedBetween.length - 1; i++) {
    const current = sortedBetween[i];
    const next = sortedBetween[i + 1];
    if (current.max > next.min) {
      errors.push(`Overlap detected: "${current.label}" (${current.min}–${current.max}) overlaps with "${next.label}" (${next.min}–${next.max})`);
    }
  }

  // Note: We don't enforce full coverage when using inequality ranges
  // as they provide more flexibility for partial range definitions

  return { valid: errors.length === 0, errors };
}

/**
 * Validate text mappings
 */
export function validateTextMappings(
  mappings: TextMapping[],
  min: number,
  max: number,
  step: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!mappings || mappings.length === 0) {
    errors.push('At least one text mapping is required');
    return { valid: false, errors };
  }

  // Check for duplicate values
  const values = new Set<number>();
  for (const mapping of mappings) {
    if (values.has(mapping.value)) {
      errors.push(`Duplicate value detected: ${mapping.value}`);
    }
    values.add(mapping.value);

    // Check if label is provided
    if (!mapping.label || mapping.label.trim() === '') {
      errors.push(`Value ${mapping.value}: label is required`);
    }

    // Check if value is within range
    if (mapping.value < min || mapping.value > max) {
      errors.push(`Value ${mapping.value} is outside the slider range (${min}–${max})`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Auto-generate text mappings based on step value
 */
export function autoGenerateTextMappings(
  min: number,
  max: number,
  step: number,
  labelPrefix: string = 'Value'
): TextMapping[] {
  const mappings: TextMapping[] = [];
  
  for (let value = min; value <= max; value += step) {
    mappings.push({
      value: Math.round(value * 100) / 100, // Avoid floating point issues
      label: `${labelPrefix} ${value}`,
    });
  }
  
  return mappings;
}

/**
 * Create answer payload for backend storage
 */
export function createAnswerPayload(
  rawValue: number,
  mode: 'number' | 'range' | 'text',
  rangeMappings?: RangeMapping[],
  textMappings?: TextMapping[]
): {
  value_type: 'number' | 'range' | 'text';
  raw_value: number;
  display_value: string;
  resolved_value?: string;
  range?: { min: number; max: number };
} {
  const displayValue = resolveDisplayValue(rawValue, mode, rangeMappings, textMappings);

  const payload: any = {
    value_type: mode,
    raw_value: rawValue,
    display_value: displayValue,
  };

  if (mode === 'range' && rangeMappings) {
    // Find matching range, considering range types
    const mapping = rangeMappings.find((m) => {
      const rangeType = m.type || 'between';
      
      if (rangeType === 'lessThan') {
        return rawValue < m.max;
      } else if (rangeType === 'greaterThan') {
        return rawValue >= m.min;
      } else {
        // 'between' type
        return rawValue >= m.min && rawValue <= m.max;
      }
    });
    
    if (mapping) {
      payload.resolved_value = mapping.label;
      payload.range = { min: mapping.min, max: mapping.max, type: mapping.type };
    }
  }

  if (mode === 'text' && textMappings) {
    const mapping = textMappings.find((m) => m.value === rawValue);
    if (mapping) {
      payload.resolved_value = mapping.label;
    }
  }

  return payload;
}
