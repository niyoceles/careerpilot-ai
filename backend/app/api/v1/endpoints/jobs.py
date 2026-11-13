from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.entities import User, Job, JobMatch, Application
from app.schemas.all_schemas import JobResponse, JobImportUrl, JobManualCreate
from app.services.job_service import JobService
from app.services.matching_service import MatchingService

router = APIRouter(prefix="/jobs", tags=["Job Discovery"])

@router.get("", response_model=List[JobResponse])
def get_jobs(
    query: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    location_type: Optional[str] = Query(None),
    min_salary: Optional[float] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure initial seed jobs exist
    if db.query(Job).count() == 0:
        JobService.seed_initial_jobs(db)

    q = db.query(Job)
    if query:
        pattern = f"%{query}%"
        q = q.filter(or_(Job.title.ilike(pattern), Job.company.ilike(pattern), Job.description.ilike(pattern)))
    if location:
        q = q.filter(Job.location.ilike(f"%{location}%"))
    if location_type:
        q = q.filter(Job.location_type == location_type.lower())
    if min_salary:
        q = q.filter(Job.salary_min >= min_salary)

    jobs = q.order_by(desc(Job.created_at)).offset(offset).limit(limit).all()

    # Get match scores for current user
    user_matches = {m.job_id: m.overall_score for m in current_user.job_matches}

    res = []
    for j in jobs:
        score = user_matches.get(j.id)
        if score is None and current_user.profile and current_user.profile.skills:
            # Quick evaluate on the fly if not cached
            eval_res = MatchingService.evaluate_match(current_user.profile, j)
            score = eval_res["overall_score"]

        res.append(JobResponse(
            id=j.id,
            source_id=j.source_id,
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
            publication_date=j.publication_date,
            deadline=j.deadline,
            original_url=j.original_url,
            application_url=j.application_url,
            verification_status=j.verification_status,
            verified_at=j.verified_at,
            created_at=j.created_at,
            match_score=score
        ))
    return res

@router.post("/search")
async def trigger_job_search(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Triggers live search against authorized sources and evaluates matches."""
    new_count = await JobService.fetch_remote_jobs_api(db, limit=8)
    
    # Evaluate matches for active user profile
    if current_user.profile:
        all_jobs = db.query(Job).limit(30).all()
        for j in all_jobs:
            existing = db.query(JobMatch).filter(JobMatch.user_id == current_user.id, JobMatch.job_id == j.id).first()
            if not existing:
                eval_res = MatchingService.evaluate_match(current_user.profile, j)
                match_rec = JobMatch(
                    user_id=current_user.id,
                    job_id=j.id,
                    overall_score=eval_res["overall_score"],
                    skill_score=eval_res["skill_score"],
                    experience_score=eval_res["experience_score"],
                    education_score=eval_res["education_score"],
                    location_score=eval_res["location_score"],
                    matching_requirements=eval_res["matching_requirements"],
                    partial_requirements=eval_res["partial_requirements"],
                    missing_qualifications=eval_res["missing_qualifications"],
                    matching_experience=eval_res["matching_experience"],
                    suggestions=eval_res["suggestions"],
                    assessment=eval_res["assessment"]
                )
                db.add(match_rec)
        db.commit()

    return {"message": "Job discovery completed successfully", "new_jobs_found": new_count}

@router.post("/import/url", response_model=JobResponse)
async def import_job_from_url(
    payload: JobImportUrl,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = await JobService.parse_and_import_url(db, payload.url)
    if not job:
        raise HTTPException(status_code=400, detail="Could not retrieve or parse job posting from provided URL.")
    
    score = None
    if current_user.profile:
        eval_res = MatchingService.evaluate_match(current_user.profile, job)
        score = eval_res["overall_score"]
        db.add(JobMatch(
            user_id=current_user.id,
            job_id=job.id,
            overall_score=eval_res["overall_score"],
            skill_score=eval_res["skill_score"],
            experience_score=eval_res["experience_score"],
            education_score=eval_res["education_score"],
            location_score=eval_res["location_score"],
            matching_requirements=eval_res["matching_requirements"],
            partial_requirements=eval_res["partial_requirements"],
            missing_qualifications=eval_res["missing_qualifications"],
            suggestions=eval_res["suggestions"],
            assessment=eval_res["assessment"]
        ))
        db.commit()

    return JobResponse(
        id=job.id,
        title=job.title,
        company=job.company,
        location=job.location,
        location_type=job.location_type,
        description=job.description,
        requirements=job.requirements or [],
        responsibilities=job.responsibilities or [],
        required_skills=job.required_skills or [],
        original_url=job.original_url,
        application_url=job.application_url,
        verification_status=job.verification_status,
        created_at=job.created_at,
        match_score=score
    )

@router.post("/import/manual", response_model=JobResponse)
def import_manual_job(
    payload: JobManualCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    j_hash = JobService.calculate_job_hash(payload.title, payload.company)
    job = Job(
        title=payload.title,
        company=payload.company,
        location=payload.location,
        location_type=payload.location_type,
        description=payload.description,
        requirements=payload.requirements,
        responsibilities=payload.responsibilities,
        required_skills=payload.required_skills,
        salary_min=payload.salary_min,
        salary_max=payload.salary_max,
        currency=payload.currency,
        application_url=payload.application_url,
        verification_status="verified",
        raw_hash=j_hash
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    score = None
    if current_user.profile:
        eval_res = MatchingService.evaluate_match(current_user.profile, job)
        score = eval_res["overall_score"]
        db.add(JobMatch(
            user_id=current_user.id,
            job_id=job.id,
            overall_score=eval_res["overall_score"],
            skill_score=eval_res["skill_score"],
            experience_score=eval_res["experience_score"],
            education_score=eval_res["education_score"],
            location_score=eval_res["location_score"],
            matching_requirements=eval_res["matching_requirements"],
            suggestions=eval_res["suggestions"],
            assessment=eval_res["assessment"]
        ))
        db.commit()

    return JobResponse(
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
        match_score=score
    )

@router.get("/{job_id}", response_model=JobResponse)
def get_job_detail(job_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job vacancy not found.")
    
    match = db.query(JobMatch).filter(JobMatch.user_id == current_user.id, JobMatch.job_id == job.id).first()
    score = match.overall_score if match else None

    return JobResponse(
        id=job.id,
        source_id=job.source_id,
        title=job.title,
        company=job.company,
        location=job.location,
        location_type=job.location_type,
        description=job.description,
        requirements=job.requirements or [],
        responsibilities=job.responsibilities or [],
        required_skills=job.required_skills or [],
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        currency=job.currency,
        publication_date=job.publication_date,
        deadline=job.deadline,
        original_url=job.original_url,
        application_url=job.application_url,
        verification_status=job.verification_status,
        verified_at=job.verified_at,
        created_at=job.created_at,
        match_score=score
    )

@router.post("/{job_id}/save")
def save_job_to_applications(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job vacancy not found.")
    
    existing = db.query(Application).filter(Application.user_id == current_user.id, Application.job_id == job_id).first()
    if existing:
        return {"message": "Job is already saved in your applications", "application_id": existing.id}

    app_record = Application(
        user_id=current_user.id,
        job_id=job.id,
        status="Saved",
        application_url=job.application_url or job.original_url,
        notes=f"Saved from Job Discovery for {job.company}"
    )
    db.add(app_record)
    db.commit()
    db.refresh(app_record)
    return {"message": "Job saved to applications successfully", "application_id": app_record.id}

