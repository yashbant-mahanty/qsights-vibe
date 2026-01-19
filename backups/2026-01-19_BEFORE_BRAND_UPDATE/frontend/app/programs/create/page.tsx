"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  FolderOpen,
  Building2,
  Calendar,
  Upload,
  X,
  Globe,
  Key,
  Image as ImageIcon,
  Check,
  Info,
} from "lucide-react";
import { groupHeadsApi, programsApi, type GroupHead } from "@/lib/api";
import { toast } from "@/components/ui/toast";

export default function CreateProgramPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    organization: "",
    groupHead: "",
    startDate: "",
    endDate: "",
    multilingual: false,
    languages: [] as string[],
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoError, setLogoError] = useState<boolean>(false);
  const [groupHeads, setGroupHeads] = useState<GroupHead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<any>(null);

  useEffect(() => {
    loadGroupHeads();
  }, []);

  async function loadGroupHeads() {
    try {
      setLoading(true);
      const data = await groupHeadsApi.getAll();
      setGroupHeads(data);
    } catch (err) {
      console.error('Error loading group heads:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.name || !formData.groupHead) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name and Group Head)",
        variant: "warning",
      });
      return;
    }

    const selectedGroupHead = groupHeads.find(gh => String(gh.id) === String(formData.groupHead));
    if (!selectedGroupHead) {
      toast({
        title: "Validation Error",
        description: "Please select a valid group head",
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await programsApi.create({
        name: formData.name,
        code: formData.code,
        description: formData.description,
        organization_id: selectedGroupHead.organization_id,
        group_head_id: formData.groupHead,
        start_date: formData.startDate || undefined,
        end_date: formData.endDate || undefined,
        status: 'active',
        generate_admin: true,
        generate_manager: true,
        generate_moderator: true,
        ...(logoUrl && { logo: logoUrl }),
      });
      
      // Show credentials modal if users were generated
      if (response.generated_users) {
        setGeneratedCredentials(response.generated_users);
        setShowCredentialsModal(true);
      } else {
        router.push('/programs');
      }
    } catch (err) {
      toast({
        title: "Error",
        description: 'Failed to create program: ' + (err instanceof Error ? err.message : 'Unknown error'),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  const handleLanguageToggle = (lang: string) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }));
  };

  const availableLanguages = [
    // Major Global Languages
    { code: "EN", name: "English", color: "border-blue-500 text-blue-700 bg-blue-50" },
    { code: "ES", name: "Spanish", color: "border-red-500 text-red-700 bg-red-50" },
    { code: "FR", name: "French", color: "border-purple-500 text-purple-700 bg-purple-50" },
    { code: "DE", name: "German", color: "border-yellow-600 text-yellow-800 bg-yellow-50" },
    { code: "IT", name: "Italian", color: "border-green-500 text-green-700 bg-green-50" },
    { code: "PT", name: "Portuguese", color: "border-orange-500 text-orange-700 bg-orange-50" },
    { code: "ZH", name: "Chinese", color: "border-pink-500 text-pink-700 bg-pink-50" },
    { code: "JA", name: "Japanese", color: "border-indigo-500 text-indigo-700 bg-indigo-50" },
    // Additional Global Languages
    { code: "AR", name: "Arabic", color: "border-emerald-500 text-emerald-700 bg-emerald-50" },
    { code: "HI", name: "Hindi", color: "border-amber-500 text-amber-700 bg-amber-50" },
    { code: "RU", name: "Russian", color: "border-cyan-500 text-cyan-700 bg-cyan-50" },
    { code: "KO", name: "Korean", color: "border-rose-500 text-rose-700 bg-rose-50" },
    { code: "NL", name: "Dutch", color: "border-lime-500 text-lime-700 bg-lime-50" },
    { code: "PL", name: "Polish", color: "border-fuchsia-500 text-fuchsia-700 bg-fuchsia-50" },
    { code: "TR", name: "Turkish", color: "border-sky-500 text-sky-700 bg-sky-50" },
    { code: "VI", name: "Vietnamese", color: "border-teal-500 text-teal-700 bg-teal-50" },
    { code: "TH", name: "Thai", color: "border-violet-500 text-violet-700 bg-violet-50" },
    { code: "ID", name: "Indonesian", color: "border-stone-500 text-stone-700 bg-stone-50" },
    { code: "MS", name: "Malay", color: "border-slate-500 text-slate-700 bg-slate-50" },
    { code: "SV", name: "Swedish", color: "border-blue-400 text-blue-600 bg-blue-50" },
    { code: "NO", name: "Norwegian", color: "border-red-400 text-red-600 bg-red-50" },
    { code: "DA", name: "Danish", color: "border-purple-400 text-purple-600 bg-purple-50" },
    { code: "FI", name: "Finnish", color: "border-cyan-400 text-cyan-600 bg-cyan-50" },
    { code: "EL", name: "Greek", color: "border-sky-400 text-sky-600 bg-sky-50" },
    { code: "HE", name: "Hebrew", color: "border-indigo-400 text-indigo-600 bg-indigo-50" },
    { code: "CS", name: "Czech", color: "border-rose-400 text-rose-600 bg-rose-50" },
    { code: "RO", name: "Romanian", color: "border-amber-400 text-amber-600 bg-amber-50" },
    { code: "UK", name: "Ukrainian", color: "border-yellow-400 text-yellow-600 bg-yellow-50" },
    { code: "BN", name: "Bengali", color: "border-green-400 text-green-600 bg-green-50" },
    { code: "TA", name: "Tamil", color: "border-orange-400 text-orange-600 bg-orange-50" },
    { code: "TE", name: "Telugu", color: "border-pink-400 text-pink-600 bg-pink-50" },
    { code: "MR", name: "Marathi", color: "border-teal-400 text-teal-600 bg-teal-50" },
    { code: "UR", name: "Urdu", color: "border-emerald-400 text-emerald-600 bg-emerald-50" },
  ];

  const mockCredentials = {
    programId: "PRG-2025-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
    accessCode: "AC-" + Math.random().toString(36).substr(2, 8).toUpperCase(),
  };

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-4">
          <a
            href="/programs"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Program</h1>
            <p className="text-sm text-gray-500 mt-1">
              Set up a new program for your organization
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Tips */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                  💡 Quick Tips
                </h4>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Use descriptive program names</li>
                  <li>Set realistic start and end dates</li>
                  <li>Enable multilingual for global teams</li>
                  <li>Upload a logo for better branding</li>
                  <li>Credentials are auto-generated securely</li>
                </ul>
              </CardContent>
            </Card>

            {/* Basic Information */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-qsights-blue" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Program Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Program Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="e.g., Employee Engagement Initiative 2025"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                </div>

                {/* Program Code */}
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-sm font-medium text-gray-700">
                    Program Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    name="code"
                    type="text"
                    placeholder="e.g., EEI-2025-001"
                    value={formData.code}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Unique identifier for the program
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    id="description"
                    name="description"
                    placeholder="Describe the program objectives and goals..."
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Organization & Timeline */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-qsights-blue" />
                  Organization & Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Group Head */}
                <div className="space-y-2">
                  <Label htmlFor="groupHead" className="text-sm font-medium text-gray-700">
                    Assign Group Head <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="groupHead"
                    name="groupHead"
                    value={formData.groupHead}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                    disabled={loading}
                  >
                    <option value="">{loading ? 'Loading group heads...' : 'Select group head'}</option>
                    {groupHeads.map((gh) => (
                      <option key={gh.id} value={gh.id}>
                        {gh.user?.name || 'N/A'} - {gh.organization?.name || 'N/A'}
                      </option>
                    ))}
                  </select>
                  {formData.groupHead && groupHeads.find(gh => String(gh.id) === String(formData.groupHead)) && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      Organization: {groupHeads.find(gh => String(gh.id) === String(formData.groupHead))?.organization?.name}
                    </p>
                  )}
                </div>

                {/* Start & End Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                      Start Date <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="startDate"
                        name="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        className="w-full pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                      End Date <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="endDate"
                        name="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        className="w-full pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Logo Upload */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-qsights-blue" />
                  Program Logo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-xs text-gray-500 mb-4">Upload a file or enter an image URL (e.g., S3 bucket URL)</p>
                <div className="space-y-4">
                  {/* Logo Preview */}
                  {(logoPreview || logoUrl) && (
                    <div className="relative">
                      {logoError ? (
                        <div className="w-full h-48 flex flex-col items-center justify-center bg-gray-50 rounded-lg border-2 border-red-200">
                          <ImageIcon className="w-12 h-12 text-gray-300 mb-2" />
                          <p className="text-sm text-red-500">Failed to load image</p>
                          <p className="text-xs text-gray-400 mt-1">Please check the URL is valid</p>
                        </div>
                      ) : (
                        <img
                          src={logoPreview || logoUrl}
                          alt="Logo preview"
                          className="w-full h-48 object-contain bg-gray-50 rounded-lg border-2 border-gray-200"
                          onError={() => setLogoError(true)}
                          onLoad={() => setLogoError(false)}
                        />
                      )}
                      <button
                        onClick={() => {
                          removeLogo();
                          setLogoUrl("");
                          setLogoError(false);
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  {/* URL Input */}
                  <div>
                    <Label className="text-xs text-gray-600">Image URL</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="url"
                        value={logoUrl}
                        onChange={(e) => {
                          setLogoUrl(e.target.value);
                          setLogoPreview(null); // Clear file preview when URL is entered
                          setLogoError(false); // Reset error state when URL changes
                        }}
                        placeholder="https://example.com/logo.png"
                        className="flex-1"
                      />
                      {logoUrl && (
                        <button
                          onClick={() => setLogoUrl("")}
                          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Example: https://bq-common.s3.ap-south-1.amazonaws.com/logos/logo.png</p>
                  </div>
                  
                  {/* File Upload */}
                  {!logoUrl && (
                    <div>
                      <Label className="text-xs text-gray-600">Or Upload File</Label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label htmlFor="logo-upload">
                        <div className="mt-1 flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <p className="text-sm font-medium text-gray-700">Upload Logo</p>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                        </div>
                      </label>
                      <p className="text-xs text-gray-400 mt-1">Note: File uploads are temporary. Use URL for permanent storage.</p>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500">
                    Recommended size: 512x512px
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Auto-Generated Credentials */}
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader className="border-b border-purple-200">
                <CardTitle className="text-sm font-bold text-purple-900 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Auto-Generated Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-purple-800">
                    Program ID
                  </Label>
                  <Input
                    type="text"
                    value={mockCredentials.programId}
                    readOnly
                    className="bg-white text-sm font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-purple-800">
                    Access Code
                  </Label>
                  <Input
                    type="text"
                    value={mockCredentials.accessCode}
                    readOnly
                    className="bg-white text-sm font-mono"
                  />
                </div>
                <div className="flex items-start gap-2 mt-3 p-3 bg-purple-100 rounded-lg">
                  <Info className="w-4 h-4 text-purple-700 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-purple-800">
                    These credentials will be automatically generated upon saving
                    the program.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="p-6 space-y-3">
                <button 
                  onClick={handleSubmit}
                  disabled={saving || loading}
                  className="w-full px-4 py-2.5 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Program'}
                </button>
                <button className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                  Save & Add Activities
                </button>
                <a
                  href="/programs"
                  className="block w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors text-center"
                >
                  Cancel
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Credentials Modal */}
      {showCredentialsModal && generatedCredentials && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Program Created Successfully!
                  </h3>
                  <p className="text-sm text-gray-600">
                    Program users have been auto-generated
                  </p>
                </div>
              </div>
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <span>
                    <strong>Important:</strong> Save these credentials securely. They will not be shown again!
                  </span>
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Role</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Password</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(generatedCredentials).map((cred: any, index: number) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            cred.role === 'program-admin' 
                              ? 'bg-purple-100 text-purple-800'
                              : cred.role === 'program-manager'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {cred.role.replace('program-', '').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{cred.name}</td>
                        <td className="px-4 py-3 text-gray-700 font-mono text-xs">{cred.email}</td>
                        <td className="px-4 py-3 text-gray-700 font-mono text-xs">{cred.password}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              const text = `Email: ${cred.email}\nPassword: ${cred.password}\nRole: ${cred.role}`;
                              navigator.clipboard.writeText(text);
                              // Optional: Show toast notification
                              toast({
                                title: "Copied!",
                                description: "Credentials copied to clipboard!",
                                variant: "success",
                              });
                            }}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-medium transition-colors"
                          >
                            📋 Copy
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> These users can only access this specific program and its activities. 
                  They can log in using the email and password provided above.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  const allCreds = Object.values(generatedCredentials)
                    .map((cred: any) => `Role: ${cred.role}\nEmail: ${cred.email}\nPassword: ${cred.password}`)
                    .join('\n\n');
                  navigator.clipboard.writeText(allCreds);
                  toast({
                    title: "Copied!",
                    description: "All credentials copied to clipboard!",
                    variant: "success",
                  });
                }}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                📋 Copy All Credentials
              </button>
              <button
                onClick={() => {
                  setShowCredentialsModal(false);
                  router.push('/programs');
                }}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Continue to Programs →
              </button>
            </div>
          </div>
        </div>
      )}
    </RoleBasedLayout>
  );
}
