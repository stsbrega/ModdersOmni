"""
Central registry of known LLM providers.

To add a new provider, append a dict here. No other code changes needed
as long as the provider uses an OpenAI-compatible API (most do).
"""

PROVIDER_REGISTRY: list[dict] = [
    {
        "id": "anthropic",
        "name": "Anthropic",
        "model": "claude-sonnet-4-20250514",
        "base_url": None,  # Uses native Anthropic API, not OpenAI-compatible
        "type": "anthropic",
        "placeholder": "sk-ant-...",
        "hint_url": "console.anthropic.com",
    },
    {
        "id": "openai",
        "name": "OpenAI",
        "model": "gpt-4o",
        "base_url": "https://api.openai.com/v1",
        "type": "openai_compatible",
        "placeholder": "sk-...",
        "hint_url": "platform.openai.com",
    },
    {
        "id": "gemini",
        "name": "Google Gemini",
        "model": "gemini-2.0-flash",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "type": "openai_compatible",
        "placeholder": "AIza...",
        "hint_url": "aistudio.google.com",
    },
    {
        "id": "groq",
        "name": "Groq",
        "model": "llama-3.3-70b-versatile",
        "base_url": "https://api.groq.com/openai/v1",
        "type": "openai_compatible",
        "placeholder": "gsk_...",
        "hint_url": "console.groq.com",
    },
    {
        "id": "together",
        "name": "Together AI",
        "model": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        "base_url": "https://api.together.xyz/v1",
        "type": "openai_compatible",
        "placeholder": "",
        "hint_url": "api.together.ai",
    },
    {
        "id": "deepseek",
        "name": "DeepSeek",
        "model": "deepseek-chat",
        "base_url": "https://api.deepseek.com/v1",
        "type": "openai_compatible",
        "placeholder": "sk-...",
        "hint_url": "platform.deepseek.com",
    },
    {
        "id": "mistral",
        "name": "Mistral AI",
        "model": "mistral-large-latest",
        "base_url": "https://api.mistral.ai/v1",
        "type": "openai_compatible",
        "placeholder": "",
        "hint_url": "console.mistral.ai",
    },
]


def get_provider(provider_id: str) -> dict | None:
    """Look up a provider by ID. Returns None if not found."""
    for p in PROVIDER_REGISTRY:
        if p["id"] == provider_id:
            return p
    return None


def get_public_registry() -> list[dict]:
    """Return registry entries safe for the frontend (no internal fields)."""
    return [
        {
            "id": p["id"],
            "name": p["name"],
            "model": p["model"],
            "placeholder": p["placeholder"],
            "hint_url": p["hint_url"],
        }
        for p in PROVIDER_REGISTRY
    ]
