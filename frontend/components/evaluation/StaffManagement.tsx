'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface EvaluationStaff {
  id: string;
  name: string;
  email: string;
  employee_id: string | null;
  role_id: string;
  role_name?: string;
  status: string;
  phone: string | null;
  reports_to_count?: number;
  subordinates_count?: number;
  user_id?: string | null;
}

interface EvaluationRole {
  id: string;
  name: string;
  code: string;
}

export default function StaffManagement() {
  const [staff, setStaff] = useState<EvaluationStaff[]>([]);
  const [roles, setRoles] = useState<EvaluationRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<EvaluationStaff | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employee_id: '',
    role_id: '',
    phone: '',
    status: 'active'
  });

  useEffect(() => {
    fetchStaff();
    fetchRoles();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/api/evaluation/staff');
      if (response.success) {
        setStaff(response.staff);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetchWithAuth('/api/evaluation/roles');
      if (response.success) {
        setRoles(response.roles);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingStaff 
        ? `/api/evaluation/staff/${editingStaff.id}` 
        : '/api/evaluation/staff';
      
      const method = editingStaff ? 'PUT' : 'POST';
      
      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(formData)
      });

      if (response.success) {
        toast.success(editingStaff ? 'Staff updated successfully' : 'Staff created successfully');
        setShowModal(false);
        resetForm();
        fetchStaff();
      } else {
        toast.error(response.message || 'Failed to save staff');
      }
    } catch (error) {
      console.error('Failed to save staff:', error);
      toast.error('Failed to save staff');
    }
  };

  const handleDelete = async (staffId: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/evaluation/staff/${staffId}`, {
        method: 'DELETE'
      });

      if (response.success) {
        toast.success('Staff deleted successfully');
        fetchStaff();
      } else {
        toast.error(response.message || 'Failed to delete staff');
      }
    } catch (error) {
      console.error('Failed to delete staff:', error);
      toast.error('Failed to delete staff');
    }
  };

  const handleEdit = (staffMember: EvaluationStaff) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      email: staffMember.email,
      employee_id: staffMember.employee_id || '',
      role_id: staffMember.role_id,
      phone: staffMember.phone || '',
      status: staffMember.status
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      employee_id: '',
      role_id: '',
      phone: '',
      status: 'active'
    });
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.employee_id && member.employee_id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = !filterRole || member.role_id === filterRole;
    const matchesStatus = !filterStatus || member.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      on_leave: 'bg-yellow-100 text-yellow-800',
      terminated: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.active;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage staff members in evaluation system</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Staff
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Roles</option>
          {roles.map(role => (
            <option key={role.id} value={role.id}>{role.name}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on_leave">On Leave</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Staff</div>
          <div className="text-2xl font-bold text-gray-900">{staff.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-2xl font-bold text-green-600">
            {staff.filter(s => s.status === 'active').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">On Leave</div>
          <div className="text-2xl font-bold text-yellow-600">
            {staff.filter(s => s.status === 'on_leave').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Inactive</div>
          <div className="text-2xl font-bold text-gray-600">
            {staff.filter(s => s.status === 'inactive' || s.status === 'terminated').length}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Staff Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hierarchy
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
                  Loading staff...
                </td>
              </tr>
            ) : filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No staff found
                </td>
              </tr>
            ) : (
              filteredStaff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{member.name}</div>
                      <div className="text-xs text-gray-500">{member.email}</div>
                      {member.phone && (
                        <div className="text-xs text-gray-500">{member.phone}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {member.employee_id ? (
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{member.employee_id}</code>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {member.role_name || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-xs">
                      {member.reports_to_count ? (
                        <div className="flex items-center gap-1 text-orange-600">
                          <ChevronUp className="h-3 w-3" />
                          {member.reports_to_count} manager(s)
                        </div>
                      ) : null}
                      {member.subordinates_count ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <ChevronDown className="h-3 w-3" />
                          {member.subordinates_count} subordinate(s)
                        </div>
                      ) : null}
                      {!member.reports_to_count && !member.subordinates_count && (
                        <span className="text-gray-400">No hierarchy</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(member.status)}`}>
                      {member.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(member)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="EMP001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    required
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Role</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
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
                  {editingStaff ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
