"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Shield, Lock, CheckCircle, Eye, EyeOff } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "find-account" | "select-account" | "otp" | "password" | "success">("email");
  const [email, setEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState(""); // Selected login email for reset
  const [communicationEmail, setCommunicationEmail] = useState(""); // For finding accounts
  const [accounts, setAccounts] = useState<Array<{login_email: string; name: string; role: string; masked_email: string}>>([]);
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Step 1: Request OTP with Login Email (direct flow)
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, mode: "direct" }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "OTP sent to your email");
        setLoginEmail(email); // Store the login email
        setStep("otp");
      } else {
        setError(data.message || "Failed to send OTP");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Find accounts by communication email
  const handleFindAccounts = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/find-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communication_email: communicationEmail }),
      });

      const data = await response.json();

      if (response.ok && data.accounts && data.accounts.length > 0) {
        setAccounts(data.accounts);
        setStep("select-account");
      } else if (response.ok && (!data.accounts || data.accounts.length === 0)) {
        setError("No accounts found with this communication email.");
      } else {
        setError(data.message || "Failed to find accounts");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Select account and request OTP
  const handleSelectAccount = async (selectedLoginEmail: string) => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: selectedLoginEmail, mode: "direct" }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "OTP sent to your communication email");
        setLoginEmail(selectedLoginEmail);
        setStep("otp");
      } else {
        setError(data.message || "Failed to send OTP");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Use the stored login email
      const verifyEmail = loginEmail || email;
      
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: verifyEmail,
          otp,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetToken(data.reset_token);
        // Store the actual login email returned from server
        if (data.login_email) {
          setLoginEmail(data.login_email);
        }
        setStep("password");
      } else {
        setError(data.message || "Invalid OTP");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
      setError("Password must contain uppercase, lowercase, number, and special character");
      return;
    }

    setLoading(true);

    try {
      // Use login email for password reset (not communication email)
      const resetEmail = loginEmail || email;
      
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail,
          reset_token: resetToken,
          password,
          password_confirmation: confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep("success");
      } else {
        setError(data.message || "Failed to reset password");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Login */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {(step === "email" || step === "find-account" || step === "select-account") && <Mail className="w-8 h-8 text-blue-600" />}
              {step === "otp" && <Shield className="w-8 h-8 text-blue-600" />}
              {step === "password" && <Lock className="w-8 h-8 text-blue-600" />}
              {step === "success" && <CheckCircle className="w-8 h-8 text-green-600" />}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {step === "email" && "Forgot Password?"}
              {step === "find-account" && "Find Your Account"}
              {step === "select-account" && "Select Account"}
              {step === "otp" && "Enter OTP"}
              {step === "password" && "Create New Password"}
              {step === "success" && "Password Reset!"}
            </h1>
            <p className="text-gray-600 mt-2 text-sm">
              {step === "email" && "Enter your username to reset your password"}
              {step === "find-account" && "Enter your communication email to find your accounts"}
              {step === "select-account" && "Select the account you want to reset"}
              {step === "otp" && "We sent a 6-digit code to your communication email"}
              {step === "password" && "Choose a strong password for your account"}
              {step === "success" && "Your password has been reset successfully"}
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-600">{message}</p>
            </div>
          )}

          {/* Step 1: Username Input */}
          {step === "email" && (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your-program.admin@qsights.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-2">
                  This is your login username (e.g., program-name.admin@qsights.com)
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>

              {/* Prominent option for users who don't know their username */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep("find-account")}
                className="w-full border-2 border-blue-500 text-blue-600 py-3 rounded-lg font-medium hover:bg-blue-50 focus:ring-4 focus:ring-blue-200 transition-all"
              >
                Don&apos;t know your username? Find your account
              </button>
              <p className="text-xs text-center text-gray-500">
                For auto-generated accounts (Program Admin, Manager, Moderator, Evaluation Admin)
              </p>
            </form>
          )}

          {/* Find Account by Communication Email */}
          {step === "find-account" && (
            <form onSubmit={handleFindAccounts} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Communication Email
                </label>
                <input
                  type="email"
                  value={communicationEmail}
                  onChange={(e) => setCommunicationEmail(e.target.value)}
                  required
                  placeholder="your.personal@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the communication email associated with your account(s).
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "Searching..." : "Find Accounts"}
              </button>

              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full text-gray-600 hover:text-gray-700 text-sm font-medium"
              >
                ← Back to username
              </button>
            </form>
          )}

          {/* Select Account */}
          {step === "select-account" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                We found {accounts.length} account(s) linked to your communication email. 
                Select the account you want to reset:
              </p>
              
              {accounts.map((account, index) => (
                <button
                  key={account.login_email}
                  onClick={() => handleSelectAccount(account.login_email)}
                  disabled={loading}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{account.name}</p>
                      <p className="text-sm text-gray-500">Username: <span className="font-mono text-gray-700">{account.masked_email}</span></p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 capitalize">
                        {account.role.replace(/_/g, ' ').replace(/-/g, ' ')}
                      </span>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                  </div>
                </button>
              ))}

              <button
                type="button"
                onClick={() => setStep("find-account")}
                className="w-full text-gray-600 hover:text-gray-700 text-sm font-medium mt-4"
              >
                ← Back to search
              </button>
            </div>
          )}

          {/* Step 2: OTP Verification */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter 6-Digit OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  maxLength={6}
                  placeholder="000000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-center text-2xl tracking-widest font-mono"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  OTP is valid for 10 minutes
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setLoginEmail("");
                  setAccounts([]);
                }}
                className="w-full text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Didn&apos;t receive? Resend OTP
              </button>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === "password" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm new password"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Password requirements:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• At least 8 characters</li>
                  <li>• One uppercase letter</li>
                  <li>• One lowercase letter</li>
                  <li>• One number</li>
                  <li>• One special character (@$!%*?&)</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

          {/* Step 4: Success */}
          {step === "success" && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <p className="text-gray-600">
                You can now log in with your new password
              </p>
              <button
                onClick={() => router.push("/")}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Remember your password?{" "}
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
