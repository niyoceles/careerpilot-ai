import json
import logging
from typing import List, Dict, Any, Optional
from app.models.entities import ProfessionalProfile, Job, InterviewQuestion
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)

class InterviewService:
    @classmethod
    async def generate_questions_for_job(
        cls,
        profile: ProfessionalProfile,
        job: Job,
        interview_type: str = "Comprehensive",
        provider: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        candidate_skills = ", ".join([s.name for s in (profile.skills or [])[:8]])
        work_hist = ""
        if profile.work_experiences:
            work_hist = "\n".join([f"- {w.position} at {w.company}: {w.description or ''}" for w in profile.work_experiences[:3]])

        prompt = f"""Generate 5 high-yield interview questions for the role: {job.title} at {job.company}.
Candidate's skills: {candidate_skills}
Candidate's background:
{work_hist}

Job Description:
{job.description[:1200] if job.description else ''}

Return a valid JSON array of 5 objects with keys:
- "question": string
- "category": string (one of: technical, behavioral, leadership, situational, hr)
- "suggested_answer_star": string (STAR method format: Situation, Task, Action, Result grounded in the candidate's actual background)
"""

        try:
            raw = await ai_service.generate_completion(
                prompt=prompt,
                system_prompt="You are an expert technical interviewer and executive talent coach. Output JSON only.",
                provider=provider,
                model=model,
                api_key=api_key
            )
            # Clean possible markdown fencing
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[-1]
            if cleaned.endswith("```"):
                cleaned = cleaned.rsplit("```", 1)[0]
            
            parsed = json.loads(cleaned.strip())
            if isinstance(parsed, list) and len(parsed) >= 1:
                return [
                    {
                        "question": q.get("question", "Describe your core technical achievements."),
                        "category": q.get("category", "technical"),
                        "suggested_answer_star": q.get("suggested_answer_star", "Situation: Leading engineering delivery...")
                    }
                    for q in parsed
                ]
        except Exception as e:
            logger.warning(f"AI model question generation failed or offline: {e}")

        # Grounded backup if AI is offline
        top_project = profile.projects[0].name if profile.projects else "production systems"
        return [
            {
                "question": f"Can you describe your experience with {job.required_skills[0] if job.required_skills else 'modern software development'} and how you applied it in a recent production project?",
                "category": "technical",
                "suggested_answer_star": (
                    f"Situation: Working on {top_project}.\n"
                    f"Task: Build a scalable service capable of low latency and clean API contracts.\n"
                    f"Action: Implemented robust logic using {candidate_skills}, wrote unit tests, and handled edge cases.\n"
                    f"Result: Delivered on schedule with zero critical production bugs and improved system responsiveness."
                )
            },
            {
                "question": f"At {job.company}, engineering requirements can shift quickly. Tell me about a time you had to adapt to unforeseen technical constraints.",
                "category": "behavioral",
                "suggested_answer_star": (
                    "Situation: Mid-sprint, backend requirements changed due to third-party API rate limits.\n"
                    "Task: Prevent user-facing downtime without delaying the launch.\n"
                    "Action: Implemented an asynchronous queue and caching layer in Redis to buffer requests.\n"
                    "Result: Successfully launched on target date with 99.9% uptime."
                )
            },
            {
                "question": f"How do you approach code reviews and mentoring other engineers when working in a {job.location_type} team?",
                "category": "leadership",
                "suggested_answer_star": (
                    "Situation: Onboarding new developers on an agile team.\n"
                    "Task: Uphold code standards without becoming a bottleneck.\n"
                    "Action: Standardized automated CI linting and established clear, constructive PR guidelines.\n"
                    "Result: Reduced PR cycle times by 35% while increasing test coverage."
                )
            },
            {
                "question": f"Suppose a critical microservice goes down in production for {job.title}. Walk us through your triage, diagnostic, and resolution steps.",
                "category": "situational",
                "suggested_answer_star": (
                    "Situation: High-severity incident alerting page.\n"
                    "Task: Restore service health and isolate root cause.\n"
                    "Action: Checked metrics/logs, rolled back recent deployment, verified recovery, and then reproduced issue in staging.\n"
                    "Result: Restored service within 8 minutes and published a comprehensive post-mortem with preventative tests."
                )
            },
            {
                "question": f"Why are you specifically interested in joining {job.company} as a {job.title} at this stage of your career?",
                "category": "hr",
                "suggested_answer_star": (
                    f"Situation: Transitioning to higher-impact engineering opportunities.\n"
                    f"Task: Find a role that leverages my background in {candidate_skills}.\n"
                    f"Action: Researched {job.company}'s engineering culture and technical footprint.\n"
                    f"Result: Found a direct match where my skills in reliable software development can deliver high value immediately."
                )
            }
        ]

    @classmethod
    async def evaluate_mock_answer(
        cls,
        question: InterviewQuestion,
        user_answer: str,
        profile: ProfessionalProfile,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """Evaluates candidate answer and returns score (0-100) and constructive feedback generated by the AI model."""
        prompt = f"""Question: {question.question}
Candidate's actual Answer:
\"\"\"{user_answer}\"\"\"

Candidate Background Skills:
{', '.join([s.name for s in (profile.skills or [])[:6]])}

Evaluate this interview response.
Return a valid JSON object with:
- "score": number between 0 and 100 based on clarity, depth, and STAR structure
- "ai_feedback": 2-3 sentences of constructive feedback, highlighting strong points and concrete ways to improve.
"""
        try:
            raw = await ai_service.generate_completion(
                prompt=prompt,
                system_prompt="You are a senior tech hiring manager evaluating interview answers. Output valid JSON only.",
                provider=provider,
                model=model,
                api_key=api_key
            )
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[-1]
            if cleaned.endswith("```"):
                cleaned = cleaned.rsplit("```", 1)[0]
            parsed = json.loads(cleaned.strip())
            if "score" in parsed and "ai_feedback" in parsed:
                return {
                    "score": float(parsed["score"]),
                    "ai_feedback": parsed["ai_feedback"]
                }
        except Exception as e:
            logger.warning(f"AI mock interview evaluation failed or offline: {e}")

        # Deterministic scoring fallback
        word_count = len(user_answer.split())
        has_star_indicators = any(term in user_answer.lower() for term in ["situation", "task", "action", "result", "when", "built", "implemented", "solved"])
        base_score = 70.0
        if word_count > 40:
            base_score += 15.0
        if has_star_indicators:
            base_score += 10.0
        if word_count < 15:
            base_score = 45.0
            
        score = min(98.0, base_score)
        feedback = (
            f"Good effort. Your answer clearly addresses the question ({word_count} words). "
            + ("Excellent use of concrete actions. " if has_star_indicators else "Consider framing your response explicitly with the STAR method (Situation, Task, Action, Result). ")
            + "To make it even stronger, cite measurable impact (e.g. percentage latency reduction or number of active users)."
        )

        return {
            "score": score,
            "ai_feedback": feedback
        }

