"""
LLMService — provider-agnostic, supports text-only and vision (text + images).
Switch providers by changing OPENAI_BASE_URL / LLM_MODEL in .env.
"""
import base64
from abc import ABC, abstractmethod
from pathlib import Path
from openai import AsyncOpenAI
from app.config import get_settings

settings = get_settings()


class LLMService(ABC):
    @abstractmethod
    async def complete(self, system: str, user: str) -> str: ...

    @abstractmethod
    async def complete_with_images(
        self, system: str, user: str, image_paths: list[Path]
    ) -> str: ...


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
                {"role": "user",   "content": user},
            ],
            temperature=0.2,
            max_tokens=512,
        )
        return response.choices[0].message.content or ""

    async def complete_with_images(
        self, system: str, user: str, image_paths: list[Path]
    ) -> str:
        content: list[dict] = [{"type": "text", "text": user}]

        for path in image_paths:
            if not path.exists():
                continue
            ext = path.suffix.lower().lstrip(".")
            mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
            b64 = base64.b64encode(path.read_bytes()).decode()
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:{mime};base64,{b64}"},
            })

        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": content},
            ],
            temperature=0.2,
            max_tokens=512,
        )
        return response.choices[0].message.content or ""


llm_service = OpenAICompatibleLLMService()
