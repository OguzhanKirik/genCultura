"""
EmbeddingService — the single abstraction boundary between application code and
embedding providers. Swap base_url/model to move from OpenAI → vLLM → Ollama
without touching any router or business logic.
"""
from abc import ABC, abstractmethod
from openai import AsyncOpenAI
from app.config import get_settings

settings = get_settings()


class EmbeddingService(ABC):
    @abstractmethod
    async def embed(self, text: str) -> list[float]: ...

    @abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[list[float]]: ...


class OpenAICompatibleEmbeddingService(EmbeddingService):
    """Works with OpenAI, vLLM (/v1/embeddings), and Ollama (same endpoint)."""

    def __init__(self) -> None:
        # Uses EMBEDDING_BASE_URL / EMBEDDING_API_KEY when set (e.g. separate Colab tunnel),
        # otherwise falls back to OPENAI_BASE_URL / OPENAI_API_KEY.
        self._client = AsyncOpenAI(
            api_key=settings.resolved_embedding_api_key,
            base_url=settings.resolved_embedding_base_url,
        )
        self._model = settings.embedding_model

    async def embed(self, text: str) -> list[float]:
        response = await self._client.embeddings.create(
            input=text,
            model=self._model,
        )
        return response.data[0].embedding

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        response = await self._client.embeddings.create(
            input=texts,
            model=self._model,
        )
        # API guarantees results are in the same order as input
        return [item.embedding for item in sorted(response.data, key=lambda x: x.index)]


# Module-level singleton — instantiated once at startup
embedding_service = OpenAICompatibleEmbeddingService()
