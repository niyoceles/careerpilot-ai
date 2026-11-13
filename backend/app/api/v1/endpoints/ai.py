import re
import json
from typing import List, Dict, Any, AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.entities import User, ChatSession, ChatMessage, Job, JobMatch, Application
from app.schemas.all_schemas import (
    ChatMessageCreate, ChatMessageResponse, ChatSessionResponse
)
from app.services.ai_service import ai_service
from app.services.matching_service import MatchingService
from app.utils.text_sanitizer import sanitize_text

router = APIRouter(prefix="/ai", tags=["AI Assistant & Intelligence"])


def _build_system_prompt(current_user: User, db: Session) -> str:
    """Builds the full dynamic system prompt injecting live candidate and vacancy context."""
    profile = current_user.profile
    candidate_name = current_user.full_name
    candidate_summary = profile.summary if profile and profile.summary else "No summary provided yet."
    experience_years = f"{profile.total_experience_years:.1f}" if profile else "0.0"

    skills_list = []
    if profile and profile.skills:
        skills_list = [f"{s.name} ({s.category}, {s.proficiency})" for s in profile.skills]
    skills_str = ", ".join(skills_list) if skills_list else "None listed yet"

    work_exp_list = []
    if profile and profile.work_experiences:
        for exp in profile.work_experiences[:4]:
            work_exp_list.append(
                f"- {exp.position} at {exp.company} ({exp.start_date or ''} - {'Present' if exp.is_current else exp.end_date or ''}): {exp.description or ''}"
            )
    work_str = "\n".join(work_exp_list) if work_exp_list else "No recorded positions"

    edu_list = []
    if profile and profile.education:
        for edu in profile.education[:3]:
            edu_list.append(f"- {edu.degree} in {edu.field_of_study or ''} from {edu.institution}")
    edu_str = "\n".join(edu_list) if edu_list else "No formal degree listed"

    projects_list = []
    if profile and profile.projects:
        for p in profile.projects[:3]:
            projects_list.append(f"- {p.name}: {p.description or ''} [Tech: {', '.join(p.technologies or [])}]")
    projects_str = "\n".join(projects_list) if projects_list else "No projects added"

    matches = (
        db.query(JobMatch)
        .filter(JobMatch.user_id == current_user.id)
        .order_by(desc(JobMatch.overall_score))
        .limit(5)
        .all()
    )
    matches_list = [
        f"- {m.job.title} at {m.job.company} (Score: {m.overall_score:.0f}%, Location: {m.job.location}, Type: {m.job.location_type})"
        for m in matches if m.job
    ]
    matches_str = "\n".join(matches_list) if matches_list else "No active match scores calculated yet"

    available_jobs = db.query(Job).order_by(desc(Job.created_at)).limit(6).all()
    vacancies_list = [
        f"- {j.title} at {j.company} ({j.location} • {j.location_type}) [Req: {', '.join((j.required_skills or [])[:4])}]"
        for j in available_jobs
    ]
    vacancies_str = "\n".join(vacancies_list) if vacancies_list else "None indexed"

    apps = db.query(Application).filter(Application.user_id == current_user.id).all()
    apps_list = [f"- {a.job.title if a.job else 'Role'} at {a.job.company if a.job else 'Company'}: Status [{a.status}]" for a in apps[:5]]
    apps_str = "\n".join(apps_list) if apps_list else "No applications in pipeline"

    return f"""You are CareerPilot AI, an elite AI career advisor and job search copilot.
You have access to the candidate's real profile, job opportunities, and application data.

CANDIDATE INFORMATION:
- Name: {candidate_name}
- Total Years Experience: {experience_years} years
- Summary: {candidate_summary}
- Skills: {skills_str}
- Employment History:
{work_str}
- Education:
{edu_str}
- Projects:
{projects_str}

PLATFORM DATABASE STATE:
- Candidate's Top Matches:
{matches_str}
- Current Open Vacancies in System:
{vacancies_str}
- Tracked Applications:
{apps_str}

GUIDELINES FOR YOUR RESPONSES:
1. Always generate thoughtful, highly customized, dynamic answers. Never output canned, static, or repetitive templates.
2. Ground your advice in the candidate's actual skills, projects, and target vacancies.
3. If the user asks about their skills, evaluate their strengths, identify high-value skills to add, and explain how they align with modern software roles in Rwanda, East Africa, or global remote markets.
4. If the user asks to find or recommend jobs, reference the actual vacancies listed above and explain why they align.
5. If the user asks for interview preparation, formulate concrete behavioral (STAR method) or technical scenarios grounded in their real background.
6. Be professional, direct, constructive, and inspiring. Use clean Markdown with bullet points where appropriate.
7. Keep answers concise but substantive — do not over-explain."""

