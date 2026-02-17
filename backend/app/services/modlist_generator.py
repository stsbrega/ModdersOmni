from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.provider import LLMProviderFactory
from app.models.mod import Mod
from app.models.playstyle import Playstyle
from app.models.playstyle_mod import PlaystyleMod
from app.models.compatibility import CompatibilityRule
from app.models.game import Game
from app.schemas.modlist import ModlistGenerateRequest


SYSTEM_PROMPT_TEMPLATE = """You are an expert video game mod curator for {game_name}.
The user has a {tier} tier PC ({gpu}, {cpu}, {ram_gb}GB RAM, {vram_mb}MB VRAM).
They want a {playstyle} experience.

Given the following available mods and their compatibility data:
{rag_context}

Generate a stable, compatible modlist. For each mod, explain why it's included.
Ensure total estimated VRAM usage stays under {vram_budget}MB.
Flag any potential conflicts and suggest the correct load order.

Output ONLY valid JSON array: [{{"mod_id": int, "name": string, "reason": string, "load_order": int}}]"""


async def build_rag_context(
    db: AsyncSession, playstyle_id: int, hardware_tier: str
) -> str:
    """Build context string from database for LLM."""
    # Get candidate mods for this playstyle
    result = await db.execute(
        select(Mod, PlaystyleMod)
        .join(PlaystyleMod, Mod.id == PlaystyleMod.mod_id)
        .where(PlaystyleMod.playstyle_id == playstyle_id)
    )
    rows = result.all()

    tier_rank = {"low": 1, "mid": 2, "high": 3, "ultra": 4}
    user_rank = tier_rank.get(hardware_tier, 2)

    context_lines = []
    for mod, pm in rows:
        min_rank = tier_rank.get(pm.hardware_tier_min or "low", 1)
        if user_rank >= min_rank:
            impact = mod.performance_impact or "unknown"
            vram = f"{mod.vram_requirement_mb}MB VRAM" if mod.vram_requirement_mb else "N/A"
            context_lines.append(
                f"- ID:{mod.id} | {mod.name} by {mod.author} | "
                f"Impact: {impact} | VRAM: {vram} | "
                f"Priority: {pm.priority} | {mod.summary or ''}"
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

    hardware_tier = request.hardware_tier or "mid"

    # Build RAG context
    rag_context = await build_rag_context(db, request.playstyle_id, hardware_tier)

    # VRAM budget based on tier
    vram_budgets = {"low": 3000, "mid": 6000, "high": 10000, "ultra": 16000}
    vram_budget = vram_budgets.get(hardware_tier, 6000)

    # Build prompt
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        game_name=game.name,
        tier=hardware_tier,
        gpu=request.gpu or "Unknown",
        cpu=request.cpu or "Unknown",
        ram_gb=request.ram_gb or "Unknown",
        vram_mb=request.vram_mb or "Unknown",
        playstyle=playstyle.name,
        rag_context=rag_context,
        vram_budget=vram_budget,
    )

    user_prompt = f"Generate a {playstyle.name} modlist for {game.name}."

    # Call LLM
    llm = LLMProviderFactory.create()
    response = await llm.generate(system_prompt, user_prompt)

    # TODO: Parse JSON response and validate against DB
    # For now return raw response
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
