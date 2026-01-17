'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Frown, Meh, Smile, SmilePlus, Angry, ImageIcon } from 'lucide-react';

interface LikertLabel {
  value: number;
  label: string;
  icon?: 'angry' | 'frown' | 'meh' | 'smile' | 'smileplus';
  imageUrl?: string; // Custom image URL
}

interface LikertVisualProps {
  value: number | null;
  onChange: (value: number) => void;
  settings?: {
    scale?: 5 | 7;
    labels?: LikertLabel[];
    showLabels?: boolean;
    showIcons?: boolean;
    iconStyle?: 'emoji' | 'filled' | 'outline' | 'custom'; // Added 'custom' for images
    size?: 'sm' | 'md' | 'lg';
    activeColor?: string;
    inactiveColor?: string;
    customImages?: Array<{ value: number; imageUrl: string }>; // Array of custom images
  };
  disabled?: boolean;
  className?: string;
}

const defaultLabels5: LikertLabel[] = [
  { value: 1, label: 'Strongly Disagree', icon: 'angry' },
  { value: 2, label: 'Disagree', icon: 'frown' },
  { value: 3, label: 'Neutral', icon: 'meh' },
  { value: 4, label: 'Agree', icon: 'smile' },
  { value: 5, label: 'Strongly Agree', icon: 'smileplus' },
];

const defaultLabels7: LikertLabel[] = [
  { value: 1, label: 'Strongly Disagree', icon: 'angry' },
  { value: 2, label: 'Disagree', icon: 'frown' },
  { value: 3, label: 'Slightly Disagree', icon: 'frown' },
  { value: 4, label: 'Neutral', icon: 'meh' },
  { value: 5, label: 'Slightly Agree', icon: 'smile' },
  { value: 6, label: 'Agree', icon: 'smile' },
  { value: 7, label: 'Strongly Agree', icon: 'smileplus' },
];

const iconMap = {
  angry: Angry,
  frown: Frown,
  meh: Meh,
  smile: Smile,
  smileplus: SmilePlus,
};

export function LikertVisual({
  value,
  onChange,
  settings = {},
  disabled = false,
  className,
}: LikertVisualProps) {
  const {
    scale = 5,
    labels: customLabels,
    showLabels = true,
    showIcons = true,
    iconStyle = 'outline',
    size = 'md',
    activeColor = '#0284c7',
    inactiveColor = '#9ca3af',
    customImages = [],
  } = settings;

  const [localValue, setLocalValue] = useState(value);
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const labels = customLabels || (scale === 7 ? defaultLabels7 : defaultLabels5);

  // Check if we have custom images
  const useCustomImages = iconStyle === 'custom' && customImages.length > 0;

  const sizeConfig = {
    sm: { iconSize: 24, padding: 'p-2', gap: 'gap-2', fontSize: 'text-xs', imgSize: 32 },
    md: { iconSize: 32, padding: 'p-3', gap: 'gap-3', fontSize: 'text-sm', imgSize: 48 },
    lg: { iconSize: 48, padding: 'p-4', gap: 'gap-4', fontSize: 'text-base', imgSize: 64 },
  };

  const { iconSize, padding, gap, fontSize, imgSize } = sizeConfig[size];

  const handleSelect = (val: number) => {
    if (disabled) return;
    setLocalValue(val);
    onChange(val);
  };

  const currentLabel = labels.find((l) => l.value === (hoveredValue ?? localValue));

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Current selection label */}
      <div className="min-h-[2rem] flex items-center justify-center">
        {currentLabel && showLabels && (
          <div
            className={cn(
              'font-semibold uppercase tracking-wide transition-all duration-200',
              fontSize
            )}
            style={{ color: localValue === currentLabel.value ? activeColor : inactiveColor }}
          >
            {currentLabel.label}
          </div>
        )}
      </div>

      {/* Likert options */}
      <div className={cn('flex items-center', gap)}>
        {labels.map((item) => {
          const isSelected = localValue === item.value;
          const isHovered = hoveredValue === item.value;
          const IconComponent = item.icon ? iconMap[item.icon] : Meh;
          const customImage = customImages.find(img => img.value === item.value);
          const itemImageUrl = item.imageUrl || customImage?.imageUrl;

          return (
            <button
              key={item.value}
              onClick={() => handleSelect(item.value)}
              onMouseEnter={() => setHoveredValue(item.value)}
              onMouseLeave={() => setHoveredValue(null)}
              disabled={disabled}
              className={cn(
                'rounded-full border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
                padding,
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                isSelected
                  ? 'border-transparent scale-110 shadow-lg'
                  : isHovered
                  ? 'border-gray-300 scale-105'
                  : 'border-gray-200 hover:border-gray-300'
              )}
              style={{
                backgroundColor: isSelected ? activeColor : 'white',
              }}
              aria-label={item.label}
              aria-pressed={isSelected}
            >
              {/* Custom Image */}
              {useCustomImages && itemImageUrl ? (
                <img
                  src={itemImageUrl}
                  alt={item.label}
                  className="rounded-full object-cover transition-all duration-200"
                  style={{
                    width: imgSize,
                    height: imgSize,
                    filter: isSelected ? 'brightness(1.1)' : isHovered ? 'brightness(1.05)' : 'grayscale(0.3)',
                  }}
                />
              ) : showIcons ? (
                <IconComponent
                  size={iconSize}
                  className={cn(
                    'transition-colors duration-200',
                    iconStyle === 'filled' && isSelected ? 'fill-white' : ''
                  )}
                  style={{
                    color: isSelected ? 'white' : isHovered ? activeColor : inactiveColor,
                  }}
                  strokeWidth={iconStyle === 'outline' ? 1.5 : 2}
                />
              ) : (
                <span
                  className={cn('font-bold', fontSize)}
                  style={{ color: isSelected ? 'white' : inactiveColor }}
                >
                  {item.value}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Scale labels (start/end) */}
      {showLabels && (
        <div className="flex justify-between w-full px-4">
          <span className="text-xs text-gray-500">{labels[0]?.label}</span>
          <span className="text-xs text-gray-500">{labels[labels.length - 1]?.label}</span>
        </div>
      )}
    </div>
  );
}

export default LikertVisual;
