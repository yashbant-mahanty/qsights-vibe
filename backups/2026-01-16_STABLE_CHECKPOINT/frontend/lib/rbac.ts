// Role-Based Access Control (RBAC) Utilities
// Defines permissions and access rules for different user roles

export type UserRole = 
  | 'super-admin'
  | 'admin'
  | 'program-admin'
  | 'program-manager'
  | 'program-moderator'
  | 'group-head'
  | 'participant';

export interface Permission {
  resource: string;
  actions: ('view' | 'create' | 'edit' | 'delete' | 'export')[];
}

// Define permissions for each role
export const rolePermissions: Record<UserRole, Permission[]> = {
  'super-admin': [
    { resource: '*', actions: ['view', 'create', 'edit', 'delete', 'export'] }, // Full access
  ],
  'admin': [
    { resource: 'organizations', actions: ['view', 'create', 'edit', 'delete'] },
    { resource: 'group-heads', actions: ['view', 'create', 'edit', 'delete'] },
    { resource: 'programs', actions: ['view', 'create', 'edit', 'delete'] },
    { resource: 'participants', actions: ['view', 'create', 'edit', 'delete'] },
    { resource: 'questionnaires', actions: ['view', 'create', 'edit', 'delete'] },
    { resource: 'activities', actions: ['view', 'create', 'edit', 'delete'] },
    { resource: 'reports', actions: ['view', 'export'] },
    { resource: 'notifications', actions: ['view', 'create'] },
  ],
  'program-admin': [
    { resource: 'programs', actions: ['view'] }, // Can view their assigned program only
    { resource: 'participants', actions: ['view', 'create', 'edit'] },
    { resource: 'questionnaires', actions: ['view', 'create', 'edit', 'delete'] },
    { resource: 'activities', actions: ['view', 'create', 'edit', 'delete'] },
    { resource: 'reports', actions: ['view', 'export'] },
    { resource: 'notifications', actions: ['view', 'create'] },
  ],
  'program-manager': [
    { resource: 'programs', actions: ['view'] }, // Can view their assigned program only
    { resource: 'participants', actions: ['view'] },
    { resource: 'questionnaires', actions: ['view', 'edit'] }, // Can edit questions but not create new
    { resource: 'activities', actions: ['view'] },
    { resource: 'reports', actions: ['view', 'export'] },
    { resource: 'notifications', actions: ['view', 'create'] },
  ],
  'program-moderator': [
    { resource: 'programs', actions: ['view'] }, // Can view their assigned program only
    { resource: 'activities', actions: ['view'] },
    { resource: 'reports', actions: ['view', 'export'] },
  ],
  'group-head': [
    { resource: 'programs', actions: ['view', 'create', 'edit'] },
    { resource: 'participants', actions: ['view', 'create', 'edit'] },
    { resource: 'questionnaires', actions: ['view'] },
    { resource: 'activities', actions: ['view'] },
    { resource: 'reports', actions: ['view', 'export'] },
  ],
  'participant': [
    { resource: 'activities', actions: ['view'] },
  ],
};

