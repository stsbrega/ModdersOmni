from pydantic import BaseModel


class SpecsInput(BaseModel):
    raw_text: str


class HardwareSpecs(BaseModel):
    gpu: str | None = None
    vram_mb: int | None = None
    cpu: str | None = None
    ram_gb: int | None = None
    cpu_cores: int | None = None
    cpu_speed_ghz: float | None = None


class TierScores(BaseModel):
    vram: int = 0
    cpu: int = 0
    ram: int = 0
    gpu_gen: int = 0
    overall: int = 0


class SpecsParseResponse(BaseModel):
    specs: HardwareSpecs
    raw_text: str
    parse_method: str  # "regex" or "llm"
    tier: str | None = None  # "low", "mid", "high", "ultra"
    tier_scores: TierScores | None = None
