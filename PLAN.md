# Modify App — Implementation Plan

## Overview
Three major improvements: (1) smarter mod selection with game version awareness, (2) richer hardware tier classification, (3) gaming-themed dynamic UI.

---

## 1. Mod Selection Logic — Game Version Awareness & Deeper Curation

### Problem
- Current mod selection only filters by VRAM threshold and playstyle, with no game version awareness
- Skyrim SE vs AE and Fallout 4 standard vs Next-Gen Update have different mod compatibility
- The LLM prompt doesn't mention game version, and the seed data has no version metadata

### Changes

#### Backend — Data Model
- **`Game` model** (`backend/app/models/game.py`): Add `versions` field (JSON list, e.g. `["SE", "AE"]` for Skyrim, `["Standard", "Next-Gen"]` for Fallout 4)
- **`Mod` model** (`backend/app/models/mod.py`): Add `game_version_support` field (String, e.g. `"all"`, `"se_only"`, `"ae_required"`, `"pre_nextgen"`, `"nextgen_only"`) to indicate which game version(s) a mod supports
- **`ModlistGenerateRequest` schema** (`backend/app/schemas/modlist.py`): Add `game_version: str | None = None` field
- **`HardwareSpecs` schema** (`backend/app/schemas/specs.py`): Add `cpu_cores: int | None` and `cpu_speed_ghz: float | None` fields (for tier classifier)

#### Backend — Seed Data
- **`seed_data.py`**: Update `GAMES` to include `versions` list. Update all mods in `SKYRIM_MODS` and `FALLOUT4_MODS` to include a `game_version_support` value as the 8th tuple element. Add ~15-20 more mods per game to provide deeper curation (AE-specific mods like Survival Mode CC, Saints & Seducers; Next-Gen specific Fallout 4 mods; classic mods that break on newer versions)

#### Backend — Mod Selection Logic
- **`modlist_generator.py`**:
  - Update `build_rag_context()` to filter mods by `game_version_support` compatibility with the user's selected version
  - Update `SYSTEM_PROMPT_TEMPLATE` to include game version context ("The user is playing {game_version}. Only recommend mods compatible with this version.")
  - Add version-specific advice in prompt (e.g. "AE includes Creation Club content; some mods conflict with CC")
- **`api/modlist.py`**: Pass `game_version` through to generator. Update `_fallback_modlist()` to also filter by version

#### Frontend
- **`game.model.ts`**: Add `versions?: string[]` to `Game` interface
- **`game-select.component.ts`**: After picking a game, show a version sub-selection (e.g. "SE" vs "AE" cards for Skyrim). Emit both game ID and version.
- **`setup.component.ts`**: Track `selectedGameVersion` signal, pass it down to playstyle-select
- **`playstyle-select.component.ts`**: Include `game_version` in the generate request
- **`api.service.ts`**: Update `generateModlist()` to accept `game_version`

---

## 2. Hardware Tier Classification — Multi-Factor Scoring

### Problem
- Current tier classification is VRAM-only (low=0, mid=6GB, high=10GB, ultra=16GB)
- No consideration of CPU cores/speed, RAM amount, or GPU generation (architecture age)
- A user with a GTX 1080 Ti (11GB VRAM) gets classified the same as an RTX 3080 (10GB) despite massive perf difference

### Changes

