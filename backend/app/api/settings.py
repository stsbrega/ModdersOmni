import json
import logging
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()

SETTINGS_FILE = Path("user_settings.json")


class AppSettings(BaseModel):
    nexus_api_key: str = ""
    llm_provider: str = "ollama"
    ollama_base_url: str = "http://localhost:11434/v1"
    ollama_model: str = "llama3.1:8b"
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    together_api_key: str = ""
    together_model: str = "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free"
    huggingface_api_key: str = ""
    huggingface_model: str = "meta-llama/Llama-3.1-8B-Instruct"
    custom_source_api_url: str = ""
    custom_source_api_key: str = ""


def _load_settings() -> AppSettings:
    """Load settings from file, falling back to env/defaults."""
    if SETTINGS_FILE.exists():
        try:
            data = json.loads(SETTINGS_FILE.read_text())
            return AppSettings(**data)
        except Exception as e:
            logger.warning(f"Failed to load settings file: {e}")

    # Fall back to environment-based config
    env = get_settings()
    return AppSettings(
        nexus_api_key=env.nexus_api_key,
        llm_provider=env.llm_provider,
        ollama_base_url=env.ollama_base_url,
        ollama_model=env.ollama_model,
        groq_api_key=env.groq_api_key,
        groq_model=env.groq_model,
        together_api_key=env.together_api_key,
        together_model=env.together_model,
        huggingface_api_key=env.huggingface_api_key,
        huggingface_model=env.huggingface_model,
        custom_source_api_url=env.custom_source_api_url,
        custom_source_api_key=env.custom_source_api_key,
    )


def _save_settings(settings: AppSettings) -> None:
    """Persist settings to file."""
    SETTINGS_FILE.write_text(
        json.dumps(settings.model_dump(), indent=2)
    )


@router.get("/", response_model=AppSettings)
async def get_app_settings():
    return _load_settings()


@router.put("/")
async def update_settings(settings: AppSettings):
    _save_settings(settings)

    # Update the runtime config so LLM providers pick up new keys
    config = get_settings()
    config.nexus_api_key = settings.nexus_api_key
    config.llm_provider = settings.llm_provider
    config.ollama_base_url = settings.ollama_base_url
    config.ollama_model = settings.ollama_model
    config.groq_api_key = settings.groq_api_key
    config.groq_model = settings.groq_model
    config.together_api_key = settings.together_api_key
    config.together_model = settings.together_model
    config.huggingface_api_key = settings.huggingface_api_key
    config.huggingface_model = settings.huggingface_model
    config.custom_source_api_url = settings.custom_source_api_url
    config.custom_source_api_key = settings.custom_source_api_key

    return {"status": "ok", "message": "Settings saved"}
