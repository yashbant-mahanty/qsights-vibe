import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type MetricCardVariant = 
  | 'blue' 
  | 'green' 
  | 'purple' 
  | 'orange' 
  | 'red' 
  | 'pink' 
  | 'indigo' 
  | 'amber'
  | 'cyan'
  | 'teal';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: MetricCardVariant;
  className?: string;
  onClick?: () => void;
}

const variantStyles: Record<MetricCardVariant, {
  border: string;
  gradient: string;
}> = {
  blue: {
    border: 'border-l-blue-500',
    gradient: 'from-blue-500 to-blue-600',
  },
  green: {
    border: 'border-l-green-500',
    gradient: 'from-green-500 to-green-600',
  },
  purple: {
    border: 'border-l-purple-500',
    gradient: 'from-purple-500 to-purple-600',
  },
  orange: {
    border: 'border-l-orange-500',
    gradient: 'from-orange-500 to-orange-600',
  },
  red: {
    border: 'border-l-red-500',
    gradient: 'from-red-500 to-red-600',
  },
  pink: {
    border: 'border-l-pink-500',
    gradient: 'from-pink-500 to-pink-600',
  },
  indigo: {
    border: 'border-l-indigo-500',
    gradient: 'from-indigo-500 to-indigo-600',
  },
  amber: {
    border: 'border-l-amber-500',
    gradient: 'from-amber-500 to-amber-600',
  },
  cyan: {
    border: 'border-l-cyan-500',
    gradient: 'from-cyan-500 to-cyan-600',
  },
  teal: {
    border: 'border-l-teal-500',
    gradient: 'from-teal-500 to-teal-600',
  },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'blue',
  className,
  onClick,
}) => {
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        'border-l-4 shadow-sm hover:shadow-md transition-shadow',
        styles.border,
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6 overflow-hidden">
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-600 mb-2 break-words">
              {title}
            </p>
            <p className="text-3xl font-bold text-gray-900 break-words leading-tight">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-2 break-words">
                {subtitle}
              </p>
            )}
          </div>
          <div className={cn(
            'p-2.5 bg-gradient-to-br rounded-lg shadow-md flex-shrink-0 self-start',
            styles.gradient
          )}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
