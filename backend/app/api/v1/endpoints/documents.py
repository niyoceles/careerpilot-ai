import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.models.entities import User, Job, GeneratedDocument, Application, ApplicationDocument
from app.schemas.all_schemas import (
    GenerateCVRequest, GenerateCoverLetterRequest, GenerateEmailRequest, GeneratedDocumentResponse
)
from app.services.document_generator import DocumentGenerator

router = APIRouter(prefix="/documents", tags=["Application Documents"])

@router.post("/generate-cv", response_model=GeneratedDocumentResponse)
def generate_tailored_cv(
    payload: GenerateCVRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.profile:
        raise HTTPException(status_code=400, detail="Please upload a CV or complete your profile first.")

    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Target job not found.")

    doc_data = DocumentGenerator.generate_tailored_cv(
        profile=current_user.profile,
        job=job,
        emphasis_skills=payload.emphasis_skills
    )

    gen_doc = GeneratedDocument(
        user_id=current_user.id,
        job_id=job.id,
        document_type="tailored_cv",
        title=doc_data["title"],
        file_path_pdf=doc_data["file_path_pdf"],
        file_path_docx=doc_data["file_path_docx"],
        content_json=doc_data["content_json"],
        content_text=doc_data["content_text"]
    )
    db.add(gen_doc)
    db.commit()
    db.refresh(gen_doc)

    # Link with application if exists
    app_rec = db.query(Application).filter(Application.user_id == current_user.id, Application.job_id == job.id).first()
    if app_rec:
        db.add(ApplicationDocument(
            application_id=app_rec.id,
            document_id=gen_doc.id,
            document_type="tailored_cv"
        ))
        db.commit()

    return gen_doc

@router.post("/generate-cover-letter", response_model=GeneratedDocumentResponse)
async def generate_cover_letter(
    payload: GenerateCoverLetterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.profile:
        raise HTTPException(status_code=400, detail="Please upload a CV or complete your profile first.")

    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Target job not found.")

    user_settings = current_user.settings
    doc_data = await DocumentGenerator.generate_cover_letter(
        profile=current_user.profile,
        job=job,
        tone=payload.tone or "professional",
        provider=user_settings.ai_provider if user_settings else None,
        model=user_settings.ai_model if user_settings else None,
        api_key=user_settings.ai_api_key if user_settings else None
    )

    gen_doc = GeneratedDocument(
        user_id=current_user.id,
        job_id=job.id,
        document_type="cover_letter",
        title=doc_data["title"],
        file_path_pdf=doc_data["file_path_pdf"],
        file_path_docx=doc_data["file_path_docx"],
        content_json=doc_data["content_json"],
        content_text=doc_data["content_text"]
    )
    db.add(gen_doc)
    db.commit()
    db.refresh(gen_doc)

    app_rec = db.query(Application).filter(Application.user_id == current_user.id, Application.job_id == job.id).first()
    if app_rec:
        db.add(ApplicationDocument(
            application_id=app_rec.id,
            document_id=gen_doc.id,
            document_type="cover_letter"
        ))
        db.commit()

    return gen_doc

@router.post("/generate-email", response_model=GeneratedDocumentResponse)
async def generate_application_email(
    payload: GenerateEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.profile:
        raise HTTPException(status_code=400, detail="Please upload a CV or complete your profile first.")

    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Target job not found.")

    user_settings = current_user.settings
    doc_data = await DocumentGenerator.generate_application_email(
        profile=current_user.profile,
        job=job,
        recipient_name=payload.recipient_name,
        recipient_email=payload.recipient_email,
        provider=user_settings.ai_provider if user_settings else None,
        model=user_settings.ai_model if user_settings else None,
        api_key=user_settings.ai_api_key if user_settings else None
    )

    gen_doc = GeneratedDocument(
        user_id=current_user.id,
        job_id=job.id,
        document_type="application_email",
        title=doc_data["title"],
        content_json=doc_data["content_json"],
        content_text=doc_data["content_text"]
    )
    db.add(gen_doc)
    db.commit()
    db.refresh(gen_doc)

    return gen_doc

@router.get("", response_model=List[GeneratedDocumentResponse])
def get_documents(
    doc_type: Optional[str] = Query(None),
    job_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(GeneratedDocument).filter(GeneratedDocument.user_id == current_user.id)
    if doc_type:
        q = q.filter(GeneratedDocument.document_type == doc_type)
    if job_id:
        q = q.filter(GeneratedDocument.job_id == job_id)
    return q.order_by(desc(GeneratedDocument.created_at)).all()

@router.get("/{doc_id}/download")
def download_document(
    doc_id: str,
    format: str = Query("pdf", pattern="^(pdf|docx)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(GeneratedDocument).filter(
        GeneratedDocument.id == doc_id,
        GeneratedDocument.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    rel_path = doc.file_path_pdf if format == "pdf" else doc.file_path_docx
    if not rel_path:
        raise HTTPException(status_code=400, detail=f"No {format.upper()} file generated for this document type.")

    abs_path = os.path.join(settings.STORAGE_DIR, rel_path)
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="File on disk not found.")

    filename = f"{doc.title.replace(' ', '_')}.{format}"
    media_type = "application/pdf" if format == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    return FileResponse(
        path=abs_path,
        filename=filename,
        media_type=media_type
    )
