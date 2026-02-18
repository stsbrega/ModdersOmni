"""Multi-factor hardware tier classification.

Scores hardware across four dimensions (VRAM, GPU generation, CPU, RAM)
and maps the combined score to a tier: low / mid / high / ultra.
"""

import re

# ---------------------------------------------------------------------------
# GPU generation lookup — maps regex patterns to generation scores (0-25)
# ---------------------------------------------------------------------------
_NVIDIA_GENERATIONS: list[tuple[re.Pattern, int]] = [
    (re.compile(r"(?:RTX\s*)?50\d{2}", re.I), 25),   # RTX 5000 series
    (re.compile(r"(?:RTX\s*)?40\d{2}", re.I), 23),   # RTX 4000 series
    (re.compile(r"(?:RTX\s*)?30\d{2}", re.I), 20),   # RTX 3000 series
    (re.compile(r"(?:RTX\s*)?20\d{2}", re.I), 15),   # RTX 2000 series
    (re.compile(r"GTX\s*16\d{2}", re.I), 12),         # GTX 1600 series
    (re.compile(r"GTX\s*10\d{2}", re.I), 10),         # GTX 1000 series
    (re.compile(r"GTX\s*9\d{2}", re.I), 5),           # GTX 900 series
]

_AMD_GENERATIONS: list[tuple[re.Pattern, int]] = [
    (re.compile(r"RX\s*9\d{3}", re.I), 25),           # RX 9000 series
    (re.compile(r"RX\s*7\d{3}", re.I), 23),           # RX 7000 series
    (re.compile(r"RX\s*6\d{3}", re.I), 20),           # RX 6000 series
    (re.compile(r"RX\s*5\d{3}", re.I), 15),           # RX 5000 series
    (re.compile(r"RX\s*[45]\d{2}", re.I), 8),         # RX 400/500 series
]

_INTEL_ARC_GENERATIONS: list[tuple[re.Pattern, int]] = [
    (re.compile(r"Arc\s*B\d{3}", re.I), 20),          # Battlemage
    (re.compile(r"Arc\s*A\d{3}", re.I), 15),          # Alchemist
]


def _score_gpu_generation(gpu: str | None) -> int:
    """Score the GPU based on its architecture generation (0-25)."""
    if not gpu:
        return 0
    for patterns in (_NVIDIA_GENERATIONS, _AMD_GENERATIONS, _INTEL_ARC_GENERATIONS):
        for pattern, score in patterns:
            if pattern.search(gpu):
                return score
    return 5  # Unknown GPU gets a low baseline


def _score_vram(vram_mb: int | None) -> int:
    """Score VRAM capacity (0-30)."""
    if not vram_mb:
        return 0
    gb = vram_mb / 1024
    if gb >= 16:
        return 30
    if gb >= 12:
        return 27
    if gb >= 8:
        return 23
    if gb >= 6:
        return 18
    if gb >= 4:
        return 12
    return 5


def _score_cpu(cpu: str | None, cores: int | None, speed_ghz: float | None) -> int:
    """Score CPU based on cores, clock speed, and known high-perf models (0-25)."""
    score = 0

    # Core count scoring (0-18)
    if cores:
        if cores >= 16:
            score = 18
        elif cores >= 12:
            score = 15
        elif cores >= 8:
            score = 12
        elif cores >= 6:
            score = 8
        elif cores >= 4:
            score = 5
        else:
            score = 2

    # Clock speed bonus (0-4)
    if speed_ghz:
        if speed_ghz >= 5.0:
            score += 4
        elif speed_ghz >= 4.5:
            score += 3
        elif speed_ghz >= 4.0:
            score += 2
        elif speed_ghz >= 3.5:
            score += 1

    # Known high-performance model bonus (+3)
    if cpu:
        high_perf = [
            "7800X3D", "9800X3D", "7950X", "9950X", "9900X",
            "14900K", "13900K", "12900K", "14700K", "13700K",
            "Ultra 9", "Ultra 7",
        ]
        for model in high_perf:
            if model.lower() in cpu.lower():
                score += 3
                break

    return min(score, 25)


def _score_ram(ram_gb: int | None) -> int:
    """Score system RAM (0-20)."""
    if not ram_gb:
        return 0
    if ram_gb >= 64:
        return 20
    if ram_gb >= 32:
        return 17
    if ram_gb >= 16:
        return 12
    if ram_gb >= 8:
        return 5
    return 2


def _tier_from_score(overall: int) -> str:
    """Map overall score (0-100) to tier name."""
    if overall >= 76:
        return "ultra"
    if overall >= 56:
        return "high"
    if overall >= 31:
        return "mid"
    return "low"


def classify_hardware_tier(
    gpu: str | None = None,
    vram_mb: int | None = None,
    cpu: str | None = None,
    ram_gb: int | None = None,
    cpu_cores: int | None = None,
    cpu_speed_ghz: float | None = None,
) -> dict:
    """Classify hardware into a tier using multi-factor scoring.

    Returns a dict with:
        tier: str           — "low", "mid", "high", or "ultra"
        vram_score: int     — VRAM capacity score (0-30)
        gpu_gen_score: int  — GPU architecture generation score (0-25)
        cpu_score: int      — CPU performance score (0-25)
        ram_score: int      — System RAM score (0-20)
        overall_score: int  — Combined score (0-100)
    """
    vram_score = _score_vram(vram_mb)
    gpu_gen_score = _score_gpu_generation(gpu)
    cpu_score = _score_cpu(cpu, cpu_cores, cpu_speed_ghz)
    ram_score = _score_ram(ram_gb)

    overall = vram_score + gpu_gen_score + cpu_score + ram_score

    return {
        "tier": _tier_from_score(overall),
        "vram_score": vram_score,
        "gpu_gen_score": gpu_gen_score,
        "cpu_score": cpu_score,
        "ram_score": ram_score,
        "overall_score": overall,
    }
