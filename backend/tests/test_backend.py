import os
import pytest
from app.services.cv_parser import CVParser
from app.services.matching_service import MatchingService
from app.services.document_generator import DocumentGenerator
from app.services.interview_service import InterviewService
from app.agents.orchestrator import careerpilot_graph
from app.models.entities import InterviewQuestion

SAMPLE_CV_TEXT = """
Jean Luc Mugisha
Kigali, Rwanda | +250788123456 | testcandidate@example.com

PROFESSIONAL SUMMARY
Senior Full Stack Engineer with 4 years of experience architecting resilient web applications.
Specialized in Python, FastAPI, React, TypeScript, and PostgreSQL.

SKILLS
Python, JavaScript, TypeScript, React, FastAPI, Docker, PostgreSQL, Redis, Git, Linux

EXPERIENCE
Senior Software Engineer at Kigali Tech Labs
2021 - Present | Kigali, Rwanda
• Architected scalable microservices using FastAPI and PostgreSQL handling 250k daily queries.
• Built interactive client dashboards with React and Tailwind CSS.

EDUCATION
Bachelor of Science in Computer Science - University of Rwanda, 2021
"""

def test_cv_heuristics_extraction():
    parsed = CVParser.parse_cv_heuristics(SAMPLE_CV_TEXT)
    assert parsed["email"] == "testcandidate@example.com"
    assert "+250788123456" in parsed["phone"]
    assert "Mugisha" in parsed["full_name"]
    skill_names = [s["name"] for s in parsed["skills"]]
    assert "Python" in skill_names
    assert "React" in skill_names
    assert "FastAPI" in skill_names

def test_job_matching_calculation(test_user, sample_job):
    eval_res = MatchingService.evaluate_match(test_user.profile, sample_job)
    assert eval_res["overall_score"] >= 80.0
    assert "Python" in eval_res["matching_requirements"]
    assert "React" in eval_res["matching_requirements"]
    assert eval_res["skill_score"] >= 90.0

from app.core.config import settings

@pytest.mark.asyncio
async def test_document_generation(test_user, sample_job):
    # Test tailored CV generation
    cv_doc = DocumentGenerator.generate_tailored_cv(test_user.profile, sample_job)
    assert os.path.exists(os.path.join(settings.STORAGE_DIR, cv_doc["file_path_docx"]))
    assert os.path.exists(os.path.join(settings.STORAGE_DIR, cv_doc["file_path_pdf"]))
    assert "Tailored CV" in cv_doc["title"]

    # Test cover letter generation
    cl_doc = await DocumentGenerator.generate_cover_letter(test_user.profile, sample_job)
    assert os.path.exists(os.path.join(settings.STORAGE_DIR, cl_doc["file_path_pdf"]))
    assert "Cover Letter" in cl_doc["title"]
    assert sample_job.company in cl_doc["content_text"]

    # Test email generation
    email_doc = await DocumentGenerator.generate_application_email(test_user.profile, sample_job)
    assert "Application for" in email_doc["content_json"]["subject"]
    assert sample_job.title in email_doc["content_json"]["subject"]

@pytest.mark.asyncio
async def test_interview_prep_and_mock(test_user, sample_job):
    questions = await InterviewService.generate_questions_for_job(test_user.profile, sample_job)
    assert len(questions) >= 4
    categories = {q["category"] for q in questions}
    assert "technical" in categories
    assert "behavioral" in categories

    # Test mock evaluation
    dummy_q = InterviewQuestion(
        interview_id="dummy",
        question="Describe a challenge you solved.",
        category="behavioral"
    )
    answer = (
        "Situation: During a major release, our server hit memory limits. "
        "Task: I needed to optimize query performance immediately. "
        "Action: I added indexes in PostgreSQL and implemented Redis caching. "
        "Result: Reduced response times by 60% and resolved memory pressure."
    )
    eval_mock = await InterviewService.evaluate_mock_answer(dummy_q, answer, test_user.profile)
    assert eval_mock["score"] >= 80.0
    assert "STAR" in eval_mock["ai_feedback"] or "impact" in eval_mock["ai_feedback"]

@pytest.mark.asyncio
async def test_langgraph_orchestrator():
    initial_state = {
        "user_id": "test_user_id",
        "cv_raw_text": SAMPLE_CV_TEXT,
        "filename": "mugisha_cv.pdf",
        "profile_data": None,
        "is_profile_confirmed": True,
        "discovered_jobs": None,
        "selected_job": {"title": "Python Engineer", "company": "Tech Corp"},
        "match_result": None,
        "tailored_documents": None,
        "interview_materials": None,
        "current_step": "init",
        "error": None
    }
    result = await careerpilot_graph.ainvoke(initial_state)
    assert result["current_step"] == "completed"
    assert result["profile_data"] is not None
    assert result["match_result"] is not None
    assert result["tailored_documents"] is not None

def test_auth_and_application_api_flow(client):
    # 1. Register
    reg_payload = {
        "email": "newuser@example.com",
        "password": "Password123!",
        "full_name": "Alice Keza"
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201
    user_id = reg_resp.json()["id"]

    # 2. Login
    login_resp = client.post("/api/v1/auth/login/json", json={"email": "newuser@example.com", "password": "Password123!"})
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Check /me
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "newuser@example.com"

    # 4. Create and update profile
    profile_update = {
        "full_name": "Alice Keza",
        "summary": "Full Stack developer in Kigali",
        "skills": [{"name": "Python", "category": "technical", "proficiency": "advanced"}]
    }
    prof_resp = client.put("/api/v1/profile", json=profile_update, headers=headers)
    assert prof_resp.status_code == 200
    assert prof_resp.json()["skills"][0]["name"] == "Python"

    # 5. List jobs
    jobs_resp = client.get("/api/v1/jobs", headers=headers)
    assert jobs_resp.status_code == 200
    jobs = jobs_resp.json()
    assert len(jobs) > 0
    job_id = jobs[0]["id"]

    # 6. Save job to applications
    save_resp = client.post(f"/api/v1/jobs/{job_id}/save", headers=headers)
    assert save_resp.status_code == 200
    app_id = save_resp.json()["application_id"]

    # 7. Update application status
    patch_resp = client.patch(f"/api/v1/applications/{app_id}", json={"status": "Applied"}, headers=headers)
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "Applied"

    # 8. Dashboard overview
    dash_resp = client.get("/api/v1/dashboard/overview", headers=headers)
    assert dash_resp.status_code == 200
    assert dash_resp.json()["total_jobs_discovered"] > 0
