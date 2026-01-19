"use client";

import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle } from 'lucide-react';
import { Suspense } from 'react';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === 'true';
  const alreadySubmitted = searchParams.get('already_submitted') === 'true';
  const activityName = searchParams.get('activity_name');
  const message = searchParams.get('message') || 'Thank you for your response!';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            {alreadySubmitted ? (
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-blue-600" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {alreadySubmitted ? 'Already Submitted' : 'Thank You!'}
          </h1>

          {/* Message */}
          <p className="text-lg text-gray-600 mb-6">
            {message}
          </p>

          {/* Activity Name */}
          {activityName && (
            <div className="bg-qsights-light border border-purple-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-purple-700 font-medium">
                Survey: {decodeURIComponent(activityName)}
              </p>
            </div>
          )}

          {/* Additional Info */}
          {!alreadySubmitted && (
            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <p className="text-sm text-gray-600">
                ✅ Your response has been recorded<br/>
                📧 You may close this page now<br/>
                🔒 Your data is secure and confidential
              </p>
            </div>
          )}

          {alreadySubmitted && (
            <div className="bg-blue-50 rounded-lg p-4 text-left">
              <p className="text-sm text-blue-700">
                ℹ️ You have already submitted your response for this survey. 
                Thank you for your participation!
              </p>
            </div>
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
