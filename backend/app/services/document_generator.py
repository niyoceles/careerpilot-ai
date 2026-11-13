import os
import uuid
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

from app.core.config import settings
from app.models.entities import ProfessionalProfile, Job
from app.services.ai_service import ai_service

class DocumentGenerator:
    @staticmethod
    def _get_output_paths(doc_type: str, prefix: str = "doc") -> tuple[str, str, str, str]:
        unique_id = str(uuid.uuid4())[:8]
        filename_base = f"{prefix}_{doc_type}_{unique_id}"
        gen_dir = os.path.join(settings.STORAGE_DIR, "generated")
        os.makedirs(gen_dir, exist_ok=True)
        pdf_path = os.path.join(gen_dir, f"{filename_base}.pdf")
        docx_path = os.path.join(gen_dir, f"{filename_base}.docx")
        rel_pdf = f"generated/{filename_base}.pdf"
        rel_docx = f"generated/{filename_base}.docx"
        return pdf_path, docx_path, rel_pdf, rel_docx

    @classmethod
    def generate_tailored_cv(
        cls,
        profile: ProfessionalProfile,
        job: Job,
        emphasis_skills: List[str] = None
    ) -> Dict[str, Any]:
        """
        Generates an ATS-compliant tailored CV strictly adhering to candidate's real profile.
        Produces both PDF and DOCX documents.
        """
        pdf_path, docx_path, rel_pdf, rel_docx = cls._get_output_paths("tailored_cv", "cv")

        full_name = profile.full_name or "Professional Candidate"
        contact_line = " | ".join(filter(None, [profile.email, profile.phone, profile.location]))
        summary = profile.summary or (
            f"Results-oriented {job.title} with solid track record in software engineering, "
            f"problem solving, and delivery of production-grade systems."
        )

        # 1. Generate DOCX
        doc = docx.Document()
        
        # Set clean ATS margins (0.75 in)
        sections = doc.sections
        for section in sections:
            section.top_margin = Inches(0.75)
            section.bottom_margin = Inches(0.75)
            section.left_margin = Inches(0.75)
            section.right_margin = Inches(0.75)

        # Header: Name
        title_p = doc.add_paragraph()
        title_run = title_p.add_run(full_name)
        title_run.font.name = "Arial"
        title_run.font.size = Pt(20)
        title_run.font.bold = True
        title_run.font.color.rgb = RGBColor(30, 41, 59)
        title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER

        # Header: Contact
        contact_p = doc.add_paragraph()
        c_run = contact_p.add_run(contact_line)
        c_run.font.name = "Arial"
        c_run.font.size = Pt(10)
        c_run.font.color.rgb = RGBColor(100, 116, 139)
        contact_p.alignment = WD_ALIGN_PARAGRAPH.CENTER

        # Section: Professional Summary
        cls._add_docx_section_heading(doc, "PROFESSIONAL SUMMARY")
        sum_p = doc.add_paragraph()
        s_run = sum_p.add_run(summary)
        s_run.font.name = "Arial"
        s_run.font.size = Pt(10.5)

        # Section: Core Skills
        cls._add_docx_section_heading(doc, "CORE SKILLS & TECHNOLOGIES")
        skills_p = doc.add_paragraph()
        skills_list = [s.name for s in (profile.skills or [])]
        if emphasis_skills:
            # Reorder skills so emphasis skills are upfront
            emphasis_set = set(emphasis_skills)
            skills_list = [s for s in skills_list if s in emphasis_set] + [s for s in skills_list if s not in emphasis_set]
        skills_text = " • ".join(skills_list) if skills_list else "Software Engineering • Problem Solving • System Architecture"
        sk_run = skills_p.add_run(skills_text)
        sk_run.font.name = "Arial"
        sk_run.font.size = Pt(10)

        # Section: Work Experience
        if profile.work_experiences:
            cls._add_docx_section_heading(doc, "PROFESSIONAL EXPERIENCE")
            for exp in profile.work_experiences:
                exp_header = doc.add_paragraph()
                r_pos = exp_header.add_run(f"{exp.position} — {exp.company}")
                r_pos.font.name = "Arial"
                r_pos.font.size = Pt(11)
                r_pos.font.bold = True
                
                dates = f"{exp.start_date or ''} - {'Present' if exp.is_current else (exp.end_date or '')}"
                if exp.location:
                    dates += f" | {exp.location}"
                r_date = exp_header.add_run(f" ({dates})")
                r_date.font.name = "Arial"
                r_date.font.size = Pt(9.5)
                r_date.font.italic = True

                if exp.description:
                    desc_p = doc.add_paragraph()
                    d_run = desc_p.add_run(exp.description)
                    d_run.font.name = "Arial"
                    d_run.font.size = Pt(10)

                for ach in (exp.achievements or []):
                    bullet_p = doc.add_paragraph(style='List Bullet')
                    b_run = bullet_p.add_run(ach)
                    b_run.font.name = "Arial"
                    b_run.font.size = Pt(10)

        # Section: Education
        if profile.education:
            cls._add_docx_section_heading(doc, "EDUCATION")
            for edu in profile.education:
                edu_p = doc.add_paragraph()
                edu_run = edu_p.add_run(f"{edu.degree} in {edu.field_of_study or ''} — {edu.institution}")
                edu_run.font.name = "Arial"
                edu_run.font.size = Pt(10.5)
                edu_run.font.bold = True
                if edu.end_date:
                    date_run = edu_p.add_run(f" ({edu.end_date})")
                    date_run.font.size = Pt(9.5)

        # Section: Projects
        if profile.projects:
            cls._add_docx_section_heading(doc, "KEY PROJECTS")
            for proj in profile.projects:
                p_p = doc.add_paragraph()
                pr_title = p_p.add_run(proj.name)
                pr_title.font.name = "Arial"
                pr_title.font.size = Pt(10.5)
                pr_title.font.bold = True
                if proj.technologies:
                    pr_tech = p_p.add_run(f" [{', '.join(proj.technologies)}]")
                    pr_tech.font.name = "Arial"
                    pr_tech.font.size = Pt(9.5)
                    pr_tech.font.italic = True
                if proj.description:
                    pd_p = doc.add_paragraph(proj.description, style='List Bullet')
                    pd_p.runs[0].font.name = "Arial"
                    pd_p.runs[0].font.size = Pt(10)

        doc.save(docx_path)

        # 2. Generate PDF via ReportLab
        pdf_doc = SimpleDocTemplate(
            pdf_path,
            pagesize=letter,
            leftMargin=40,
            rightMargin=40,
            topMargin=40,
            bottomMargin=40
        )
        styles = getSampleStyleSheet()
        normal_style = styles["Normal"]
        normal_style.fontSize = 10
        normal_style.leading = 14

        heading_style = ParagraphStyle(
            "CvHeading",
            parent=styles["Heading2"],
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#1e293b"),
            spaceBefore=10,
            spaceAfter=4,
            keepWithNext=True
        )

        elements = []
        # Title
        title_style = ParagraphStyle(
            "CvTitle",
            parent=styles["Title"],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0f172a"),
            alignment=1
        )
        elements.append(Paragraph(f"<b>{full_name}</b>", title_style))
        elements.append(Spacer(1, 4))
        
        contact_style = ParagraphStyle("Contact", alignment=1, fontSize=9, textColor=colors.HexColor("#64748b"))
        elements.append(Paragraph(contact_line, contact_style))
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=8))

        # Summary
        elements.append(Paragraph("<b>PROFESSIONAL SUMMARY</b>", heading_style))
        elements.append(Paragraph(summary, normal_style))
        elements.append(Spacer(1, 8))

        # Skills
        elements.append(Paragraph("<b>CORE SKILLS & TECHNOLOGIES</b>", heading_style))
        elements.append(Paragraph(skills_text, normal_style))
        elements.append(Spacer(1, 8))

        # Work Experience
        if profile.work_experiences:
            elements.append(Paragraph("<b>PROFESSIONAL EXPERIENCE</b>", heading_style))
            for exp in profile.work_experiences:
                dates = f"{exp.start_date or ''} - {'Present' if exp.is_current else (exp.end_date or '')}"
                elements.append(Paragraph(f"<b>{exp.position}</b> — {exp.company} <i>({dates})</i>", normal_style))
                if exp.description:
                    elements.append(Paragraph(exp.description, normal_style))
                for ach in (exp.achievements or []):
                    elements.append(Paragraph(f"• {ach}", normal_style))
                elements.append(Spacer(1, 6))

        # Education
        if profile.education:
            elements.append(Paragraph("<b>EDUCATION</b>", heading_style))
            for edu in profile.education:
                elements.append(Paragraph(f"<b>{edu.degree}</b> in {edu.field_of_study or ''} — {edu.institution} ({edu.end_date or ''})", normal_style))
                elements.append(Spacer(1, 4))

        pdf_doc.build(elements)

        content_json = {
            "full_name": full_name,
            "target_job_title": job.title,
            "company": job.company,
            "summary": summary,
            "skills": skills_list,
            "experiences_count": len(profile.work_experiences or [])
        }

        return {
            "title": f"Tailored CV - {job.title} at {job.company}",
            "file_path_pdf": rel_pdf,
            "file_path_docx": rel_docx,
            "content_json": content_json,
            "content_text": summary
        }

    @classmethod
    async def generate_cover_letter(
        cls,
        profile: ProfessionalProfile,
        job: Job,
        tone: str = "professional",
        provider: str = None,
        model: str = None,
        api_key: str = None
    ) -> Dict[str, Any]:
        """
        Generates a customized, persuasive cover letter matching candidate's verified background
        to the target employer's vacancy, dynamically authored by the AI model.
        """
        pdf_path, docx_path, rel_pdf, rel_docx = cls._get_output_paths("cover_letter", "cl")

        full_name = profile.full_name or "Applicant"
        contact_line = " | ".join(filter(None, [profile.email, profile.phone, profile.location]))
        
        top_skill = profile.skills[0].name if profile.skills else "Full Stack Software Development"
        exp_years = f"{profile.total_experience_years:.0f}+" if profile.total_experience_years else "several"
        skills_str = ", ".join([s.name for s in (profile.skills or [])[:6]])
        
        # Default structured letter body
        letter_body = (
            f"Dear Hiring Team at {job.company},\n\n"
            f"I am writing to express my high enthusiasm for the {job.title} position currently open at {job.company}. "
            f"With over {exp_years} years of demonstrated experience building robust software systems and a deep foundation in "
            f"{top_skill}, I am confident in my ability to make an immediate, positive impact on your engineering objectives.\n\n"
            f"In my previous roles, I have dedicated myself to shipping scalable, well-tested code and architecting end-to-end features "
            f"that directly enhance user satisfaction and business metrics. Reviewing the requirements for the {job.title} role, "
            f"I was particularly drawn to your focus on technical excellence and engineering rigor. "
            f"My hands-on experience matches the challenges your team is solving, especially regarding system reliability, modern web development, "
            f"and collaborative agile workflows.\n\n"
            f"I welcome the opportunity to discuss how my technical expertise, problem-solving mindset, and dedication to code quality "
            f"will support {job.company}'s continued success. Thank you very much for your time and consideration.\n\n"
            f"Sincerely,\n{full_name}"
        )

        # Dynamic AI generation if model is accessible
        try:
            ai_prompt = (
                f"Write a {tone} cover letter from candidate {full_name} for the position: {job.title} at {job.company}.\n"
                f"Candidate Years of Experience: {exp_years}\n"
                f"Candidate Core Skills: {skills_str}\n"
                f"Candidate Summary: {profile.summary or ''}\n\n"
                f"Job Requirements:\n{job.description[:1000] if job.description else ''}\n\n"
                f"Guidelines: Write 3-4 professional paragraphs highlighting alignment. Never fabricate credentials. "
                f"Begin with 'Dear Hiring Team at {job.company},' and end with 'Sincerely,\n{full_name}'."
            )
            ai_generated = await ai_service.generate_completion(
                prompt=ai_prompt,
                system_prompt="You are an elite career document writer. Produce the complete cover letter text.",
                provider=provider,
                model=model,
                api_key=api_key
            )
            if ai_generated and "Dear" in ai_generated and len(ai_generated) > 200:
                letter_body = ai_generated.strip()
        except Exception:
            pass

        # 1. DOCX
        doc = docx.Document()
        for section in doc.sections:
            section.top_margin = Inches(1.0)
            section.bottom_margin = Inches(1.0)
            section.left_margin = Inches(1.0)
            section.right_margin = Inches(1.0)

        p_name = doc.add_paragraph()
        r = p_name.add_run(full_name)
        r.font.name = "Arial"
        r.font.size = Pt(16)
        r.font.bold = True

        p_contact = doc.add_paragraph()
        r_c = p_contact.add_run(contact_line)
        r_c.font.name = "Arial"
        r_c.font.size = Pt(10)
        r_c.font.color.rgb = RGBColor(100, 116, 139)

        doc.add_paragraph()  # spacer

        for para in letter_body.split("\n\n"):
            p = doc.add_paragraph()
            p_run = p.add_run(para)
            p_run.font.name = "Arial"
            p_run.font.size = Pt(11)
            p.paragraph_format.line_spacing = 1.15
            p.paragraph_format.space_after = Pt(10)

        doc.save(docx_path)

        # 2. PDF
        pdf_doc = SimpleDocTemplate(pdf_path, pagesize=letter, leftMargin=50, rightMargin=50, topMargin=50, bottomMargin=50)
        styles = getSampleStyleSheet()
        normal_style = styles["Normal"]
        normal_style.fontSize = 11
        normal_style.leading = 16

        elements = []
        elements.append(Paragraph(f"<b>{full_name}</b>", styles["Title"]))
        elements.append(Paragraph(contact_line, normal_style))
        elements.append(Spacer(1, 15))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=15))

        for para in letter_body.split("\n\n"):
            elements.append(Paragraph(para.replace("\n", "<br/>"), normal_style))
            elements.append(Spacer(1, 10))

        pdf_doc.build(elements)

        return {
            "title": f"Cover Letter - {job.title} at {job.company}",
            "file_path_pdf": rel_pdf,
            "file_path_docx": rel_docx,
            "content_json": {"job_title": job.title, "company": job.company, "tone": tone},
            "content_text": letter_body
        }

    @classmethod
    async def generate_application_email(
        cls,
        profile: ProfessionalProfile,
        job: Job,
        recipient_name: str = None,
        recipient_email: str = None,
        provider: str = None,
        model: str = None,
        api_key: str = None
    ) -> Dict[str, Any]:
        """
        Prepares a concise application email with direct mailto link and subject line,
        crafted by the AI model.
        """
        full_name = profile.full_name or "Applicant"
        recipient = recipient_name or f"Hiring Team at {job.company}"
        subject = f"Application for {job.title} — {full_name}"

        body = (
            f"Dear {recipient},\n\n"
            f"I am pleased to submit my application for the {job.title} position at {job.company}. "
            f"With my background in software engineering and hands-on experience matching your vacancy requirements, "
            f"I am enthusiastic about the opportunity to contribute to your team.\n\n"
            f"Please find attached my tailored CV and cover letter for your review. "
            f"I look forward to discussing how my experience aligns with your goals.\n\n"
            f"Best regards,\n"
            f"{full_name}\n"
            f"{profile.email or ''} | {profile.phone or ''}"
        )

        try:
            ai_prompt = (
                f"Draft a short, compelling email application from {full_name} applying for {job.title} at {job.company}.\n"
                f"Candidate Summary: {profile.summary or ''}\n"
                f"Recipient: {recipient}\n\n"
                f"Return ONLY the email body text starting with 'Dear {recipient},' and ending with 'Best regards,\n{full_name}'."
            )
            ai_body = await ai_service.generate_completion(
                prompt=ai_prompt,
                system_prompt="You are an expert talent scout writing high-conversion job application emails.",
                provider=provider,
                model=model,
                api_key=api_key
            )
            if ai_body and "Dear" in ai_body and len(ai_body) > 100:
                body = ai_body.strip()
        except Exception:
            pass

        return {
            "title": f"Application Email - {job.title} at {job.company}",
            "file_path_pdf": None,
            "file_path_docx": None,
            "content_json": {
                "subject": subject,
                "recipient_name": recipient,
                "recipient_email": recipient_email or "",
                "body": body,
                "job_title": job.title,
                "company": job.company
            },
            "content_text": f"Subject: {subject}\n\n{body}"
        }

    @staticmethod
    def _add_docx_section_heading(doc, text: str):
        p = doc.add_paragraph()
        run = p.add_run(text)
        run.font.name = "Arial"
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.color.rgb = RGBColor(15, 23, 42)
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)

