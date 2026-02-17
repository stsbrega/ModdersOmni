from abc import ABC, abstractmethod
from openai import AsyncOpenAI
from app.config import get_settings


class LLMProvider(ABC):
    """Abstract base for LLM providers."""

    @abstractmethod
    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        pass

    @abstractmethod
    def get_model_name(self) -> str:
        pass


class OpenAICompatibleProvider(LLMProvider):
    """Provider for any OpenAI-compatible API (Ollama, Groq, Together, HuggingFace)."""

    def __init__(self, base_url: str, api_key: str, model: str):
        self.client = AsyncOpenAI(base_url=base_url, api_key=api_key)
        self.model = model

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
        )
        return response.choices[0].message.content or ""

    def get_model_name(self) -> str:
        return self.model


class LLMProviderFactory:
    """Factory to create LLM providers based on configuration."""

    @staticmethod
    def create(provider_name: str | None = None) -> LLMProvider:
        settings = get_settings()
        name = provider_name or settings.llm_provider

        if name == "ollama":
            return OpenAICompatibleProvider(
                base_url=settings.ollama_base_url,
                api_key="ollama",  # Ollama doesn't require a real key
                model=settings.ollama_model,
            )
        elif name == "groq":
            return OpenAICompatibleProvider(
                base_url="https://api.groq.com/openai/v1",
                api_key=settings.groq_api_key,
                model=settings.groq_model,
            )
        elif name == "together":
            return OpenAICompatibleProvider(
                base_url="https://api.together.xyz/v1",
                api_key=settings.together_api_key,
                model=settings.together_model,
            )
        elif name == "huggingface":
            return OpenAICompatibleProvider(
                base_url="https://router.huggingface.co/v1",
                api_key=settings.huggingface_api_key,
                model=settings.huggingface_model,
            )
        else:
            raise ValueError(f"Unknown LLM provider: {name}")
