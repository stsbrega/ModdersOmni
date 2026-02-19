# Modify App — Product Roadmap

> **Format**: Now / Next / Later
> **Last updated**: February 17, 2026
> **Owner**: Sal

---

## Status Overview

- **In Progress**: 3 items (core feature work from PLAN.md)
- **Not Started**: 11 items
- **Completed**: 1 item (Render migration)

---

## NOW — Ship the Core Experience

_Goal: Get the end-to-end mod generation and download flow working reliably, with version-aware intelligence and a polished UI. This is the foundation everything else builds on._

| # | Item | Description | Status | Dependencies | Notes |
|---|------|-------------|--------|--------------|-------|
| 1 | **Game Version–Aware Mod Selection** | Add version fields to Game/Mod models, filter mods by SE/AE and Standard/Next-Gen compatibility, update LLM prompt with version context | **In Progress** | None | PLAN.md §1. Requires seed data expansion and schema migration |
| 2 | **Multi-Factor Hardware Tier Classifier** | Replace VRAM-only tiers with scored system (GPU gen + VRAM + CPU + RAM). `tier_classifier.py` exists — needs integration with modlist generator and frontend display | **In Progress** | None | PLAN.md §2. Service file created; needs wiring to API responses and UI badge |
| 3 | **Gaming-Themed UI Redesign** | Dynamic Skyrim/Fallout themes, gaming typography, immersive copy ("Forge Modlist", "Your Loadout"), gradient game cards, tier badge display | **In Progress** | Items 1–2 (version cards, tier badge) | PLAN.md §3. Theme service + 11 frontend component updates |
| 4 | **Alembic Migration Setup** | Replace `create_all` with proper Alembic migrations for all model changes (versions, game_version_support, etc.) | **Not Started** | Item 1 (model changes) | Currently seed script uses `create_all`. Need migration history before any production deploy. Pre-deploy command in `render.yaml` runs seed script on each deploy. |
| 5 | **Test Coverage Expansion** | Add tests for tier classifier, version-filtered mod selection, spec parser CPU parsing, and API endpoint integration tests | **Not Started** | Items 1–2 | Only `test_health.py` and `test_spec_parser.py` exist today. CI runs pytest with continue-on-error |

---

## NEXT — Polish, Reliability & UX

_Goal: Make the app feel solid and trustworthy. Improve error handling, onboarding clarity, and download reliability before expanding scope._

| # | Item | Description | Status | Dependencies | Notes |
|---|------|-------------|--------|--------------|-------|
| 6 | **Download Manager Hardening** | Retry logic, partial download recovery, progress persistence across page reloads, WebSocket reconnection handling | **Not Started** | NOW items complete | `download_manager.py` exists but needs resilience for real-world use |
| 7 | **Onboarding & Empty States** | First-run tutorial, contextual tooltips for spec input, empty state designs for modlist/downloads pages, loading skeletons | **Not Started** | Item 3 (UI redesign) | Users need guidance — spec input is the biggest friction point |
| 8 | **LLM Provider Flexibility** | Settings UI for switching between Ollama (local), Groq, Together AI, HuggingFace. Test and document each provider's behavior. Add model selection dropdown | **Not Started** | None | Backend supports OpenAI-compatible client; frontend settings page exists but needs provider config UI |
| 9 | **Nexus Mods Integration Polish** | Rate limiting, caching, error handling for GraphQL API. Show real mod thumbnails, descriptions, and endorsement counts from Nexus in the modlist view | **Not Started** | NOW items complete | `nexus_client.py` exists. Currently mod data is mostly from seed DB |
| 10 | **CI/CD Hardening** | Remove `continue-on-error` from CI jobs, add frontend unit tests to pipeline, set up Render preview environments for PRs | **Not Started** | Item 5 (tests) | CI exists but most checks are soft-fail. Docker build validation removed from CI — no longer using Docker. |

---

## LATER — Expand & Grow

_Goal: Broaden game support, add community features, and build toward a user base._

| # | Item | Description | Status | Dependencies | Notes |
|---|------|-------------|--------|--------------|-------|
| 11 | **Additional Game Support** | Add Starfield, Baldur's Gate 3, Cyberpunk 2077 (or other moddable titles). Requires new seed data, game-specific version handling, and theme variants | **Not Started** | NEXT items complete | Architecture supports it (Game model is generic). Main work is seed data + themes per game |
| 12 | **User Accounts & Saved Mod Lists** | Authentication (OAuth or email), persistent mod list history, re-generate from saved specs, user preferences | **Not Started** | Item 4 (migrations) | Auth backend (JWT, OAuth Google/Discord, email verification) already implemented. Frontend auth flows exist. Needs production OAuth provider registration with Render URLs. |
| 13 | **Mod List Sharing & Community** | Shareable mod list URLs, public gallery of curated lists, upvote/comment system, "fork a modlist" feature | **Not Started** | Item 12 (user accounts) | Community features depend on having user identity |
| 14 | **Mod Conflict Detection** | Automated compatibility checking using `CompatibilityRule` model (already in schema). Warn users about known conflicts, suggest load order | **Not Started** | Item 1 (version awareness) | `compatibility.py` model exists but has no data or logic yet. High value for power users |

---

## Risks & Dependencies

| Risk | Impact | Mitigation |
|------|--------|------------|
| **No Alembic migrations** | Can't safely evolve the DB schema in production | Prioritize Item 4 immediately after model changes land |
| **Low test coverage** | Regressions likely as features stack up; CI is soft-fail | Item 5 should run in parallel with NOW work, not after |
| **LLM reliability** | Modlist generation depends on external LLM call; failures fall back to curated DB mods | Fallback exists but quality gap is large. Monitor failure rates |
| **Nexus API rate limits** | Could block download flow for users generating large mod lists | Add caching and queuing in Item 9 |
| **Single-developer capacity** | 14 items across all horizons is ambitious for a solo project | Focus ruthlessly on NOW. Don't start NEXT until NOW ships |
| **No local Ollama on Render** | Can't use free local LLM — must use cloud provider (Groq, Together AI, etc.) | `LLM_PROVIDER` defaults to `groq` in render.yaml. Free tier sufficient for dev/early usage |

---

## What's Not on the Roadmap (and Why)

- **Mobile app**: Desktop-first makes sense for a PC modding tool. Revisit only if community demand emerges.
- **Mod auto-installation**: Too risky (mod managers like MO2/Vortex handle this). Modify should recommend, not install.
- **Paid tier / monetization**: Premature. Build the community first. GPL-3.0 license keeps it open.

---

## Completed

| # | Item | Description | Completed | Notes |
|---|------|-------------|-----------|-------|
| — | **Railway → Render Migration** | Migrated all three services (frontend, backend, PostgreSQL) from Railway to Render. Removed Docker/nginx complexity. Backend runs on native Python 3.12 runtime. Frontend deployed as static site with build-time env injection. Infrastructure defined in `render.yaml` blueprint. | 2026-02-19 | See PLAN.md §4. Removed: `docker-compose.yml`, `backend/Dockerfile`, `backend/.dockerignore`, `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/docker-entrypoint.sh` |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-02-19 | Migrated deployment from Railway to Render. Removed Docker files. Added `render.yaml` blueprint. Updated PLAN.md §4. |
| 2026-02-17 | Initial roadmap created. 14 items across Now/Next/Later. |
