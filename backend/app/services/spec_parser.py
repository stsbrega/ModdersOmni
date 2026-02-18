import json
import re
import logging

from app.schemas.specs import HardwareSpecs

logger = logging.getLogger(__name__)

# GPU patterns
GPU_PATTERNS = [
    re.compile(r"(NVIDIA\s+GeForce\s+[A-Z]{2,3}\s+\d{3,4}\s*(?:Ti\s*(?:SUPER)?|SUPER|XT)?)", re.IGNORECASE),
    re.compile(r"(GeForce\s+[A-Z]{2,3}\s+\d{3,4}\s*(?:Ti\s*(?:SUPER)?|SUPER|XT)?)", re.IGNORECASE),
    re.compile(r"(AMD\s+Radeon\s+RX\s+\d{3,4}\s*(?:XTX|XT)?)", re.IGNORECASE),
    re.compile(r"(Radeon\s+RX\s+\d{3,4}\s*(?:XTX|XT)?)", re.IGNORECASE),
    re.compile(r"(Intel\s+Arc\s+[A-Z]\d{3,4}[A-Z]?)", re.IGNORECASE),
    # Catch NVIDIA RTX/GTX without GeForce prefix
    re.compile(r"((?:RTX|GTX)\s+\d{3,4}\s*(?:Ti\s*(?:SUPER)?|SUPER)?)", re.IGNORECASE),
]

# VRAM patterns
VRAM_PATTERNS = [
    re.compile(r"(\d+)(?:\.\d+)?\s*GB\s*(?:GDDR\d[A-Z]?|VRAM|Video\s*(?:RAM|Memory))", re.IGNORECASE),
    re.compile(r"(?:VRAM|Video\s*(?:RAM|Memory)|Dedicated\s*(?:GPU|Video)\s*Memory|Total\s*Available\s*Graphics\s*Memory)\s*[:=]?\s*(\d+)(?:\.\d+)?\s*(?:GB|MB)", re.IGNORECASE),
    re.compile(r"(\d{4,})\s*MB\s*(?:GDDR|VRAM|Video|Dedicated)", re.IGNORECASE),
    re.compile(r"(?:GDDR\d[A-Z]?)\s*[:=]?\s*(\d+)(?:\.\d+)?\s*(?:GB|MB)", re.IGNORECASE),
]

# CPU patterns
CPU_PATTERNS = [
    re.compile(r"(Intel\s+Core\s+(?:Ultra\s+)?\d?\s*i\d[- ]\d{4,5}[A-Z]{0,3})", re.IGNORECASE),
    re.compile(r"(Intel\s+Core\s+i\d[- ]\d{4,5}[A-Z]{0,3})", re.IGNORECASE),
    re.compile(r"(AMD\s+Ryzen\s+\d\s+\d{4}X?\d?[A-Z]*(?:\s*3D)?)", re.IGNORECASE),
    re.compile(r"(Intel\s+Core\s+Ultra\s+\d\s+\d{3}[A-Z]?)", re.IGNORECASE),
    re.compile(r"(AMD\s+Ryzen\s+\d\s+\d{3,4}[A-Z]*)", re.IGNORECASE),
    # Catch processor lines from system info
    re.compile(r"(?:Processor|CPU)\s*[:=]?\s*(.+?)(?:\s*@|\s*\d+\.\d+\s*GHz|\n|$)", re.IGNORECASE),
]

# RAM patterns (ordered from most specific to least; avoid matching VRAM/GDDR lines)
RAM_PATTERNS = [
    # "System Memory: 32 GB", "Available System Memory: 31.9 GB"
    re.compile(r"(?:System\s*Memory|System\s*RAM)\s*[:=]?\s*(\d{1,3})(?:\.\d+)?\s*GB", re.IGNORECASE),
    # "RAM: 32 GB DDR5", "32 GB DDR5 RAM"
    re.compile(r"(\d{1,3})\s*GB\s*DDR\d", re.IGNORECASE),
    re.compile(r"(?:RAM)\s*[:=]?\s*(\d{1,3})(?:\.\d+)?\s*GB", re.IGNORECASE),
    # "Installed Physical Memory (RAM): 32 GB", "Total Physical Memory: 32,651 MB"
    re.compile(r"(?:Installed\s*(?:Physical\s*)?Memory|Total\s*Physical\s*Memory)\s*(?:\(RAM\))?\s*[:=]?\s*(\d{1,3})(?:[.,]\d+)?\s*GB", re.IGNORECASE),
    # "Memory: 32768 MB" or "32,651 MB" (but NOT "Video Memory" or "GDDR")
    re.compile(r"(?<!Video\s)(?<!GPU\s)(?<!Dedicated\s)Memory\s*(?:\(RAM\))?\s*[:=]?\s*(\d[\d,]{3,6})\s*MB", re.IGNORECASE),
    # "Memory: 32 GB" (but NOT "Video Memory" or lines containing GDDR)
    re.compile(r"(?<!Video\s)(?<!GPU\s)(?<!Dedicated\s)Memory\s*[:=]?\s*(\d{1,3})(?:\.\d+)?\s*GB", re.IGNORECASE),
    # "32 GB installed", "32 GB total", "32 GB physical", "32 GB usable"
    re.compile(r"(\d{1,3})\s*GB\s*(?:installed|total|physical|usable)", re.IGNORECASE),
]

