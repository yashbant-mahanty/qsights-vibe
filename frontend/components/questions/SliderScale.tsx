'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { resolveDisplayValue } from '@/lib/valueDisplayUtils';

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
    useCustomImages?: boolean;
    customImages?: {
      thumbUrl?: string;
      trackUrl?: string;
      backgroundUrl?: string; // Main background image displayed above slider
      sequenceImages?: string[]; // Array of image URLs for interactive sequence
    };
    valueDisplayMode?: 'number' | 'range' | 'text';
    rangeMappings?: Array<{
      min: number;
      max: number;
      label: string;
    }>;
    textMappings?: Array<{
      value: number;
      label: string;
    }>;
    showImageLabels?: boolean;
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
    valueDisplayMode = 'number',
    rangeMappings = [],
    textMappings = [],
    max = 10,
    step = 1,
    orientation = 'horizontal',
    labels = {},
    showValue = true,
    showTicks = true,
    trackColor = '#0ea5e9',
    thumbColor = '#0284c7',
    useCustomImages = false,
    customImages = {},
    showImageLabels = true,
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
      console.log('🖱️ [SLIDER] handleMouseDown called, disabled:', disabled);
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
  
  // Calculate ticks - limit to max 11 ticks for readability
  const range = safeMax - safeMin;
  const rawTickCount = Math.floor(range / safeStep) + 1;
  const MAX_TICKS = 11;
  
  let ticks: number[] = [];
  if (rawTickCount <= MAX_TICKS) {
    // Show all ticks if within limit
    ticks = Array.from({ length: rawTickCount }, (_, i) => safeMin + i * safeStep);
  } else {
    // Show limited ticks evenly distributed
    const tickStep = range / (MAX_TICKS - 1);
    ticks = Array.from({ length: MAX_TICKS }, (_, i) => {
      const val = safeMin + i * tickStep;
      // Round to nearest step value
      return Math.round(val / safeStep) * safeStep;
    });
    // Ensure min and max are included
    ticks[0] = safeMin;
    ticks[ticks.length - 1] = safeMax;
    // Remove duplicates and sort
    ticks = [...new Set(ticks)].sort((a, b) => a - b);
  }

  const isVertical = orientation === 'vertical';
  // Show background image if URL exists - use backgroundUrl or trackUrl for display above slider
  // Note: trackUrl is displayed as image above, not used as actual track background (keep colored track)
  const backgroundImageUrl = customImages?.backgroundUrl || customImages?.trackUrl || '';
  const hasBackgroundImage = !!backgroundImageUrl;
  
  // Sequence images for interactive highlighting
  const sequenceImages = customImages?.sequenceImages || [];
  const hasSequenceImages = sequenceImages.length > 0;
  
  // Calculate which sequence image should be active based on current value
  const activeImageIndex = hasSequenceImages ? Math.round(((localValue - safeMin) / (safeMax - safeMin)) * (sequenceImages.length - 1)) : -1;

  console.log('🎨 [SLIDER] hasSequenceImages:', hasSequenceImages);
  console.log('🎨 [SLIDER] sequenceImages:', sequenceImages);
  console.log('🎨 [SLIDER] sequenceImages.length:', sequenceImages.length);
  console.log('🎨 [SLIDER] isVertical:', isVertical);
  console.log('🎨 [SLIDER] orientation:', orientation);
  console.log('🎨 [SLIDER] customImages:', customImages);
  console.log('🎨 [SLIDER] WILL RENDER SEQUENCE:', hasSequenceImages && !isVertical);

  return (
    <div
      className={cn(
        'select-none',
        isVertical ? 'flex flex-row items-center gap-4 h-64' : 'flex flex-col gap-3 w-full',
        className
      )}
    >
      {/* Background Image (displayed above slider) - Universal 16:9 aspect ratio */}
      {hasBackgroundImage && !isVertical && (
        <div className="w-full mb-4 flex justify-center items-center bg-gray-50 rounded-lg">
          <img
            src={backgroundImageUrl}
            alt="Scale background"
            className="w-full h-auto rounded-lg"
            style={{ 
              maxHeight: '400px',
              objectFit: 'contain',
              aspectRatio: '16 / 9',
              display: 'block'
            }}
            crossOrigin="anonymous"
            draggable={false}
          />
        </div>
      )}

      {/* Sequence Images with Interactive Highlighting */}
      {hasSequenceImages && !isVertical && (() => {
        console.log('✅ [SLIDER] RENDERING SEQUENCE IMAGES BLOCK');
        return (
        <div className="w-full mb-6">
          <div className="flex justify-between items-center gap-1 w-full">
            {sequenceImages.map((imageUrl, index) => {
              console.log(`🖼️ [SLIDER] Rendering image ${index}:`, imageUrl);
              return (
              <div
                key={index}
                className={cn(
                  'relative flex-1 rounded-lg overflow-hidden transition-all duration-300 ease-out',
                  'border-2',
                  index === activeImageIndex 
                    ? 'border-blue-500 shadow-lg shadow-blue-200 z-10' 
                    : 'border-transparent opacity-40'
                )}
                style={{
                  filter: index === activeImageIndex ? 'grayscale(0%)' : 'grayscale(100%)',
                  aspectRatio: '1 / 1',
                }}
              >
                <img
                  src={imageUrl}
                  alt={`Value ${index}`}
                  className="w-full h-full object-cover bg-gray-50"
                  style={{ 
                    display: 'block'
                  }}
                  crossOrigin="anonymous"
                  draggable={false}
                  onLoad={() => console.log(`✅ [SLIDER] Image ${index} loaded successfully`)}
                  onError={(e) => {
                    console.error(`❌ [SLIDER] Image ${index} failed to load:`, imageUrl, e);
                    // Set a placeholder background on error
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      target.parentElement.style.backgroundColor = '#f3f4f6';
                      target.parentElement.style.minHeight = '120px';
                    }
                  }}
                />
                {/* Value label overlay - conditionally shown */}
                {showImageLabels && (
                  <div className={cn(
                    'absolute bottom-0 left-0 right-0 text-center py-1 text-xs font-semibold transition-colors duration-300',
                    index === activeImageIndex 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-800/60 text-gray-300'
                  )}>
                    {Math.round(safeMin + (index / (sequenceImages.length - 1)) * (safeMax - safeMin))}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
        );
      })()}

      {/* Labels Row (when using custom background) */}
      {hasBackgroundImage && !isVertical && (labels.start || labels.end) && (
        <div className="flex justify-between items-center w-full px-2 mb-2">
          <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            {labels.start || ''}
          </div>
          <div className="flex-1 flex justify-center">
            <div className="h-px w-full bg-gray-300 relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <svg width="8" height="8" viewBox="0 0 8 8">
                  <path d="M8 4 L0 0 L0 8 Z" fill="#9CA3AF" />
                </svg>
              </div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                <svg width="8" height="8" viewBox="0 0 8 8">
                  <path d="M0 4 L8 0 L8 8 Z" fill="#9CA3AF" />
                </svg>
              </div>
            </div>
          </div>
          <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            {labels.end || ''}
          </div>
        </div>
      )}

      {/* Start Label (standard mode without background image) */}
      {!hasBackgroundImage && labels.start && (
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
              'absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75',
              useCustomImages && customImages.thumbUrl ? 'w-10 h-10' : 'w-6 h-6 rounded-full shadow-lg border-2 border-white',
              isDragging && 'scale-110',
              !disabled && 'hover:scale-105'
            )}
            style={{
              backgroundColor: useCustomImages && customImages.thumbUrl ? 'transparent' : thumbColor,
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
            {useCustomImages && customImages.thumbUrl ? (
              /* Custom Thumb Image */
              <img
                src={customImages.thumbUrl}
                alt="Slider thumb"
                className="w-full h-full object-contain"
                draggable={false}
              />
            ) : (
              /* Default Drag Handle Icon */
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex gap-0.5">
                  <div className="w-0.5 h-2 bg-white/60 rounded-full" />
                  <div className="w-0.5 h-2 bg-white/60 rounded-full" />
                  <div className="w-0.5 h-2 bg-white/60 rounded-full" />
                </div>
              </div>
            )}
          </div>

          {/* Tick Marks */}
          {showTicks && (
            <div
              className={cn(
                'absolute',
                isVertical ? 'left-full ml-2 h-full' : 'top-full mt-2 w-full'
              )}
            >
              {ticks.map((tick) => {
                const tickPercentage = ((tick - safeMin) / (safeMax - safeMin)) * 100;
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

      {/* Helper Text (when using custom background) */}
      {hasBackgroundImage && !isVertical && (
        <div className="text-center text-sm text-gray-500 font-medium tracking-wide mt-1">
          DRAG THE SLIDER TO SELECT
        </div>
      )}

      {/* Mid Label (standard mode) */}
      {!hasBackgroundImage && labels.mid && !isVertical && (
        <div className="text-xs text-gray-500 text-center">{labels.mid}</div>
      )}

      {/* End Label (standard mode without background image) */}
      {!hasBackgroundImage && labels.end && (
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
          {resolveDisplayValue(localValue, valueDisplayMode, rangeMappings, textMappings)}
        </div>
      )}
    </div>
  );
}

export default SliderScale;
