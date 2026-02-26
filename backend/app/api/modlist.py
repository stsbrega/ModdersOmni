import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.game import Game
from app.models.mod import Mod
from app.models.modlist import Modlist, ModlistEntry, ModlistKnowledgeFlag
from app.models.playstyle import Playstyle
from app.models.playstyle_mod import PlaystyleMod
from app.models.user import User
from app.schemas.modlist import (
    ModEntry, ModlistGenerateRequest, ModlistResponse, UserKnowledgeFlag,
)
from app.services.modlist_generator import (
    generate_modlist as run_generation, GenerationResult, _is_version_compatible,
)
from app.api.deps import get_current_user, get_current_user_optional

logger = logging.getLogger(__name__)

router = APIRouter()


def _entry_to_schema(entry: ModlistEntry) -> ModEntry:
    """Convert a DB ModlistEntry to the API schema, using denormalized fields."""
    return ModEntry(
        mod_id=entry.mod_id,
        nexus_mod_id=entry.nexus_mod_id,
        name=entry.name or "Unknown",
        author=entry.author,
        summary=entry.summary,
        reason=entry.reason,
        load_order=entry.load_order,
        enabled=entry.enabled,
        download_status=entry.download_status,
        is_patch=entry.is_patch,
        patches_mods=entry.patches_mods,
        compatibility_notes=entry.compatibility_notes,
    )


def _flag_to_schema(flag: ModlistKnowledgeFlag) -> UserKnowledgeFlag:
    return UserKnowledgeFlag(
        mod_a=flag.mod_a_name,
        mod_b=flag.mod_b_name,
        issue=flag.issue,
        severity=flag.severity,
    )


