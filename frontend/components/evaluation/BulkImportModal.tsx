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
    const csvContent = `Department,Role,Staff
ITES,AGM,"Yash, Ram, Richa"
ITES,AVP,"Lokesh, Rachita"
ITES,Leads,"Arun, Ashwin"
Sales,Manager,"John, Sarah"
Sales,Executive,"Mike, Lisa, Tom"
HR,Head,"Emma"
HR,Recruiter,"David, Anna"`;

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
    const csvContent = `Department,Role,Staff
ITES,AGM,"Yash, Ram, Richa"
ITES,AVP,"Lokesh, Rachita"
ITES,Leads,"Arun, Ashwin"
Sales,Manager,"John, Sarah"
Sales,Executive,"Mike, Lisa, Tom"
HR,Head,"Emma"
HR,Recruiter,"David, Anna"

Instructions:
1. Department column: Enter unique department names. Same department name for roles under it.
2. Role column: Enter role names under each department.
3. Staff column: Enter staff names separated by commas. Format: "Name1, Name2, Name3"
4. You can have multiple roles per department.
5. Save as CSV before uploading.`;

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Import - Department, Role & Staff
          </DialogTitle>
          <DialogDescription>
            Import multiple departments, roles, and staff members from a CSV file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Download Sample Section */}
          <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Step 1: Download Sample Template
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Download the sample CSV/Excel template to see the required format
            </p>
            <div className="flex gap-2">
              <Button onClick={downloadSampleCSV} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download CSV Sample
              </Button>
              <Button onClick={downloadSampleExcel} variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Download Excel Template
              </Button>
            </div>
          </div>

          {/* Format Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>CSV Format:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• <strong>Column 1 (Department):</strong> Department name (same name for multiple roles)</li>
                <li>• <strong>Column 2 (Role):</strong> Role name within the department</li>
                <li>• <strong>Column 3 (Staff):</strong> Staff names separated by commas: "Name1, Name2, Name3"</li>
              </ul>
              <p className="mt-2 text-sm font-medium">Example:</p>
              <pre className="mt-1 text-xs bg-gray-100 p-2 rounded">
ITES,AGM,"Yash, Ram, Richa"{'\n'}
ITES,AVP,"Lokesh, Rachita"{'\n'}
ITES,Leads,"Arun, Ashwin"
              </pre>
            </AlertDescription>
          </Alert>

          {/* Upload Section */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Step 2: Upload Your CSV File
            </h3>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {selectedFile ? 'Change File' : 'Select CSV File'}
              </Button>
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {selectedFile.name}
                </div>
              )}
            </div>
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full"
            size="lg"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </>
            )}
          </Button>

          {/* Import Result */}
          {importResult && (
            <div className={`border rounded-lg p-4 ${importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start gap-2">
                {importResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 className={`font-semibold ${importResult.success ? 'text-green-900' : 'text-red-900'}`}>
                    {importResult.success ? 'Import Successful!' : 'Import Failed'}
                  </h4>
                  <p className={`text-sm mt-1 ${importResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {importResult.summary}
                  </p>
                  {importResult.success && (
                    <div className="mt-2 space-y-1 text-sm text-green-700">
                      <div>✓ Created {importResult.created.departments} departments</div>
                      <div>✓ Created {importResult.created.roles} roles</div>
                      <div>✓ Created {importResult.created.staff} staff members</div>
                    </div>
                  )}
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-800">Errors:</p>
                      <ul className="mt-1 space-y-1 text-sm text-red-700">
                        {importResult.errors.map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
