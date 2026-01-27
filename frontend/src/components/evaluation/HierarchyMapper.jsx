import React, { useState, useEffect } from 'react';
import { Users, ArrowRight, Save, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

/**
 * HierarchyMapper Component
 * Maps parent-child relationships between staff members
 * LEFT COLUMN: Select ONE parent/manager
 * RIGHT COLUMN: Select MULTIPLE children/subordinates
 */
const HierarchyMapper = ({ user, apiUrl, authToken, onUpdate }) => {
  const [staff, setStaff] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [selectedChildren, setSelectedChildren] = useState([]);
  const [existingHierarchies, setExistingHierarchies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [searchParent, setSearchParent] = useState('');
  const [searchChildren, setSearchChildren] = useState('');

  useEffect(() => {
    fetchStaff();
    fetchHierarchies();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/evaluation/staff?program_id=${user.program_id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setStaff(data.staff || []);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
    setLoading(false);
  };

  const fetchHierarchies = async () => {
    try {
      const response = await fetch(`${apiUrl}/evaluation/hierarchy?program_id=${user.program_id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setExistingHierarchies(data.hierarchies || []);
      }
    } catch (error) {
      console.error('Failed to fetch hierarchies:', error);
    }
  };

  const handleSelectParent = (staffMember) => {
    setSelectedParent(staffMember);
    // Load existing children for this parent
    const existingChildren = existingHierarchies
      .filter(h => h.reports_to_id === staffMember.id)
      .map(h => h.staff_id);
    setSelectedChildren(existingChildren);
    setMessage(null);
  };

  const handleToggleChild = (childId) => {
    setSelectedChildren(prev => {
      if (prev.includes(childId)) {
        return prev.filter(id => id !== childId);
      } else {
        return [...prev, childId];
      }
    });
    setMessage(null);
  };

  const handleSaveHierarchy = async () => {
    if (!selectedParent) {
      setMessage({ type: 'error', text: 'Please select a parent/manager first' });
      return;
    }

    if (selectedChildren.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one child/subordinate' });
      return;
    }

    // Prevent self-assignment
    if (selectedChildren.includes(selectedParent.id)) {
      setMessage({ type: 'error', text: 'A staff member cannot report to themselves' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Get existing hierarchies for this parent
      const existingChildren = existingHierarchies
        .filter(h => h.reports_to_id === selectedParent.id)
        .map(h => h.staff_id);

      // Determine which to add and which to remove
      const toAdd = selectedChildren.filter(id => !existingChildren.includes(id));
      const toRemove = existingChildren.filter(id => !selectedChildren.includes(id));

      // Add new hierarchies
      for (const childId of toAdd) {
        await fetch(`${apiUrl}/evaluation/hierarchy`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            staff_id: childId,
            reports_to_id: selectedParent.id,
            relationship_type: 'direct',
            program_id: user.program_id,
            organization_id: user.organization_id
          })
        });
      }

      // Remove old hierarchies
      for (const childId of toRemove) {
        const hierarchy = existingHierarchies.find(
          h => h.reports_to_id === selectedParent.id && h.staff_id === childId
        );
        if (hierarchy) {
          await fetch(`${apiUrl}/evaluation/hierarchy/${hierarchy.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Accept': 'application/json'
            }
          });
        }
      }

      setMessage({ type: 'success', text: 'Hierarchy mapping saved successfully!' });
      await fetchHierarchies();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to save hierarchy:', error);
      setMessage({ type: 'error', text: 'Failed to save hierarchy mapping' });
    }

    setSaving(false);
  };

  const handleRemoveHierarchy = async (hierarchyId) => {
    if (!confirm('Are you sure you want to remove this reporting relationship?')) return;

    try {
      const response = await fetch(`${apiUrl}/evaluation/hierarchy/${hierarchyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        await fetchHierarchies();
        if (selectedParent) {
          const existingChildren = existingHierarchies
            .filter(h => h.reports_to_id === selectedParent.id && h.id !== hierarchyId)
            .map(h => h.staff_id);
          setSelectedChildren(existingChildren);
        }
        onUpdate?.();
      }
    } catch (error) {
      console.error('Failed to remove hierarchy:', error);
    }
  };

  const filteredParents = staff.filter(s =>
    s.name.toLowerCase().includes(searchParent.toLowerCase()) ||
    s.email.toLowerCase().includes(searchParent.toLowerCase())
  );

  const filteredChildren = staff.filter(s =>
    (s.name.toLowerCase().includes(searchChildren.toLowerCase()) ||
    s.email.toLowerCase().includes(searchChildren.toLowerCase())) &&
    s.id !== selectedParent?.id // Don't show parent in children list
  );

  const getSubordinatesCount = (staffId) => {
    return existingHierarchies.filter(h => h.reports_to_id === staffId).length;
  };

  const getManagerName = (staffId) => {
    const hierarchy = existingHierarchies.find(h => h.staff_id === staffId);
    return hierarchy ? hierarchy.manager_name : null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hierarchy Mapping</h2>
          <p className="mt-1 text-sm text-gray-600">
            Map reporting relationships: Select a manager (left) and their team members (right)
          </p>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`rounded-md p-4 ${message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400" />
            )}
            <div className="ml-3">
              <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                {message.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mapping Interface */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No staff members</h3>
          <p className="mt-1 text-sm text-gray-500">Add staff members first to create hierarchies.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN: Parent Selection (Single) */}
            <div className="lg:col-span-1 bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-600" />
                  Select Manager/Parent
                </h3>
                <p className="text-xs text-gray-500 mt-1">Click to select ONE manager</p>
                <input
                  type="text"
                  placeholder="Search managers..."
                  value={searchParent}
                  onChange={(e) => setSearchParent(e.target.value)}
                  className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="max-h-96 overflow-y-auto">
                {filteredParents.map((staffMember) => (
                  <button
                    key={staffMember.id}
                    onClick={() => handleSelectParent(staffMember)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                      selectedParent?.id === staffMember.id ? 'bg-blue-100 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900">{staffMember.name}</div>
                    <div className="text-xs text-gray-500">{staffMember.email}</div>
                    {staffMember.role_name && (
                      <div className="text-xs text-blue-600 mt-1">{staffMember.role_name}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {getSubordinatesCount(staffMember.id)} subordinate(s)
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* MIDDLE: Arrow Indicator */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="text-center">
                <ArrowRight className="h-12 w-12 text-blue-600 mx-auto" />
                <p className="text-sm text-gray-500 mt-2">Reports to</p>
              </div>
            </div>

            {/* RIGHT COLUMN: Children Selection (Multiple) */}
            <div className="lg:col-span-1 bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-green-600" />
                  Select Team Members/Children
                </h3>
                <p className="text-xs text-gray-500 mt-1">Click to select MULTIPLE team members</p>
                <input
                  type="text"
                  placeholder="Search team members..."
                  value={searchChildren}
                  onChange={(e) => setSearchChildren(e.target.value)}
                  className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  disabled={!selectedParent}
                />
              </div>
              <div className="max-h-96 overflow-y-auto">
                {!selectedParent ? (
                  <div className="p-8 text-center text-gray-400">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Select a manager first</p>
                  </div>
                ) : (
                  filteredChildren.map((staffMember) => {
                    const isSelected = selectedChildren.includes(staffMember.id);
                    const currentManager = getManagerName(staffMember.id);
                    
                    return (
                      <button
                        key={staffMember.id}
                        onClick={() => handleToggleChild(staffMember.id)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-green-50 transition-colors ${
                          isSelected ? 'bg-green-100 border-l-4 border-l-green-600' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{staffMember.name}</div>
                            <div className="text-xs text-gray-500">{staffMember.email}</div>
                            {staffMember.role_name && (
                              <div className="text-xs text-green-600 mt-1">{staffMember.role_name}</div>
                            )}
                            {currentManager && currentManager !== selectedParent?.name && (
                              <div className="text-xs text-orange-600 mt-1">
                                Currently reports to: {currentManager}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Selected Summary & Save Button */}
          {selectedParent && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">Selected Mapping</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="font-semibold">{selectedParent.name}</span> will manage{' '}
                    <span className="font-semibold">{selectedChildren.length}</span> team member(s)
                  </p>
                  {selectedChildren.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedChildren.map(childId => {
                        const child = staff.find(s => s.id === childId);
                        return child ? (
                          <span key={childId} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {child.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSaveHierarchy}
                  disabled={saving || selectedChildren.length === 0}
                  className="ml-4 inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {saving ? 'Saving...' : 'Save Hierarchy'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Existing Hierarchies List */}
      {existingHierarchies.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Existing Reporting Relationships</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {existingHierarchies.map((hierarchy) => (
              <div key={hierarchy.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{hierarchy.staff_name}</p>
                    <p className="text-xs text-gray-500">{hierarchy.staff_role_name}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{hierarchy.manager_name}</p>
                    <p className="text-xs text-gray-500">{hierarchy.manager_role_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveHierarchy(hierarchy.id)}
                  className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HierarchyMapper;
