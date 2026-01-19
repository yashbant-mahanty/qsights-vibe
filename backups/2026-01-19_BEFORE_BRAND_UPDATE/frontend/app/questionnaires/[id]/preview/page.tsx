"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, Edit } from "lucide-react";
import { questionnairesApi, type Questionnaire } from "@/lib/api";

export default function PreviewQuestionnairePage() {
  const router = useRouter();
  const params = useParams();
  const questionnaireId = params.id as string;
  
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuestionnaire();
  }, [questionnaireId]);

  async function loadQuestionnaire() {
    try {
      setLoading(true);
      setError(null);
      const data = await questionnairesApi.getById(questionnaireId);
      setQuestionnaire(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questionnaire');
      console.error('Error loading questionnaire:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-blue mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading questionnaire...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !questionnaire) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 font-semibold">{error || 'Questionnaire not found'}</p>
            <button
              onClick={() => router.push('/questionnaires')}
              className="mt-4 px-4 py-2 bg-qsights-blue text-white rounded-lg hover:bg-blue-700"
            >
              Back to Questionnaires
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-700';
      case 'archived':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/questionnaires')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Preview Questionnaire</h1>
              <p className="text-sm text-gray-500 mt-1">
                View questionnaire details and structure
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/questionnaires/${questionnaireId}/edit`)}
            className="flex items-center gap-2 px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        </div>

        {/* Questionnaire Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{questionnaire.title}</CardTitle>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(questionnaire.status)}`}>
                {questionnaire.status.charAt(0).toUpperCase() + questionnaire.status.slice(1)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Description</p>
              <p className="text-sm text-gray-600 mt-1">
                {questionnaire.description || 'No description provided'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Created</p>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(questionnaire.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Last Modified</p>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(questionnaire.updated_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Preview Mode</p>
                <p className="text-xs text-blue-700 mt-1">
                  This is a preview of the questionnaire. Full question editing and detailed preview features are coming soon.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
