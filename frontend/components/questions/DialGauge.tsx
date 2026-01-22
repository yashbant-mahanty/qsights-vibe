'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { resolveDisplayValue } from '@/lib/valueDisplayUtils';
import { getPresignedUrls, isS3Url, isPresignedUrl } from '@/lib/s3Utils';

interface DialGaugeProps {
  value: number | null;
  onChange: (value: number) => void;
  settings?: {
    min?: number;
    max?: number;
    step?: number;
    labels?: Array<{ value: number; label: string }>;
    gaugeType?: 'semi-circle' | 'full-circle';
    showPointer?: boolean;
    showValue?: boolean;
    colorStops?: Array<{ percent: number; color: string }>;
    size?: 'sm' | 'md' | 'lg';
    customImages?: {
      backgroundUrl?: string | null;
      needleUrl?: string | null;
      sequenceImages?: string[];
    };
    valueDisplayMode?: 'number' | 'range' | 'text';
    rangeMappings?: Array<{
      min: number;
      max: number;
      label: string;
      type?: 'lessThan' | 'greaterThan' | 'between';
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

export function DialGauge({
  value,
  onChange,
  settings = {},
  disabled = false,
  className,
}: DialGaugeProps) {
  const {
    min: settingsMin = 0,
    max: settingsMax = 10,
    step = 1,
    labels = [],
    gaugeType: rawGaugeType = 'semi-circle',
    showPointer = true,
    showValue = true,
    colorStops = [
      { percent: 0, color: '#1e3a5f' },
      { percent: 25, color: '#2563eb' },
      { percent: 50, color: '#60a5fa' },
      { percent: 75, color: '#93c5fd' },
      { percent: 100, color: '#dbeafe' },
    ],
    size = 'md',
    customImages,
    valueDisplayMode = 'number',
    rangeMappings: rawRangeMappings = [],
    textMappings: rawTextMappings = [],
    showImageLabels = true,
    instructionText = 'Drag the pointer to select',
  } = settings;

  // UNIVERSAL FIX: Validate gaugeType - only 'semi-circle' or 'full-circle' are valid
  // Invalid values like 'gradient' should default to 'semi-circle'
  const gaugeType: 'semi-circle' | 'full-circle' = 
    (rawGaugeType === 'semi-circle' || rawGaugeType === 'full-circle') 
      ? rawGaugeType 
      : 'semi-circle';

  // Parse rangeMappings and textMappings if they are JSON strings
  const rangeMappings = typeof rawRangeMappings === 'string' 
    ? (rawRangeMappings ? JSON.parse(rawRangeMappings) : [])
    : rawRangeMappings;
  const textMappings = typeof rawTextMappings === 'string'
    ? (rawTextMappings ? JSON.parse(rawTextMappings) : [])
    : rawTextMappings;

  // Auto-adjust max based on range mappings: if using range mode, max should be (number of ranges - 1)
  // so that each dial position maps to exactly one range label
  const min = settingsMin;
  const max = (valueDisplayMode === 'range' && rangeMappings.length > 0)
    ? Math.max(min, rangeMappings.length - 1)
    : settingsMax;

  console.log('🔍 [DIAL] Parsed rangeMappings:', rangeMappings, 'Type:', typeof rangeMappings, 'IsArray:', Array.isArray(rangeMappings));
  console.log('🔍 [DIAL] Adjusted max:', max, '(based on', rangeMappings.length, 'range mappings)');

  // Check for custom background image
  const backgroundImageUrl = customImages?.backgroundUrl || '';
  const hasBackgroundImage = !!backgroundImageUrl;
  
  // Sequence images for interactive highlighting
  const rawSequenceImages = customImages?.sequenceImages || [];
  const hasSequenceImages = rawSequenceImages.length > 0;

  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value ?? min);
  const [presignedSequenceImages, setPresignedSequenceImages] = useState<string[]>(rawSequenceImages);
  const [presignedBackgroundUrl, setPresignedBackgroundUrl] = useState<string>(backgroundImageUrl);
  const gaugeRef = useRef<SVGSVGElement>(null);

  // Load presigned URLs for S3 images
  useEffect(() => {
    const loadPresignedUrls = async () => {
      // Check if any URLs need presigning
      const urlsToCheck = [...rawSequenceImages];
      if (backgroundImageUrl) urlsToCheck.push(backgroundImageUrl);
      
      const needsPresigning = urlsToCheck.some(url => isS3Url(url) && !isPresignedUrl(url));
      
      if (!needsPresigning) {
        // No presigning needed
        setPresignedSequenceImages(rawSequenceImages);
        setPresignedBackgroundUrl(backgroundImageUrl);
        return;
      }
      
      console.log('🔐 [DIAL] Loading presigned URLs for S3 images...');
      
      try {
        const presignedMap = await getPresignedUrls(urlsToCheck);
        
        // Update sequence images with presigned URLs
        const newSequenceImages = rawSequenceImages.map(url => presignedMap.get(url) || url);
        setPresignedSequenceImages(newSequenceImages);
        
        // Update background URL
        if (backgroundImageUrl) {
          setPresignedBackgroundUrl(presignedMap.get(backgroundImageUrl) || backgroundImageUrl);
        }
        
        console.log('🔐 [DIAL] Presigned URLs loaded:', { 
          original: rawSequenceImages.length, 
          presigned: newSequenceImages.length 
        });
      } catch (error) {
        console.error('🔐 [DIAL] Failed to load presigned URLs:', error);
        // Fallback to original URLs
        setPresignedSequenceImages(rawSequenceImages);
        setPresignedBackgroundUrl(backgroundImageUrl);
      }
    };
    
    loadPresignedUrls();
  }, [rawSequenceImages.join(','), backgroundImageUrl]);
  
  // Use presigned URLs for display
  const sequenceImages = presignedSequenceImages;

  useEffect(() => {
    if (value !== null) {
      setLocalValue(value);
    }
  }, [value]);

  // Debug logging for range mappings (after localValue is defined)
  useEffect(() => {
    console.log('🎯 [DIAL] Settings received:', {
      valueDisplayMode,
      rawRangeMappings: JSON.stringify(rawRangeMappings),
      parsedRangeMappings: rangeMappings,
      isParsedArray: Array.isArray(rangeMappings),
      currentValue: localValue,
      displayValue: resolveDisplayValue(localValue, valueDisplayMode, rangeMappings, textMappings),
      min,
      max
    });
  }, [valueDisplayMode, rawRangeMappings, rangeMappings, localValue, min, max, textMappings]);

  const sizeConfig = {
    sm: { width: 200, height: 120, radius: 80, strokeWidth: 20 },
    md: { width: 280, height: 160, radius: 110, strokeWidth: 25 },
    lg: { width: 360, height: 200, radius: 140, strokeWidth: 30 },
  };

  const { width, height, radius, strokeWidth } = sizeConfig[size];
  const centerX = width / 2;
  const centerY = gaugeType === 'semi-circle' ? height - 20 : height / 2;

  // Ensure percentage is a valid number (avoid NaN)
  const safeLocalValue = typeof localValue === 'number' && !isNaN(localValue) ? localValue : min;
  
  // Ensure min and max are valid numbers to avoid division by zero or NaN
  const safeMin = typeof min === 'number' && !isNaN(min) ? min : 0;
  const safeMax = typeof max === 'number' && !isNaN(max) && max > safeMin ? max : safeMin + 10;
  
  const percentage = Math.max(0, Math.min(100, ((safeLocalValue - safeMin) / (safeMax - safeMin)) * 100)) || 0;
  
  // Calculate which sequence image should be active
  const activeImageIndex = hasSequenceImages ? Math.round((percentage / 100) * (sequenceImages.length - 1)) : -1;

  // Calculate angle for the pointer (semi-circle: 180° to 0°, i.e., left to right)
  const startAngle = gaugeType === 'semi-circle' ? 180 : 225;
  const endAngle = gaugeType === 'semi-circle' ? 0 : -45;
  const angleRange = gaugeType === 'semi-circle' ? 180 : 270;
  const currentAngle = startAngle - (percentage / 100) * angleRange;
  const angleRad = (currentAngle * Math.PI) / 180;

  // Generate arc path with NaN protection
  const createArc = (startPct: number, endPct: number) => {
    // Validate inputs
    const safeStartPct = typeof startPct === 'number' && !isNaN(startPct) ? startPct : 0;
    const safeEndPct = typeof endPct === 'number' && !isNaN(endPct) ? endPct : 100;
    
    const startA = startAngle - (safeStartPct / 100) * angleRange;
    const endA = startAngle - (safeEndPct / 100) * angleRange;
    const startRad = (startA * Math.PI) / 180;
    const endRad = (endA * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY - radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY - radius * Math.sin(endRad);
    
    // Check for NaN values and return empty path if found
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
      return '';
    }

    const largeArc = Math.abs(safeEndPct - safeStartPct) > 50 ? 1 : 0;
    const sweep = 1;

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
  };

  // Create gradient segments - support both 'percent' and 'offset' properties
  const normalizedColorStops = colorStops.map(stop => ({
    percent: stop.percent ?? (stop as any).offset ?? 0,
    color: stop.color,
  }));
  
  const gradientSegments = normalizedColorStops.map((stop, i) => {
    if (i === normalizedColorStops.length - 1) return null;
    const nextStop = normalizedColorStops[i + 1];
    const path = createArc(stop.percent, nextStop.percent);
    // Skip empty paths (NaN protection)
    if (!path) return null;
    return {
      path,
      color: stop.color,
    };
  }).filter(Boolean);

  const calculateValueFromPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!gaugeRef.current) return localValue;

      const rect = gaugeRef.current.getBoundingClientRect();
      const x = clientX - rect.left - centerX;
      const y = -(clientY - rect.top - centerY); // Invert Y for SVG coordinates

      let angle = Math.atan2(y, x) * (180 / Math.PI);
      if (angle < 0) angle += 360;

      // Map angle to percentage
      let pct: number;
      if (gaugeType === 'semi-circle') {
        // Semi-circle: 180° (left) to 0° (right)
        if (angle > 180) {
          pct = 0;
        } else {
          pct = ((180 - angle) / 180) * 100;
        }
      } else {
        // Full circle logic (not fully implemented for now)
        pct = ((360 - angle + 225) % 360) / 270 * 100;
      }

      pct = Math.max(0, Math.min(100, pct));
      const rawValue = min + (pct / 100) * (max - min);
      const steppedValue = Math.round(rawValue / step) * step;
      return Math.max(min, Math.min(max, steppedValue));
    },
    [min, max, step, centerX, centerY, gaugeType, localValue]
  );

  const handleInteraction = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return;
      const newValue = calculateValueFromPosition(clientX, clientY);
      setLocalValue(newValue);
      onChange(newValue);
    },
    [disabled, calculateValueFromPosition, onChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDragging(true);
      handleInteraction(e.clientX, e.clientY);
    },
    [disabled, handleInteraction]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      handleInteraction(e.clientX, e.clientY);
    },
    [isDragging, handleInteraction]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      setIsDragging(true);
      const touch = e.touches[0];
      handleInteraction(touch.clientX, touch.clientY);
    },
    [disabled, handleInteraction]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      handleInteraction(touch.clientX, touch.clientY);
    },
    [isDragging, handleInteraction]
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

  // Find current label
  const currentLabel = labels.length > 0
    ? labels.reduce((prev, curr) =>
        Math.abs(curr.value - localValue) < Math.abs(prev.value - localValue) ? curr : prev
      )
    : null;

  // Pointer position
  const pointerLength = radius - strokeWidth / 2 - 10;
  const pointerX = centerX + pointerLength * Math.cos(angleRad);
  const pointerY = centerY - pointerLength * Math.sin(angleRad);

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Background Image (displayed above gauge) - Universal 16:9 aspect ratio */}
      {hasBackgroundImage && (
        <div className="w-full max-w-md mb-2 flex justify-center items-center bg-gray-50 rounded-lg">
          <img
            src={presignedBackgroundUrl}
            alt="Gauge background"
            className="w-full h-auto rounded-lg"
            style={{ 
              maxHeight: '300px',
              objectFit: 'contain',
              aspectRatio: '16 / 9',
              display: 'block'
            }}
            crossOrigin="anonymous"
            draggable={false}
          />
        </div>
      )}

      {/* Current Label Display */}
      {currentLabel && (
        <div className="text-lg font-semibold text-gray-700 uppercase tracking-wide">
          {currentLabel.label}
        </div>
      )}

      {/* Combined Gauge + Sequence Images Layout */}
      {hasSequenceImages ? (
        <div className="w-full max-w-4xl mt-6">
          <div 
            className="relative mx-auto"
            style={{
              width: `${width + 240}px`,
              height: `${height + 200}px`,
            }}
          >
            {/* Sequence Images - Positioned AROUND the gauge */}
            {sequenceImages.map((imageUrl, index) => {
              const isActive = index === activeImageIndex;
              const imageValue = min + (index * (max - min) / (sequenceImages.length - 1));
              
              // Calculate position along semicircular arc
              const totalImages = sequenceImages.length;
              const angleStart = 180; // Left side (180°)
              const angleEnd = 0; // Right side (0°)
              const angleRangeImages = angleStart - angleEnd; // 180°
              
              // Calculate this image's angle
              const angleFraction = totalImages === 1 ? 0.5 : index / (totalImages - 1);
              const imageAngle = angleStart - (angleFraction * angleRangeImages); // 180° to 0°
              const imageAngleRad = (imageAngle * Math.PI) / 180;
              
              // Image dimensions
              const imageSize = size === 'sm' ? 70 : size === 'lg' ? 110 : 90;
              
              // Position images AROUND the arc - increased radius for better spacing
              const imageRadius = radius + strokeWidth + 80; // More distance from center
              const containerCenterX = (width + 240) / 2;
              const containerCenterY = height - 20 + 70; // Adjusted for top padding
              const imageX = containerCenterX + imageRadius * Math.cos(imageAngleRad);
              const imageY = containerCenterY - imageRadius * Math.sin(imageAngleRad);
              
              return (
                <div
                  key={index}
                  className={cn(
                    'absolute rounded-lg overflow-hidden transition-all duration-300',
                    isActive 
                      ? 'border-4 border-blue-500 shadow-xl shadow-blue-500/50 z-10' 
                      : 'border-0 opacity-60'
                  )}
                  style={{
                    left: `${imageX - imageSize / 2}px`,
                    top: `${imageY - imageSize / 2}px`,
                    width: `${imageSize}px`,
                    height: `${imageSize}px`,
                    filter: isActive ? 'grayscale(0%) brightness(1)' : 'grayscale(100%) brightness(0.7)',
                    transform: `scale(${isActive ? 1.15 : 0.95})`,
                  }}
                >
                  <img
                    src={imageUrl}
                    alt={`Value ${imageValue}`}
                    className="w-full h-full object-cover"
                    style={{
                      display: 'block'
                    }}
                    crossOrigin="anonymous"
                    onError={(e) => {
                      console.error(`❌ [DIAL] Image ${index} failed to load:`, imageUrl);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      if (target.parentElement) {
                        target.parentElement.style.backgroundColor = '#f3f4f6';
                      }
                    }}
                  />
                  {/* Value label overlay - conditionally shown */}
                  {showImageLabels && (
                    <div
                      className={cn(
                        'absolute bottom-0 left-0 right-0 py-1 text-center text-sm font-bold transition-colors duration-300',
                        isActive
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-800/70 text-gray-200'
                      )}
                    >
                      {Math.round(imageValue)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Gauge SVG - Centered in the layout */}
            <svg
              ref={gaugeRef}
              width={width}
              height={gaugeType === 'semi-circle' ? height : width}
              viewBox={`0 0 ${width} ${gaugeType === 'semi-circle' ? height : width}`}
              className={cn(
                'absolute select-none',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              )}
              style={{
                left: '50%',
                top: '70px',
                transform: 'translateX(-50%)',
                zIndex: 5,
              }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => setIsDragging(false)}
              role="slider"
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={localValue}
            >
              {/* Background arc segments with gradient colors */}
              {gradientSegments.map((segment, i) => (
                <path
                  key={i}
                  d={segment!.path}
                  fill="none"
                  stroke={segment!.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />
              ))}

              {/* Pointer */}
              {showPointer && (
                <g>
                  {/* Pointer needle */}
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={pointerX}
                    y2={pointerY}
                    stroke="#1e3a5f"
                    strokeWidth={4}
                    strokeLinecap="round"
                    className="transition-all duration-100"
                  />
                  {/* Center circle */}
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={12}
                    fill="#1e3a5f"
                  />
                  {/* Inner center */}
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={6}
                    fill="#fff"
                  />
                </g>
              )}

              {/* Tick marks and labels around the gauge */}
              {labels.map((label, i) => {
                const labelPct = ((label.value - min) / (max - min)) * 100;
                const labelAngle = startAngle - (labelPct / 100) * angleRange;
                const labelRad = (labelAngle * Math.PI) / 180;
                const labelRadius = radius + strokeWidth / 2 + 20;
                const labelX = centerX + labelRadius * Math.cos(labelRad);
                const labelY = centerY - labelRadius * Math.sin(labelRad);

                return (
                  <text
                    key={i}
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs fill-gray-500"
                  >
                    {label.value}
                  </text>
                );
              })}
            </svg>

            {/* Current value display below the gauge */}
            <div 
              className="absolute text-center"
              style={{
                left: '50%',
                bottom: '20px',
                transform: 'translateX(-50%)',
                zIndex: 5,
              }}
            >
              {showValue && (
                <div className="text-2xl font-bold text-gray-800 mb-1">
                  {resolveDisplayValue(localValue, valueDisplayMode, rangeMappings, textMappings)}
                </div>
              )}
              <div className="text-xs text-gray-400 uppercase tracking-wider">
                {instructionText}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Original layout when no sequence images
        <>
          <svg
            ref={gaugeRef}
            width={width}
            height={gaugeType === 'semi-circle' ? height : width}
            viewBox={`0 0 ${width} ${gaugeType === 'semi-circle' ? height : width}`}
            className={cn(
              'select-none',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            )}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => setIsDragging(false)}
            role="slider"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={localValue}
          >
            {/* Background arc segments with gradient colors */}
            {gradientSegments.map((segment, i) => (
              <path
                key={i}
                d={segment!.path}
                fill="none"
                stroke={segment!.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            ))}

            {/* Pointer */}
            {showPointer && (
              <g>
                {/* Pointer needle */}
                <line
                  x1={centerX}
                  y1={centerY}
                  x2={pointerX}
                  y2={pointerY}
                  stroke="#1e3a5f"
                  strokeWidth={4}
                  strokeLinecap="round"
                  className="transition-all duration-100"
                />
                {/* Center circle */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={12}
                  fill="#1e3a5f"
                />
                {/* Inner center */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={6}
                  fill="#fff"
                />
              </g>
            )}

            {/* Tick marks and labels around the gauge */}
            {labels.length > 0 && labels.map((label, i) => {
              const labelPct = ((label.value - min) / (max - min)) * 100;
              const labelAngle = startAngle - (labelPct / 100) * angleRange;
              const labelRad = (labelAngle * Math.PI) / 180;
              const labelRadius = radius + strokeWidth / 2 + 20;
              const labelX = centerX + labelRadius * Math.cos(labelRad);
              const labelY = centerY - labelRadius * Math.sin(labelRad);

              return (
                <text
                  key={i}
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs fill-gray-500"
                >
                  {label.value}
                </text>
              );
            })}
          </svg>

          {/* Value and drag instruction */}
          <div className="flex flex-col items-center gap-2">
            {showValue && (
              <div className="text-2xl font-bold text-gray-800">
                {resolveDisplayValue(localValue, valueDisplayMode, rangeMappings, textMappings)}
              </div>
            )}
            <div className="text-xs text-gray-400 uppercase tracking-wider">
              {instructionText}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DialGauge;
