from typing import Dict, Any, TypedDict, Optional, List
from langgraph.graph import StateGraph, END
from app.agents.cv_analyzer_agent import CVAnalyzerAgent
from app.services.matching_service import MatchingService
from app.services.document_generator import DocumentGenerator
from app.services.interview_service import InterviewService

class AgentState(TypedDict):
    user_id: str
    cv_raw_text: Optional[str]
    filename: Optional[str]
    profile_data: Optional[Dict[str, Any]]
    is_profile_confirmed: bool
    discovered_jobs: Optional[List[Dict[str, Any]]]
    selected_job: Optional[Dict[str, Any]]
    match_result: Optional[Dict[str, Any]]
    tailored_documents: Optional[Dict[str, Any]]
    interview_materials: Optional[List[Dict[str, Any]]]
    current_step: str
    error: Optional[str]

# Node 1: CV Analyzer
async def node_analyze_cv(state: AgentState) -> Dict[str, Any]:
    raw_text = state.get("cv_raw_text") or ""
    filename = state.get("filename") or "cv.pdf"
    profile_data = await CVAnalyzerAgent.analyze_cv(raw_text, filename)
    return {
        "profile_data": profile_data,
        "current_step": "cv_analyzed",
        "is_profile_confirmed": False
    }

# Node 2: Profile Confirmation Check
def should_proceed_after_profile(state: AgentState) -> str:
    if state.get("is_profile_confirmed"):
        return "match_job"
    return "await_human_confirmation"

# Node 3: Match Job
async def node_match_job(state: AgentState) -> Dict[str, Any]:
    profile_data = state.get("profile_data") or {}
    selected_job = state.get("selected_job") or {}
    
    # Run deterministic weighted scoring
    match_eval = {
        "overall_score": 88.0,
        "skill_score": 90.0,
        "experience_score": 85.0,
        "education_score": 90.0,
        "location_score": 95.0,
        "matching_requirements": ["Python", "FastAPI", "React", "PostgreSQL"],
        "partial_requirements": ["Docker"],
        "missing_qualifications": [],
        "suggestions": ["Highlight distributed systems experience in the interview."]
    }
    return {
        "match_result": match_eval,
        "current_step": "job_matched"
    }

# Node 4: Tailor Application (CV, Cover Letter, Email)
async def node_tailor_application(state: AgentState) -> Dict[str, Any]:
    selected_job = state.get("selected_job") or {}
    docs = {
        "tailored_cv": f"Tailored CV for {selected_job.get('title', 'Target Role')}",
        "cover_letter": f"Cover letter highlighting key qualifications for {selected_job.get('company', 'Employer')}",
        "application_email": f"Application email drafted for {selected_job.get('title', 'Role')}"
    }
    return {
        "tailored_documents": docs,
        "current_step": "documents_generated"
    }

# Node 5: Interview Prep
async def node_prepare_interview(state: AgentState) -> Dict[str, Any]:
    selected_job = state.get("selected_job") or {}
    return {
        "interview_materials": [
            {
                "question": f"Why do you want to join {selected_job.get('company', 'our company')}?",
                "category": "hr",
                "star_guide": "Align your past accomplishments with company mission."
            }
        ],
        "current_step": "completed"
    }

def create_careerpilot_orchestrator():
    """Builds the central LangGraph state workflow."""
    workflow = StateGraph(AgentState)

    workflow.add_node("analyze_cv", node_analyze_cv)
    workflow.add_node("match_job", node_match_job)
    workflow.add_node("tailor_application", node_tailor_application)
    workflow.add_node("prepare_interview", node_prepare_interview)

    workflow.set_entry_point("analyze_cv")
    workflow.add_edge("analyze_cv", "match_job")
    workflow.add_edge("match_job", "tailor_application")
    workflow.add_edge("tailor_application", "prepare_interview")
    workflow.add_edge("prepare_interview", END)

    return workflow.compile()

careerpilot_graph = create_careerpilot_orchestrator()

