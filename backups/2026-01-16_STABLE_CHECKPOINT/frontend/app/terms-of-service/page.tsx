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
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('qsights_logo') || null;
    }
    return null;
  });

  useEffect(() => {
    loadContent();
    loadLogo();
  }, []);

  async function loadLogo() {
    try {
      const settings = await themeApi.getAll();
      const logo = settings?.branding?.logo?.value;
      if (logo) {
        setLogoUrl(logo);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('qsights_logo', logo);
        }
      }
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
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt="QSights Logo" 
                className="h-10 object-contain" 
              />
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

      <div className="max-w-5xl mx-auto p-6 py-12">
        {/* Main Content Card */}
        <Card className="shadow-2xl border-0">
          <CardHeader className="border-b bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 p-8">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-gradient-to-br from-amber-600 to-orange-600 rounded-xl shadow-lg">
                <Scale className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-4xl font-extrabold text-gray-900 tracking-tight">
                  {content.title || 'Terms of Service'}
                </CardTitle>
                {content.description && (
                  <p className="text-base text-gray-600 mt-2 font-medium">
                    {content.description}
                  </p>
                )}
              </div>
            </div>
            {content.last_updated_date && (
              <div className="mt-4 pt-4 border-t border-amber-100">
                <p className="text-sm text-gray-300 font-medium">
                  <span className="text-gray-200">Last updated:</span>{' '}
                  <span className="text-gray-300">
                    {new Date(content.last_updated_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </p>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="p-10 bg-white">
            {content.content ? (
              <div 
                className="
                  prose prose-lg max-w-none
                  
                  prose-headings:scroll-mt-20
                  
                  prose-h1:text-3xl prose-h1:font-extrabold prose-h1:text-gray-900 
                  prose-h1:mb-8 prose-h1:mt-12 prose-h1:pb-4 prose-h1:border-b-2 
                  prose-h1:border-amber-200
                  
                  prose-h2:text-3xl prose-h2:font-extrabold prose-h2:text-gray-900 
                  prose-h2:mb-6 prose-h2:mt-12 prose-h2:pb-3
                  prose-h2:border-b prose-h2:border-gray-200
                  
                  prose-h3:text-xl prose-h3:font-semibold prose-h3:text-gray-900 
                  prose-h3:mb-4 prose-h3:mt-8
                  
                  prose-h4:text-lg prose-h4:font-semibold prose-h4:text-gray-800 
                  prose-h4:mb-3 prose-h4:mt-6
                  
                  prose-p:text-gray-700 prose-p:leading-loose prose-p:mb-6 
                  prose-p:text-base prose-p:tracking-wide
                  
                  prose-a:text-amber-600 prose-a:font-medium prose-a:no-underline 
                  hover:prose-a:text-amber-700 hover:prose-a:underline 
                  prose-a:transition-colors
                  
                  prose-ul:my-8 prose-ul:space-y-3
                  prose-ol:my-8 prose-ol:space-y-3
                  
                  prose-li:text-gray-700 prose-li:leading-loose 
                  prose-li:pl-3 prose-li:text-base prose-li:mb-3
                  prose-li:marker:text-amber-600 prose-li:marker:font-bold
                  
                  prose-ul:list-disc prose-ul:pl-8 
                  prose-ul:ml-0
                  
                  prose-ol:list-decimal prose-ol:pl-8
                  prose-ol:ml-0
                  
                  prose-strong:text-gray-900 prose-strong:font-bold
                  prose-em:text-gray-800 prose-em:italic
                  
                  prose-blockquote:border-l-4 prose-blockquote:border-amber-500 
                  prose-blockquote:pl-6 prose-blockquote:italic 
                  prose-blockquote:text-gray-700 prose-blockquote:bg-amber-50 
                  prose-blockquote:py-4 prose-blockquote:my-6
                  prose-blockquote:rounded-r-lg
                  
                  prose-code:bg-gray-100 prose-code:text-gray-800 
                  prose-code:px-2 prose-code:py-1 prose-code:rounded 
                  prose-code:text-sm prose-code:font-mono prose-code:font-semibold
                  prose-code:before:content-[''] prose-code:after:content-['']
                  
                  prose-pre:bg-gray-900 prose-pre:text-gray-100 
                  prose-pre:p-6 prose-pre:rounded-xl prose-pre:overflow-x-auto
                  prose-pre:shadow-lg prose-pre:my-6
                  
                  prose-table:w-full prose-table:border-collapse 
                  prose-table:my-6
                  prose-thead:bg-gray-50 prose-thead:border-b-2 
                  prose-thead:border-gray-300
                  prose-th:text-left prose-th:p-3 prose-th:font-semibold 
                  prose-th:text-gray-900
                  prose-td:p-3 prose-td:border-b prose-td:border-gray-200
                  prose-tr:hover:bg-gray-50 prose-tr:transition-colors
                  
                  prose-hr:my-8 prose-hr:border-gray-300
                  
                  prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8
                  
                  [&_ul_ul]:mt-3 [&_ul_ul]:mb-2 [&_ul_ul]:space-y-2
                  [&_ol_ol]:mt-3 [&_ol_ol]:mb-2 [&_ol_ol]:space-y-2
                  [&_ul_li]:mb-3
                  [&_ol_li]:mb-3
                  [&_li_p]:mb-2 [&_li_p]:mt-1
                "
                dangerouslySetInnerHTML={{ __html: content.content }}
              />
            ) : (
              <div className="text-center py-16">
                <Scale className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  Terms of service content is currently being prepared.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="mt-8 text-center bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm">
          <p className="text-gray-600 text-base">
            If you have any questions about our terms of service, please{' '}
            <button
              onClick={() => router.push('/contact-sales')}
              className="text-amber-600 hover:text-amber-700 underline font-semibold transition-colors"
            >
              contact us
            </button>.
          </p>
        </div>
      </div>
    </div>
  );
}
