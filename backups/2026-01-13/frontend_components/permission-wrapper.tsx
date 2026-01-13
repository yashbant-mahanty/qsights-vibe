// Permission wrapper component for conditional rendering based on user role

import React, { ReactNode } from 'react';
import { hasPermission, UserRole, type RolePermissions } from '@/lib/permissions';

interface PermissionWrapperProps {
  userRole: UserRole | null | undefined;
  resource: keyof RolePermissions;
  action: 'canCreate' | 'canEdit' | 'canDelete' | 'canView' | 'canExport' | 'canSendNotifications';
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionWrapper({
  userRole,
  resource,
  action,
  children,
  fallback = null,
}: PermissionWrapperProps) {
  if (!userRole) return <>{fallback}</>;
  
  const hasAccess = hasPermission(userRole, resource, action);
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

export default PermissionWrapper;
