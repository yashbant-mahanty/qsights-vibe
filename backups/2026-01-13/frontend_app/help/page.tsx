"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HelpCircle,
  Search,
  Book,
  MessageCircle,
  Mail,
  Phone,
  FileText,
  Video,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Send,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

export default function HelpSupportPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({
    subject: "",
    message: "",
    priority: "medium",
  });
  const [sending, setSending] = useState(false);

  const faqs = [
    {
      question: "How do I create a new activity?",
      answer:
        "Navigate to the Activities page, click on 'Create Activity', fill in the required details including activity name, type, dates, and assign a questionnaire. You can also configure registration forms and multilingual options.",
    },
    {
      question: "How can I add participants to an activity?",
      answer:
        "Go to Participants page and click 'Add Participant'. You can also import participants in bulk using CSV files. Participants will receive email invitations with unique access links.",
    },
    {
      question: "What types of questions can I add to a questionnaire?",
      answer:
        "QSights supports multiple question types: Multiple Choice, Multi-Select, Text Input, Slider (numerical range), Rating Scale, and Matrix questions. Each type can be customized with various settings.",
    },
    {
      question: "How do I send notifications to participants?",
      answer:
        "Open any activity and go to the Notifications tab. You can send individual emails or bulk emails to multiple participants. Choose the notification type (invitation, reminder, thank you) and select participants.",
    },
    {
      question: "Can I export survey results?",
      answer:
        "Yes! Navigate to the Reports page, select your activity, and you can export results in various formats including CSV, Excel, and PDF. You can also view detailed analytics and visualizations.",
    },
    {
      question: "How do I manage user roles and permissions?",
      answer:
        "User roles are managed at the organization level. Roles include Super Admin, Administrator, Program Manager, Program Moderator, Group Head, and Participants. Each role has specific permissions and access levels.",
    },
    {
      question: "What is the difference between Survey, Poll, and Assessment?",
      answer:
        "Surveys collect detailed feedback with multiple sections and question types. Polls are quick, single-question responses. Assessments evaluate knowledge or skills with scoring and correct answers.",
    },
    {
      question: "How do I enable anonymous access for an activity?",
      answer:
        "When creating or editing an activity, enable the 'Allow Anonymous Access' option. This generates a public link that anyone can use to participate without creating an account.",
    },
  ];

  const resources = [
    {
      icon: Book,
      title: "User Guide",
      description: "Complete documentation for all features",
      link: "#",
    },
    {
      icon: Video,
      title: "Video Tutorials",
      description: "Step-by-step video guides",
      link: "#",
    },
    {
      icon: FileText,
      title: "API Documentation",
      description: "For developers and integrations",
      link: "#",
    },
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleSendMessage() {
    if (!contactForm.subject || !contactForm.message) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "error",
      });
      return;
    }

    try {
      setSending(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast({
        title: "Success!",
        description: "Your message has been sent. We'll get back to you within 24 hours.",
        variant: "success",
      });

      setContactForm({
        subject: "",
        message: "",
        priority: "medium",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "error",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <RoleBasedLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
            <p className="text-sm text-gray-600">Find answers and get assistance</p>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help articles, FAQs, or features..."
                className="pl-12 h-12 text-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Contact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Email Support</h3>
              <p className="text-sm text-gray-600 mt-1">support@qsights.com</p>
              <p className="text-xs text-gray-500 mt-2">Response within 24 hours</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Live Chat</h3>
              <p className="text-sm text-gray-600 mt-1">Chat with our team</p>
              <p className="text-xs text-gray-500 mt-2">Available 9 AM - 6 PM EST</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Phone className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Phone Support</h3>
              <p className="text-sm text-gray-600 mt-1">+1 (555) 123-4567</p>
              <p className="text-xs text-gray-500 mt-2">Mon-Fri, 9 AM - 6 PM EST</p>
            </CardContent>
          </Card>
        </div>

        {/* Resources */}
        <Card>
          <CardHeader>
            <CardTitle>Learning Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {resources.map((resource, index) => {
                const Icon = resource.icon;
                return (
                  <a
                    key={index}
                    href={resource.link}
                    className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                  >
                    <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                      <Icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{resource.title}</h4>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* FAQs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredFaqs.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No FAQs found matching your search.
                </p>
              ) : (
                filteredFaqs.map((faq, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-900">{faq.question}</span>
                      {expandedFaq === index ? (
                        <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    {expandedFaq === index && (
                      <div className="px-4 pb-4 text-gray-600 text-sm">{faq.answer}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle>Send us a Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={contactForm.subject}
                onChange={(e) =>
                  setContactForm({ ...contactForm, subject: e.target.value })
                }
                placeholder="Brief description of your issue"
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={contactForm.priority}
                onChange={(e) =>
                  setContactForm({ ...contactForm, priority: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low - General inquiry</option>
                <option value="medium">Medium - Need assistance</option>
                <option value="high">High - Urgent issue</option>
              </select>
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <textarea
                id="message"
                value={contactForm.message}
                onChange={(e) =>
                  setContactForm({ ...contactForm, message: e.target.value })
                }
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Please provide as much detail as possible about your question or issue..."
              />
            </div>

            <button
              onClick={handleSendMessage}
              disabled={sending || !contactForm.subject || !contactForm.message}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              {sending ? "Sending..." : "Send Message"}
            </button>
          </CardContent>
        </Card>
      </div>
    </RoleBasedLayout>
  );
}
