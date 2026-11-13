from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.entities import User, Job, JobMatch, Application, Interview, CV, GeneratedDocument
from app.schemas.all_schemas import DashboardOverviewResponse, JobResponse, ActivityItem

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/overview", response_model=DashboardOverviewResponse)
def get_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total_jobs = db.query(Job).count()
    strong_matches = db.query(JobMatch).filter(
        JobMatch.user_id == current_user.id,
        JobMatch.overall_score >= 70.0
    ).count()

    applications = db.query(Application).filter(Application.user_id == current_user.id).all()
    apps_submitted = sum(1 for a in applications if a.status in ["Applied", "Assessment", "Interview", "Offer"])
    interviews_count = db.query(Interview).filter(Interview.user_id == current_user.id).count()
    offers_count = sum(1 for a in applications if a.status == "Offer")

    # Pipeline breakdown
    pipeline_counts = {
        "Saved": 0,
        "Analyzing": 0,
        "Ready to Apply": 0,
        "Applied": 0,
        "Assessment": 0,
        "Interview": 0,
        "Offer": 0,
        "Rejected": 0,
        "Withdrawn": 0
    }
    for a in applications:
        if a.status in pipeline_counts:
            pipeline_counts[a.status] += 1
        else:
            pipeline_counts[a.status] = 1

    # Recommended opportunities
    top_matches = (
        db.query(JobMatch)
        .filter(JobMatch.user_id == current_user.id)
        .order_by(desc(JobMatch.overall_score))
        .limit(4)
        .all()
    )
    recommended_jobs = []
    for m in top_matches:
        if m.job:
            j = m.job
            recommended_jobs.append(JobResponse(
                id=j.id,
                title=j.title,
                company=j.company,
                location=j.location,
                location_type=j.location_type,
                description=j.description,
                requirements=j.requirements or [],
                responsibilities=j.responsibilities or [],
                required_skills=j.required_skills or [],
                salary_min=j.salary_min,
                salary_max=j.salary_max,
                currency=j.currency,
                application_url=j.application_url,
                original_url=j.original_url,
                verification_status=j.verification_status,
                created_at=j.created_at,
                match_score=m.overall_score
            ))

    # Fallback to recent jobs if no matches computed yet
    if not recommended_jobs:
        recent_jobs = db.query(Job).order_by(desc(Job.created_at)).limit(3).all()
        for j in recent_jobs:
            recommended_jobs.append(JobResponse(
                id=j.id,
                title=j.title,
                company=j.company,
                location=j.location,
                location_type=j.location_type,
                description=j.description,
                requirements=j.requirements or [],
                responsibilities=j.responsibilities or [],
                required_skills=j.required_skills or [],
                salary_min=j.salary_min,
                salary_max=j.salary_max,
                currency=j.currency,
                application_url=j.application_url,
                original_url=j.original_url,
                verification_status=j.verification_status,
                created_at=j.created_at,
                match_score=75.0
            ))

    # Recent activities aggregated from DB records
    activities = []
    recent_cv = db.query(CV).filter(CV.user_id == current_user.id).order_by(desc(CV.created_at)).first()
    if recent_cv:
        activities.append(ActivityItem(
            id=recent_cv.id,
            type="cv_uploaded",
            title="CV Uploaded & Analyzed",
            description=f"Extracted background from {recent_cv.filename}",
            timestamp=recent_cv.created_at
        ))

    recent_doc = db.query(GeneratedDocument).filter(GeneratedDocument.user_id == current_user.id).order_by(desc(GeneratedDocument.created_at)).first()
    if recent_doc:
        activities.append(ActivityItem(
            id=recent_doc.id,
            type="document_generated",
            title=recent_doc.title,
            description="Generated tailored application material",
            timestamp=recent_doc.created_at
        ))

    for a in applications[:2]:
        activities.append(ActivityItem(
            id=a.id,
            type="application_status_changed",
            title=f"Application: {a.job.title if a.job else 'Job'}",
            description=f"Status: {a.status} at {a.job.company if a.job else 'Company'}",
            timestamp=a.updated_at or a.created_at
        ))

    # Profile completion score
    profile = current_user.profile
    completion = 20  # account created
    if profile:
        if profile.summary: completion += 15
        if profile.skills: completion += 25
        if profile.work_experiences: completion += 20
        if profile.education: completion += 10
        if profile.is_confirmed: completion += 10
    completion = min(100, completion)

    # Upcoming follow-ups
    upcoming = []
    for a in applications:
        if a.follow_up_date:
            upcoming.append({
                "application_id": a.id,
                "company": a.job.company if a.job else "Target Company",
                "position": a.job.title if a.job else "Target Role",
                "follow_up_date": a.follow_up_date.isoformat(),
                "status": a.status
            })

    return DashboardOverviewResponse(
        total_jobs_discovered=total_jobs,
        strong_matches_count=strong_matches,
        applications_submitted=apps_submitted,
        interviews_scheduled=interviews_count,
        offers_received=offers_count,
        recommended_jobs=recommended_jobs,
        recent_activities=activities,
        pipeline_breakdown=pipeline_counts,
        upcoming_follow_ups=upcoming,
        profile_completion_percentage=completion
    )

