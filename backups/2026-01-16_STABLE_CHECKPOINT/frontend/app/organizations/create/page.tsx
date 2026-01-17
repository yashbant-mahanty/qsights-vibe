"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Upload,
  X,
  Building2,
  Image as ImageIcon,
} from "lucide-react";
import { organizationsApi } from "@/lib/api";
import { toast } from "@/components/ui/toast";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    industry: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.contactEmail) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name and Email)",
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      await organizationsApi.create({
        name: formData.name,
        email: formData.contactEmail,
        status: 'active',
        ...(logoUrl && { logo: logoUrl }),
      });
      toast({
        title: "Success!",
        description: "Organization created successfully!",
        variant: "success",
      });
      router.push('/organizations');
    } catch (err) {
      toast({
        title: "Error",
        description: 'Failed to create organization: ' + (err instanceof Error ? err.message : 'Unknown error'),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-4">
          <a
            href="/organizations"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Create Organization
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Add a new organization to the system
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Tips - Moved to top */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  💡 Quick Tips
                </h4>
                <ul className="text-xs text-blue-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Use a clear, professional organization name</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Organization code must be unique</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Upload a high-quality logo for better branding</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>All required fields are marked with *</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Basic Information */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-qsights-blue" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Organization Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Organization Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Enter organization name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                </div>

                {/* Organization Code */}
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-sm font-medium text-gray-700">
                    Organization Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    name="code"
                    type="text"
                    placeholder="e.g., TS001"
                    value={formData.code}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Unique identifier for the organization
                  </p>
                </div>

                {/* Industry */}
                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-sm font-medium text-gray-700">
                    Industry <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="industry"
                    name="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                  >
                    <option value="">Select industry</option>
                    <option value="technology">Technology</option>
                    <option value="finance">Finance</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="retail">Retail</option>
                    <option value="education">Education</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="consulting">Consulting</option>
                    <option value="energy">Energy</option>
                    <option value="media">Media</option>
                    <option value="logistics">Logistics</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Description
                  </Label>
                  <textarea
                    id="description"
                    name="description"
                    placeholder="Enter organization description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    Brief description about the organization
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-bold">
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Contact Email */}
                <div className="space-y-2">
                  <Label htmlFor="contactEmail" className="text-sm font-medium text-gray-700">
                    Contact Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    placeholder="contact@organization.com"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                </div>

                {/* Contact Phone */}
                <div className="space-y-2">
                  <Label htmlFor="contactPhone" className="text-sm font-medium text-gray-700">
                    Contact Phone
                  </Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                    Address
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    placeholder="Street address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                </div>

                {/* City, State, Country */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                      City
                    </Label>
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      placeholder="City"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                      State
                    </Label>
                    <Input
                      id="state"
                      name="state"
                      type="text"
                      placeholder="State"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-sm font-medium text-gray-700">
                      Zip Code
                    </Label>
                    <Input
                      id="zipCode"
                      name="zipCode"
                      type="text"
                      placeholder="12345"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm font-medium text-gray-700">
                    Country
                  </Label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qsights-blue"
                  >
                    <option value="">Select country</option>
                    <option value="usa">United States</option>
                    <option value="canada">Canada</option>
                    <option value="uk">United Kingdom</option>
                    <option value="germany">Germany</option>
                    <option value="france">France</option>
                    <option value="spain">Spain</option>
                    <option value="italy">Italy</option>
                    <option value="australia">Australia</option>
                    <option value="india">India</option>
                    <option value="other">Other</option>
                  </select>
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
                  Organization Logo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-xs text-gray-500 mb-4">Upload a file or enter an image URL (e.g., S3 bucket URL)</p>
                <div className="space-y-4">
                  {/* Logo Preview */}
                  {(logoPreview || logoUrl) && (
                    <div className="relative">
                      <img
                        src={logoPreview || logoUrl}
                        alt="Logo preview"
                        className="w-full h-48 object-contain bg-gray-50 rounded-lg border-2 border-gray-200"
                      />
                      <button
                        onClick={() => {
                          removeLogo();
                          setLogoUrl("");
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

            {/* Action Buttons */}
            <Card>
              <CardContent className="p-6 space-y-3">
                <button 
                  onClick={handleSubmit}
                  disabled={saving}
                  className="w-full px-4 py-2.5 bg-qsights-blue text-white rounded-lg text-sm font-medium hover:bg-qsights-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Organization'}
                </button>
                <a
                  href="/organizations"
                  className="block w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors text-center"
                >
                  Cancel
                </a>
              </CardContent>
            </Card>


          </div>
        </div>
      </div>
    </AppLayout>
  );
}
