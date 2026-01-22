'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  Users, 
  Calendar, 
  ClipboardList, 
  TrendingUp,
  Activity,
  CheckCircle2
} from 'lucide-react';

interface DashboardStats {
  totalParticipants: number;
  totalActivities: number;
  completedActivities: number;
  totalQuestionnaires: number;
  activeQuestionnaires: number;
  totalResponses: number;
}

interface ProgramData {
  id: number;
  name: string;
  description?: string;
  organization?: {
    name: string;
  };
  participants_count?: number;
  activities_count?: number;
}

export default function ProgramDashboard() {
  const { currentUser } = useAuth();
  const params = useParams();
  const programId = params?.programId as string;
  const [program, setProgram] = useState<ProgramData | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalParticipants: 0,
    totalActivities: 0,
    completedActivities: 0,
    totalQuestionnaires: 0,
    activeQuestionnaires: 0,
    totalResponses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!programId) return;

      try {
        // Fetch program details
        const programResponse = await fetch(`/api/programs/${programId}`);
        if (programResponse.ok) {
          const programData = await programResponse.json();
          setProgram(programData);
        }

        // Fetch program statistics
        const statsResponse = await fetch(`/api/programs/${programId}/statistics`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats({
            totalParticipants: statsData.total_participants || 0,
            totalActivities: statsData.total_activities || 0,
            completedActivities: statsData.completed_activities || 0,
            totalQuestionnaires: statsData.total_questionnaires || 0,
            activeQuestionnaires: statsData.active_questionnaires || 0,
            totalResponses: statsData.total_responses || 0,
          });
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [programId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Participants',
      value: stats.totalParticipants,
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgLight: 'bg-blue-50',
    },
    {
      title: 'Total Activities',
      value: stats.totalActivities,
      icon: Calendar,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      bgLight: 'bg-purple-50',
    },
    {
      title: 'Completed Activities',
      value: stats.completedActivities,
      icon: CheckCircle2,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgLight: 'bg-green-50',
    },
    {
      title: 'Total Questionnaires',
      value: stats.totalQuestionnaires,
      icon: ClipboardList,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      bgLight: 'bg-orange-50',
    },
    {
      title: 'Active Questionnaires',
      value: stats.activeQuestionnaires,
      icon: Activity,
      color: 'bg-teal-500',
      textColor: 'text-teal-600',
      bgLight: 'bg-teal-50',
    },
    {
      title: 'Total Responses',
      value: stats.totalResponses,
      icon: TrendingUp,
      color: 'bg-pink-500',
      textColor: 'text-pink-600',
      bgLight: 'bg-pink-50',
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Program Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {currentUser?.name}! Here's an overview of your program.
        </p>
      </div>

      {/* Program Info Card */}
      {program && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{program.name}</h2>
          {program.description && (
            <p className="text-gray-600 mb-3">{program.description}</p>
          )}
          {program.organization && (
            <div className="text-sm text-gray-500">
              Organization: <span className="font-medium">{program.organization.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.bgLight}`}>
                  <Icon className={card.textColor} size={24} />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {card.value.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">{card.title}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href={`/program/${programId}/events`}
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
          >
            <Calendar className="mx-auto mb-2 text-blue-600" size={24} />
            <div className="font-medium text-gray-900">View Events</div>
          </a>
          <a
            href={`/program/${programId}/questionnaires`}
            className="p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-center"
          >
            <ClipboardList className="mx-auto mb-2 text-purple-600" size={24} />
            <div className="font-medium text-gray-900">Questionnaires</div>
          </a>
          <a
            href={`/program/${programId}/reports`}
            className="p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-center"
          >
            <TrendingUp className="mx-auto mb-2 text-green-600" size={24} />
            <div className="font-medium text-gray-900">View Reports</div>
          </a>
          <a
            href={`/program/${programId}/evaluation`}
            className="p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all text-center"
          >
            <Activity className="mx-auto mb-2 text-orange-600" size={24} />
            <div className="font-medium text-gray-900">Evaluation</div>
          </a>
        </div>
      </div>
    </div>
  );
}
