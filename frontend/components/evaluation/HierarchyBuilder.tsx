'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Network, ChevronRight, Users, ArrowRight, UserCheck, Link2, X } from 'lucide-react';
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
  const [managerSearchTerm, setManagerSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'builder' | 'tree'>('builder');
  
  // Two-column selection state
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedManager, setSelectedManager] = useState<Staff | null>(null);
  const [relationshipType, setRelationshipType] = useState('direct');
  const [isPrimary, setIsPrimary] = useState(true);

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

  const handleCreateRelationship = async () => {
    if (!selectedStaff || !selectedManager) {
      toast.error('Please select both staff member and manager');
      return;
    }

    if (selectedStaff.id === selectedManager.id) {
      toast.error('Staff cannot report to themselves');
      return;
    }

    try {
      const response = await fetchWithAuth('/api/evaluation/hierarchy', {
        method: 'POST',
        body: JSON.stringify({
          staff_id: selectedStaff.id,
          reports_to_id: selectedManager.id,
          relationship_type: relationshipType,
          is_primary: isPrimary,
          is_active: true
        })
      });

      if (response.success) {
        toast.success('Hierarchy relationship created successfully');
        resetSelection();
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

  const resetSelection = () => {
    setSelectedStaff(null);
    setSelectedManager(null);
    setRelationshipType('direct');
    setIsPrimary(true);
  };

  // Filter staff for left column
  const filteredStaffList = staff.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter managers for right column (exclude selected staff)
  const filteredManagerList = staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(managerSearchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(managerSearchTerm.toLowerCase()) ||
      s.role_name.toLowerCase().includes(managerSearchTerm.toLowerCase());
    const notSelectedStaff = !selectedStaff || s.id !== selectedStaff.id;
    return matchesSearch && notSelectedStaff;
  });

  const getRelationshipBadge = (type: string) => {
    const colors: Record<string, string> = {
      direct: 'bg-green-100 text-green-800',
      indirect: 'bg-yellow-100 text-yellow-800',
      dotted_line: 'bg-purple-100 text-purple-800',
      matrix: 'bg-blue-100 text-blue-800'
    };
    return colors[type] || colors.direct;
  };

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hierarchy Builder</h1>
          <p className="text-sm text-gray-600 mt-1">Build and manage organizational reporting structure</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('builder')}
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'builder' ? 'bg-white shadow-sm' : 'text-gray-600'
            }`}
          >
            <Link2 className="h-4 w-4 inline mr-2" />
            Builder
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'tree' ? 'bg-white shadow-sm' : 'text-gray-600'
            }`}
          >
            <Network className="h-4 w-4 inline mr-2" />
            Tree View
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Staff</div>
              <div className="text-2xl font-bold text-gray-900">{staff.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Link2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Relationships</div>
              <div className="text-2xl font-bold text-green-600">{hierarchies.length}</div>
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
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Network className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Active</div>
              <div className="text-2xl font-bold text-orange-600">
                {hierarchies.filter(h => h.is_active).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'builder' ? (
        <>
          {/* Two-Column Relationship Builder */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Create Reporting Relationship
              </h2>
              <p className="text-sm text-gray-600 mt-1">Select a staff member on the left and their manager on the right</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
              {/* Left Column - Staff Selection */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    Staff Member
                  </h3>
                  {selectedStaff && (
                    <button 
                      onClick={() => setSelectedStaff(null)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {selectedStaff ? (
                  <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-500 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {selectedStaff.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{selectedStaff.name}</div>
                        <div className="text-sm text-gray-600">{selectedStaff.role_name}</div>
                        <div className="text-xs text-gray-400">{selectedStaff.email}</div>
                      </div>
                      <button 
                        onClick={() => setSelectedStaff(null)}
                        className="p-1 hover:bg-blue-100 rounded"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search staff..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="h-64 overflow-y-auto border border-gray-200 rounded-lg">
                      {loading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : filteredStaffList.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">No staff found</div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {filteredStaffList.map(s => (
                            <button
                              key={s.id}
                              onClick={() => setSelectedStaff(s)}
                              className="w-full p-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3"
                            >
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium text-sm">
                                {s.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm truncate">{s.name}</div>
                                <div className="text-xs text-gray-500 truncate">{s.role_name}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Right Column - Manager Selection */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-500" />
                    Reports To (Manager)
                  </h3>
                  {selectedManager && (
                    <button 
                      onClick={() => setSelectedManager(null)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {selectedManager ? (
                  <div className="p-4 bg-green-50 rounded-lg border-2 border-green-500 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {selectedManager.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{selectedManager.name}</div>
                        <div className="text-sm text-gray-600">{selectedManager.role_name}</div>
                        <div className="text-xs text-gray-400">{selectedManager.email}</div>
                      </div>
                      <button 
                        onClick={() => setSelectedManager(null)}
                        className="p-1 hover:bg-green-100 rounded"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search manager..."
                        value={managerSearchTerm}
                        onChange={(e) => setManagerSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div className="h-64 overflow-y-auto border border-gray-200 rounded-lg">
                      {loading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : filteredManagerList.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">No managers found</div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {filteredManagerList.map(s => (
                            <button
                              key={s.id}
                              onClick={() => setSelectedManager(s)}
                              className="w-full p-3 text-left hover:bg-green-50 transition-colors flex items-center gap-3"
                            >
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium text-sm">
                                {s.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm truncate">{s.name}</div>
                                <div className="text-xs text-gray-500 truncate">{s.role_name}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Relationship Options & Create Button */}
            {(selectedStaff || selectedManager) && (
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Type:</label>
                    <select
                      value={relationshipType}
                      onChange={(e) => setRelationshipType(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="direct">Direct Report</option>
                      <option value="indirect">Indirect Report</option>
                      <option value="dotted_line">Dotted Line</option>
                      <option value="matrix">Matrix</option>
                    </select>
                  </div>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isPrimary}
                      onChange={(e) => setIsPrimary(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Primary Relationship</span>
                  </label>

                  <div className="flex-1"></div>

                  <button
                    onClick={resetSelection}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                  >
                    Reset
                  </button>
                  
                  <button
                    onClick={handleCreateRelationship}
                    disabled={!selectedStaff || !selectedManager}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Relationship
                  </button>
                </div>

                {/* Preview */}
                {selectedStaff && selectedManager && (
                  <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <div className="w-10 h-10 mx-auto bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                          {selectedStaff.name.charAt(0)}
                        </div>
                        <div className="text-xs font-medium text-gray-900 mt-1">{selectedStaff.name}</div>
                        <div className="text-xs text-gray-500">{selectedStaff.role_name}</div>
                      </div>
                      <div className="flex flex-col items-center">
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                        <span className="text-xs text-gray-500 mt-1">{relationshipType.replace('_', ' ')}</span>
                      </div>
                      <div className="text-center">
                        <div className="w-10 h-10 mx-auto bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                          {selectedManager.name.charAt(0)}
                        </div>
                        <div className="text-xs font-medium text-gray-900 mt-1">{selectedManager.name}</div>
                        <div className="text-xs text-gray-500">{selectedManager.role_name}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Existing Relationships Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Existing Relationships</h3>
            </div>
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
                ) : hierarchies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No hierarchy relationships found. Use the builder above to create relationships.
                    </td>
                  </tr>
                ) : (
                  hierarchies.map((hierarchy) => (
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
    </div>
  );
}
