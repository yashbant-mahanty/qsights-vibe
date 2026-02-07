"use client";

import { useSearchParams } from 'next/navigation';
import { XCircle, AlertTriangle } from 'lucide-react';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message') || 'Something went wrong. Please try again.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-red-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Oops!
          </h1>

          {/* Message */}
          <p className="text-lg text-gray-600 mb-6">
            {decodeURIComponent(message)}
          </p>

          {/* Common Issues */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-left mb-6">
            <p className="text-sm font-semibold text-orange-800 mb-2">
              Common reasons:
            </p>
            <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
              <li>The survey link has expired</li>
              <li>You've already submitted this survey</li>
              <li>The survey is no longer active</li>
            </ul>
          </div>

          {/* Contact Info */}
          <p className="text-sm text-gray-500">
            Need help? Contact the survey administrator.
          </p>
        </div>

        {/* Powered by */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Powered by <span className="font-semibold text-qsights-cyan">QSights</span>
        </p>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}
