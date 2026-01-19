"use client";

import React, { useEffect, useState } from "react";
import { demoRequestsApi, themeApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  Mail,
  Phone,
  Building2,
  User,
  MapPin,
  MessageSquare,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Send,
  Sparkles,
  Calendar,
  Users,
} from "lucide-react";
import Link from "next/link";

export default function RequestDemoPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadLogo() {
      try {
        const settings = await themeApi.getAll();
        const logo = settings?.branding?.logo?.value;
        if (logo) setLogoUrl(logo);
      } catch (err) {
        console.error("Failed to load logo:", err);
      }
    }
    loadLogo();
  }, []);

  function validate() {
    const newErrors: any = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.country.trim()) {
      newErrors.country = 'Country is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await demoRequestsApi.submit(formData);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting demo request:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit request. Please try again.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl border-2 border-green-200">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Request Received!
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Thank you for your interest in QSights. Our team will contact you within 24 hours to schedule your personalized demo.
            </p>
            <div className="space-y-3">
              <Link href="/">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold h-12 rounded-xl">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
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

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Left Column - Info */}
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full mb-4">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">
                  Get Started Today
                </span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4">
                Request a
                <span className="block mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Personalized Demo
                </span>
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                See how QSights can transform your survey and analytics workflow. 
                Our experts will show you features tailored to your needs.
              </p>
            </div>

            {/* What to Expect */}
            <Card className="border-2 border-blue-100 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  What to Expect
                </h3>
                <ul className="space-y-3">
                  {[
                    "30-minute personalized walkthrough",
                    "Live Q&A with our product experts",
                    "Custom use case demonstrations",
                    "Pricing and plan recommendations",
                    "Free trial setup assistance",
                  ].map((item, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Trust Indicators */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border border-gray-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">10K+</div>
                  <div className="text-xs text-gray-600">Happy Users</div>
                </CardContent>
              </Card>
              <Card className="border border-gray-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">50M+</div>
                  <div className="text-xs text-gray-600">Responses</div>
                </CardContent>
              </Card>
              <Card className="border border-gray-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">99.9%</div>
                  <div className="text-xs text-gray-600">Uptime</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Form */}
          <div>
            <Card className="shadow-2xl border-2 border-gray-200">
              <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 text-white">
                <Calendar className="w-8 h-8 mb-3" />
                <h2 className="text-2xl font-bold mb-2">Schedule Your Demo</h2>
                <p className="text-blue-100 text-sm">
                  Fill out the form below and we&apos;ll be in touch shortly
                </p>
              </div>

              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Name Field */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700 font-semibold">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="John Doe"
                        className={`h-12 pl-10 border-2 ${errors.name ? 'border-red-300' : 'border-gray-200'} focus:border-blue-500 rounded-xl`}
                        value={formData.name}
                        onChange={handleChange}
                        required
                        disabled={isSubmitting}
                      />
                      {errors.name && (
                        <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-semibold">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@company.com"
                        className={`h-12 pl-10 border-2 ${errors.email ? 'border-red-300' : 'border-gray-200'} focus:border-blue-500 rounded-xl`}
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={isSubmitting}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-700 font-semibold">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        className="h-12 pl-10 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Country & City */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-gray-700 font-semibold">
                        Country <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="country"
                          name="country"
                          type="text"
                          placeholder="United States"
                          className={`h-12 pl-10 border-2 ${errors.country ? 'border-red-300' : 'border-gray-200'} focus:border-blue-500 rounded-xl`}
                          value={formData.country}
                          onChange={handleChange}
                          required
                          disabled={isSubmitting}
                        />
                        {errors.country && (
                          <p className="text-sm text-red-500 mt-1">{errors.country}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-gray-700 font-semibold">
                        City <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="city"
                          name="city"
                          type="text"
                          placeholder="New York"
                          className={`h-12 pl-10 border-2 ${errors.city ? 'border-red-300' : 'border-gray-200'} focus:border-blue-500 rounded-xl`}
                          value={formData.city}
                          onChange={handleChange}
                          required
                          disabled={isSubmitting}
                        />
                        {errors.city && (
                          <p className="text-sm text-red-500 mt-1">{errors.city}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 hidden">
                    <Label htmlFor="company" className="text-gray-700 font-semibold">
                      Company Name *
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="company"
                        name="company"
                        type="text"
                        placeholder="Your Company Inc."
                        className="h-12 pl-10 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                        value={formData.country}
                        onChange={handleChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 hidden">
                    <Label htmlFor="companySize" className="text-gray-700 font-semibold">
                      Company Size *
                    </Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        id="companySize"
                        name="companySize"
                        className="h-12 pl-10 w-full border-2 border-gray-200 focus:border-blue-500 rounded-xl bg-white text-gray-900"
                        value={formData.companySize}
                        onChange={handleChange}
                        disabled={isSubmitting}
                      >
                        <option value="">Select company size</option>
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-500">201-500 employees</option>
                        <option value="501-1000">501-1000 employees</option>
                        <option value="1000+">1000+ employees</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 hidden">
                    <Label htmlFor="role" className="text-gray-700 font-semibold">
                      Your Role *
                    </Label>
                    <Input
                      id="role"
                      name="role"
                      type="text"
                      placeholder="e.g., Marketing Manager"
                      className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                      value={formData.message}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-gray-700 font-semibold">
                      Tell us about your needs (Optional)
                    </Label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <textarea
                        id="message"
                        name="message"
                        rows={4}
                        placeholder="What challenges are you looking to solve?"
                        className="w-full pl-10 pt-3 pb-3 pr-3 border-2 border-gray-200 focus:border-blue-500 rounded-xl resize-none"
                        value={formData.message}
                        onChange={handleChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Request Demo
                        <Calendar className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    By submitting this form, you agree to our{' '}
                    <a href="/terms-of-service" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                      Terms of Service
                    </a>
                    {' '}and{' '}
                    <a href="/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                      Privacy Policy
                    </a>
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
