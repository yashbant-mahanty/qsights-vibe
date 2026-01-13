"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { themeApi } from "@/lib/api";
import { getRedirectUrl } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/toast";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	ClipboardList,
	BarChart3,
	FileText,
	Mail,
	PieChart,
	Shield,
	Users,
	TrendingUp,
	Zap,
	Award,
	CheckCircle2,
	Eye,
	EyeOff,
	Loader2,
	Lock,
	User,
} from "lucide-react";

const solutions = [
	{ icon: ClipboardList, title: "Survey", description: "Create comprehensive surveys with advanced logic and branching", gradient: "from-blue-500 to-blue-600" },
	{ icon: BarChart3, title: "Poll", description: "Quick polls to gather instant feedback from your audience", gradient: "from-purple-500 to-purple-600" },
	{ icon: FileText, title: "Assessment", description: "Build assessments with automatic scoring and analytics", gradient: "from-green-500 to-green-600" },
	{ icon: Mail, title: "Emailer/Reminder", description: "Automated email campaigns and reminder notifications", gradient: "from-orange-500 to-orange-600" },
	{ icon: PieChart, title: "Reports", description: "Detailed analytics and customizable reporting dashboards", gradient: "from-pink-500 to-pink-600" },
];

const benefits = [
	{ icon: Zap, title: "Lightning Fast", description: "Deploy surveys in minutes" },
	{ icon: Shield, title: "Enterprise Security", description: "Bank-level encryption" },
	{ icon: Users, title: "Unlimited Scale", description: "From 10 to 10,000+ users" },
	{ icon: TrendingUp, title: "Real-time Analytics", description: "Live insights dashboard" },
];

const certificates = [
	{ name: "ISO 9001", icon: Award },
	{ name: "ISO 27001", icon: Shield },
	{ name: "GDPR", icon: CheckCircle2 },
];

