"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cmsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Save,
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  MessageSquare,
  Shield,
  Scale,
  HelpCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/rich-text-editor";

export default function CmsManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cmsData, setCmsData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  // Load CMS content
  useEffect(() => {
    let isMounted = true;

    async function loadCmsContent() {
      try {
        setLoading(true);
        setError(null);
        const data = await cmsApi.getAll();
        
        if (!isMounted) return;
        
        const contentMap: any = {};
        data.forEach((item: any) => {
          contentMap[item.page_key] = item;
        });
        
        setCmsData(contentMap);
      } catch (error) {
        console.error('Error loading CMS content:', error);
        if (isMounted) {
          setError('Failed to load CMS content. Please try again.');
          toast({
            title: "Error",
            description: "Failed to load CMS content",
            variant: "error",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    loadCmsContent();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      
      const updates = Object.entries(cmsData).map(([pageKey, content]: [string, any]) => {
        const update: any = {
          page_key: pageKey,
        };
        
        // Only include defined fields
        if (content.title !== undefined) update.title = content.title;
        if (content.description !== undefined) update.description = content.description;
        if (content.content !== undefined) update.content = content.content;
        if (content.cta_text !== undefined) update.cta_text = content.cta_text;
        if (content.cta_link !== undefined) update.cta_link = content.cta_link;
        
        // Only include form_fields and messages for pages that have them
        if (content.form_fields !== undefined && ['contact_sales', 'request_demo', 'contact_us'].includes(pageKey)) {
          update.form_fields = content.form_fields;
        }
        if (content.messages !== undefined && ['contact_sales', 'request_demo', 'contact_us'].includes(pageKey)) {
          update.messages = content.messages;
        }
        
        return update;
      });

      await cmsApi.bulkUpdate(updates);
      
      toast({
        title: "Success!",
        description: "CMS content updated successfully",
        variant: "success",
      });
    } catch (error) {
      console.error('Error saving CMS content:', error);
      toast({
        title: "Error",
        description: "Failed to save CMS content",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }, [cmsData]);

  const updateField = useCallback((pageKey: string, field: string, value: any) => {
    setCmsData((prev: any) => ({
      ...prev,
      [pageKey]: {
        ...prev[pageKey],
        [field]: value,
      },
    }));
  }, []);

  // Memoize derived data to prevent unnecessary re-renders
  const contactSales = useMemo(() => cmsData.contact_sales || {}, [cmsData.contact_sales]);
  const requestDemo = useMemo(() => cmsData.request_demo || {}, [cmsData.request_demo]);
  const contactUs = useMemo(() => cmsData.contact_us || {}, [cmsData.contact_us]);
  const privacyPolicy = useMemo(() => cmsData.privacy_policy || {}, [cmsData.privacy_policy]);
  const termsOfService = useMemo(() => cmsData.terms_of_service || {}, [cmsData.terms_of_service]);

  function updateFormField(pageKey: string, fieldKey: string, property: string, value: any) {
    setCmsData((prev: any) => ({
      ...prev,
      [pageKey]: {
        ...prev[pageKey],
        form_fields: {
          ...prev[pageKey].form_fields,
          [fieldKey]: {
            ...prev[pageKey].form_fields[fieldKey],
            [property]: value,
          },
        },
      },
    }));
  }

  function updateMessage(pageKey: string, messageType: string, field: string, value: string) {
    setCmsData((prev: any) => ({
      ...prev,
      [pageKey]: {
        ...prev[pageKey],
        messages: {
          ...prev[pageKey].messages,
          [messageType]: {
            ...prev[pageKey].messages[messageType],
            [field]: value,
          },
        },
      },
    }));
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-qsights-blue" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load CMS Content</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <button
          onClick={() => router.push('/settings')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Settings</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CMS Content Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage content for forms, pages, and legal documents
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-qsights-blue hover:bg-qsights-blue/90"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save All Changes
              </>
            )}
          </Button>
        </div>

        <Tabs defaultValue="contact_sales" className="space-y-6">
          <TabsList className="inline-flex bg-gray-100 p-1 rounded-lg">
            <TabsTrigger value="contact_sales" className="data-[state=active]:bg-white">
              <Mail className="w-4 h-4 mr-2" />
              Contact Sales
            </TabsTrigger>
            <TabsTrigger value="request_demo" className="data-[state=active]:bg-white">
              <Phone className="w-4 h-4 mr-2" />
              Request Demo
            </TabsTrigger>
            <TabsTrigger value="contact_us" className="data-[state=active]:bg-white">
              <MessageSquare className="w-4 h-4 mr-2" />
              Contact Us
            </TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:bg-white">
              <Shield className="w-4 h-4 mr-2" />
              Privacy Policy
            </TabsTrigger>
            <TabsTrigger value="terms" className="data-[state=active]:bg-white">
              <Scale className="w-4 h-4 mr-2" />
              Terms of Service
            </TabsTrigger>
          </TabsList>

          {/* Contact Sales Tab */}
          <TabsContent value="contact_sales" className="space-y-6">
            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">No Hardcoded Content</p>
                  <p className="text-xs text-blue-800 mt-1">
                    All page titles, descriptions, form labels, placeholders, and messages are managed through the CMS. Changes take effect immediately without code deployment.
                  </p>
                </div>
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Contact Sales Page Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Page Title</Label>
                  <Input
                    value={contactSales.title || ''}
                    onChange={(e) => updateField('contact_sales', 'title', e.target.value)}
                    placeholder="Get in Touch With Our Sales Team"
                  />
                </div>
                <div>
                  <Label>Page Description</Label>
                  <Input
                    value={contactSales.description || ''}
                    onChange={(e) => updateField('contact_sales', 'description', e.target.value)}
                    placeholder="Brief description..."
                  />
                </div>
                <div>
                  <Label>CTA Button Text</Label>
                  <Input
                    value={contactSales.cta_text || ''}
                    onChange={(e) => updateField('contact_sales', 'cta_text', e.target.value)}
                    placeholder="Submit Request"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Form Fields</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contactSales.form_fields && Object.entries(contactSales.form_fields).map(([key, field]: [string, any]) => (
                  <div key={key} className="p-4 border rounded-lg space-y-2">
                    <h4 className="font-semibold text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={field.label || ''}
                          onChange={(e) => updateFormField('contact_sales', key, 'label', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Placeholder</Label>
                        <Input
                          value={field.placeholder || ''}
                          onChange={(e) => updateFormField('contact_sales', key, 'placeholder', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Success/Error Messages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border border-green-200 rounded-lg bg-green-50 space-y-2">
                  <h4 className="font-semibold text-sm text-green-900">Success Message</h4>
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={contactSales.messages?.success?.title || ''}
                      onChange={(e) => updateMessage('contact_sales', 'success', 'title', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={contactSales.messages?.success?.description || ''}
                      onChange={(e) => updateMessage('contact_sales', 'success', 'description', e.target.value)}
                    />
                  </div>
                </div>
                <div className="p-4 border border-red-200 rounded-lg bg-red-50 space-y-2">
                  <h4 className="font-semibold text-sm text-red-900">Error Message</h4>
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={contactSales.messages?.error?.title || ''}
                      onChange={(e) => updateMessage('contact_sales', 'error', 'title', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={contactSales.messages?.error?.description || ''}
                      onChange={(e) => updateMessage('contact_sales', 'error', 'description', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Request Demo Tab */}
          <TabsContent value="request_demo" className="space-y-6">
            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">No Hardcoded Content</p>
                  <p className="text-xs text-blue-800 mt-1">
                    All page titles, descriptions, form labels, placeholders, and messages are managed through the CMS. Changes take effect immediately without code deployment.
                  </p>
                </div>
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Request Demo Page Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Page Title</Label>
                  <Input
                    value={requestDemo.title || ''}
                    onChange={(e) => updateField('request_demo', 'title', e.target.value)}
                    placeholder="Request a Personalized Demo"
                  />
                </div>
                <div>
                  <Label>Page Description</Label>
                  <Input
                    value={requestDemo.description || ''}
                    onChange={(e) => updateField('request_demo', 'description', e.target.value)}
                    placeholder="Brief description..."
                  />
                </div>
                <div>
                  <Label>CTA Button Text</Label>
                  <Input
                    value={requestDemo.cta_text || ''}
                    onChange={(e) => updateField('request_demo', 'cta_text', e.target.value)}
                    placeholder="Request Demo"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Form Fields</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {requestDemo.form_fields && Object.entries(requestDemo.form_fields).map(([key, field]: [string, any]) => (
                  <div key={key} className="p-4 border rounded-lg space-y-2">
                    <h4 className="font-semibold text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={field.label || ''}
                          onChange={(e) => updateFormField('request_demo', key, 'label', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Placeholder</Label>
                        <Input
                          value={field.placeholder || ''}
                          onChange={(e) => updateFormField('request_demo', key, 'placeholder', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Success/Error Messages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border border-green-200 rounded-lg bg-green-50 space-y-2">
                  <h4 className="font-semibold text-sm text-green-900">Success Message</h4>
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={requestDemo.messages?.success?.title || ''}
                      onChange={(e) => updateMessage('request_demo', 'success', 'title', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={requestDemo.messages?.success?.description || ''}
                      onChange={(e) => updateMessage('request_demo', 'success', 'description', e.target.value)}
                    />
                  </div>
                </div>
                <div className="p-4 border border-red-200 rounded-lg bg-red-50 space-y-2">
                  <h4 className="font-semibold text-sm text-red-900">Error Message</h4>
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={requestDemo.messages?.error?.title || ''}
                      onChange={(e) => updateMessage('request_demo', 'error', 'title', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={requestDemo.messages?.error?.description || ''}
                      onChange={(e) => updateMessage('request_demo', 'error', 'description', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Us Tab */}
          <TabsContent value="contact_us" className="space-y-6">
            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">No Hardcoded Content</p>
                  <p className="text-xs text-blue-800 mt-1">
                    All page titles, descriptions, form labels, placeholders, and messages are managed through the CMS. Changes take effect immediately without code deployment.
                  </p>
                </div>
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Contact Us Page Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Page Title</Label>
                  <Input
                    value={contactUs.title || ''}
                    onChange={(e) => updateField('contact_us', 'title', e.target.value)}
                    placeholder="Contact Us"
                  />
                </div>
                <div>
                  <Label>Page Description</Label>
                  <Input
                    value={contactUs.description || ''}
                    onChange={(e) => updateField('contact_us', 'description', e.target.value)}
                    placeholder="Brief description..."
                  />
                </div>
                <div>
                  <Label>CTA Button Text</Label>
                  <Input
                    value={contactUs.cta_text || ''}
                    onChange={(e) => updateField('contact_us', 'cta_text', e.target.value)}
                    placeholder="Send Message"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Form Fields</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contactUs.form_fields && Object.entries(contactUs.form_fields).map(([key, field]: [string, any]) => (
                  <div key={key} className="p-4 border rounded-lg space-y-2">
                    <h4 className="font-semibold text-sm capitalize">{key}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={field.label || ''}
                          onChange={(e) => updateFormField('contact_us', key, 'label', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Placeholder</Label>
                        <Input
                          value={field.placeholder || ''}
                          onChange={(e) => updateFormField('contact_us', key, 'placeholder', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Policy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            {/* Info Box */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-purple-900">HTML Content Editor</p>
                  <p className="text-xs text-purple-800 mt-1">
                    Enter HTML content for your Privacy Policy. The last updated date will be automatically set when you save changes.
                  </p>
                </div>
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Privacy Policy</CardTitle>
                <p className="text-sm text-gray-500">
                  Last updated: {privacyPolicy.last_updated_date ? new Date(privacyPolicy.last_updated_date).toLocaleDateString() : 'Never'}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={privacyPolicy.title || ''}
                    onChange={(e) => updateField('privacy_policy', 'title', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={privacyPolicy.description || ''}
                    onChange={(e) => updateField('privacy_policy', 'description', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Content (Rich Text)</Label>
                  <RichTextEditor
                    value={privacyPolicy.content || ''}
                    onChange={(value) => updateField('privacy_policy', 'content', value)}
                    placeholder="Enter privacy policy content here..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Use the rich text editor toolbar for formatting. Supports headings, lists, bold, italic, links, and more.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Terms of Service Tab */}
          <TabsContent value="terms" className="space-y-6">
            {/* Info Box */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Scale className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">HTML Content Editor</p>
                  <p className="text-xs text-amber-800 mt-1">
                    Enter HTML content for your Terms of Service. The last updated date will be automatically set when you save changes.
                  </p>
                </div>
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Terms of Service</CardTitle>
                <p className="text-sm text-gray-500">
                  Last updated: {termsOfService.last_updated_date ? new Date(termsOfService.last_updated_date).toLocaleDateString() : 'Never'}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={termsOfService.title || ''}
                    onChange={(e) => updateField('terms_of_service', 'title', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={termsOfService.description || ''}
                    onChange={(e) => updateField('terms_of_service', 'description', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Content (Rich Text)</Label>
                  <RichTextEditor
                    value={termsOfService.content || ''}
                    onChange={(value) => updateField('terms_of_service', 'content', value)}
                    placeholder="Enter terms of service content here..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Use the rich text editor toolbar for formatting. Supports headings, lists, bold, italic, links, and more.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
