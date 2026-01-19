"use client";

import React, { useEffect, useState } from "react";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { landingPagesApi } from "@/lib/api";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  Save,
  X,
  MoveUp,
  MoveDown,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

export default function LandingPagesManagement() {
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const defaultPages = ['home', 'features', 'benefits', 'compliance'];

  useEffect(() => {
    loadPages();
  }, []);

  async function loadPages() {
    try {
      setLoading(true);
      const data = await landingPagesApi.getAll();
      setPages(data);
      
      // Initialize default pages if they don't exist
      for (const slug of defaultPages) {
        if (!data.find((p: any) => p.slug === slug)) {
          await createDefaultPage(slug);
        }
      }
      
      // Reload after initialization
      const updatedData = await landingPagesApi.getAll();
      setPages(updatedData);
    } catch (error) {
      console.error('Error loading pages:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createDefaultPage(slug: string) {
    const titles: any = {
      'home': 'Home',
      'features': 'Features',
      'benefits': 'Benefits',
      'compliance': 'Compliance',
    };

    const defaultContent: any = {
      'home': {
        hero: {
          title: 'Welcome to QSights',
          subtitle: 'Powerful survey and assessment platform',
          cta: 'Get Started',
        },
      },
      'features': {
        title: 'Our Features',
        items: [
          'Multi-language support',
          'Real-time analytics',
          'Custom branding',
          'Mobile-responsive',
        ],
      },
      'benefits': {
        title: 'Why Choose QSights',
        items: [
          'Easy to use',
          'Secure and compliant',
          'Scalable solution',
          'Expert support',
        ],
      },
      'compliance': {
        title: 'Security & Compliance',
        content: 'We take security and compliance seriously...',
      },
    };

    try {
      await landingPagesApi.create({
        slug,
        title: titles[slug] || slug,
        content: defaultContent[slug] || {},
        is_active: true,
        sort_order: defaultPages.indexOf(slug),
      });
    } catch (error) {
      console.error(`Error creating default page ${slug}:`, error);
    }
  }

  function handleEdit(page: any) {
    setSelectedPage(page);
    setFormData({
      title: page.title,
      content: JSON.stringify(page.content || {}, null, 2),
      is_active: page.is_active,
    });
    setIsEditing(true);
  }

  async function handleSave() {
    try {
      let content;
      try {
        content = JSON.parse(formData.content);
      } catch {
        toast({
          title: "Validation Error",
          description: "Invalid JSON in content field",
          variant: "warning",
        });
        return;
      }

      await landingPagesApi.update(selectedPage.id, {
        title: formData.title,
        content,
        is_active: formData.is_active,
      });

      toast({
        title: "Success!",
        description: "Page updated successfully!",
        variant: "success",
      });
      setIsEditing(false);
      setSelectedPage(null);
      loadPages();
    } catch (error) {
      console.error('Error saving page:', error);
      toast({
        title: "Error",
        description: "Failed to save page",
        variant: "error",
      });
    }
  }

  async function handleDelete(page: any) {
    if (!confirm(`Are you sure you want to delete "${page.title}"?`)) return;

    try {
      await landingPagesApi.delete(page.id);
      toast({
        title: "Success!",
        description: "Page deleted successfully!",
        variant: "success",
      });
      loadPages();
    } catch (error) {
      console.error('Error deleting page:', error);
      toast({
        title: "Error",
        description: "Failed to delete page",
        variant: "error",
      });
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-blue"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Landing Pages</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage content for your public landing pages
            </p>
          </div>
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Eye className="w-4 h-4" />
            View Live Site
          </a>
        </div>

        {!isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pages.map((page) => (
              <Card key={page.id}>
                <CardHeader className="border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-qsights-blue" />
                      {page.title}
                    </CardTitle>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        page.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {page.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">
                        <strong>Slug:</strong> /{page.slug}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        <strong>Sections:</strong> {page.sections?.length || 0}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(page)}
                        className="flex-1 px-4 py-2 text-sm bg-qsights-blue text-white rounded-lg hover:bg-qsights-blue/90"
                      >
                        <Edit className="w-4 h-4 inline mr-2" />
                        Edit
                      </button>
                      {!defaultPages.includes(page.slug) && (
                        <button
                          onClick={() => handleDelete(page)}
                          className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle>Edit Page: {selectedPage.title}</CardTitle>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedPage(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content (JSON)
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Enter valid JSON for page content structure
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-qsights-blue focus:ring-qsights-blue"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Active (Visible on website)
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    className="flex-1 px-4 py-2 bg-qsights-blue text-white rounded-lg hover:bg-qsights-blue/90"
                  >
                    <Save className="w-4 h-4 inline mr-2" />
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedPage(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
