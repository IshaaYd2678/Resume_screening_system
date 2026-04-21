"""Text embedding generation and management."""

import logging
import numpy as np
from typing import List, Optional
import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class EmbeddingClient:
    """Generate and manage embeddings using Ollama."""
    
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.MODEL_EMBED
        self.embedding_dim = 384  # nomic-embed-text dimension
    
    async def embed_text(self, text: str) -> Optional[List[float]]:
        """
        Generate embedding for a single text.
        
        Args:
            text: Text to embed
        
        Returns:
            Embedding vector or None if failed
        """
        if not text or not text.strip():
            return None
        
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(
                    f"{self.base_url}/api/embeddings",
                    json={
                        "model": self.model,
                        "prompt": text.strip()
                    }
                )
            
            if response.status_code != 200:
                logger.error(f"Embedding error: {response.text}")
                return None
            
            result = response.json()
            embedding = result.get("embedding")
            
            if embedding:
                # Normalize to unit vector (L2 normalization)
                embedding_array = np.array(embedding, dtype=np.float32)
                norm = np.linalg.norm(embedding_array)
                if norm > 0:
                    embedding_array = (embedding_array / norm).tolist()
                
                return embedding_array
            
            return None
        
        except Exception as e:
            logger.error(f"Embedding generation error: {e}")
            return None
    
    async def embed_batch(self, texts: List[str], batch_size: int = 32) -> List[Optional[List[float]]]:
        """
        Generate embeddings for multiple texts in batches.
        
        Args:
            texts: List of texts to embed
            batch_size: Number of texts per batch
        
        Returns:
            List of embeddings (None for failed texts)
        """
        embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_embeddings = []
            
            for text in batch:
                embedding = await self.embed_text(text)
                batch_embeddings.append(embedding)
            
            embeddings.extend(batch_embeddings)
            logger.info(f"Embedded {min(i + batch_size, len(texts))}/{len(texts)} texts")
        
        return embeddings
    
    async def similarity(
        self,
        text1: str,
        text2: str
    ) -> Optional[float]:
        """
        Calculate cosine similarity between two texts.
        
        Args:
            text1: First text
            text2: Second text
        
        Returns:
            Similarity score (0-1) or None if failed
        """
        try:
            emb1 = await self.embed_text(text1)
            emb2 = await self.embed_text(text2)
            
            if not emb1 or not emb2:
                return None
            
            # Cosine similarity
            emb1_array = np.array(emb1, dtype=np.float32)
            emb2_array = np.array(emb2, dtype=np.float32)
            
            similarity = np.dot(emb1_array, emb2_array)
            
            return float(similarity)
        
        except Exception as e:
            logger.error(f"Similarity calculation error: {e}")
            return None


# Global client instance
embedding_client = EmbeddingClient()
