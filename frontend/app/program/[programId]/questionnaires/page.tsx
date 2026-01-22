'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canCreateResource } from '@/lib/permissions';
import { questionnairesApi } from '@/lib/api';

interface Questionnaire {
  id: number;
  title: string;
  description?: string;
  status: string;
  responses_count?: number;
}

export default function ProgramQuestionnairesPage() {
  const { currentUser } = useAuth();
  const params = useParams();
  const programId = params?.programId as string;
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestionnaires = async () => {
      try {
        // Use questionnairesApi with program_id filter
        const data = await questionnairesApi.getAll({ program_id: programId });
        setQuestionnaires(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load questionnaires:', error);
        setQuestionnaires([]);
      } finally {
        setLoading(false);
      }
    };

    if (programId) {
      fetchQuestionnaires();
    }
  }, [programId]);

  const canCreateQuestionnaire = currentUser ? canCreateResource(currentUser.role, 'questionnaires') : false;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Questionnaires</h1>
        {canCreateQuestionnaire && (
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Create Questionnaire
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading questionnaires...</div>
        ) : questionnaires.length === 0 ? (
          <div className="p-8 text-center text-gray-600">No questionnaires found</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {questionnaires.map((q) => (
              <div key={q.id} className="p-4 hover:bg-gray-50">
                <h3 className="font-medium text-gray-900">{q.title}</h3>
                {q.description && (
                  <p className="text-sm text-gray-600 mt-1">{q.description}</p>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  Status: {q.status} | Responses: {q.responses_count || 0}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
