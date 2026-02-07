"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, CheckCircle, Settings } from "lucide-react";
import { questionnairesApi, type Questionnaire } from "@/lib/api";
import { toast } from "@/components/ui/toast";

export default function EditQuestionnairePage() {
  const router = useRouter();
  const params = useParams();
  const questionnaireId = params.id as string;
  
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Questionnaire Settings
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [showProgressBar, setShowProgressBar] = useState(true);
  const [allowSaveAndContinue, setAllowSaveAndContinue] = useState(true);

  useEffect(() => {
    loadQuestionnaire();
  }, [questionnaireId]);

  async function loadQuestionnaire() {
    try {
      setLoading(true);
      setError(null);
      const data = await questionnairesApi.getById(questionnaireId);
      setQuestionnaire(data);
      
      // Load settings from questionnaire data
      if (data.settings) {
        setRandomizeQuestions(data.settings.randomize_questions ?? false);
        setRandomizeOptions(data.settings.randomize_options ?? false);
        setShowProgressBar(data.settings.show_progress_bar ?? true);
        setAllowSaveAndContinue(data.settings.allow_save_continue ?? true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questionnaire');
      console.error('Error loading questionnaire:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!questionnaire) return;

    try {
      setSaving(true);
      await questionnairesApi.update(questionnaireId, {
        title: questionnaire.title,
        description: questionnaire.description,
        status: questionnaire.status,
        settings: {
          randomize_questions: randomizeQuestions,
          randomize_options: randomizeOptions,
          show_progress_bar: showProgressBar,
          allow_save_continue: allowSaveAndContinue,
        },
      });
      toast({
        title: "Success!",
        description: "Questionnaire updated successfully!",
        variant: "success",
      });
      router.push('/questionnaires');
    } catch (err) {
      console.error('Failed to update questionnaire:', err);
      toast({
        title: "Error",
        description: "Failed to update questionnaire",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

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
              className="mt-4 px-4 py-2 bg-qsights-cyan text-white rounded-lg hover:bg-blue-700"
            >
              Back to Questionnaires
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/questionnaires')}
              className="group flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Back</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Questionnaire</h1>
              <p className="text-sm text-gray-500 mt-1">
                Modify questionnaire details
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-qsights-cyan text-white rounded-lg text-sm font-medium hover:bg-qsights-cyan/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Info Boxes - Positioned below page title */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Questionnaire Checklist */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                📋 Questionnaire Checklist
              </h4>
              <ul className="text-xs text-blue-800 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      questionnaire.title ? "text-green-600" : "text-blue-400"
                    }`}
                  />
                  <span>Questionnaire name</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      questionnaire.description ? "text-green-600" : "text-blue-400"
                    }`}
                  />
                  <span>Description added</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      questionnaire.status === 'published' ? "text-green-600" : "text-blue-400"
                    }`}
                  />
                  <span>Status configured</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">
                  Total Sections
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {questionnaire.sections?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">
                  Total Questions
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {questionnaire.sections?.reduce((acc: number, section: any) => acc + (section.questions?.length || 0), 0) || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">
                  Status
                </span>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded ${
                    questionnaire.status === 'published'
                      ? "bg-green-100 text-green-700"
                      : questionnaire.status === 'archived'
                      ? "bg-gray-200 text-gray-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {questionnaire.status?.charAt(0).toUpperCase() + questionnaire.status?.slice(1) || 'Draft'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Question Types */}
          <Card className="bg-qsights-light border-purple-200">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-purple-900 mb-2">
                📝 Question Types
              </h4>
              <ul className="text-xs text-purple-800 space-y-1.5">
                <li>• Multiple Choice & Multi-Select</li>
                <li>• Text Input & Sliders</li>
                <li>• Rating & Matrix Grids</li>
                <li>• Drag to reorder sections</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>Questionnaire Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={questionnaire.title}
                onChange={(e) => setQuestionnaire({ ...questionnaire, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={questionnaire.description || ''}
                onChange={(e) => setQuestionnaire({ ...questionnaire, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={questionnaire.status}
                onChange={(e) => setQuestionnaire({ ...questionnaire, status: e.target.value as 'draft' | 'published' | 'archived' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Questionnaire Settings */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Settings className="w-4 h-4 text-qsights-blue" />
              Questionnaire Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <div>
                <span className="text-sm font-medium text-gray-700">Randomize Questions</span>
                <p className="text-xs text-gray-500">Display questions in random order for each respondent</p>
              </div>
              <input 
                type="checkbox" 
                checked={randomizeQuestions}
                onChange={(e) => setRandomizeQuestions(e.target.checked)}
                className="w-4 h-4 cursor-pointer accent-qsights-blue" 
              />
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <div>
                <span className="text-sm font-medium text-gray-700">Randomize Options</span>
                <p className="text-xs text-gray-500">Display answer options in random order</p>
              </div>
              <input 
                type="checkbox" 
                checked={randomizeOptions}
                onChange={(e) => setRandomizeOptions(e.target.checked)}
                className="w-4 h-4 cursor-pointer accent-qsights-blue" 
              />
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <div>
                <span className="text-sm font-medium text-gray-700">Show Progress Bar</span>
                <p className="text-xs text-gray-500">Display progress indicator while taking questionnaire</p>
              </div>
              <input 
                type="checkbox" 
                checked={showProgressBar}
                onChange={(e) => setShowProgressBar(e.target.checked)}
                className="w-4 h-4 cursor-pointer accent-qsights-blue" 
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium text-gray-700">Allow Save & Continue</span>
                <p className="text-xs text-gray-500">Let respondents save progress and continue later</p>
              </div>
              <input 
                type="checkbox" 
                checked={allowSaveAndContinue}
                onChange={(e) => setAllowSaveAndContinue(e.target.checked)}
                className="w-4 h-4 cursor-pointer accent-qsights-blue" 
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
