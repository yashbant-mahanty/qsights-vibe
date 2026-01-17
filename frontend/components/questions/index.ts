// Advanced Interactive Question Types Components
// Export all question components for easy importing

import { SliderScale } from './SliderScale';
import { DialGauge } from './DialGauge';
import { LikertVisual } from './LikertVisual';
import { NPSScale } from './NPSScale';
import { StarRating } from './StarRating';

export { SliderScale, DialGauge, LikertVisual, NPSScale, StarRating };

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
}

export interface DialGaugeSettings {
  min?: number;
  max?: number;
  labels?: Array<{ value: number; label: string; color?: string }>;
  gaugeType?: 'gradient' | 'segments';
  colorStops?: Array<{ offset: number; color: string }>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showValue?: boolean;
}

export interface LikertVisualSettings {
  scale?: 5 | 7;
  labels?: string[];
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
    labels: [
      { value: 0, label: 'Poor', color: '#ef4444' },
      { value: 5, label: 'Average', color: '#f59e0b' },
      { value: 10, label: 'Excellent', color: '#22c55e' },
    ],
    gaugeType: 'gradient',
    colorStops: [
      { percent: 0, color: '#ef4444' },
      { percent: 50, color: '#f59e0b' },
      { percent: 100, color: '#22c55e' },
    ],
    size: 'md',
    showValue: true,
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
    default:
      return null;
  }
};
