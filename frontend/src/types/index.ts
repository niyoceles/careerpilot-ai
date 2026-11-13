export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface WorkExperience {
  id?: string;
  company: string;
  position: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
  description?: string;
  achievements: string[];
}

export interface Education {
  id?: string;
  institution: string;
  degree: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  grade?: string;
}

export interface Skill {
  id?: string;
  name: string;
  category: string;
  proficiency: string;
  years_of_experience?: number;
}

export interface Project {
  id?: string;
  name: string;
  description?: string;
  role?: string;
  technologies: string[];
  url?: string;
}

export interface ProfessionalProfile {
  id: string;
  user_id: string;
  cv_id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  total_experience_years: number;
  preferred_job_titles: string[];
  preferred_locations: string[];
  remote_preference: string;
  salary_expectations?: string;
  is_confirmed: boolean;
  work_experiences: WorkExperience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  created_at: string;
  updated_at: string;
}

export interface CV {
  id: string;
  user_id: string;
  filename: string;
  file_size: number;
  file_type: string;
  created_at: string;
  has_extracted_profile: boolean;
}

export interface Job {
  id: string;
  source_id?: string;
  title: string;
  company: string;
  location?: string;
  location_type: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  required_skills: string[];
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  publication_date?: string;
  original_url?: string;
  application_url?: string;
  verification_status: string;
  verified_at?: string;
  created_at: string;
  match_score?: number;
}

export interface JobMatch {
  id: string;
  job_id: string;
  job?: Job;
  overall_score: number;
  skill_score: number;
  experience_score: number;
  education_score: number;
  location_score: number;
  matching_requirements: string[];
  partial_requirements: string[];
  missing_qualifications: string[];
  matching_experience: string[];
  suggestions: string[];
  assessment?: string;
  evaluated_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  job?: Job;
  status: string;
  applied_at?: string;
  follow_up_date?: string;
  interview_date?: string;
  notes?: string;
  application_url?: string;
  created_at: string;
  updated_at: string;
}

export interface GeneratedDocument {
  id: string;
  user_id: string;
  job_id?: string;
  document_type: string;
  title: string;
  file_path_pdf?: string;
  file_path_docx?: string;
  content_json: Record<string, any>;
  content_text?: string;
  created_at: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  suggested_answer_star?: string;
  user_answer?: string;
  ai_feedback?: string;
  score?: number;
}

export interface Interview {
  id: string;
  user_id: string;
  application_id?: string;
  job_id?: string;
  job?: Job;
  scheduled_at?: string;
  interview_type: string;
  notes?: string;
  feedback?: string;
  status: string;
  questions: InterviewQuestion[];
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata_json: Record<string, any>;
  created_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  preferred_locations: string[];
  job_categories: string[];
  remote_only: boolean;
  min_experience_years: number;
  min_match_threshold: number;
  recurring_search_frequency: string;
  notification_email?: string;
  auto_matching_enabled: boolean;
  ai_provider?: string;
  ai_model?: string;
  ai_api_key?: string;
}

export interface DashboardOverview {
  total_jobs_discovered: number;
  strong_matches_count: number;
  applications_submitted: number;
  interviews_scheduled: number;
  offers_received: number;
  recommended_jobs: Job[];
  recent_activities: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
  }>;
  pipeline_breakdown: Record<string, number>;
  upcoming_follow_ups: Array<{
    application_id: string;
    company: string;
    position: string;
    follow_up_date: string;
    status: string;
  }>;
  profile_completion_percentage: number;
}

