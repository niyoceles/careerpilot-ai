from typing import Dict, Any, List, Optional
import re
from app.models.entities import ProfessionalProfile, Job

class MatchingService:
    DEFAULT_WEIGHTS = {
        "skills": 0.40,
        "experience": 0.25,
        "education": 0.15,
        "location": 0.10,
        "responsibilities": 0.10
    }

    @classmethod
    def evaluate_match(
        cls,
        profile: ProfessionalProfile,
        job: Job,
        custom_weights: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        weights = custom_weights or cls.DEFAULT_WEIGHTS

        # 1. Skill Compatibility (0 - 100)
        candidate_skills = {s.name.lower(): s for s in profile.skills} if profile.skills else {}
        job_required_skills = [s.lower() for s in (job.required_skills or [])]
        
        # If job doesn't have explicit required_skills list, extract from description & requirements
        if not job_required_skills:
            job_text = f"{job.title} {job.description} {' '.join(job.requirements or [])}".lower()
            common_skills = [
                "python", "javascript", "typescript", "react", "node.js", "fastapi", "docker",
                "postgresql", "aws", "git", "ci/cd", "rest", "graphql", "tailwind", "redis",
                "linux", "kubernetes", "langchain", "sql", "nosql", "agile", "tdd"
            ]
            job_required_skills = [cs for cs in common_skills if re.search(r'\b' + re.escape(cs) + r'\b', job_text)]

        matching_skills = []
        partial_skills = []
        missing_skills = []

        for req_skill in job_required_skills:
            matched = False
            for cand_skill_name, cand_skill in candidate_skills.items():
                if req_skill == cand_skill_name or req_skill in cand_skill_name or cand_skill_name in req_skill:
                    matching_skills.append(cand_skill.name)
                    matched = True
                    break
            if not matched:
                # Check if mentioned in work experiences or projects
                in_exp = False
                for exp in profile.work_experiences or []:
                    desc = f"{exp.position} {exp.description or ''} {' '.join(exp.achievements or [])}".lower()
                    if req_skill in desc:
                        partial_skills.append(f"{req_skill.capitalize()} (applied in {exp.company})")
                        in_exp = True
                        break
                if not in_exp:
                    missing_skills.append(req_skill.capitalize())

        total_skills_count = len(job_required_skills) if job_required_skills else 1
        skill_score = min(100.0, ((len(matching_skills) * 1.0 + len(partial_skills) * 0.5) / total_skills_count) * 100.0)

        # 2. Experience Compatibility (0 - 100)
        job_desc_lower = job.description.lower()
        exp_match = re.search(r'(\d+)\+?\s*(?:to\s*\d+\s*)?years?(?:\s+of)?\s+experience', job_desc_lower)
        required_years = float(exp_match.group(1)) if exp_match else 2.0
        candidate_years = float(profile.total_experience_years or 0.0)

        if candidate_years >= required_years:
            experience_score = 100.0
        elif candidate_years >= (required_years * 0.7):
            experience_score = 75.0
        elif candidate_years > 0:
            experience_score = max(30.0, (candidate_years / required_years) * 100.0)
        else:
            experience_score = 40.0

        # 3. Education Compatibility (0 - 100)
        has_degree = False
        degree_titles = [e.degree.lower() for e in (profile.education or [])]
        if any("bachelor" in d or "master" in d or "phd" in d or "degree" in d or "computer" in d for d in degree_titles):
            has_degree = True

        education_score = 90.0 if has_degree else 70.0
        if "master" in job_desc_lower and not any("master" in d or "phd" in d for d in degree_titles):
            education_score = 65.0

        # 4. Location & Remote Compatibility (0 - 100)
        location_score = 70.0
        is_job_remote = job.location_type == "remote" or "remote" in (job.location or "").lower()
        candidate_remote_pref = profile.remote_preference or "remote_or_hybrid"
        
        pref_locations = [loc.lower() for loc in (profile.preferred_locations or [])]
        job_location_str = (job.location or "").lower()

        if is_job_remote:
            location_score = 100.0
        elif any(loc in job_location_str for loc in pref_locations):
            location_score = 95.0
        elif "rwanda" in job_location_str or "kigali" in job_location_str:
            location_score = 100.0
        elif candidate_remote_pref == "remote":
            location_score = 40.0
        else:
            location_score = 60.0

        # 5. Responsibilities / Leadership (0 - 100)
        responsibilities_score = 80.0
        matching_experience_snippets = []
        for exp in (profile.work_experiences or [])[:3]:
            matching_experience_snippets.append(
                f"{exp.position} at {exp.company}: demonstrated experience in development and system design."
            )

        # Calculate Transparent Weighted Score
        overall_score = round(
            skill_score * weights["skills"]
            + experience_score * weights["experience"]
            + education_score * weights["education"]
            + location_score * weights["location"]
            + responsibilities_score * weights["responsibilities"],
            1
        )
        overall_score = min(100.0, max(0.0, overall_score))

        # Generate Actionable Suggestions
        suggestions = []
        if missing_skills:
            suggestions.append(f"Highlight any experience with: {', '.join(missing_skills[:4])}.")
        if candidate_years < required_years:
            suggestions.append(
                f"Position requires ~{int(required_years)} years experience; emphasize hands-on project complexity to offset the {candidate_years:.1f} years on your CV."
            )
        if not is_job_remote and location_score < 70:
            suggestions.append(f"Confirm relocation or hybrid work arrangement in {job.location}.")
        if not suggestions:
            suggestions.append("Strong profile alignment; focus on specific measurable achievements in your tailored CV.")

        assessment = (
            f"Overall match score is {overall_score}%. "
            f"Skill match is {skill_score:.0f}%, with {len(matching_skills)} verified core skills. "
            f"Experience alignment is {experience_score:.0f}% based on {candidate_years:.1f} years recorded background."
        )

        return {
            "overall_score": overall_score,
            "skill_score": round(skill_score, 1),
            "experience_score": round(experience_score, 1),
            "education_score": round(education_score, 1),
            "location_score": round(location_score, 1),
            "matching_requirements": matching_skills,
            "partial_requirements": partial_skills,
            "missing_qualifications": missing_skills,
            "matching_experience": matching_experience_snippets,
            "suggestions": suggestions,
            "assessment": assessment
        }

