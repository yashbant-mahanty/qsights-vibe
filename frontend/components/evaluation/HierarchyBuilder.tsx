'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Network, ChevronRight, Users } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Staff {
  id: string;
  name: string;
  email: string;
  role_name: string;
  employee_id?: string;
}

interface Hierarchy {
  id: string;
  staff_id: string;
  reports_to_id: string;
  staff_name: string;
  manager_name: string;
  staff_role_name: string;
  manager_role_name: string;
  relationship_type: string;
  is_primary: boolean;
  is_active: boolean;
}

interface TreeNode {
  id: string;
  name: string;
  email: string;
  role: string;
  employee_id?: string;
  children: TreeNode[];
}

export default function HierarchyBuilder() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [hierarchies, setHierarchies] = useState<Hierarchy[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  const [formData, setFormData] = useState({
    staff_id: '',
    reports_to_id: '',
    relationship_type: 'direct',
    is_primary: true,
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffRes, hierarchyRes, treeRes] = await Promise.all([
        fetchWithAuth('/api/evaluation/staff'),
        fetchWithAuth('/api/evaluation/hierarchy'),
        fetchWithAuth('/api/evaluation/hierarchy/tree')
      ]);

      if (staffRes.success) setStaff(staffRes.staff);
      if (hierarchyRes.success) setHierarchies(hierarchyRes.hierarchies);
      if (treeRes.success) setTree(treeRes.tree);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load hierarchy data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.staff_id === formData.reports_to_id) {
      toast.error('Staff cannot report to themselves');
      return;
    }

    try {
      const response = await fetchWithAuth('/api/evaluation/hierarchy', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (response.success) {
        toast.success('Hierarchy relationship created successfully');
        setShowModal(false);
        resetForm();
        fetchData();
      } else {
        toast.error(response.message || 'Failed to create relationship');
      }
    } catch (error) {
      console.error('Failed to create relationship:', error);
      toast.error('Failed to create relationship');
    }
  };

  const handleDelete = async (hierarchyId: string) => {
    if (!confirm('Are you sure you want to delete this hierarchy relationship?')) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/evaluation/hierarchy/${hierarchyId}`, {
        method: 'DELETE'
      });

      if (response.success) {
        toast.success('Relationship deleted successfully');
        fetchData();
      } else {
        toast.error(response.message || 'Failed to delete relationship');
      }
    } catch (error) {
      console.error('Failed to delete relationship:', error);
      toast.error('Failed to delete relationship');
    }
  };

  const resetForm = () => {
    setFormData({
      staff_id: '',
      reports_to_id: '',
      relationship_type: 'direct',
      is_primary: true,
      is_active: true
    });
  };

  const filteredHierarchies = hierarchies.filter(h =>
    h.staff_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.manager_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderTreeNode = (node: TreeNode, level: number = 0) => (
    <div key={node.id} className="mb-2">
      <div 
        className={`flex items-center gap-3 p-3 bg-white rounded-lg border-2 hover:shadow-md transition-shadow ${
          level === 0 ? 'border-blue-500' : 'border-gray-200'
        }`}
        style={{ marginLeft: `${level * 40}px` }}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
          {node.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="font-medium text-gray-900">{node.name}</div>
          <div className="text-xs text-gray-500">{node.role}</div>
          <div className="text-xs text-gray-400">{node.email}</div>
        </div>
        {node.children.length > 0 && (
          <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
            {node.children.length} {node.children.length === 1 ? 'report' : 'reports'}
          </div>
        )}
      </div>
      {node.children.map(child => renderTreeNode(child, level + 1))}
    </div>
  );

  const getRelationshipBadge = (type: string) => {
    const colors: Record<string, string> = {
      direct: 'bg-green-100 text-green-800',
      indirect: 'bg-yellow-100 text-yellow-800',
      dotted_line: 'bg-purple-100 text-purple-800',
      matrix: 'bg-blue-100 text-blue-800'
    };
    return colors[type] || colors.direct;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hierarchy Management</h1>
          <p className="text-sm text-gray-600 mt-1">Build and manage organizational reporting structure</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`px-4 py-2 rounded-md transition-colors ${
                viewMode === 'tree' ? 'bg-white shadow-sm' : 'text-gray-600'
              }`}
            >
              Tree View
            </button>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Relationship
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Relationships</div>
              <div className="text-2xl font-bold text-gray-900">{hierarchies.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Network className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Active</div>
              <div className="text-2xl font-bold text-green-600">
                {hierarchies.filter(h => h.is_active).length}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <ChevronRight className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Primary Reports</div>
              <div className="text-2xl font-bold text-purple-600">
                {hierarchies.filter(h => h.is_primary).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'list' ? (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search relationships..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reports To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Loading hierarchies...
                    </td>
                  </tr>
                ) : filteredHierarchies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No hierarchy relationships found
                    </td>
                  </tr>
                ) : (
                  filteredHierarchies.map((hierarchy) => (
                    <tr key={hierarchy.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{hierarchy.staff_name}</div>
                          <div className="text-xs text-gray-500">{hierarchy.staff_role_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <ChevronRight className="h-5 w-5 text-gray-400 mx-auto" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{hierarchy.manager_name}</div>
                          <div className="text-xs text-gray-500">{hierarchy.manager_role_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRelationshipBadge(hierarchy.relationship_type)}`}>
                          {hierarchy.relationship_type.replace('_', ' ')}
                        </span>
                        {hierarchy.is_primary && (
                          <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Primary
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hierarchy.is_active ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDelete(hierarchy.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="bg-gray-50 rounded-lg p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading organization tree...</div>
          ) : tree.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No hierarchy tree available. Add relationships to build the organizational structure.
            </div>
          ) : (
            <div className="space-y-2">
              {tree.map(node => renderTreeNode(node))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Hierarchy Relationship</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Staff Member *
                </label>
                <select
                  required
                  value={formData.staff_id}
                  onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Staff</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {s.role_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-center py-2">
                <ChevronRight className="h-6 w-6 text-gray-400 mx-auto" />
                <span className="text-xs text-gray-500">Reports To</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager *
                </label>
                <select
                  required
                  value={formData.reports_to_id}
                  onChange={(e) => setFormData({ ...formData, reports_to_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Manager</option>
                  {staff.filter(s => s.id !== formData.staff_id).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {s.role_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship Type *
                </label>
                <select
                  required
                  value={formData.relationship_type}
                  onChange={(e) => setFormData({ ...formData, relationship_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="direct">Direct Report</option>
                  <option value="indirect">Indirect Report</option>
                  <option value="dotted_line">Dotted Line</option>
                  <option value="matrix">Matrix</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_primary}
                    onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Primary Relationship</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
