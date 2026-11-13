import re
from typing import Dict, Any, List
from io import BytesIO
import pypdf
import docx
from app.utils.text_sanitizer import sanitize_text

class CVParser:
    @staticmethod
    def extract_text_from_pdf(file_bytes: bytes) -> str:
        text = ""
        try:
            reader = pypdf.PdfReader(BytesIO(file_bytes))
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        except Exception as e:
            text = f"Error extracting PDF: {str(e)}"
        return sanitize_text(text)

    @staticmethod
    def extract_text_from_docx(file_bytes: bytes) -> str:
        text = ""
        try:
            doc = docx.Document(BytesIO(file_bytes))
            for p in doc.paragraphs:
                if p.text:
                    text += p.text + "\n"
            for table in doc.tables:
                for row in table.rows:
                    row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_text:
                        text += " | ".join(row_text) + "\n"
        except Exception as e:
            text = f"Error extracting DOCX: {str(e)}"
        return sanitize_text(text)

    @classmethod
    def extract_text(cls, file_bytes: bytes, file_type: str) -> str:
        if file_type.lower() == "pdf":
            return cls.extract_text_from_pdf(file_bytes)
        elif file_type.lower() in ["docx", "doc"]:
            return cls.extract_text_from_docx(file_bytes)
        return ""

    @classmethod
    def parse_cv_heuristics(cls, raw_text: str) -> Dict[str, Any]:
        """
        Extracts foundational structured data using deterministic patterns
        before and alongside LLM refinement.
        """
        lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
        
        # Email extraction
        email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
        emails = re.findall(email_pattern, raw_text)
        email = emails[0] if emails else ""

        # Phone extraction
        phone_match = re.search(r'(?:\+?[0-9]{1,4}[-.\s]?)?\(?[0-9]{2,4}\)?[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,6}', raw_text)
        phone = phone_match.group(0).strip() if phone_match else ""

        # Name heuristic: Usually on first few lines
        full_name = ""
        for line in lines[:5]:
            if line and not re.search(email_pattern, line) and not re.search(r'resume|curriculum|vitae|page', line, re.I):
                if len(line.split()) <= 4 and re.match(r'^[A-Z][a-zA-Z\s.-]+$', line):
                    full_name = line.strip()
                    break

        # Common Tech skills dictionary
        tech_keywords = [
            "Python", "JavaScript", "TypeScript", "React", "Node.js", "FastAPI",
            "Django", "Flask", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker",
            "Kubernetes", "AWS", "Azure", "GCP", "Git", "CI/CD", "Linux", "REST",
            "GraphQL", "Tailwind CSS", "HTML5", "CSS3", "Next.js", "Vue.js",
            "SQLAlchemy", "LangChain", "LangGraph", "PyTorch", "TensorFlow",
            "Pandas", "NumPy", "C++", "Java", "Go", "Rust", "Golang"
        ]
        
        extracted_skills = []
        lower_text = raw_text.lower()
        for kw in tech_keywords:
            if re.search(r'\b' + re.escape(kw.lower()) + r'\b', lower_text):
                extracted_skills.append({
                    "name": kw,
                    "category": "technical",
                    "proficiency": "advanced",
                    "years_of_experience": 3.0
                })

        # Experience calculation approximation
        year_matches = re.findall(r'\b(19\d\d|20\d\d)\b', raw_text)
        total_years = 0.0
        if year_matches:
            years = [int(y) for y in year_matches if 1980 <= int(y) <= 2030]
            if years:
                total_years = max(0.0, float(max(years) - min(years)))
                if total_years > 30:
                    total_years = 5.0  # reasonable cap

        # Summary extraction heuristic
        summary = ""
        summary_match = re.search(r'(?:summary|profile|about me|objective)[\s:]*\n+(.*?)(?=\n\s*(?:experience|education|skills|projects)|\Z)', raw_text, re.I | re.S)
        if summary_match:
            summary = summary_match.group(1).strip()[:1000]

        return {
            "full_name": full_name or "Job Applicant",
            "email": email,
            "phone": phone,
            "summary": summary or raw_text[:300].strip(),
            "total_experience_years": total_years if total_years > 0 else 2.0,
            "skills": extracted_skills,
            "work_experiences": [],
            "education": [],
            "projects": [],
            "certifications": [],
            "preferred_job_titles": ["Full Stack Engineer", "Software Engineer", "Backend Developer"],
            "preferred_locations": ["Rwanda", "Kigali", "Remote"],
            "remote_preference": "remote_or_hybrid"
        }
