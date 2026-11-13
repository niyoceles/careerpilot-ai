import re
from typing import Tuple

SUSPICIOUS_PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+instructions",
    r"disregard\s+(all\s+)?(previous|prior)\s+instructions",
    r"you\s+are\s+now\s+a\s+",
    r"system\s*:\s*",
    r"<\|im_start\|>",
    r"<\|im_end\|>",
    r"\[INST\]",
    r"\[/INST\]",
    r"human:\s*",
    r"assistant:\s*",
]

def sanitize_text(text: str) -> str:
    """Removes potential prompt injection attacks and control characters."""
    if not text:
        return ""
    
    sanitized = text
    for pattern in SUSPICIOUS_PROMPT_INJECTION_PATTERNS:
        sanitized = re.sub(pattern, "[FILTERED_INSTRUCTION]", sanitized, flags=re.IGNORECASE)
    
    # Strip dangerous non-printable control characters, but preserve tabs, newlines, carriage returns
    sanitized = re.sub(r"[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]", "", sanitized)
    return sanitized.strip()

def validate_uploaded_file(filename: str, content_type: str, file_size: int, max_size_mb: int = 15) -> Tuple[bool, str]:
    if not filename:
        return False, "File has no filename"
    
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ["pdf", "docx"]:
        return False, "Unsupported file format. Please upload a PDF or DOCX file."
    
    if file_size > max_size_mb * 1024 * 1024:
        return False, f"File exceeds maximum allowed size of {max_size_mb} MB"
        
    return True, ""

