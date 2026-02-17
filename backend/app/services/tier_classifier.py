from app.schemas.specs import HardwareSpecs

# GPU tier mappings (approximate performance tiers)
GPU_TIERS = {
    "ultra": [
        "4090", "4080", "7900 XTX", "7900 XT",
    ],
    "high": [
        "4070 Ti", "4070", "3080", "3090",
        "7800 XT", "7700 XT", "6900 XT", "6800 XT",
    ],
    "mid": [
        "4060 Ti", "4060", "3070", "3060 Ti", "3060",
        "6700 XT", "6700", "6650 XT", "6600 XT", "6600",
    ],
    "low": [
        "3050", "2060", "2070", "1660", "1650", "1060", "1070", "1080",
        "6500 XT", "6400", "580", "570", "5600 XT",
    ],
}

# VRAM tier thresholds (in MB)
VRAM_TIERS = {
    "ultra": 16384,  # 16GB+
    "high": 10240,   # 10GB+
    "mid": 6144,     # 6GB+
    "low": 0,        # anything below
}

# RAM tier thresholds (in GB)
RAM_TIERS = {
    "ultra": 32,
    "high": 24,
    "mid": 16,
    "low": 0,
}


def _gpu_tier(gpu: str | None) -> str | None:
    if not gpu:
        return None
    gpu_upper = gpu.upper()
    for tier, models in GPU_TIERS.items():
        for model in models:
            if model.upper() in gpu_upper:
                return tier
    return None


def _vram_tier(vram_mb: int | None) -> str | None:
    if vram_mb is None:
        return None
    for tier, threshold in VRAM_TIERS.items():
        if vram_mb >= threshold:
            return tier
    return "low"


def _ram_tier(ram_gb: int | None) -> str | None:
    if ram_gb is None:
        return None
    for tier, threshold in RAM_TIERS.items():
        if ram_gb >= threshold:
            return tier
    return "low"


TIER_RANK = {"ultra": 4, "high": 3, "mid": 2, "low": 1}


def classify_tier(specs: HardwareSpecs) -> str:
    """Classify hardware specs into a tier: low, mid, high, ultra."""
    tiers = []

    gpu_t = _gpu_tier(specs.gpu)
    if gpu_t:
        tiers.append(gpu_t)

    vram_t = _vram_tier(specs.vram_mb)
    if vram_t:
        tiers.append(vram_t)

    ram_t = _ram_tier(specs.ram_gb)
    if ram_t:
        tiers.append(ram_t)

    if not tiers:
        return "mid"  # default if nothing detected

    # Use the lowest component tier as the overall tier (bottleneck approach)
    min_rank = min(TIER_RANK.get(t, 2) for t in tiers)
    for tier, rank in TIER_RANK.items():
        if rank == min_rank:
            return tier
    return "mid"
