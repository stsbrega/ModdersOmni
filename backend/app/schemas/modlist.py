from pydantic import BaseModel
import uuid


class ModlistGenerateRequest(BaseModel):
    game_id: int
    playstyle_id: int
    gpu: str | None = None
    vram_mb: int | None = None
    cpu: str | None = None
    ram_gb: int | None = None
    hardware_tier: str | None = None


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


class ModlistResponse(BaseModel):
    id: uuid.UUID
    game_id: int
    playstyle_id: int
    hardware_tier: str | None = None
    entries: list[ModEntry] = []
    llm_provider: str | None = None


class DownloadRequest(BaseModel):
    modlist_id: uuid.UUID
    mod_ids: list[int] | None = None  # None = download all


class DownloadStatus(BaseModel):
    mod_id: int
    name: str
    status: str  # pending, downloading, complete, failed
    progress: float = 0.0  # 0-100
    error: str | None = None
