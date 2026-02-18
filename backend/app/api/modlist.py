import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.game import Game
from app.models.mod import Mod
from app.models.modlist import Modlist, ModlistEntry
from app.models.playstyle import Playstyle
from app.models.playstyle_mod import PlaystyleMod
from app.schemas.modlist import ModEntry, ModlistGenerateRequest, ModlistResponse
from app.services.modlist_generator import generate_modlist as run_generation, _is_version_compatible

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/generate", response_model=ModlistResponse)
async def generate_modlist(
    request: ModlistGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    # Validate game and playstyle exist
    game = await db.get(Game, request.game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    playstyle = await db.get(Playstyle, request.playstyle_id)
    if not playstyle:
        raise HTTPException(status_code=404, detail="Playstyle not found")

    try:
        # Run the AI generation pipeline
        generated_mods = await run_generation(db, request)
    except Exception as e:
        logger.error(f"LLM generation failed: {e}")
        # Fallback: return curated mods from the database without LLM
        generated_mods = await _fallback_modlist(
            db, request.playstyle_id, request.vram_mb, request.game_version
        )

    # Save the modlist to the database
    modlist = Modlist(
        game_id=request.game_id,
        playstyle_id=request.playstyle_id,
        gpu_model=request.gpu,
        cpu_model=request.cpu,
        ram_gb=request.ram_gb,
        vram_mb=request.vram_mb,
        llm_provider="fallback" if not generated_mods else None,
    )
    db.add(modlist)
    await db.flush()

    entries = []
    for i, mod_data in enumerate(generated_mods):
        mod_id = mod_data.get("mod_id")
        entry = ModlistEntry(
            modlist_id=modlist.id,
            mod_id=mod_id if mod_id else None,
            load_order=mod_data.get("load_order", i + 1),
            enabled=True,
            download_status="pending",
        )
        db.add(entry)
        entries.append(
            ModEntry(
                mod_id=mod_id,
                name=mod_data.get("name", "Unknown"),
                author=mod_data.get("author"),
                summary=mod_data.get("summary"),
                reason=mod_data.get("reason"),
                load_order=mod_data.get("load_order", i + 1),
                enabled=True,
                download_status="pending",
            )
        )

    await db.commit()

    return ModlistResponse(
        id=modlist.id,
        game_id=request.game_id,
        playstyle_id=request.playstyle_id,
        entries=entries,
        llm_provider=modlist.llm_provider,
    )


# VRAM thresholds that map to the old tier_min values in seed data
# low = any VRAM, mid = 6GB+, high = 10GB+, ultra = 16GB+
_TIER_MIN_VRAM = {"low": 0, "mid": 6144, "high": 10240, "ultra": 16384}


async def _fallback_modlist(
    db: AsyncSession, playstyle_id: int, user_vram_mb: int | None,
    game_version: str | None = None,
) -> list[dict]:
    """Fallback: return curated mods from DB when LLM is unavailable."""
    vram = user_vram_mb or 6144  # default to 6GB if unknown

    result = await db.execute(
        select(Mod, PlaystyleMod)
        .join(PlaystyleMod, Mod.id == PlaystyleMod.mod_id)
        .where(PlaystyleMod.playstyle_id == playstyle_id)
        .order_by(PlaystyleMod.priority.desc())
    )

    mods = []
    for i, (mod, pm) in enumerate(result.all()):
        # Filter by version compatibility
        if not _is_version_compatible(mod.game_version_support, game_version):
            continue
        min_vram = _TIER_MIN_VRAM.get(pm.hardware_tier_min or "low", 0)
        if vram >= min_vram:
            mods.append({
                "mod_id": mod.id,
                "name": mod.name,
                "author": mod.author,
                "summary": mod.summary,
                "reason": f"Curated mod (priority: {pm.priority})",
                "load_order": i + 1,
            })

    return mods


@router.get("/{modlist_id}", response_model=ModlistResponse)
async def get_modlist(modlist_id: str, db: AsyncSession = Depends(get_db)):
    """Get a previously generated modlist by ID."""
    try:
        ml_uuid = uuid.UUID(modlist_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid modlist ID")

    modlist = await db.get(Modlist, ml_uuid)
    if not modlist:
        raise HTTPException(status_code=404, detail="Modlist not found")

    # Load entries with mod details
    result = await db.execute(
        select(ModlistEntry, Mod)
        .outerjoin(Mod, ModlistEntry.mod_id == Mod.id)
        .where(ModlistEntry.modlist_id == ml_uuid)
        .order_by(ModlistEntry.load_order)
    )

    entries = []
    for entry, mod in result.all():
        entries.append(
            ModEntry(
                mod_id=entry.mod_id,
                nexus_mod_id=mod.nexus_mod_id if mod else None,
                name=mod.name if mod else "Unknown",
                author=mod.author if mod else None,
                summary=mod.summary if mod else None,
                load_order=entry.load_order,
                enabled=entry.enabled,
                download_status=entry.download_status,
            )
        )

    return ModlistResponse(
        id=modlist.id,
        game_id=modlist.game_id,
        playstyle_id=modlist.playstyle_id,
        entries=entries,
        llm_provider=modlist.llm_provider,
    )
