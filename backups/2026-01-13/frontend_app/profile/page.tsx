"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, MapPin, Calendar, Save, ArrowLeft } from "lucide-react";
import { toast } from "@/components/ui/toast";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    communicationEmail: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    bio: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/me", {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setProfileData({
          name: data.user?.name || "",
          email: data.user?.email || "",
          communicationEmail: data.user?.communication_email || data.user?.email || "",
          phone: data.user?.phone || "",
          address: data.user?.address || "",
          city: data.user?.city || "",
          state: data.user?.state || "",
          country: data.user?.country || "",
          postalCode: data.user?.postal_code || "",
          bio: data.user?.bio || "",
        });
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      const response = await fetch("/api/profile/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success!",
          description: data.message || "Profile updated successfully",
          variant: "success",
        });
      } else {
        let errorMessage = "Failed to update profile";
        if (data && data.message) {
          errorMessage = data.message;
        } else if (data && data.errors && typeof data.errors === 'object') {
          errorMessage = Object.values(data.errors).flat().join(", ");
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error("Failed to save profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleBasedLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
              <p className="text-sm text-gray-600">Manage your personal information</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading profile...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, name: e.target.value })
                      }
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Username</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) =>
                          setProfileData({ ...profileData, email: e.target.value })
                        }
                        className="pl-10"
                        placeholder="your.email@example.com"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Changes will be applied immediately</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="communicationEmail">Communication Email ID</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="communicationEmail"
                        type="email"
                        value={profileData.communicationEmail}
                        onChange={(e) =>
                          setProfileData({ ...profileData, communicationEmail: e.target.value })
                        }
                        className="pl-10"
                        placeholder="communication@example.com"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Changes will be applied immediately</p>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) =>
                          setProfileData({ ...profileData, phone: e.target.value })
                        }
                        className="pl-10"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData({ ...profileData, bio: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={profileData.address}
                    onChange={(e) =>
                      setProfileData({ ...profileData, address: e.target.value })
                    }
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={profileData.city}
                      onChange={(e) =>
                        setProfileData({ ...profileData, city: e.target.value })
                      }
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      value={profileData.state}
                      onChange={(e) =>
                        setProfileData({ ...profileData, state: e.target.value })
                      }
                      placeholder="NY"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={profileData.country}
                      onChange={(e) =>
                        setProfileData({ ...profileData, country: e.target.value })
                      }
                      placeholder="United States"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={profileData.postalCode}
                      onChange={(e) =>
                        setProfileData({ ...profileData, postalCode: e.target.value })
                      }
                      placeholder="10001"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </RoleBasedLayout>
  );
}
