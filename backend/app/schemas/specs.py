from pydantic import BaseModel


class SpecsInput(BaseModel):
    raw_text: str


class HardwareSpecs(BaseModel):
    gpu: str | None = None
    vram_mb: int | None = None
    cpu: str | None = None
    ram_gb: int | None = None
    tier: str | None = None  # low, mid, high, ultra


class SpecsParseResponse(BaseModel):
    specs: HardwareSpecs
    raw_text: str
    parse_method: str  # "regex" or "llm"
