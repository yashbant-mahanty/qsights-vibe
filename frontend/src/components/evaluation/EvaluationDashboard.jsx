import React, { useState, useEffect } from 'react';
import { Users, Briefcase, Layers, TrendingUp, Plus, Settings } from 'lucide-react';
import DepartmentManager from './DepartmentManager';
import RoleManager from './RoleManager';
import StaffManager from './StaffManager';
import HierarchyMapper from './HierarchyMapper';
import EvaluationTrigger from './EvaluationTrigger';

/**
 * Main Evaluation Dashboard Component
 * Entry point for the entire evaluation system
 */
const EvaluationDashboard = ({ user, apiUrl, authToken }) => {
  const [activeTab, setActiveTab] = useState('departments');
  const [stats, setStats] = useState({
    departments: 0,
    roles: 0,
    staff: 0,
    hierarchies: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json'
      };

      const [depts, roles, staff, hierarchies] = await Promise.all([
        fetch(`${apiUrl}/evaluation/departments?program_id=${user.program_id}`, { headers }).then(r => r.json()),
        fetch(`${apiUrl}/evaluation/roles?program_id=${user.program_id}`, { headers }).then(r => r.json()),
        fetch(`${apiUrl}/evaluation/staff?program_id=${user.program_id}`, { headers }).then(r => r.json()),
        fetch(`${apiUrl}/evaluation/hierarchy?program_id=${user.program_id}`, { headers }).then(r => r.json())
      ]);

      setStats({
        departments: depts.departments?.length || 0,
        roles: roles.roles?.length || 0,
        staff: staff.staff?.length || 0,
        hierarchies: hierarchies.hierarchies?.length || 0
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const tabs = [
    { id: 'departments', label: 'Departments', icon: Briefcase },
    { id: 'roles', label: 'Roles', icon: Layers },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'hierarchy', label: 'Hierarchy', icon: TrendingUp },
    { id: 'trigger', label: 'Trigger Evaluation', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Evaluation Management System</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage departments, roles, staff, and evaluation workflows
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Departments"
            value={stats.departments}
            icon={Briefcase}
            color="blue"
          />
          <StatsCard
            title="Roles"
            value={stats.roles}
            icon={Layers}
            color="green"
          />
          <StatsCard
            title="Staff Members"
            value={stats.staff}
            icon={Users}
            color="purple"
          />
          <StatsCard
            title="Hierarchies"
            value={stats.hierarchies}
            icon={TrendingUp}
            color="orange"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      group inline-flex items-center py-4 px-6 border-b-2 font-medium text-sm
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className={`-ml-0.5 mr-2 h-5 w-5 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'departments' && (
              <DepartmentManager
                user={user}
                apiUrl={apiUrl}
                authToken={authToken}
                onUpdate={fetchStats}
              />
            )}
            {activeTab === 'roles' && (
              <RoleManager
                user={user}
                apiUrl={apiUrl}
                authToken={authToken}
                onUpdate={fetchStats}
              />
            )}
            {activeTab === 'staff' && (
              <StaffManager
                user={user}
                apiUrl={apiUrl}
                authToken={authToken}
                onUpdate={fetchStats}
              />
            )}
            {activeTab === 'hierarchy' && (
              <HierarchyMapper
                user={user}
                apiUrl={apiUrl}
                authToken={authToken}
                onUpdate={fetchStats}
              />
            )}
            {activeTab === 'trigger' && (
              <EvaluationTrigger
                user={user}
                apiUrl={apiUrl}
                authToken={authToken}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatsCard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

export default EvaluationDashboard;
