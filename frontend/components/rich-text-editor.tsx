"use client";

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Code } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter content here...',
  className = '',
  readOnly = false,
}: RichTextEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertTag = (openTag: string, closeTag: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newValue = 
      value.substring(0, start) + 
      openTag + selectedText + closeTag + 
      value.substring(end);
    
    onChange(newValue);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + openTag.length,
        start + openTag.length + selectedText.length
      );
    }, 0);
  };

  const toolbarButtons = [
    { icon: Heading1, label: 'H1', action: () => insertTag('<h1>', '</h1>') },
    { icon: Heading2, label: 'H2', action: () => insertTag('<h2>', '</h2>') },
    { icon: Bold, label: 'Bold', action: () => insertTag('<strong>', '</strong>') },
    { icon: Italic, label: 'Italic', action: () => insertTag('<em>', '</em>') },
    { icon: List, label: 'Bullet List', action: () => insertTag('<ul>\n  <li>', '</li>\n</ul>') },
    { icon: ListOrdered, label: 'Numbered List', action: () => insertTag('<ol>\n  <li>', '</li>\n</ol>') },
    { icon: Code, label: 'Code', action: () => insertTag('<code>', '</code>') },
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Toolbar */}
      {!readOnly && (
        <Card className="p-2">
          <div className="flex flex-wrap items-center gap-1">
            {toolbarButtons.map((btn, idx) => (
              <Button
                key={idx}
                type="button"
                variant="ghost"
                size="sm"
                onClick={btn.action}
                className="h-8 px-2"
                title={btn.label}
              >
                <btn.icon className="w-4 h-4" />
              </Button>
            ))}
            <div className="ml-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="h-8 px-3"
              >
                {showPreview ? 'Edit' : 'Preview'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Editor or Preview */}
      {showPreview ? (
        <Card className="p-6 min-h-[400px] prose prose-sm max-w-none">
          <div dangerouslySetInnerHTML={{ __html: value }} />
        </Card>
      ) : (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className="min-h-[400px] font-mono text-sm"
        />
      )}

      {/* Helper Text */}
      {!readOnly && (
        <p className="text-xs text-gray-500">
          Use the toolbar buttons to format text, or write HTML directly. Select text and click a button to wrap it.
        </p>
      )}
    </div>
  );
}
