"use client";

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Superscript, Subscript, Type, Link2, X, ExternalLink } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  showToolbar?: boolean;
}

interface LinkModalData {
  isOpen: boolean;
  url: string;
  text: string;
  target: '_self' | '_blank';
  selectedText: string;
  selectionRange: Range | null;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter text...",
  minHeight = "100px",
  showToolbar = true
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [localContent, setLocalContent] = useState(value);
  // Use ref to store onChange to prevent stale closures and unnecessary re-renders
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  
  const [linkModal, setLinkModal] = useState<LinkModalData>({
    isOpen: false,
    url: '',
    text: '',
    target: '_blank',
    selectedText: '',
    selectionRange: null
  });

  // Sync external value changes only when not focused
  useEffect(() => {
    if (!isFocused && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
      setLocalContent(value);
    }
  }, [value, isFocused]);

  const execCommand = useCallback((command: string, cmdValue: string | undefined = undefined) => {
    // Save cursor position before command
    const selection = window.getSelection();
    const savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
    
    document.execCommand(command, false, cmdValue);
    
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setLocalContent(newContent);
      // Update immediately for toolbar commands using ref to avoid stale closure
      onChangeRef.current(newContent);
      
      // Restore focus if lost
      if (savedRange) {
        editorRef.current.focus();
        try {
          selection?.removeAllRanges();
          selection?.addRange(savedRange);
        } catch (e) {
          // If range restoration fails, just place cursor at end
        }
      }
    }
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setLocalContent(newContent);
      // DON'T call onChange on every input - this prevents the anchoring/cursor jump issue
      // The content will be synced to parent on blur instead
    }
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Don't blur if link modal is open
    if (linkModal.isOpen) return;
    
