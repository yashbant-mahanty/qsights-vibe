"use client";

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Trash2, ExternalLink } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import RichTextEditor from "@/components/RichTextEditor";
import { QuestionReference } from "@/types/conditionalLogic";

interface IsolatedReferenceItemProps {
  reference: QuestionReference;
  refIdx: number;
  totalRefs: number;
  onUpdate: (updatedRef: QuestionReference) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

/**
 * Isolated input component for title/URL fields that uses internal state
 * Only syncs to parent on blur to prevent focus loss during typing
 */
const IsolatedInput = React.memo(({ 
  value, 
  onChange, 
  placeholder, 
  className,
  type = "text"
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string; 
  className?: string;
  type?: string;
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  // Sync internal value when prop changes (but not while focused)
  useEffect(() => {
    if (!isFocused) {
      setInternalValue(value);
    }
  }, [value, isFocused]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (internalValue !== value) {
      onChange(internalValue);
    }
  }, [internalValue, value, onChange]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  return (
    <Input
      type={type}
      value={internalValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
      className={className}
    />
  );
});
IsolatedInput.displayName = 'IsolatedInput';

/**
 * Isolated Rich Text Editor wrapper that uses internal state
 * Only syncs to parent on blur to prevent focus loss during typing
 */
const IsolatedRichTextEditor = React.memo(({ 
  value, 
  onChange, 
  placeholder,
  minHeight = "80px"
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string;
  minHeight?: string;
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const isFirstMount = useRef(true);

  // Sync internal value when prop changes (but not while focused and not on first mount after user edit)
  useEffect(() => {
    if (!isFocused || isFirstMount.current) {
      setInternalValue(value);
      isFirstMount.current = false;
    }
  }, [value, isFocused]);

  const handleChange = useCallback((newValue: string) => {
    setInternalValue(newValue);
    // Don't call parent onChange on every keystroke
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (internalValue !== value) {
      onChange(internalValue);
    }
  }, [internalValue, value, onChange]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    isFirstMount.current = false;
  }, []);

  // Create a wrapper that intercepts blur events
  return (
    <div 
      onBlur={handleBlur}
      onFocus={handleFocus}
    >
      <RichTextEditor
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        minHeight={minHeight}
      />
    </div>
  );
});
IsolatedRichTextEditor.displayName = 'IsolatedRichTextEditor';

/**
 * Reference item component - uses refs to avoid stale closure issues
 */
const IsolatedReferenceItem = ({
  reference,
  refIdx,
  totalRefs,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown
}: IsolatedReferenceItemProps) => {
  // Use ref to always have latest reference without stale closures
  const refDataRef = useRef(reference);
  refDataRef.current = reference;

  // Direct update handlers - always use latest ref data
  const handleTypeChange = useCallback((value: string) => {
    const updated = { ...refDataRef.current, reference_type: value as 'text' | 'url' };
    onUpdate(updated);
  }, [onUpdate]);

  const handlePositionChange = useCallback((value: string) => {
    const updated = { ...refDataRef.current, display_position: value as 'AFTER_QUESTION' | 'AFTER_ANSWER' };
    onUpdate(updated);
  }, [onUpdate]);

  const handleTitleChange = useCallback((value: string) => {
    const updated = { ...refDataRef.current, title: value };
    onUpdate(updated);
  }, [onUpdate]);

  const handleContentTextChange = useCallback((value: string) => {
    const updated = { ...refDataRef.current, content_text: value };
    onUpdate(updated);
  }, [onUpdate]);

  const handleUrlChange = useCallback((value: string) => {
    const updated = { ...refDataRef.current, content_url: value };
    onUpdate(updated);
  }, [onUpdate]);

  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">Reference {refIdx + 1}</span>
        <div className="flex items-center gap-1">
          {refIdx > 0 && (
            <button
              type="button"
              onClick={onMoveUp}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Move up"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
          )}
          {refIdx < totalRefs - 1 && (
            <button
              type="button"
              onClick={onMoveDown}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Move down"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
            title="Delete reference"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <Label className="text-xs text-gray-600">Reference Type</Label>
          <select
            value={reference.reference_type}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
          >
            <option value="text">Text</option>
            <option value="url">URL</option>
          </select>
        </div>

        <div>
          <Label className="text-xs text-gray-600">Display Position</Label>
          <select
            value={reference.display_position}
            onChange={(e) => handlePositionChange(e.target.value)}
            className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
          >
            <option value="AFTER_QUESTION">Show After Question</option>
            <option value="AFTER_ANSWER">Show After Answer</option>
          </select>
        </div>
      </div>

      <div className="mb-3">
        <Label className="text-xs text-gray-600">Title (Optional)</Label>
        <IsolatedInput
          value={reference.title || ''}
          onChange={handleTitleChange}
          placeholder="Reference title..."
          className="mt-1 text-sm"
        />
      </div>

      {reference.reference_type === 'text' ? (
        <div>
          <Label className="text-xs text-gray-600">Content</Label>
          <IsolatedRichTextEditor
            value={reference.content_text || ''}
            onChange={handleContentTextChange}
            placeholder="Enter reference text..."
            minHeight="80px"
          />
        </div>
      ) : (
        <div>
          <Label className="text-xs text-gray-600">URL</Label>
          <div className="flex items-center gap-2 mt-1">
            <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <IsolatedInput
              type="url"
              value={reference.content_url || ''}
              onChange={handleUrlChange}
              placeholder="https://example.com/resource"
              className="text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
};

IsolatedReferenceItem.displayName = 'IsolatedReferenceItem';

export default IsolatedReferenceItem;
