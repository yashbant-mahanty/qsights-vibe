'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Star, Heart, ThumbsUp, ImageIcon } from 'lucide-react';

interface StarRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  settings?: {
    maxStars?: number;
    icon?: 'star' | 'heart' | 'thumbsup' | 'custom';
    allowHalf?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    activeColor?: string;
    inactiveColor?: string;
    hoverEffect?: boolean;
    showLabel?: boolean;
    labels?: Array<{ value: number; label: string }>;
    showValue?: boolean;
    orientation?: 'horizontal' | 'circular';
    alignment?: 'left' | 'center' | 'right';
    customImages?: {
      activeImageUrl?: string;
      inactiveImageUrl?: string;
      images?: Array<{ value: number; activeUrl: string; inactiveUrl?: string }>;
    };
  };
  disabled?: boolean;
  className?: string;
}

const iconMap = {
  star: Star,
  heart: Heart,
  thumbsup: ThumbsUp,
};

const defaultLabels: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Poor' },
  { value: 2, label: 'Fair' },
  { value: 3, label: 'Good' },
  { value: 4, label: 'Very Good' },
  { value: 5, label: 'Excellent' },
];

export function StarRating({
  value,
  onChange,
  settings = {},
  disabled = false,
  className,
}: StarRatingProps) {
  console.log('[STAR_RATING] Component rendered with settings:', settings);
  
  const {
    maxStars = 5,
    icon = 'star',
    allowHalf = false,
    size = 'md',
    activeColor = '#fbbf24',
    inactiveColor = '#d1d5db',
    hoverEffect = true,
    showLabel = true,
    labels = defaultLabels,
    showValue = true,
    orientation = 'horizontal',
    alignment = 'center',
    customImages,
  } = settings;
  
  const alignmentClass = alignment === 'left' ? 'items-start' : alignment === 'right' ? 'items-end' : 'items-center';
  
  console.log('[STAR_RATING] Resolved values:', { maxStars, icon, showLabel, labels, orientation, alignment });

  const [localValue, setLocalValue] = useState(value ?? 0);
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  useEffect(() => {
    if (value !== null) {
      setLocalValue(value);
    } else {
      // Reset to 0 when value is null (new/unanswered question)
      setLocalValue(0);
    }
  }, [value]);

  const useCustomImages = icon === 'custom' && customImages;
  const IconComponent = icon !== 'custom' ? (iconMap[icon as keyof typeof iconMap] || Star) : Star;

  const sizeConfig = {
    sm: { iconSize: 20, gap: 'gap-1', containerSize: 'w-7 h-7', imgSize: 24 },
    md: { iconSize: 28, gap: 'gap-2', containerSize: 'w-10 h-10', imgSize: 36 },
    lg: { iconSize: 36, gap: 'gap-2', containerSize: 'w-12 h-12', imgSize: 48 },
    xl: { iconSize: 48, gap: 'gap-3', containerSize: 'w-16 h-16', imgSize: 64 },
  };

  const { iconSize, gap, containerSize, imgSize } = sizeConfig[size];

  const displayValue = hoverValue ?? localValue;
  const currentLabel = labels.find((l) => l.value === Math.ceil(displayValue))?.label;

  console.log('[STAR_RATING] Display state:', { displayValue, currentLabel, hoverValue, localValue });

  const handleClick = (starIndex: number, isHalf: boolean = false) => {
    if (disabled) return;
    console.log('[STAR_RATING] Clicked star:', starIndex);
    const newValue = isHalf && allowHalf ? starIndex - 0.5 : starIndex;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleMouseMove = (e: React.MouseEvent, starIndex: number) => {
    if (disabled || !hoverEffect) return;
    if (allowHalf) {
      const rect = e.currentTarget.getBoundingClientRect();
      const isLeftHalf = e.clientX - rect.left < rect.width / 2;
      setHoverValue(isLeftHalf ? starIndex - 0.5 : starIndex);
    } else {
      setHoverValue(starIndex);
    }
  };

  // Circular orientation
  if (orientation === 'circular') {
    const radius = size === 'xl' ? 80 : size === 'lg' ? 65 : size === 'md' ? 55 : 45;
    const angleStep = (2 * Math.PI) / maxStars;
    const startAngle = -Math.PI / 2; // Start from top

    return (
      <div className={cn('flex flex-col items-center gap-4', className)}>
        {/* Circular container */}
        <div
          className="relative"
          style={{
            width: radius * 2 + iconSize + 20,
            height: radius * 2 + iconSize + 20,
          }}
        >
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {showLabel && currentLabel && (
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                {currentLabel}
              </span>
            )}
            {showValue && displayValue > 0 && (
              <span className="text-2xl font-bold" style={{ color: activeColor }}>
                {displayValue}
              </span>
            )}
          </div>

          {/* Stars in circle */}
          {Array.from({ length: maxStars }, (_, i) => {
            const starIndex = i + 1;
            const angle = startAngle + angleStep * i;
            const x = radius + radius * Math.cos(angle);
            const y = radius + radius * Math.sin(angle);
            const isFilled = displayValue >= starIndex;
            const isHalfFilled = allowHalf && displayValue >= starIndex - 0.5 && displayValue < starIndex;

            return (
              <button
                key={starIndex}
                onClick={() => handleClick(starIndex)}
                onMouseEnter={() => !disabled && hoverEffect && setHoverValue(starIndex)}
                onMouseLeave={() => setHoverValue(null)}
                disabled={disabled}
                className={cn(
                  'absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200',
                  !disabled && 'cursor-pointer hover:scale-110',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
                style={{
                  left: x + iconSize / 2 + 10,
                  top: y + iconSize / 2 + 10,
                }}
                aria-label={`${starIndex} ${icon}${starIndex > 1 ? 's' : ''}`}
              >
                <IconComponent
                  size={iconSize}
                  className="transition-colors duration-200"
                  style={{
                    color: isFilled || isHalfFilled ? activeColor : inactiveColor,
                    fill: isFilled ? activeColor : isHalfFilled ? `url(#half-${starIndex})` : 'transparent',
                  }}
                  strokeWidth={1.5}
                />
              </button>
            );
          })}
        </div>

        <div className="text-xs text-gray-400 uppercase tracking-wider">
          Click to rate
        </div>
      </div>
    );
  }

  // Horizontal orientation (default)
  return (
    <div className={cn('flex flex-col gap-3', alignmentClass, className)}>
      {/* Label display - show on hover or selected */}
      <div className="min-h-[2rem] flex items-center">
        {showLabel && currentLabel && (
          <span
            className="text-sm font-semibold uppercase tracking-wide transition-all duration-200"
            style={{ color: displayValue > 0 ? activeColor : inactiveColor }}
          >
            {currentLabel}
          </span>
        )}
      </div>

      {/* Stars container */}
      <div className={cn('flex items-center', gap)}>
        {Array.from({ length: maxStars }, (_, i) => {
          const starIndex = i + 1;
          const isFilled = displayValue >= starIndex;
          const isHalfFilled = allowHalf && displayValue >= starIndex - 0.5 && displayValue < starIndex;

          return (
            <button
              key={starIndex}
              onClick={(e) => handleClick(starIndex, false)}
              onMouseMove={(e) => handleMouseMove(e, starIndex)}
              onMouseEnter={() => !disabled && setHoverValue(starIndex)}
              onMouseLeave={() => setHoverValue(null)}
              disabled={disabled}
              className={cn(
                'relative transition-all duration-200 focus:outline-none',
                containerSize,
                'flex items-center justify-center',
                !disabled && 'cursor-pointer',
                disabled && 'cursor-not-allowed opacity-50',
                hoverEffect && !disabled && 'hover:scale-110'
              )}
              aria-label={`Rate ${starIndex} out of ${maxStars}`}
              aria-pressed={localValue >= starIndex}
            >
              {/* Custom Images Mode */}
              {useCustomImages ? (
                <>
                  {/* Get custom image for this star */}
                  {(() => {
                    const starImage = customImages.images?.find(img => img.value === starIndex);
                    const activeUrl = starImage?.activeUrl || customImages.activeImageUrl;
                    const inactiveUrl = starImage?.inactiveUrl || customImages.inactiveImageUrl || activeUrl;
                    
                    return (
                      <img
                        src={isFilled ? activeUrl : inactiveUrl}
                        alt={`${starIndex} star`}
                        className="transition-all duration-200"
                        style={{
                          width: imgSize,
                          height: imgSize,
                          filter: isFilled ? 'none' : 'grayscale(0.7) opacity(0.5)',
                        }}
                      />
                    );
                  })()}
                </>
              ) : (
                <>
                  {/* Half-fill gradient definition */}
                  {allowHalf && (
                    <svg width="0" height="0" className="absolute">
                      <defs>
                        <linearGradient id={`half-gradient-${starIndex}`}>
                          <stop offset="50%" stopColor={activeColor} />
                          <stop offset="50%" stopColor="transparent" />
                        </linearGradient>
                      </defs>
                    </svg>
                  )}

                  {/* Background (empty) icon */}
                  <IconComponent
                    size={iconSize}
                    className="absolute transition-colors duration-200"
                    style={{ color: inactiveColor }}
                    strokeWidth={1.5}
                  />

                  {/* Filled icon */}
                  {(isFilled || isHalfFilled) && (
                    <IconComponent
                      size={iconSize}
                      className="absolute transition-colors duration-200"
                      style={{
                        color: activeColor,
                        fill: isFilled ? activeColor : 'transparent',
                        clipPath: isHalfFilled ? 'inset(0 50% 0 0)' : 'none',
                      }}
                      strokeWidth={1.5}
                    />
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Value display */}
      {showValue && (
        <div className="text-sm text-gray-500">
          {displayValue > 0 ? (
            <span>
              <span className="font-semibold" style={{ color: activeColor }}>
                {displayValue}
              </span>
              <span className="text-gray-400"> / {maxStars}</span>
            </span>
          ) : (
            <span className="text-gray-400">Click to rate</span>
          )}
        </div>
      )}
    </div>
  );
}

export default StarRating;
