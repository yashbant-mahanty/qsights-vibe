'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  success: boolean;
  created: {
    departments: number;
    roles: number;
    staff: number;
  };
  errors: string[];
  summary: string;
}

export default function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const downloadSampleCSV = () => {
    const csvContent = `Department,Role,Staff,Email
ITES,AGM,"Yash, Ram, Richa","yash@example.com, ram@example.com, richa@example.com"
ITES,AVP,"Lokesh, Rachita","lokesh@example.com, rachita@example.com"
ITES,Leads,"Arun, Ashwin","arun@example.com, ashwin@example.com"
Sales,Manager,"John, Sarah","john@example.com, sarah@example.com"
Sales,Executive,"Mike, Lisa, Tom","mike@example.com, lisa@example.com, tom@example.com"
HR,Head,"Emma","emma@example.com"
HR,Recruiter,"David, Anna","david@example.com, anna@example.com"`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'bulk_import_sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Sample Downloaded',
      description: 'Sample CSV file downloaded successfully. Fill in your data and upload it.',
    });
  };

  const downloadSampleExcel = () => {
    // For Excel, we'll download as CSV with instructions
    const csvContent = `Department,Role,Staff,Email
ITES,AGM,"Yash, Ram, Richa","yash@example.com, ram@example.com, richa@example.com"
ITES,AVP,"Lokesh, Rachita","lokesh@example.com, rachita@example.com"
ITES,Leads,"Arun, Ashwin","arun@example.com, ashwin@example.com"
Sales,Manager,"John, Sarah","john@example.com, sarah@example.com"
Sales,Executive,"Mike, Lisa, Tom","mike@example.com, lisa@example.com, tom@example.com"
HR,Head,"Emma","emma@example.com"
HR,Recruiter,"David, Anna","david@example.com, anna@example.com"

Instructions:
1. Department column: Enter unique department names. Same department name for roles under it.
2. Role column: Enter role names under each department.
3. Staff column: Enter staff names separated by commas. Format: "Name1, Name2, Name3"
4. Email column: Enter staff email addresses separated by commas (same order as names): "email1@domain.com, email2@domain.com"
5. Email addresses are used for sending notifications and reminders.
6. You can have multiple roles per department.
7. Save as CSV before uploading.`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'bulk_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Template Downloaded',
      description: 'Template CSV file downloaded. Open in Excel, fill data, and save as CSV.',
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setImportResult(null);
      } else {
        toast({
          title: 'Invalid File',
          description: 'Please select a CSV file (.csv)',
          variant: 'destructive',
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a CSV file to upload',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetchWithAuth('/evaluation/bulk-import', {
        method: 'POST',
        body: formData,
      });

      if (response.success) {
        setImportResult({
          success: true,
          created: response.created || { departments: 0, roles: 0, staff: 0 },
          errors: response.errors || [],
          summary: response.message || 'Import completed successfully',
        });

        toast({
          title: 'Import Successful',
          description: `Created ${response.created.departments} departments, ${response.created.roles} roles, and ${response.created.staff} staff members.`,
        });

        // Refresh parent data after a delay
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setImportResult({
          success: false,
          created: { departments: 0, roles: 0, staff: 0 },
          errors: [response.message || 'Import failed'],
          summary: response.message || 'Import failed. Please check your CSV format.',
        });

        toast({
          title: 'Import Failed',
          description: response.message || 'Please check your CSV format and try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        created: { departments: 0, roles: 0, staff: 0 },
        errors: [error.message || 'Failed to upload file'],
        summary: 'An error occurred during import',
      });

      toast({
        title: 'Upload Error',
        description: error.message || 'Failed to upload file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImportResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            Bulk Import - Department, Role & Staff
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Import multiple departments, roles, and staff members with their email addresses from a CSV file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-4">
          {/* Download Sample Section */}
          <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
              <h3 className="font-semibold text-white flex items-center gap-2 text-base">
                <Download className="w-4 h-4" />
                Step 1: Download Sample Template
              </h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700 mb-4">
                Download the sample template to see the required format before uploading your data
              </p>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={downloadSampleCSV} 
                  variant="outline" 
                  size="sm"
                  className="bg-white hover:bg-blue-50 border-blue-300 text-blue-700 font-medium"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Sample
                </Button>
                <Button 
                  onClick={downloadSampleExcel} 
                  variant="outline" 
                  size="sm"
                  className="bg-white hover:bg-blue-50 border-blue-300 text-blue-700 font-medium"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Download Excel Template
                </Button>
              </div>
            </div>
          </div>

          {/* Format Instructions */}
          <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3">
              <h3 className="font-semibold text-white flex items-center gap-2 text-base">
                <AlertCircle className="w-4 h-4" />
                CSV Format Requirements
              </h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-amber-200">
                    <p className="text-sm font-semibold text-gray-900 mb-1">Column 1: Department</p>
                    <p className="text-xs text-gray-600">Department name (same for multiple roles)</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-amber-200">
                    <p className="text-sm font-semibold text-gray-900 mb-1">Column 2: Role</p>
                    <p className="text-xs text-gray-600">Role name within the department</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-amber-200">
                    <p className="text-sm font-semibold text-gray-900 mb-1">Column 3: Staff</p>
                    <p className="text-xs text-gray-600">Comma-separated: "Name1, Name2, Name3"</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-amber-200">
                    <p className="text-sm font-semibold text-gray-900 mb-1">Column 4: Email</p>
                    <p className="text-xs text-gray-600">Comma-separated (same order as names)</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-amber-200">
                  <p className="text-xs font-semibold text-gray-900 mb-2">Example Format:</p>
                  <div className="bg-gray-50 rounded p-2 font-mono text-xs overflow-x-auto">
                    <div className="text-gray-800 whitespace-nowrap">
                      <div className="text-blue-600 font-semibold mb-1">Department,Role,Staff,Email</div>
                      <div>ITES,AGM,"Yash, Ram","yash@example.com, ram@example.com"</div>
                      <div>ITES,AVP,"Lokesh, Rachita","lokesh@example.com, rachita@example.com"</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-3">
              <h3 className="font-semibold text-white flex items-center gap-2 text-base">
                <Upload className="w-4 h-4" />
                Step 2: Upload Your CSV File
              </h3>
            </div>
            <div className="p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  disabled={uploading}
                  className="bg-white hover:bg-purple-50 border-purple-300 text-purple-700 font-medium"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {selectedFile ? 'Change File' : 'Select CSV File'}
                </Button>
                {selectedFile && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border-2 border-green-300">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{selectedFile.name}</span>
                      <span className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
            size="lg"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Importing Data...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Import Data
              </>
            )}
          </Button>

          {/* Import Result */}
          {importResult && (
            <div className={`rounded-xl border-2 overflow-hidden ${
              importResult.success 
                ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50' 
                : 'border-red-300 bg-gradient-to-br from-red-50 to-pink-50'
            }`}>
              <div className={`px-4 py-3 ${
                importResult.success 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                  : 'bg-gradient-to-r from-red-500 to-pink-600'
              }`}>
                <div className="flex items-center gap-2 text-white">
                  {importResult.success ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  <h4 className="font-semibold text-base">
                    {importResult.success ? 'Import Successful!' : 'Import Failed'}
                  </h4>
                </div>
              </div>
              <div className="p-4">
                <p className={`text-sm font-medium mb-3 ${
                  importResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {importResult.summary}
                </p>
                {importResult.success && (
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-white rounded-lg p-3 border-2 border-green-200 text-center">
                      <div className="text-2xl font-bold text-green-600">{importResult.created.departments}</div>
                      <div className="text-xs text-gray-600 mt-1">Departments</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border-2 border-green-200 text-center">
                      <div className="text-2xl font-bold text-green-600">{importResult.created.roles}</div>
                      <div className="text-xs text-gray-600 mt-1">Roles</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border-2 border-green-200 text-center">
                      <div className="text-2xl font-bold text-green-600">{importResult.created.staff}</div>
                      <div className="text-xs text-gray-600 mt-1">Staff</div>
                    </div>
                  </div>
                )}
                {importResult.errors.length > 0 && (
                  <div className="bg-white rounded-lg p-3 border-2 border-red-200">
                    <p className="text-sm font-semibold text-red-900 mb-2">Errors Found:</p>
                    <ul className="space-y-1">
                      {importResult.errors.map((error, idx) => (
                        <li key={idx} className="text-xs text-red-700 flex items-start gap-2">
                          <span className="text-red-500 font-bold">•</span>
                          <span>{error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
