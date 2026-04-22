"""Score explanation generation (XAI - Explainable AI)."""

import logging
from typing import Dict, List, Optional, Tuple
import numpy as np
from sqlalchemy.orm import Session

from app.models import Candidate, Job, Score, Explanation
from app.nlp.ollama_client import ollama_client
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


EXPLANATION_SYSTEM_PROMPT = """You are an expert recruiter explaining why a candidate scored a certain way.
Provide a brief, clear narrative (2-3 sentences) explaining the candidate's fit for the role.
Focus on their strengths and highlight any gaps.
Be professional and constructive."""


async def generate_explanation(
    score: Score,
    candidate: Candidate,
    job: Job,
    db: Session
) -> Optional[Explanation]:
    """
    Generate XAI explanation for a candidate score.
    
    Args:
        score: Score record
        candidate: Candidate profile
        job: Job posting
        db: Database session
    
    Returns:
        Explanation record or None
    """
    try:
        # Extract evidence for each dimension
        matched_skills = _extract_matched_skills(candidate, job)
        missing_skills = _extract_missing_skills(candidate, job)
        top_exp = _extract_top_experience(candidate, job)
        highlights = await _generate_highlights(candidate, job)
        
        # Generate narrative using LLM
        narrative = await _generate_narrative(
            candidate, job, score, matched_skills, missing_skills
        )
        
        # Create explanation record
        explanation = Explanation(
            score_id=score.id,
            matched_skills=matched_skills[:5],  # Top 5
            missing_required_skills=missing_skills[:3],  # Top 3 gaps
            top_matching_experience=top_exp,
            narrative=narrative,
            highlights=highlights
        )
        
        db.add(explanation)
        db.commit()
        db.refresh(explanation)
        
        logger.info(f"✓ Generated explanation for {candidate.name}")
        return explanation
    
    except Exception as e:
        logger.error(f"Explanation generation error: {e}", exc_info=True)
        return None


def _extract_matched_skills(candidate: Candidate, job: Job) -> List[str]:
    """Extract and rank candidate skills that match job requirements."""
    candidate_skills = set(s.lower() for s in (candidate.skills or []))
    required_skills = set(s.lower() for s in (
        (job.must_have_skills or []) + (job.nice_to_have_skills or [])
    ))
    
    matched = list(candidate_skills & required_skills)
    
    # Rank by importance (must-have first)
    must_have_lower = set(s.lower() for s in (job.must_have_skills or []))
    matched.sort(key=lambda s: s not in must_have_lower)
    
    return matched


def _extract_missing_skills(candidate: Candidate, job: Job) -> List[str]:
    """Extract required skills the candidate is missing."""
    candidate_skills = set(s.lower() for s in (candidate.skills or []))
    must_have_skills = set(s.lower() for s in (job.must_have_skills or []))
    
    missing = list(must_have_skills - candidate_skills)
    return missing


def _extract_top_experience(candidate: Candidate, job: Job) -> Optional[str]:
    """Extract the most relevant work experience."""
    if not candidate.experience:
        return None
    
    # Find experience with highest title similarity
    best_exp = None
    best_score = 0
    job_title_lower = (job.title or "").lower()
    
    for exp in candidate.experience:
        exp_title = (exp.get('title') or '').lower()
        # Simple similarity (could use fuzzy matching)
        similarity = sum(
            1 for word in job_title_lower.split()
            if word in exp_title
        )
        
        if similarity > best_score:
            best_score = similarity
            best_exp = exp
    
    if best_exp:
        title = best_exp.get('title', 'Unknown')
        company = best_exp.get('company', 'Unknown')
        desc = best_exp.get('description', '')[:100]
        return f"{title} at {company}: {desc}"
    
    return None


async def _generate_highlights(
    candidate: Candidate,
    job: Job
) -> Optional[List[Dict]]:
    """
    Generate sentence-level highlights for PDF viewer.
    
    Returns list of {sentence, similarity_score} for highlighting.
    """
    if not candidate.resume or not candidate.resume.raw_text:
        return None
    
    try:
        # Split resume into sentences (simple split on periods)
        sentences = candidate.resume.raw_text.split('.')[:10]  # First 10 sentences
        
        # Score each sentence against job description
        highlights = []
        for sentence in sentences:
            if len(sentence.strip()) < 10:
                continue
            
            # This would use embedding similarity in production
            # For now, simple keyword matching
            keywords = set((job.jd_text or '').lower().split())
            sentence_words = set(sentence.lower().split())
            
            similarity = len(keywords & sentence_words) / max(len(keywords), 1)
            
            if similarity > 0.1:  # Only include if some match
                highlights.append({
                    "sentence": sentence.strip(),
                    "similarity": float(similarity)
                })
        
        return highlights if highlights else None
    
    except Exception as e:
        logger.debug(f"Highlight generation failed: {e}")
        return None


async def _generate_narrative(
    candidate: Candidate,
    job: Job,
    score: Score,
    matched_skills: List[str],
    missing_skills: List[str]
) -> Optional[str]:
    """Generate narrative explanation using LLM."""
    try:
        prompt = f"""
Candidate: {candidate.name}
Experience: {candidate.years_of_experience or 0} years
Matched Skills: {', '.join(matched_skills[:3])}
Missing Required Skills: {', '.join(missing_skills[:2])}
Composite Score: {score.composite_score:.1f}/100

Job: {job.title}
Required: {', '.join((job.must_have_skills or [])[:3])}

Explain in 2-3 sentences why this candidate scored {score.composite_score:.0f} points:
"""
        
        narrative = ""
        async for chunk in ollama_client.stream_text(
            model=settings.MODEL_EXPLAIN,
            prompt=prompt,
            system_prompt=EXPLANATION_SYSTEM_PROMPT,
        ):
            narrative += chunk
        
        return narrative if narrative else None
    
    except Exception as e:
        logger.error(f"Narrative generation error: {e}")
        return None
