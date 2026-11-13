from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.entities import User, Job, Interview, InterviewQuestion, Application
from app.schemas.all_schemas import (
    InterviewResponse, InterviewQuestionSchema, GenerateInterviewPrepRequest, MockInterviewAnswerSubmit
)
from app.services.interview_service import InterviewService

router = APIRouter(prefix="/interviews", tags=["Interview Preparation"])

@router.get("", response_model=List[InterviewResponse])
def get_interviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    interviews = (
        db.query(Interview)
        .filter(Interview.user_id == current_user.id)
        .order_by(desc(Interview.created_at))
        .all()
    )
    return interviews

@router.post("/generate-prep", response_model=InterviewResponse)
async def generate_interview_prep(
    payload: GenerateInterviewPrepRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.profile:
        raise HTTPException(status_code=400, detail="Please upload a CV or create your profile first.")

    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Target job not found.")

    # Find or link application
    app_rec = db.query(Application).filter(Application.user_id == current_user.id, Application.job_id == job.id).first()

    interview = Interview(
        user_id=current_user.id,
        application_id=app_rec.id if app_rec else None,
        job_id=job.id,
        interview_type=payload.interview_type or "Comprehensive",
        status="Scheduled"
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)

    # Generate questions using configured AI provider/model
    user_settings = current_user.settings
    generated_q_list = await InterviewService.generate_questions_for_job(
        profile=current_user.profile,
        job=job,
        interview_type=payload.interview_type,
        provider=user_settings.ai_provider if user_settings else None,
        model=user_settings.ai_model if user_settings else None,
        api_key=user_settings.ai_api_key if user_settings else None
    )

    for item in generated_q_list:
        q_record = InterviewQuestion(
            interview_id=interview.id,
            question=item["question"],
            category=item["category"],
            suggested_answer_star=item["suggested_answer_star"]
        )
        db.add(q_record)

    db.commit()
    db.refresh(interview)
    return interview

@router.post("/mock-submit")
async def submit_mock_interview_answer(
    payload: MockInterviewAnswerSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q_record = db.query(InterviewQuestion).filter(InterviewQuestion.id == payload.question_id).first()
    if not q_record:
        raise HTTPException(status_code=404, detail="Question not found.")

    # Check permission
    interview = db.query(Interview).filter(Interview.id == q_record.interview_id, Interview.user_id == current_user.id).first()
    if not interview:
        raise HTTPException(status_code=403, detail="Not authorized to answer this interview.")

    user_settings = current_user.settings
    eval_result = await InterviewService.evaluate_mock_answer(
        question=q_record,
        user_answer=payload.user_answer,
        profile=current_user.profile,
        provider=user_settings.ai_provider if user_settings else None,
        model=user_settings.ai_model if user_settings else None,
        api_key=user_settings.ai_api_key if user_settings else None
    )

    q_record.user_answer = payload.user_answer
    q_record.score = eval_result["score"]
    q_record.ai_feedback = eval_result["ai_feedback"]

    db.commit()
    db.refresh(q_record)

    return {
        "question_id": q_record.id,
        "score": q_record.score,
        "ai_feedback": q_record.ai_feedback
    }

