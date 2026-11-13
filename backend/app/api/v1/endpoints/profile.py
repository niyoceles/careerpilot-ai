from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.entities import (
    User, ProfessionalProfile, WorkExperience, Education, Skill, Certification, Project
)
from app.schemas.all_schemas import ProfessionalProfileResponse, ProfessionalProfileUpdate

router = APIRouter(prefix="/profile", tags=["Professional Profile"])

@router.get("", response_model=ProfessionalProfileResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(ProfessionalProfile).filter(ProfessionalProfile.user_id == current_user.id).first()
    if not profile:
        # Create empty profile skeleton so frontend has a clean initial state
        profile = ProfessionalProfile(
            user_id=current_user.id,
            full_name=current_user.full_name,
            email=current_user.email,
            summary="Add your professional summary here.",
            total_experience_years=0.0,
            preferred_locations=["Rwanda", "Remote"],
            preferred_job_titles=["Software Engineer"]
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.put("", response_model=ProfessionalProfileResponse)
def update_profile(
    profile_in: ProfessionalProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(ProfessionalProfile).filter(ProfessionalProfile.user_id == current_user.id).first()
    if not profile:
        profile = ProfessionalProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    update_fields = [
        "full_name", "email", "phone", "location", "summary",
        "total_experience_years", "preferred_job_titles",
        "preferred_locations", "remote_preference", "salary_expectations",
        "is_confirmed"
    ]
    for field in update_fields:
        val = getattr(profile_in, field, None)
        if val is not None:
            setattr(profile, field, val)

    # If work experiences provided, update them
    if profile_in.work_experiences is not None:
        db.query(WorkExperience).filter(WorkExperience.profile_id == profile.id).delete()
        for exp in profile_in.work_experiences:
            db.add(WorkExperience(
                profile_id=profile.id,
                company=exp.company,
                position=exp.position,
                location=exp.location,
                start_date=exp.start_date,
                end_date=exp.end_date,
                is_current=exp.is_current,
                description=exp.description,
                achievements=exp.achievements
            ))

    # If education provided, update them
    if profile_in.education is not None:
        db.query(Education).filter(Education.profile_id == profile.id).delete()
        for edu in profile_in.education:
            db.add(Education(
                profile_id=profile.id,
                institution=edu.institution,
                degree=edu.degree,
                field_of_study=edu.field_of_study,
                start_date=edu.start_date,
                end_date=edu.end_date,
                grade=edu.grade
            ))

    # If skills provided, update them
    if profile_in.skills is not None:
        db.query(Skill).filter(Skill.profile_id == profile.id).delete()
        for sk in profile_in.skills:
            db.add(Skill(
                profile_id=profile.id,
                name=sk.name,
                category=sk.category,
                proficiency=sk.proficiency,
                years_of_experience=sk.years_of_experience
            ))

    # If projects provided, update them
    if profile_in.projects is not None:
        db.query(Project).filter(Project.profile_id == profile.id).delete()
        for prj in profile_in.projects:
            db.add(Project(
                profile_id=profile.id,
                name=prj.name,
                description=prj.description,
                role=prj.role,
                technologies=prj.technologies,
                url=prj.url
            ))

    # If certifications provided, update them
    if profile_in.certifications is not None:
        db.query(Certification).filter(Certification.profile_id == profile.id).delete()
        for cert in profile_in.certifications:
            db.add(Certification(
                profile_id=profile.id,
                name=cert.name,
                issuing_organization=cert.issuing_organization,
                issue_date=cert.issue_date,
                expiration_date=cert.expiration_date,
                credential_url=cert.credential_url
            ))

    db.commit()
    db.refresh(profile)
    return profile

