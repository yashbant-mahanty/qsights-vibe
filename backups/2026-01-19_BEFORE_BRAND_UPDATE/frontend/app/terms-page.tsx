"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cmsApi, themeApi } from "@/lib/api";
import { Scale, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TermsOfServiceContent {
  page_key: string;
  title: string;
  description: string;
  content: string;
  last_updated_date?: string;
}

export default function TermsOfServicePage() {
  const router = useRouter();
  const [content, setContent] = useState<TermsOfServiceContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadContent();
    loadLogo();
  }, []);

  async function loadLogo() {
    try {
      const settings = await themeApi.getAll();
      const logo = settings?.branding?.logo?.value;
      if (logo) setLogoUrl(logo);
    } catch (err) {
      console.error("Failed to load logo:", err);
    }
  }

  async function loadContent() {
    try {
      setLoading(true);
      setError(null);
      const data = await cmsApi.getByPageKey('terms_of_service');
      setContent(data);
    } catch (err) {
      console.error('Error loading terms of service:', err);
      setError('Failed to load terms of service. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-amber-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading Terms of Service...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-amber-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-12 text-center">
            <Scale className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Unable to Load Terms of Service
            </h1>
            <p className="text-gray-600 mb-6">
              {error || 'Terms of service content is not available at this time.'}
            </p>
            <Button onClick={() => router.push('/')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-amber-50">
      {/* Header */}
      <header className="bg-white/85 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            {logoUrl ? (
              <img src={logoUrl} alt="QSights Logo" className="h-10 object-contain" />
            ) : (
              <>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">Q</span>
                </div>
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  QSights
                </div>
              </>
            )}
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/">
              <Button
                variant="outline"
                className="h-10 rounded-xl border border-gray-200 text-gray-700 hover:text-blue-700 hover:border-blue-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Main Content Card */}
        <Card className="shadow-xl">
          <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-blue-50">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Scale className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold text-gray-900">
                  {content.title || 'Terms of Service'}
                </CardTitle>
                {content.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {content.description}
                  </p>
                )}
              </div>
            </div>
            {content.last_updated_date && (
              <p className="text-sm text-gray-500 mt-3">
                Last updated: {new Date(content.last_updated_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
          </CardHeader>
          
          <CardContent className="p-8">
            {content.content ? (
              <div 
                className="prose prose-sm max-w-none
                  prose-headings:text-gray-900 prose-headings:font-bold
                  prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-6
                  prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-5
                  prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4
                  prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
                  prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                  prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
                  prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
                  prose-li:text-gray-700 prose-li:mb-2
                  prose-strong:text-gray-900 prose-strong:font-semibold
                  prose-em:text-gray-800
                  prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                  prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-lg
                  prose-blockquote:border-l-4 prose-blockquote:border-amber-500 prose-blockquote:pl-4 prose-blockquote:italic"
                dangerouslySetInnerHTML={{ __html: content.content }}
              />
            ) : (
              <div className="text-center py-12">
                <Scale className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  Terms of service content is currently being prepared.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            If you have any questions about our terms of service, please{' '}
            <button
              onClick={() => router.push('/contact-sales')}
              className="text-blue-600 hover:underline font-medium"
            >
              contact us
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
