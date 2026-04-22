"""Resume file extraction - PDF, DOCX, TXT."""

import json
import logging
from typing import Dict, Optional
import chardet

try:
    import pdfminer.six
    from pdfminer.high_level import extract_text as pdf_extract_text
except ImportError:
    pdf_extract_text = None

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    from docx import Document
except ImportError:
    Document = None


logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF using pdfminer or PyMuPDF."""
    text = ""
    
    # Try pdfminer first (good for text-based PDFs)
    if pdf_extract_text:
        try:
            text = pdf_extract_text(file_path)
            if text.strip():
                logger.info(f"✓ Extracted {len(text)} chars from PDF using pdfminer")
                return text
        except Exception as e:
            logger.debug(f"pdfminer extraction failed: {e}")
    
    # Fallback to PyMuPDF (better for complex layouts)
    if fitz:
        try:
            doc = fitz.open(file_path)
            for page in doc:
                text += page.get_text()
            doc.close()
            if text.strip():
                logger.info(f"✓ Extracted {len(text)} chars from PDF using PyMuPDF")
                return text
        except Exception as e:
            logger.warning(f"PyMuPDF extraction failed: {e}")
    
    logger.error("No PDF extraction method available")
    raise ValueError("Could not extract PDF text - install pdfminer.six or PyMuPDF")


def extract_text_from_docx(file_path: str) -> str:
    """Extract text from DOCX file."""
    if not Document:
        raise ValueError("python-docx not installed")
    
    try:
        doc = Document(file_path)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        logger.info(f"✓ Extracted {len(text)} chars from DOCX")
        return text
    except Exception as e:
        logger.error(f"Failed to extract DOCX: {e}")
        raise


def extract_text_from_txt(file_path: str) -> str:
    """Extract text from TXT file."""
    try:
        # Detect encoding
        with open(file_path, 'rb') as f:
            raw_data = f.read(10000)
            detected = chardet.detect(raw_data)
            encoding = detected.get('encoding', 'utf-8') or 'utf-8'
        
        # Read with detected encoding
        with open(file_path, 'r', encoding=encoding, errors='ignore') as f:
            text = f.read()
        
        logger.info(f"✓ Extracted {len(text)} chars from TXT (encoding: {encoding})")
        return text
    except Exception as e:
        logger.error(f"Failed to extract TXT: {e}")
        raise


def extract_resume_text(file_path: str, file_type: str) -> str:
    """
    Extract text from resume file.
    
    Args:
        file_path: Path to file
        file_type: One of 'pdf', 'docx', 'txt'
    
    Returns:
        Extracted text
    """
    file_type = file_type.lower()
    
    if file_type == 'pdf':
        return extract_text_from_pdf(file_path)
    elif file_type == 'docx':
        return extract_text_from_docx(file_path)
    elif file_type == 'txt':
        return extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")


def clean_text(text: str) -> str:
    """Clean and normalize text."""
    # Remove extra whitespace
    text = ' '.join(text.split())
    
    # Remove common artifacts
    text = text.replace('\x00', '')  # Null chars
    text = text.replace('\ufeff', '')  # BOM
    
    return text.strip()
