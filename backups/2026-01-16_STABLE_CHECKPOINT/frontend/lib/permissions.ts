// Role-based permissions system for QSights

export type UserRole = 
  | 'super-admin'
  | 'admin'
  | 'program-admin'
  | 'program-manager'
  | 'program-moderator';

export interface Permission {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canView: boolean;
  canExport: boolean;
  canSendNotifications: boolean;
}

export interface RolePermissions {
  organizations: Permission;
  groupHeads: Permission;
  programs: Permission;
  participants: Permission;
  questionnaires: Permission;
  activities: Permission;
  reports: Permission;
  notifications: Permission;
}

// Default permission template
const noAccess: Permission = {
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canView: false,
  canExport: false,
  canSendNotifications: false,
};

const viewOnly: Permission = {
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canView: true,
  canExport: false,
  canSendNotifications: false,
};

const viewExport: Permission = {
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canView: true,
  canExport: true,
  canSendNotifications: false,
};

const fullAccess: Permission = {
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canView: true,
  canExport: true,
  canSendNotifications: true,
};

const manageAccess: Permission = {
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canView: true,
  canExport: true,
  canSendNotifications: true,
};

const editViewExport: Permission = {
  canCreate: false,
  canEdit: true,
  canDelete: false,
  canView: true,
  canExport: true,
  canSendNotifications: true,
};

// Role-based permission definitions
export const rolePermissions: Record<UserRole, RolePermissions> = {
  // Super Admin - Full access to everything
  'super-admin': {
    organizations: fullAccess,
    groupHeads: fullAccess,
    programs: fullAccess,
    participants: fullAccess,
    questionnaires: fullAccess,
    activities: fullAccess,
    reports: fullAccess,
    notifications: fullAccess,
  },

  // Admin - Similar to Super Admin (legacy role)
  'admin': {
    organizations: fullAccess,
    groupHeads: fullAccess,
    programs: fullAccess,
    participants: fullAccess,
    questionnaires: fullAccess,
    activities: fullAccess,
    reports: fullAccess,
    notifications: fullAccess,
  },

  // Program Admin - Full access within assigned program
  'program-admin': {
    organizations: noAccess,
    groupHeads: noAccess,
    programs: manageAccess, // Can create and manage programs
    participants: manageAccess,
    questionnaires: manageAccess,
    activities: manageAccess,
    reports: fullAccess,
    notifications: fullAccess,
  },

  // Program Manager - View and edit within assigned program, cannot create programs
  'program-manager': {
    organizations: noAccess,
    groupHeads: noAccess,
    programs: viewOnly, // Can only view, not create programs
    participants: viewExport,
    questionnaires: editViewExport, // Can add/edit questionnaires
    activities: editViewExport, // Can add/edit activities
    reports: viewExport,
    notifications: { ...viewExport, canSendNotifications: true },
  },

  // Program Moderator - View-only access, can only export reports
  'program-moderator': {
    organizations: noAccess,
    groupHeads: noAccess,
    programs: noAccess,
    participants: noAccess,
    questionnaires: noAccess,
    activities: viewOnly, // Can view activity reports
    reports: viewExport, // Can view and export reports
    notifications: noAccess,
  },
};

// Helper functions
export function hasPermission(
  role: UserRole,
  resource: keyof RolePermissions,
  action: keyof Permission
): boolean {
  const permissions = rolePermissions[role];
  if (!permissions) return false;
  
  const resourcePermission = permissions[resource];
  if (!resourcePermission) return false;
  
  return resourcePermission[action];
}

export function canAccessResource(role: UserRole, resource: keyof RolePermissions): boolean {
  return hasPermission(role, resource, 'canView');
}

export function canCreateResource(role: UserRole, resource: keyof RolePermissions): boolean {
  return hasPermission(role, resource, 'canCreate');
}

export function canEditResource(role: UserRole, resource: keyof RolePermissions): boolean {
  return hasPermission(role, resource, 'canEdit');
}

export function canDeleteResource(role: UserRole, resource: keyof RolePermissions): boolean {
  return hasPermission(role, resource, 'canDelete');
}

export function canExportResource(role: UserRole, resource: keyof RolePermissions): boolean {
  return hasPermission(role, resource, 'canExport');
}

export function canSendNotifications(role: UserRole): boolean {
  return hasPermission(role, 'notifications', 'canSendNotifications');
}

// Check if role is program-scoped (not super admin/admin)
export function isProgramScoped(role: UserRole): boolean {
  return ['program-admin', 'program-manager', 'program-moderator'].includes(role);
}

// Check if role has full system access
export function hasFullAccess(role: UserRole): boolean {
  return ['super-admin', 'admin'].includes(role);
}

// Get navigation items based on role
export function getNavigationItems(role: UserRole) {
  const items = [];

  // Dashboard - all roles except moderator have dashboard
  if (role === 'super-admin' || role === 'admin') {
    items.push({ label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' });
  } else if (role === 'program-admin') {
    items.push({ label: 'Dashboard', href: '/program-admin', icon: 'LayoutDashboard' });
  } else if (role === 'program-manager') {
    items.push({ label: 'Dashboard', href: '/program-manager', icon: 'LayoutDashboard' });
  } else if (role === 'program-moderator') {
    items.push({ label: 'Dashboard', href: '/program-moderator', icon: 'LayoutDashboard' });
  }

  // Organizations - only super admin/admin
  if (hasFullAccess(role)) {
    items.push({ label: 'Organizations', href: '/organizations', icon: 'Building2' });
  }

  // Group Heads - only super admin/admin
  if (hasFullAccess(role)) {
    items.push({ label: 'Group Heads', href: '/group-heads', icon: 'Users' });
  }

  // Programs - super admin, admin, program admin can manage; program manager can view
  if (canAccessResource(role, 'programs')) {
    items.push({ label: 'Programs', href: '/programs', icon: 'FolderTree' });
  }

  // Participants - all except moderator
  if (canAccessResource(role, 'participants')) {
    items.push({ label: 'Participants', href: '/participants', icon: 'UserCheck' });
  }

  // Questionnaires - all except moderator
  if (canAccessResource(role, 'questionnaires')) {
    items.push({ label: 'Questionnaires', href: '/questionnaires', icon: 'FileText' });
  }

  // Activities - all roles can access
  if (canAccessResource(role, 'activities')) {
    items.push({ label: 'Events', href: '/activities', icon: 'Activity' });
  }

  // Roles & Services - only super-admin and program-admin
  if (role === 'super-admin' || role === 'program-admin') {
    items.push({ label: 'Roles & Services', href: '/program-admin/roles', icon: 'UserCog' });
  }

  // Reports & Analytics - all roles can access
  if (canAccessResource(role, 'reports')) {
    items.push({ label: 'Reports & Analytics', href: '/analytics', icon: 'BarChart3' });
  }

  // Settings - only super-admin
  if (role === 'super-admin') {
    items.push({ label: 'Settings', href: '/settings', icon: 'Settings' });
  }

  return items;
}

// Get role display name
export function getRoleDisplayName(role: UserRole): string {
  const roleMap: Record<UserRole, string> = {
    'super-admin': 'Super Admin',
    'admin': 'Admin',
    'program-admin': 'Program Admin',
    'program-manager': 'Program Manager',
    'program-moderator': 'Program Moderator',
  };
  return roleMap[role] || role;
}
