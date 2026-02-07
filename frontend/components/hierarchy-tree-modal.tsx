import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Users, ChevronRight, ChevronDown, UserCheck, User } from "lucide-react";
import { API_URL } from "@/lib/api";
import { toast } from "@/components/ui/toast";

interface TreeNode {
  id: number;
  name: string;
  email: string;
  role: string;
  role_code: string;
  is_manager: boolean;
  hierarchy_level: number;
  direct_reports_count: number;
  children?: TreeNode[];
}

interface HierarchyTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId: string;
  programName: string;
}

function TreeNodeComponent({ node, level = 0 }: { node: TreeNode; level?: number }) {
  const [expanded, setExpanded] = useState(level < 2); // Auto-expand first 2 levels

  const hasChildren = node.children && node.children.length > 0;
  const indentClass = `ml-${level * 6}`;

  return (
    <div className="mb-1">
      <div
        className={`flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
          level === 0 ? 'bg-blue-50 border border-blue-200' : 'border border-gray-200'
        }`}
        style={{ marginLeft: `${level * 24}px` }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>
        ) : (
          <div className="w-6" /> // Spacer
        )}

        {/* User Icon */}
        <div className={`p-2 rounded-full ${node.is_manager ? 'bg-blue-100' : 'bg-gray-100'} flex-shrink-0`}>
          {node.is_manager ? (
            <UserCheck className="w-4 h-4 text-blue-600" />
          ) : (
            <User className="w-4 h-4 text-gray-600" />
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-gray-900 truncate">
              {node.name}
            </p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                node.is_manager
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {node.role}
            </span>
          </div>
          <p className="text-xs text-gray-600 truncate">{node.email}</p>
        </div>

        {/* Team Size Badge */}
        {hasChildren && (
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full flex-shrink-0">
            <Users className="w-3 h-3 text-gray-600" />
            <span className="text-xs font-medium text-gray-700">
              {node.direct_reports_count}
            </span>
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="mt-1">
          {node.children!.map((child) => (
            <TreeNodeComponent key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HierarchyTreeModal({
  isOpen,
  onClose,
  programId,
  programName,
}: HierarchyTreeModalProps) {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [managersCount, setManagersCount] = useState(0);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  };

  useEffect(() => {
    if (isOpen) {
      loadTreeData();
    }
  }, [isOpen, programId]);

  const loadTreeData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(
        `${API_URL}/hierarchy/programs/${programId}/tree`,
        { headers, credentials: 'include' }
      );

      const data = await response.json();

      if (data.success) {
        setTreeData(data.tree || []);
        
        // Calculate statistics
        const countUsers = (nodes: TreeNode[]): { total: number; managers: number } => {
          let total = 0;
          let managers = 0;
          
          nodes.forEach(node => {
            total++;
            if (node.is_manager) managers++;
            
            if (node.children) {
              const childStats = countUsers(node.children);
              total += childStats.total;
              managers += childStats.managers;
            }
          });
          
          return { total, managers };
        };
        
        const stats = countUsers(data.tree || []);
        setTotalUsers(stats.total);
        setManagersCount(stats.managers);
      } else {
        throw new Error(data.message || 'Failed to load hierarchy tree');
      }
    } catch (error: any) {
      console.error('Error loading tree:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load hierarchy tree",
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const expandAll = () => {
    // Trigger re-render with expanded state
    setTreeData([...treeData]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Organizational Hierarchy - {programName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm text-gray-600">Loading hierarchy tree...</p>
          </div>
        ) : (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-900">Total Users</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{totalUsers}</p>
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-900">Managers</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{managersCount}</p>
              </div>
              
              <div className="p-4 bg-qsights-light border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-qsights-cyan" />
                  <span className="text-xs font-semibold text-purple-900">Team Members</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">{totalUsers - managersCount}</p>
              </div>
            </div>

            {/* Tree View */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
              {treeData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hierarchy data available for this program</p>
                  <p className="text-sm mt-1">Start by assigning managers to users</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {treeData.map((rootNode) => (
                    <TreeNodeComponent key={rootNode.id} node={rootNode} level={0} />
                  ))}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
              <span className="font-semibold text-gray-700">Legend:</span>
              <div className="flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-blue-600" />
                <span className="text-gray-600">Manager</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 text-gray-600" />
                <span className="text-gray-600">Team Member</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-gray-600" />
                <span className="text-gray-600">Direct Reports</span>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={loadTreeData}
            disabled={loading}
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              'Refresh'
            )}
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
