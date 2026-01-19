/**
 * Utility functions for value display mode resolution
 * Used by slider_scale and dial_gauge question types
 */

export interface RangeMapping {
  min: number;
  max: number;
  label: string;
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
    // Sort by min to ensure correct order
    const sortedMappings = [...rangeMappings].sort((a, b) => a.min - b.min);
    
    const mapping = sortedMappings.find((m, index) => {
      const isLastRange = index === sortedMappings.length - 1;
      if (isLastRange) {
        // Last range uses inclusive upper bound [min, max]
        return rawValue >= m.min && rawValue <= m.max;
      } else {
        // Other ranges use exclusive upper bound [min, max)
        return rawValue >= m.min && rawValue < m.max;
      }
    });
    
    if (mapping) {
      return `${mapping.label} (${mapping.min}–${mapping.max})`;
    }
    // Fallback to numeric if no mapping found
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

  // Sort by min value
  const sorted = [...mappings].sort((a, b) => a.min - b.min);

  // Check for overlaps and gaps
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];

    // Check if min <= max
    if (current.min > current.max) {
      errors.push(`Range "${current.label}": min (${current.min}) cannot be greater than max (${current.max})`);
    }

    // Check if label is provided
    if (!current.label || current.label.trim() === '') {
      errors.push(`Range ${i + 1}: label is required`);
    }

    // Check for overlaps with next range
    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      if (current.max >= next.min) {
        errors.push(`Overlap detected: "${current.label}" (${current.min}–${current.max}) overlaps with "${next.label}" (${next.min}–${next.max})`);
      }
    }
  }

  // Check full coverage
  const firstRange = sorted[0];
  const lastRange = sorted[sorted.length - 1];
  
  if (firstRange.min > min) {
    errors.push(`Gap detected: Range starts at ${firstRange.min} but slider min is ${min}`);
  }
  
  if (lastRange.max < max) {
    errors.push(`Gap detected: Range ends at ${lastRange.max} but slider max is ${max}`);
  }

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
    const mapping = rangeMappings.find(
      (m) => rawValue >= m.min && rawValue <= m.max
    );
    if (mapping) {
      payload.resolved_value = mapping.label;
      payload.range = { min: mapping.min, max: mapping.max };
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
