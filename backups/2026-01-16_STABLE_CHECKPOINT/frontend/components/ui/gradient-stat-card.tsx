"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type GradientVariant = 
  | 'purple'   // Like "Total Topics" in the reference
  | 'blue'     // Like "Visited" in the reference  
  | 'green'    // Like "Completed" in the reference
  | 'yellow'   // Like "In Progress" in the reference
  | 'gray'     // Like "Untapped" in the reference
  | 'orange'
  | 'pink'
  | 'indigo'
  | 'cyan'
  | 'teal'
  | 'red'
  | 'amber';

interface GradientStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: GradientVariant;
  className?: string;
  onClick?: () => void;
}

const gradientStyles: Record<GradientVariant, {
  background: string;
  titleColor: string;
  valueColor: string;
  iconBg: string;
  iconColor: string;
}> = {
  purple: {
    background: 'bg-gradient-to-br from-violet-100 via-purple-50 to-violet-100',
    titleColor: 'text-purple-600',
    valueColor: 'text-purple-800',
    iconBg: 'bg-white/80',
    iconColor: 'text-purple-500',
  },
  blue: {
    background: 'bg-gradient-to-br from-blue-100 via-sky-50 to-blue-100',
    titleColor: 'text-blue-600',
    valueColor: 'text-blue-800',
    iconBg: 'bg-white/80',
    iconColor: 'text-blue-500',
  },
  green: {
    background: 'bg-gradient-to-br from-emerald-100 via-green-50 to-emerald-100',
    titleColor: 'text-emerald-600',
    valueColor: 'text-emerald-800',
    iconBg: 'bg-white/80',
    iconColor: 'text-emerald-500',
  },
  yellow: {
    background: 'bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-100',
    titleColor: 'text-amber-600',
    valueColor: 'text-amber-800',
    iconBg: 'bg-white/80',
    iconColor: 'text-amber-500',
  },
  gray: {
    background: 'bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100',
    titleColor: 'text-slate-600',
    valueColor: 'text-slate-800',
    iconBg: 'bg-white/80',
    iconColor: 'text-slate-500',
  },
  orange: {
    background: 'bg-gradient-to-br from-orange-100 via-amber-50 to-orange-100',
    titleColor: 'text-orange-600',
    valueColor: 'text-orange-800',
    iconBg: 'bg-white/80',
    iconColor: 'text-orange-500',
  },
  pink: {
    background: 'bg-gradient-to-br from-pink-100 via-rose-50 to-pink-100',
    titleColor: 'text-pink-600',
    valueColor: 'text-pink-800',
    iconBg: 'bg-white/80',
    iconColor: 'text-pink-500',
  },
  indigo: {
    background: 'bg-gradient-to-br from-indigo-100 via-violet-50 to-indigo-100',
    titleColor: 'text-indigo-600',
    valueColor: 'text-indigo-800',
    iconBg: 'bg-white/80',
    iconColor: 'text-indigo-500',
  },
  cyan: {
    background: 'bg-gradient-to-br from-cyan-100 via-sky-50 to-cyan-100',
    titleColor: 'text-cyan-600',
    valueColor: 'text-cyan-800',
    iconBg: 'bg-white/80',
    iconColor: 'text-cyan-500',
  },
  teal: {
    background: 'bg-gradient-to-br from-teal-100 via-emerald-50 to-teal-100',
    titleColor: 'text-teal-600',
    valueColor: 'text-teal-800',
    iconBg: 'bg-white/80',
    iconColor: 'text-teal-500',
  },
  red: {
    background: 'bg-gradient-to-br from-red-100 via-rose-50 to-red-100',
    titleColor: 'text-red-600',
    valueColor: 'text-red-800',
    iconBg: 'bg-white/80',
    iconColor: 'text-red-500',
  },
  amber: {
    background: 'bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-100',
    titleColor: 'text-amber-600',
    valueColor: 'text-amber-800',
    iconBg: 'bg-white/80',
    iconColor: 'text-amber-500',
  },
};

export const GradientStatCard: React.FC<GradientStatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'blue',
  className,
  onClick,
}) => {
  const styles = gradientStyles[variant];

  return (
    <div
      className={cn(
        'rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 border border-white/50',
        styles.background,
        onClick && 'cursor-pointer hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={cn('text-sm font-semibold mb-3', styles.titleColor)}>
            {title}
          </p>
          <p className={cn('text-4xl font-bold leading-tight', styles.valueColor)}>
            {value}
          </p>
          {subtitle && (
            <p className={cn('text-xs mt-2 font-medium opacity-75', styles.titleColor)}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={cn(
          'p-3 rounded-xl shadow-sm',
          styles.iconBg
        )}>
          <Icon className={cn('w-6 h-6', styles.iconColor)} />
        </div>
      </div>
    </div>
  );
};

export default GradientStatCard;