@router.get("/health")
async def check_ai_health(
    current_user: User = Depends(get_current_user)
):
    """Returns the live status of the AI model provider configured for the current user."""
    settings = current_user.settings
    provider = settings.ai_provider if settings else None
    model = settings.ai_model if settings else None
    api_key = settings.ai_api_key if settings else None
    return await ai_service.check_health(provider=provider, model=model, api_key=api_key)

@router.get("/sessions", response_model=List[ChatSessionResponse])
def get_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(desc(ChatSession.updated_at))
        .all()
    )
    return sessions

@router.post("/chat", response_model=ChatMessageResponse)
async def chat_with_agent(
    payload: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sanitized_prompt = sanitize_text(payload.content)
    if not sanitized_prompt:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    session = _get_or_create_session(db, current_user, sanitized_prompt, payload.session_id)
    _save_user_message(db, session.id, sanitized_prompt)
    chat_history = _load_chat_history(db, session.id)
    system_prompt = _build_system_prompt(current_user, db)

    user_settings = current_user.settings
    provider = user_settings.ai_provider if user_settings else None
    model = user_settings.ai_model if user_settings else None
    api_key = user_settings.ai_api_key if user_settings else None

    assistant_content = await ai_service.generate_completion(
        prompt=sanitized_prompt,
        system_prompt=system_prompt,
        provider=provider,
        model=model,
        api_key=api_key,
        chat_history=chat_history
    )

    asst_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=assistant_content,
        metadata_json={
            "provider": provider or ai_service.default_provider,
            "model": model or ai_service.ollama_model
        }
    )
    db.add(asst_msg)
    db.commit()
    db.refresh(asst_msg)
    return asst_msg


