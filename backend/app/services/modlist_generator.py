"""Agentic modlist generation pipeline with phased architecture.

The pipeline iterates through game-specific build phases stored in the DB
(e.g., Essentials → UI → Textures → Gameplay → Patches). Each phase runs
its own LLM tool-calling loop with focused prompts and rules.

Events are emitted through an optional callback for real-time SSE streaming.
"""

import asyncio
import json
import logging
import re
from dataclasses import dataclass, field
from typing import Callable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.provider import LLMProvider, LLMProviderFactory
from app.models.game import Game
from app.models.mod import Mod
from app.models.mod_build_phase import ModBuildPhase
from app.models.playstyle import Playstyle
from app.models.playstyle_mod import PlaystyleMod
from app.models.compatibility import CompatibilityRule
from app.schemas.modlist import ModlistGenerateRequest
from app.services.nexus_client import NexusModsClient
from app.services.tier_classifier import classify_hardware_tier

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Custom exceptions for pause/resume flow
# ──────────────────────────────────────────────


class PauseGeneration(Exception):
    """Raised when the generation should pause (all providers failed for a phase).

    Carries the session snapshot so the API layer can serialize it for resume.
    """

    def __init__(
        self, reason: str, phase_number: int, phase_name: str,
        session_snapshot: dict | None = None,
    ):
        self.reason = reason
        self.phase_number = phase_number
        self.phase_name = phase_name
        self.session_snapshot = session_snapshot or {}
        super().__init__(reason)


class NexusRateLimitError(Exception):
    pass


class NexusServerError(Exception):
    pass


class NexusExhaustedError(Exception):
    """All retry attempts for a Nexus API call failed."""
    pass


# ──────────────────────────────────────────────
# Version compatibility
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
# Event emission helper
# ──────────────────────────────────────────────


def _emit(callback: Callable[[dict], None] | None, event_type: str, data: dict) -> None:
    """Emit an event if a callback is provided."""
    if callback:
        callback({"type": event_type, **data})


# ──────────────────────────────────────────────
# Nexus API retry wrapper
# ──────────────────────────────────────────────


async def _retry_nexus(
    coro_fn: Callable,
    max_retries: int = 3,
    event_callback: Callable[[dict], None] | None = None,
) -> object:
    """Retry a Nexus API call with exponential backoff.

    Handles rate limits (429) and server errors (5xx) by retrying.
    If all retries fail, raises NexusExhaustedError so the LLM can
    try a different search or skip the mod.
    """
    import httpx

    for attempt in range(max_retries):
        try:
            return await coro_fn()
        except httpx.HTTPStatusError as e:
            status = e.response.status_code
            if status == 429:
                if attempt < max_retries - 1:
                    wait = 2 ** attempt * 5  # 5s, 10s, 20s
                    _emit(event_callback, "retrying", {
                        "reason": "nexus_rate_limit",
                        "wait_seconds": wait,
                        "attempt": attempt + 1,
                        "max_attempts": max_retries,
                    })
                    await asyncio.sleep(wait)
                    continue
            elif status >= 500:
                if attempt < max_retries - 1:
                    wait = 2 ** attempt * 3  # 3s, 6s, 12s
                    _emit(event_callback, "retrying", {
                        "reason": "nexus_server_error",
                        "wait_seconds": wait,
                        "attempt": attempt + 1,
                        "max_attempts": max_retries,
                    })
                    await asyncio.sleep(wait)
                    continue
            raise
        except (httpx.TimeoutException, httpx.ConnectError) as e:
            if attempt < max_retries - 1:
                wait = 2 ** attempt * 3
                _emit(event_callback, "retrying", {
                    "reason": "nexus_timeout" if isinstance(e, httpx.TimeoutException) else "nexus_connection",
                    "wait_seconds": wait,
                    "attempt": attempt + 1,
                    "max_attempts": max_retries,
                })
                await asyncio.sleep(wait)
                continue
            raise

    raise NexusExhaustedError("All Nexus retries failed")


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
            "description": "Call when you are done with this phase. Do not call this until you have added all desired mods for this phase.",
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
    description_cache: dict[int, str] = field(default_factory=dict)
    finalized: bool = False
    completed_phases: list[int] = field(default_factory=list)

    def to_snapshot(self) -> dict:
        """Serialize session state for pause/resume."""
        return {
            "game_domain": self.game_domain,
            "modlist": list(self.modlist),
            "patches": list(self.patches),
            "knowledge_flags": list(self.knowledge_flags),
            "description_cache": {str(k): v for k, v in self.description_cache.items()},
            "completed_phases": list(self.completed_phases),
        }

    @classmethod
    def from_snapshot(cls, snapshot: dict, nexus: NexusModsClient) -> "GenerationSession":
        """Reconstruct a session from a saved snapshot."""
        session = cls(
            game_domain=snapshot["game_domain"],
            nexus=nexus,
            modlist=snapshot.get("modlist", []),
            patches=snapshot.get("patches", []),
            knowledge_flags=snapshot.get("knowledge_flags", []),
            description_cache={int(k): v for k, v in snapshot.get("description_cache", {}).items()},
            completed_phases=snapshot.get("completed_phases", []),
        )
        return session


