"use client";

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Superscript, Subscript, Type } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  showToolbar?: boolean;
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

  // Sync external value changes only when not focused
  useEffect(() => {
    if (!isFocused && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
      setLocalContent(value);
    }
  }, [value, isFocused]);

  const execCommand = useCallback((command: string, cmdValue: string | undefined = undefined) => {
    document.execCommand(command, false, cmdValue);
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setLocalContent(newContent);
      // Update immediately for toolbar commands
      onChange(newContent);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setLocalContent(newContent);
      // Don't call onChange on every keystroke - wait for blur
    }
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      if (content !== value) {
        onChange(content);
      }
    }
  }, [onChange, value]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

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
        className="p-3 outline-none"
        style={{ minHeight }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      
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
      `}</style>
    </div>
  );
}