@router.post("/chat/stream")
async def chat_stream(
    payload: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Streaming SSE endpoint. Tokens are emitted as Server-Sent Events so the
    frontend can render text word-by-word without waiting for the full response.
    """
    sanitized_prompt = sanitize_text(payload.content)
    if not sanitized_prompt:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    session = _get_or_create_session(db, current_user, sanitized_prompt, payload.session_id)
    _save_user_message(db, session.id, sanitized_prompt)
    chat_history = _load_chat_history(db, session.id)
    system_prompt = _build_system_prompt(current_user, db)

    user_settings = current_user.settings
    provider = user_settings.ai_provider if user_settings else None
    model_name = user_settings.ai_model if user_settings else None
    api_key = user_settings.ai_api_key if user_settings else None
    session_id = session.id

    async def event_stream() -> AsyncGenerator[str, None]:
        import httpx
        full_response = []
        active_provider = provider or ai_service.default_provider
        active_model = model_name or ai_service.ollama_model

        try:
            if active_provider == "ollama":
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                for h in chat_history:
                    messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
                messages.append({"role": "user", "content": sanitized_prompt})

                # Disable Qwen3 thinking mode for faster chat responses
                chat_payload = {
                    "model": active_model,
                    "messages": messages,
                    "stream": True,
                    "options": {"think": False}
                }

                try:
                    async with httpx.AsyncClient(timeout=180.0) as client:
                        async with client.stream(
                            "POST",
                            f"{ai_service.ollama_base_url}/api/chat",
                            json=chat_payload
                        ) as resp:
                            if resp.status_code == 200:
                                async for line in resp.aiter_lines():
                                    if not line:
                                        continue
                                    try:
                                        chunk = json.loads(line)
                                        token = chunk.get("message", {}).get("content", "")
                                        if token:
                                            full_response.append(token)
                                            yield f"data: {json.dumps({'token': token})}\n\n"
                                        if chunk.get("done"):
                                            break
                                    except json.JSONDecodeError:
                                        continue
                            else:
                                raise Exception(f"Ollama HTTP {resp.status_code}")
                except Exception as conn_err:
                    # Try generate endpoint as fallback
                    try:
                        async with httpx.AsyncClient(timeout=180.0) as client2:
                            gen_payload = {
                                "model": active_model,
                                "prompt": sanitized_prompt,
                                "system": system_prompt or "",
                                "stream": True,
                                "options": {"think": False}
                            }
                            async with client2.stream("POST", f"{ai_service.ollama_base_url}/api/generate", json=gen_payload) as gen_resp:
                                if gen_resp.status_code == 200:
                                    async for line in gen_resp.aiter_lines():
                                        if not line:
                                            continue
                                        try:
                                            chunk = json.loads(line)
                                            token = chunk.get("response", "")
                                            if token:
                                                full_response.append(token)
                                                yield f"data: {json.dumps({'token': token})}\n\n"
                                            if chunk.get("done"):
                                                break
                                        except json.JSONDecodeError:
                                            continue
                                else:
                                    raise Exception(f"Ollama generate HTTP {gen_resp.status_code}")
                    except Exception as gen_err:
                        raise Exception(f"Ollama unreachable via /api/chat and /api/generate: {gen_err}")

            else:
                # For cloud providers: generate in one shot, emit word-by-word for animation
                content = await ai_service.generate_completion(
                    prompt=sanitized_prompt,
                    system_prompt=system_prompt,
                    provider=provider,
                    model=model_name,
                    api_key=api_key,
                    chat_history=chat_history
                )
                full_response.append(content)
                # Emit in small chunks so the frontend still animates
                words = content.split(" ")
                for i in range(0, len(words), 3):
                    chunk = " ".join(words[i:i+3]) + (" " if i + 3 < len(words) else "")
                    yield f"data: {json.dumps({'token': chunk})}\n\n"

        except Exception as e:
            err_msg = (
                f"⚠️ **AI Model Connection Notice**\n\n"
                f"The AI model provider (**{active_provider}** / **{active_model}**) could not be reached.\n\n"
                f"**To activate live AI responses:**\n"
                f"1. For Ollama Docker: ensure container is running and port 11434 is mapped.\n"
                f"2. Or enter a cloud API Key in **Platform Settings**."
            )
            full_response.append(err_msg)
            yield f"data: {json.dumps({'token': err_msg})}\n\n"

        # Persist the full assembled message to database
        complete_text = "".join(full_response)
        # Strip qwen3 <think>...</think> blocks
        complete_text = re.sub(r'<think>.*?</think>', '', complete_text, flags=re.DOTALL).strip()

        asst_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=complete_text,
            metadata_json={"provider": active_provider, "model": active_model}
        )
        db.add(asst_msg)
        db.commit()

        yield f"data: {json.dumps({'done': True, 'message_id': asst_msg.id, 'session_id': session_id})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


def _get_or_create_session(db: Session, current_user: User, prompt: str, session_id: str = None) -> ChatSession:
    session = None
    if session_id:
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id, ChatSession.user_id == current_user.id
        ).first()
    if not session:
        session = ChatSession(
            user_id=current_user.id,
            title=prompt[:40] + ("..." if len(prompt) > 40 else "")
        )
        db.add(session)
        db.commit()
        db.refresh(session)
    return session


def _save_user_message(db: Session, session_id: str, content: str) -> ChatMessage:
    msg = ChatMessage(session_id=session_id, role="user", content=content)
    db.add(msg)
    db.commit()
    return msg


def _load_chat_history(db: Session, session_id: str, limit: int = 8) -> list:
    recent = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    # Exclude the most recently added user message (last item)
    return [{"role": m.role, "content": m.content} for m in recent[:-1]][-limit:]

@router.post("/analyze-job")
async def analyze_job_description(
    payload: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyzes any raw job description pasted by the user against their profile using the AI model."""
    job_text = sanitize_text(payload.get("job_description", ""))
    if not job_text:
        raise HTTPException(status_code=400, detail="Job description text is required.")

    temp_job = Job(
        title="Pasted Opportunity",
        company="Target Employer",
        location="Remote / Hybrid",
        location_type="remote",
        description=job_text,
        requirements=[],
        responsibilities=[],
        required_skills=[]
    )

    eval_res = {}
    if current_user.profile:
        eval_res = MatchingService.evaluate_match(current_user.profile, temp_job)

    # Invoke AI model to generate deep qualitative critique of the job posting
    user_settings = current_user.settings
    ai_prompt = (
        f"Candidate Background:\n"
        f"Summary: {current_user.profile.summary if current_user.profile else 'Software Engineer'}\n"
        f"Skills: {', '.join([s.name for s in (current_user.profile.skills if current_user.profile else [])])}\n\n"
        f"Job Description to Analyze:\n{job_text[:2000]}\n\n"
        f"Provide a 3-paragraph executive assessment: 1) Key technical demands, 2) Candidate alignment & potential gaps, 3) Recommended strategy for CV and interview."
    )
    
    ai_critique = await ai_service.generate_completion(
        prompt=ai_prompt,
        system_prompt="You are CareerPilot AI, an expert talent evaluation model.",
        provider=user_settings.ai_provider if user_settings else None,
        model=user_settings.ai_model if user_settings else None,
        api_key=user_settings.ai_api_key if user_settings else None
    )

    return {
        "title": temp_job.title,
        "overall_score": eval_res.get("overall_score", 75.0),
        "skill_score": eval_res.get("skill_score", 70.0),
        "experience_score": eval_res.get("experience_score", 70.0),
        "matching_requirements": eval_res.get("matching_requirements", []),
        "partial_requirements": eval_res.get("partial_requirements", []),
        "missing_qualifications": eval_res.get("missing_qualifications", []),
        "suggestions": eval_res.get("suggestions", []),
        "assessment": ai_critique
    }