@router.post("/generate", response_model=ModlistResponse)
async def generate_modlist(
    request: ModlistGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    # Validate game and playstyle exist
    game = await db.get(Game, request.game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    playstyle = await db.get(Playstyle, request.playstyle_id)
    if not playstyle:
        raise HTTPException(status_code=404, detail="Playstyle not found")

    result: GenerationResult | None = None
    try:
        result = await run_generation(db, request)
    except Exception as e:
        logger.error(f"LLM generation failed: {e}")

    # Determine if we're using fallback
    use_fallback = result is None or not result.entries
    if use_fallback:
        fallback_mods = await _fallback_modlist(
            db, request.playstyle_id, request.vram_mb, request.game_version
        )

    # Save the modlist
    modlist = Modlist(
        game_id=request.game_id,
        playstyle_id=request.playstyle_id,
        gpu_model=request.gpu,
        cpu_model=request.cpu,
        ram_gb=request.ram_gb,
        vram_mb=request.vram_mb,
        llm_provider=(result.llm_provider if result else "fallback") if not use_fallback else "fallback",
        user_id=current_user.id if current_user else None,
    )
    db.add(modlist)
    await db.flush()

    entries_schema = []

    if use_fallback:
        # Fallback path — uses curated DB mods
        for i, mod_data in enumerate(fallback_mods):
            entry = ModlistEntry(
                modlist_id=modlist.id,
                mod_id=mod_data.get("mod_id"),
                name=mod_data.get("name", "Unknown"),
                author=mod_data.get("author"),
                summary=mod_data.get("summary"),
                reason=mod_data.get("reason"),
                load_order=mod_data.get("load_order", i + 1),
                enabled=True,
                download_status="pending",
            )
            db.add(entry)
            entries_schema.append(_entry_to_schema(entry))
    else:
        # Agentic pipeline path — uses Nexus-discovered mods
        for i, mod_data in enumerate(result.entries):
            entry = ModlistEntry(
                modlist_id=modlist.id,
                nexus_mod_id=mod_data.get("nexus_mod_id"),
                name=mod_data.get("name", "Unknown"),
                author=mod_data.get("author"),
                summary=mod_data.get("summary"),
                reason=mod_data.get("reason"),
                load_order=mod_data.get("load_order", i + 1),
                enabled=True,
                download_status="pending",
                is_patch=mod_data.get("is_patch", False),
                patches_mods=mod_data.get("patches_mods"),
            )
            db.add(entry)
            entries_schema.append(_entry_to_schema(entry))

        # Save knowledge flags
        for flag_data in result.knowledge_flags:
            flag = ModlistKnowledgeFlag(
                modlist_id=modlist.id,
                mod_a_name=flag_data["mod_a"],
                mod_b_name=flag_data["mod_b"],
                issue=flag_data["issue"],
                severity=flag_data.get("severity", "warning"),
            )
            db.add(flag)

    await db.commit()

    # Build knowledge flags for response
    knowledge_flags_schema = []
    if result and result.knowledge_flags:
        knowledge_flags_schema = [
            UserKnowledgeFlag(
                mod_a=f["mod_a"], mod_b=f["mod_b"],
                issue=f["issue"], severity=f.get("severity", "warning"),
            )
            for f in result.knowledge_flags
        ]

    return ModlistResponse(
        id=modlist.id,
        game_id=request.game_id,
        playstyle_id=request.playstyle_id,
        entries=entries_schema,
        llm_provider=modlist.llm_provider,
        user_knowledge_flags=knowledge_flags_schema,
    )


# VRAM thresholds that map to the old tier_min values in seed data
_TIER_MIN_VRAM = {"low": 0, "mid": 6144, "high": 10240, "ultra": 16384}


async def _fallback_modlist(
    db: AsyncSession, playstyle_id: int, user_vram_mb: int | None,
    game_version: str | None = None,
) -> list[dict]:
    """Fallback: return curated mods from DB when LLM is unavailable."""
    vram = user_vram_mb or 6144

    result = await db.execute(
        select(Mod, PlaystyleMod)
        .join(PlaystyleMod, Mod.id == PlaystyleMod.mod_id)
        .where(PlaystyleMod.playstyle_id == playstyle_id)
        .order_by(PlaystyleMod.priority.desc())
    )

    mods = []
    for i, (mod, pm) in enumerate(result.all()):
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

    # Load entries — use denormalized fields directly
    entry_result = await db.execute(
        select(ModlistEntry)
        .where(ModlistEntry.modlist_id == ml_uuid)
        .order_by(ModlistEntry.load_order)
    )
    entries = [_entry_to_schema(e) for e in entry_result.scalars().all()]

    # Load knowledge flags
    flag_result = await db.execute(
        select(ModlistKnowledgeFlag)
        .where(ModlistKnowledgeFlag.modlist_id == ml_uuid)
    )
    flags = [_flag_to_schema(f) for f in flag_result.scalars().all()]

    return ModlistResponse(
        id=modlist.id,
        game_id=modlist.game_id,
        playstyle_id=modlist.playstyle_id,
        entries=entries,
        llm_provider=modlist.llm_provider,
        user_knowledge_flags=flags,
    )


@router.get("/mine", response_model=list[ModlistResponse])
async def get_my_modlists(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all modlists for the current user."""
    result = await db.execute(
        select(Modlist)
        .where(Modlist.user_id == current_user.id)
        .order_by(Modlist.created_at.desc())
    )
    modlists = result.scalars().all()

    responses = []
    for ml in modlists:
        entry_result = await db.execute(
            select(ModlistEntry)
            .where(ModlistEntry.modlist_id == ml.id)
            .order_by(ModlistEntry.load_order)
        )
        entries = [_entry_to_schema(e) for e in entry_result.scalars().all()]

        flag_result = await db.execute(
            select(ModlistKnowledgeFlag)
            .where(ModlistKnowledgeFlag.modlist_id == ml.id)
        )
        flags = [_flag_to_schema(f) for f in flag_result.scalars().all()]

        responses.append(
            ModlistResponse(
                id=ml.id,
                game_id=ml.game_id,
                playstyle_id=ml.playstyle_id,
                entries=entries,
                llm_provider=ml.llm_provider,
                user_knowledge_flags=flags,
            )
        )

    return responses
