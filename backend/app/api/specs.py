from fastapi import APIRouter

from app.schemas.specs import SpecsInput, SpecsParseResponse, TierScores
from app.services.spec_parser import parse_specs
from app.services.tier_classifier import classify_hardware_tier

router = APIRouter()


@router.post("/parse", response_model=SpecsParseResponse)
async def parse_hardware_specs(input: SpecsInput):
    specs, method = await parse_specs(input.raw_text)

    # Classify hardware tier using multi-factor scoring
    tier_info = classify_hardware_tier(
        gpu=specs.gpu,
        vram_mb=specs.vram_mb,
        cpu=specs.cpu,
        ram_gb=specs.ram_gb,
        cpu_cores=specs.cpu_cores,
        cpu_speed_ghz=specs.cpu_speed_ghz,
    )

    return SpecsParseResponse(
        specs=specs,
        raw_text=input.raw_text,
        parse_method=method,
        tier=tier_info["tier"],
        tier_scores=TierScores(
            vram=tier_info["vram_score"],
            cpu=tier_info["cpu_score"],
            ram=tier_info["ram_score"],
            gpu_gen=tier_info["gpu_gen_score"],
            overall=tier_info["overall_score"],
        ),
    )
