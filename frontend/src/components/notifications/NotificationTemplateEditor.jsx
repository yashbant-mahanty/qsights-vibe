"use client";

// NotificationTemplateEditor.jsx
// Editor for notification templates with placeholder support and Visual/HTML modes
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Code, Eye } from 'lucide-react';

const NotificationTemplateEditor = ({
  open,
  template,
  notificationType,
  placeholders,
  onSave,
  onClose,
}) => {
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState('visual'); // 'visual' or 'html'
  const editorRef = useRef(null);

  useEffect(() => {
    if (template) {
      setSubject(template.subject || '');
      setBodyHtml(template.body_html || '');
      // Convert HTML to plain text for visual editor
      const plainText = (template.body_html || '').replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim();
      setBodyText(plainText);
    }
  }, [template]);

  // Convert plain text with formatting to HTML
  const convertTextToHtml = (text) => {
    if (!text) return '';
    
    // Split by paragraphs (double line breaks)
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    
    let html = '';
    paragraphs.forEach(para => {
      // Check if it's a heading (starts with #)
      if (para.trim().startsWith('#')) {
        const headingText = para.replace(/^#+\s*/, '');
        html += `<h2 style="font-size: 20px; font-weight: bold; margin: 20px 0 10px 0; color: #1f2937;">${headingText}</h2>\n`;
      }
      // Check if it's a list item (starts with - or *)
      else if (para.trim().match(/^[-*]\s/)) {
        const items = para.split('\n').filter(l => l.trim().match(/^[-*]\s/));
        html += '<ul style="margin: 10px 0; padding-left: 20px;">\n';
        items.forEach(item => {
          const text = item.replace(/^[-*]\s*/, '');
          html += `  <li style="margin: 5px 0;">${text}</li>\n`;
        });
        html += '</ul>\n';
      }
      // Regular paragraph
      else {
        // Handle line breaks within paragraph
        const lines = para.split('\n').filter(l => l.trim());
        lines.forEach(line => {
          // Check for bold (**text**)
          line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
          // Check for italic (*text*)
          line = line.replace(/\*([^*]+)\*/g, '<em>$1</em>');
          
          html += `<p style="margin: 10px 0; line-height: 1.6; color: #374151;">${line}</p>\n`;
        });
      }
    });
    
    return html;
  };

  // Sync between visual and HTML modes
  const handleModeChange = (newMode) => {
    if (editMode === 'visual' && newMode === 'html') {
      // Convert text to HTML when switching to HTML mode
      const html = convertTextToHtml(bodyText);
      setBodyHtml(html);
    } else if (editMode === 'html' && newMode === 'visual') {
      // Convert HTML to text when switching to visual mode
      const plainText = bodyHtml.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim();
      setBodyText(plainText);
    }
    setEditMode(newMode);
  };

  const handleSave = async () => {
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }

    // Get the final HTML based on current mode
    let finalHtml = bodyHtml;
    if (editMode === 'visual') {
      finalHtml = convertTextToHtml(bodyText);
    }

    if (!finalHtml.trim()) {
      setError('Email body is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await onSave({
        subject: subject.trim(),
        body_html: finalHtml,
        body_text: finalHtml.replace(/<[^>]*>/g, ''),
        is_active: true,
      });

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const insertPlaceholder = (placeholder, field) => {
    const placeholderText = `{{${placeholder}}}`;
    
    if (field === 'subject') {
      setSubject(subject + placeholderText);
    } else if (editMode === 'visual') {
      setBodyText(bodyText + placeholderText);
    } else {
      setBodyHtml(bodyHtml + placeholderText);
    }
  };

  const applyFormatting = (format) => {
    if (editMode !== 'visual') return;
    
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = bodyText.substring(start, end);
    
    if (!selectedText) {
      alert('Please select some text first');
      return;
    }

    let formattedText = selectedText;
    
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'heading':
        formattedText = `# ${selectedText}`;
        break;
    }

    const newText = bodyText.substring(0, start) + formattedText + bodyText.substring(end);
    setBodyText(newText);
    
    // Restore focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + formattedText.length);
    }, 0);
  };

  // Handle placeholders - can be array or object with placeholders property
  const placeholderList = Array.isArray(placeholders) 
    ? placeholders 
    : (placeholders?.placeholders || []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-1/2 max-h-[95vh] overflow-x-auto overflow-y-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h2 className="text-xl font-bold">
            Edit {notificationType?.replace(/_/g, ' ')} Template
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <CardContent className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Subject Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="subject" className="text-sm font-medium">
                  Subject *
                </Label>
              </div>
              <Input
                id="subject"
                name="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject (use {{placeholder}} for dynamic content)"
                className="w-full"
              />
            </div>

            {/* Body Field with Visual/HTML Toggle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="body" className="text-sm font-medium">
                  Email Body *
                </Label>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => handleModeChange('visual')}
                    className={`px-3 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
                      editMode === 'visual'
                        ? 'bg-white text-qsights-blue font-semibold shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    Visual
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('html')}
                    className={`px-3 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
                      editMode === 'html'
                        ? 'bg-white text-qsights-blue font-semibold shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Code className="w-3 h-3" />
                    HTML
                  </button>
                </div>
              </div>

              {editMode === 'visual' ? (
                <div>
                  {/* Formatting Toolbar */}
                  <div className="flex gap-2 mb-2 p-2 bg-gray-50 border border-gray-300 rounded-t-lg">
                    <button
                      type="button"
                      onClick={() => applyFormatting('bold')}
                      className="px-3 py-1 text-sm font-bold border border-gray-300 rounded hover:bg-gray-200 transition-colors"
                      title="Bold (select text first)"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting('italic')}
                      className="px-3 py-1 text-sm italic border border-gray-300 rounded hover:bg-gray-200 transition-colors"
                      title="Italic (select text first)"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting('heading')}
                      className="px-3 py-1 text-sm font-bold border border-gray-300 rounded hover:bg-gray-200 transition-colors"
                      title="Heading (select text first)"
                    >
                      H
                    </button>
                    <span className="text-xs text-gray-500 flex items-center ml-2">
                      Select text and click to format
                    </span>
                  </div>
                  
                  <textarea
                    ref={editorRef}
                    id="body"
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    placeholder="Type your email content here...

