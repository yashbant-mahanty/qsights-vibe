// Role-based permissions system for QSights

export type UserRole = 
  | 'super-admin'
  | 'admin'
  | 'program-admin'
  | 'program-manager'
  | 'program-moderator'
  | 'evaluation-admin'
  | 'evaluation-staff'
  | 'evaluation_staff'; // Database uses underscore

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
// IMPORTANT: Default Program roles follow specific rules:
// - Program Admin: Full access within assigned program (like Super Admin but scoped)
// - Program Manager: View/Edit but NO Create/Delete for questionnaires & events
// - Program Moderator: View-only for events and reports
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

  // Program Admin - Full access within assigned program (like Super Admin but program-scoped)
  'program-admin': {
    organizations: noAccess,
    groupHeads: noAccess,
    programs: fullAccess, // Full access to programs within scope
    participants: manageAccess,
    questionnaires: fullAccess, // Full access like Super Admin (program-scoped)
    activities: fullAccess, // Full access like Super Admin (program-scoped)
    reports: fullAccess,
    notifications: fullAccess,
  },

  // Program Manager - View and edit, but CANNOT create/delete questionnaires & events
  'program-manager': {
    organizations: noAccess,
    groupHeads: noAccess,
    programs: viewOnly, // Can only view, not create programs
    participants: viewExport,
    questionnaires: editViewExport, // Can edit/view but NOT create/delete
    activities: editViewExport, // Can edit/view but NOT create/delete
    reports: viewExport,
    notifications: { ...viewExport, canSendNotifications: true },
  },

  // Program Moderator - View-only access to events and reports
  'program-moderator': {
    organizations: noAccess,
    groupHeads: noAccess,
    programs: noAccess,
    participants: noAccess,
    questionnaires: noAccess,
    activities: viewOnly, // Can view event reports only
    reports: viewExport, // Can view and export reports
    notifications: noAccess,
  },

  // Evaluation Admin - Questionnaire & Evaluation full access, Org/Program view-only, NO Events access
  'evaluation-admin': {
    organizations: viewOnly, // View only
    groupHeads: noAccess,
    programs: viewOnly, // View only
    participants: viewExport, // Can view participants
    questionnaires: fullAccess, // Full access
    activities: noAccess, // NO access to events/activities
    reports: { ...viewExport, canExport: true }, // View and export
    notifications: { ...viewExport, canSendNotifications: true },
  },

  // Evaluation Staff - Can take evaluations assigned to them
  'evaluation-staff': {
    organizations: noAccess,
    groupHeads: noAccess,
    programs: viewOnly,
    participants: noAccess,
    questionnaires: viewOnly,
    activities: viewOnly,
    reports: viewOnly,
    notifications: noAccess,
  },

  // Evaluation Staff (underscore variant)
  'evaluation_staff': {
    organizations: noAccess,
    groupHeads: noAccess,
    programs: viewOnly,
    participants: noAccess,
    questionnaires: viewOnly,
    activities: viewOnly,
    reports: viewOnly,
    notifications: noAccess,
  },

  // Evaluation Staff - Access to evaluation dashboards only
  'evaluation-staff': {
    organizations: noAccess,
    groupHeads: noAccess,
    programs: noAccess,
    participants: noAccess,
    questionnaires: noAccess,
    activities: noAccess,
    reports: viewOnly, // Can view their own reports
    notifications: noAccess,
  },

  // Evaluation Staff (underscore variant from database)
  'evaluation_staff': {
    organizations: noAccess,
    groupHeads: noAccess,
    programs: noAccess,
    participants: noAccess,
    questionnaires: noAccess,
    activities: noAccess,
    reports: viewOnly, // Can view their own reports
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

// Helper to check if role is evaluation staff (handles both hyphen and underscore)
function isEvaluationStaff(role: string): boolean {
  return role === 'evaluation-staff' || role === 'evaluation_staff';
}

// Get navigation items based on role and services (for custom roles)
export function getNavigationItems(role: UserRole, services?: string[]) {
  const items = [];

  // Helper function to check if service is allowed
  const hasService = (serviceId: string) => {
    // If no services specified or user is super-admin/admin, allow all
    if (!services || services.length === 0 || hasFullAccess(role)) {
      return true;
    }
    return services.includes(serviceId);
  };

  // Evaluation Staff only gets Evaluation navigation item - no Dashboard
  if (isEvaluationStaff(role)) {
    items.push({ label: 'Evaluation', href: '/evaluation-new', icon: 'ClipboardCheck' });
    return items; // Return early - evaluation staff only sees Evaluation
  }

  // Dashboard - all roles except moderator have dashboard
  if (hasService('dashboard')) {
    if (role === 'super-admin' || role === 'admin') {
      items.push({ label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' });
    } else if (role === 'program-admin') {
      items.push({ label: 'Dashboard', href: '/program-admin', icon: 'LayoutDashboard' });
    } else if (role === 'program-manager') {
      items.push({ label: 'Dashboard', href: '/program-manager', icon: 'LayoutDashboard' });
    } else if (role === 'program-moderator') {
      items.push({ label: 'Dashboard', href: '/program-moderator', icon: 'LayoutDashboard' });
    } else if (role === 'evaluation-admin') {
      items.push({ label: 'Dashboard', href: '/evaluation-admin', icon: 'LayoutDashboard' });
    }
  }

  // Organizations - super admin/admin have full access, program-admin and evaluation-admin have view-only
  if (hasFullAccess(role) && hasService('list_organization')) {
    items.push({ label: 'Organizations', href: '/organizations', icon: 'Building2' });
  } else if ((role === 'program-admin' || role === 'evaluation-admin') && hasService('list_organization')) {
    items.push({ label: 'Organizations', href: '/organizations', icon: 'Building2' });
  }

  // Group Heads - only super admin/admin
  if (hasFullAccess(role)) {
    items.push({ label: 'Group Heads', href: '/group-heads', icon: 'Users' });
  }

  // Programs - super admin, admin, program admin can manage; program manager can view; evaluation-admin can view
  if (canAccessResource(role, 'programs') && hasService('list_programs')) {
    items.push({ label: 'Programs', href: '/programs', icon: 'FolderTree' });
  }

  // Participants - all except moderator and evaluation-admin
  if (role !== 'evaluation-admin' && canAccessResource(role, 'participants') && (hasService('list_participants') || hasService('list_program_participants'))) {
    items.push({ label: 'Participants', href: '/participants', icon: 'UserCheck' });
  }

  // Questionnaires - all roles can access (full for evaluation-admin)
  if (canAccessResource(role, 'questionnaires') && (hasService('question_list') || hasService('category_list') || hasService('question_bank_list'))) {
    items.push({ label: 'Questionnaires', href: '/questionnaires', icon: 'FileText' });
  }

  // Activities - all roles can access, including evaluation-admin
  if (canAccessResource(role, 'activities') && hasService('list_activity')) {
    items.push({ label: 'Events', href: '/activities', icon: 'Activity' });
  }

  // Roles & Services - only super-admin and program-admin
  if (role === 'super-admin' || role === 'program-admin') {
    items.push({ label: 'Roles & Services', href: '/program-admin/roles', icon: 'UserCog' });
  }

  // Reports & Analytics - all roles can access, including evaluation-admin
  if (canAccessResource(role, 'reports') && (hasService('view_report') || hasService('report_download') || hasService('filter_report'))) {
    items.push({ label: 'Reports & Analytics', href: '/analytics', icon: 'BarChart3' });
  }

  // AI Report Builder - service-based access (typically super-admin, admin, program-admin)
  if (hasService('ai-reports-view') || hasService('report-builder-view')) {
    items.push({ label: 'AI Reports', href: '/report-builder', icon: 'Brain' });
  }

  // Evaluation Module - evaluation-admin has full access
  // Note: evaluation-staff is handled at the top of this function with early return
  // Super-admin and admin have access to everything by default
  if (hasService('list_evaluation') || hasService('add_evaluation') || hasService('edit_evaluation')) {
    if (role === 'super-admin' || role === 'admin' || role === 'evaluation-admin') {
      items.push({ label: 'Evaluation', href: '/evaluation-new', icon: 'ClipboardCheck' });
    }
  }

  // Settings - only super-admin
  if (role === 'super-admin') {
    items.push({ label: 'Settings', href: '/settings', icon: 'Settings' });
  }

  return items;
}

// Get role display name
export function getRoleDisplayName(role: UserRole): string {
  const roleMap: Record<string, string> = {
    'super-admin': 'Super Admin',
    'admin': 'Admin',
    'program-admin': 'Program Admin',
    'program-manager': 'Program Manager',
    'program-moderator': 'Program Moderator',
    'evaluation-staff': 'Evaluation Staff',
    'evaluation_staff': 'Evaluation Staff', // Database uses underscore
  };
  return roleMap[role] || role;
}

// ==========================================
// PROGRAM-SCOPED ROLE HELPERS
// ==========================================

// Program-scoped roles
export const PROGRAM_ROLES = ['program-admin', 'program-manager', 'program-moderator'];

// Check if user has a program-scoped role
export function isProgramRole(user: any): boolean {
  return user ? PROGRAM_ROLES.includes(user.role) : false;
}

// Get user's program ID
export function getUserProgramId(user: any): number | null {
  return user?.programId || null;
}

// Get visible tabs for program roles
export function getProgramRoleTabs(role: string): string[] {
  switch (role) {
    case 'program-admin':
      return ['dashboard', 'programs', 'questionnaires', 'events', 'reports', 'evaluation'];
    case 'program-manager':
      return ['dashboard', 'programs', 'questionnaires', 'events', 'reports', 'evaluation'];
    case 'program-moderator':
      return ['dashboard', 'programs', 'events', 'reports', 'evaluation'];
    default:
      return [];
  }
}