def _strip_html(html: str) -> str:
    """Strip HTML tags, keeping text content."""
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > 3000:
        text = text[:3000] + "... [truncated]"
    return text


# ──────────────────────────────────────────────
# Tool handler builders with event callbacks
# ──────────────────────────────────────────────

def _build_phase1_handlers(
    session: GenerationSession,
    event_callback: Callable[[dict], None] | None = None,
) -> dict:
    """Build tool handler functions for discovery phases (search + add mods)."""

    async def search_nexus(query: str, sort_by: str = "endorsements") -> str:
        _emit(event_callback, "searching", {"query": query})
        try:
            results = await _retry_nexus(
                lambda: session.nexus.search_mods(session.game_domain, query, sort_by=sort_by),
                event_callback=event_callback,
            )
        except Exception as e:
            logger.warning(f"Nexus search failed after retries: {e}")
            return json.dumps({"error": "Search temporarily unavailable. Try a different query."})

        mods = []
        for m in results[:15]:
            mods.append({
                "mod_id": m["modId"],
                "name": m["name"],
                "author": m.get("author", "Unknown"),
                "summary": (m.get("summary") or "")[:200],
                "endorsements": m.get("endorsementCount", 0),
                "category": m.get("modCategory", {}).get("name", ""),
                "updated": m.get("updatedAt", ""),
            })
        sample_names = [m["name"] for m in mods[:5]]
        _emit(event_callback, "search_results", {
            "count": len(mods),
            "sample_names": sample_names,
        })
        return json.dumps({"results": mods, "count": len(mods)})

    async def get_mod_details(mod_id: int) -> str:
        _emit(event_callback, "reading_mod", {"mod_id": mod_id})
        try:
            details = await _retry_nexus(
                lambda: session.nexus.get_mod_details(session.game_domain, mod_id),
                event_callback=event_callback,
            )
        except Exception as e:
            logger.warning(f"Nexus get_mod_details failed after retries: {e}")
            return json.dumps({"error": f"Could not fetch mod {mod_id}. Try another mod."})

        if not details:
            return json.dumps({"error": f"Mod {mod_id} not found"})
        desc_html = details.get("description") or ""
        desc_text = _strip_html(desc_html)
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
        _emit(event_callback, "mod_added", {
            "mod_id": mod_id,
            "name": name,
            "reason": reason,
            "load_order": load_order,
        })
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


