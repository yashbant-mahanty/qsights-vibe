// API Integration Layer for QSights 2.0
// Handles all backend communication with Laravel API

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://prod.qsights.com/api';
export const API_BASE_URL = API_URL.replace('/api', '');

// Helper to build query string with program-level filtering
function buildQueryString(params: Record<string, any>): string {
  const query = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => query.append(`${key}[]`, v));
      } else {
        query.append(key, value);
      }
    }
  });
  
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

// Types
export interface User {
  userId: string;
  email: string;
  name: string;
  role: string;
  organizationId?: string;
  programId?: string;
}

export interface Organization {
  id: string;
  name: string;
  code?: string;
  industry?: string;
  description?: string;
  location?: string;
  contact_email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  // Relationships from backend
  group_heads_count?: number;
  programs_count?: number;
  active_participants_count?: number;
  inactive_participants_count?: number;
  total_authenticated_count?: number; // Total non-guest participants regardless of status
  guest_participants_count?: number;
}

export interface GroupHead {
  id: string;
  organization_id: string;
  user_id: string;
  name?: string; // For create operation (will be used to create user)
  email?: string; // For create operation (will be used to create user)
  phone?: string;
  department?: string;
  designation?: string;
  status: 'active' | 'inactive';
  logo?: string; // Logo URL or path
  created_at: string;
  updated_at: string;
  // Relationships from backend
  organization?: Organization;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  programs_count?: number;
}

export interface Program {
  id: string;
  organization_id: string;
  group_head_id?: string;
  name: string;
  code?: string;
  description?: string;
  logo?: string;
  start_date?: string;
  end_date?: string;
  status: 'active' | 'inactive' | 'completed';
  generate_admin?: boolean; // For create operation
  generate_manager?: boolean; // For create operation
  generate_moderator?: boolean; // For create operation
  generated_users?: Array<{ // Response from create operation
    email: string;
    password: string;
    role: string;
  }>;
  created_at: string;
  updated_at: string;
  // Relationships from backend
  organization?: Organization;
  group_head?: {
    id: string;
    user?: {
      id: string;
      name: string;
      email: string;
    };
  };
  participants_count?: number;
  authenticated_participants_count?: number;
  guest_participants_count?: number;
  activities_count?: number;
}

export interface ProgramUser {
  id: string;
  program_id: string;
  name: string;
  email: string;
  role: 'program-admin' | 'program-manager' | 'program-moderator';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  phone?: string;
  language_preference?: string;
  status: 'active' | 'inactive';
  is_guest?: boolean;
  guest_code?: string;
  program_ids?: string[]; // For create/update operations
  created_at: string;
  updated_at: string;
  organization?: {
    id: string;
    name: string;
    code: string;
  };
  programs?: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  programs_count?: number;
  activities_count?: number;
}

export interface Questionnaire {
  id: string;
  organization_id: string;
  program_id?: string;
  title: string;
  description?: string;
  type?: string;
  status: 'draft' | 'published' | 'archived';
  settings?: any;
  created_at: string;
  updated_at: string;
  // Relationships from backend
  program?: {
    id: string;
    name: string;
  };
  sections?: Array<{
    id: string;
    title: string;
    description?: string;
    questions?: Array<any>;
  }>;
  responses_count?: number;
  authenticated_responses_count?: number;
  guest_responses_count?: number;
}

export interface Activity {
  id: string;
  organization_id: string;
  program_id: string;
  questionnaire_id?: string;
  name: string;
  description?: string;
  type: 'survey' | 'poll' | 'assessment';
  status: 'draft' | 'upcoming' | 'live' | 'expired' | 'closed' | 'archived';
  start_date?: string;
  end_date?: string;
  allow_guests?: boolean;
  allow_participant_reminders?: boolean;
  is_multilingual?: boolean;
  languages?: string[]; // Array of language codes (e.g., ["EN", "HI"])
  settings?: {
    display_mode?: string;
    [key: string]: any;
  };
  time_limit_enabled?: boolean;
  time_limit_minutes?: number;
  pass_percentage?: number;
  max_retakes?: number | null;
  contact_us_enabled?: boolean;
  enable_generated_links?: boolean; // NEW: Enable unique generated links feature
  registration_flow?: 'pre_submission' | 'post_submission';
  // Program relationship
  program?: {
    id: string;
    name: string;
  };
  // Additional fields
  sender_email?: string;
  manager_name?: string;
  manager_email?: string;
  project_code?: string;
  configuration_date?: string;
  configuration_price?: number;
  subscription_price?: number;
  subscription_frequency?: string;
  tax_percentage?: number;
  number_of_participants?: number;
  questions_to_randomize?: number;
  // Approval audit fields
  approved_by?: string;
  approved_at?: string;
  approval_comments?: string;
  participants_count?: number;
  active_participants_count?: number;
  anonymous_participants_count?: number;
  authenticated_participants_count?: number;
  guest_participants_count?: number;
  inactive_participants_count?: number;
  responses_count?: number;
  authenticated_responses_count?: number;
  guest_responses_count?: number;
  participants_responded_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityApprovalRequest {
  id: string;
  program_id: string;
  questionnaire_id?: string;
  requested_by: string | {
    id: string;
    name: string;
    email: string;
  };
  reviewed_by?: string | {
    id: string;
    name: string;
    email: string;
  } | null;
  name: string;
  sender_email?: string;
  description?: string;
  type: 'survey' | 'poll' | 'assessment';
  start_date?: string;
  end_date?: string;
  close_date?: string;
  manager_name?: string;
  manager_email?: string;
  project_code?: string;
  configuration_date?: string;
  configuration_price?: number;
  subscription_price?: number;
  subscription_frequency?: string;
  tax_percentage?: number;
  number_of_participants?: number;
  questions_to_randomize?: number;
  allow_guests?: boolean;
  is_multilingual?: boolean;
  languages?: string[];
  settings?: any;
  registration_form_fields?: any[];
  landing_config?: any;
  time_limit_enabled?: boolean;
  time_limit_minutes?: number;
  pass_percentage?: number;
  max_retakes?: number | null;
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  reviewed_at?: string;
  created_activity_id?: string;
  created_at: string;
  updated_at: string;
  // Relationships - Laravel returns these as snake_case
  program?: Program;
  questionnaire?: Questionnaire;
  requested_by_user?: {
    id: string;
    name: string;
    email: string;
  };
  reviewed_by_user?: {
    id: string;
    name: string;
    email: string;
  };
  requestedBy?: User;
  reviewedBy?: User;
  createdActivity?: Activity;
}

export interface Response {
  id: string;
  activity_id: string;
  participant_id: string;
  status: 'in_progress' | 'completed';
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  answers?: Array<{
    id: string;
    question_id: string;
    response_id: string;
    answer_text?: string;
    answer_value?: any;
    created_at: string;
    updated_at: string;
  }>;
}

// Utility function to get backend token from cookies
function getBackendToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(c => c.trim().startsWith('backendToken='));
  
