"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { themeApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/toast";
import {
  ClipboardList,
  BarChart3,
  FileText,
  Mail,
  PieChart,
  Award,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Shield,
  Zap,
  Users,
  TrendingUp,
} from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Survey",
    description: "Create comprehensive surveys with advanced logic and branching",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    icon: BarChart3,
    title: "Poll",
    description: "Quick polls to gather instant feedback from your audience",
    gradient: "from-purple-500 to-purple-600",
  },
  {
    icon: FileText,
    title: "Assessment",
    description: "Build assessments with automatic scoring and analytics",
    gradient: "from-green-500 to-green-600",
  },
  {
    icon: Mail,
    title: "Emailer/Reminder",
    description: "Automated email campaigns and reminder notifications",
    gradient: "from-orange-500 to-orange-600",
  },
  {
    icon: PieChart,
    title: "Reports",
    description: "Detailed analytics and customizable reporting dashboards",
    gradient: "from-pink-500 to-pink-600",
  },
  {
    icon: Award,
    title: "Brand Reinforcement",
    description: "Strengthen your brand identity across all touchpoints",
    gradient: "from-indigo-500 to-indigo-600",
  },
];

const benefits = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Deploy surveys in minutes, not hours",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level encryption & compliance",
  },
  {
    icon: Users,
    title: "Unlimited Scale",
    description: "From 10 to 10,000+ respondents",
  },
  {
    icon: TrendingUp,
    title: "Real-time Analytics",
    description: "Live insights as responses come in",
  },
];

const certificates = [
  { name: "ISO 9001", icon: Award },
  { name: "ISO 27001", icon: Shield },
  { name: "GDPR Compliant", icon: CheckCircle2 },
];

