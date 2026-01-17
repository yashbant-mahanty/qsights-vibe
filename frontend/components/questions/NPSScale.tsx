'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface NPSScaleProps {
  value: number | null;
  onChange: (value: number) => void;
  settings?: {
    labels?: {
      left?: string;
      right?: string;
    };
    displayStyle?: 'buttons' | 'slider' | 'icons';
    showCategories?: boolean;
    size?: 'sm' | 'md' | 'lg';
  };
  disabled?: boolean;
  className?: string;
}

// NPS Categories:
// Detractors: 0-6 (red)
// Passives: 7-8 (yellow/amber)
// Promoters: 9-10 (green)

const getNPSCategory = (value: number | null) => {
  if (value === null) return null;
  if (value <= 6) return 'detractor';
  if (value <= 8) return 'passive';
  return 'promoter';
};

const categoryColors = {
  detractor: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', fill: '#dc2626' },
  passive: { bg: '#fffbeb', border: '#fde68a', text: '#d97706', fill: '#f59e0b' },
  promoter: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', fill: '#22c55e' },
};

export function NPSScale({
  value,
  onChange,
  settings = {},
  disabled = false,
  className,
}: NPSScaleProps) {
  const {
    labels = {
      left: 'Extremely Unlikely',
      right: 'Extremely Likely',
    },
    displayStyle = 'buttons',
    showCategories = true,
    size = 'md',
  } = settings;

  const [localValue, setLocalValue] = useState(value);
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSelect = (val: number) => {
    if (disabled) return;
    setLocalValue(val);
    onChange(val);
  };

  const sizeConfig = {
    sm: { buttonSize: 'w-8 h-8', fontSize: 'text-xs', gap: 'gap-1' },
    md: { buttonSize: 'w-10 h-10', fontSize: 'text-sm', gap: 'gap-1.5' },
    lg: { buttonSize: 'w-12 h-12', fontSize: 'text-base', gap: 'gap-2' },
  };

  const { buttonSize, fontSize, gap } = sizeConfig[size];
  const currentCategory = getNPSCategory(hoveredValue ?? localValue);
  const categoryColor = currentCategory ? categoryColors[currentCategory] : null;

  // Slider mode
  if (displayStyle === 'slider') {
    const percentage = localValue !== null ? (localValue / 10) * 100 : 0;
    
    return (
      <div className={cn('flex flex-col gap-4 w-full', className)}>
        {/* Labels */}
        <div className="flex justify-between text-sm text-gray-600">
          <span>{labels.left}</span>
          <span>{labels.right}</span>
        </div>

        {/* Slider Track with gradient */}
        <div className="relative">
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={localValue ?? 0}
            onChange={(e) => handleSelect(parseInt(e.target.value))}
            disabled={disabled}
            className={cn(
              'w-full h-3 rounded-lg appearance-none cursor-pointer',
              'bg-gradient-to-r from-red-400 via-yellow-400 to-green-400',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{
              background: `linear-gradient(to right, 
                #ef4444 0%, #ef4444 60%, 
                #f59e0b 60%, #f59e0b 80%, 
                #22c55e 80%, #22c55e 100%)`,
            }}
          />
          
          {/* Tick marks */}
          <div className="flex justify-between mt-2">
            {Array.from({ length: 11 }, (_, i) => (
              <span key={i} className="text-xs text-gray-500 w-4 text-center">
                {i}
              </span>
            ))}
          </div>
        </div>

        {/* Current Value Display */}
        {localValue !== null && (
          <div
            className="text-center py-2 px-4 rounded-lg font-bold text-xl"
            style={{
              backgroundColor: categoryColor?.bg,
              color: categoryColor?.text,
            }}
          >
            {localValue}
            {showCategories && currentCategory && (
              <span className="ml-2 text-sm font-normal capitalize">
                ({currentCategory})
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Button mode (default)
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Number buttons */}
      <div className={cn('flex justify-center flex-wrap', gap)}>
        {Array.from({ length: 11 }, (_, i) => {
          const isSelected = localValue === i;
          const isHovered = hoveredValue === i;
          const btnCategory = getNPSCategory(i);
          const btnColor = categoryColors[btnCategory!];

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              onMouseEnter={() => setHoveredValue(i)}
              onMouseLeave={() => setHoveredValue(null)}
              disabled={disabled}
              className={cn(
                'rounded-lg font-semibold transition-all duration-200 border-2',
                buttonSize,
                fontSize,
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                isSelected
                  ? 'scale-110 shadow-lg'
                  : isHovered
                  ? 'scale-105'
                  : 'hover:scale-105'
              )}
              style={{
                backgroundColor: isSelected ? btnColor.fill : isHovered ? btnColor.bg : 'white',
                borderColor: isSelected ? btnColor.fill : btnColor.border,
                color: isSelected ? 'white' : btnColor.text,
              }}
              aria-label={`Score ${i}`}
              aria-pressed={isSelected}
            >
              {i}
            </button>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between text-sm text-gray-600 px-2">
        <span className="max-w-[120px] text-left">{labels.left}</span>
        <span className="max-w-[120px] text-right">{labels.right}</span>
      </div>

      {/* Category Legend */}
      {showCategories && (
        <div className="flex justify-center gap-6 text-xs mt-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600">Detractors (0-6)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-gray-600">Passives (7-8)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">Promoters (9-10)</span>
          </div>
        </div>
      )}

      {/* Drag instruction */}
      <div className="text-xs text-gray-400 text-center uppercase tracking-wider">
        Click to select your score
      </div>
    </div>
  );
}

export default NPSScale;