  if (!tokenCookie) return null;
  
  const encodedToken = tokenCookie.split('=')[1];
  // Decode URL-encoded token
  const token = decodeURIComponent(encodedToken);
  
  // Return null if token is invalid (null, undefined, empty, or literal "null" string)
  if (!token || token === 'null' || token === 'undefined') return null;
  
  return token;
}

// Get CSRF token cookie from Laravel
async function getCsrfCookie(): Promise<void> {
  try {
    await fetch(`${API_URL.replace('/api', '')}/sanctum/csrf-cookie`, {
      credentials: 'include',
    });
  } catch (error) {
    console.error('Failed to get CSRF cookie:', error);
  }
}

// Get CSRF token from cookie
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(c => c.trim().startsWith('XSRF-TOKEN='));
  
  if (!csrfCookie) return null;
  
  return decodeURIComponent(csrfCookie.split('=')[1]);
}

// Fetch wrapper with authentication and error handling
export async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getBackendToken();
  
  // Debug logging
  console.log('[API] fetchWithAuth called:', {
    endpoint,
    method: options.method || 'GET',
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : null,
  });
  
  // Get CSRF cookie for state-changing requests
  if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
    await getCsrfCookie();
  }
  
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers as Record<string, string> || {}),
  };

  // Only set Content-Type if not FormData (browser will set it automatically with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add CSRF token to headers
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-XSRF-TOKEN'] = csrfToken;
  }
  
  console.log('[API] Request headers:', {
    hasAuth: !!headers['Authorization'],
    authPreview: headers['Authorization'] ? headers['Authorization'].substring(0, 30) + '...' : null,
    hasCsrf: !!headers['X-XSRF-TOKEN'],
  });

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  
  console.log('[API] Response status:', response.status);

  const responseText = await response.text();
  
  // Extract JSON from response (may contain PHP warnings/errors)
  let data;
  try {
    // Try to find JSON in the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}$/);
    if (jsonMatch) {
      data = JSON.parse(jsonMatch[0]);
    } else {
      data = JSON.parse(responseText);
    }
  } catch (parseError) {
    console.error('Failed to parse API response:', responseText.substring(0, 200));
    throw new Error('Invalid server response');
  }

  if (!response.ok) {
    console.error('[API] Error response:', { status: response.status, data });
    console.error('[API] Full error data:', JSON.stringify(data, null, 2));
    // For 422 validation errors, extract the actual field errors
    if (response.status === 422 && data.errors) {
      const errorMessages = Object.entries(data.errors)
        .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
        .join('; ');
      console.error('[API] Validation errors:', data.errors);
      throw new Error(errorMessages || data.message || 'Validation failed');
    }
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  console.log('[API] Success response data:', JSON.stringify(data, null, 2));
  return data;
}

// Organizations API
export const organizationsApi = {
  async getAll(): Promise<Organization[]> {
    const data = await fetchWithAuth('/organizations?withCount=groupHeads,programs');
    return data.data || data;
  },

  async getById(id: string): Promise<Organization> {
    const data = await fetchWithAuth(`/organizations/${id}`);
    return data.data || data;
  },

  async create(organization: Partial<Organization>): Promise<Organization> {
    const data = await fetchWithAuth('/organizations', {
      method: 'POST',
      body: JSON.stringify(organization),
    });
    return data.data || data;
  },

  async update(id: string, organization: Partial<Organization>): Promise<Organization> {
    const data = await fetchWithAuth(`/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(organization),
    });
    return data.data || data;
  },

  async delete(id: string): Promise<void> {
    await fetchWithAuth(`/organizations/${id}`, {
      method: 'DELETE',
    });
  },

  async deactivate(id: string): Promise<Organization> {
    const data = await fetchWithAuth(`/organizations/${id}/deactivate`, {
      method: 'POST',
    });
    return data.data || data;
  },

  async activate(id: string): Promise<Organization> {
    const data = await fetchWithAuth(`/organizations/${id}/activate`, {
      method: 'POST',
    });
    return data.data || data;
  },

  async restore(id: string): Promise<Organization> {
    const data = await fetchWithAuth(`/organizations/${id}/restore`, {
      method: 'POST',
    });
    return data.data || data;
  },
};

// Group Heads API
export const groupHeadsApi = {
  async getAll(): Promise<GroupHead[]> {
    const data = await fetchWithAuth('/group-heads?with=organization&withCount=programs');
    return data.data || data;
  },

  async getById(id: string): Promise<GroupHead> {
    const data = await fetchWithAuth(`/group-heads/${id}`);
    return data.data || data;
  },

  async create(groupHead: Partial<GroupHead>): Promise<GroupHead> {
    const data = await fetchWithAuth('/group-heads', {
      method: 'POST',
      body: JSON.stringify(groupHead),
    });
    return data.data || data;
  },

  async update(id: string, groupHead: Partial<GroupHead>): Promise<GroupHead> {
    const data = await fetchWithAuth(`/group-heads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(groupHead),
    });
    return data.data || data;
  },

  async delete(id: string): Promise<void> {
    await fetchWithAuth(`/group-heads/${id}`, {
      method: 'DELETE',
    });
  },

  async resetPassword(id: string): Promise<{ message: string }> {
    return await fetchWithAuth(`/group-heads/${id}/reset-password`, {
      method: 'POST',
    });
  },
};

