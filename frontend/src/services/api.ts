import {
  User, ProfessionalProfile, CV, Job, JobMatch, Application,
  GeneratedDocument, Interview, ChatMessage, UserSettings, DashboardOverview
} from '../types';

const API_BASE = (typeof window !== 'undefined' && window.location.port === '5173')
  ? `http://${window.location.hostname}:8000/api/v1`
  : '/api/v1';

function getToken(): string | null {
  return localStorage.getItem('careerpilot_token');
}

export function setToken(token: string) {
  localStorage.setItem('careerpilot_token', token);
}

export function removeToken() {
  localStorage.removeItem('careerpilot_token');
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Do not set Content-Type if sending FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    removeToken();
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new Error('Authentication required');
  }

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail || `API request failed: ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  register: (payload: { email: string; password: string; full_name: string }): Promise<User> =>
    fetchWithAuth('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  
  login: async (payload: { email: string; password: string }): Promise<{ access_token: string }> => {
    const res = await fetchWithAuth('/auth/login/json', { method: 'POST', body: JSON.stringify(payload) });
    setToken(res.access_token);
    return res;
  },

  getMe: (): Promise<User> => fetchWithAuth('/auth/me'),

  // CV
  uploadCV: (file: File): Promise<CV> => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchWithAuth('/cvs/upload', { method: 'POST', body: formData });
  },

  getCVs: (): Promise<CV[]> => fetchWithAuth('/cvs'),

  deleteCV: (id: string): Promise<void> => fetchWithAuth(`/cvs/${id}`, { method: 'DELETE' }),

  downloadCVUrl: (id: string) => `${API_BASE}/cvs/${id}/download`,

  // Profile
  getProfile: (): Promise<ProfessionalProfile> => fetchWithAuth('/profile'),

  updateProfile: (profile: Partial<ProfessionalProfile>): Promise<ProfessionalProfile> =>
    fetchWithAuth('/profile', { method: 'PUT', body: JSON.stringify(profile) }),

  // Jobs
  getJobs: (params?: { query?: string; location?: string; location_type?: string; min_salary?: number }): Promise<Job[]> => {
    const query = new URLSearchParams();
    if (params?.query) query.set('query', params.query);
    if (params?.location) query.set('location', params.location);
    if (params?.location_type) query.set('location_type', params.location_type);
    if (params?.min_salary) query.set('min_salary', params.min_salary.toString());
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return fetchWithAuth(`/jobs${qStr}`);
  },

  searchJobs: (): Promise<{ message: string; new_jobs_found: number }> =>
    fetchWithAuth('/jobs/search', { method: 'POST' }),

  importJobUrl: (url: string): Promise<Job> =>
    fetchWithAuth('/jobs/import/url', { method: 'POST', body: JSON.stringify({ url }) }),

  importManualJob: (job: Partial<Job>): Promise<Job> =>
    fetchWithAuth('/jobs/import/manual', { method: 'POST', body: JSON.stringify(job) }),

  saveJob: (jobId: string): Promise<{ message: string; application_id: string }> =>
    fetchWithAuth(`/jobs/${jobId}/save`, { method: 'POST' }),

  // Matching
  getMatches: (): Promise<JobMatch[]> => fetchWithAuth('/matching'),

  evaluateMatch: (jobId: string, customWeights?: Record<string, number>): Promise<JobMatch> =>
    fetchWithAuth('/matching/evaluate', {
      method: 'POST',
      body: JSON.stringify({ job_id: jobId, custom_weights: customWeights })
    }),

  // Documents
  getDocuments: (docType?: string): Promise<GeneratedDocument[]> => {
    const qStr = docType ? `?doc_type=${docType}` : '';
    return fetchWithAuth(`/documents${qStr}`);
  },

  generateCV: (jobId: string, emphasisSkills?: string[]): Promise<GeneratedDocument> =>
    fetchWithAuth('/documents/generate-cv', {
      method: 'POST',
      body: JSON.stringify({ job_id: jobId, emphasis_skills: emphasisSkills })
    }),

  generateCoverLetter: (jobId: string, tone?: string): Promise<GeneratedDocument> =>
    fetchWithAuth('/documents/generate-cover-letter', {
      method: 'POST',
      body: JSON.stringify({ job_id: jobId, tone: tone || 'professional' })
    }),

  generateEmail: (jobId: string, recipientName?: string, recipientEmail?: string): Promise<GeneratedDocument> =>
    fetchWithAuth('/documents/generate-email', {
      method: 'POST',
      body: JSON.stringify({ job_id: jobId, recipient_name: recipientName, recipient_email: recipientEmail })
    }),

  downloadDocumentUrl: (docId: string, format: 'pdf' | 'docx') =>
    `${API_BASE}/documents/${docId}/download?format=${format}`,

  // Applications
  getApplications: (status?: string): Promise<Application[]> => {
    const qStr = status ? `?status_filter=${status}` : '';
    return fetchWithAuth(`/applications${qStr}`);
  },

  createApplication: (appData: { job_id: string; status?: string; notes?: string }): Promise<Application> =>
    fetchWithAuth('/applications', { method: 'POST', body: JSON.stringify(appData) }),

  updateApplication: (appId: string, updates: Partial<Application>): Promise<Application> =>
    fetchWithAuth(`/applications/${appId}`, { method: 'PATCH', body: JSON.stringify(updates) }),

  deleteApplication: (appId: string): Promise<void> =>
    fetchWithAuth(`/applications/${appId}`, { method: 'DELETE' }),

  // Interviews
  getInterviews: (): Promise<Interview[]> => fetchWithAuth('/interviews'),

  generateInterviewPrep: (jobId: string, interviewType?: string): Promise<Interview> =>
    fetchWithAuth('/interviews/generate-prep', {
      method: 'POST',
      body: JSON.stringify({ job_id: jobId, interview_type: interviewType || 'Comprehensive' })
    }),

  submitMockAnswer: (questionId: string, userAnswer: string): Promise<{ score: number; ai_feedback: string }> =>
    fetchWithAuth('/interviews/mock-submit', {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId, user_answer: userAnswer })
    }),

  // AI Assistant & Chat
  sendChatMessage: (content: string, sessionId?: string): Promise<ChatMessage> =>
    fetchWithAuth('/ai/chat', { method: 'POST', body: JSON.stringify({ content, session_id: sessionId }) }),

  getChatSessions: (): Promise<any[]> => fetchWithAuth('/ai/sessions'),

  checkAIHealth: (): Promise<{
    provider: string;
    configured_model: string;
    is_connected: boolean;
    models_available: string[];
    error?: string;
    setup_instructions?: string;
  }> => fetchWithAuth('/ai/health'),

  analyzeJobDescription: (jobDescription: string): Promise<any> =>
    fetchWithAuth('/ai/analyze-job', { method: 'POST', body: JSON.stringify({ job_description: jobDescription }) }),

  // Settings
  getSettings: (): Promise<UserSettings> => fetchWithAuth('/settings'),

  updateSettings: (settings: Partial<UserSettings>): Promise<UserSettings> =>
    fetchWithAuth('/settings', { method: 'PUT', body: JSON.stringify(settings) }),

  // Dashboard
  getDashboardOverview: (): Promise<DashboardOverview> => fetchWithAuth('/dashboard/overview'),
};

