"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Calendar,
  Globe,
  Users,
  FileText,
  CheckCircle,
} from "lucide-react";

export default function PreviewActivityPage() {
  const router = useRouter();
  const [activityData, setActivityData] = useState<any>(null);

  useEffect(() => {
    // Load preview data from sessionStorage
    const previewData = sessionStorage.getItem('previewActivity');
    if (previewData) {
      setActivityData(JSON.parse(previewData));
    } else {
      // No preview data, redirect back
      router.push('/activities/create');
    }
  }, [router]);

  if (!activityData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-qsights-blue mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Activity Preview</h1>
              <p className="text-sm text-gray-500 mt-1">
                Review how your activity will appear
              </p>
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors"
          >
            Back to Edit
          </button>
        </div>

        {/* Preview Content */}
        <Card>
          <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-qsights-blue to-qsights-blue/80 text-white">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold">{activityData.title}</CardTitle>
              {activityData.description && (
                <p className="text-sm text-white/90">{activityData.description}</p>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Activity Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <FileText className="w-5 h-5 text-qsights-blue" />
                <div>
                  <p className="text-xs text-gray-500">Activity Type</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">
                    {activityData.type}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Calendar className="w-5 h-5 text-qsights-blue" />
                <div>
                  <p className="text-xs text-gray-500">Timeline</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {activityData.startDate && activityData.endDate
                      ? `${new Date(activityData.startDate).toLocaleDateString()} - ${new Date(activityData.endDate).toLocaleDateString()}`
                      : 'Not set'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Users className="w-5 h-5 text-qsights-blue" />
                <div>
                  <p className="text-xs text-gray-500">Anonymous Access</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {activityData.allowGuests ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Globe className="w-5 h-5 text-qsights-blue" />
                <div>
                  <p className="text-xs text-gray-500">Languages</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {activityData.isMultilingual
                      ? `${activityData.selectedLanguages?.length || 1} languages`
                      : 'English only'}
                  </p>
                </div>
              </div>
            </div>

            {/* Questionnaires */}
            {activityData.questionnaires && activityData.questionnaires.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Assigned Questionnaires ({activityData.questionnaires.length})
                </h3>
                <div className="space-y-2">
                  {activityData.questionnaires.map((qId: string, index: number) => (
                    <div
                      key={qId}
                      className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <div className="flex items-center justify-center w-8 h-8 bg-qsights-blue text-white rounded-full font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          Questionnaire ID: {String(qId || '').substring(0, 8).toUpperCase() || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Participants will complete this questionnaire
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Multilingual Support */}
            {activityData.isMultilingual && activityData.selectedLanguages && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-qsights-blue" />
                  Supported Languages
                </h3>
                <div className="flex flex-wrap gap-2">
                  {activityData.selectedLanguages.map((lang: string) => (
                    <span
                      key={lang}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Info Note */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This is a preview of how your activity will appear. 
                Go back to make any changes before publishing.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
