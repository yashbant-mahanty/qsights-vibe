// Advanced Interactive Question Types Components
// Export all question components for easy importing

import { SliderScale } from './SliderScale';
import { DialGauge } from './DialGauge';
import { LikertVisual } from './LikertVisual';
import { NPSScale } from './NPSScale';
import { StarRating } from './StarRating';
import { DragDropBucket } from './DragDropBucket';

export { SliderScale, DialGauge, LikertVisual, NPSScale, StarRating, DragDropBucket };

// Type definitions for question settings
export interface SliderScaleSettings {
  min?: number;
  max?: number;
  step?: number;
  orientation?: 'horizontal' | 'vertical';
  labels?: {
    start?: string;
    middle?: string;
    end?: string;
  };
  showValue?: boolean;
  showTicks?: boolean;
  trackColor?: string;
  activeColor?: string;
  height?: number;
  useCustomImages?: boolean;
  customImages?: {
    thumbUrl?: string;
    trackUrl?: string;
    backgroundUrl?: string; // Main background image displayed above slider
    sequenceImages?: string[]; // Array of image URLs for interactive sequence highlighting
  };
  // Value Display Mode Configuration
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
}

export interface DialGaugeSettings {
  min?: number;
  max?: number;
  labels?: Array<{ value: number; label: string; color?: string }>;
  gaugeType?: 'gradient' | 'segments';
  colorStops?: Array<{ offset: number; color: string }>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showValue?: boolean;
  customImages?: {
    backgroundUrl?: string | null;
    needleUrl?: string | null;
    sequenceImages?: string[];
  };
  // Value Display Mode Configuration
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
}

export interface LikertVisualSettings {
  scale?: 2 | 3 | 5 | 7 | 10;
  labels?: Array<string | { value: number; label: string; icon?: string; emoji?: string }>;
  showLabels?: boolean;
  showIcons?: boolean;
  iconStyle?: 'emoji' | 'face' | 'simple' | 'custom';
  size?: 'sm' | 'md' | 'lg';
  customImages?: Array<{ value: number; imageUrl: string }>;
}

export interface NPSScaleSettings {
  labels?: {
    left?: string;
    right?: string;
  };
  displayStyle?: 'buttons' | 'slider';
  showCategories?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export interface StarRatingSettings {
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
  customImages?: {
    activeImageUrl?: string;
    inactiveImageUrl?: string;
    images?: Array<{ value: number; activeUrl: string; inactiveUrl?: string }>;
  };
}

export interface SCTLikertSettings {
  scale?: 3 | 5 | 7 | 9;
  choiceType?: 'single' | 'multi';
  labels?: string[];
  scores?: number[];
  showScores?: boolean; // Whether to show scores to admin during configuration
  normalizeMultiSelect?: boolean; // Normalize scores for multi-select to avoid inflation
}

// Question type constants
export const INTERACTIVE_QUESTION_TYPES = {
  SLIDER_SCALE: 'slider_scale',
  DIAL_GAUGE: 'dial_gauge',
  LIKERT_VISUAL: 'likert_visual',
  NPS: 'nps',
  STAR_RATING: 'star_rating',
} as const;

// Default settings for each question type
export const DEFAULT_SETTINGS = {
  slider_scale: {
    min: 0,
    max: 100,
    step: 1,
    orientation: 'horizontal',
    labels: { start: 'Low', middle: '', end: 'High' },
    showValue: true,
    showTicks: true,
  } as SliderScaleSettings,
  
  dial_gauge: {
    min: 0,
    max: 10,
    labels: [],
    gaugeType: 'gradient',
    colorStops: [
      { percent: 0, color: '#1e3a5f' },
      { percent: 25, color: '#2563eb' },
      { percent: 50, color: '#60a5fa' },
      { percent: 75, color: '#93c5fd' },
      { percent: 100, color: '#dbeafe' },
    ],
    size: 'md',
    showValue: true,
    instructionText: '',
  } as DialGaugeSettings,
  
  likert_visual: {
    scale: 5,
    labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    showLabels: true,
    showIcons: true,
    iconStyle: 'emoji',
    size: 'md',
  } as LikertVisualSettings,
  
  nps: {
    labels: { left: 'Not at all likely', right: 'Extremely likely' },
    displayStyle: 'buttons',
    showCategories: true,
    size: 'md',
  } as NPSScaleSettings,
  
  star_rating: {
    maxStars: 5,
    icon: 'star',
    allowHalf: false,
    size: 'lg',
    activeColor: '#fbbf24',
    inactiveColor: '#d1d5db',
    hoverEffect: true,
    showLabel: true,
    labels: [
      { value: 1, label: 'Poor' },
      { value: 2, label: 'Fair' },
      { value: 3, label: 'Good' },
      { value: 4, label: 'Very Good' },
      { value: 5, label: 'Excellent' },
    ],
    showValue: true,
    orientation: 'horizontal',
  } as StarRatingSettings,
  drag_and_drop: {
    items: [],
    buckets: [],
    allowMultipleInBucket: false,
    allowReorder: true,
    allowRemove: true,
    requiredMode: 'all',
    mobileMode: 'both',
    layout: 'responsive',
    partialScoring: false,
  },
  sct_likert: {
    scale: 5,
    choiceType: 'single',
    labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    scores: [1, 2, 3, 4, 5],
    showScores: true,
    normalizeMultiSelect: true,
  } as SCTLikertSettings,
};

// Helper to get component by type
export const getQuestionComponent = (type: string) => {
  switch (type) {
    case INTERACTIVE_QUESTION_TYPES.SLIDER_SCALE:
      return SliderScale;
    case INTERACTIVE_QUESTION_TYPES.DIAL_GAUGE:
      return DialGauge;
    case INTERACTIVE_QUESTION_TYPES.LIKERT_VISUAL:
      return LikertVisual;
    case INTERACTIVE_QUESTION_TYPES.NPS:
      return NPSScale;
    case INTERACTIVE_QUESTION_TYPES.STAR_RATING:
      return StarRating;
    case 'drag_and_drop':
      return DragDropBucket;
    default:
      return null;
  }
};
