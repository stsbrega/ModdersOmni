from app.schemas.specs import HardwareSpecs
from app.services.tier_classifier import classify_tier


def test_low_tier():
    specs = HardwareSpecs(gpu="GTX 1060", vram_mb=6144, cpu="Intel Core i5-8400", ram_gb=8)
    assert classify_tier(specs) == "low"


def test_mid_tier():
    specs = HardwareSpecs(gpu="RTX 3060", vram_mb=12288, cpu="AMD Ryzen 5 5600X", ram_gb=16)
    assert classify_tier(specs) == "mid"


def test_high_tier():
    specs = HardwareSpecs(gpu="RTX 4070 Ti", vram_mb=12288, cpu="Intel Core i7-13700K", ram_gb=32)
    assert classify_tier(specs) == "high"


def test_ultra_tier():
    specs = HardwareSpecs(gpu="RTX 4090", vram_mb=24576, cpu="AMD Ryzen 9 7950X", ram_gb=64)
    assert classify_tier(specs) == "ultra"


def test_unknown_gpu_defaults_mid():
    specs = HardwareSpecs(gpu="SomeUnknownGPU", vram_mb=8192, ram_gb=16)
    tier = classify_tier(specs)
    assert tier in ("low", "mid", "high", "ultra")


def test_no_specs_defaults():
    specs = HardwareSpecs()
    tier = classify_tier(specs)
    assert tier in ("low", "mid", "high", "ultra")
