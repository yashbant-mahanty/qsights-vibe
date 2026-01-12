"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  X,
  Loader2,
  FileText,
  List,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { questionnairesApi } from "@/lib/api";
import { toast } from "@/components/ui/toast";

interface ImportSection {
  title: string;
  questions: {
    type: string;
    title: string;
    is_required: boolean;
    options?: { text: string; value: string; is_correct?: boolean }[];
    settings?: any;
  }[];
}

interface ImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (sections: ImportSection[]) => Promise<void>;
  questionnaireId?: string;
}

export default function ImportPreviewModal({
  isOpen,
  onClose,
  onImport,
  questionnaireId,
}: ImportPreviewModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState<ImportSection[] | null>(null);
  const [summary, setSummary] = useState<{
    total_sections: number;
    total_questions: number;
    total_options: number;
  } | null>(null);
  const [errors, setErrors] = useState<{ row: number; error: string }[]>([]);
  const [warnings, setWarnings] = useState<
    { row?: number; section?: string; question?: string; warning: string }[]
  >([]);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const fileExtension = selectedFile.name
      .toLowerCase()
      .substring(selectedFile.name.lastIndexOf("."));

    if (
      !validTypes.includes(selectedFile.type) &&
      !validExtensions.includes(fileExtension)
    ) {
      toast({ title: "Error", description: "Invalid file type. Please upload an Excel or CSV file.", variant: "error" });
      return;
    }

    setFile(selectedFile);
    setParsedData(null);
    setSummary(null);
    setErrors([]);
    setWarnings([]);

    // Auto-parse file
    await parseFile(selectedFile);
  };

  const parseFile = async (fileToparse: File) => {
    setParsing(true);
    try {
      const result = await questionnairesApi.parseImportFile(fileToparse);

      if (result.success && result.data) {
        setParsedData(result.data);
        setSummary(result.summary || null);
        setErrors(result.errors || []);
        setWarnings(result.warnings || []);

        // Auto-expand first section
        if (result.data.length > 0) {
          setExpandedSections([result.data[0].title]);
        }

        if (result.errors && result.errors.length > 0) {
          toast({
            title: "Errors Found",
            description: `Found ${result.errors.length} errors. Please fix them before importing.`,
            variant: "error"
          });
        } else if (result.warnings && result.warnings.length > 0) {
          toast({
            title: "Parsed with Warnings",
            description: `Parsed successfully with ${result.warnings.length} warnings.`,
            variant: "warning"
          });
        } else {
          toast({ title: "Success", description: "File parsed successfully!", variant: "success" });
        }
      } else {
        toast({ title: "Error", description: result.error || "Failed to parse file", variant: "error" });
        setErrors([{ row: 0, error: result.error || "Unknown error" }]);
      }
    } catch (err) {
      console.error("Parse error:", err);
      toast({ title: "Error", description: "Failed to parse file. Please check the format.", variant: "error" });
    } finally {
      setParsing(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await questionnairesApi.downloadImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "questionnaire_import_template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Success", description: "Template downloaded!", variant: "success" });
    } catch (err) {
      console.error("Download error:", err);
      toast({ title: "Error", description: "Failed to download template", variant: "error" });
    }
  };

  const handleImport = async () => {
    if (!parsedData || errors.length > 0) return;

    setImporting(true);
    try {
      await onImport(parsedData);
      toast({
        title: "Success",
        description: `Successfully imported ${summary?.total_questions || 0} questions!`,
        variant: "success"
      });
      handleClose();
    } catch (err) {
      console.error("Import error:", err);
      toast({ title: "Error", description: "Failed to import questions", variant: "error" });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setSummary(null);
    setErrors([]);
    setWarnings([]);
    setExpandedSections([]);
    onClose();
  };

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionTitle)
        ? prev.filter((s) => s !== sectionTitle)
        : [...prev, sectionTitle]
    );
  };

  const getQuestionTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      radio: "Multiple Choice",
      checkbox: "Multi-Select",
      text: "Text Input",
      textarea: "Text Area",
      rating: "Rating",
      scale: "Slider",
      matrix: "Matrix",
      information: "Information",
    };
    return typeMap[type] || type;
  };

  const getQuestionTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      radio: "bg-blue-100 text-blue-700",
      checkbox: "bg-purple-100 text-purple-700",
      text: "bg-green-100 text-green-700",
      textarea: "bg-green-100 text-green-700",
      rating: "bg-yellow-100 text-yellow-700",
      scale: "bg-orange-100 text-orange-700",
      matrix: "bg-pink-100 text-pink-700",
      information: "bg-teal-100 text-teal-700",
    };
    return colorMap[type] || "bg-gray-100 text-gray-700";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Import Questions from Excel/CSV
              </h2>
              <p className="text-sm text-gray-500">
                Upload a file to bulk-create questions
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload Section */}
          {!parsedData && (
            <div className="space-y-6">
              {/* File Upload */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  file
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-300 hover:border-blue-400"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {parsing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                    <p className="text-gray-600">Parsing file...</p>
                  </div>
                ) : file ? (
                  <div className="flex flex-col items-center gap-3">
                    <FileText className="w-12 h-12 text-blue-500" />
                    <p className="text-gray-900 font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Choose different file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-12 h-12 text-gray-400" />
                    <div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Click to upload
                      </button>
                      <span className="text-gray-500"> or drag and drop</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Excel (.xlsx, .xls) or CSV files up to 10MB
                    </p>
                  </div>
                )}
              </div>

              {/* Download Template */}
              <div className="flex items-center justify-center">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download Sample Template
                </button>
              </div>
            </div>
          )}

          {/* Preview Section */}
          {parsedData && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {summary?.total_sections || 0}
                  </p>
                  <p className="text-sm text-blue-700">Sections</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {summary?.total_questions || 0}
                  </p>
                  <p className="text-sm text-green-700">Questions</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {summary?.total_options || 0}
                  </p>
                  <p className="text-sm text-purple-700">Options</p>
                </div>
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="font-medium text-red-700">
                      {errors.length} Error(s) Found
                    </span>
                  </div>
                  <ul className="space-y-1 text-sm text-red-600">
                    {errors.map((error, idx) => (
                      <li key={idx}>
                        {error.row > 0 && `Row ${error.row}: `}
                        {error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <span className="font-medium text-yellow-700">
                      {warnings.length} Warning(s)
                    </span>
                  </div>
                  <ul className="space-y-1 text-sm text-yellow-600">
                    {warnings.map((warning, idx) => (
                      <li key={idx}>
                        {warning.row && `Row ${warning.row}: `}
                        {warning.section && `[${warning.section}] `}
                        {warning.question && `"${warning.question}": `}
                        {warning.warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Tree */}
              <div className="border rounded-lg">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="font-medium text-gray-900">Preview</h3>
                </div>
                <div className="divide-y max-h-64 overflow-y-auto">
                  {parsedData.map((section, sIdx) => (
                    <div key={sIdx}>
                      {/* Section Header */}
                      <button
                        onClick={() => toggleSection(section.title)}
                        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        {expandedSections.includes(section.title) ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="font-medium text-gray-900">
                          {section.title}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({section.questions.length} questions)
                        </span>
                      </button>

                      {/* Questions */}
                      {expandedSections.includes(section.title) && (
                        <div className="bg-gray-50 px-4 py-2 space-y-2">
                          {section.questions.map((question, qIdx) => (
                            <div
                              key={qIdx}
                              className="bg-white rounded-lg p-3 border"
                            >
                              <div className="flex items-start gap-3">
                                <span className="text-sm text-gray-400 font-mono">
                                  Q{qIdx + 1}
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span
                                      className={`px-2 py-0.5 rounded text-xs font-medium ${getQuestionTypeColor(
                                        question.type
                                      )}`}
                                    >
                                      {getQuestionTypeLabel(question.type)}
                                    </span>
                                    {question.is_required && (
                                      <span className="text-red-500 text-xs">
                                        Required
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-900 text-sm">
                                    {question.title}
                                  </p>
                                  {question.options &&
                                    question.options.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {question.options.map((opt, oIdx) => (
                                          <span
                                            key={oIdx}
                                            className={`px-2 py-0.5 rounded text-xs ${
                                              opt.is_correct
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-100 text-gray-600"
                                            }`}
                                          >
                                            {opt.text}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Change File */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FileText className="w-4 h-4" />
                  {file?.name}
                </div>
                <button
                  onClick={() => {
                    setParsedData(null);
                    setFile(null);
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Choose different file
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!parsedData || errors.length > 0 || importing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              parsedData && errors.length === 0 && !importing
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Import {summary?.total_questions || 0} Questions
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
