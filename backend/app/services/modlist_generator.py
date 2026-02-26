import json
import logging
import re
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.provider import LLMProviderFactory
from app.models.mod import Mod
from app.models.playstyle import Playstyle
from app.models.playstyle_mod import PlaystyleMod
from app.models.compatibility import CompatibilityRule
from app.models.game import Game
from app.schemas.modlist import ModlistGenerateRequest
from app.services.nexus_client import NexusModsClient
from app.services.tier_classifier import classify_hardware_tier

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Version compatibility (kept for DB fallback)
# ──────────────────────────────────────────────

_VERSION_COMPAT = {
    "SE": {"all", "se_only"},
    "AE": {"all", "ae_required", "ae_recommended"},
    "Standard": {"all", "pre_nextgen"},
    "Next-Gen": {"all", "nextgen_only", "nextgen_recommended"},
}

_VERSION_NOTES = {
    "SE": "User is on Skyrim SE (not Anniversary Edition). Do NOT include AE-only mods or Creation Club content mods.",
    "AE": "User is on Skyrim AE (Anniversary Edition) with all Creation Club content. Include AE-specific fixes and enhancements where relevant.",
    "Standard": "User is on classic Fallout 4 (pre-Next-Gen Update). Use classic F4SE and Buffout 4 (not NG versions). Some newer mods may not be compatible.",
    "Next-Gen": "User is on Fallout 4 Next-Gen Update. Use Next-Gen compatible F4SE and Buffout 4 NG. Some older mods may need NG-compatible versions.",
}

_TIER_MIN_VRAM = {"low": 0, "mid": 6144, "high": 10240, "ultra": 16384}


def _is_version_compatible(mod_version_support: str, user_version: str | None) -> bool:
    if not user_version:
        return True
    if mod_version_support == "all":
        return True
    return mod_version_support in _VERSION_COMPAT.get(user_version, set())


# ──────────────────────────────────────────────
# Tool definitions for the LLM
# ──────────────────────────────────────────────

