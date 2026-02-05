'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Table, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ExportServiceProps {
  activityId: string;
  reportData: any;
  chartRef?: React.RefObject<HTMLDivElement>;
}

export default function ExportService({ activityId, reportData, chartRef }: ExportServiceProps) {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const exportToPDF = async () => {
    setExporting(true);
    try {
      // Dynamic import for client-side only
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Add title
      pdf.setFontSize(20);
      pdf.text('QSights Report', pageWidth / 2, 20, { align: 'center' });
      
      // Add timestamp
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
      
      let yPosition = 40;

      // Capture chart if available
      if (chartRef?.current) {
        const canvas = await html2canvas(chartRef.current);
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (yPosition + imgHeight > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      }

      // Add summary statistics
      if (reportData?.summary) {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFontSize(14);
        pdf.text('Summary Statistics', 10, yPosition);
        yPosition += 8;
        
        pdf.setFontSize(10);
        Object.entries(reportData.summary).forEach(([key, value]) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`${key}: ${value}`, 15, yPosition);
          yPosition += 6;
        });
      }

      pdf.save(`qsights-report-${Date.now()}.pdf`);
      
      toast({
        title: 'Success',
        description: 'Report exported to PDF successfully',
      });
    } catch (error: any) {
      console.error('PDF export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export PDF: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      
      const workbook = XLSX.utils.book_new();
      
      // Add summary sheet
      if (reportData?.summary) {
        const summaryData = Object.entries(reportData.summary).map(([key, value]) => ({
          Metric: key,
          Value: value,
        }));
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      }

      // Add data sheet
      if (reportData?.data && Array.isArray(reportData.data)) {
        const dataSheet = XLSX.utils.json_to_sheet(reportData.data);
        XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');
      }

      // Add question analytics if available
      if (reportData?.questionAnalytics && Array.isArray(reportData.questionAnalytics)) {
        const analyticsSheet = XLSX.utils.json_to_sheet(reportData.questionAnalytics);
        XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Question Analytics');
      }

      XLSX.writeFile(workbook, `qsights-report-${Date.now()}.xlsx`);
      
      toast({
        title: 'Success',
        description: 'Report exported to Excel successfully',
      });
    } catch (error: any) {
      console.error('Excel export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export Excel: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = () => {
    setExporting(true);
    try {
      if (!reportData?.data || !Array.isArray(reportData.data) || reportData.data.length === 0) {
        throw new Error('No data available to export');
      }

      const data = reportData.data;
      const headers = Object.keys(data[0]);
      
      let csv = headers.join(',') + '\n';
      
      data.forEach((row: any) => {
        const values = headers.map((header) => {
          const value = row[header];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        });
        csv += values.join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `qsights-report-${Date.now()}.csv`;
      link.click();
      
      toast({
        title: 'Success',
        description: 'Report exported to CSV successfully',
      });
    } catch (error: any) {
      console.error('CSV export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export CSV: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToJSON = () => {
    setExporting(true);
    try {
      const jsonString = JSON.stringify(reportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `qsights-report-${Date.now()}.json`;
      link.click();
      
      toast({
        title: 'Success',
        description: 'Report exported to JSON successfully',
      });
    } catch (error: any) {
      console.error('JSON export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export JSON: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={exporting || !reportData}>
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          <Table className="w-4 h-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToJSON}>
          <FileText className="w-4 h-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
