'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface ActivityTimerProps {
  timeLimitMinutes: number;
  onTimeExpired: () => void;
  activityId: number;
}

export default function ActivityTimer({ 
  timeLimitMinutes, 
  onTimeExpired, 
  activityId 
}: ActivityTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  // Initialize timer from localStorage or start fresh
  useEffect(() => {
    const storageKey = `activity_${activityId}_start_time`;
    const storedStartTime = localStorage.getItem(storageKey);
    
    let startTime: number;
    if (storedStartTime) {
      startTime = parseInt(storedStartTime, 10);
    } else {
      startTime = Date.now();
      localStorage.setItem(storageKey, startTime.toString());
    }

    const totalSeconds = timeLimitMinutes * 60;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, totalSeconds - elapsed);

    setRemainingSeconds(remaining);

    // If time already expired, trigger immediately
    if (remaining === 0) {
      onTimeExpired();
    }
  }, [timeLimitMinutes, activityId, onTimeExpired]);

  // Countdown timer
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const newValue = prev - 1;
        
        // Update warning states
        if (newValue <= 60) {
          setIsCritical(true);
        } else if (newValue <= 300) {
          setIsWarning(true);
        }

        // Time expired
        if (newValue <= 0) {
          clearInterval(interval);
          onTimeExpired();
          return 0;
        }

        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds, onTimeExpired]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine styling based on remaining time
  const getTimerClass = () => {
    if (isCritical) {
      return 'bg-red-100 border-red-500 text-red-700';
    }
    if (isWarning) {
      return 'bg-yellow-100 border-yellow-500 text-yellow-700';
    }
    return 'bg-blue-100 border-blue-500 text-blue-700';
  };

  const getIconClass = () => {
    if (isCritical || isWarning) {
      return 'text-red-500';
    }
    return 'text-blue-500';
  };

  if (remainingSeconds === 0) {
    return null; // Don't show timer after expiration
  }

  // Calculate percentage for progress ring
  const totalSeconds = timeLimitMinutes * 60;
  const percentageRemaining = (remainingSeconds / totalSeconds) * 100;
  const circumference = 2 * Math.PI * 36; // radius = 36
  const strokeDashoffset = circumference - (percentageRemaining / 100) * circumference;

  return (
    <div className="fixed top-4 right-4 z-50 transition-all duration-300">
      {/* Modern Glass Card Design */}
      <div className={`relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/90 shadow-2xl border transition-all duration-300 ${
        isCritical 
          ? 'border-red-400/50 shadow-red-500/20' 
          : isWarning 
          ? 'border-yellow-400/50 shadow-yellow-500/20' 
          : 'border-blue-400/50 shadow-blue-500/20'
      }`}>
        {/* Gradient Background Overlay */}
        <div className={`absolute inset-0 opacity-10 ${
          isCritical 
            ? 'bg-gradient-to-br from-red-400 to-red-600' 
            : isWarning 
            ? 'bg-gradient-to-br from-yellow-400 to-orange-500' 
            : 'bg-gradient-to-br from-blue-400 to-indigo-600'
        }`} />
        
        {/* Content Container */}
        <div className="relative z-10 px-6 py-4 flex items-center gap-4">
          {/* Circular Progress Ring */}
          <div className="relative flex items-center justify-center">
            <svg className="w-20 h-20 transform -rotate-90">
              {/* Background Circle */}
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className={isCritical ? 'text-red-200' : isWarning ? 'text-yellow-200' : 'text-blue-200'}
              />
              {/* Progress Circle */}
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`transition-all duration-1000 ${
                  isCritical 
                    ? 'text-red-600' 
                    : isWarning 
                    ? 'text-yellow-600' 
                    : 'text-blue-600'
                }`}
              />
            </svg>
            {/* Icon in Center */}
            <div className="absolute inset-0 flex items-center justify-center">
              {isCritical || isWarning ? (
                <AlertCircle className={`w-6 h-6 ${isCritical ? 'text-red-600 animate-pulse' : 'text-yellow-600'}`} />
              ) : (
                <Clock className="w-6 h-6 text-blue-600" />
              )}
            </div>
          </div>

          {/* Time Display */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                isCritical ? 'text-red-700' : isWarning ? 'text-yellow-700' : 'text-blue-700'
              }`}>
                Time Remaining
              </span>
              {isCritical && (
                <span className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded-full animate-pulse">
                  HURRY!
                </span>
              )}
            </div>
            
            {/* Digital Timer Display */}
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-bold font-mono tracking-tight ${
                isCritical ? 'text-red-600' : isWarning ? 'text-yellow-700' : 'text-blue-600'
              }`}>
                {formatTime(remainingSeconds)}
              </span>
              <span className={`text-sm font-medium ${
                isCritical ? 'text-red-500' : isWarning ? 'text-yellow-600' : 'text-blue-500'
              }`}>
                min
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mt-2 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ease-linear ${
                  isCritical 
                    ? 'bg-gradient-to-r from-red-500 to-red-600' 
                    : isWarning 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                }`}
                style={{ width: `${percentageRemaining}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
