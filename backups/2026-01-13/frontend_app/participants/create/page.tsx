"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { programsApi, participantsApi, type Program } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  UserCheck,
  Mail,
  Phone,
  Upload,
  X,
  FolderOpen,
  Check,
  Image as ImageIcon,
} from "lucide-react";

export default function CreateParticipantPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    selectedPrograms: [] as string[],
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPrograms();
  }, []);

  async function loadPrograms() {
    try {
      setLoadingPrograms(true);
      const data = await programsApi.getAll();
      setPrograms(data.filter(p => p.status === 'active')); // Only show active programs
    } catch (err) {
      console.error('Failed to load programs:', err);
      toast({
        title: "Error",
        description: "Failed to load programs. Please try again.",
        variant: "error",
      });
    } finally {
      setLoadingPrograms(false);
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
  };

  const handleProgramToggle = (programId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedPrograms: prev.selectedPrograms.includes(programId)
        ? prev.selectedPrograms.filter((p) => p !== programId)
        : [...prev.selectedPrograms, programId],
    }));
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter first name",
        variant: "warning",
      });
      return false;
    }
    if (!formData.lastName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter last name",
        variant: "warning",
      });
      return false;
    }
    if (!formData.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter email address",
        variant: "warning",
      });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "warning",
      });
      return false;
    }
    if (formData.selectedPrograms.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one program",
        variant: "warning",
      });
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      
      // Get organization_id from the first selected program
      const selectedProgram = programs.find(p => formData.selectedPrograms.includes(p.id));
      
      await participantsApi.create({
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone,
        organization_id: selectedProgram?.organization_id || '', 
        language_preference: 'en',
        status: 'active',
        program_ids: formData.selectedPrograms,
      });
      
      toast({
        title: "Success!",
        description: "Participant created successfully!",
        variant: "success",
      });
      router.push('/participants');
    } catch (err) {
      console.error('Failed to create participant:', err);
      toast({
        title: "Error",
        description: 'Failed to create participant: ' + (err instanceof Error ? err.message : 'Unknown error'),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAndAddAnother = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      
      // Get organization_id from the first selected program
      const selectedProgram = programs.find(p => formData.selectedPrograms.includes(p.id));
      
      await participantsApi.create({
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone,
        organization_id: selectedProgram?.organization_id || '',
        language_preference: 'en',
        status: 'active',
        program_ids: formData.selectedPrograms,
      });
      
      toast({
        title: "Success!",
        description: "Participant created successfully!",
        variant: "success",
      });
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        selectedPrograms: [],
      });
      setAvatarPreview(null);
    } catch (err) {
      console.error('Failed to create participant:', err);
      toast({
        title: "Error",
        description: 'Failed to create participant: ' + (err instanceof Error ? err.message : 'Unknown error'),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const availablePrograms = programs.map(prog => ({
    id: prog.id,
    name: prog.name,
    code: String(prog.id).padStart(8, '0'),
    organization: prog.organization?.name || "N/A",
    activities: prog.activities_count || 0,
  }));

  // Old mock data removed - now using real API data


  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-4">
          <a
            href="/participants"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Add Participant
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Create a new participant account
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-qsights-blue" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* First Name & Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="Enter first name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Enter last name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="participant@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-10"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Program Assignment */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-qsights-blue" />
                  Program Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Select Programs <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-gray-500 mb-3">
                    Choose one or more programs for this participant
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    {loadingPrograms ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-qsights-blue mx-auto"></div>
                        <p className="text-sm text-gray-600 mt-2">Loading programs...</p>
                      </div>
                    ) : availablePrograms.length === 0 ? (
                      <div className="text-center py-8">
                        <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No active programs available</p>
                      </div>
                    ) : (
                      availablePrograms.map((program) => (
                        <div
                        key={program.id}
                        onClick={() => handleProgramToggle(program.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.selectedPrograms.includes(program.id)
                            ? "border-qsights-blue bg-blue-50"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-semibold text-gray-900">
                                {program.name}
                              </p>
                              {formData.selectedPrograms.includes(program.id) && (
                                <Check className="w-5 h-5 text-qsights-blue" />
                              )}
                            </div>
                            <p className="text-xs text-gray-600 font-mono mb-1">
                              {program.code}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>{program.organization}</span>
                              <span>•</span>
                              <span>{program.activities} activities</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Selected: {formData.selectedPrograms.length} program(s)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Avatar Upload */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-qsights-blue" />
                  Profile Avatar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Avatar Preview */}
                  {avatarPreview ? (
                    <div className="relative">
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-full h-48 object-cover bg-gray-50 rounded-lg border-2 border-gray-200"
                      />
                      <button
                        onClick={removeAvatar}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="avatar-upload"
                      className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <Upload className="w-10 h-10 text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-700">
                        Upload Avatar
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG up to 5MB
                      </p>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  <p className="text-xs text-gray-500">
                    Recommended size: 400x400px
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="p-6 space-y-3">
                <button 
                  onClick={handleCreate}
                  disabled={saving}
                  className="w-full px-4 py-2.5 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Creating...' : 'Create Participant'}
                </button>
                <button 
                  onClick={handleCreateAndAddAnother}
                  disabled={saving}
                  className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Creating...' : 'Create & Add Another'}
                </button>
                <a
                  href="/participants"
                  className="block w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors text-center"
                >
                  Cancel
                </a>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                  👤 Participant Access
                </h4>
                <p className="text-xs text-blue-800 mb-3">
                  Upon creation, the participant will:
                </p>
                <ul className="text-xs text-blue-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Be added to the selected program(s)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Receive email notifications for activities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Access activities via shared links</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-6">
                <h4 className="text-sm font-semibold text-amber-900 mb-2">
                  💡 Quick Tips
                </h4>
                <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                  <li>Use a valid email address</li>
                  <li>Assign at least one program</li>
                  <li>Avatar is optional but recommended</li>
                  <li>Phone number is optional</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RoleBasedLayout>
  );
}
