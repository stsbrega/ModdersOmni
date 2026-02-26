from pydantic import BaseModel
import uuid


class LLMCredential(BaseModel):
    provider: str  # anthropic, openai, gemini, groq, together
    api_key: str


class ModlistGenerateRequest(BaseModel):
    game_id: int
    playstyle_id: int
    game_version: str | None = None  # e.g. "SE", "AE", "Standard", "Next-Gen"
    gpu: str | None = None
    vram_mb: int | None = None
    cpu: str | None = None
    ram_gb: int | None = None
    cpu_cores: int | None = None
    cpu_speed_ghz: float | None = None
    available_storage_gb: int | None = None
    # User-supplied LLM credentials — tried in order, falls back on failure
    llm_credentials: list[LLMCredential] = []


class ModEntry(BaseModel):
    mod_id: int | None = None
    nexus_mod_id: int | None = None
    name: str
    author: str | None = None
    summary: str | None = None
    reason: str | None = None
    load_order: int | None = None
    enabled: bool = True
    download_status: str = "pending"
    is_patch: bool = False
    patches_mods: list[str] | None = None
    compatibility_notes: str | None = None


class UserKnowledgeFlag(BaseModel):
    mod_a: str
    mod_b: str
    issue: str
    severity: str  # "warning" or "critical"


class ModlistResponse(BaseModel):
    id: uuid.UUID
    game_id: int
    playstyle_id: int
    entries: list[ModEntry] = []
    llm_provider: str | None = None
    user_knowledge_flags: list[UserKnowledgeFlag] = []
    used_fallback: bool = False
    generation_error: str | None = None


class DownloadRequest(BaseModel):
    modlist_id: uuid.UUID
    mod_ids: list[int] | None = None  # None = download all


class DownloadStatus(BaseModel):
    mod_id: int
    name: str
    status: str  # pending, downloading, complete, failed
    progress: float = 0.0  # 0-100
    error: str | None = None