#### Backend — New Tier Classifier Service
- **Create `backend/app/services/tier_classifier.py`** (currently doesn't exist):
  - `classify_hardware_tier(gpu, vram_mb, cpu, ram_gb, cpu_cores, cpu_speed_ghz) -> dict` returning `{"tier": "low|mid|high|ultra", "vram_score": int, "cpu_score": int, "ram_score": int, "gpu_gen_score": int, "overall_score": int}`
  - **VRAM scoring** (0-30 pts): <4GB=5, 4-6GB=12, 6-8GB=18, 8-12GB=23, 12-16GB=27, 16GB+=30
  - **GPU generation scoring** (0-25 pts): Parse GPU name to detect series — GTX 900=5, GTX 10xx=10, RTX 20xx=15, RTX 30xx=20, RTX 40xx=23, RTX 50xx=25. AMD equivalents: RX 400/500=8, RX 5000=15, RX 6000=20, RX 7000=23, RX 9000=25
  - **CPU scoring** (0-25 pts): Based on parsed core count and clock speed. 4c/low=5, 6c/mid=12, 8c/high=18, 12c+=22, 16c+=25. Bonus for high clocks (4.5GHz+) and known good models (7800X3D, 14900K)
  - **RAM scoring** (0-20 pts): 8GB=5, 16GB=12, 32GB=17, 64GB+=20
  - **Tier thresholds**: Low=0-30, Mid=31-55, High=56-75, Ultra=76-100
  - Export a `GPU_GENERATION_MAP` dict for parsing GPU series from model string

#### Backend — Spec Parser Updates
- **`spec_parser.py`**: Add regex patterns for CPU core count (e.g. "8-Core", "8 cores", "8C/16T") and CPU speed (e.g. "3.8 GHz", "4.5GHz base"). Return these in `HardwareSpecs`

#### Backend — Integration
- **`modlist_generator.py`**: Use `classify_hardware_tier()` to get the full tier object. Include GPU generation context in LLM prompt ("User has a {gpu_generation} GPU"). Use `overall_score` to set smarter VRAM budget (not just 80% flat — scale based on tier)
- **`api/modlist.py`**: Include tier classification result in modlist response metadata
- **Seed data**: Update `SKYRIM_PLAYSTYLE_MODS` and `FALLOUT4_PLAYSTYLE_MODS` tier_min values to be more nuanced (some visual mods should require "high" tier not just "mid" based on GPU gen)

#### Frontend — Hardware Badge Enhancement
- **`spec-input.component.ts`**: After analyzing specs, show the computed tier as a colored badge (Low=red, Mid=yellow, High=green, Ultra=purple) with a breakdown tooltip showing subscores
- **`specs.model.ts`**: Add `tier?: string`, `tier_scores?: { vram: number, cpu: number, ram: number, gpu_gen: number, overall: number }` to `SpecsParseResponse`

---

## 3. UI Redesign — Dynamic Gaming Themes

### Problem
- Current UI is generic dark theme with indigo accents — looks like a SaaS dashboard, not a gaming app
- Game cards show just a letter icon, no game imagery or atmosphere
- Buttons are generic ("Build Modlist", "Create New Modlist") — not immersive

### Changes

#### Global Styles — Theme System
- **`styles.scss`**: Add two theme classes (`.theme-skyrim`, `.theme-fallout`) that override CSS variables:
  - **Skyrim theme**: Nordic blue/silver palette. `--color-primary: #4a8db7` (frost blue), `--color-primary-hover: #3a7ca5`, `--color-bg-dark: #0a0f1a` (deep night), `--color-bg-card: #111827` (darker card), `--color-accent: #c9a84c` (gold accent)
  - **Fallout theme**: Wasteland green/amber palette. `--color-primary: #4ade80` (pip-boy green), `--color-primary-hover: #22c55e`, `--color-bg-dark: #0c0f0a` (wasteland dark), `--color-bg-card: #141a12`, `--color-accent: #f59e0b` (radiation amber)
  - Default (no game selected): Keep a neutral dark gaming theme with slightly warmer tones than current indigo
- Add gaming fonts: Import "Rajdhani" (tech/gaming feel) as heading font, keep Inter for body

#### Header Redesign
- **`header.component.ts`**:
  - Rename nav links for gaming context: "HQ" (dashboard), "New Build" (setup), "Armory" (downloads), "Config" (settings)
  - Add a subtle glow effect on the logo
  - Add theme class binding based on a shared theme service

#### Theme Service
- **Create `frontend/src/app/core/services/theme.service.ts`**: Injectable singleton that manages current theme. Exposes `setTheme(game: 'skyrim' | 'fallout' | 'none')` and `currentTheme` signal. Applies/removes theme classes on `document.body`

#### Dashboard Redesign
- **`dashboard.component.ts`**:
  - Hero section: Replace generic "Welcome to Modify" with bolder gaming copy: "Forge Your Perfect Modlist"
  - Game cards: Full-width banner-style cards with game-specific CSS gradients (blue/silver for Skyrim, green/amber for Fallout). Show version tags (SE/AE, Standard/Next-Gen)
  - Button labels: "Forge Modlist" instead of "Build Modlist", "Begin Setup" instead of "Create New Modlist"
  - Feature section: Use gaming-themed icons (shield, sword, scroll, download) via CSS/SVG instead of plain numbers

#### Setup Wizard Redesign
- **`game-select.component.ts`**: Larger game cards with gradient backgrounds and game-specific styling. After game click, show version selection sub-step with styled version cards
- **`spec-input.component.ts`**: Add the tier badge display. Button: "Scan Hardware" instead of "Analyze Specs". "Lock In" instead of "Continue"
- **`playstyle-select.component.ts`**: Style playstyle cards with game-themed accents. Button: "Forge Modlist" instead of "Generate Modlist"

#### Modlist Page Redesign
- **`modlist.component.ts`**:
  - Header: "Your Loadout" instead of "Your Modlist"
  - Button: "Download All" → "Deploy Mods"
  - Mod cards: Add category color indicators, subtle game-themed border accents
  - Toggle: "ON/OFF" → styled switch with "Active/Disabled" labels

#### Downloads Page
- **`downloads.component.ts`**:
  - Progress bar: Game-themed colors (frost blue or pip-boy green)
  - Button context: Add "Return to Loadout" link

#### Settings Page
- **`settings.component.ts`**:
  - Title: "Configuration" with gear icon
  - Section headers with subtle game-themed accents

---

## File Change Summary

### New Files
1. `backend/app/services/tier_classifier.py` — Multi-factor hardware classification
2. `frontend/src/app/core/services/theme.service.ts` — Dynamic theme management

### Modified Files (Backend — 8 files)
3. `backend/app/models/game.py` — Add `versions` JSON field
4. `backend/app/models/mod.py` — Add `game_version_support` field
5. `backend/app/schemas/modlist.py` — Add `game_version` to request
6. `backend/app/schemas/specs.py` — Add `cpu_cores`, `cpu_speed_ghz`, tier fields
7. `backend/app/services/spec_parser.py` — Parse CPU cores/speed
8. `backend/app/services/modlist_generator.py` — Version filtering, tier-aware prompts
9. `backend/app/api/modlist.py` — Pass version, return tier info
10. `backend/app/seeds/seed_data.py` — Version metadata, expanded mod database

### Modified Files (Frontend — 11 files)
11. `frontend/src/styles.scss` — Theme system, gaming fonts, CSS variables
12. `frontend/src/app/shared/models/game.model.ts` — Add versions to Game
13. `frontend/src/app/shared/models/specs.model.ts` — Add tier info
14. `frontend/src/app/shared/components/header/header.component.ts` — Gaming nav, theme binding
15. `frontend/src/app/core/services/api.service.ts` — game_version param
16. `frontend/src/app/features/dashboard/dashboard.component.ts` — Full redesign
17. `frontend/src/app/features/setup/setup.component.ts` — Track version, theme switching
18. `frontend/src/app/features/setup/steps/game-select/game-select.component.ts` — Version selection, themed cards
19. `frontend/src/app/features/setup/steps/spec-input/spec-input.component.ts` — Tier badge, gaming buttons
20. `frontend/src/app/features/setup/steps/playstyle-select/playstyle-select.component.ts` — Themed cards, gaming buttons
21. `frontend/src/app/features/modlist/modlist.component.ts` — Gaming terminology, themed cards
22. `frontend/src/app/features/downloads/downloads.component.ts` — Themed progress
23. `frontend/src/app/features/settings/settings.component.ts` — Gaming terminology

**Total: 2 new files + 21 modified files = 23 files**

## 4. Deployment — Railway → Render Migration

### Problem
- Railway deployment relied on Docker Compose, nginx reverse proxy, and container networking
- nginx added complexity for a static Angular SPA that doesn't need a runtime server
- Docker builds were slower and harder to debug than native runtimes

### Changes

#### Removed Files
- `docker-compose.yml` — no longer needed for deployment
- `backend/Dockerfile`, `backend/.dockerignore` — replaced by Render's native Python runtime
- `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/docker-entrypoint.sh` — replaced by Render's static site hosting

#### Render Blueprint (`render.yaml`)
- **PostgreSQL 16** database (`moddersomni-db`) — Render managed, internal access only
- **Backend** — Python 3.12 native runtime. Render provides `PORT` env var. Start command transforms Render's `postgres://` connection string to `postgresql+asyncpg://` format. Pre-deploy command runs seed script.
- **Frontend** — Static site. Build command generates `env-config.js` with `API_URL` from env var before Angular production build. Render handles SPA routing via rewrite rules (no nginx needed). Asset caching headers configured in blueprint.

#### Environment Variables
- `DATABASE_URL_RAW` auto-populated from Render's database reference, transformed at runtime to asyncpg format
- `SECRET_KEY` auto-generated by Render
- API keys and OAuth secrets set manually in Render dashboard (`sync: false`)
- `API_URL` on frontend set to backend's public Render URL + `/api`
- `CORS_ORIGINS` and `FRONTEND_URL` on backend set to frontend's public Render URL

#### Frontend `env-config.js` Injection
- Previously: Docker entrypoint script generated `env-config.js` at container start (runtime injection)
- Now: Render build command generates `env-config.js` before `ng build` (build-time injection)
- `ApiService` reads `window.__env.API_URL` unchanged — no application code changes needed
- Local dev still uses `proxy.conf.json` with `/api` fallback

---

## Implementation Order
1. Backend data model changes (Game versions, Mod version support, Specs enhancements)
2. Tier classifier service (new)
3. Seed data expansion (new mods, version metadata)
4. Modlist generator updates (version filtering, tier-aware prompts)
5. API route updates
6. Frontend theme service + global styles
7. Frontend model updates
8. Component redesigns (dashboard → setup wizard → modlist → downloads → settings → header)
9. Integration testing
