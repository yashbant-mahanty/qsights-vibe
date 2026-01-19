"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Check, X, AlertCircle } from "lucide-react";
import { API_URL } from "@/lib/api";
import { toast } from "@/components/ui/toast";

interface HierarchyMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  programs: Array<{ id: string; name: string }>;
  allRoles: any[];
  onSuccess: () => void;
}

export default function HierarchyMappingModal({
  isOpen,
  onClose,
  programs,
  allRoles,
  onSuccess
}: HierarchyMappingModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Select Program
  const [selectedProgramId, setSelectedProgramId] = useState("");
  
  // Step 2: Select Parent Role
  const [selectedParentRoleId, setSelectedParentRoleId] = useState("");
  
  // Step 3: Select Parent User (Manager)
  const [selectedParentUserId, setSelectedParentUserId] = useState("");
  
  // Step 4: Select Child Role
  const [selectedChildRoleId, setSelectedChildRoleId] = useState("");
  
  // Step 5: Select Child Users
  const [selectedChildUserIds, setSelectedChildUserIds] = useState<string[]>([]);
  
  // Filtered data
  const [programRoles, setProgramRoles] = useState<any[]>([]);
  const [parentUsers, setParentUsers] = useState<any[]>([]);
  const [childUsers, setChildUsers] = useState<any[]>([]);
  const [existingMappings, setExistingMappings] = useState<any[]>([]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setSelectedProgramId("");
      setSelectedParentRoleId("");
      setSelectedParentUserId("");
      setSelectedChildRoleId("");
      setSelectedChildUserIds([]);
    }
  }, [isOpen]);

  // Load roles for selected program
  useEffect(() => {
    if (selectedProgramId) {
      const rolesForProgram = allRoles.filter(r => r.program_id === selectedProgramId);
      setProgramRoles(rolesForProgram);
      
      // Get unique role names
      const uniqueRoles = rolesForProgram.reduce((acc: any[], curr) => {
        if (!acc.find(r => r.role_name === curr.role_name)) {
          acc.push({ role_name: curr.role_name, id: curr.role_name });
        }
        return acc;
      }, []);
      setProgramRoles(uniqueRoles);
    }
  }, [selectedProgramId, allRoles]);

  // Load parent users for selected parent role
  useEffect(() => {
    if (selectedProgramId && selectedParentRoleId) {
      const users = allRoles.filter(
        r => r.program_id === selectedProgramId && r.role_name === selectedParentRoleId
      );
      setParentUsers(users);
    }
  }, [selectedProgramId, selectedParentRoleId, allRoles]);

  // Load child users for selected child role
  useEffect(() => {
    if (selectedProgramId && selectedChildRoleId) {
      const users = allRoles.filter(
        r => r.program_id === selectedProgramId && 
        r.role_name === selectedChildRoleId &&
        r.id !== selectedParentUserId // Exclude parent user
      );
      setChildUsers(users);
    }
  }, [selectedProgramId, selectedChildRoleId, selectedParentUserId, allRoles]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    };
  };

  const handleNext = () => {
    // Validation for each step
    if (currentStep === 1 && !selectedProgramId) {
      toast({
        title: "Program Required",
        description: "Please select a program to continue",
        variant: "warning"
      });
      return;
    }
    if (currentStep === 2 && !selectedParentRoleId) {
      toast({
        title: "Parent Role Required",
        description: "Please select a parent role to continue",
        variant: "warning"
      });
      return;
    }
    if (currentStep === 3 && !selectedParentUserId) {
      toast({
        title: "Manager Required",
        description: "Please select a manager to continue",
        variant: "warning"
      });
      return;
    }
    if (currentStep === 4 && !selectedChildRoleId) {
      toast({
        title: "Child Role Required",
        description: "Please select a child role to continue",
        variant: "warning"
      });
      return;
    }
    
    // Check for circular hierarchy
    if (currentStep === 4 && selectedChildRoleId === selectedParentRoleId) {
      toast({
        title: "Invalid Hierarchy",
        description: "Child role cannot be the same as parent role",
        variant: "error"
      });
      return;
    }
    
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (selectedChildUserIds.length === 0) {
      toast({
        title: "Users Required",
        description: "Please select at least one user to map",
        variant: "warning"
      });
      return;
    }

    try {
      setLoading(true);
      const headers = getAuthHeaders();

      // Submit mapping for each selected child user
      const mappingPromises = selectedChildUserIds.map(async (childUserId) => {
        const response = await fetch(`${API_URL}/hierarchy-mappings`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            program_id: selectedProgramId,
            parent_role_id: selectedParentRoleId,
            parent_user_id: selectedParentUserId,
            child_role_id: selectedChildRoleId,
            child_user_id: childUserId
          })
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Failed to create mapping' }));
          throw new Error(error.message);
        }

        return response.json();
      });

      await Promise.all(mappingPromises);

      toast({
        title: "Success!",
        description: `Successfully mapped ${selectedChildUserIds.length} user(s) to the manager`,
        variant: "success"
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating hierarchy mapping:', error);
      toast({
        title: "Error",
        description: `Failed to create mapping: ${error.message}`,
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleChildUser = (userId: string) => {
    setSelectedChildUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getSelectedProgram = () => programs.find(p => p.id === selectedProgramId);
  const getSelectedParentUser = () => parentUsers.find(u => u.id === selectedParentUserId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">
              {currentStep}
            </div>
            Hierarchy Mapping - Step {currentStep} of 5
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`h-2 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-green-600' : 'bg-gray-200'
                }`} />
                {step < 5 && <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="border rounded-lg p-6 bg-gray-50">
            {/* Step 1: Select Program */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Select Program</h3>
                  <p className="text-sm text-gray-600 mb-4">Choose the program where the hierarchy will be applied</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {programs.map((program) => (
                    <button
                      key={program.id}
                      onClick={() => setSelectedProgramId(program.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        selectedProgramId === program.id
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{program.name}</span>
                        {selectedProgramId === program.id && (
                          <Check className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Select Parent Role */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Select Parent Role (Manager Role)</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose the role for the manager/supervisor in <strong>{getSelectedProgram()?.name}</strong>
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {programRoles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedParentRoleId(role.role_name)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        selectedParentRoleId === role.role_name
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{role.role_name}</span>
                        {selectedParentRoleId === role.role_name && (
                          <Check className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Select Parent User */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Select Manager</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose the user who will be the manager (Role: <strong>{selectedParentRoleId}</strong>)
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {parentUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedParentUserId(user.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        selectedParentUserId === user.id
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </div>
                        {selectedParentUserId === user.id && (
                          <Check className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Select Child Role */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Select Child Role (Team Member Role)</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose the role for team members who will report to <strong>{getSelectedParentUser()?.username}</strong>
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {programRoles.filter(r => r.role_name !== selectedParentRoleId).map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedChildRoleId(role.role_name)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        selectedChildRoleId === role.role_name
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{role.role_name}</span>
                        {selectedChildRoleId === role.role_name && (
                          <Check className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Select Child Users */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Select Team Members</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose users (Role: <strong>{selectedChildRoleId}</strong>) who will report to <strong>{getSelectedParentUser()?.username}</strong>
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      Each user can only report to one manager. Selected users will be assigned to this manager exclusively.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {childUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No available users found with role {selectedChildRoleId}
                    </div>
                  ) : (
                    childUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => toggleChildUser(user.id)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedChildUserIds.includes(user.id)
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-gray-600">{user.email}</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedChildUserIds.includes(user.id)}
                            onChange={() => toggleChildUser(user.id)}
                            className="w-5 h-5 text-green-600 rounded"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {selectedChildUserIds.length > 0 && (
                  <div className="text-sm text-gray-600">
                    {selectedChildUserIds.length} user(s) selected
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button onClick={handleBack} variant="outline" disabled={loading}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline" disabled={loading}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            {currentStep < 5 ? (
              <Button onClick={handleNext} disabled={loading} className="bg-green-600 hover:bg-green-700">
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading || selectedChildUserIds.length === 0} className="bg-green-600 hover:bg-green-700">
                {loading ? "Creating..." : "Create Mapping"}
                <Check className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
