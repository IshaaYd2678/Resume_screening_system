"""Scoring and ranking logic - multi-dimensional candidate evaluation."""

import logging
import re
from typing import Dict, Any, Optional, List
import numpy as np
from rapidfuzz import fuzz
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session

from app.nlp.embedding import embedding_client
from app.models import Candidate, Job

logger = logging.getLogger(__name__)


async def score_candidate(
    candidate: Candidate,
    job: Job,
    weights: Dict[str, float],
    db: Session
) -> Dict[str, float]:
    """
    Score candidate against job across 5 dimensions.
    
    Dimensions:
    1. Skills Match (30%): Jaccard similarity of skill sets
    2. Semantic Similarity (25%): Cosine similarity of embeddings
    3. Experience Alignment (25%): Years matched + LLM scoring
    4. Education Fit (10%): Degree level + field matching
    5. Keyword Density (10%): TF-IDF overlap of key terms
    
    Args:
        candidate: Candidate model
        job: Job model
        weights: Weight dict {skills, semantic, experience, education, keywords}
        db: Database session
    
    Returns:
        Dict with dimension scores and composite
    """
    scores = {
        'skills_score': 0,
        'semantic_score': 0,
        'experience_score': 0,
        'education_score': 0,
        'keywords_score': 0,
        'composite': 0
    }
    
    try:
        # 1. Skills Match (Jaccard Similarity)
        scores['skills_score'] = await _score_skills(candidate, job)
        
        # 2. Semantic Similarity (Embedding Cosine)
        scores['semantic_score'] = await _score_semantic(candidate, job)
        
        # 3. Experience Alignment
        scores['experience_score'] = await _score_experience(candidate, job)
        
        # 4. Education Fit
        scores['education_score'] = _score_education(candidate, job)
        
        # 5. Keyword Density (TF-IDF)
        scores['keywords_score'] = _score_keywords(candidate, job)
        
        # Composite weighted score
        composite = (
            scores['skills_score'] * weights.get('skills', 0.30) +
            scores['semantic_score'] * weights.get('semantic', 0.25) +
            scores['experience_score'] * weights.get('experience', 0.25) +
            scores['education_score'] * weights.get('education', 0.10) +
            scores['keywords_score'] * weights.get('keywords', 0.10)
        )
        
        scores['composite'] = min(100, max(0, composite))  # Clamp 0-100
        
        logger.info(f"Scores for {candidate.name}: {scores}")
        
        return scores
    
    except Exception as e:
        logger.error(f"Scoring error: {e}", exc_info=True)
        return scores


async def _score_skills(candidate: Candidate, job: Job) -> float:
    """Score based on skill overlap."""
    candidate_skills = set(s.lower().strip() for s in (candidate.skills or []))
    
    # Extract must-have and nice-to-have from job
    must_have = set(s.lower().strip() for s in (job.must_have_skills or []))
    nice_to_have = set(s.lower().strip() for s in (job.nice_to_have_skills or []))
    required_skills = must_have | nice_to_have
    
    if not required_skills:
        return 50  # No requirement = neutral score
    
    # Fuzzy matching for skill name variations
    matched_skills = set()
    for req_skill in required_skills:
        for cand_skill in candidate_skills:
            ratio = fuzz.ratio(req_skill, cand_skill)
            if ratio >= 80:
                matched_skills.add(req_skill)
                break
    
    # Must-have penalty
    must_have_matched = matched_skills & must_have
    must_have_score = (len(must_have_matched) / len(must_have) * 100) if must_have else 50
    
    # Nice-to-have bonus
    nice_bonus = (len(matched_skills & nice_to_have) / max(1, len(nice_to_have))) * 20
    
    score = (must_have_score * 0.8) + nice_bonus
    return min(100, score)


async def _score_semantic(candidate: Candidate, job: Job) -> float:
    """Score based on semantic similarity via embeddings."""
    if not candidate.embedding or not job.jd_embedding:
        logger.debug("Missing embeddings for semantic scoring")
        return 50
    
    try:
        cand_emb = np.array(candidate.embedding, dtype=np.float32)
        job_emb = np.array(job.jd_embedding, dtype=np.float32)
        
        # Cosine similarity
        similarity = float(np.dot(cand_emb, job_emb))
        
        # Scale to 0-100
        score = max(0, min(100, (similarity + 1) * 50))
        
        return score
    
    except Exception as e:
        logger.error(f"Semantic scoring error: {e}")
        return 50


async def _score_experience(candidate: Candidate, job: Job) -> float:
    """Score based on years of experience and role history."""
    candidate_years = candidate.years_of_experience or 0
    required_years = job.min_experience_years or 0
    
    if candidate_years >= required_years:
        # Has enough experience
        # Give bonus for exceeding requirements (but cap it)
        excess = min(candidate_years - required_years, 10)
        score = 80 + (excess * 2)
    else:
        # Below requirement, reduce score
        missing = required_years - candidate_years
        score = max(20, 80 - (missing * 10))
    
    # Also consider job title matches in experience
    if job.title and candidate.experience:
        job_title_lower = job.title.lower()
        for exp in candidate.experience:
            title = (exp.get('title') or '').lower()
            if fuzz.ratio(job_title_lower, title) >= 70:
                score += 10
                break
    
    return min(100, score)


def _score_education(candidate: Candidate, job: Job) -> float:
    """Score based on education level and field."""
    if not candidate.education:
        return 40  # No education data = moderate penalty
    
    # Degree level scoring
    degree_scores = {
        'phd': 100,
        'master': 80,
        'ms': 80,
        'ma': 80,
        'mba': 75,
        'bachelor': 70,
        'bs': 70,
        'ba': 70,
        'associate': 50,
        'diploma': 40,
        'certificate': 30
    }
    
    max_degree_score = 0
    for edu in candidate.education:
        degree = (edu.get('degree') or '').lower()
        for deg_key, deg_score in degree_scores.items():
            if deg_key in degree:
                max_degree_score = max(max_degree_score, deg_score)
    
    return max_degree_score if max_degree_score > 0 else 50


def _score_keywords(candidate: Candidate, job: Job) -> float:
    """Score based on TF-IDF keyword overlap."""
    if not job.jd_text:
        return 50
    
    # Get resume text from candidate's resume
    candidate_text = ""
    if hasattr(candidate, 'resume') and candidate.resume:
        candidate_text = candidate.resume.raw_text or ""
    
    if not candidate_text:
        logger.debug("No candidate text available for keyword scoring")
        return 50
    
    try:
        # TF-IDF vectorizer
        vectorizer = TfidfVectorizer(stop_words='english', max_features=50)
        
        try:
            matrix = vectorizer.fit_transform([job.jd_text, candidate_text])
            similarity = float(cosine_similarity(matrix[0], matrix[1]))
            score = similarity * 100
            return min(100, score)
        except ValueError:
            # Not enough documents or empty
            return 50
    
    except Exception as e:
        logger.error(f"Keyword scoring error: {e}")
        return 50
