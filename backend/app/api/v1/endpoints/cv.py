import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.models.entities import User, CV, ProfessionalProfile, WorkExperience, Education, Skill, Project, Certification
from app.schemas.all_schemas import CVResponse
from app.utils.text_sanitizer import validate_uploaded_file
from app.services.cv_parser import CVParser
from app.agents.cv_analyzer_agent import CVAnalyzerAgent

router = APIRouter(prefix="/cvs", tags=["CV Management"])

@router.post("/upload", response_model=CVResponse)
async def upload_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    file_size = len(contents)

    is_valid, err_msg = validate_uploaded_file(file.filename, file.content_type, file_size, settings.MAX_UPLOAD_SIZE_MB)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

    ext = file.filename.rsplit(".", 1)[-1].lower()
    unique_filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    rel_path = f"uploads/{unique_filename}"
    abs_path = os.path.join(settings.STORAGE_DIR, rel_path)

    with open(abs_path, "wb") as f:
        f.write(contents)

    # Extract text from PDF or DOCX
    raw_text = CVParser.extract_text(contents, ext)

    # Save CV record
    cv = CV(
        user_id=current_user.id,
        filename=file.filename,
        file_path=rel_path,
        file_size=file_size,
        file_type=ext,
        raw_text=raw_text
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)

    # Run CV Analyzer Agent to create/update structured profile
    extracted_data = await CVAnalyzerAgent.analyze_cv(raw_text, file.filename)

    # Check if user already has a profile, or create one
    profile = db.query(ProfessionalProfile).filter(ProfessionalProfile.user_id == current_user.id).first()
    if not profile:
        profile = ProfessionalProfile(
            user_id=current_user.id,
            cv_id=cv.id,
            full_name=extracted_data.get("full_name") or current_user.full_name,
            email=extracted_data.get("email") or current_user.email,
            phone=extracted_data.get("phone", ""),
            location="Kigali, Rwanda",
            summary=extracted_data.get("summary", ""),
            total_experience_years=extracted_data.get("total_experience_years", 2.0),
            preferred_job_titles=extracted_data.get("preferred_job_titles", ["Software Engineer"]),
            preferred_locations=extracted_data.get("preferred_locations", ["Rwanda", "Remote"]),
            is_confirmed=False
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    else:
        profile.cv_id = cv.id
        if extracted_data.get("summary"):
            profile.summary = extracted_data.get("summary")
        if extracted_data.get("total_experience_years"):
            profile.total_experience_years = extracted_data.get("total_experience_years")
        db.commit()

    # Clear previous experiences and populate newly extracted ones
    db.query(WorkExperience).filter(WorkExperience.profile_id == profile.id).delete()
    for exp in extracted_data.get("work_experiences", []):
        db.add(WorkExperience(
            profile_id=profile.id,
            company=exp["company"],
            position=exp["position"],
            location=exp.get("location", "Rwanda"),
            start_date=exp.get("start_date"),
            end_date=exp.get("end_date"),
            is_current=exp.get("is_current", False),
            description=exp.get("description", ""),
            achievements=exp.get("achievements", [])
        ))

    # Populate education
    db.query(Education).filter(Education.profile_id == profile.id).delete()
    for edu in extracted_data.get("education", []):
        db.add(Education(
            profile_id=profile.id,
            institution=edu["institution"],
            degree=edu["degree"],
            field_of_study=edu.get("field_of_study", ""),
            start_date=edu.get("start_date"),
            end_date=edu.get("end_date"),
            grade=edu.get("grade")
        ))

    # Populate skills
    db.query(Skill).filter(Skill.profile_id == profile.id).delete()
    for sk in extracted_data.get("skills", []):
        db.add(Skill(
            profile_id=profile.id,
            name=sk["name"],
            category=sk.get("category", "technical"),
            proficiency=sk.get("proficiency", "intermediate"),
            years_of_experience=sk.get("years_of_experience", 2.0)
        ))

    # Populate projects
    db.query(Project).filter(Project.profile_id == profile.id).delete()
    for prj in extracted_data.get("projects", []):
        db.add(Project(
            profile_id=profile.id,
            name=prj["name"],
            description=prj.get("description", ""),
            role=prj.get("role", "Developer"),
            technologies=prj.get("technologies", []),
            url=prj.get("url")
        ))

    db.commit()

    return CVResponse(
        id=cv.id,
        user_id=cv.user_id,
        filename=cv.filename,
        file_size=cv.file_size,
        file_type=cv.file_type,
        created_at=cv.created_at,
        has_extracted_profile=True
    )

@router.get("", response_model=List[CVResponse])
def get_user_cvs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cvs = db.query(CV).filter(CV.user_id == current_user.id).order_by(CV.created_at.desc()).all()
    res = []
    for c in cvs:
        res.append(CVResponse(
            id=c.id,
            user_id=c.user_id,
            filename=c.filename,
            file_size=c.file_size,
            file_type=c.file_type,
            created_at=c.created_at,
            has_extracted_profile=bool(c.profile)
        ))
    return res

@router.get("/{cv_id}/download")
def download_cv(
    cv_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found.")
    
    abs_path = os.path.join(settings.STORAGE_DIR, cv.file_path)
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="File on disk not found.")
        
    return FileResponse(
        path=abs_path,
        filename=cv.filename,
        media_type="application/octet-stream"
    )

@router.delete("/{cv_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cv(
    cv_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found.")
    
    abs_path = os.path.join(settings.STORAGE_DIR, cv.file_path)
    if os.path.exists(abs_path):
        os.remove(abs_path)

    db.delete(cv)
    db.commit()
    return None

