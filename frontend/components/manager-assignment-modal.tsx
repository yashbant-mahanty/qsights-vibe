import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, AlertTriangle, CheckCircle, UserCheck, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";
import { toast } from "@/components/ui/toast";

interface Manager {
  id: number;
  name: string;
  email: string;
  role: string;
  role_code: string;
  hierarchy_level: number;
}

interface HierarchyInfo {
  hierarchy: any;
  manager: any;
  role: any;
  is_manager: boolean;
  direct_reports_count: number;
}

interface ManagerAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
  programId: string;
  programName: string;
  onSuccess: () => void;
}

export default function ManagerAssignmentModal({
  isOpen,
  onClose,
  userId,
  userName,
  programId,
  programName,
  onSuccess
}: ManagerAssignmentModalProps) {
  const [availableManagers, setAvailableManagers] = useState<Manager[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [hierarchicalRoles, setHierarchicalRoles] = useState<any[]>([]);
  const [currentHierarchy, setCurrentHierarchy] = useState<HierarchyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [reason, setReason] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, userId, programId]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const headers = getAuthHeaders();

      // Load available managers
      const managersResponse = await fetch(
        `${API_URL}/hierarchy/programs/${programId}/available-managers`,
        { headers, credentials: 'include' }
      );
      const managersData = await managersResponse.json();
      if (managersData.success) {
        setAvailableManagers(managersData.managers || []);
      }

      // Load hierarchical roles
      const rolesResponse = await fetch(
        `${API_URL}/hierarchy/roles?role_type=program`,
        { headers, credentials: 'include' }
      );
      const rolesData = await rolesResponse.json();
      if (rolesData.success) {
        setHierarchicalRoles(rolesData.roles || []);
      }

      // Load current hierarchy info
      const hierarchyResponse = await fetch(
        `${API_URL}/hierarchy/users/${userId}/info?program_id=${programId}`,
        { headers, credentials: 'include' }
      );
      const hierarchyData = await hierarchyResponse.json();
      if (hierarchyData.success && hierarchyData.hierarchy) {
        setCurrentHierarchy(hierarchyData);
        if (hierarchyData.manager) {
          setSelectedManagerId(hierarchyData.manager.id.toString());
        }
        if (hierarchyData.role) {
          setSelectedRoleId(hierarchyData.role.id);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load manager assignment data",
        variant: "error"
      });
    } finally {
      setLoadingData(false);
    }
  };

  const validateAssignment = async (managerId: string) => {
    if (!managerId) {
      setValidationError('');
      return;
    }

    setValidating(true);
    setValidationError('');

    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_URL}/hierarchy/validate-assignment`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          manager_user_id: parseInt(managerId),
          program_id: programId,
        }),
      });

      const data = await response.json();
      if (data.success && !data.valid) {
        setValidationError(data.message || 'This assignment would create a circular reporting structure');
      }
    } catch (error) {
      console.error('Error validating assignment:', error);
    } finally {
      setValidating(false);
    }
  };

  const handleManagerChange = (managerId: string) => {
    setSelectedManagerId(managerId);
    validateAssignment(managerId);
  };

  const handleSubmit = async () => {
    if (!selectedManagerId) {
      toast({
        title: "Validation Error",
        description: "Please select a manager",
        variant: "warning"
      });
      return;
    }

    if (!selectedRoleId) {
      toast({
        title: "Validation Error",
        description: "Please select a hierarchical role",
        variant: "warning"
      });
      return;
    }

    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "error"
      });
      return;
    }

    setLoading(true);

    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_URL}/hierarchy/assign-manager`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          program_id: programId,
          manager_user_id: parseInt(selectedManagerId),
          hierarchical_role_id: selectedRoleId,
          reason: reason || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success!",
          description: "Manager assigned successfully",
          variant: "success"
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(data.message || 'Failed to assign manager');
      }
    } catch (error: any) {
      console.error('Error assigning manager:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign manager",
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveManager = async () => {
    if (!confirm('Are you sure you want to remove the manager assignment?')) {
      return;
    }

    setLoading(true);

    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_URL}/hierarchy/remove-manager`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          program_id: programId,
          reason: reason || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success!",
          description: "Manager removed successfully",
          variant: "success"
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(data.message || 'Failed to remove manager');
      }
    } catch (error: any) {
      console.error('Error removing manager:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove manager",
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedManager = availableManagers.find(m => m.id.toString() === selectedManagerId);
  const selectedRole = hierarchicalRoles.find(r => r.id === selectedRoleId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Manager Assignment
          </DialogTitle>
        </DialogHeader>

        {loadingData ? (
          <div className="py-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm text-gray-600">Loading assignment data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* User Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-900">Assigning For:</span>
              </div>
              <p className="text-sm">
                <span className="font-medium">{userName}</span> in <span className="font-medium">{programName}</span>
              </p>
            </div>

            {/* Current Manager Info */}
            {currentHierarchy?.manager && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">Current Manager:</span> {currentHierarchy.manager.name} ({currentHierarchy.manager.email})
                  <br />
                  <span className="text-xs text-gray-600">Role: {currentHierarchy.role?.name || 'N/A'}</span>
                </AlertDescription>
              </Alert>
            )}

            {/* Select Hierarchical Role */}
            <div>
              <Label htmlFor="hierarchical_role" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Hierarchical Role *
              </Label>
              <select
                id="hierarchical_role"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="mt-1 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
              >
                <option value="">Select a role...</option>
                {hierarchicalRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} (Level {role.hierarchy_level}) {role.is_manager ? '👨‍💼' : '👤'}
                  </option>
                ))}
              </select>
              {selectedRole && (
                <p className="text-xs text-gray-600 mt-1">
                  {selectedRole.description || 'No description available'}
                </p>
              )}
            </div>

            {/* Select Manager */}
            <div>
              <Label htmlFor="manager" className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Reporting Manager *
              </Label>
              <select
                id="manager"
                value={selectedManagerId}
                onChange={(e) => handleManagerChange(e.target.value)}
                disabled={validating}
                className="mt-1 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                required
              >
                <option value="">Select a manager...</option>
                {availableManagers.map((manager) => (
                  <option key={manager.id} value={manager.id.toString()}>
                    {manager.name} - {manager.role} ({manager.email})
                  </option>
                ))}
              </select>
              {selectedManager && (
                <p className="text-xs text-gray-600 mt-1">
                  Level {selectedManager.hierarchy_level} • {selectedManager.role}
                </p>
              )}
              {validating && (
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Validating assignment...
                </p>
              )}
            </div>

            {/* Validation Error */}
            {validationError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            {/* Reason (Optional) */}
            <div>
              <Label htmlFor="reason">Reason (Optional)</Label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Team reorganization, new project assignment..."
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be recorded in the audit log
              </p>
            </div>

            {/* Hierarchy Rules */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Hierarchy Rules:</h4>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• One user can report to <strong>only ONE</strong> manager per program</li>
                <li>• Manager must belong to the same program</li>
                <li>• Circular reporting is not allowed (A → B → A)</li>
                <li>• All changes are logged for audit purposes</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between items-center">
          <div>
            {currentHierarchy?.manager && (
              <Button
                variant="outline"
                onClick={handleRemoveManager}
                disabled={loading || loadingData}
                className="text-red-600 hover:bg-red-50"
              >
                Remove Manager
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || loadingData || !!validationError || !selectedManagerId || !selectedRoleId}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Manager'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
