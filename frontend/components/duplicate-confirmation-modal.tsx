"use client";

import React from "react";
import { X, Copy } from "lucide-react";

interface DuplicateConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
  itemType?: 'event' | 'questionnaire';
}

export default function DuplicateConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'event',
}: DuplicateConfirmationModalProps) {
  if (!isOpen) return null;

  const isQuestionnaire = itemType === 'questionnaire';
  const itemLabel = isQuestionnaire ? 'Questionnaire' : 'Event';
  const itemLabelLower = isQuestionnaire ? 'questionnaire' : 'event';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full flex-shrink-0">
                <Copy className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Duplicate {itemLabel}?</h3>
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
            This will create a copy of the {itemLabelLower} with all its settings. The duplicated {itemLabelLower} will be created as a <strong>draft</strong>.
          </p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">
              ℹ️ What will be copied:
            </p>
            {isQuestionnaire ? (
              <ul className="text-xs text-blue-700 mt-2 ml-4 space-y-1 list-disc">
                <li>Questionnaire name (with "(Copy)" suffix)</li>
                <li>All sections and questions</li>
                <li>Question types and settings</li>
                <li>Conditional logic and branching</li>
                <li>All questionnaire configurations</li>
              </ul>
            ) : (
              <ul className="text-xs text-blue-700 mt-2 ml-4 space-y-1 list-disc">
                <li>Event name (with "(Copy)" suffix)</li>
                <li>Description and type</li>
                <li>Questionnaire assignment</li>
                <li>Start and end dates</li>
                <li>All event settings</li>
              </ul>
            )}
          </div>
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
              <Copy className="w-4 h-4" />
              Duplicate {itemLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