    // Check if we're blurring to somewhere within the editor or toolbar
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && editorRef.current?.parentElement?.contains(relatedTarget)) {
      return;
    }
    
    setIsFocused(false);
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      if (content !== value) {
        onChangeRef.current(content);
      }
    }
  }, [value, linkModal.isOpen]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const openLinkModal = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get current selection before opening modal
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    let selectionRange: Range | null = null;
    
    if (selection && selection.rangeCount > 0) {
      selectionRange = selection.getRangeAt(0).cloneRange();
    }
    
    setLinkModal({
      isOpen: true,
      url: '',
      text: selectedText || '',
      target: '_blank',
      selectedText,
      selectionRange
    });
  }, []);

  const closeLinkModal = useCallback(() => {
    setLinkModal({
      isOpen: false,
      url: '',
      text: '',
      target: '_blank',
      selectedText: '',
      selectionRange: null
    });
    // Refocus editor
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, []);

  const insertLinkFromModal = useCallback(() => {
    const { url, text, target, selectedText, selectionRange } = linkModal;
    
    if (!url.trim()) {
      closeLinkModal();
      return;
    }

    // Ensure URL has protocol
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('mailto:')) {
      finalUrl = 'https://' + finalUrl;
    }

    const linkText = text.trim() || finalUrl;
    const targetAttr = target === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : '';
    const linkHtml = `<a href="${finalUrl}"${targetAttr} class="text-blue-600 underline hover:text-blue-800">${linkText}</a>`;

    if (editorRef.current) {
      editorRef.current.focus();
      
      // If there was a selection, restore it and replace
      if (selectionRange && selectedText) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(selectionRange);
          document.execCommand('insertHTML', false, linkHtml);
        }
      } else {
        // Insert at cursor or at end
        document.execCommand('insertHTML', false, linkHtml);
      }

      // Update content
      const newContent = editorRef.current.innerHTML;
      setLocalContent(newContent);
      onChange(newContent);
    }

    closeLinkModal();
  }, [linkModal, closeLinkModal, onChange]);

  const handleModalKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      insertLinkFromModal();
    } else if (e.key === 'Escape') {
      closeLinkModal();
    }
  }, [insertLinkFromModal, closeLinkModal]);

  const toolbarButtons = [
    { command: 'bold', icon: Bold, label: 'Bold', shortcut: 'Ctrl+B' },
    { command: 'italic', icon: Italic, label: 'Italic', shortcut: 'Ctrl+I' },
    { command: 'underline', icon: Underline, label: 'Underline', shortcut: 'Ctrl+U' },
    { command: 'insertUnorderedList', icon: List, label: 'Bullet List' },
    { command: 'insertOrderedList', icon: ListOrdered, label: 'Numbered List' },
    { command: 'superscript', icon: Superscript, label: 'Superscript' },
    { command: 'subscript', icon: Subscript, label: 'Subscript' },
  ];

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {showToolbar && (
        <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
          {toolbarButtons.map(({ command, icon: Icon, label, shortcut }) => (
            <button
              key={command}
              type="button"
              onClick={() => execCommand(command)}
              className="p-2 hover:bg-gray-200 rounded transition-colors group relative"
              title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
              aria-label={label}
            >
              <Icon className="w-4 h-4 text-gray-700" />
              <span className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap z-10">
                {label}
              </span>
            </button>
          ))}
          
          {/* Insert Link Button */}
          <button
            type="button"
            onClick={openLinkModal}
            className="p-2 hover:bg-gray-200 rounded transition-colors group relative border-l border-gray-300 ml-1"
            title="Insert Link"
            aria-label="Insert Link"
          >
            <Link2 className="w-4 h-4 text-gray-700" />
            <span className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap z-10">
              Insert Link
            </span>
          </button>

          {/* Font Size */}
          <div className="border-l border-gray-300 pl-2 ml-1">
            <select
              onChange={(e) => execCommand('fontSize', e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
              defaultValue=""
            >
              <option value="" disabled>Size</option>
              <option value="1">Small</option>
              <option value="3">Normal</option>
              <option value="5">Large</option>
              <option value="7">Huge</option>
            </select>
          </div>

          {/* Clear Formatting */}
          <button
            type="button"
            onClick={() => execCommand('removeFormat')}
            className="p-2 hover:bg-gray-200 rounded transition-colors ml-auto"
            title="Clear Formatting"
            aria-label="Clear Formatting"
          >
            <Type className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      )}
      
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className="p-3 outline-none prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_li]:my-0.5"
        style={{ minHeight }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      {/* Link Modal */}
      {linkModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeLinkModal}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-blue-600" />
                Insert Link
              </h3>
              <button
                type="button"
                onClick={closeLinkModal}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* URL Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={linkModal.url}
                  onChange={(e) => setLinkModal(prev => ({ ...prev, url: e.target.value }))}
                  onKeyDown={handleModalKeyDown}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  autoFocus
                />
              </div>

              {/* Link Text Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Text
                </label>
                <input
                  type="text"
                  value={linkModal.text}
                  onChange={(e) => setLinkModal(prev => ({ ...prev, text: e.target.value }))}
                  onKeyDown={handleModalKeyDown}
                  placeholder="Enter link text (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use URL as text</p>
              </div>

              {/* Target Option */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Open Link In
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="linkTarget"
                      value="_blank"
                      checked={linkModal.target === '_blank'}
                      onChange={() => setLinkModal(prev => ({ ...prev, target: '_blank' }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5" />
                      New Tab/Window
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="linkTarget"
                      value="_self"
                      checked={linkModal.target === '_self'}
                      onChange={() => setLinkModal(prev => ({ ...prev, target: '_self' }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Same Window</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={closeLinkModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={insertLinkFromModal}
                disabled={!linkModal.url.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" />
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        [contentEditable=true]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contentEditable=true] {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        [contentEditable=true] ul,
        [contentEditable=true] ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        [contentEditable=true] li {
          margin: 0.25rem 0;
        }
        [contentEditable=true] strong {
          font-weight: 600;
        }
        [contentEditable=true] em {
          font-style: italic;
        }
        [contentEditable=true] u {
          text-decoration: underline;
        }
        [contentEditable=true] sup {
          vertical-align: super;
          font-size: 0.75em;
        }
        [contentEditable=true] sub {
          vertical-align: sub;
          font-size: 0.75em;
        }
        [contentEditable=true] a {
          color: #2563eb;
          text-decoration: underline;
        }
        [contentEditable=true] a:hover {
          color: #1d4ed8;
        }
      `}</style>
    </div>
  );
}
