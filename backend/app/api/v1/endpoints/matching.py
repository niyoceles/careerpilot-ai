from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.entities import User, Job, JobMatch
from app.schemas.all_schemas import JobMatchResponse, MatchEvaluateRequest, JobResponse
from app.services.matching_service import MatchingService

router = APIRouter(prefix="/matching", tags=["Job Matching"])

@router.get("", response_model=List[JobMatchResponse])
def get_user_matches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    matches = (
        db.query(JobMatch)
        .filter(JobMatch.user_id == current_user.id)
        .order_by(desc(JobMatch.overall_score))
        .all()
    )
    res = []
    for m in matches:
        job = m.job
        job_schema = None
        if job:
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
                salary_min=job.salary_min,
                salary_max=job.salary_max,
                currency=job.currency,
                application_url=job.application_url,
                original_url=job.original_url,
                verification_status=job.verification_status,
                created_at=job.created_at,
                match_score=m.overall_score
            )
        res.append(JobMatchResponse(
            id=m.id,
            job_id=m.job_id,
            job=job_schema,
            overall_score=m.overall_score,
            skill_score=m.skill_score,
            experience_score=m.experience_score,
            education_score=m.education_score,
            location_score=m.location_score,
            matching_requirements=m.matching_requirements or [],
            partial_requirements=m.partial_requirements or [],
            missing_qualifications=m.missing_qualifications or [],
            matching_experience=m.matching_experience or [],
            suggestions=m.suggestions or [],
            assessment=m.assessment,
            evaluated_at=m.evaluated_at
        ))
    return res

@router.post("/evaluate", response_model=JobMatchResponse)
def evaluate_job_match(
    payload: MatchEvaluateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    
    if not current_user.profile:
        raise HTTPException(status_code=400, detail="Please upload a CV or create your profile before evaluating matches.")

    eval_data = MatchingService.evaluate_match(
        profile=current_user.profile,
        job=job,
        custom_weights=payload.custom_weights
    )

    match = db.query(JobMatch).filter(JobMatch.user_id == current_user.id, JobMatch.job_id == job.id).first()
    if not match:
        match = JobMatch(user_id=current_user.id, job_id=job.id)
        db.add(match)

    match.overall_score = eval_data["overall_score"]
    match.skill_score = eval_data["skill_score"]
    match.experience_score = eval_data["experience_score"]
    match.education_score = eval_data["education_score"]
    match.location_score = eval_data["location_score"]
    match.matching_requirements = eval_data["matching_requirements"]
    match.partial_requirements = eval_data["partial_requirements"]
    match.missing_qualifications = eval_data["missing_qualifications"]
    match.matching_experience = eval_data["matching_experience"]
    match.suggestions = eval_data["suggestions"]
    match.assessment = eval_data["assessment"]

    db.commit()
    db.refresh(match)

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
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        currency=job.currency,
        application_url=job.application_url,
        original_url=job.original_url,
        verification_status=job.verification_status,
        created_at=job.created_at,
        match_score=match.overall_score
    )

    return JobMatchResponse(
        id=match.id,
        job_id=match.job_id,
        job=job_schema,
        overall_score=match.overall_score,
        skill_score=match.skill_score,
        experience_score=match.experience_score,
        education_score=match.education_score,
        location_score=match.location_score,
        matching_requirements=match.matching_requirements or [],
        partial_requirements=match.partial_requirements or [],
        missing_qualifications=match.missing_qualifications or [],
        matching_experience=match.matching_experience or [],
        suggestions=match.suggestions or [],
        assessment=match.assessment,
        evaluated_at=match.evaluated_at
    )