// Programs API
export const programsApi = {
  async getAll(filters?: { program_id?: string; organization_id?: string }): Promise<Program[]> {
    const query = buildQueryString({ with: 'organization', withCount: 'participants,activities', ...filters });
    const data = await fetchWithAuth(`/programs${query}`);
    return data.data || data;
  },

  async getById(id: string): Promise<Program> {
    const data = await fetchWithAuth(`/programs/${id}`);
    return data.data || data;
  },

  async create(program: Partial<Program>): Promise<Program> {
    const data = await fetchWithAuth('/programs', {
      method: 'POST',
      body: JSON.stringify(program),
    });
    return data.data || data;
  },

  async update(id: string, program: Partial<Program>): Promise<Program> {
    const data = await fetchWithAuth(`/programs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(program),
    });
    return data.data || data;
  },

  async delete(id: string): Promise<void> {
    await fetchWithAuth(`/programs/${id}`, {
      method: 'DELETE',
    });
  },

  async getStatistics(id: string): Promise<any> {
    return await fetchWithAuth(`/programs/${id}/statistics`);
  },

  async getProgramUsers(programId: string): Promise<ProgramUser[]> {
    const data = await fetchWithAuth(`/programs/${programId}/users`);
    return data.data || data;
  },

  async resetProgramUserPassword(programId: string, userId: string): Promise<{ credentials: any }> {
    const data = await fetchWithAuth(`/programs/${programId}/users/${userId}/reset-password`, {
      method: 'POST',
    });
    return data;
  },
};

// Program Roles API
export const programRolesApi = {
  async getAll(programId: string): Promise<{ roles: any[]; program: any }> {
    const data = await fetchWithAuth(`/programs/${programId}/roles`);
    return data;
  },

  async getById(programId: string, roleId: string): Promise<{ role: any }> {
    const data = await fetchWithAuth(`/programs/${programId}/roles/${roleId}`);
    return data;
  },

  async create(programId: string, roleData: any): Promise<{ role: any; message: string }> {
    const data = await fetchWithAuth(`/programs/${programId}/roles`, {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
    return data;
  },

  async update(programId: string, roleId: string, roleData: any): Promise<{ role: any; message: string }> {
    const data = await fetchWithAuth(`/programs/${programId}/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    });
    return data;
  },

  async delete(programId: string, roleId: string): Promise<void> {
    await fetchWithAuth(`/programs/${programId}/roles/${roleId}`, {
      method: 'DELETE',
    });
  },

  async getAvailableActivities(programId: string): Promise<{ services: any[]; events: any[] }> {
    const data = await fetchWithAuth(`/programs/${programId}/roles/available-activities`);
    return data;
  },

  async getServices(programId: string): Promise<any[]> {
    console.log("🔍 API: Fetching services for programId:", programId);
    const data = await fetchWithAuth(`/programs/${programId}/roles/available-activities`);
    console.log("✅ API: Received data:", data);
    return data.services || [];
  },

  async getEvents(programId: string): Promise<any[]> {
    console.log("🔍 API: Fetching events for programId:", programId);
    const data = await fetchWithAuth(`/programs/${programId}/roles/available-activities`);
    return data.events || [];
  },
};