You can:
- Type normally for paragraphs
- Use **text** for bold
- Use *text* for italic
- Start lines with # for headings
- Start lines with - for bullet points
- Use {{placeholders}} for dynamic content

Press Enter twice to create a new paragraph."
                    className="w-full min-h-[280px] p-3 border border-gray-300 border-t-0 rounded-b-lg focus:ring-2 focus:ring-qsights-blue focus:border-transparent resize-y text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    <strong>Visual Editor:</strong> Type naturally and use simple formatting:
                    **bold**, *italic*, # heading, - list items
                  </p>
                </div>
              ) : (
                <div>
                  <textarea
                    id="body"
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    placeholder="Enter email body with HTML formatting"
                    className="w-full min-h-[280px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-qsights-blue focus:border-transparent resize-y font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    <strong>HTML Editor:</strong> Use HTML tags for formatting 
                    (e.g., &lt;strong&gt;, &lt;em&gt;, &lt;p&gt;, &lt;br&gt;, etc.)
                  </p>
                </div>
              )}
            </div>

            {/* Placeholders */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Available Placeholders
              </Label>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                <p className="text-xs text-blue-900">
                  <strong>What are placeholders?</strong> These are dynamic variables that will be replaced with actual data when the email is sent. 
                  For example, <code className="bg-blue-100 px-1 rounded">{'{{participant_name}}'}</code> will show the recipient's actual name.
                </p>
              </div>
              <p className="text-xs text-gray-600 mb-2 font-medium">
                Click any placeholder below to insert it at the end of your email body:
                {placeholderList.length > 0 && (
                  <span className="ml-2 text-qsights-blue">({placeholderList.length} available)</span>
                )}
              </p>
              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                {placeholderList.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {placeholderList.map((placeholder) => (
                      <button
                        key={placeholder}
                        onClick={() => insertPlaceholder(placeholder, 'body')}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-full hover:bg-qsights-blue hover:text-white hover:border-qsights-blue transition-colors bg-white font-mono"
                        title={`Click to add {{${placeholder}}} to your email`}
                      >
                        {`{{${placeholder}}}`}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    <p>No placeholders available</p>
                    <p className="text-xs mt-1">Available: activity_name, participant_name, program_name, organization_name, activity_link, start_date, end_date</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>

        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-qsights-blue hover:bg-qsights-blue-dark"
          >
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NotificationTemplateEditor;