def _build_phase2_handlers(
    session: GenerationSession,
    event_callback: Callable[[dict], None] | None = None,
) -> dict:
    """Build tool handler functions for the compatibility patches phase."""

    async def get_mod_description(mod_id: int) -> str:
        _emit(event_callback, "reading_mod", {"mod_id": mod_id})
        if mod_id in session.description_cache:
            return json.dumps({"mod_id": mod_id, "description": session.description_cache[mod_id]})
        try:
            details = await _retry_nexus(
                lambda: session.nexus.get_mod_details(session.game_domain, mod_id),
                event_callback=event_callback,
            )
        except Exception as e:
            logger.warning(f"Nexus get_mod_details failed after retries: {e}")
            return json.dumps({"error": f"Could not fetch mod {mod_id}"})

        if not details:
            return json.dumps({"error": f"Mod {mod_id} not found"})
        desc_text = _strip_html(details.get("description") or "")
        session.description_cache[mod_id] = desc_text
        return json.dumps({"mod_id": mod_id, "description": desc_text})

    async def search_patches(query: str) -> str:
        _emit(event_callback, "searching", {"query": query})
        try:
            results = await _retry_nexus(
                lambda: session.nexus.search_mods(session.game_domain, query, sort_by="endorsements"),
                event_callback=event_callback,
            )
        except Exception as e:
            logger.warning(f"Nexus search_patches failed after retries: {e}")
            return json.dumps({"error": "Patch search temporarily unavailable."})

        patches = []
        for m in results[:10]:
            patches.append({
                "mod_id": m["modId"],
                "name": m["name"],
                "author": m.get("author", "Unknown"),
                "summary": (m.get("summary") or "")[:200],
                "endorsements": m.get("endorsementCount", 0),
            })
        _emit(event_callback, "search_results", {
            "count": len(patches),
            "sample_names": [p["name"] for p in patches[:5]],
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
        _emit(event_callback, "patch_added", {
            "mod_id": mod_id,
            "name": name,
            "patches_mods": patches_mods,
        })
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
        _emit(event_callback, "knowledge_flag", {
            "mod_a": mod_a,
            "mod_b": mod_b,
            "issue": issue,
            "severity": severity,
        })
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
# Phase-specific prompt builders
# ──────────────────────────────────────────────

def _build_phase_prompt(
    phase: ModBuildPhase,
    game: Game,
    playstyle: Playstyle,
    game_version: str | None,
    version_notes: str,
    hardware_context: str,
    session: GenerationSession,
    total_phases: int,
) -> str:
    """Build a focused system prompt for a single build phase."""

    # Build a summary of mods already added in previous phases
    mods_so_far = ""
    if session.modlist:
        mods_so_far = "\n\nMODS ALREADY IN YOUR MODLIST (from earlier phases — do NOT re-add these):\n"
        mods_so_far += "\n".join(
            f"  {i+1}. {m['name']} (Nexus ID: {m['nexus_mod_id']})"
            for i, m in enumerate(session.modlist)
        )

    playstyle_context = ""
    if phase.is_playstyle_driven:
        playstyle_context = f"""
PLAYSTYLE FOCUS: {playstyle.name}
The user wants a {playstyle.name} experience. Your mod choices in this phase should
directly support this playstyle. Prioritize mods that enhance the {playstyle.name} feel."""
    else:
        playstyle_context = f"""
PLAYSTYLE: {playstyle.name} (for context — this phase is not heavily playstyle-driven,
but keep the overall experience in mind)."""

    return f"""You are an expert {game.name} mod curator working on Phase {phase.phase_number}/{total_phases}: "{phase.name}".

GAME: {game.name} ({game_version or "Unknown"} edition)
{version_notes}

{hardware_context}

{playstyle_context}

── PHASE {phase.phase_number}: {phase.name} ──
{phase.description}

SEARCH GUIDANCE:
{phase.search_guidance}

RULES FOR THIS PHASE:
{phase.rules}

{f"EXAMPLE MODS (for reference — verify these exist and are current before adding):{chr(10)}{phase.example_mods}" if phase.example_mods else ""}
{mods_so_far}

INSTRUCTIONS:
1. Search for mods using varied, specific terms related to this phase's focus.
2. Use get_mod_details to read about a mod BEFORE adding it. Check:
   - Compatibility with {game_version or "the user's"} game version
   - Performance impact relative to the user's hardware
   - Whether it actually fits this phase's purpose
3. Add up to {phase.max_mods} mods for this phase (fewer is fine if quality is high).
4. Set load_order based on the mod's position within this phase.
5. Call finalize() when you are done with this phase."""


def _build_patch_phase_prompt(
    phase: ModBuildPhase,
    game: Game,
    game_version: str | None,
    session: GenerationSession,
    total_phases: int,
) -> str:
    """Build system prompt for the final compatibility patches phase."""
    modlist_summary = "\n".join(
        f"  {i+1}. {m['name']} (Nexus ID: {m['nexus_mod_id']}) — {m.get('reason', '')}"
        for i, m in enumerate(session.modlist)
    )

    return f"""You are reviewing a {game.name} ({game_version or "Unknown"} edition) modlist for compatibility.

This is Phase {phase.phase_number}/{total_phases}: "{phase.name}".

THE MODLIST TO REVIEW:
{modlist_summary}

{phase.search_guidance}

RULES:
{phase.rules}

PROCESS:
1. For each potential conflict pair, FIRST use get_mod_description to check if the
   mod page mentions patches or compatibility notes.
2. If the description doesn't mention a patch, use search_patches to search Nexus.
3. If you find a patch, use add_patch with correct load_order (patches load AFTER the mods they patch).
4. If a patch is NEEDED but doesn't exist, use flag_user_knowledge to alert the user.

IMPORTANT:
- Not every mod pair needs a patch. Only flag genuine conflicts.
- Framework mods (SKSE, Address Library, etc.) don't need patches with each other.
- Focus on mods that edit the same game systems.
- Call finalize_review when done."""


def _build_phase_user_msg(
    phase: ModBuildPhase,
    playstyle: Playstyle,
    game: Game,
    game_version: str | None,
) -> str:
    """Build the user message that kicks off a phase."""
    if phase.is_playstyle_driven:
        return (
            f"Build the {phase.name} section of a {playstyle.name} modlist for "
            f"{game.name} ({game_version or 'any version'}). "
            f"Focus on mods that enhance the {playstyle.name} experience."
        )
    return (
        f"Build the {phase.name} section of a modlist for "
        f"{game.name} ({game_version or 'any version'})."
    )


def _build_hardware_context(
    request: ModlistGenerateRequest,
    tier_info: dict,
    vram_budget: int,
    storage_budget_gb: int,
) -> str:
    """Build the hardware context block for system prompts."""
    return f"""USER HARDWARE:
- GPU: {request.gpu or "Unknown"} ({request.vram_mb or 6144}MB VRAM)
- CPU: {request.cpu or "Unknown"}
- RAM: {request.ram_gb or "Unknown"}GB
- Available disk space: {request.available_storage_gb or 50}GB (budget: {storage_budget_gb}GB)
- VRAM budget: {vram_budget}MB
- Hardware tier: {tier_info["tier"]}"""


# ──────────────────────────────────────────────
# Error classification
# ──────────────────────────────────────────────

def _classify_error(llm: LLMProvider, e: Exception) -> tuple[str, str]:
    """Classify an exception into (error_type, friendly_message).

    Returns:
        error_type: machine-readable error classification
        friendly: human-readable message for the frontend
    """
    error_msg = str(e)
    model_name = llm.get_model_name()

    if "rate" in error_msg.lower() or "429" in error_msg:
        return "rate_limit", f"{model_name}: Rate limited — too many requests"
    if "auth" in error_msg.lower() or "401" in error_msg or ("invalid" in error_msg.lower() and "key" in error_msg.lower()):
        return "auth_error", f"{model_name}: Invalid API key"
    if "quota" in error_msg.lower() or "insufficient" in error_msg.lower() or "billing" in error_msg.lower():
        return "token_limit", f"{model_name}: Quota exceeded or billing issue"
    if "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
        return "timeout", f"{model_name}: Request timed out"
    if "connect" in error_msg.lower() or "network" in error_msg.lower():
        return "connection", f"{model_name}: Connection failed"
    if "token" in error_msg.lower() and ("limit" in error_msg.lower() or "max" in error_msg.lower()):
        return "token_limit", f"{model_name}: Token limit exceeded"

    error_type_name = type(e).__name__
    return "unknown", f"{model_name}: {error_type_name} — {error_msg[:120]}"


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
    db: AsyncSession,
    request: ModlistGenerateRequest,
    event_callback: Callable[[dict], None] | None = None,
    resume_from_phase: int | None = None,
    resume_session: GenerationSession | None = None,
) -> GenerationResult:
    """Generate a modlist using the phased agentic pipeline.

    Iterates through game-specific build phases from the DB. Each phase runs
    its own LLM tool-calling loop with focused prompts. The final phase always
    handles compatibility patches.

    Args:
        db: Database session
        request: Generation request with hardware info, playstyle, credentials
        event_callback: Optional callback for real-time event streaming
        resume_from_phase: If resuming, which phase number to start from
        resume_session: If resuming, the restored GenerationSession
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
    hardware_context = _build_hardware_context(request, tier_info, vram_budget, storage_budget_gb)

    # Load ordered phases for this game
    result = await db.execute(
        select(ModBuildPhase)
        .where(ModBuildPhase.game_id == request.game_id)
        .order_by(ModBuildPhase.phase_number)
    )
    phase_list = result.scalars().all()

    # If no phases in DB, fall back to legacy two-phase pipeline
    if not phase_list:
        return await _generate_legacy(db, request, event_callback)

    # Build ordered list of LLM providers to try
    providers_to_try: list[LLMProvider] = []
    for cred in request.llm_credentials:
        try:
            providers_to_try.append(
                LLMProviderFactory.create_from_request(
                    cred.provider, cred.api_key,
                    base_url=cred.base_url, model=cred.model,
                )
            )
        except ValueError:
            logger.warning(f"Skipping unknown provider: {cred.provider}")

    if not providers_to_try:
        providers_to_try.append(LLMProviderFactory.create())

    # Create or restore session
    nexus = NexusModsClient()
    if resume_session:
        session = resume_session
        session.nexus = nexus  # Reconnect Nexus client
    else:
        session = GenerationSession(game_domain=game.nexus_domain, nexus=nexus)

    total_phases = len(phase_list)
    last_successful_provider = providers_to_try[0]

    # ── Phased generation loop ──
    for phase in phase_list:
        # Skip already-completed phases (for resume)
        if resume_from_phase and phase.phase_number < resume_from_phase:
            continue

        is_patch_phase = (phase.phase_number == phase_list[-1].phase_number)

        _emit(event_callback, "phase_start", {
            "phase": phase.name,
            "number": phase.phase_number,
            "total_phases": total_phases,
            "is_patch_phase": is_patch_phase,
        })

        # Try each provider for this phase
        phase_succeeded = False
        provider_errors: list[str] = []

        for i, llm in enumerate(providers_to_try):
            try:
                session.finalized = False

                if is_patch_phase:
                    # Final phase: compatibility patches
                    system_prompt = _build_patch_phase_prompt(
                        phase, game, game_version, session, total_phases,
                    )
                    user_msg = "Review the modlist above for compatibility patches."
                    tools = PHASE2_TOOLS
                    handlers = _build_phase2_handlers(session, event_callback)
                else:
                    # Regular discovery phase
                    system_prompt = _build_phase_prompt(
                        phase, game, playstyle, game_version, version_notes,
                        hardware_context, session, total_phases,
                    )
                    user_msg = _build_phase_user_msg(phase, playstyle, game, game_version)
                    tools = PHASE1_TOOLS
                    handlers = _build_phase1_handlers(session, event_callback)

                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_msg},
                ]

                logger.info(
                    f"Phase {phase.phase_number}/{total_phases}: {phase.name} "
                    f"(provider: {llm.get_model_name()})"
                )

                await llm.generate_with_tools(
                    messages=messages,
                    tools=tools,
                    tool_handlers=handlers,
                    max_iterations=phase.max_mods + 5,
                    on_text=lambda text: _emit(
                        event_callback, "thinking", {"text": text[:200]}
                    ),
                )

                phase_succeeded = True
                last_successful_provider = llm
                session.completed_phases.append(phase.phase_number)

                _emit(event_callback, "phase_complete", {
                    "phase": phase.name,
                    "number": phase.phase_number,
                    "mod_count": len(session.modlist),
                    "patch_count": len(session.patches),
                })

                logger.info(
                    f"Phase {phase.phase_number} complete: "
                    f"{len(session.modlist)} mods, {len(session.patches)} patches"
                )
                break  # Phase succeeded, move to next

            except Exception as e:
                error_type, friendly = _classify_error(llm, e)
                logger.warning(
                    f"Provider {llm.get_model_name()} failed on phase "
                    f"{phase.phase_number} ({error_type}): {e}"
                )
                provider_errors.append(friendly)

                _emit(event_callback, "provider_error", {
                    "provider": llm.get_model_name(),
                    "type": error_type,
                    "message": friendly,
                })

                # If there's a next provider, emit a switch event
                if i + 1 < len(providers_to_try):
                    next_provider = providers_to_try[i + 1]
                    _emit(event_callback, "provider_switch", {
                        "from_provider": llm.get_model_name(),
                        "to_provider": next_provider.get_model_name(),
                    })

                continue

        if not phase_succeeded:
            # All providers failed for this phase → PAUSE
            error_summary = "; ".join(provider_errors)
            raise PauseGeneration(
                reason=error_summary,
                phase_number=phase.phase_number,
                phase_name=phase.name,
                session_snapshot=session.to_snapshot(),
            )

    # ── All phases complete ──
    all_entries = session.modlist + session.patches
    return GenerationResult(
        entries=all_entries,
        knowledge_flags=session.knowledge_flags,
        llm_provider=last_successful_provider.get_model_name(),
    )


# ──────────────────────────────────────────────
# Legacy two-phase pipeline (fallback when no DB phases)
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


async def _generate_legacy(
    db: AsyncSession,
    request: ModlistGenerateRequest,
    event_callback: Callable[[dict], None] | None = None,
) -> GenerationResult:
    """Legacy two-phase pipeline for games without DB-defined phases."""
    game = await db.get(Game, request.game_id)
    playstyle = await db.get(Playstyle, request.playstyle_id)
    if not game or not playstyle:
        raise ValueError("Invalid game or playstyle ID")

    user_vram = request.vram_mb or 6144
    game_version = request.game_version

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

    nexus = NexusModsClient()
    session = GenerationSession(game_domain=game.nexus_domain, nexus=nexus)

    providers_to_try: list[LLMProvider] = []
    for cred in request.llm_credentials:
        try:
            providers_to_try.append(
                LLMProviderFactory.create_from_request(
                    cred.provider, cred.api_key,
                    base_url=cred.base_url, model=cred.model,
                )
            )
        except ValueError:
            logger.warning(f"Skipping unknown provider: {cred.provider}")

    if not providers_to_try:
        providers_to_try.append(LLMProviderFactory.create())

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

    provider_errors: list[str] = []
    for i, llm in enumerate(providers_to_try):
        try:
            session.modlist.clear()
            session.patches.clear()
            session.knowledge_flags.clear()
            session.description_cache.clear()
            session.finalized = False

            logger.info(f"Trying provider {i+1}/{len(providers_to_try)}: {llm.get_model_name()}")

            _emit(event_callback, "phase_start", {
                "phase": "Discovery",
                "number": 1,
                "total_phases": 2,
            })

            messages = [
                {"role": "system", "content": discovery_prompt},
                {"role": "user", "content": f"Build a {playstyle.name} modlist for {game.name} ({game_version or 'any version'})."},
            ]

            await llm.generate_with_tools(
                messages=messages,
                tools=PHASE1_TOOLS,
                tool_handlers=_build_phase1_handlers(session, event_callback),
                max_iterations=20,
                on_text=lambda text: _emit(
                    event_callback, "thinking", {"text": text[:200]}
                ),
            )

            _emit(event_callback, "phase_complete", {
                "phase": "Discovery",
                "number": 1,
                "mod_count": len(session.modlist),
            })

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

                session.finalized = False

                _emit(event_callback, "phase_start", {
                    "phase": "Patch Review",
                    "number": 2,
                    "total_phases": 2,
                })

                await llm.generate_with_tools(
                    messages=[
                        {"role": "system", "content": patch_prompt},
                        {"role": "user", "content": "Review the modlist above for compatibility patches."},
                    ],
                    tools=PHASE2_TOOLS,
                    tool_handlers=_build_phase2_handlers(session, event_callback),
                    max_iterations=15,
                    on_text=lambda text: _emit(
                        event_callback, "thinking", {"text": text[:200]}
                    ),
                )

                _emit(event_callback, "phase_complete", {
                    "phase": "Patch Review",
                    "number": 2,
                    "mod_count": len(session.modlist),
                    "patch_count": len(session.patches),
                })

            all_entries = session.modlist + session.patches
            return GenerationResult(
                entries=all_entries,
                knowledge_flags=session.knowledge_flags,
                llm_provider=llm.get_model_name(),
            )

        except Exception as e:
            _, friendly = _classify_error(llm, e)
            logger.warning(f"Provider {llm.get_model_name()} failed: {e}")
            provider_errors.append(friendly)
            continue

    error_summary = "; ".join(provider_errors) if provider_errors else "No LLM provider available"
    raise RuntimeError(error_summary)


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
