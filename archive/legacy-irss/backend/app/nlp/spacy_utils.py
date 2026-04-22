"""spaCy-based fallback NER and extraction."""

import logging
from typing import Dict, Any, List
import re

try:
    import spacy
except ImportError:
    spacy = None

logger = logging.getLogger(__name__)


def load_spacy_model():
    """Load spaCy English model."""
    try:
        nlp = spacy.load("en_core_web_trf")
        return nlp
    except OSError:
        logger.warning("spaCy model not found, falling back to smaller model")
        try:
            nlp = spacy.load("en_core_web_sm")
            return nlp
        except OSError:
            logger.error("No spaCy model available")
            return None


def extract_email(text: str) -> str:
    """Extract email address using regex."""
    pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    matches = re.findall(pattern, text)
    return matches[0] if matches else None


def extract_phone(text: str) -> str:
    """Extract phone number using regex."""
    pattern = r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    matches = re.findall(pattern, text)
    return matches[0] if matches else None


def extract_urls(text: str) -> List[str]:
    """Extract URLs from text."""
    urls = {}
    
    # LinkedIn
    linkedin_pattern = r'(https?://)?(?:www\.)?linkedin\.com/(?:in|company)/[^\s]+'
    linkedin = re.findall(linkedin_pattern, text)
    if linkedin:
        urls['linkedin'] = linkedin[0] if isinstance(linkedin[0], str) else linkedin[0][1]
    
    # GitHub
    github_pattern = r'(https?://)?(?:www\.)?github\.com/[^\s]+'
    github = re.findall(github_pattern, text)
    if github:
        urls['github'] = github[0] if isinstance(github[0], str) else github[0][1]
    
    return urls


def extract_with_spacy(resume_text: str) -> Dict[str, Any]:
    """
    Extract resume information using spaCy NER.
    
    Args:
        resume_text: Raw resume text
    
    Returns:
        Parsed data dict
    """
    if not spacy:
        logger.error("spaCy not installed")
        return None
    
    nlp = load_spacy_model()
    if not nlp:
        return None
    
    try:
        doc = nlp(resume_text)
        
        # Extract entities
        person_name = None
        organizations = []
        locations = []
        dates = []
        
        for ent in doc.ents:
            if ent.label_ == "PERSON" and not person_name:
                person_name = ent.text
            elif ent.label_ == "ORG":
                organizations.append(ent.text)
            elif ent.label_ == "GPE":
                locations.append(ent.text)
            elif ent.label_ == "DATE":
                dates.append(ent.text)
        
        # Extract contact info
        email = extract_email(resume_text)
        phone = extract_phone(resume_text)
        urls = extract_urls(resume_text)
        
        # Simple location extraction (usually first GPE)
        location = locations[0] if locations else None
        
        # Extract skills (basic keyword matching)
        skills = []
        skill_keywords = [
            'python', 'java', 'javascript', 'react', 'django', 'fastapi',
            'sql', 'postgresql', 'mongodb', 'docker', 'kubernetes',
            'aws', 'gcp', 'azure', 'machine learning', 'data science',
            'nlp', 'deep learning', 'tensorflow', 'pytorch',
            'git', 'linux', 'restapi', 'microservices'
        ]
        text_lower = resume_text.lower()
        for skill in skill_keywords:
            if skill in text_lower:
                skills.append(skill)
        
        # Estimate years of experience from dates
        # This is a very simple heuristic
        import datetime
        years_exp = len(dates) * 0.5  # Rough estimate
        
        result = {
            "name": person_name,
            "email": email,
            "phone": phone,
            "location": location,
            "linkedin_url": urls.get("linkedin"),
            "github_url": urls.get("github"),
            "skills": list(set(skills)),  # Remove duplicates
            "years_of_experience": min(years_exp, 50),  # Cap at 50
            "experience": [],
            "education": []
        }
        
        logger.info(f"✓ spaCy extraction: {person_name}")
        return result
    
    except Exception as e:
        logger.error(f"spaCy extraction error: {e}")
        return None
