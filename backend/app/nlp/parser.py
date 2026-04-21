"""Resume parsing via LLM (Ollama)."""

import json
import logging
from typing import Optional, Dict, Any

from app.nlp.ollama_client import ollama_client
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


RESUME_PARSE_SYSTEM_PROMPT = """You are a professional resume parser. Extract structured information from resumes.

Return ONLY valid JSON (no markdown, no code blocks) with this exact schema:
{
  "name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "linkedin_url": "string or null",
  "github_url": "string or null",
  "years_of_experience": "number or null (estimated from dates)",
  "skills": ["array of skill names extracted"],
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "start_date": "YYYY-MM or null",
      "end_date": "YYYY-MM or null",
      "description": "bullet points or summary"
    }
  ],
  "education": [
    {
      "degree": "BS, MS, PhD, etc",
      "field": "field of study",
      "school": "university name",
      "graduation_year": "YYYY or null"
    }
  ]
}

Be strict about this format. Extract as much as possible but don't hallucinate missing info."""


async def parse_resume(resume_text: str) -> Optional[Dict[str, Any]]:
    """
    Parse resume text into structured JSON using LLM.
    
    Args:
        resume_text: Raw resume text
    
    Returns:
        Parsed resume dict or None if parsing fails
    """
    if not resume_text or not resume_text.strip():
        logger.warning("Empty resume text")
        return None
    
    # Truncate very long resumes (avoid token limits)
    if len(resume_text) > 10000:
        resume_text = resume_text[:10000]
        logger.warning("Resume truncated to 10k chars")
    
    prompt = f"""Parse this resume and extract structured information:

{resume_text}"""
    
    try:
        result = await ollama_client.generate_json(
            model=settings.MODEL_PARSE,
            prompt=prompt,
            system_prompt=RESUME_PARSE_SYSTEM_PROMPT,
            temperature=0.2,  # Lower temp for consistent parsing
            max_tokens=2048
        )
        
        if result:
            logger.info(f"✓ Successfully parsed resume")
            return result
        else:
            logger.error("LLM returned invalid JSON")
            return None
    
    except Exception as e:
        logger.error(f"Resume parsing error: {e}")
        return None


async def parse_resume_with_spacy_fallback(
    resume_text: str,
    use_spacy_on_fail: bool = True
) -> Optional[Dict[str, Any]]:
    """
    Parse resume with LLM, fallback to spaCy if needed.
    
    Args:
        resume_text: Raw resume text
        use_spacy_on_fail: Whether to use spaCy fallback
    
    Returns:
        Parsed resume dict
    """
    # Try LLM first
    result = await parse_resume(resume_text)
    
    if result:
        return result
    
    # Fallback to spaCy
    if use_spacy_on_fail and settings.ENABLE_OLLAMA_FALLBACK:
        logger.info("Falling back to spaCy extraction")
        try:
            from app.nlp.spacy_utils import extract_with_spacy
            result = extract_with_spacy(resume_text)
            if result:
                logger.info("✓ spaCy extraction successful")
                return result
        except Exception as e:
            logger.error(f"spaCy fallback error: {e}")
    
    logger.error("All parsing methods failed")
    return None
