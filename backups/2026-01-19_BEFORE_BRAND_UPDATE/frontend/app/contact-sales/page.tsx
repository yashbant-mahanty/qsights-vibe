"use client";

import React, { useState, useEffect } from "react";
import { contactSalesApi, cmsApi } from "@/lib/api";
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
  Users,
  MessageSquare,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Sparkles,
  DollarSign,
  Calendar,
  FileText,
  Headphones,
  MapPin,
  Clock,
} from "lucide-react";
import Link from "next/link";

export default function ContactSalesPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    companySize: "",
    role: "",
    interest: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [cmsContent, setCmsContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      try {
        const content = await cmsApi.getByPageKey('contact_sales');
        setCmsContent(content);
      } catch (error) {
        console.error('Error loading CMS content:', error);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await contactSalesApi.submit(formData);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting contact sales request:', error);
      const errorMsg = cmsContent?.messages?.error || {};
      toast({
        title: errorMsg.title || "Submission Failed",
        description: errorMsg.description || "Failed to submit request. Please try again.",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const successMsg = cmsContent?.messages?.success || {};
  const pageTitle = cmsContent?.title || "Get in Touch With Our Sales Team";
  const pageDesc = cmsContent?.description || "Have questions about QSights? Our sales team is here to help.";
  const ctaText = cmsContent?.cta_text || "Submit Request";
  const formFields = cmsContent?.form_fields || {};

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl border-2 border-green-200">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              {successMsg.title || "Message Sent!"}
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {successMsg.description || "Thank you for contacting QSights Sales. A member of our team will reach out to you within 24 hours."}
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
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">Q</span>
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                QSights
              </div>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="text-gray-600 hover:text-blue-600">
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
                  Let's Talk Business
                </span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4">
                {pageTitle.includes('With') ? (
                  <>
                    {pageTitle.split('With')[0]}
                    <span className="block mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      With {pageTitle.split('With')[1]}
                    </span>
                  </>
                ) : (
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {pageTitle}
                  </span>
                )}
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                {pageDesc}
              </p>
            </div>

            {/* How We Can Help */}
            <Card className="border-2 border-blue-100 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  How We Can Help
                </h3>
                <ul className="space-y-3">
                  {[
                    { icon: DollarSign, text: "Custom pricing and enterprise plans" },
                    { icon: Users, text: "Team training and onboarding" },
                    { icon: FileText, text: "Custom contract and compliance" },
                    { icon: Headphones, text: "Dedicated support options" },
                    { icon: Calendar, text: "Implementation and migration" },
                  ].map((item, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-700 pt-1">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <div className="grid grid-cols-1 gap-4">
              <Card className="border border-gray-200 hover:border-blue-300 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Email Us</h4>
                      <p className="text-sm text-gray-600 mb-2">Get in touch via email</p>
                      <a href="mailto:sales@qsights.com" className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
                        sales@qsights.com
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 hover:border-blue-300 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Call Us</h4>
                      <p className="text-sm text-gray-600 mb-2">Mon-Fri, 9AM-6PM EST</p>
                      <a href="tel:+1-800-QSIGHTS" className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
                        +1 (800) QSIGHTS
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 hover:border-blue-300 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Visit Us</h4>
                      <p className="text-sm text-gray-600">
                        123 Business Avenue<br />
                        San Francisco, CA 94102
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Response Time */}
            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <Clock className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Average Response Time: 4 hours</p>
                <p className="text-xs text-gray-600">We typically respond within one business day</p>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div>
            <Card className="shadow-2xl border-2 border-gray-200">
              <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 text-white">
                <Mail className="w-8 h-8 mb-3" />
                <h2 className="text-2xl font-bold mb-2">Send Us a Message</h2>
                <p className="text-blue-100 text-sm">
                  Fill out the form and we'll get back to you soon
                </p>
              </div>

              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-gray-700 font-semibold">
                        First Name *
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="firstName"
                          name="firstName"
                          type="text"
                          placeholder="John"
                          className="h-12 pl-10 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-gray-700 font-semibold">
                        Last Name *
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="lastName"
                          name="lastName"
                          type="text"
                          placeholder="Doe"
                          className="h-12 pl-10 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                          value={formData.lastName}
                          onChange={handleChange}
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-semibold">
                      Work Email *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@company.com"
                        className="h-12 pl-10 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={isSubmitting}
                      />
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

                  <div className="space-y-2">
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
                        value={formData.company}
                        onChange={handleChange}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
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
                        required
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

                  <div className="space-y-2">
                    <Label htmlFor="interest" className="text-gray-700 font-semibold">
                      I'm interested in *
                    </Label>
                    <select
                      id="interest"
                      name="interest"
                      className="h-12 w-full border-2 border-gray-200 focus:border-blue-500 rounded-xl bg-white text-gray-900 px-3"
                      value={formData.interest}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                    >
                      <option value="">Select an option</option>
                      <option value="enterprise">Enterprise Plan</option>
                      <option value="pricing">Custom Pricing</option>
                      <option value="migration">Migration Support</option>
                      <option value="training">Team Training</option>
                      <option value="partnership">Partnership Opportunities</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-gray-700 font-semibold">
                      Your Message *
                    </Label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <textarea
                        id="message"
                        name="message"
                        rows={4}
                        placeholder="Tell us about your requirements..."
                        className="w-full pl-10 pt-3 pb-3 pr-3 border-2 border-gray-200 focus:border-blue-500 rounded-xl resize-none"
                        value={formData.message}
                        onChange={handleChange}
                        required
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
                        Sending...
                      </>
                    ) : (
                      <>
                        {ctaText}
                        <Mail className="w-5 h-5 ml-2" />
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
