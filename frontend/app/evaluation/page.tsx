'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Network, Award, LayoutDashboard, ClipboardList, CalendarCheck } from 'lucide-react';
import AppLayout from '@/components/app-layout';
import RoleManagement from '@/components/evaluation/RoleManagement';
import StaffManagement from '@/components/evaluation/StaffManagement';
import HierarchyBuilder from '@/components/evaluation/HierarchyBuilder';

type TabType = 'roles' | 'staff' | 'hierarchy' | 'dashboard';

export default function EvaluationPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'roles' as TabType, label: 'Roles', icon: Award },
    { id: 'staff' as TabType, label: 'Staff', icon: Users },
    { id: 'hierarchy' as TabType, label: 'Hierarchy', icon: Network },
  ];

  return (
    <AppLayout>
      <div className="bg-gray-50 min-h-screen">
        {/* Header with Tabs */}
        <div className="bg-white border-b">
          <div className="px-6 py-4">
            <h1 className="text-3xl font-bold text-gray-900">Evaluation System</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage roles, staff, hierarchies, and performance evaluations
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 font-medium'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Roles</h3>
                    <Award className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">-</p>
                  <p className="text-sm text-gray-600">Total evaluation roles</p>
                  <button
                    onClick={() => setActiveTab('roles')}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Manage Roles →
                  </button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Staff</h3>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">-</p>
                  <p className="text-sm text-gray-600">Active staff members</p>
                  <button
                    onClick={() => setActiveTab('staff')}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Manage Staff →
                  </button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Hierarchy</h3>
                    <Network className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">-</p>
                  <p className="text-sm text-gray-600">Reporting relationships</p>
                  <button
                    onClick={() => setActiveTab('hierarchy')}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Build Hierarchy →
                  </button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">My Evaluations</h3>
                    <ClipboardList className="h-8 w-8 text-orange-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">View</p>
                  <p className="text-sm text-gray-600">Your pending evaluations</p>
                  <button
                    onClick={() => router.push('/evaluation/my-evaluations')}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View My Evaluations →
                  </button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Events</h3>
                    <CalendarCheck className="h-8 w-8 text-cyan-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">Manage</p>
                  <p className="text-sm text-gray-600">Evaluation events</p>
                  <button
                    onClick={() => router.push('/evaluation-events')}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Manage Events →
                  </button>
                </div>
              </div>

              {/* Quick Start Guide */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Getting Started</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Create Evaluation Roles</h3>
                      <p className="text-sm text-gray-600">
                        Define the different job roles in your organization with hierarchy levels
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Add Staff Members</h3>
                      <p className="text-sm text-gray-600">
                        Add your staff members and assign them to appropriate roles
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Build Reporting Hierarchy</h3>
                      <p className="text-sm text-gray-600">
                        Establish reporting relationships to create your organizational structure
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      4
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Create Evaluation Events</h3>
                      <p className="text-sm text-gray-600">
                        Launch performance evaluations based on your hierarchy
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      5
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Complete Evaluations</h3>
                      <p className="text-sm text-gray-600">
                        Staff members complete their assigned evaluations
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
                <h2 className="text-xl font-bold mb-2">Evaluation System Status</h2>
                <p className="text-blue-100 mb-4">
                  The evaluation module is in MVP phase. Complete the setup steps above to start using the system.
                </p>
                <div className="flex gap-4">
                  <div className="bg-white/20 rounded-lg px-4 py-2">
                    <div className="text-sm opacity-90">Database</div>
                    <div className="font-bold">Ready</div>
                  </div>
                  <div className="bg-white/20 rounded-lg px-4 py-2">
                    <div className="text-sm opacity-90">API</div>
                    <div className="font-bold">Active</div>
                  </div>
                  <div className="bg-white/20 rounded-lg px-4 py-2">
                    <div className="text-sm opacity-90">UI</div>
                    <div className="font-bold">Beta</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roles' && <RoleManagement />}
          {activeTab === 'staff' && <StaffManagement />}
          {activeTab === 'hierarchy' && <HierarchyBuilder />}
        </div>
      </div>
    </AppLayout>
  );
}
