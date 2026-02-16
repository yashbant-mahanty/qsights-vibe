'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ApprovalRequestData {
  id: string;
  name: string;
  description: string;
  type: string;
  start_date: string;
  end_date: string;
  program: {
    name: string;
  };
  requested_by: {
    name: string;
    email: string;
  };
  manager_email: string;
}

interface ExistingData {
  project_code?: string;
  configuration_date?: string;
  configuration_price?: number;
  subscription_price?: number;
  subscription_frequency?: string;
  tax_percentage?: number;
  expected_participants?: number;
}

interface ValidationResult {
  valid: boolean;
  message?: string;
  already_reviewed?: boolean;
  data?: {
    approval_request: ApprovalRequestData;
    token_expires_at: string;
    existing_data: ExistingData;
  };
}

export default function ManagerReviewPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [approvalRequest, setApprovalRequest] = useState<ApprovalRequestData | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    project_code: '',
    configuration_date: '',
    configuration_price: '',
    subscription_price: '',
    subscription_frequency: 'monthly',
    tax_percentage: '',
    expected_participants: '',
    notes: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    try {
      setValidating(true);
      setError(null);

      const response = await axios.get<ValidationResult>(
        `${process.env.NEXT_PUBLIC_API_URL}/manager/review/${token}`
      );

      if (response.data.valid && response.data.data) {
        setTokenValid(true);
        setApprovalRequest(response.data.data.approval_request);
        setExpiresAt(response.data.data.token_expires_at);

        // Pre-fill form if existing data available
        const existing = response.data.data.existing_data;
        if (existing) {
          setFormData({
            project_code: existing.project_code || '',
            configuration_date: existing.configuration_date || '',
            configuration_price: existing.configuration_price?.toString() || '',
            subscription_price: existing.subscription_price?.toString() || '',
            subscription_frequency: existing.subscription_frequency || 'monthly',
            tax_percentage: existing.tax_percentage?.toString() || '',
            expected_participants: existing.expected_participants?.toString() || '',
            notes: ''
          });
        }
      } else {
        setTokenValid(false);
        setError(response.data.message || 'Invalid token');
      }
    } catch (err: any) {
      console.error('Token validation error:', err);
      setTokenValid(false);
      if (err.response?.data?.already_reviewed) {
        setError('This request has already been reviewed.');
      } else {
        setError(err.response?.data?.message || 'Invalid or expired token');
      }
    } finally {
      setValidating(false);
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.project_code.trim()) {
      errors.project_code = 'Project code is required';
    }

    if (!formData.configuration_date) {
      errors.configuration_date = 'Configuration date is required';
    }

    if (!formData.configuration_price || parseFloat(formData.configuration_price) < 0) {
      errors.configuration_price = 'Valid configuration price is required';
    }

    if (!formData.subscription_price || parseFloat(formData.subscription_price) < 0) {
      errors.subscription_price = 'Valid subscription price is required';
    }

    if (!formData.tax_percentage || parseFloat(formData.tax_percentage) < 0 || parseFloat(formData.tax_percentage) > 100) {
      errors.tax_percentage = 'Tax percentage must be between 0 and 100';
    }

    if (!formData.expected_participants || parseInt(formData.expected_participants) < 1) {
      errors.expected_participants = 'Expected participants must be at least 1';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        project_code: formData.project_code.trim(),
        configuration_date: formData.configuration_date,
        configuration_price: parseFloat(formData.configuration_price),
        subscription_price: parseFloat(formData.subscription_price),
        subscription_frequency: formData.subscription_frequency,
        tax_percentage: parseFloat(formData.tax_percentage),
        expected_participants: parseInt(formData.expected_participants),
        notes: formData.notes.trim() || undefined
      };

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/manager/review/${token}`,
        payload
      );

      setSuccess(true);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.response?.data?.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  if (loading || validating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Validating your access...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact the administrator.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Review Submitted Successfully!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your review. The Super Admin has been notified and will proceed with the final approval.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              You can now close this window. This review link has been used and cannot be accessed again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Manager Review Required</h1>
            {expiresAt && (
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span>Expires: {new Date(expiresAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {approvalRequest && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Activity Details</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="font-medium text-gray-500">Activity Name</dt>
                  <dd className="text-gray-900">{approvalRequest.name}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Type</dt>
                  <dd className="text-gray-900 capitalize">{approvalRequest.type}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Program</dt>
                  <dd className="text-gray-900">{approvalRequest.program.name}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Requested By</dt>
                  <dd className="text-gray-900">{approvalRequest.requested_by.name}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Start Date</dt>
                  <dd className="text-gray-900">{new Date(approvalRequest.start_date).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">End Date</dt>
                  <dd className="text-gray-900">{new Date(approvalRequest.end_date).toLocaleDateString()}</dd>
                </div>
              </dl>
              {approvalRequest.description && (
                <div className="mt-3">
                  <dt className="font-medium text-gray-500 mb-1">Description</dt>
                  <dd className="text-gray-900">{approvalRequest.description}</dd>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Manager Review Form</h2>
          <p className="text-gray-600 mb-6">
            Please provide the following information to proceed with the approval process.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Code */}
            <div>
              <label htmlFor="project_code" className="block text-sm font-medium text-gray-700 mb-1">
                Project Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="project_code"
                name="project_code"
                value={formData.project_code}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  formErrors.project_code ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter project code"
              />
              {formErrors.project_code && (
                <p className="mt-1 text-sm text-red-600">{formErrors.project_code}</p>
              )}
            </div>

            {/* Configuration Date */}
            <div>
              <label htmlFor="configuration_date" className="block text-sm font-medium text-gray-700 mb-1">
                Configuration Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="configuration_date"
                name="configuration_date"
                value={formData.configuration_date}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  formErrors.configuration_date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.configuration_date && (
                <p className="mt-1 text-sm text-red-600">{formErrors.configuration_date}</p>
              )}
            </div>

            {/* Configuration Price */}
            <div>
              <label htmlFor="configuration_price" className="block text-sm font-medium text-gray-700 mb-1">
                Configuration Price ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="configuration_price"
                name="configuration_price"
                value={formData.configuration_price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  formErrors.configuration_price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {formErrors.configuration_price && (
                <p className="mt-1 text-sm text-red-600">{formErrors.configuration_price}</p>
              )}
            </div>

            {/* Subscription Price */}
            <div>
              <label htmlFor="subscription_price" className="block text-sm font-medium text-gray-700 mb-1">
                Subscription Price ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="subscription_price"
                name="subscription_price"
                value={formData.subscription_price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  formErrors.subscription_price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {formErrors.subscription_price && (
                <p className="mt-1 text-sm text-red-600">{formErrors.subscription_price}</p>
              )}
            </div>

            {/* Subscription Frequency */}
            <div>
              <label htmlFor="subscription_frequency" className="block text-sm font-medium text-gray-700 mb-1">
                Subscription Frequency <span className="text-red-500">*</span>
              </label>
              <select
                id="subscription_frequency"
                name="subscription_frequency"
                value={formData.subscription_frequency}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="one-time">One-time</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {/* Tax Percentage */}
            <div>
              <label htmlFor="tax_percentage" className="block text-sm font-medium text-gray-700 mb-1">
                Tax Percentage (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="tax_percentage"
                name="tax_percentage"
                value={formData.tax_percentage}
                onChange={handleInputChange}
                min="0"
                max="100"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  formErrors.tax_percentage ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {formErrors.tax_percentage && (
                <p className="mt-1 text-sm text-red-600">{formErrors.tax_percentage}</p>
              )}
            </div>

            {/* Expected Participants */}
            <div>
              <label htmlFor="expected_participants" className="block text-sm font-medium text-gray-700 mb-1">
                Expected Participants <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="expected_participants"
                name="expected_participants"
                value={formData.expected_participants}
                onChange={handleInputChange}
                min="1"
                step="1"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  formErrors.expected_participants ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Number of expected participants"
              />
              {formErrors.expected_participants && (
                <p className="mt-1 text-sm text-red-600">{formErrors.expected_participants}</p>
              )}
            </div>

            {/* Notes (Optional) */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Any additional comments or notes..."
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>

        {/* Security Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Security Notice:</strong> This link is for one-time use only and will expire after submission or after the expiration date.
            Your submission will be securely transmitted to the Super Admin for final approval.
          </p>
        </div>
      </div>
    </div>
  );
}