export default function LandingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [themeSettings, setThemeSettings] = useState<any>({});

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await themeApi.getAll();
        setThemeSettings(settings);
        const logo = settings?.branding?.logo?.value;
        if (logo) {
          setLogoUrl(logo);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }
    loadSettings();
  }, []);

  const { refreshUser } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || data.message || "Login failed";
        setError(errorMessage);
        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "error",
        });
        setIsLoading(false);
        return;
      }

      // Refresh AuthContext before redirect to ensure correct role detection
      await refreshUser();

      // Redirect to role-specific dashboard
      router.push(data.redirectUrl);
    } catch (err) {
      const errorMessage = "An error occurred. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "error",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              {logoUrl ? (
                <img src={logoUrl} alt="QSights Logo" className="h-8 object-contain" />
              ) : (
                <h1 className="text-2xl font-bold text-qsights-blue">QSights</h1>
              )}
            </div>

            {/* Navigation Menu */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-600 hover:text-qsights-blue transition-colors font-light">
                Home
              </a>
              <a href="#" className="text-gray-600 hover:text-qsights-blue transition-colors font-light">
                The solution
              </a>
              <a href="#" className="text-gray-600 hover:text-qsights-blue transition-colors font-light">
                Pricing
              </a>
              <Link href="/contact-us" className="text-gray-600 hover:text-qsights-blue transition-colors font-light">
                Contact us
              </Link>
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <Link href="/contact-us">
                <Button
                  variant="outline"
                  className="hidden md:flex items-center space-x-2 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                >
                  <Mail className="w-4 h-4" />
                  <span>Contact us</span>
                </Button>
              </Link>
              <Button className="hidden md:flex bg-qsights-blue hover:bg-qsights-blue-dark text-white">
                <span className="mr-2">→</span>
                Sign in
              </Button>
              
              {/* Mobile Menu Button */}
              <button
                onClick={() => {
                  const menu = document.getElementById('mobile-menu');
                  menu?.classList.toggle('hidden');
                }}
                className="md:hidden p-2 text-gray-700 hover:text-qsights-blue focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <div id="mobile-menu" className="hidden md:hidden border-t border-gray-200">
            <div className="px-6 py-4 space-y-3">
              <a href="#" className="block text-gray-600 hover:text-qsights-blue py-2 transition-colors font-light">
                Home
              </a>
              <a href="#" className="block text-gray-600 hover:text-qsights-blue py-2 transition-colors font-light">
                The solution
              </a>
              <a href="#" className="block text-gray-600 hover:text-qsights-blue py-2 transition-colors font-light">
                Pricing
              </a>
              <Link href="/contact-us" className="block text-gray-600 hover:text-qsights-blue py-2 transition-colors font-light">
                Contact us
              </Link>
              <div className="pt-3 space-y-2">
                <Link href="/contact-us" className="block">
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center space-x-2 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Contact us</span>
                  </Button>
                </Link>
                <Button className="w-full bg-qsights-blue hover:bg-qsights-blue-dark text-white">
                  <span className="mr-2">→</span>
                  Sign in
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-0 pt-16">
        <div className="grid lg:grid-cols-2 gap-0 min-h-screen">
          {/* Left Column - Features */}
          <div className="bg-white p-6 lg:p-8 flex flex-col justify-between order-2 lg:order-1">
            {/* Tagline Only */}
            <div className="mb-6">
              <p className="text-gray-600 text-base">
                Professional Survey & Analytics Platform
              </p>
            </div>

            {/* Feature Cards */}
            <div className="flex-1 mb-6">
              <h2 className="text-xl font-semibold text-qsights-blue mb-4">
                Our Features
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {features.map((feature, index) => (
                  <Card
                    key={index}
                    className="hover:shadow-lg transition-all duration-300 border-2 hover:border-qsights-blue cursor-pointer group"
                  >
                    <CardContent className="p-4">
                      <div
                        className={`bg-gradient-to-br ${feature.gradient} w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                      >
                        <feature.icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-base font-semibold text-qsights-blue mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Certificates */}
            <div className="mt-auto">
              <h3 className="text-base font-semibold text-qsights-blue mb-3">
                Certifications & Compliance
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {certificates.map((cert, index) => (
                  <div
                    key={index}
                    className="bg-gray-100 rounded-lg p-3 flex items-center justify-center border-2 border-gray-200 hover:border-qsights-blue transition-colors"
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-1 shadow-sm">
                        <Award className="w-6 h-6 text-qsights-blue" />
                      </div>
                      <p className="text-[10px] font-medium text-gray-700">
                        {cert.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Login */}
          <div
            className="relative bg-qsights-blue p-6 lg:p-8 flex flex-col items-center justify-center overflow-y-auto order-1 lg:order-2"
            style={{
              backgroundImage:
                "url('data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" xmlns=\"http://www.w3.org/2000/svg\"/%3E')",
              backgroundSize: "cover",
            }}
          >
            {/* Sign up prompt */}
            <div className="absolute top-6 right-6 text-white text-sm z-10">
              Don't have an account?{" "}
              <a href="#" className="font-semibold underline hover:text-gray-200">
                Sign up now
              </a>
            </div>

            {/* Analytics Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white rounded-lg rotate-12"></div>
              <div className="absolute top-40 right-20 w-24 h-24 border-2 border-white rounded-full"></div>
              <div className="absolute bottom-32 left-20 w-40 h-40 border-2 border-white rounded-lg -rotate-6"></div>
              <div className="absolute bottom-20 right-10 w-20 h-20 border-2 border-white rounded-full"></div>
              
              {/* Graph lines */}
              <svg
                className="absolute inset-0 w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                <line
                  x1="10%"
                  y1="30%"
                  x2="40%"
                  y2="50%"
                  stroke="white"
                  strokeWidth="2"
                  opacity="0.3"
                />
                <line
                  x1="40%"
                  y1="50%"
                  x2="60%"
                  y2="35%"
                  stroke="white"
                  strokeWidth="2"
                  opacity="0.3"
                />
                <line
                  x1="60%"
                  y1="35%"
                  x2="90%"
                  y2="60%"
                  stroke="white"
                  strokeWidth="2"
                  opacity="0.3"
                />
                <circle cx="10%" cy="30%" r="4" fill="white" opacity="0.5" />
                <circle cx="40%" cy="50%" r="4" fill="white" opacity="0.5" />
                <circle cx="60%" cy="35%" r="4" fill="white" opacity="0.5" />
                <circle cx="90%" cy="60%" r="4" fill="white" opacity="0.5" />
              </svg>
            </div>

            {/* Login Card */}
            <Card className="w-full max-w-lg relative z-10 shadow-2xl my-auto">
              <CardContent className="p-6 lg:p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    Sign in
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Welcome back! Please enter your details
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="username" className="text-gray-700 font-medium text-sm">
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      className="w-full h-11"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-gray-700 font-medium text-sm">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password here"
                        className="w-full h-11 pr-12"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-qsights-blue"
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <a
                      href="#"
                      className="text-sm text-qsights-blue hover:underline font-medium"
                    >
                      Forgot password?
                    </a>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-qsights-blue hover:bg-qsights-blue-dark text-white h-11 text-base font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">→</span>
                        Sign in
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Footer Information */}
            <div className="mt-1 text-center relative z-10">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Link
                  href={themeSettings?.footer?.footer_terms_url?.value || '/terms-of-service'}
                  className="text-xs text-white/80 hover:text-white transition-colors"
                >
                  Terms & Conditions
                </Link>
                <span className="text-white/40">•</span>
                <Link
                  href={themeSettings?.footer?.footer_privacy_url?.value || '/privacy-policy'}
                  className="text-xs text-white/80 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
                <span className="text-white/40">•</span>
                <Link
                  href={themeSettings?.footer?.footer_contact_url?.value || '/contact-us'}
                  className="text-xs text-white/80 hover:text-white transition-colors"
                >
                  {themeSettings?.footer?.footer_contact_label?.value || 'Contact Us'}
                </Link>
              </div>
              <div className="text-white/70 text-xs mb-1">
                {themeSettings?.footer?.footer_text?.value || `QSights © ${new Date().getFullYear()}`}
              </div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-white/10 backdrop-blur-sm rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-white/80 font-medium">Version 2.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