// Navigation items for each role
export const roleNavigation: Record<UserRole, Array<{
  label: string;
  href: string;
  icon: string;
  permission?: string;
}>> = {
  'super-admin': [
    { label: 'Dashboard', href: '/super-admin', icon: 'LayoutDashboard' },
    { label: 'Organizations', href: '/organizations', icon: 'Building2' },
    { label: 'Group Heads', href: '/group-heads', icon: 'Users' },
    { label: 'Programs', href: '/programs', icon: 'FolderTree' },
    { label: 'Participants', href: '/participants', icon: 'UserCheck' },
    { label: 'Questionnaires', href: '/questionnaires', icon: 'FileText' },
    { label: 'Events', href: '/activities', icon: 'Activity' },
    { label: 'Reports', href: '/reports', icon: 'BarChart3' },
    { label: 'Settings', href: '/settings', icon: 'Settings' },
  ],
  'admin': [
    { label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
    { label: 'Organizations', href: '/organizations', icon: 'Building2' },
    { label: 'Group Heads', href: '/group-heads', icon: 'Users' },
    { label: 'Programs', href: '/programs', icon: 'FolderTree' },
    { label: 'Participants', href: '/participants', icon: 'UserCheck' },
    { label: 'Questionnaires', href: '/questionnaires', icon: 'FileText' },
    { label: 'Events', href: '/activities', icon: 'Activity' },
    { label: 'Reports', href: '/reports', icon: 'BarChart3' },
    { label: 'Settings', href: '/settings', icon: 'Settings' },
  ],
  'program-admin': [
    { label: 'Dashboard', href: '/program-admin', icon: 'LayoutDashboard' },
    { label: 'Programs', href: '/programs', icon: 'FolderTree' },
    { label: 'Participants', href: '/participants', icon: 'UserCheck' },
    { label: 'Questionnaires', href: '/questionnaires', icon: 'FileText' },
    { label: 'Events', href: '/activities', icon: 'Activity' },
    { label: 'Reports', href: '/reports', icon: 'BarChart3' },
    { label: 'Settings', href: '/settings', icon: 'Settings' },
  ],
  'program-manager': [
    { label: 'Dashboard', href: '/program-manager', icon: 'LayoutDashboard' },
    { label: 'Programs', href: '/programs', icon: 'FolderTree' },
    { label: 'Participants', href: '/participants', icon: 'UserCheck' },
    { label: 'Questionnaires', href: '/questionnaires', icon: 'FileText' },
    { label: 'Events', href: '/activities', icon: 'Activity' },
    { label: 'Reports', href: '/reports', icon: 'BarChart3' },
    { label: 'Settings', href: '/settings', icon: 'Settings' },
  ],
  'program-moderator': [
    { label: 'Dashboard', href: '/program-moderator', icon: 'LayoutDashboard' },
    { label: 'Events', href: '/activities', icon: 'Activity' },
    { label: 'Reports', href: '/reports', icon: 'BarChart3' },
    { label: 'Settings', href: '/settings', icon: 'Settings' },
  ],
  'group-head': [
    { label: 'Dashboard', href: '/group-heads', icon: 'LayoutDashboard' },
    { label: 'Programs', href: '/programs', icon: 'FolderTree' },
    { label: 'Participants', href: '/participants', icon: 'UserCheck' },
    { label: 'Reports', href: '/reports', icon: 'BarChart3' },
    { label: 'Settings', href: '/settings', icon: 'Settings' },
  ],
  'participant': [
    { label: 'Dashboard', href: '/participant', icon: 'LayoutDashboard' },
    { label: 'My Activities', href: '/activities', icon: 'Activity' },
    { label: 'Settings', href: '/settings', icon: 'Settings' },
  ],
};

// Check if user has permission for a specific action on a resource
export function hasPermission(
  role: UserRole,
  resource: string,
  action: 'view' | 'create' | 'edit' | 'delete' | 'export'
): boolean {
  const permissions = rolePermissions[role];
  
  // Super admin has all permissions
  if (role === 'super-admin') return true;
  
  // Check for wildcard permission
  const wildcardPermission = permissions.find(p => p.resource === '*');
  if (wildcardPermission && wildcardPermission.actions.includes(action)) {
    return true;
  }
  
  // Check for specific resource permission
  const resourcePermission = permissions.find(p => p.resource === resource);
  return resourcePermission ? resourcePermission.actions.includes(action) : false;
}

// Get accessible navigation items for a role
export function getNavigationForRole(role: UserRole) {
  return roleNavigation[role] || [];
}

// Check if role is program-level (scoped to a specific program)
export function isProgramLevelRole(role: UserRole): boolean {
  return ['program-admin', 'program-manager', 'program-moderator'].includes(role);
}

// Build query parameters for program-level filtering
export function getProgramLevelFilters(userRole: UserRole, programId?: string): Record<string, string> {
  if (!isProgramLevelRole(userRole) || !programId) {
    return {};
  }
  
  return {
    program_id: programId,
  };
}

// Get redirect path after login based on role
export function getDefaultDashboard(role: UserRole): string {
  const dashboards: Record<UserRole, string> = {
    'super-admin': '/super-admin',
    'admin': '/admin',
    'program-admin': '/program-admin',
    'program-manager': '/program-manager',
    'program-moderator': '/program-moderator',
    'group-head': '/group-heads',
    'participant': '/participant',
  };
  
  return dashboards[role] || '/dashboard';
}