PHASE1_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_nexus",
            "description": (
                "Search Nexus Mods for mods matching a query. "
                "Use varied, specific search terms for different mod categories. "
                "Try different sort orders to discover hidden gems beyond the most popular."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search term (e.g. 'texture overhaul', 'combat', 'UI')"},
                    "sort_by": {
                        "type": "string",
                        "enum": ["endorsements", "updated"],
                        "description": "Sort order. Use 'updated' to find newer mods.",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_mod_details",
            "description": "Get full details and description for a specific mod. Use this to read about a mod before deciding to include it.",
            "parameters": {
                "type": "object",
                "properties": {
                    "mod_id": {"type": "integer", "description": "Nexus mod ID"},
                },
                "required": ["mod_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_to_modlist",
            "description": "Add a mod to the modlist. Only add mods you've reviewed and believe fit the user's playstyle and hardware.",
            "parameters": {
                "type": "object",
                "properties": {
                    "mod_id": {"type": "integer", "description": "Nexus mod ID"},
                    "name": {"type": "string"},
                    "author": {"type": "string"},
                    "summary": {"type": "string", "description": "Short summary of the mod"},
                    "reason": {"type": "string", "description": "Why this mod fits the user's playstyle"},
                    "load_order": {"type": "integer", "description": "Position in load order"},
                    "estimated_size_mb": {"type": "integer", "description": "Estimated download size in MB"},
                },
                "required": ["mod_id", "name", "reason", "load_order"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "finalize",
            "description": "Call when you are done building the modlist. Do not call this until you have added all desired mods.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]

PHASE2_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_mod_description",
            "description": (
                "Get the full description of a mod page. "
                "Check this FIRST for patch links and compatibility notes before searching."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "mod_id": {"type": "integer", "description": "Nexus mod ID"},
                },
                "required": ["mod_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_patches",
            "description": "Search Nexus for compatibility patches between mods.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search term (e.g. 'SkyUI USSEP patch')"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_patch",
            "description": "Add a compatibility patch mod to the modlist.",
            "parameters": {
                "type": "object",
                "properties": {
                    "mod_id": {"type": "integer", "description": "Nexus mod ID of the patch"},
                    "name": {"type": "string"},
                    "author": {"type": "string"},
                    "patches_mods": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Names of the mods this patches",
                    },
                    "reason": {"type": "string"},
                    "load_order": {"type": "integer"},
                },
                "required": ["mod_id", "name", "patches_mods", "reason", "load_order"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "flag_user_knowledge",
            "description": (
                "Flag a compatibility issue where no patch exists yet. "
                "This helps the user know where future AI-generated patches may be needed."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "mod_a": {"type": "string", "description": "First mod name"},
                    "mod_b": {"type": "string", "description": "Second mod name"},
                    "issue": {"type": "string", "description": "Description of the compatibility issue"},
                    "severity": {
                        "type": "string",
                        "enum": ["warning", "critical"],
                    },
                },
                "required": ["mod_a", "mod_b", "issue", "severity"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "finalize_review",
            "description": "Call when you are done reviewing all mods for patches.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]


# ──────────────────────────────────────────────
# Session state for tool handlers
# ──────────────────────────────────────────────

@dataclass
class GenerationSession:
    """Mutable state shared across tool handler calls within one generation."""
    game_domain: str
    nexus: NexusModsClient
    modlist: list[dict] = field(default_factory=list)
    patches: list[dict] = field(default_factory=list)
    knowledge_flags: list[dict] = field(default_factory=list)
    # Cache mod details to avoid re-fetching in Phase 2
    description_cache: dict[int, str] = field(default_factory=dict)
    finalized: bool = False


def _strip_html(html: str) -> str:
    """Strip HTML tags, keeping text content. Good enough for LLM consumption."""
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    # Truncate very long descriptions to keep context manageable
    if len(text) > 3000:
        text = text[:3000] + "... [truncated]"
    return text


def _build_phase1_handlers(session: GenerationSession) -> dict:
    """Build tool handler functions for Phase 1 (Discovery)."""

    async def search_nexus(query: str, sort_by: str = "endorsements") -> str:
        results = await session.nexus.search_mods(
            session.game_domain, query, sort_by=sort_by
        )
        # Return a compact summary for the LLM
        mods = []
        for m in results[:15]:  # Limit to 15 results per search
            mods.append({
                "mod_id": m["modId"],
                "name": m["name"],
                "author": m.get("author", "Unknown"),
                "summary": (m.get("summary") or "")[:200],
                "endorsements": m.get("endorsementCount", 0),
                "category": m.get("modCategory", {}).get("name", ""),
                "updated": m.get("updatedAt", ""),
            })
        return json.dumps({"results": mods, "count": len(mods)})

    async def get_mod_details(mod_id: int) -> str:
        details = await session.nexus.get_mod_details(session.game_domain, mod_id)
        if not details:
            return json.dumps({"error": f"Mod {mod_id} not found"})
        desc_html = details.get("description") or ""
        desc_text = _strip_html(desc_html)
        # Cache for Phase 2
        session.description_cache[mod_id] = desc_text
        return json.dumps({
            "mod_id": details["modId"],
            "name": details["name"],
            "author": details.get("author", "Unknown"),
            "summary": details.get("summary", ""),
            "description": desc_text,
            "endorsements": details.get("endorsementCount", 0),
            "category": details.get("modCategory", {}).get("name", ""),
        })

    async def add_to_modlist(
        mod_id: int, name: str, reason: str, load_order: int,
        author: str = "", summary: str = "", estimated_size_mb: int = 0,
    ) -> str:
        entry = {
            "nexus_mod_id": mod_id,
            "name": name,
            "author": author,
            "summary": summary,
            "reason": reason,
            "load_order": load_order,
            "estimated_size_mb": estimated_size_mb,
            "is_patch": False,
        }
        session.modlist.append(entry)
        return json.dumps({
            "status": "added",
            "name": name,
            "current_count": len(session.modlist),
        })

    async def finalize() -> str:
        session.finalized = True
        return json.dumps({
            "status": "finalized",
            "total_mods": len(session.modlist),
        })

    return {
        "search_nexus": search_nexus,
        "get_mod_details": get_mod_details,
        "add_to_modlist": add_to_modlist,
        "finalize": finalize,
    }


def _build_phase2_handlers(session: GenerationSession) -> dict:
    """Build tool handler functions for Phase 2 (Patch Review)."""

    async def get_mod_description(mod_id: int) -> str:
        # Check cache first
        if mod_id in session.description_cache:
            return json.dumps({"mod_id": mod_id, "description": session.description_cache[mod_id]})
        # Fetch from Nexus
        details = await session.nexus.get_mod_details(session.game_domain, mod_id)
        if not details:
            return json.dumps({"error": f"Mod {mod_id} not found"})
        desc_text = _strip_html(details.get("description") or "")
        session.description_cache[mod_id] = desc_text
        return json.dumps({"mod_id": mod_id, "description": desc_text})

    async def search_patches(query: str) -> str:
        results = await session.nexus.search_mods(
            session.game_domain, query, sort_by="endorsements"
        )
        patches = []
        for m in results[:10]:
            patches.append({
                "mod_id": m["modId"],
                "name": m["name"],
                "author": m.get("author", "Unknown"),
                "summary": (m.get("summary") or "")[:200],
                "endorsements": m.get("endorsementCount", 0),
            })
        return json.dumps({"results": patches, "count": len(patches)})

    async def add_patch(
        mod_id: int, name: str, patches_mods: list[str], reason: str,
        load_order: int, author: str = "",
    ) -> str:
        entry = {
            "nexus_mod_id": mod_id,
            "name": name,
            "author": author,
            "reason": reason,
            "load_order": load_order,
            "is_patch": True,
            "patches_mods": patches_mods,
        }
        session.patches.append(entry)
        return json.dumps({"status": "patch_added", "name": name})

    async def flag_user_knowledge(
        mod_a: str, mod_b: str, issue: str, severity: str = "warning",
    ) -> str:
        flag = {
            "mod_a": mod_a,
            "mod_b": mod_b,
            "issue": issue,
            "severity": severity,
        }
        session.knowledge_flags.append(flag)
        return json.dumps({"status": "flagged", "mod_a": mod_a, "mod_b": mod_b})

    async def finalize_review() -> str:
        session.finalized = True
        return json.dumps({
            "status": "review_complete",
            "patches_added": len(session.patches),
            "flags_raised": len(session.knowledge_flags),
        })

    return {
        "get_mod_description": get_mod_description,
        "search_patches": search_patches,
        "add_patch": add_patch,
        "flag_user_knowledge": flag_user_knowledge,
        "finalize_review": finalize_review,
    }


# ──────────────────────────────────────────────
# System prompts
# ──────────────────────────────────────────────

DISCOVERY_SYSTEM_PROMPT = """You are an expert video game mod curator for {game_name} ({game_version} edition).

USER HARDWARE:
- GPU: {gpu} ({vram_mb}MB VRAM)
- CPU: {cpu}
- RAM: {ram_gb}GB
- Available disk space: {available_storage_gb}GB (budget: {storage_budget_gb}GB)
- VRAM budget: {vram_budget}MB

PLAYSTYLE: {playstyle}

{version_notes}

YOUR TASK: Build a high-quality modlist by searching Nexus Mods. Follow these rules:

1. Search for mods using varied, specific terms — don't use one generic search.
   Good: "texture overhaul", "combat mechanics", "weather effects", "UI improvements"
   Bad: "best mods", "popular mods"

2. DON'T just pick the most popular mods. Use both "endorsements" and "updated" sort orders.
   Newer mods with fewer endorsements can be excellent — evaluate them on merit.

3. Use get_mod_details to read about a mod BEFORE adding it. Check for:
   - Compatibility with the user's game version
   - Performance impact relative to the user's hardware
   - Whether it actually fits the requested playstyle

4. Stay within the storage budget ({storage_budget_gb}GB) and VRAM budget ({vram_budget}MB).
   Estimate sizes: texture packs 1-4GB, gameplay mods <100MB, overhauls 500MB-2GB.

5. Set load_order correctly — essential framework mods first (SKSE, USSEP, etc.), then overhauls, then patches/tweaks last.

6. Call finalize() when you're satisfied with the list. Aim for 15-30 mods depending on the playstyle."""

PATCH_REVIEW_SYSTEM_PROMPT = """You are reviewing a modlist for {game_name} ({game_version} edition) for compatibility issues.

THE MODLIST:
{modlist_summary}

YOUR TASK: Check each mod for compatibility patches needed with other mods in this list.

PROCESS (follow this order for each potential conflict):
1. FIRST: Use get_mod_description to check if the mod page mentions patches or compatibility.
   Mod authors often list required patches or link to them directly.
2. SECOND: If the description doesn't mention a patch, use search_patches to search Nexus.
   Search with terms like "ModA ModB patch" or "ModA compatibility".
3. If you find a patch mod, use add_patch to add it with the correct load_order (patches load AFTER the mods they patch).
4. If a patch is NEEDED but doesn't exist, use flag_user_knowledge to alert the user.
   This is important for future AI patch generation.

IMPORTANT:
- Not every mod pair needs a patch. Only flag genuine conflicts.
- Common framework mods (SKSE, Address Library, etc.) don't need patches with each other.
- Focus on mods that edit the same game systems (e.g., two combat mods, or a texture mod + ENB).
- Call finalize_review when done."""


# ──────────────────────────────────────────────
# Main generation pipeline
# ──────────────────────────────────────────────

@dataclass
class GenerationResult:
    """Complete output of the agentic modlist generation."""
    entries: list[dict]
    knowledge_flags: list[dict]
    llm_provider: str


async def generate_modlist(
    db: AsyncSession, request: ModlistGenerateRequest
) -> GenerationResult:
    """Generate a modlist using the two-phase agentic pipeline.

    Phase 1: Discovery — LLM searches Nexus Mods and builds initial modlist.
    Phase 2: Patch Review — LLM reviews mods for compatibility patches.
    """
    game = await db.get(Game, request.game_id)
    playstyle = await db.get(Playstyle, request.playstyle_id)
    if not game or not playstyle:
        raise ValueError("Invalid game or playstyle ID")

    user_vram = request.vram_mb or 6144
    game_version = request.game_version

    # Classify hardware tier for VRAM budget
    tier_info = classify_hardware_tier(
        gpu=request.gpu, vram_mb=request.vram_mb,
        cpu=request.cpu, ram_gb=request.ram_gb,
        cpu_cores=request.cpu_cores, cpu_speed_ghz=request.cpu_speed_ghz,
    )

    tier_vram_pct = {"low": 0.60, "mid": 0.70, "high": 0.80, "ultra": 0.85}
    vram_budget = int(user_vram * tier_vram_pct.get(tier_info["tier"], 0.75))

    available_storage = request.available_storage_gb or 50
    storage_budget_gb = max(10, int(available_storage * 0.80))

    version_notes = _VERSION_NOTES.get(game_version or "", "No specific version selected.")

    # Create session shared by both phases
    nexus = NexusModsClient()
    session = GenerationSession(game_domain=game.nexus_domain, nexus=nexus)

    llm = LLMProviderFactory.create()

    # ── Phase 1: Discovery ──

    discovery_prompt = DISCOVERY_SYSTEM_PROMPT.format(
        game_name=game.name,
        game_version=game_version or "Unknown",
        gpu=request.gpu or "Unknown",
        cpu=request.cpu or "Unknown",
        ram_gb=request.ram_gb or "Unknown",
        vram_mb=user_vram,
        available_storage_gb=available_storage,
        storage_budget_gb=storage_budget_gb,
        vram_budget=vram_budget,
        playstyle=playstyle.name,
        version_notes=version_notes,
    )

    messages = [
        {"role": "system", "content": discovery_prompt},
        {"role": "user", "content": f"Build a {playstyle.name} modlist for {game.name} ({game_version or 'any version'})."},
    ]

    logger.info("Starting Phase 1: Discovery")
    await llm.generate_with_tools(
        messages=messages,
        tools=PHASE1_TOOLS,
        tool_handlers=_build_phase1_handlers(session),
        max_iterations=20,
    )
    logger.info(f"Phase 1 complete: {len(session.modlist)} mods discovered")

    # ── Phase 2: Patch Review ──

    if session.modlist:
        modlist_summary = "\n".join(
            f"{i+1}. {m['name']} (Nexus ID: {m['nexus_mod_id']}) — {m.get('reason', '')}"
            for i, m in enumerate(session.modlist)
        )

        patch_prompt = PATCH_REVIEW_SYSTEM_PROMPT.format(
            game_name=game.name,
            game_version=game_version or "Unknown",
            modlist_summary=modlist_summary,
        )

        session.finalized = False  # Reset for Phase 2
        patch_messages = [
            {"role": "system", "content": patch_prompt},
            {"role": "user", "content": "Review the modlist above for compatibility patches."},
        ]

        logger.info("Starting Phase 2: Patch Review")
        await llm.generate_with_tools(
            messages=patch_messages,
            tools=PHASE2_TOOLS,
            tool_handlers=_build_phase2_handlers(session),
            max_iterations=15,
        )
        logger.info(
            f"Phase 2 complete: {len(session.patches)} patches, "
            f"{len(session.knowledge_flags)} flags"
        )

    # ── Combine results ──

    all_entries = session.modlist + session.patches
    return GenerationResult(
        entries=all_entries,
        knowledge_flags=session.knowledge_flags,
        llm_provider=llm.get_model_name(),
    )


# ──────────────────────────────────────────────
# DB fallback (unchanged — used when LLM is unavailable)
# ──────────────────────────────────────────────

async def build_rag_context(
    db: AsyncSession, playstyle_id: int, user_vram_mb: int,
    game_version: str | None = None,
) -> str:
    """Build context string from database for LLM."""
    result = await db.execute(
        select(Mod, PlaystyleMod)
        .join(PlaystyleMod, Mod.id == PlaystyleMod.mod_id)
        .where(PlaystyleMod.playstyle_id == playstyle_id)
    )
    rows = result.all()

    context_lines = []
    for mod, pm in rows:
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

    mod_ids = [mod.id for mod, _ in rows]
    if mod_ids:
        compat_result = await db.execute(
            select(CompatibilityRule).where(CompatibilityRule.mod_id.in_(mod_ids))
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
