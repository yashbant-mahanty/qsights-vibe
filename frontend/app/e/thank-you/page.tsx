"use client";

import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { activitiesApi } from '@/lib/api';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === 'true';
  const alreadySubmitted = searchParams.get('already_submitted') === 'true';
  const activityName = searchParams.get('activity_name');
  const activityId = searchParams.get('activity_id');
  const message = searchParams.get('message') || 'Thank you for your response!';
  
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      if (activityId) {
        try {
          const response = await activitiesApi.getLandingPageConfig(activityId);
          setConfig(response);
        } catch (error) {
          console.error('Error loading landing config:', error);
        }
      }
      setLoading(false);
    }
    loadConfig();
  }, [activityId]);

  useEffect(() => {
    async function loadConfig() {
      if (activityId) {
        try {
          const response = await activitiesApi.getLandingPageConfig(activityId);
          setConfig(response);
        } catch (error) {
          console.error('Error loading landing config:', error);
        }
      }
      setLoading(false);
    }
    loadConfig();
  }, [activityId]);

  // Get configuration values with defaults
  const thankYouTitle = config?.thankYouTitle || (alreadySubmitted ? 'Already Submitted' : 'Thank You!');
  const thankYouMessage = config?.thankYouMessage || message;
  const thankYouSubMessage = config?.thankYouSubMessage || '';
  const thankYouIconColor = config?.thankYouIconColor || (alreadySubmitted ? '#3B82F6' : '#10B981');
  const thankYouTitleColor = config?.thankYouTitleColor || '#1F2937';
  const thankYouMessageColor = config?.thankYouMessageColor || '#4B5563';
  const thankYouSubMessageColor = config?.thankYouSubMessageColor || '#6B7280';
  const thankYouShowConfirmation = config?.thankYouShowConfirmation !== false;
  const thankYouButtonText = config?.thankYouButtonText || 'Close';
  const thankYouButtonColor = config?.thankYouButtonColor || '#10B981';
  const thankYouButtonTextColor = config?.thankYouButtonTextColor || '#FFFFFF';
  const thankYouShowButton = config?.thankYouShowButton !== false;
  const thankYouBackgroundStyle = config?.thankYouBackgroundStyle || 'solid';
  const thankYouBackgroundColor = config?.thankYouBackgroundColor || '#FFFFFF';
  const thankYouGradientFrom = config?.thankYouGradientFrom || '#F0FDF4';
  const thankYouGradientTo = config?.thankYouGradientTo || '#DCFCE7';

  const backgroundStyle = thankYouBackgroundStyle === 'gradient'
    ? { background: `linear-gradient(to bottom, ${thankYouGradientFrom}, ${thankYouGradientTo})` }
    : { backgroundColor: thankYouBackgroundColor };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={backgroundStyle}
    >
      <div className="max-w-md w-full">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${thankYouIconColor}20` }}
            >
              <CheckCircle className="w-12 h-12" style={{ color: thankYouIconColor }} />
            </div>
          </div>

          {/* Title */}
          <h1 
            className="text-3xl font-bold mb-4"
            style={{ color: thankYouTitleColor }}
          >
            {thankYouTitle}
          </h1>

          {/* Message */}
          <p 
            className="text-lg mb-4"
            style={{ color: thankYouMessageColor }}
          >
            {thankYouMessage}
          </p>

          {/* Sub Message */}
          {thankYouSubMessage && (
            <p 
              className="text-base mb-6"
              style={{ color: thankYouSubMessageColor }}
            >
              {thankYouSubMessage}
            </p>
          )}

          {/* Activity Name */}
          {activityName && (
            <div className="bg-qsights-light border border-purple-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-purple-700 font-medium">
                Survey: {decodeURIComponent(activityName)}
              </p>
            </div>
          )}

          {/* Email Confirmation Message */}
          {!alreadySubmitted && thankYouShowConfirmation && (
            <p 
              className="text-sm mb-6 italic"
              style={{ color: thankYouSubMessageColor }}
            >
              A confirmation has been sent to your email
            </p>
          )}

          {/* Additional Info for non-already-submitted */}
          {!alreadySubmitted && (
            <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
              <p className="text-sm text-gray-600">
                ✅ Your response has been recorded<br/>
                📧 You may close this page now<br/>
                🔒 Your data is secure and confidential
              </p>
            </div>
          )}

          {/* Already submitted info */}
          {alreadySubmitted && (
            <div className="bg-blue-50 rounded-lg p-4 text-left mb-6">
              <p className="text-sm text-blue-700">
                ℹ️ You have already submitted your response for this survey. 
                Thank you for your participation!
              </p>
            </div>
          )}

          {/* Action Button */}
          {thankYouShowButton && (
            <button
              onClick={() => window.close()}
              className="px-8 py-3 rounded-lg font-medium transition-all hover:shadow-lg"
              style={{
                backgroundColor: thankYouButtonColor,
                color: thankYouButtonTextColor
              }}
            >
              {thankYouButtonText}
            </button>
          )}
        </div>

        {/* Powered by */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Powered by <span className="font-semibold text-qsights-cyan">QSights</span>
        </p>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-cyan mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  );
}
