"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  UserCog,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Eye,
  X,
  Check,
  Copy,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import { organizationsApi, groupHeadsApi, type Organization } from "@/lib/api";
import { toast } from "@/components/ui/toast";

export default function CreateGroupHeadPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    organization: "",
    department: "",
    employeeId: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoInputMode, setLogoInputMode] = useState<"file" | "url">("file");
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  async function loadOrganizations() {
    try {
      setLoading(true);
      const data = await organizationsApi.getAll();
      setOrganizations(data);
    } catch (err) {
      console.error('Error loading organizations:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "warning",
        });
        return;
      }
      
      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Image must be less than 2MB",
          variant: "warning",
        });
        return;
      }
      
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUrl("");
  };

  const handleLogoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setLogoUrl(url);
    if (url) {
      setLogoPreview(url);
      setLogoFile(null);
    } else {
      setLogoPreview(null);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.organization) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      // Create FormData for multipart upload
      const submitData = new FormData();
      submitData.append('name', `${formData.firstName} ${formData.lastName}`);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      submitData.append('organization_id', formData.organization);
      submitData.append('department', formData.department);
      submitData.append('status', 'active');
      
      if (logoFile) {
        submitData.append('logo', logoFile);
      } else if (logoUrl) {
        submitData.append('logo_url', logoUrl);
      }

      // Send to API
      const response = await fetch('/api/group-heads', {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        throw new Error('Failed to create group head');
      }

      toast({
        title: "Success!",
        description: "Group Head created successfully!",
        variant: "success",
      });
      router.push('/group-heads');
    } catch (err) {
      toast({
        title: "Error",
        description: 'Failed to create group head: ' + (err instanceof Error ? err.message : 'Unknown error'),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  const mockCredentials = {
    username: "sarah.johnson@techsolutions.com",
    password: "TempPass@2025!",
    loginUrl: "https://qsights.app/login",
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-4">
          <a
            href="/group-heads"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Create Group Head
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Add a new group head to manage programs
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Access Credentials - Moved to top */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="border-b border-blue-200">
                <CardTitle className="text-sm font-bold text-blue-900">
                  🔐 Access Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-xs text-blue-800 mb-3">
                  Upon creation, the group head will receive:
                </p>
                <ul className="text-xs text-blue-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Login credentials via email</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Access to assigned programs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Dashboard with analytics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Participant management tools</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Quick Tips - Moved to top */}
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-6">
                <h4 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                  💡 Quick Tips
                </h4>
                <ul className="text-xs text-amber-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600">•</span>
                    <span>Ensure email address is valid</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600">•</span>
                    <span>Group heads can manage multiple programs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600">•</span>
                    <span>Temporary password will be auto-generated</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600">•</span>
                    <span>User must change password on first login</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-qsights-blue" />
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
                      placeholder="grouphead@organization.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    This will be used as the login username
                  </p>
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

                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label htmlFor="logo" className="text-sm font-medium text-gray-700">
                    Profile Logo
                  </Label>
                  
                  {/* Toggle between File and URL */}
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => { setLogoInputMode("file"); setLogoUrl(""); }}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        logoInputMode === "file"
                          ? "bg-qsights-blue text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <Upload className="w-4 h-4 inline mr-1" />
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLogoInputMode("url"); setLogoFile(null); }}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        logoInputMode === "url"
                          ? "bg-qsights-blue text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <ImageIcon className="w-4 h-4 inline mr-1" />
                      URL
                    </button>
                  </div>

                  {logoInputMode === "url" ? (
                    <div className="space-y-3">
                      <Input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={logoUrl}
                        onChange={handleLogoUrlChange}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500">
                        Enter a direct URL to an image (PNG, JPG, WEBP)
                      </p>
                      {logoPreview && logoUrl && (
                        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-16 h-16 object-cover rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "";
                              toast({ title: "Invalid Image URL", description: "Could not load image from URL", variant: "warning" });
                            }}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">Preview</p>
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{logoUrl}</p>
                          </div>
                          <button
                            type="button"
                            onClick={removeLogo}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-5 h-5 text-red-500" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      {logoPreview ? (
                        <div className="flex items-center gap-4">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">{logoFile?.name}</p>
                            <p className="text-xs text-gray-500">
                              {logoFile && (logoFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={removeLogo}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-5 h-5 text-red-500" />
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="logo" className="flex flex-col items-center gap-2 cursor-pointer">
                          <Upload className="w-8 h-8 text-gray-400" />
                          <span className="text-sm text-gray-600">Click to upload logo</span>
                          <span className="text-xs text-gray-500">PNG, JPG, GIF, WEBP up to 2MB</span>
                          <input
                            id="logo"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Organization Details */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-qsights-blue" />
                  Organization Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Organization */}
                <div className="space-y-2">
                  <Label htmlFor="organization" className="text-sm font-medium text-gray-700">
                    Organization <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="organization"
                    name="organization"
                    value={formData.organization}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                    disabled={loading}
                  >
                    <option value="">{loading ? 'Loading organizations...' : 'Select organization'}</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={String(org.id)}>
                        {org.name} ({org.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department */}
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-sm font-medium text-gray-700">
                    Department <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="department"
                      name="department"
                      type="text"
                      placeholder="e.g., Engineering, Sales, Operations"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full pl-10"
                    />
                  </div>
                </div>

                {/* Employee ID */}
                <div className="space-y-2">
                  <Label htmlFor="employeeId" className="text-sm font-medium text-gray-700">
                    Employee ID
                  </Label>
                  <Input
                    id="employeeId"
                    name="employeeId"
                    type="text"
                    placeholder="Enter employee ID"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Optional: Organization's internal employee identifier
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Buttons */}
            <Card>
              <CardContent className="p-6 space-y-3">
                <button 
                  onClick={handleSubmit}
                  disabled={saving || loading}
                  className="w-full px-4 py-2.5 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Group Head'}
                </button>
                <button
                  onClick={() => setShowCredentialsModal(true)}
                  className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Preview Credentials
                </button>
                <a
                  href="/group-heads"
                  className="block w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors text-center"
                >
                  Cancel
                </a>
              </CardContent>
            </Card>


          </div>
        </div>
      </div>

      {/* Credentials Preview Modal */}
      {showCredentialsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                Login Credentials Preview
              </h3>
              <button
                onClick={() => setShowCredentialsModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-800 mb-3">
                  <span className="font-semibold">Note:</span> These credentials
                  will be sent to the group head's email after account creation.
                </p>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Username
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={mockCredentials.username}
                    readOnly
                    className="flex-1 bg-gray-50"
                  />
                  <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Temporary Password
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={mockCredentials.password}
                    readOnly
                    className="flex-1 bg-gray-50 font-mono"
                  />
                  <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Login URL */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Login URL
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={mockCredentials.loginUrl}
                    readOnly
                    className="flex-1 bg-gray-50"
                  />
                  <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs text-amber-800">
                  <span className="font-semibold">🔒 Security:</span> The user
                  will be required to change their password upon first login for
                  security purposes.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowCredentialsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Send Credentials
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
