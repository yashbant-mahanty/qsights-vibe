'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SliderScaleProps {
  value: number | null;
  onChange: (value: number) => void;
  settings?: {
    min?: number;
    max?: number;
    step?: number;
    orientation?: 'horizontal' | 'vertical';
    labels?: {
      start?: string;
      end?: string;
      mid?: string;
    };
    showValue?: boolean;
    showTicks?: boolean;
    trackColor?: string;
    thumbColor?: string;
  };
  disabled?: boolean;
  className?: string;
}

export function SliderScale({
  value,
  onChange,
  settings = {},
  disabled = false,
  className,
}: SliderScaleProps) {
  const {
    min = 0,
    max = 10,
    step = 1,
    orientation = 'horizontal',
    labels = {},
    showValue = true,
    showTicks = true,
    trackColor = '#0ea5e9',
    thumbColor = '#0284c7',
  } = settings;

  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value ?? min);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== null) {
      setLocalValue(value);
    }
  }, [value]);

  const calculateValue = useCallback(
    (clientX: number, clientY: number) => {
      if (!sliderRef.current) return localValue;

      const rect = sliderRef.current.getBoundingClientRect();
      let percentage: number;

      if (orientation === 'vertical') {
        percentage = 1 - (clientY - rect.top) / rect.height;
      } else {
        percentage = (clientX - rect.left) / rect.width;
      }

      percentage = Math.max(0, Math.min(1, percentage));
      const rawValue = min + percentage * (max - min);
      const steppedValue = Math.round(rawValue / step) * step;
      return Math.max(min, Math.min(max, steppedValue));
    },
    [min, max, step, orientation, localValue]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDragging(true);
      const newValue = calculateValue(e.clientX, e.clientY);
      setLocalValue(newValue);
      onChange(newValue);
    },
    [disabled, calculateValue, onChange]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || disabled) return;
      const newValue = calculateValue(e.clientX, e.clientY);
      setLocalValue(newValue);
      onChange(newValue);
    },
    [isDragging, disabled, calculateValue, onChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      setIsDragging(true);
      const touch = e.touches[0];
      const newValue = calculateValue(touch.clientX, touch.clientY);
      setLocalValue(newValue);
      onChange(newValue);
    },
    [disabled, calculateValue, onChange]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || disabled) return;
      const touch = e.touches[0];
      const newValue = calculateValue(touch.clientX, touch.clientY);
      setLocalValue(newValue);
      onChange(newValue);
    },
    [isDragging, disabled, calculateValue, onChange]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Safely calculate percentage to avoid NaN
  const safeMin = typeof min === 'number' && !isNaN(min) ? min : 0;
  const safeMax = typeof max === 'number' && !isNaN(max) && max > safeMin ? max : safeMin + 10;
  const safeLocalValue = typeof localValue === 'number' && !isNaN(localValue) ? localValue : safeMin;
  const safeStep = typeof step === 'number' && !isNaN(step) && step > 0 ? step : 1;
  
  const percentage = Math.max(0, Math.min(100, ((safeLocalValue - safeMin) / (safeMax - safeMin)) * 100)) || 0;
  const tickCount = Math.max(1, Math.floor((safeMax - safeMin) / safeStep) + 1);
  const ticks = Array.from({ length: tickCount }, (_, i) => safeMin + i * safeStep);

  const isVertical = orientation === 'vertical';

  return (
    <div
      className={cn(
        'select-none',
        isVertical ? 'flex flex-row items-center gap-4 h-64' : 'flex flex-col gap-3 w-full',
        className
      )}
    >
      {/* Start Label */}
      {labels.start && (
        <div
          className={cn(
            'text-sm font-medium text-gray-600',
            isVertical ? 'order-2 text-center max-w-[100px]' : 'text-left'
          )}
        >
          {labels.start}
        </div>
      )}

      {/* Slider Track */}
      <div
        className={cn(
          'relative',
          isVertical ? 'h-full w-12 flex items-center justify-center order-1' : 'w-full h-12 flex items-center'
        )}
      >
        <div
          ref={sliderRef}
          className={cn(
            'relative cursor-pointer rounded-full bg-gray-200',
            isVertical ? 'h-full w-2' : 'w-full h-2',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setIsDragging(false)}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={localValue}
          aria-orientation={orientation}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (disabled) return;
            let newValue = localValue;
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              newValue = Math.min(max, localValue + step);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              newValue = Math.max(min, localValue - step);
            }
            if (newValue !== localValue) {
              setLocalValue(newValue);
              onChange(newValue);
            }
          }}
        >
          {/* Filled Track */}
          <div
            className="absolute rounded-full transition-all duration-75"
            style={{
              backgroundColor: trackColor,
              ...(isVertical
                ? {
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${percentage}%`,
                  }
                : {
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: `${percentage}%`,
                  }),
            }}
          />

          {/* Thumb */}
          <div
            className={cn(
              'absolute w-6 h-6 rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 border-2 border-white',
              isDragging && 'scale-110',
              !disabled && 'hover:scale-105'
            )}
            style={{
              backgroundColor: thumbColor,
              ...(isVertical
                ? {
                    bottom: `${percentage}%`,
                    left: '50%',
                    transform: 'translate(-50%, 50%)',
                  }
                : {
                    left: `${percentage}%`,
                    top: '50%',
                  }),
            }}
          >
            {/* Drag Handle Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex gap-0.5">
                <div className="w-0.5 h-2 bg-white/60 rounded-full" />
                <div className="w-0.5 h-2 bg-white/60 rounded-full" />
                <div className="w-0.5 h-2 bg-white/60 rounded-full" />
              </div>
            </div>
          </div>

          {/* Tick Marks */}
          {showTicks && (
            <div
              className={cn(
                'absolute',
                isVertical ? 'left-full ml-2 h-full' : 'top-full mt-2 w-full'
              )}
            >
              {ticks.map((tick, i) => {
                const tickPercentage = ((tick - min) / (max - min)) * 100;
                return (
                  <div
                    key={tick}
                    className={cn(
                      'absolute text-xs text-gray-500',
                      isVertical
                        ? 'left-0 transform -translate-y-1/2'
                        : 'transform -translate-x-1/2'
                    )}
                    style={
                      isVertical
                        ? { bottom: `${tickPercentage}%` }
                        : { left: `${tickPercentage}%` }
                    }
                  >
                    {tick}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mid Label */}
      {labels.mid && !isVertical && (
        <div className="text-xs text-gray-500 text-center">{labels.mid}</div>
      )}

      {/* End Label */}
      {labels.end && (
        <div
          className={cn(
            'text-sm font-medium text-gray-600',
            isVertical ? 'order-0 text-center max-w-[100px]' : 'text-right'
          )}
        >
          {labels.end}
        </div>
      )}

      {/* Current Value Display */}
      {showValue && (
        <div
          className={cn(
            'text-center py-2 px-4 bg-gray-100 rounded-lg font-semibold text-lg',
            isVertical ? 'order-3' : ''
          )}
          style={{ color: thumbColor }}
        >
          {localValue}
        </div>
      )}
    </div>
  );
}

export default SliderScale;
