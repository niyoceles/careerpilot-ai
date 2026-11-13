from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# ----------------- Auth Schemas -----------------
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    is_active: bool
    is_admin: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ----------------- CV & Profile Schemas -----------------
class WorkExperienceSchema(BaseModel):
    id: Optional[str] = None
    company: str
    position: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    description: Optional[str] = None
    achievements: List[str] = []

    model_config = ConfigDict(from_attributes=True)

class EducationSchema(BaseModel):
    id: Optional[str] = None
    institution: str
    degree: str
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    grade: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SkillSchema(BaseModel):
    id: Optional[str] = None
    name: str
    category: str = "technical"  # technical, soft, language
    proficiency: str = "intermediate"
    years_of_experience: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

class CertificationSchema(BaseModel):
    id: Optional[str] = None
    name: str
    issuing_organization: str
    issue_date: Optional[str] = None
    expiration_date: Optional[str] = None
    credential_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ProjectSchema(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    role: Optional[str] = None
    technologies: List[str] = []
    url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ProfessionalProfileResponse(BaseModel):
    id: str
    user_id: str
    cv_id: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    total_experience_years: float = 0.0
    preferred_job_titles: List[str] = []
    preferred_locations: List[str] = []
    remote_preference: str = "remote_or_hybrid"
    salary_expectations: Optional[str] = None
    is_confirmed: bool = False
    work_experiences: List[WorkExperienceSchema] = []
    education: List[EducationSchema] = []
    skills: List[SkillSchema] = []
    certifications: List[CertificationSchema] = []
    projects: List[ProjectSchema] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProfessionalProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    total_experience_years: Optional[float] = None
    preferred_job_titles: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    remote_preference: Optional[str] = None
    salary_expectations: Optional[str] = None
    is_confirmed: Optional[bool] = None
    work_experiences: Optional[List[WorkExperienceSchema]] = None
    education: Optional[List[EducationSchema]] = None
    skills: Optional[List[SkillSchema]] = None
    certifications: Optional[List[CertificationSchema]] = None
    projects: Optional[List[ProjectSchema]] = None

class CVResponse(BaseModel):
    id: str
    user_id: str
    filename: str
    file_size: int
    file_type: str
    created_at: datetime
    has_extracted_profile: bool = False

    model_config = ConfigDict(from_attributes=True)


# ----------------- Job Schemas -----------------
class JobResponse(BaseModel):
    id: str
    source_id: Optional[str] = None
    title: str
    company: str
    location: Optional[str] = None
    location_type: str
    description: str
    requirements: List[str] = []
    responsibilities: List[str] = []
    required_skills: List[str] = []
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: Optional[str] = "USD"
    publication_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    original_url: Optional[str] = None
    application_url: Optional[str] = None
    verification_status: str
    verified_at: Optional[datetime] = None
    created_at: datetime
    match_score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

class JobSearchParams(BaseModel):
    query: Optional[str] = None
    location: Optional[str] = None
    location_type: Optional[str] = None  # remote, hybrid, on_site
    min_salary: Optional[float] = None
    source: Optional[str] = None
    limit: int = 50
    offset: int = 0

class JobImportUrl(BaseModel):
    url: str

class JobManualCreate(BaseModel):
    title: str
    company: str
    location: Optional[str] = "Remote"
    location_type: str = "remote"
    description: str
    requirements: List[str] = []
    responsibilities: List[str] = []
    required_skills: List[str] = []
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: Optional[str] = "USD"
    application_url: Optional[str] = None


# ----------------- Matching Schemas -----------------
class JobMatchResponse(BaseModel):
    id: str
    job_id: str
    job: Optional[JobResponse] = None
    overall_score: float
    skill_score: float
    experience_score: float
    education_score: float
    location_score: float
    matching_requirements: List[str] = []
    partial_requirements: List[str] = []
    missing_qualifications: List[str] = []
    matching_experience: List[str] = []
    suggestions: List[str] = []
    assessment: Optional[str] = None
    evaluated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MatchEvaluateRequest(BaseModel):
    job_id: str
    custom_weights: Optional[Dict[str, float]] = None


# ----------------- Document Generation Schemas -----------------
class GenerateCVRequest(BaseModel):
    job_id: str
    target_role: Optional[str] = None
    emphasis_skills: Optional[List[str]] = None

class GenerateCoverLetterRequest(BaseModel):
    job_id: str
    tone: Optional[str] = "professional"  # professional, confident, enthusiastic
    key_achievements_to_highlight: Optional[List[str]] = None

class GenerateEmailRequest(BaseModel):
    job_id: str
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None

class GeneratedDocumentResponse(BaseModel):
    id: str
    user_id: str
    job_id: Optional[str] = None
    document_type: str  # tailored_cv, cover_letter, application_email
    title: str
    file_path_pdf: Optional[str] = None
    file_path_docx: Optional[str] = None
    content_json: Dict[str, Any] = {}
    content_text: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ----------------- Application Tracking Schemas -----------------
class ApplicationCreate(BaseModel):
    job_id: str
    status: str = "Saved"
    applied_at: Optional[datetime] = None
    follow_up_date: Optional[datetime] = None
    interview_date: Optional[datetime] = None
    notes: Optional[str] = None
    application_url: Optional[str] = None

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    applied_at: Optional[datetime] = None
    follow_up_date: Optional[datetime] = None
    interview_date: Optional[datetime] = None
    notes: Optional[str] = None
    application_url: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: str
    user_id: str
    job_id: str
    job: Optional[JobResponse] = None
    status: str
    applied_at: Optional[datetime] = None
    follow_up_date: Optional[datetime] = None
    interview_date: Optional[datetime] = None
    notes: Optional[str] = None
    application_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ----------------- Interview Schemas -----------------
class InterviewQuestionSchema(BaseModel):
    id: str
    question: str
    category: str
    suggested_answer_star: Optional[str] = None
    user_answer: Optional[str] = None
    ai_feedback: Optional[str] = None
    score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

class InterviewCreate(BaseModel):
    application_id: Optional[str] = None
    job_id: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    interview_type: str = "Technical"
    notes: Optional[str] = None

class InterviewResponse(BaseModel):
    id: str
    user_id: str
    application_id: Optional[str] = None
    job_id: Optional[str] = None
    job: Optional[JobResponse] = None
    scheduled_at: Optional[datetime] = None
    interview_type: str
    notes: Optional[str] = None
    feedback: Optional[str] = None
    status: str
    questions: List[InterviewQuestionSchema] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class GenerateInterviewPrepRequest(BaseModel):
    job_id: str
    interview_type: Optional[str] = "Comprehensive"  # Technical, Behavioral, Leadership, Comprehensive

class MockInterviewAnswerSubmit(BaseModel):
    question_id: str
    user_answer: str


# ----------------- Chat Schemas -----------------
class ChatMessageCreate(BaseModel):
    content: str
    session_id: Optional[str] = None

class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    metadata_json: Dict[str, Any] = {}
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ChatSessionResponse(BaseModel):
    id: str
    title: str
    messages: List[ChatMessageResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ----------------- User Settings Schemas -----------------
class UserSettingsResponse(BaseModel):
    id: str
    preferred_locations: List[str]
    job_categories: List[str]
    remote_only: bool
    min_experience_years: float
    min_match_threshold: float
    recurring_search_frequency: str
    notification_email: Optional[str] = None
    auto_matching_enabled: bool
    ai_provider: Optional[str] = "ollama"
    ai_model: Optional[str] = "qwen3"
    ai_api_key: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserSettingsUpdate(BaseModel):
    preferred_locations: Optional[List[str]] = None
    job_categories: Optional[List[str]] = None
    remote_only: Optional[bool] = None
    min_experience_years: Optional[float] = None
    min_match_threshold: Optional[float] = None
    recurring_search_frequency: Optional[str] = None
    notification_email: Optional[str] = None
    auto_matching_enabled: Optional[bool] = None
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    ai_api_key: Optional[str] = None


# ----------------- Dashboard Schemas -----------------
class ActivityItem(BaseModel):
    id: str
    type: str  # cv_uploaded, job_saved, application_status_changed, document_generated, interview_scheduled
    title: str
    description: str
    timestamp: datetime

class DashboardOverviewResponse(BaseModel):
    total_jobs_discovered: int
    strong_matches_count: int
    applications_submitted: int
    interviews_scheduled: int
    offers_received: int
    recommended_jobs: List[JobResponse] = []
    recent_activities: List[ActivityItem] = []
    pipeline_breakdown: Dict[str, int] = {}
    upcoming_follow_ups: List[Dict[str, Any]] = []
    profile_completion_percentage: int = 0
