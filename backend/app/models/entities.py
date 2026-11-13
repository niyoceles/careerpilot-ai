import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedModel, generate_uuid

class User(TimeStampedModel):
    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)

    cvs = relationship("CV", back_populates="user", cascade="all, delete-orphan")
    profile = relationship("ProfessionalProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    job_matches = relationship("JobMatch", back_populates="user", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="user", cascade="all, delete-orphan")
    generated_documents = relationship("GeneratedDocument", back_populates="user", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")


class CV(TimeStampedModel):
    __tablename__ = "cvs"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String(50), nullable=False)  # pdf, docx
    raw_text = Column(Text, nullable=True)

    user = relationship("User", back_populates="cvs")
    profile = relationship("ProfessionalProfile", back_populates="cv", uselist=False)


class ProfessionalProfile(TimeStampedModel):
    __tablename__ = "professional_profiles"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    cv_id = Column(String(36), ForeignKey("cvs.id", ondelete="SET NULL"), nullable=True)
    full_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    summary = Column(Text, nullable=True)
    total_experience_years = Column(Float, default=0.0)
    preferred_job_titles = Column(JSON, default=list)  # list of strings
    preferred_locations = Column(JSON, default=list)   # list of strings
    remote_preference = Column(String(50), default="remote_or_hybrid")  # remote, hybrid, on_site, any
    salary_expectations = Column(String(100), nullable=True)
    is_confirmed = Column(Boolean, default=False)

    user = relationship("User", back_populates="profile")
    cv = relationship("CV", back_populates="profile")
    work_experiences = relationship("WorkExperience", back_populates="profile", cascade="all, delete-orphan", order_by="desc(WorkExperience.start_date)")
    education = relationship("Education", back_populates="profile", cascade="all, delete-orphan")
    skills = relationship("Skill", back_populates="profile", cascade="all, delete-orphan")
    certifications = relationship("Certification", back_populates="profile", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="profile", cascade="all, delete-orphan")


class WorkExperience(TimeStampedModel):
    __tablename__ = "work_experiences"

    profile_id = Column(String(36), ForeignKey("professional_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    company = Column(String(255), nullable=False)
    position = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    is_current = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
    achievements = Column(JSON, default=list)

    profile = relationship("ProfessionalProfile", back_populates="work_experiences")


class Education(TimeStampedModel):
    __tablename__ = "education"

    profile_id = Column(String(36), ForeignKey("professional_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    institution = Column(String(255), nullable=False)
    degree = Column(String(255), nullable=False)
    field_of_study = Column(String(255), nullable=True)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    grade = Column(String(50), nullable=True)

    profile = relationship("ProfessionalProfile", back_populates="education")


class Skill(TimeStampedModel):
    __tablename__ = "skills"

    profile_id = Column(String(36), ForeignKey("professional_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    category = Column(String(50), default="technical")  # technical, soft, language
    proficiency = Column(String(50), default="intermediate")  # beginner, intermediate, advanced, expert
    years_of_experience = Column(Float, nullable=True)

    profile = relationship("ProfessionalProfile", back_populates="skills")


class Certification(TimeStampedModel):
    __tablename__ = "certifications"

    profile_id = Column(String(36), ForeignKey("professional_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    issuing_organization = Column(String(255), nullable=False)
    issue_date = Column(String(50), nullable=True)
    expiration_date = Column(String(50), nullable=True)
    credential_url = Column(String(512), nullable=True)

    profile = relationship("ProfessionalProfile", back_populates="certifications")


class Project(TimeStampedModel):
    __tablename__ = "projects"

    profile_id = Column(String(36), ForeignKey("professional_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    role = Column(String(255), nullable=True)
    technologies = Column(JSON, default=list)
    url = Column(String(512), nullable=True)

    profile = relationship("ProfessionalProfile", back_populates="projects")


class JobSource(TimeStampedModel):
    __tablename__ = "job_sources"

    name = Column(String(100), nullable=False)
    source_type = Column(String(50), nullable=False)  # api, career_page, manual, user_url
    base_url = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True)
    last_checked_at = Column(DateTime, nullable=True)

    jobs = relationship("Job", back_populates="source")


class Job(TimeStampedModel):
    __tablename__ = "jobs"

    source_id = Column(String(36), ForeignKey("job_sources.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False, index=True)
    company = Column(String(255), nullable=False, index=True)
    location = Column(String(255), nullable=True)
    location_type = Column(String(50), default="remote")  # remote, hybrid, on_site
    description = Column(Text, nullable=False)
    requirements = Column(JSON, default=list)
    responsibilities = Column(JSON, default=list)
    required_skills = Column(JSON, default=list)
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    currency = Column(String(10), default="USD")
    publication_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deadline = Column(DateTime, nullable=True)
    original_url = Column(String(1024), nullable=True)
    application_url = Column(String(1024), nullable=True)
    verification_status = Column(String(50), default="verified")  # verified, unverified, expired
    verified_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    raw_hash = Column(String(64), index=True, nullable=True)  # for deduplication

    source = relationship("JobSource", back_populates="jobs")
    matches = relationship("JobMatch", back_populates="job", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="job")


class JobMatch(TimeStampedModel):
    __tablename__ = "job_matches"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    overall_score = Column(Float, default=0.0)
    skill_score = Column(Float, default=0.0)
    experience_score = Column(Float, default=0.0)
    education_score = Column(Float, default=0.0)
    location_score = Column(Float, default=0.0)
    matching_requirements = Column(JSON, default=list)
    partial_requirements = Column(JSON, default=list)
    missing_qualifications = Column(JSON, default=list)
    matching_experience = Column(JSON, default=list)
    suggestions = Column(JSON, default=list)
    assessment = Column(Text, nullable=True)
    evaluated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="job_matches")
    job = relationship("Job", back_populates="matches")


class Application(TimeStampedModel):
    __tablename__ = "applications"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="Saved", index=True)  # Saved, Analyzing, Ready to Apply, Applied, Assessment, Interview, Offer, Rejected, Withdrawn
    applied_at = Column(DateTime, nullable=True)
    follow_up_date = Column(DateTime, nullable=True)
    interview_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    application_url = Column(String(1024), nullable=True)

    user = relationship("User", back_populates="applications")
    job = relationship("Job", back_populates="applications")
    documents = relationship("ApplicationDocument", back_populates="application", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="application", cascade="all, delete-orphan")
    reminders = relationship("FollowUpReminder", back_populates="application", cascade="all, delete-orphan")


class GeneratedDocument(TimeStampedModel):
    __tablename__ = "generated_documents"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True, index=True)
    document_type = Column(String(50), nullable=False)  # tailored_cv, cover_letter, application_email
    title = Column(String(255), nullable=False)
    file_path_pdf = Column(String(512), nullable=True)
    file_path_docx = Column(String(512), nullable=True)
    content_json = Column(JSON, default=dict)
    content_text = Column(Text, nullable=True)

    user = relationship("User", back_populates="generated_documents")
    job = relationship("Job")


class ApplicationDocument(TimeStampedModel):
    __tablename__ = "application_documents"

    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(String(36), ForeignKey("generated_documents.id", ondelete="CASCADE"), nullable=False)
    document_type = Column(String(50), nullable=False)

    application = relationship("Application", back_populates="documents")
    document = relationship("GeneratedDocument")


class Interview(TimeStampedModel):
    __tablename__ = "interviews"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="SET NULL"), nullable=True)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    interview_type = Column(String(50), default="Technical")  # Screening, Technical, Behavioral, Final
    notes = Column(Text, nullable=True)
    feedback = Column(Text, nullable=True)
    status = Column(String(50), default="Scheduled")  # Scheduled, Completed, Cancelled

    user = relationship("User", back_populates="interviews")
    application = relationship("Application", back_populates="interviews")
    job = relationship("Job")
    questions = relationship("InterviewQuestion", back_populates="interview", cascade="all, delete-orphan")


class InterviewQuestion(TimeStampedModel):
    __tablename__ = "interview_questions"

    interview_id = Column(String(36), ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    category = Column(String(50), default="technical")  # technical, behavioral, leadership, situational, hr
    suggested_answer_star = Column(Text, nullable=True)
    user_answer = Column(Text, nullable=True)
    ai_feedback = Column(Text, nullable=True)
    score = Column(Float, nullable=True)

    interview = relationship("Interview", back_populates="questions")


class FollowUpReminder(TimeStampedModel):
    __tablename__ = "follow_up_reminders"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    remind_at = Column(DateTime, nullable=False)
    is_completed = Column(Boolean, default=False)

    application = relationship("Application", back_populates="reminders")


class AgentRun(TimeStampedModel):
    __tablename__ = "agent_runs"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_name = Column(String(100), nullable=False, index=True)
    status = Column(String(50), default="running")  # running, completed, failed
    input_params = Column(JSON, default=dict)
    output_result = Column(JSON, default=dict)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)


class ChatSession(TimeStampedModel):
    __tablename__ = "chat_sessions"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), default="Career Advice")

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(TimeStampedModel):
    __tablename__ = "chat_messages"

    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    metadata_json = Column(JSON, default=dict)

    session = relationship("ChatSession", back_populates="messages")


class UserSettings(TimeStampedModel):
    __tablename__ = "user_settings"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    preferred_locations = Column(JSON, default=lambda: ["Rwanda", "Kigali", "East Africa", "Remote"])
    job_categories = Column(JSON, default=lambda: ["Software Engineering", "Full Stack", "AI / ML", "Backend"])
    remote_only = Column(Boolean, default=False)
    min_experience_years = Column(Float, default=0.0)
    min_match_threshold = Column(Float, default=60.0)
    recurring_search_frequency = Column(String(50), default="daily")  # daily, weekly, manual
    notification_email = Column(String(255), nullable=True)
    auto_matching_enabled = Column(Boolean, default=True)
    ai_provider = Column(String(50), default="ollama")
    ai_model = Column(String(100), default="qwen3")
    ai_api_key = Column(String(255), nullable=True)

    user = relationship("User", back_populates="settings")

