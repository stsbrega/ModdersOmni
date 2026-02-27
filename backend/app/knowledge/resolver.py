"""Resolves methodology knowledge relevant to a specific generation phase.

Parses structured markdown files (skyrim.md, fallout4.md) at import time
and provides phase-targeted methodology context for LLM prompts.
"""

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)

_KNOWLEDGE_DIR = Path(__file__).parent

# Game slug → markdown filename
_GAME_FILES: dict[str, str] = {
    "skyrimse": "skyrim.md",
    "fallout4": "fallout4.md",
}


@dataclass(frozen=True)
class MethodologySection:
    """A parsed section from a game methodology file."""
    id: str
    title: str
    content: str
    phases: frozenset[int]
    is_universal: bool = False


@dataclass
class GameMethodology:
    """All parsed methodology content for a single game."""
    universal_principles: str
    sections: list[MethodologySection] = field(default_factory=list)


# Module-level cache: parsed once per process
_cache: dict[str, GameMethodology] = {}


def _parse_phases(phases_str: str) -> frozenset[int]:
    """Parse '1, 3, 10' into frozenset({1, 3, 10})."""
    return frozenset(
        int(p.strip()) for p in phases_str.split(",") if p.strip().isdigit()
    )


def _parse_methodology_file(filepath: Path) -> GameMethodology:
    """Parse a methodology markdown file into structured sections."""
    text = filepath.read_text(encoding="utf-8")

    # Split on section markers: <!-- section: id -->
    section_pattern = re.compile(r"<!--\s*section:\s*(\w+)\s*-->")
    parts = section_pattern.split(text)

    # parts[0] = content before first section marker (universal principles)
    # parts[1] = first section id, parts[2] = first section content, etc.
    universal_principles = parts[0].strip()

    # Strip markdown metadata comments from universal principles
    universal_principles = re.sub(
        r"<!--.*?-->", "", universal_principles, flags=re.DOTALL
    ).strip()
    # Remove the top-level heading (e.g., "# Skyrim SE/AE Modding Methodology")
    lines = universal_principles.split("\n")
    if lines and lines[0].startswith("# "):
        lines = lines[1:]
    universal_principles = "\n".join(lines).strip()

    sections: list[MethodologySection] = []
    for i in range(1, len(parts), 2):
        section_id = parts[i]
        if i + 1 >= len(parts):
            break
        section_content = parts[i + 1]

        # Extract metadata comments from section content
        phases_match = re.search(
            r"<!--\s*phases:\s*([\d\s,]+)\s*-->", section_content
        )
        universal_match = re.search(
            r"<!--\s*universal:\s*(true|false)\s*-->", section_content, re.IGNORECASE
        )

        phases = _parse_phases(phases_match.group(1)) if phases_match else frozenset()
        is_universal = (
            universal_match.group(1).lower() == "true" if universal_match else False
        )

        # Clean content: remove metadata comments and leading/trailing whitespace
        clean_content = re.sub(
            r"<!--.*?-->", "", section_content, flags=re.DOTALL
        ).strip()

        # Extract title from first heading
        title = section_id
        title_match = re.match(r"#\s+(.+)", clean_content)
        if title_match:
            title = title_match.group(1).strip()

        sections.append(
            MethodologySection(
                id=section_id,
                title=title,
                content=clean_content,
                phases=phases,
                is_universal=is_universal,
            )
        )

    return GameMethodology(
        universal_principles=universal_principles,
        sections=sections,
    )


def _get_game_methodology(game_slug: str) -> GameMethodology | None:
    """Get parsed methodology for a game, using cache."""
    if game_slug in _cache:
        return _cache[game_slug]

    filename = _GAME_FILES.get(game_slug)
    if not filename:
        return None

    filepath = _KNOWLEDGE_DIR / filename
    if not filepath.exists():
        logger.warning("Methodology file not found: %s", filepath)
        return None

    try:
        methodology = _parse_methodology_file(filepath)
        _cache[game_slug] = methodology
        logger.info(
            "Loaded %s methodology: %d sections",
            game_slug,
            len(methodology.sections),
        )
        return methodology
    except Exception:
        logger.exception("Failed to parse methodology file: %s", filepath)
        return None


def get_methodology_context(game_slug: str, phase_number: int) -> str:
    """Return methodology text relevant to a specific game and phase.

    Args:
        game_slug: "skyrimse" or "fallout4"
        phase_number: The current phase number (1-based)

    Returns:
        A formatted string block to inject into the system prompt,
        or empty string if no methodology exists for this game.
    """
    methodology = _get_game_methodology(game_slug)
    if not methodology:
        return ""

    # Collect relevant sections for this phase
    relevant = [
        s
        for s in methodology.sections
        if s.is_universal or phase_number in s.phases
    ]

    parts = [methodology.universal_principles]

    for section in relevant:
        parts.append(section.content)

    methodology_block = "\n\n".join(parts)

    return (
        "\nREFERENCE METHODOLOGY (community best practices — "
        "use this knowledge when selecting and evaluating mods):\n"
        f"{methodology_block}"
    )
