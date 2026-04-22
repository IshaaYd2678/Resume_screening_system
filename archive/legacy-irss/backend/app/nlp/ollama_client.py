"""Ollama LLM integration."""

import logging
import json
from typing import Optional, Dict, Any
import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class OllamaClient:
    """Wrapper around Ollama API for local LLM inference."""
    
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.timeout = settings.LLM_TIMEOUT
    
    async def check_health(self) -> bool:
        """Check if Ollama is running."""
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Ollama health check failed: {e}")
            return False
    
    async def pull_model(self, model_name: str) -> bool:
        """Pull a model from Ollama (async)."""
        try:
            async with httpx.AsyncClient(timeout=3600) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/pull",
                    json={"name": model_name}
                ) as response:
                    if response.status_code == 200:
                        logger.info(f"✓ Model {model_name} pulled successfully")
                        return True
                    else:
                        logger.error(f"Failed to pull model {model_name}: {response.text}")
                        return False
        except Exception as e:
            logger.error(f"Error pulling model {model_name}: {e}")
            return False
    
    async def generate_json(
        self,
        model: str,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Optional[Dict[str, Any]]:
        """
        Generate JSON response from LLM.
        
        Args:
            model: Model name (e.g., 'mistral:7b-instruct-q4_K_M')
            prompt: User prompt
            system_prompt: System prompt to set context
            temperature: Sampling temperature
            max_tokens: Max tokens to generate
        
        Returns:
            Parsed JSON dict or None if parsing fails
        """
        try:
            messages = []
            
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            
            messages.append({"role": "user", "content": prompt})
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "stream": False,
                        "options": {
                            "num_predict": max_tokens,
                            "repeat_penalty": 1.0,
                            "top_p": settings.LLM_TOP_P,
                        }
                    }
                )
            
            if response.status_code != 200:
                logger.error(f"Ollama error: {response.text}")
                return None
            
            result = response.json()
            content = result.get("message", {}).get("content", "")
            
            # Try to parse JSON
            # First try direct JSON parse
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code blocks
                if "```json" in content:
                    json_str = content.split("```json")[1].split("```")[0].strip()
                    return json.loads(json_str)
                elif "```" in content:
                    json_str = content.split("```")[1].split("```")[0].strip()
                    return json.loads(json_str)
                else:
                    logger.warning(f"Could not parse JSON response: {content[:200]}")
                    return None
        
        except Exception as e:
            logger.error(f"Ollama JSON generation error: {e}")
            return None
    
    async def stream_text(
        self,
        model: str,
        prompt: str,
        system_prompt: Optional[str] = None,
    ):
        """
        Generate text response with streaming.
        
        Yields chunks of text as they're generated.
        """
        try:
            messages = []
            
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            
            messages.append({"role": "user", "content": prompt})
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/chat",
                    json={
                        "model": model,
                        "messages": messages,
                        "stream": True,
                        "temperature": settings.LLM_TEMPERATURE,
                        "options": {
                            "top_p": settings.LLM_TOP_P,
                        }
                    }
                ) as response:
                    if response.status_code != 200:
                        logger.error(f"Ollama error: {await response.aread()}")
                        return
                    
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        
                        try:
                            chunk = json.loads(line)
                            content = chunk.get("message", {}).get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            logger.debug(f"Failed to parse chunk: {line}")
        
        except Exception as e:
            logger.error(f"Ollama streaming error: {e}")


# Global client instance
ollama_client = OllamaClient()