export default function LandingPage() {
	const router = useRouter();
	const { refreshUser } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [logoUrl, setLogoUrl] = useState<string | null>(() => {
		if (typeof window !== 'undefined') {
			return sessionStorage.getItem('qsights_logo') || null;
		}
		return null;
	});
	const [mounted, setMounted] = useState(false);
	const [themeSettings, setThemeSettings] = useState<any>({});

	useEffect(() => {
		setMounted(true);
		// Load from sessionStorage only on client after mount
		if (typeof window !== 'undefined') {
			const cachedLogo = sessionStorage.getItem('qsights_logo');
			if (cachedLogo) {
				setLogoUrl(cachedLogo);
			}
		}

		async function loadSettings() {
			try {
				const settings = await themeApi.getAll();
				setThemeSettings(settings);
				const logo = settings?.branding?.logo?.value;
				if (logo) {
					setLogoUrl(logo);
					// Cache the logo URL in sessionStorage
					if (typeof window !== 'undefined') {
						sessionStorage.setItem('qsights_logo', logo);
					}
				}
			} catch (err) {
				console.error("Failed to load settings:", err);
			}
		}
		loadSettings();
	}, []);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json", Accept: "application/json" },
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();

			if (!response.ok) {
				const errorMessage = data.error || data.message || "Login failed";
				setError(errorMessage);
				toast({ title: "Login Failed", description: errorMessage, variant: "error" });
				setIsLoading(false);
				return;
			}

			toast({ title: "Login Successful", description: "Redirecting to your dashboard...", variant: "success" });

			if (data.token) {
				const maxAge = 7 * 24 * 60 * 60;
				document.cookie = `backendToken=${encodeURIComponent(data.token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
			}

			await refreshUser();

			const redirectUrl =
				typeof data.redirectUrl === "string" && data.redirectUrl.trim()
					? data.redirectUrl
					: getRedirectUrl(data?.user?.role);

			setTimeout(() => {
				router.push(redirectUrl || "/dashboard");
			}, 500);
		} catch (err) {
			console.error("Login exception:", err);
			const errorMessage = "An error occurred. Please try again.";
			setError(errorMessage);
			toast({ title: "Error", description: errorMessage, variant: "error" });
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
			<header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
				<div className="container mx-auto px-6 py-4 flex items-center justify-between">
					<div className="flex items-center space-x-3">
						{logoUrl && (
							<img src={logoUrl} alt="QSights Logo" className="h-10 object-contain" />
						)}
					</div>

					<nav className="hidden md:flex items-center space-x-8">
						<a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Features</a>
						<a href="#benefits" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Benefits</a>
						<a href="#compliance" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Compliance</a>
					</nav>

					<div className="hidden md:block">
						<Link href="/request-demo">
							<Button variant="outline" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-medium">
								<Mail className="w-4 h-4 mr-2" />
								Request Demo
							</Button>
						</Link>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-6 py-12">
				<div className="grid md:grid-cols-2 gap-10 items-start">
					<div className="order-2 md:order-1 space-y-8">
						<div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
							<span className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
							Enterprise Survey Platform
						</div>
						<h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">Design, deploy, and analyze surveys in minutes</h1>
						<p className="text-lg text-gray-600 max-w-2xl">
							QSights brings creation, distribution, and analytics into one secure platform—built for product teams, researchers, and enterprise operations.
						</p>

						<div className="grid sm:grid-cols-2 gap-4" id="benefits">
							{benefits.map((item) => (
								<div key={item.title} className="flex items-start space-x-3 p-4 bg-white/80 rounded-xl shadow-sm">
									<div className="p-2 rounded-lg bg-blue-50 text-blue-600">
										<item.icon className="w-5 h-5" />
									</div>
									<div>
										<p className="font-semibold text-gray-900">{item.title}</p>
										<p className="text-sm text-gray-600">{item.description}</p>
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="order-1 md:order-2 relative">
						<div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-3xl blur opacity-60" aria-hidden />
						<Card className="relative shadow-2xl border-0 overflow-hidden rounded-3xl bg-white">
							<div className="bg-gradient-to-r from-blue-600 to-purple-500 text-white px-8 py-7">
								<div className="flex items-center gap-3">
									<Shield className="w-6 h-6" />
									<div>
										<p className="text-sm font-semibold">Secure Access</p>
										<h2 className="text-2xl font-bold">Sign in to QSights</h2>
									</div>
								</div>
								<p className="text-sm text-blue-50 mt-2">Use your email or username to continue.</p>
							</div>
							<CardContent className="p-8 space-y-6">
								<form className="space-y-5" onSubmit={handleLogin}>
									<div className="space-y-2">
										<Label htmlFor="email" className="text-sm font-semibold text-gray-900">Email / Username</Label>
										<div className="relative">
											<span className="absolute inset-y-0 left-4 flex items-center text-gray-400">
												<User className="w-4 h-4" />
											</span>
											<Input
												id="email"
												type="text"
												value={email}
												onChange={(e) => setEmail(e.target.value)}
												placeholder="Email or Username"
												required
												className="h-12 rounded-2xl border border-gray-200 bg-white pl-12 pr-4 text-gray-900 placeholder:text-gray-400"
											/>
										</div>
									</div>

									<div className="space-y-2">
									<Label htmlFor="password" className="text-sm font-semibold text-gray-900">Password</Label>
										<div className="relative">
											<span className="absolute inset-y-0 left-4 flex items-center text-gray-400">
												<Lock className="w-4 h-4" />
											</span>
											<Input
												id="password"
												type={showPassword ? "text" : "password"}
												value={password}
												onChange={(e) => setPassword(e.target.value)}
												placeholder="••••••••"
												required
												className="h-12 rounded-2xl border border-gray-200 bg-white pl-12 pr-12 text-gray-900 placeholder:text-gray-400"
											/>
											<button
												type="button"
												onClick={() => setShowPassword((prev) => !prev)}
												className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
												aria-label={showPassword ? "Hide password" : "Show password"}
											>
												{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
											</button>
										</div>
									</div>

									{error && <p className="text-sm text-red-600">{error}</p>}
								<div className="flex items-center justify-end mb-3">
									<Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
										Forgot Password?
									</Link>
								</div>
									<Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
										{isLoading ? (
											<span className="flex items-center justify-center gap-2">
												<Loader2 className="w-4 h-4 animate-spin" />
												Signing in...
											</span>
										) : (
											"Continue"
										)}
									</Button>
								</form>

								<div className="flex items-center justify-between text-xs text-gray-600">
									<Link href="/request-demo" className="hover:text-blue-700 font-semibold">Need a demo?</Link>
									<span>{themeSettings?.login_panel?.login_support_text?.value || 'Support: support@qsights.com'}</span>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>

				<section id="features" className="mt-16">
					<div className="flex items-center justify-between mb-6">
						<div>
							<p className="text-sm uppercase text-blue-600 font-semibold">Solutions</p>
							<h3 className="text-3xl font-bold text-gray-900">Everything you need to gather insights</h3>
						</div>
						<Link href="/request-demo">
							<Button variant="ghost" className="text-blue-600 hover:text-blue-700">
								Talk to sales
							</Button>
						</Link>
					</div>
					<div className="grid gap-6 md:grid-cols-3">
						{solutions.map((solution) => (
							<div
								key={solution.title}
								className="p-6 rounded-2xl shadow-sm bg-white/90 border border-gray-100 hover:shadow-md transition-shadow"
							>
								<div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${solution.gradient} flex items-center justify-center text-white shadow-lg mb-4`}>
									<solution.icon className="w-6 h-6" />
								</div>
								<h4 className="text-xl font-semibold text-gray-900 mb-2">{solution.title}</h4>
								<p className="text-sm text-gray-600 leading-relaxed">{solution.description}</p>
							</div>
						))}
					</div>
				</section>

				<section className="mt-16 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-10 text-white flex flex-col md:flex-row md:items-center md:justify-between shadow-lg">
					<div className="space-y-3">
						<p className="uppercase text-blue-100 text-sm tracking-wide">Analytics</p>
						<h3 className="text-3xl font-bold">Real-time dashboards, zero setup</h3>
						<p className="text-blue-100 max-w-2xl">
							Build once and track everything: response rates, completion times, funnels, and audience cohorts in a single unified view.
						</p>
					</div>
					<div className="mt-6 md:mt-0 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
						<Link href="/dashboard" className="sm:w-auto w-full">
							<Button className="w-full h-12 px-5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-sm">Go to dashboard</Button>
						</Link>
						<Link href="/request-demo" className="sm:w-auto w-full">
							<Button className="w-full h-12 px-5 rounded-xl bg-white/90 text-blue-800 border border-white/70 hover:bg-white font-semibold shadow-sm">
								See a live demo
							</Button>
						</Link>
					</div>
				</section>

				<section id="compliance" className="mt-16 grid md:grid-cols-2 gap-8 items-center">
					<div className="space-y-4">
						<p className="text-sm uppercase text-blue-600 font-semibold">Security & Compliance</p>
						<h3 className="text-3xl font-bold text-gray-900">Data you can trust</h3>
						<p className="text-gray-600">
							Role-based access, audit-ready logging, and secure delivery keep your responses protected. QSights is built for teams that need rigor and reliability.
						</p>
						<div className="flex flex-wrap gap-3">
							{certificates.map((cert) => (
								<span key={cert.name} className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/90 border border-gray-200 shadow-sm text-gray-800">
									<cert.icon className="w-4 h-4 text-blue-600" />
									<span className="text-sm font-medium">{cert.name}</span>
								</span>
							))}
						</div>
					</div>
					<div className="rounded-2xl border border-gray-100 bg-white/80 p-6 shadow-sm">
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<p className="text-gray-900 font-semibold">Status</p>
								<span className="text-green-600 text-sm font-semibold">Operational</span>
							</div>
							<div className="h-2 rounded-full bg-gray-100 overflow-hidden">
								<div className="h-full w-11/12 bg-gradient-to-r from-green-500 to-emerald-500" />
							</div>
							<ul className="text-sm text-gray-600 space-y-2">
								<li>• SSO and role-based permissions</li>
								<li>• Encrypted at rest and in transit</li>
								<li>• Region-aware data residency</li>
							</ul>
						</div>
					</div>
				</section>

				<section className="mt-16">
					<div className="rounded-2xl bg-white/90 border border-gray-100 p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
						<div className="space-y-2">
							<p className="text-sm uppercase text-blue-600 font-semibold">Get started</p>
							<h3 className="text-2xl font-bold text-gray-900">Launch your next survey with QSights</h3>
							<p className="text-gray-600">Try the platform or talk with our team to tailor QSights for your workflows.</p>
						</div>
						<div className="flex gap-3">
							<Link href="/request-demo">
								<Button className="font-semibold">Request demo</Button>
							</Link>
							<Link href="/register">
								<Button variant="outline" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold">Start free trial</Button>
							</Link>
						</div>
					</div>
				</section>
			</main>

			<footer className="border-t border-gray-200 bg-white/80 backdrop-blur">
				<div className="container mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between text-sm text-gray-600">
					<div className="flex items-center space-x-2">
						<span>{themeSettings?.footer?.footer_text?.value || `QSights © ${new Date().getFullYear()}`}</span>
					</div>
					<div className="flex items-center space-x-4">
						<Link href={themeSettings?.footer?.footer_privacy_url?.value || '/privacy-policy'} className="hover:text-blue-600">Privacy</Link>
						<Link href={themeSettings?.footer?.footer_terms_url?.value || '/terms-of-service'} className="hover:text-blue-600">Terms</Link>
						<Link href={themeSettings?.footer?.footer_contact_url?.value || '/contact-us'} className="hover:text-blue-600">{
							themeSettings?.footer?.footer_contact_label?.value || 'Contact Us'
						}</Link>
					</div>
				</div>
			</footer>
		</div>
	);
}
