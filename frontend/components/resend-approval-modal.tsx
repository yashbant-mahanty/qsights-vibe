"use client";

import React from "react";
import { X, RefreshCw } from "lucide-react";

interface ResendApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
  hasManagerReview?: boolean;
}

export default function ResendApprovalModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  hasManagerReview = false,
}: ResendApprovalModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full flex-shrink-0">
                <RefreshCw className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Resend for Approval</h3>
                {itemName && (
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-semibold text-gray-900">{itemName}</span>
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-700 leading-relaxed">
            This will resubmit the approval request through the complete approval workflow.
          </p>
          
          {hasManagerReview ? (
            <div className="mt-4 space-y-3">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-medium">
                  📧 Approval Workflow
                </p>
                <ul className="text-xs text-blue-800 mt-2 space-y-1.5 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">1.</span>
                    <span>Manager will receive review email</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">2.</span>
                    <span>Manager submits review</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">3.</span>
                    <span>Super Admin receives approval request</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">4.</span>
                    <span>Super Admin approves/rejects</span>
                  </li>
                </ul>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  <span className="font-semibold">Note:</span> Manager must complete their review before Super Admin can approve.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-medium">
                ✓ Direct Submission
              </p>
              <p className="text-xs text-blue-800 mt-1">
                This request will be sent directly to Super Admin for approval.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Resend for Approval
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
