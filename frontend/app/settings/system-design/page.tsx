"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Download,
  PlayCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Shield,
  RefreshCw,
  BookOpen,
  Layers,
  Lock,
  Settings,
  Server,
  Code,
  FileCode,
  GitBranch,
  ListChecks,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface SDDData {
  version: string;
  generated_at: string;
  introduction: any;
  architecture: any;
  dataSecurity: any;
  database: any;
  serverSetup: any;
  apis: any;
  technology: any;
  appendix: any;
}

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
  error?: string;
}

interface SchemaIssue {
  table: string;
  column: string;
  issue: string;
  severity: string;
}

export default function SystemDesignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sddData, setSDDData] = useState<SDDData | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testRunning, setTestRunning] = useState(false);
  const [schemaValidation, setSchemaValidation] = useState<any>(null);
  const [validatingSchema, setValidatingSchema] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [rollbackProcedures, setRollbackProcedures] = useState<any>(null);
  const [criticalFeatures, setCriticalFeatures] = useState<any>(null);

  useEffect(() => {
    loadSDDData();
    loadCriticalFeatures();
    loadRollbackProcedures();
  }, []);

  const loadSDDData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system-design/data');
      if (response.ok) {
        const result = await response.json();
        setSDDData(result.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load SDD data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading SDD:", error);
      toast({
        title: "Error",
        description: "Failed to load SDD data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCriticalFeatures = async () => {
    try {
      const response = await fetch('/api/system-design/critical-features');
      if (response.ok) {
        const result = await response.json();
        setCriticalFeatures(result.data);
      }
    } catch (error) {
      console.error("Error loading critical features:", error);
    }
  };

  const loadRollbackProcedures = async () => {
    try {
      const response = await fetch('/api/system-design/rollback-procedures');
      if (response.ok) {
        const result = await response.json();
        setRollbackProcedures(result.data);
      }
    } catch (error) {
      console.error("Error loading rollback procedures:", error);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      setGeneratingPDF(true);
      
      // Fetch PDF directly
      const response = await fetch('/api/system-design/generate-pdf', {
        method: 'POST',
      });
      
      if (response.ok) {
        // Check if response is PDF or JSON
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/pdf')) {
          // Handle PDF download
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `QSights_SDD_${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          
          toast({
            title: "Success",
            description: "SDD PDF downloaded successfully",
            variant: "default",
          });
        } else {
          // Handle JSON response (fallback)
          const result = await response.json();
          
          if (result.data) {
            // Download as JSON
            const jsonData = JSON.stringify(result.data, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `QSights_SDD_v${result.data.version}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            toast({
              title: "Success",
              description: "SDD data downloaded as JSON",
              variant: "default",
            });
          } else if (result.download_url) {
            window.location.href = result.download_url;
            toast({
              title: "Success",
              description: "SDD PDF generated successfully",
              variant: "default",
            });
          }
        }
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate SDD PDF",
        variant: "destructive",
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleRunTests = async () => {
    try {
      setTestRunning(true);
      setTestResults([]);
      
      const response = await fetch('/api/system-design/run-tests', {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        setTestResults(result.data.tests);
        
        const allPassed = result.data.overall_status === 'PASSED';
        toast({
          title: allPassed ? "All Tests Passed" : "Some Tests Failed",
          description: allPassed 
            ? "All pre-deployment tests completed successfully" 
            : "Some tests failed. Review results below.",
          variant: allPassed ? "default" : "destructive",
        });
      } else {
        throw new Error('Failed to run tests');
      }
    } catch (error) {
      console.error("Error running tests:", error);
      toast({
        title: "Error",
        description: "Failed to run pre-deployment tests",
        variant: "destructive",
      });
    } finally {
      setTestRunning(false);
    }
  };

  const handleValidateSchema = async () => {
    try {
      setValidatingSchema(true);
      setSchemaValidation(null);
      
      const response = await fetch('/api/system-design/validate-schema', {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        setSchemaValidation(result.data);
        
        const isValid = result.data.valid;
        toast({
          title: isValid ? "Schema Valid" : "Schema Issues Found",
          description: isValid 
            ? "Database schema is consistent with migrations" 
            : `Found ${result.data.issues.length} schema issue(s)`,
          variant: isValid ? "default" : "destructive",
        });
      } else {
        throw new Error('Failed to validate schema');
      }
    } catch (error) {
      console.error("Error validating schema:", error);
      toast({
        title: "Error",
        description: "Failed to validate schema",
        variant: "destructive",
      });
    } finally {
      setValidatingSchema(false);
    }
  };

  if (loading) {
    return (
      <RoleBasedLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Design Document</h1>
            <p className="text-gray-600 mt-1">Loading system documentation...</p>
          </div>
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">Loading SDD...</p>
          </div>
        </div>
      </RoleBasedLayout>
    );
  }

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <a 
          href="/settings" 
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </a>

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Design Document (SDD)</h1>
            <p className="text-gray-600 mt-1">
              Complete system documentation with engineering governance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={loadSDDData}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button 
              onClick={handleGeneratePDF}
              disabled={generatingPDF}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              {generatingPDF ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </div>

        {/* Version Info */}
        {sddData && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="font-semibold text-gray-900">
                      Version {sddData.version}
                    </p>
                    <p className="text-sm text-gray-600">
                      Generated: {new Date(sddData.generated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">AUTO-MAINTAINED</p>
                  <p className="text-xs font-medium text-blue-600">Always Current</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Governance Warning */}
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-900 mb-1">STRICT GOVERNANCE RULES</h3>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• No SDD update → No merge</li>
                  <li>• No tests → No deployment</li>
                  <li>• Schema mismatch → Hard stop</li>
                  <li>• No rollback plan → Block release</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="sdd" className="space-y-6">
          <TabsList className="inline-flex h-auto items-center justify-start rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 p-1.5 text-gray-600 shadow-inner border border-gray-200 flex-wrap gap-1">
            <TabsTrigger 
              value="sdd" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-100 hover:text-gray-900"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              SDD Content
            </TabsTrigger>
            <TabsTrigger 
              value="features" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-qsights-cyan data-[state=active]:shadow-lg data-[state=active]:shadow-purple-100 hover:text-gray-900"
            >
              <ListChecks className="w-4 h-4 mr-2" />
              Critical Features
            </TabsTrigger>
            <TabsTrigger 
              value="tests" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-lg data-[state=active]:shadow-green-100 hover:text-gray-900"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Pre-Deployment Tests
            </TabsTrigger>
            <TabsTrigger 
              value="schema" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-lg data-[state=active]:shadow-orange-100 hover:text-gray-900"
            >
              <Database className="w-4 h-4 mr-2" />
              Schema Validation
            </TabsTrigger>
            <TabsTrigger 
              value="rollback" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-lg data-[state=active]:shadow-red-100 hover:text-gray-900"
            >
              <GitBranch className="w-4 h-4 mr-2" />
              Rollback Procedures
            </TabsTrigger>
          </TabsList>

          {/* SDD Content Tab */}
          <TabsContent value="sdd" className="space-y-6">
            {sddData && (
              <>
                {/* Introduction */}
                <Card>
                  <CardHeader className="border-b border-gray-200">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      1. Introduction
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="p-4 bg-gradient-to-r from-qsights-light to-cyan-50 border-2 border-blue-300 rounded-lg mb-4">
                      <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        📘 About This System Design Document
                      </h3>
                      <p className="text-sm text-blue-800 mb-2">
                        This SDD is <strong>auto-generated</strong> from the QSights platform and serves as a <strong>living documentation system</strong>. 
                        It demonstrates how modern applications can maintain up-to-date technical documentation through introspection and metadata extraction.
                      </p>
                      <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                        <p className="text-xs font-semibold text-indigo-900 mb-1">🌐 Template for Global Tools:</p>
                        <p className="text-xs text-gray-700">
                          This documentation approach can be replicated for any Laravel/Next.js application. The SystemDesignController 
                          inspects the database schema, routes, and configuration to generate real-time documentation. Use this as a 
                          blueprint for implementing similar auto-documentation in your own projects.
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Purpose</h3>
                      <p className="text-sm text-gray-700">{sddData.introduction.purpose}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Scope</h3>
                      <p className="text-sm text-gray-700">{sddData.introduction.scope}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Architecture */}
                <Card>
                  <CardHeader className="border-b border-gray-200">
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-qsights-cyan" />
                      2. System Architecture
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Pattern</h3>
                      <p className="text-sm text-gray-700 mb-4">{sddData.architecture.pattern}</p>
                      {sddData.architecture.description && (
                        <p className="text-sm text-gray-600 mb-4">{sddData.architecture.description}</p>
                      )}
                    </div>

                    {/* Architecture Diagram */}
                    <div className="my-6 p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-purple-200 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-4 text-center">Client-Server Communication Flow</h4>
                      <div className="bg-white p-6 rounded-lg shadow-inner">
                        <div className="flex items-center justify-between max-w-4xl mx-auto">
                          {/* Client */}
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg flex items-center justify-center text-center p-2">
                              <span className="text-white font-bold text-sm">Client<br/>(Multi-Device)</span>
                            </div>
                            <p className="text-xs text-gray-600 text-center">iOS/Android<br/>Windows/Mac</p>
                          </div>

                          {/* Arrow 1 */}
                          <div className="flex flex-col items-center px-2">
                            <div className="text-xs font-medium text-blue-600 mb-1 whitespace-nowrap">HTTPS Request →</div>
                            <div className="w-16 h-1 bg-gradient-to-r from-blue-400 to-purple-400"></div>
                          </div>

                          {/* Web Service */}
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-lg flex items-center justify-center text-center p-2">
                              <span className="text-white font-bold text-sm">Web Service<br/>(PHP)</span>
                            </div>
                            <p className="text-xs text-gray-600 text-center">Laravel 11<br/>REST API</p>
                          </div>

                          {/* Arrow 2 */}
                          <div className="flex flex-col items-center px-2">
                            <div className="text-xs font-medium text-qsights-cyan mb-1 whitespace-nowrap">SQL Queries →</div>
                            <div className="w-16 h-1 bg-gradient-to-r from-purple-400 to-green-400"></div>
                          </div>

                          {/* Database */}
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg flex items-center justify-center text-center p-2">
                              <span className="text-white font-bold text-sm">Web-Server/<br/>MySQL DB</span>
                            </div>
                            <p className="text-xs text-gray-600 text-center">Aurora MySQL<br/>PostgreSQL Compatible</p>
                          </div>
                        </div>
                        
                        {/* Return flow */}
                        <div className="mt-6 flex justify-center">
                          <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-50 via-purple-50 to-blue-50 border-2 border-green-200 rounded-lg shadow-sm">
                            <span className="text-sm font-medium text-gray-700">← Data Returns</span>
                            <span className="text-sm font-medium text-gray-700">← JSON Response</span>
                            <span className="text-sm font-medium text-gray-700">← REST API</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">Frontend</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Framework: {sddData.architecture.frontend.framework}</li>
                          <li>• Language: {sddData.architecture.frontend.language}</li>
                          <li>• Styling: {sddData.architecture.frontend.styling}</li>
                        </ul>
                      </div>
                      <div className="p-4 bg-qsights-light border border-purple-200 rounded-lg">
                        <h4 className="font-semibold text-purple-900 mb-2">Backend</h4>
                        <ul className="text-sm text-purple-800 space-y-1">
                          <li>• Framework: {sddData.architecture.backend.framework}</li>
                          <li>• Language: {sddData.architecture.backend.language}</li>
                          <li>• Database: {sddData.architecture.backend.database}</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Data Security */}
                <Card>
                  <CardHeader className="border-b border-gray-200">
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-green-600" />
                      3. Data Security
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Encryption</h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• In Transit: {sddData.dataSecurity.encryption.in_transit}</li>
                          <li>• At Rest: {sddData.dataSecurity.encryption.at_rest}</li>
                          <li>• Passwords: {sddData.dataSecurity.encryption.passwords}</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Authorization</h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• Model: {sddData.dataSecurity.authorization.model}</li>
                          <li>• Roles: {sddData.dataSecurity.authorization.roles.length} defined</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Database Design */}
                <Card>
                  <CardHeader className="border-b border-gray-200">
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-orange-600" />
                      4. Database Design
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-orange-900">
                            {sddData.database.critical_note}
                          </p>
                          <div className="mt-3 pt-3 border-t border-orange-300">
                            <p className="text-sm font-semibold text-orange-900 mb-2">📊 About This System Design Document</p>
                            <p className="text-xs text-orange-800 mb-2">
                              This SDD is <strong>auto-generated</strong> from the live QSights application using introspection and metadata extraction. 
                              It serves as a template for documenting applications built with similar architecture.
                            </p>
                            <p className="text-xs text-orange-800">
                              <strong>For Full EER Diagram:</strong> Use database visualization tools like dbdiagram.io, DBeaver, MySQL Workbench, 
                              or pgAdmin to reverse-engineer and export complete schema diagrams with all {sddData.database.total_tables || '74+'} tables, 
                              columns, data types, and relationships.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Database Schema Visualization */}
                    <div className="my-6 p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-4 text-center">Entity Relationship Overview</h4>
                      <div className="bg-white p-6 rounded-lg shadow-inner">
                        <div className="grid grid-cols-4 gap-4">
                          {/* Organizations */}
                          <div className="flex flex-col gap-2">
                            <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg text-white text-center shadow-md">
                              <div className="font-bold text-sm">Organization</div>
                              <div className="text-xs mt-1 opacity-90">Root Entity</div>
                            </div>
                            <div className="text-center text-xs text-gray-600">↓ 1:N</div>
                            <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg text-white text-center shadow-md">
                              <div className="font-bold text-sm">Programs</div>
                              <div className="text-xs mt-1 opacity-90">Events</div>
                            </div>
                          </div>

                          {/* Programs to Activities */}
                          <div className="flex flex-col gap-2">
                            <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg text-white text-center shadow-md">
                              <div className="font-bold text-sm">Programs</div>
                              <div className="text-xs mt-1 opacity-90">Multi-type</div>
                            </div>
                            <div className="text-center text-xs text-gray-600">↓ 1:N</div>
                            <div className="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-lg text-white text-center shadow-md">
                              <div className="font-bold text-sm">Activities</div>
                              <div className="text-xs mt-1 opacity-90">Surveys/Polls</div>
                            </div>
                          </div>

                          {/* Activities to Questionnaires */}
                          <div className="flex flex-col gap-2">
                            <div className="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-lg text-white text-center shadow-md">
                              <div className="font-bold text-sm">Activities</div>
                              <div className="text-xs mt-1 opacity-90">Events</div>
                            </div>
                            <div className="text-center text-xs text-gray-600">↓ 1:N</div>
                            <div className="p-3 bg-gradient-to-br from-pink-400 to-pink-600 rounded-lg text-white text-center shadow-md">
                              <div className="font-bold text-sm">Questionnaires</div>
                              <div className="text-xs mt-1 opacity-90">Multi-lang</div>
                            </div>
                          </div>

                          {/* Questionnaires to Responses */}
                          <div className="flex flex-col gap-2">
                            <div className="p-3 bg-gradient-to-br from-pink-400 to-pink-600 rounded-lg text-white text-center shadow-md">
                              <div className="font-bold text-sm">Questions</div>
                              <div className="text-xs mt-1 opacity-90">Options</div>
                            </div>
                            <div className="text-center text-xs text-gray-600">↓ 1:N</div>
                            <div className="p-3 bg-gradient-to-br from-red-400 to-red-600 rounded-lg text-white text-center shadow-md">
                              <div className="font-bold text-sm">Responses</div>
                              <div className="text-xs mt-1 opacity-90 font-bold">BIGINT IDs</div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 grid grid-cols-3 gap-3">
                          <div className="p-2 bg-qsights-light border border-cyan-200 rounded text-center">
                            <div className="text-xs font-semibold text-indigo-900">Participants</div>
                            <div className="text-xs text-indigo-700">M:N with Activities</div>
                          </div>
                          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-center">
                            <div className="text-xs font-semibold text-yellow-900">Notifications</div>
                            <div className="text-xs text-yellow-700">1:N with Users</div>
                          </div>
                          <div className="p-2 bg-teal-50 border border-teal-200 rounded text-center">
                            <div className="text-xs font-semibold text-teal-900">Reports</div>
                            <div className="text-xs text-teal-700">Analytics Engine</div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 text-center">
                        <p className="text-xs text-gray-600">Total Tables: <span className="font-bold text-orange-600">{sddData.database.total_tables || '74+'}</span></p>
                        <p className="text-xs text-gray-500 mt-2">💡 Full EER Diagram: Use database visualization tools (dbdiagram.io, DBeaver, MySQL Workbench) to generate complete schema with all columns and constraints</p>
                      </div>
                    </div>

                    {/* Detailed Schema Information */}
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg mb-4">
                      <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        How to View Complete Database Schema
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
                        <div>
                          <p className="font-semibold text-blue-800 mb-2">🛠️ Recommended Tools:</p>
                          <ul className="space-y-1 text-xs">
                            <li>• <strong>dbdiagram.io</strong> - Online ER diagram tool (export from DB)</li>
                            <li>• <strong>DBeaver</strong> - Universal database client with ER diagrams</li>
                            <li>• <strong>MySQL Workbench</strong> - Generate visual schemas from live DB</li>
                            <li>• <strong>TablePlus</strong> - Modern database GUI with schema viewer</li>
                            <li>• <strong>pgAdmin</strong> - PostgreSQL administration with ER diagrams</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-semibold text-blue-800 mb-2">📋 Export Instructions:</p>
                          <ol className="space-y-1 text-xs list-decimal list-inside">
                            <li>Connect to production database (read-only access)</li>
                            <li>Use tool's "Generate ER Diagram" or "Reverse Engineer" feature</li>
                            <li>Export as PNG/PDF for documentation</li>
                            <li>Include in deployment packages</li>
                          </ol>
                          <p className="mt-2 text-xs bg-yellow-50 border border-yellow-200 rounded p-2">
                            <strong>Note:</strong> This SDD auto-generates from live database. For static ER diagrams, use the tools above to create visual documentation.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Key Tables</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {sddData.database.key_tables && Object.entries(sddData.database.key_tables).slice(0, 8).map(([table, description]: [string, any]) => (
                          <div key={table} className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-orange-300 transition-colors">
                            <p className="font-mono text-xs font-medium text-gray-900">{table}</p>
                            <p className="text-xs text-gray-600 mt-1">{description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Server Setup */}
                <Card>
                  <CardHeader className="border-b border-gray-200">
                    <CardTitle className="flex items-center gap-2">
                      <Server className="w-5 h-5 text-qsights-cyan" />
                      5. Server Setup & Security
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Production Environment</h4>
                      <div className="p-4 bg-qsights-light border border-cyan-200 rounded-lg">
                        <ul className="text-sm text-indigo-900 space-y-1">
                          <li>• Server: {sddData.serverSetup.environments.production.server}</li>
                          <li>• Frontend: {sddData.serverSetup.environments.production.frontend}</li>
                          <li>• Backend: {sddData.serverSetup.environments.production.backend}</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* APIs */}
                <Card>
                  <CardHeader className="border-b border-gray-200">
                    <CardTitle className="flex items-center gap-2">
                      <FileCode className="w-5 h-5 text-green-600" />
                      6. API Documentation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">API Overview</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Base URL: {sddData.apis.base_url}</li>
                        <li>• Authentication: {sddData.apis.authentication}</li>
                        <li>• Access Control: {sddData.apis.access_control}</li>
                        <li>• Rate Limiting: {sddData.apis.rate_limiting}</li>
                        <li>• Version: {sddData.apis.versioning}</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Response Format</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Success Response</p>
                          <pre className="text-xs text-gray-600 overflow-x-auto">
                            {sddData.apis.response_format.success_response}
                          </pre>
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Error Response</p>
                          <pre className="text-xs text-gray-600 overflow-x-auto">
                            {sddData.apis.response_format.error_response}
                          </pre>
                        </div>
                      </div>
                    </div>
                    {sddData.apis.endpoints && sddData.apis.endpoints.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          API Endpoints ({sddData.apis.endpoints.length} total)
                        </h4>
                        <p className="text-xs text-gray-600 mb-2">
                          Showing first 10 endpoints. Full API documentation available in system.
                        </p>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {sddData.apis.endpoints.slice(0, 10).map((endpoint: any, index: number) => (
                            <div key={index} className="p-2 bg-gray-50 border border-gray-200 rounded flex items-center gap-3">
                              <span className={`px-2 py-1 text-xs font-mono font-bold rounded ${
                                endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                                endpoint.method === 'POST' ? 'bg-green-100 text-green-700' :
                                endpoint.method === 'PUT' ? 'bg-orange-100 text-orange-700' :
                                endpoint.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {endpoint.method}
                              </span>
                              <span className="text-xs font-mono text-gray-700">{endpoint.path}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Technology Stack */}
                <Card>
                  <CardHeader className="border-b border-gray-200">
                    <CardTitle className="flex items-center gap-2">
                      <Code className="w-5 h-5 text-pink-600" />
                      7. Technology Stack
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
                        <h4 className="font-semibold text-pink-900 mb-2">Frontend</h4>
                        <ul className="text-sm text-pink-800 space-y-1">
                          {sddData.technology.frontend && Object.entries(sddData.technology.frontend).map(([tech, version]: [string, any]) => (
                            <li key={tech}>• {tech}: {version}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-4 bg-qsights-light border border-cyan-200 rounded-lg">
                        <h4 className="font-semibold text-indigo-900 mb-2">Backend</h4>
                        <ul className="text-sm text-indigo-800 space-y-1">
                          {sddData.technology.backend && Object.entries(sddData.technology.backend).map(([tech, version]: [string, any]) => (
                            <li key={tech}>• {tech}: {version}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-4 bg-qsights-light border border-purple-200 rounded-lg">
                        <h4 className="font-semibold text-purple-900 mb-2">Infrastructure</h4>
                        <ul className="text-sm text-purple-800 space-y-1">
                          {sddData.technology.infrastructure && Object.entries(sddData.technology.infrastructure).map(([tech, version]: [string, any]) => (
                            <li key={tech}>• {tech}: {version}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Critical Features Tab */}
          <TabsContent value="features" className="space-y-6">
            {criticalFeatures && (
              <>
                <Card className="border-red-200">
                  <CardHeader className="border-b border-red-200 bg-red-50">
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Critical Features (MUST ALWAYS WORK)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {criticalFeatures.critical && Array.isArray(criticalFeatures.critical) && criticalFeatures.critical.map((feature: any, index: number) => {
                        // Handle both object format and string format
                        const featureName = typeof feature === 'string' ? feature : feature.name || feature;
                        const featureId = typeof feature === 'object' ? feature.id : index;
                        const featureDescription = typeof feature === 'object' ? feature.description : '';
                        const featureImpact = typeof feature === 'object' ? feature.impact : 'HIGH';
                        const testingRequired = typeof feature === 'object' ? feature.testing_required : true;
                        
                        return (
                          <div key={featureId} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-red-900">{featureName}</h4>
                                {featureDescription && (
                                  <p className="text-sm text-red-800 mt-1">{featureDescription}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2">
                                  <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded">
                                    {featureImpact}
                                  </span>
                                  {testingRequired && (
                                    <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-1 rounded flex items-center gap-1">
                                      <PlayCircle className="w-3 h-3" />
                                      Testing Required
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200">
                  <CardHeader className="border-b border-gray-200 bg-gray-50">
                    <CardTitle className="flex items-center gap-2">
                      <ListChecks className="w-5 h-5 text-gray-600" />
                      Non-Critical Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {criticalFeatures.non_critical && Array.isArray(criticalFeatures.non_critical) && criticalFeatures.non_critical.map((feature: any, index: number) => {
                        // Handle both object format and string format
                        const featureName = typeof feature === 'string' ? feature : feature.name || feature;
                        const featureId = typeof feature === 'object' ? feature.id : index;
                        const featureDescription = typeof feature === 'object' ? feature.description : '';
                        const featureImpact = typeof feature === 'object' ? feature.impact : 'LOW';
                        
                        return (
                          <div key={featureId} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <h4 className="font-semibold text-gray-900">{featureName}</h4>
                            {featureDescription && (
                              <p className="text-sm text-gray-700 mt-1">{featureDescription}</p>
                            )}
                            <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded inline-block mt-2">
                              {featureImpact}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Pre-Deployment Tests Tab */}
          <TabsContent value="tests" className="space-y-6">
            <Card>
              <CardHeader className="border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <PlayCircle className="w-5 h-5 text-green-600" />
                    Pre-Deployment Testing
                  </CardTitle>
                  <Button
                    onClick={handleRunTests}
                    disabled={testRunning}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {testRunning ? 'Running Tests...' : 'Run All Tests'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">
                        Required Before Every Deployment
                      </p>
                      <p className="text-xs text-yellow-800 mt-1">
                        All tests must pass. Deployment MUST FAIL if any test fails or if tests are not executed.
                      </p>
                    </div>
                  </div>
                </div>

                {testResults.length > 0 && (
                  <div className="space-y-3">
                    {testResults.map((test, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-lg ${
                          test.passed
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {test.passed ? (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <h4 className={`font-semibold ${test.passed ? 'text-green-900' : 'text-red-900'}`}>
                                {test.name}
                              </h4>
                              <p className={`text-sm mt-1 ${test.passed ? 'text-green-800' : 'text-red-800'}`}>
                                {test.message}
                              </p>
                              {test.error && (
                                <p className="text-xs text-red-700 mt-2 font-mono bg-red-100 p-2 rounded">
                                  {test.error}
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded ${
                              test.passed
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {test.passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {testResults.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <PlayCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No tests run yet. Click "Run All Tests" to begin.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schema Validation Tab */}
          <TabsContent value="schema" className="space-y-6">
            <Card>
              <CardHeader className="border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-orange-600" />
                    Schema Safety Check
                  </CardTitle>
                  <Button
                    onClick={handleValidateSchema}
                    disabled={validatingSchema}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {validatingSchema ? 'Validating...' : 'Validate Schema'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg mb-6">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-900">
                        UUID ↔ BIGINT Mismatch Prevention
                      </p>
                      <p className="text-xs text-orange-800 mt-1">
                        Validates migrations against production schema. BLOCKS deployment if mismatch exists.
                      </p>
                    </div>
                  </div>
                </div>

                {schemaValidation && (
                  <div className="space-y-4">
                    <div
                      className={`p-4 border rounded-lg ${
                        schemaValidation.valid
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {schemaValidation.valid ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600" />
                        )}
                        <div>
                          <h4
                            className={`font-semibold ${
                              schemaValidation.valid ? 'text-green-900' : 'text-red-900'
                            }`}
                          >
                            {schemaValidation.valid ? 'Schema Valid' : 'Schema Issues Detected'}
                          </h4>
                          <p
                            className={`text-sm ${
                              schemaValidation.valid ? 'text-green-800' : 'text-red-800'
                            }`}
                          >
                            Checked: {new Date(schemaValidation.checked_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {schemaValidation.issues && schemaValidation.issues.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-red-900">Issues Found:</h4>
                        {schemaValidation.issues.map((issue: SchemaIssue, index: number) => (
                          <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-mono text-sm font-medium text-red-900">
                                  {issue.table}.{issue.column}
                                </p>
                                <p className="text-sm text-red-800 mt-1">{issue.issue}</p>
                              </div>
                              <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded">
                                {issue.severity}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!schemaValidation && (
                  <div className="text-center py-12 text-gray-500">
                    <Database className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No validation run yet. Click "Validate Schema" to begin.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rollback Procedures Tab */}
          <TabsContent value="rollback" className="space-y-6">
            {rollbackProcedures && (
              <>
                {Object.entries(rollbackProcedures).map(([key, procedure]: [string, any]) => (
                  <Card key={key} className="border-red-200">
                    <CardHeader className="border-b border-red-200 bg-red-50">
                      <CardTitle className="flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-red-600" />
                        {procedure.description || key}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {procedure.steps && Array.isArray(procedure.steps) ? (
                        <ol className="space-y-2">
                          {procedure.steps.map((step: string, index: number) => (
                            <li key={index} className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </span>
                              <span className="text-sm text-gray-700 pt-0.5">{step}</span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <div className="text-sm text-gray-600">
                          <p className="mb-2">Procedure details:</p>
                          <pre className="bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto text-xs">
                            {JSON.stringify(procedure, null, 2)}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </RoleBasedLayout>
  );
}