// Participants API
export const participantsApi = {
  async getAll(filters?: { program_id?: string; organization_id?: string }): Promise<Participant[]> {
    const query = buildQueryString({ per_page: 1000, ...filters });
    const response = await fetchWithAuth(`/participants${query}`);
    // Backend returns paginated response with { data: [...], meta: {...} }
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    // Fallback for non-paginated response
    return Array.isArray(response) ? response : [];
  },

  async getById(id: string): Promise<Participant> {
    const data = await fetchWithAuth(`/participants/${id}`);
    return data.data || data;
  },

  async create(participant: Partial<Participant>): Promise<Participant> {
    const data = await fetchWithAuth('/participants', {
      method: 'POST',
      body: JSON.stringify(participant),
    });
    return data.data || data;
  },

  async update(id: string, participant: Partial<Participant>): Promise<Participant> {
    const data = await fetchWithAuth(`/participants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(participant),
    });
    return data.data || data;
  },

  async delete(id: string): Promise<void> {
    await fetchWithAuth(`/participants/${id}`, {
      method: 'DELETE',
    });
  },

  async bulkDelete(ids: string[]): Promise<{ message: string; deleted_count: number }> {
    const data = await fetchWithAuth('/participants/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    return data;
  },

  async bulkImport(file: File): Promise<{ 
    message: string; 
    successCount: number; 
    skippedCount: number; 
    skippedRows: Array<{ rowNumber: number; reason: string }> 
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = getBackendToken();
    const headers: HeadersInit = {
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/participants/bulk-import`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Import failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },

  async downloadTemplate(): Promise<Blob> {
    const token = getBackendToken();
    const headers: HeadersInit = {
      'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/participants/download-template`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.blob();
  },
};

// Questionnaires API
export const questionnairesApi = {
  async getAll(filters?: { program_id?: string; organization_id?: string }): Promise<Questionnaire[]> {
    const query = buildQueryString({ 
      withCount: 'responses,authenticated_responses_count,guest_responses_count',
      ...filters 
    });
    const response = await fetchWithAuth(`/questionnaires${query}`);
    
    // Handle Laravel pagination structure: response has 'data' property with items array
    // Laravel returns { data: [...items], current_page: 1, ... }
    if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    // Fallback if response is already an array
    if (Array.isArray(response)) {
      return response;
    }
    console.warn('[questionnairesApi] Unexpected response format, returning empty array');
    return [];
  },

  async getById(id: string): Promise<Questionnaire> {
    const data = await fetchWithAuth(`/questionnaires/${id}`);
    return data.data || data;
  },

  async create(questionnaire: Partial<Questionnaire>): Promise<Questionnaire> {
    const data = await fetchWithAuth('/questionnaires', {
      method: 'POST',
      body: JSON.stringify(questionnaire),
    });
    return data.data || data;
  },

  async update(id: string, questionnaire: Partial<Questionnaire>): Promise<Questionnaire> {
    const data = await fetchWithAuth(`/questionnaires/${id}`, {
      method: 'PUT',
      body: JSON.stringify(questionnaire),
    });
    return data.data || data;
  },

  async delete(id: string): Promise<void> {
    await fetchWithAuth(`/questionnaires/${id}`, {
      method: 'DELETE',
    });
  },

  async publish(id: string): Promise<Questionnaire> {
    const data = await fetchWithAuth(`/questionnaires/${id}/publish`, {
      method: 'POST',
    });
    return data.data || data;
  },

  async archive(id: string): Promise<Questionnaire> {
    const data = await fetchWithAuth(`/questionnaires/${id}/archive`, {
      method: 'POST',
    });
    return data.data || data;
  },

  async duplicate(id: string): Promise<Questionnaire> {
    const data = await fetchWithAuth(`/questionnaires/${id}/duplicate`, {
      method: 'POST',
    });
    return data.data || data;
  },

  // Import functionality
  async downloadImportTemplate(): Promise<Blob> {
    const token = getBackendToken();
    const response = await fetch(`${API_URL}/questionnaires/import/template`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to download template');
    }
    return response.blob();
  },

  async parseImportFile(file: File): Promise<{
    success: boolean;
    data?: any[];
    summary?: { total_sections: number; total_questions: number; total_options: number };
    errors?: { row: number; error: string }[];
    warnings?: { row?: number; section?: string; question?: string; warning: string }[];
    error?: string;
  }> {
    const token = getBackendToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/questionnaires/import/parse`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
      body: formData,
    });

    return response.json();
  },

  async importQuestions(questionnaireId: string, sections: any[]): Promise<{
    success: boolean;
    message?: string;
    questionnaire?: Questionnaire;
    imported?: { sections: number; questions: number };
    error?: string;
  }> {
    const data = await fetchWithAuth('/questionnaires/import', {
      method: 'POST',
      body: JSON.stringify({
        questionnaire_id: questionnaireId,
        sections,
      }),
    });
    return data;
  },
};

// Activities API
export const activitiesApi = {
  async getAll(filters?: { program_id?: string; organization_id?: string }): Promise<Activity[]> {
    const query = buildQueryString({ 
      withCount: 'participants,responses,authenticated_responses_count,guest_responses_count', 
      ...filters 
    });
    const response = await fetchWithAuth(`/activities${query}`);
    
    // Handle Laravel pagination structure: response has 'data' property with items array
    // Laravel returns { data: [...items], current_page: 1, ... }
    if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    // Fallback if response is already an array
    if (Array.isArray(response)) {
      return response;
    }
    console.warn('[activitiesApi] Unexpected response format, returning empty array');
    return [];
  },

  async getById(id: string): Promise<Activity> {
    const data = await fetchWithAuth(`/activities/${id}`);
    return data.data || data;
  },

  async create(activity: Partial<Activity>): Promise<Activity> {
    const data = await fetchWithAuth('/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    });
    return data.data || data;
  },

  async update(id: string, activity: Partial<Activity>): Promise<Activity> {
    const data = await fetchWithAuth(`/activities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(activity),
    });
    return data.data || data;
  },

  async delete(id: string): Promise<void> {
    await fetchWithAuth(`/activities/${id}`, {
      method: 'DELETE',
    });
  },

  async assignQuestionnaire(id: string, questionnaireId: string): Promise<Activity> {
    const data = await fetchWithAuth(`/activities/${id}/assign-questionnaire`, {
      method: 'POST',
      body: JSON.stringify({ questionnaire_id: questionnaireId }),
    });
    return data.data || data;
  },

  async updateStatus(id: string, status: string): Promise<Activity> {
    const data = await fetchWithAuth(`/activities/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return data.data || data;
  },

  async getParticipants(id: string): Promise<any[]> {
    const data = await fetchWithAuth(`/activities/${id}/participants`);
    return data.data || [];
  },

  async getLandingPageConfig(id: string): Promise<any> {
    const data = await fetchWithAuth(`/activities/${id}/landing-config`);
    return data.data || data;
  },

  async saveLandingPageConfig(id: string, config: any): Promise<any> {
    const data = await fetchWithAuth(`/activities/${id}/landing-config`, {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
    return data.data || data;
  },

  async uploadLandingImage(id: string, file: File, field: string): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('field', field);

    const response = await fetch(`${API_URL}/activities/${id}/landing-config/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Image upload failed');
    }

    const data = await response.json();
    return data.data || data;
  },

  async getActivityLinks(id: string): Promise<{
    links: {
      registration: { url: string; label: string; description: string };
      preview: { url: string; label: string; description: string };
      anonymous: { url: string; label: string; description: string };
    };
    activity: { id: string; name: string; allow_guests: boolean };
  }> {
    const data = await fetchWithAuth(`/activities/${id}/links`);
    return data;
  },

  async validateLinkToken(token: string): Promise<{
    valid: boolean;
    activity_id: string;
    type: 'registration' | 'preview' | 'anonymous';
  }> {
    const response = await fetch(`${API_URL}/public/activities/validate-link-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error('Invalid or expired token');
    }

    const data = await response.json();
    return data;
  },
};

// Responses API
export const responsesApi = {
  async start(activityId: string): Promise<Response> {
    const data = await fetchWithAuth('/responses/start', {
      method: 'POST',
      body: JSON.stringify({ activity_id: activityId }),
    });
    return data.data || data;
  },

  async resume(responseId: string): Promise<Response> {
    const data = await fetchWithAuth(`/responses/${responseId}/resume`, {
      method: 'POST',
    });
    return data.data || data;
  },

  async saveProgress(responseId: string, answers: any[]): Promise<Response> {
    const data = await fetchWithAuth(`/responses/${responseId}/save`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
    return data.data || data;
  },

  async submit(responseId: string, answers: any[]): Promise<Response> {
    const data = await fetchWithAuth(`/responses/${responseId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
    return data.data || data;
  },

  async getProgress(responseId: string): Promise<any> {
    return await fetchWithAuth(`/responses/${responseId}/progress`);
  },

  async getStatistics(activityId: string): Promise<any> {
    return await fetchWithAuth(`/activities/${activityId}/responses/statistics`);
  },

  async getByActivity(activityId: string): Promise<Response[]> {
    // Request all responses by setting high per_page (Laravel will handle the limit)
    // This ensures Question-wise Analysis shows the same data as summary statistics
    const data = await fetchWithAuth(`/activities/${activityId}/responses?per_page=10000`);
    
    console.log('🔍 [responsesApi.getByActivity] Raw API response:', {
      hasData: data && typeof data === 'object' && 'data' in data,
      isArray: Array.isArray(data),
      dataType: typeof data,
      keys: data ? Object.keys(data) : [],
      firstItemKeys: data?.data?.[0] ? Object.keys(data.data[0]) : (data?.[0] ? Object.keys(data[0]) : [])
    });
    
    // Handle Laravel pagination structure - extract data array from paginated response
    // Response format: { data: [...], current_page: 1, total: X, ... }
    if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
      console.log(`✅ Loaded ${data.data.length} responses (Total: ${data.total || data.data.length})`);
      if (data.data.length > 0) {
        console.log('🔍 First response has answers?', {
          hasAnswers: 'answers' in data.data[0],
          answersLength: data.data[0].answers?.length || 0,
          answersType: typeof data.data[0].answers,
          sampleKeys: Object.keys(data.data[0])
        });
      }
      return data.data;
    }
    
    // Fallback for non-paginated response
    if (Array.isArray(data)) {
      console.log(`✅ Loaded ${data.length} responses (direct array)`);
      if (data.length > 0) {
        console.log('🔍 First response has answers?', {
          hasAnswers: 'answers' in data[0],
          answersLength: data[0].answers?.length || 0,
          sampleKeys: Object.keys(data[0])
        });
      }
      return data;
    }
    
    console.warn('[responsesApi.getByActivity] Unexpected response format, returning empty array');
    return [];
  },
};

// Reports API
export const reportsApi = {
  async getParticipationMetrics(params?: {
    program_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<any> {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return await fetchWithAuth(`/reports/participation-metrics${queryString}`);
  },

  async getCompletionMetrics(params?: {
    program_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<any> {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return await fetchWithAuth(`/reports/completion-metrics${queryString}`);
  },

  async getDrillDownResponses(activityId: string): Promise<any> {
    return await fetchWithAuth(`/reports/drill-down/${activityId}`);
  },

  async getQuestionAnalytics(activityId: string): Promise<any> {
    return await fetchWithAuth(`/reports/question-analytics/${activityId}`);
  },

  async getProgramOverview(programId: string): Promise<any> {
    return await fetchWithAuth(`/reports/program-overview/${programId}`);
  },

  async exportReport(activityId: string, format: 'csv' | 'excel' | 'pdf'): Promise<Blob> {
    const token = getBackendToken();
    const headers: HeadersInit = {
      'Accept': format === 'csv' 
        ? 'text/csv' 
        : format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/reports/export/${activityId}?format=${format}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Export failed: HTTP ${response.status}`);
    }

    return response.blob();
  },

  async exportProgramReport(programId: string, format: 'csv' | 'excel' | 'pdf'): Promise<Blob> {
    const token = getBackendToken();
    const headers: HeadersInit = {
      'Accept': format === 'csv' 
        ? 'text/csv' 
        : format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/reports/program-export/${programId}?format=${format}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Export failed: HTTP ${response.status}`);
    }

    return response.blob();
  },
};

// Public Activity API (no auth required)
export const publicActivityApi = {
  async getActivity(activityId: string): Promise<Activity> {
    const response = await fetch(`${API_URL}/public/activities/${activityId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch activity: HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  },

  async registerParticipant(activityId: string, name: string, email: string): Promise<{
    participant_id: string;
    participant_code: string | null;
    is_guest: boolean;
    activity: Activity;
  }> {
    const response = await fetch(`${API_URL}/public/activities/${activityId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ name, email }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Registration failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  },

  async submitResponse(activityId: string, participantId: string, answers: any): Promise<Response> {
    const response = await fetch(`${API_URL}/public/activities/${activityId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ 
        participant_id: participantId, 
        answers 
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Submission failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  },
};

// Auth API
export const authApi = {
  async me(): Promise<User> {
    const data = await fetchWithAuth('/auth/me');
    return data.user;
  },

  async logout(): Promise<void> {
    await fetchWithAuth('/auth/logout', {
      method: 'POST',
    });
  },

  async refresh(): Promise<{ token: string }> {
    return await fetchWithAuth('/auth/refresh', {
      method: 'POST',
    });
  },
};

// Theme Settings API
export const themeApi = {
  async getAll(): Promise<any> {
    // Public endpoint - no auth required for reading theme settings
    // Use Next.js API route which proxies to the backend
    try {
      const response = await fetch('/api/theme/settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch theme settings');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching theme settings:', error);
      return {}; // Return empty object on error
    }
  },

  async get(key: string): Promise<any> {
    // Public endpoint - no auth required
    const response = await fetch(`${API_URL}/theme/settings/${key}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch theme setting');
    }
    
    return await response.json();
  },

  async update(key: string, value: any, type?: string, category?: string): Promise<any> {
    return await fetchWithAuth(`/theme/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value, type, category }),
    });
  },

  async bulkUpdate(settings: Array<{ key: string; value: any; type?: string; category?: string }>): Promise<any> {
    return await fetchWithAuth('/theme/settings/bulk', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    });
  },

  async uploadImage(file: File, key: string, category?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('key', key);
    if (category) formData.append('category', category);

    const response = await fetch(`${API_URL}/theme/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getBackendToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    return await response.json();
  },

  async delete(key: string): Promise<any> {
    return await fetchWithAuth(`/theme/settings/${key}`, {
      method: 'DELETE',
    });
  },
};

// CMS Content API
export const cmsApi = {
  async getAll(): Promise<any[]> {
    const response = await fetch(`${API_URL}/cms/content`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CMS content');
    }

    const data = await response.json();
    return data.data;
  },

  async getByPageKey(pageKey: string): Promise<any> {
    const response = await fetch(`${API_URL}/cms/content/${pageKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CMS content');
    }

    const data = await response.json();
    return data.data;
  },

  async update(pageKey: string, content: any): Promise<any> {
    return await fetchWithAuth(`/cms/content/${pageKey}`, {
      method: 'PUT',
      body: JSON.stringify(content),
    });
  },

  async bulkUpdate(updates: any[]): Promise<any> {
    return await fetchWithAuth('/cms/content/bulk', {
      method: 'POST',
      body: JSON.stringify({ updates }),
    });
  },
};

// Landing Pages API
export const landingPagesApi = {
  async getAll(): Promise<any[]> {
    return await fetchWithAuth('/landing-pages/');
  },

  async get(slug: string): Promise<any> {
    return await fetchWithAuth(`/landing-pages/${slug}`);
  },

  async create(data: any): Promise<any> {
    return await fetchWithAuth('/landing-pages/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: any): Promise<any> {
    return await fetchWithAuth(`/landing-pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<any> {
    return await fetchWithAuth(`/landing-pages/${id}`, {
      method: 'DELETE',
    });
  },

  async addSection(pageId: string, data: any): Promise<any> {
    return await fetchWithAuth(`/landing-pages/${pageId}/sections`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSection(pageId: string, sectionId: string, data: any): Promise<any> {
    return await fetchWithAuth(`/landing-pages/${pageId}/sections/${sectionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteSection(pageId: string, sectionId: string): Promise<any> {
    return await fetchWithAuth(`/landing-pages/${pageId}/sections/${sectionId}`, {
      method: 'DELETE',
    });
  },
};

// Activity Approval Requests API
export const activityApprovalsApi = {
  async getAll(filters?: { status?: string }): Promise<ActivityApprovalRequest[]> {
    const query = buildQueryString(filters || {});
    const response = await fetchWithAuth(`/activity-approvals${query}`);
    
    // Handle Laravel pagination
    if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    console.warn('[activityApprovalsApi] Unexpected response format');
    return [];
  },

  async getById(id: string): Promise<ActivityApprovalRequest> {
    const data = await fetchWithAuth(`/activity-approvals/${id}`);
    return data.data || data;
  },

  async create(request: Partial<ActivityApprovalRequest>): Promise<ActivityApprovalRequest> {
    const data = await fetchWithAuth('/activity-approvals', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return data.data || data;
  },

  async review(id: string, action: 'approve' | 'reject', remarks: string): Promise<ActivityApprovalRequest> {
    const data = await fetchWithAuth(`/activity-approvals/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, remarks }),
    });
    return data.data || data;
  },

  async getStatistics(): Promise<{ pending: number; approved: number; rejected: number; total: number }> {
    const data = await fetchWithAuth('/activity-approvals/statistics');
    return data.data || data;
  },
};

// Demo Requests API
export const demoRequestsApi = {
  async getAll(params?: any): Promise<any> {
    return await fetchWithAuth(`/demo-requests${buildQueryString(params || {})}`);
  },

  async get(id: string): Promise<any> {
    return await fetchWithAuth(`/demo-requests/${id}`);
  },

  async submit(data: any): Promise<any> {
    // Public endpoint - no auth required
    const response = await fetch(`${API_URL}/demo-requests/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit demo request');
    }

    return await response.json();
  },

  async updateStatus(id: string, status: string): Promise<any> {
    return await fetchWithAuth(`/demo-requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async delete(id: string): Promise<any> {
    return await fetchWithAuth(`/demo-requests/${id}`, {
      method: 'DELETE',
    });
  },
};

// Contact Sales API
export const contactSalesApi = {
  async getAll(params?: any): Promise<any> {
    return await fetchWithAuth(`/contact-sales${buildQueryString(params || {})}`);
  },

  async get(id: string): Promise<any> {
    return await fetchWithAuth(`/contact-sales/${id}`);
  },

  async submit(data: any): Promise<any> {
    // Public endpoint - no auth required
    const response = await fetch(`${API_URL}/contact-sales/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit contact sales request');
    }

    return await response.json();
  },

  async updateStatus(id: string, status: string): Promise<any> {
    return await fetchWithAuth(`/contact-sales/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async delete(id: string): Promise<any> {
    return await fetchWithAuth(`/contact-sales/${id}`, {
      method: 'DELETE',
    });
  },
};

// Dashboard API (Super Admin)
export const dashboardApi = {
  async getGlobalStatistics(): Promise<any> {
    return await fetchWithAuth('/dashboard/global-statistics', {
      method: 'GET',
    });
  },

  async getOrganizationPerformance(): Promise<any> {
    return await fetchWithAuth('/dashboard/organization-performance', {
      method: 'GET',
    });
  },

  async getSubscriptionMetrics(): Promise<any> {
    return await fetchWithAuth('/dashboard/subscription-metrics', {
      method: 'GET',
    });
  },
};

// Notifications API
export interface Notification {
  id: string;
  user_id: string;
  type: 'approval_request' | 'approval_pending' | 'approval_approved' | 'approval_rejected' | 'activity_assigned' | 'activity_completed' | 'reminder' | 'event_update' | 'demo_request' | 'contact_request' | 'contact_sales';
  title: string;
  message: string;
  entity_type: 'activity' | 'event' | 'approval' | 'program' | 'participant' | 'demo_request' | 'contact_request' | 'contact_sales';
  entity_id: string;
  entity_name?: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
  read_at?: string;
}

export const notificationsApi = {
  async getAll(): Promise<Notification[]> {
    const data = await fetchWithAuth('/notifications');
    return data.data || data;
  },

  async getUnreadCount(): Promise<number> {
    const data = await fetchWithAuth('/notifications/unread-count');
    return data.count || 0;
  },

  async markAsRead(id: string): Promise<void> {
    await fetchWithAuth(`/notifications/${id}/read`, {
      method: 'POST',
    });
  },

  async markAllAsRead(): Promise<void> {
    await fetchWithAuth('/notifications/mark-all-read', {
      method: 'POST',
    });
  },

  async clearAll(): Promise<void> {
    await fetchWithAuth('/notifications/clear-all', {
      method: 'POST',
    });
  },

  async delete(id: string): Promise<void> {
    await fetchWithAuth(`/notifications/${id}`, {
      method: 'DELETE',
    });
  },

  // Email notification reports (OLD - aggregated)
  async getReportsForActivity(activityId: string): Promise<any> {
    return await fetchWithAuth(`/notifications/reports/${activityId}`);
  },

  async getAllReports(): Promise<any> {
    return await fetchWithAuth(`/notifications/reports`);
  },

  // Notification logs (NEW - detailed with participant info)
  async getLogsForActivity(activityId: string): Promise<any> {
    return await fetchWithAuth(`/notifications/logs/${activityId}`);
  },

  async getAllLogs(params?: { start_date?: string; end_date?: string; activity_id?: string }): Promise<any> {
    return await fetchWithAuth(`/notifications/logs${buildQueryString(params || {})}`);
  },

  // New analytics API with real tracking data
  async getAnalytics(params?: { start_date?: string; end_date?: string; activity_id?: string; program_id?: string }): Promise<any> {
    return await fetchWithAuth(`/notifications/analytics${buildQueryString(params || {})}`);
  },
};

// Event Contact Messages API
export const eventContactMessagesApi = {
  async getAll(params?: any): Promise<any> {
    return await fetchWithAuth(`/event-contact-messages${buildQueryString(params || {})}`);
  },

  async get(id: string): Promise<any> {
    return await fetchWithAuth(`/event-contact-messages/${id}`);
  },

  async submit(data: any): Promise<any> {
    // Public endpoint - no auth required
    const response = await fetch(`${API_URL}/event-contact-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      // If there are validation errors, format them nicely
      if (error.errors && typeof error.errors === 'object') {
        const errorMessages = Object.values(error.errors).flat().join(', ');
        throw new Error(errorMessages || error.message || 'Failed to submit contact message');
      }
      throw new Error(error.message || 'Failed to submit contact message');
    }

    return await response.json();
  },

  async markAsRead(id: string): Promise<any> {
    return await fetchWithAuth(`/event-contact-messages/${id}/read`, {
      method: 'PATCH',
    });
  },

  async markAsResponded(id: string): Promise<any> {
    return await fetchWithAuth(`/event-contact-messages/${id}/responded`, {
      method: 'PATCH',
    });
  },

  async getUnreadCount(): Promise<number> {
    const data = await fetchWithAuth('/event-contact-messages/unread-count');
    return data.count || 0;
  },

  async delete(id: string): Promise<any> {
    return await fetchWithAuth(`/event-contact-messages/${id}`, {
      method: 'DELETE',
    });
  },
};

// =====================================================
// HIERARCHY-BASED EVALUATION EVENTS API
// =====================================================

export interface EvaluationEvent {
  id: string;
  name: string;
  description?: string;
  questionnaire_id: string;
  organization_id?: string;
  program_id?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  start_date?: string;
  end_date?: string;
  allow_self_evaluation: boolean;
  is_anonymous: boolean;
  show_individual_responses: boolean;
  hierarchy_levels?: number;
  email_subject?: string;
  email_body?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Relations
  questionnaire?: Questionnaire;
  organization?: Organization;
  program?: Program;
  creator?: User;
  assignments_count?: number;
  completed_count?: number;
}

export interface EvaluationAssignment {
  id: string;
  evaluation_event_id: string;
  evaluatee_type: 'user' | 'participant';
  evaluatee_id: string;
  triggered_by: string;
  access_token: string;
  status: 'pending' | 'in_progress' | 'completed';
  sent_at?: string;
  started_at?: string;
  completed_at?: string;
  reminder_count: number;
  evaluatee_name?: string;
  evaluatee_email?: string;
}

export const evaluationEventsApi = {
  // Get all evaluation events
  async getAll(params?: { organization_id?: string; program_id?: string; status?: string }): Promise<EvaluationEvent[]> {
    return await fetchWithAuth(`/evaluation-events${buildQueryString(params || {})}`);
  },

  // Get single evaluation event
  async get(id: string): Promise<EvaluationEvent> {
    return await fetchWithAuth(`/evaluation-events/${id}`);
  },

  // Create evaluation event
  async create(data: Partial<EvaluationEvent>): Promise<EvaluationEvent> {
    return await fetchWithAuth('/evaluation-events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update evaluation event
  async update(id: string, data: Partial<EvaluationEvent>): Promise<EvaluationEvent> {
    return await fetchWithAuth(`/evaluation-events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete evaluation event
  async delete(id: string): Promise<void> {
    return await fetchWithAuth(`/evaluation-events/${id}`, {
      method: 'DELETE',
    });
  },

  // Activate evaluation event
  async activate(id: string): Promise<EvaluationEvent> {
    return await fetchWithAuth(`/evaluation-events/${id}/activate`, {
      method: 'POST',
    });
  },

  // Pause evaluation event
  async pause(id: string): Promise<EvaluationEvent> {
    return await fetchWithAuth(`/evaluation-events/${id}/pause`, {
      method: 'POST',
    });
  },

  // Complete evaluation event
  async complete(id: string): Promise<EvaluationEvent> {
    return await fetchWithAuth(`/evaluation-events/${id}/complete`, {
      method: 'POST',
    });
  },

  // Get available evaluatees (based on manager's hierarchy)
  async getAvailableEvaluatees(id: string): Promise<{
    users: Array<{ id: string; name: string; email: string; department?: string }>;
    participants: Array<{ id: string; name: string; email: string }>;
  }> {
    return await fetchWithAuth(`/evaluation-events/${id}/available-evaluatees`);
  },

  // Trigger evaluation for selected team members
  async trigger(id: string, data: {
    evaluatees: Array<{ type: 'user' | 'participant'; id: string }>;
    custom_message?: string;
    send_email?: boolean;
  }): Promise<{ assignments: EvaluationAssignment[]; message: string }> {
    return await fetchWithAuth(`/evaluation-events/${id}/trigger`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get manager's assignments (evaluations they've triggered)
  async getMyAssignments(id: string): Promise<EvaluationAssignment[]> {
    return await fetchWithAuth(`/evaluation-events/${id}/my-assignments`);
  },

  // Send reminder for a specific assignment
  async sendReminder(eventId: string, assignmentId: string): Promise<{ message: string }> {
    return await fetchWithAuth(`/evaluation-events/${eventId}/assignments/${assignmentId}/remind`, {
      method: 'POST',
    });
  },

  // Report endpoints
  reports: {
    async getSummary(eventId: string): Promise<any> {
      return await fetchWithAuth(`/evaluation-events/${eventId}/reports/summary`);
    },

    async getByEvaluatee(eventId: string): Promise<any> {
      return await fetchWithAuth(`/evaluation-events/${eventId}/reports/by-evaluatee`);
    },

    async getCompletionStatus(eventId: string): Promise<any> {
      return await fetchWithAuth(`/evaluation-events/${eventId}/reports/completion-status`);
    },

    async getMyTeamReport(eventId: string): Promise<any> {
      return await fetchWithAuth(`/evaluation-events/${eventId}/reports/my-team`);
    },

    async export(eventId: string): Promise<any> {
      return await fetchWithAuth(`/evaluation-events/${eventId}/reports/export`);
    },
  },
};

// Public Evaluation Taking API (no auth required)
export const evaluationTakeApi = {
  // Get evaluation by token (public)
  async getByToken(token: string): Promise<{
    assignment: EvaluationAssignment;
    event: EvaluationEvent;
    questionnaire: Questionnaire;
    evaluatee: { name: string; email?: string };
  }> {
    const response = await fetch(`${API_URL}/evaluation/take/${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load evaluation');
    }

    return await response.json();
  },

  // Submit evaluation responses (public)
  async submit(token: string, responses: Array<{
    question_id: string;
    section_id: string;
    answer: any;
    score?: number;
  }>): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/evaluation/take/${token}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ responses }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit evaluation');
    }

    return await response.json();
  },
};

// My Evaluations API (for logged-in users to see their pending evaluations)
export const myEvaluationsApi = {
  async getPending(): Promise<EvaluationAssignment[]> {
    return await fetchWithAuth('/my-evaluations/pending');
  },

  async getCompleted(): Promise<EvaluationAssignment[]> {
    return await fetchWithAuth('/my-evaluations/completed');
  },
};

// =====================================================
// GENERATED EVENT LINKS API (Unique One-Time-Use Links)
// =====================================================

export interface GeneratedLinkGroup {
  id: string;
  activity_id: string;
  name: string;
  description?: string;
  total_links: number;
  used_links: number;
  usage_percentage?: number;
  remaining_links?: number;
  created_at: string;
  updated_at: string;
}

export interface GeneratedEventLink {
  id: string;
  activity_id: string;
  group_id?: string;
  tag: string;
  token: string;
  link_type: 'registration' | 'anonymous';
  status: 'unused' | 'used' | 'expired' | 'disabled';
  created_by: string;
  created_at: string;
  used_at?: string;
  used_by_participant_id?: string;
  response_id?: string;
  expires_at?: string;
  full_url?: string;
  // Relations
  group?: GeneratedLinkGroup;
  creator?: User;
  participant?: Participant;
  response?: Response;
}

export interface GeneratedLinksStatistics {
  total: number;
  unused: number;
  used: number;
  expired: number;
  disabled: number;
  usage_percentage: number;
}

export interface GeneratedLinksBatchResult {
  generated: GeneratedEventLink[];
  errors: string[];
  success_count: number;
  error_count: number;
}

export const generatedLinksApi = {
  // Generate batch of links
  async generate(activityId: string, data: {
    prefix: string;
    start_number: number;
    count: number;
    group_id?: string;
    group_name?: string;
    group_description?: string;
    link_type?: 'registration' | 'anonymous';
  }): Promise<{ message: string; data: GeneratedLinksBatchResult }> {
    return await fetchWithAuth(`/activities/${activityId}/generated-links`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get all links for activity
  async getAll(activityId: string, params?: {
    status?: string;
    group_id?: string;
    search?: string;
    page?: number;
  }): Promise<{ data: any; statistics: GeneratedLinksStatistics }> {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return await fetchWithAuth(`/activities/${activityId}/generated-links${queryString}`);
  },

  // Get statistics
  async getStatistics(activityId: string): Promise<{
    overall: GeneratedLinksStatistics;
    by_group: Array<{
      group_id: string;
      group_name: string;
      total: number;
      used: number;
      unused: number;
      usage_percentage: number;
    }>;
  }> {
    return await fetchWithAuth(`/activities/${activityId}/generated-links/statistics`);
  },

  // Get groups
  async getGroups(activityId: string): Promise<{ data: GeneratedLinkGroup[] }> {
    return await fetchWithAuth(`/activities/${activityId}/generated-links/groups`);
  },

  // Create group
  async createGroup(activityId: string, data: {
    name: string;
    description?: string;
  }): Promise<{ message: string; data: GeneratedLinkGroup }> {
    return await fetchWithAuth(`/activities/${activityId}/generated-links/groups`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update link status
  async updateStatus(activityId: string, linkId: string, status: 'expired' | 'disabled' | 'unused'): Promise<{ message: string; data: GeneratedEventLink }> {
    return await fetchWithAuth(`/activities/${activityId}/generated-links/${linkId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Delete link
  async delete(activityId: string, linkId: string): Promise<{ message: string }> {
    return await fetchWithAuth(`/activities/${activityId}/generated-links/${linkId}`, {
      method: 'DELETE',
    });
  },

  // Export links
  async export(activityId: string, params?: {
    status?: string;
    group_id?: string;
  }): Promise<{ data: any[]; filename: string }> {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return await fetchWithAuth(`/activities/${activityId}/generated-links/export${queryString}`);
  },

  // Email selected links
  async emailLinks(activityId: string, data: {
    email: string;
    link_ids: string[];
    activity_name?: string;
  }): Promise<{ message: string }> {
    return await fetchWithAuth(`/activities/${activityId}/generated-links/email`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Validate generated link token (public, no auth)
  async validateToken(token: string): Promise<{
    valid: boolean;
    data?: {
      activity_id: string;
      tag: string;
      link_type: string;
      status: string;
    };
    message?: string;
  }> {
    const response = await fetch(`${API_URL}/public/generated-link/validate/${token}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error('Failed to validate link');
    }

    return await response.json();
  },

  // Mark link as used (public, called after response submission)
  async markAsUsed(token: string, participantId: string, responseId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/public/generated-link/mark-used`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ token, participant_id: participantId, response_id: responseId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to mark link as used');
    }

    return await response.json();
  },
};


