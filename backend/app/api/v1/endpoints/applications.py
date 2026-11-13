from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.entities import User, Application, Job, JobMatch
from app.schemas.all_schemas import ApplicationCreate, ApplicationUpdate, ApplicationResponse, JobResponse

router = APIRouter(prefix="/applications", tags=["Application Tracking"])

@router.get("", response_model=List[ApplicationResponse])
def get_applications(
    status_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(Application).filter(Application.user_id == current_user.id)
    if status_filter:
        q = q.filter(Application.status == status_filter)

    apps = q.order_by(desc(Application.updated_at)).all()
    res = []
    for a in apps:
        job_schema = None
        if a.job:
            match = db.query(JobMatch).filter(JobMatch.user_id == current_user.id, JobMatch.job_id == a.job.id).first()
            job_schema = JobResponse(
                id=a.job.id,
                title=a.job.title,
                company=a.job.company,
                location=a.job.location,
                location_type=a.job.location_type,
                description=a.job.description,
                requirements=a.job.requirements or [],
                responsibilities=a.job.responsibilities or [],
                required_skills=a.job.required_skills or [],
                salary_min=a.job.salary_min,
                salary_max=a.job.salary_max,
                currency=a.job.currency,
                application_url=a.job.application_url,
                original_url=a.job.original_url,
                verification_status=a.job.verification_status,
                created_at=a.job.created_at,
                match_score=match.overall_score if match else None
            )

        res.append(ApplicationResponse(
            id=a.id,
            user_id=a.user_id,
            job_id=a.job_id,
            job=job_schema,
            status=a.status,
            applied_at=a.applied_at,
            follow_up_date=a.follow_up_date,
            interview_date=a.interview_date,
            notes=a.notes,
            application_url=a.application_url,
            created_at=a.created_at,
            updated_at=a.updated_at
        ))
    return res

@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    existing = db.query(Application).filter(Application.user_id == current_user.id, Application.job_id == payload.job_id).first()
    if existing:
        return existing

    app_rec = Application(
        user_id=current_user.id,
        job_id=payload.job_id,
        status=payload.status,
        applied_at=payload.applied_at,
        follow_up_date=payload.follow_up_date,
        interview_date=payload.interview_date,
        notes=payload.notes,
        application_url=payload.application_url or job.application_url or job.original_url
    )
    db.add(app_rec)
    db.commit()
    db.refresh(app_rec)

    match = db.query(JobMatch).filter(JobMatch.user_id == current_user.id, JobMatch.job_id == job.id).first()
    job_schema = JobResponse(
        id=job.id,
        title=job.title,
        company=job.company,
        location=job.location,
        location_type=job.location_type,
        description=job.description,
        requirements=job.requirements or [],
        responsibilities=job.responsibilities or [],
        required_skills=job.required_skills or [],
        application_url=job.application_url,
        verification_status=job.verification_status,
        created_at=job.created_at,
        match_score=match.overall_score if match else None
    )

    return ApplicationResponse(
        id=app_rec.id,
        user_id=app_rec.user_id,
        job_id=app_rec.job_id,
        job=job_schema,
        status=app_rec.status,
        applied_at=app_rec.applied_at,
        follow_up_date=app_rec.follow_up_date,
        interview_date=app_rec.interview_date,
        notes=app_rec.notes,
        application_url=app_rec.application_url,
        created_at=app_rec.created_at,
        updated_at=app_rec.updated_at
    )

@router.patch("/{app_id}", response_model=ApplicationResponse)
def update_application(
    app_id: str,
    payload: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app_rec = db.query(Application).filter(Application.id == app_id, Application.user_id == current_user.id).first()
    if not app_rec:
        raise HTTPException(status_code=404, detail="Application not found.")

    for field in ["status", "applied_at", "follow_up_date", "interview_date", "notes", "application_url"]:
        val = getattr(payload, field, None)
        if val is not None:
            setattr(app_rec, field, val)

    db.commit()
    db.refresh(app_rec)

    job_schema = None
    if app_rec.job:
        job = app_rec.job
        match = db.query(JobMatch).filter(JobMatch.user_id == current_user.id, JobMatch.job_id == job.id).first()
        job_schema = JobResponse(
            id=job.id,
            title=job.title,
            company=job.company,
            location=job.location,
            location_type=job.location_type,
            description=job.description,
            requirements=job.requirements or [],
            responsibilities=job.responsibilities or [],
            required_skills=job.required_skills or [],
            application_url=job.application_url,
            verification_status=job.verification_status,
            created_at=job.created_at,
            match_score=match.overall_score if match else None
        )

    return ApplicationResponse(
        id=app_rec.id,
        user_id=app_rec.user_id,
        job_id=app_rec.job_id,
        job=job_schema,
        status=app_rec.status,
        applied_at=app_rec.applied_at,
        follow_up_date=app_rec.follow_up_date,
        interview_date=app_rec.interview_date,
        notes=app_rec.notes,
        application_url=app_rec.application_url,
        created_at=app_rec.created_at,
        updated_at=app_rec.updated_at
    )

@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    app_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app_rec = db.query(Application).filter(Application.id == app_id, Application.user_id == current_user.id).first()
    if not app_rec:
        raise HTTPException(status_code=404, detail="Application not found.")
    db.delete(app_rec)
    db.commit()
    return None

