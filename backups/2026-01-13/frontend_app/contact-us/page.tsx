"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageSquare, User, ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { themeApi } from "@/lib/api";
import Link from "next/link";

export default function ContactUsPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('qsights_logo') || null;
    }
    return null;
  });

  useEffect(() => {
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://43.205.98.45/api'}/contact-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit request');
      }

      // Show success state without redirect
      setShowSuccess(true);
      setFormData({ name: "", email: "", message: "" });

      // Also show toast
      toast({
        title: "Request Received!",
        description: "Our team will contact you shortly.",
        variant: "success",
      });

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);

    } catch (err) {
      console.error('Error submitting contact request:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to submit request. Please try again.',
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Message */}
        {showSuccess && (
          <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Request Received!
              </h2>
              <p className="text-lg text-gray-600 max-w-md">
                Thank you for reaching out. Our team will contact you within 24 hours.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-2">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Get in Touch</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      We'd love to hear from you. Send us a message!
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <User className="w-4 h-4 text-blue-600" />
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Mail className="w-4 h-4 text-blue-600" />
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="your@email.com"
                      required
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      Your Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={6}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="Tell us how we can help you..."
                      required
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-base font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card className="shadow-lg border-2">
              <CardHeader className="bg-gradient-to-br from-purple-50 to-blue-50">
                <CardTitle className="text-lg">Why Contact Us?</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Quick Response</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      We typically respond within 24 hours
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Expert Support</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Get help from our experienced team
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Personalized Solutions</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Tailored assistance for your needs
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-2 bg-gradient-to-br from-blue-50 to-purple-50">
              <CardContent className="p-6 text-center">
                <Mail className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">Email Us Directly</h3>
                <a
                  href="mailto:support@qsights.com"
                  className="text-blue-600 hover:text-blue-700 font-semibold underline"
                >
                  support@qsights.com
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
