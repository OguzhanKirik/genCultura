"""
LLMService — same provider-agnostic pattern as EmbeddingService.
MVP usage: optional body enrichment (async, non-blocking).
"""
from abc import ABC, abstractmethod
from openai import AsyncOpenAI
from app.config import get_settings

settings = get_settings()


class LLMService(ABC):
    @abstractmethod
    async def complete(self, system: str, user: str) -> str: ...


class OpenAICompatibleLLMService(LLMService):
    def __init__(self) -> None:
        self._client = AsyncOpenAI(
            api_key=settings.openai_api_key or "no-key",
            base_url=settings.openai_base_url,
        )
        self._model = settings.llm_model

    async def complete(self, system: str, user: str) -> str:
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.2,
            max_tokens=512,
        )
        return response.choices[0].message.content or ""


llm_service = OpenAICompatibleLLMService()