# CPU core count patterns
CPU_CORE_PATTERNS = [
    re.compile(r"(\d{1,2})\s*-?\s*[Cc]ore", re.IGNORECASE),
    re.compile(r"(\d{1,2})\s*[Cc]ores", re.IGNORECASE),
    re.compile(r"(\d{1,2})\s*C\s*/\s*\d{1,2}\s*T", re.IGNORECASE),  # "8C/16T"
    re.compile(r"[Cc]ores?\s*[:=]?\s*(\d{1,2})", re.IGNORECASE),
    re.compile(r"(\d{1,2})\s*(?:physical\s+)?(?:cores|processors)", re.IGNORECASE),
]

# CPU speed patterns
CPU_SPEED_PATTERNS = [
    re.compile(r"(\d+\.\d+)\s*GHz", re.IGNORECASE),
    re.compile(r"(?:Base|Boost|Clock|Speed|Frequency)\s*[:=]?\s*(\d+\.\d+)\s*GHz", re.IGNORECASE),
    re.compile(r"@\s*(\d+\.\d+)\s*GHz", re.IGNORECASE),
]


LLM_PARSE_PROMPT = """Extract hardware specifications from the following text.
Return ONLY a JSON object with these fields (use null if not found):
{
  "gpu": "GPU model name (e.g. NVIDIA GeForce RTX 4070 Ti)",
  "vram_mb": VRAM in megabytes as integer (e.g. 12288 for 12GB),
  "cpu": "CPU model name (e.g. AMD Ryzen 7 7800X3D)",
  "ram_gb": RAM in gigabytes as integer (e.g. 32),
  "cpu_cores": Number of CPU cores as integer (e.g. 8),
  "cpu_speed_ghz": CPU clock speed in GHz as float (e.g. 4.5)
}

Text to parse:
"""


def _extract_first_match(text: str, patterns: list[re.Pattern]) -> str | None:
    for pattern in patterns:
        match = pattern.search(text)
        if match:
            return match.group(1).strip()
    return None


def _parse_vram(text: str) -> int | None:
    for pattern in VRAM_PATTERNS:
        match = pattern.search(text)
        if match:
            value = int(match.group(1))
            if value >= 1024:
                return value
            return value * 1024
    return None


def _parse_ram(text: str) -> int | None:
    for pattern in RAM_PATTERNS:
        match = pattern.search(text)
        if match:
            raw = match.group(1).replace(",", "")
            value = int(raw)
            # If the value is large (e.g. 32768 MB), convert to GB
            if value >= 1024:
                return round(value / 1024)
            return value
    return None


def _parse_cpu_cores(text: str) -> int | None:
    """Extract CPU core count from text."""
    for pattern in CPU_CORE_PATTERNS:
        match = pattern.search(text)
        if match:
            cores = int(match.group(1))
            if 1 <= cores <= 128:
                return cores
    return None


def _parse_cpu_speed(text: str) -> float | None:
    """Extract CPU clock speed in GHz from text."""
    for pattern in CPU_SPEED_PATTERNS:
        match = pattern.search(text)
        if match:
            speed = float(match.group(1))
            if 0.5 <= speed <= 8.0:
                return speed
    return None


def parse_specs_regex(raw_text: str) -> HardwareSpecs:
    """Parse hardware specs using regex patterns."""
    return HardwareSpecs(
        gpu=_extract_first_match(raw_text, GPU_PATTERNS),
        vram_mb=_parse_vram(raw_text),
        cpu=_extract_first_match(raw_text, CPU_PATTERNS),
        ram_gb=_parse_ram(raw_text),
        cpu_cores=_parse_cpu_cores(raw_text),
        cpu_speed_ghz=_parse_cpu_speed(raw_text),
    )


async def parse_specs_llm(raw_text: str) -> HardwareSpecs | None:
    """Fallback: use LLM to extract specs from freeform text."""
    try:
        from app.llm.provider import LLMProviderFactory

        llm = LLMProviderFactory.create()
        response = await llm.generate(
            system_prompt="You are a hardware specification parser. Extract PC hardware details and return ONLY valid JSON.",
            user_prompt=LLM_PARSE_PROMPT + raw_text,
        )

        # Try to extract JSON from response
        response = response.strip()
        if response.startswith("```"):
            # Strip markdown code block
            lines = response.split("\n")
            response = "\n".join(
                line for line in lines if not line.strip().startswith("```")
            )

        data = json.loads(response)
        return HardwareSpecs(
            gpu=data.get("gpu"),
            vram_mb=data.get("vram_mb"),
            cpu=data.get("cpu"),
            ram_gb=data.get("ram_gb"),
            cpu_cores=data.get("cpu_cores"),
            cpu_speed_ghz=data.get("cpu_speed_ghz"),
        )
    except Exception as e:
        logger.warning(f"LLM spec parsing failed: {e}")
        return None


async def parse_specs(raw_text: str) -> tuple[HardwareSpecs, str]:
    """Parse hardware specs from freeform text.

    Uses regex first, falls back to LLM if regex can't find GPU or CPU.
    Returns (specs, method) where method is 'regex', 'llm', or 'regex_partial'.
    """
    specs = parse_specs_regex(raw_text)

    # If regex found at least GPU or CPU, we're good
    if specs.gpu or specs.cpu:
        return specs, "regex"

    # Fallback to LLM
    llm_specs = await parse_specs_llm(raw_text)
    if llm_specs and (llm_specs.gpu or llm_specs.cpu):
        return llm_specs, "llm"

    # Return partial regex results
    return specs, "regex_partial"
