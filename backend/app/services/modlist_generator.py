from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.provider import LLMProviderFactory
from app.models.mod import Mod
from app.models.playstyle import Playstyle
from app.models.playstyle_mod import PlaystyleMod
from app.models.compatibility import CompatibilityRule
from app.models.game import Game
from app.schemas.modlist import ModlistGenerateRequest
from app.services.tier_classifier import classify_hardware_tier


# Version compatibility mapping: which game_version_support values
# are compatible with which user-selected game version
_VERSION_COMPAT = {
    # Skyrim
    "SE": {"all", "se_only"},
    "AE": {"all", "ae_required", "ae_recommended"},
    # Fallout 4
    "Standard": {"all", "pre_nextgen"},
    "Next-Gen": {"all", "nextgen_only", "nextgen_recommended"},
}


SYSTEM_PROMPT_TEMPLATE = """You are an expert video game mod curator for {game_name} ({game_version} edition).
The user has a PC with: {gpu}, {cpu}, {ram_gb}GB RAM, {vram_mb}MB VRAM.
Hardware tier: {tier} (score: {tier_score}/100 — VRAM:{vram_score}, GPU Gen:{gpu_gen_score}, CPU:{cpu_score}, RAM:{ram_score}).
They want a {playstyle} experience.

IMPORTANT version notes:
{version_notes}

Given the following available mods and their compatibility data:
{rag_context}

Generate a stable, compatible modlist. For each mod, explain why it's included.
Ensure total estimated VRAM usage stays under {vram_budget}MB.
Prefer mods that match the user's hardware tier — don't recommend extreme-performance mods for low-tier hardware.
Flag any potential conflicts and suggest the correct load order.

Output ONLY valid JSON array: [{{"mod_id": int, "name": string, "reason": string, "load_order": int}}]"""


_VERSION_NOTES = {
    "SE": "User is on Skyrim SE (not Anniversary Edition). Do NOT include AE-only mods or Creation Club content mods.",
    "AE": "User is on Skyrim AE (Anniversary Edition) with all Creation Club content. Include AE-specific fixes and enhancements where relevant.",
    "Standard": "User is on classic Fallout 4 (pre-Next-Gen Update). Use classic F4SE and Buffout 4 (not NG versions). Some newer mods may not be compatible.",
    "Next-Gen": "User is on Fallout 4 Next-Gen Update. Use Next-Gen compatible F4SE and Buffout 4 NG. Some older mods may need NG-compatible versions.",
}

# VRAM thresholds that map to the old tier_min values in seed data
_TIER_MIN_VRAM = {"low": 0, "mid": 6144, "high": 10240, "ultra": 16384}


def _is_version_compatible(mod_version_support: str, user_version: str | None) -> bool:
    """Check if a mod's version support is compatible with the user's game version."""
    if not user_version:
        return True  # No version selected = include everything
    if mod_version_support == "all":
        return True
    compat_set = _VERSION_COMPAT.get(user_version, set())
    return mod_version_support in compat_set


async def build_rag_context(
    db: AsyncSession, playstyle_id: int, user_vram_mb: int,
    game_version: str | None = None,
) -> str:
    """Build context string from database for LLM."""
    # Get candidate mods for this playstyle
    result = await db.execute(
        select(Mod, PlaystyleMod)
        .join(PlaystyleMod, Mod.id == PlaystyleMod.mod_id)
        .where(PlaystyleMod.playstyle_id == playstyle_id)
    )
    rows = result.all()

    context_lines = []
    for mod, pm in rows:
        # Filter by version compatibility
        if not _is_version_compatible(mod.game_version_support, game_version):
            continue

        min_vram = _TIER_MIN_VRAM.get(pm.hardware_tier_min or "low", 0)
        if user_vram_mb >= min_vram:
            impact = mod.performance_impact or "unknown"
            vram = f"{mod.vram_requirement_mb}MB VRAM" if mod.vram_requirement_mb else "N/A"
            ver = f" | Version: {mod.game_version_support}" if mod.game_version_support != "all" else ""
            context_lines.append(
                f"- ID:{mod.id} | {mod.name} by {mod.author} | "
                f"Impact: {impact} | VRAM: {vram} | "
                f"Priority: {pm.priority}{ver} | {mod.summary or ''}"
            )

    # Get compatibility rules for these mods
    mod_ids = [mod.id for mod, _ in rows]
    if mod_ids:
        compat_result = await db.execute(
            select(CompatibilityRule).where(
                CompatibilityRule.mod_id.in_(mod_ids)
            )
        )
        rules = compat_result.scalars().all()
        if rules:
            context_lines.append("\nCompatibility Rules:")
            for rule in rules:
                context_lines.append(
                    f"- Mod {rule.mod_id} {rule.rule_type} Mod {rule.related_mod_id}"
                    + (f" | Note: {rule.notes}" if rule.notes else "")
                )

    return "\n".join(context_lines) if context_lines else "No mod data available yet."


async def generate_modlist(
    db: AsyncSession, request: ModlistGenerateRequest
) -> list[dict]:
    """Generate a modlist using LLM + RAG pipeline."""
    # Get game and playstyle info
    game = await db.get(Game, request.game_id)
    playstyle = await db.get(Playstyle, request.playstyle_id)

    if not game or not playstyle:
        raise ValueError("Invalid game or playstyle ID")

    user_vram = request.vram_mb or 6144  # default to 6GB if unknown
    game_version = request.game_version

    # Classify hardware tier
    tier_info = classify_hardware_tier(
        gpu=request.gpu,
        vram_mb=request.vram_mb,
        cpu=request.cpu,
        ram_gb=request.ram_gb,
        cpu_cores=request.cpu_cores,
        cpu_speed_ghz=request.cpu_speed_ghz,
    )

    # Build RAG context with version filtering
    rag_context = await build_rag_context(
        db, request.playstyle_id, user_vram, game_version
    )

    # VRAM budget: scale based on tier (not flat 80%)
    tier_vram_pct = {"low": 0.60, "mid": 0.70, "high": 0.80, "ultra": 0.85}
    vram_budget = int(user_vram * tier_vram_pct.get(tier_info["tier"], 0.75))

    # Version notes
    version_notes = _VERSION_NOTES.get(
        game_version or "", "No specific version selected."
    )

    # Build prompt
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        game_name=game.name,
        game_version=game_version or "Unknown",
        gpu=request.gpu or "Unknown",
        cpu=request.cpu or "Unknown",
        ram_gb=request.ram_gb or "Unknown",
        vram_mb=request.vram_mb or "Unknown",
        tier=tier_info["tier"].upper(),
        tier_score=tier_info["overall_score"],
        vram_score=tier_info["vram_score"],
        gpu_gen_score=tier_info["gpu_gen_score"],
        cpu_score=tier_info["cpu_score"],
        ram_score=tier_info["ram_score"],
        playstyle=playstyle.name,
        version_notes=version_notes,
        rag_context=rag_context,
        vram_budget=vram_budget,
    )

    user_prompt = f"Generate a {playstyle.name} modlist for {game.name} ({game_version or 'any version'})."

    # Call LLM
    llm = LLMProviderFactory.create()
    response = await llm.generate(system_prompt, user_prompt)

    # Parse JSON response
    import json
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        # Try to extract JSON from response
        start = response.find("[")
        end = response.rfind("]") + 1
        if start >= 0 and end > start:
            return json.loads(response[start:end])
        return []
