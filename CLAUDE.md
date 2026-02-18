# CLAUDE.md

## Project Overview

Modify is an AI-powered game modding assistant that generates personalized mod lists based on hardware specs and gameplay preferences. It targets Skyrim SE/AE and Fallout 4.

## Tech Stack

- **Frontend**: Angular 19.2 (standalone components) + Tailwind CSS 4 + TypeScript 5.7
- **Backend**: Python 3.12 + FastAPI 0.115 + SQLAlchemy 2.0 + Pydantic 2
- **Database**: PostgreSQL 16 (via asyncpg)
- **Migrations**: Alembic (no migrations yet — seed script uses `create_all`)
- **LLM**: OpenAI-compatible client (`openai` SDK) — supports Ollama (local), Groq, Together AI, HuggingFace (cloud)
- **Mod API**: Nexus Mods v2 GraphQL API + optional custom mod source
- **Deployment**: Docker Compose (local), Railway (production)
- **License**: GPL-3.0

## Project Structure

```
backend/
  app/
    api/              # FastAPI route handlers
      games.py        #   GET /games/, GET /games/{game_id}/playstyles
      specs.py        #   POST /specs/parse
      modlist.py      #   POST /modlist/generate, GET /modlist/{modlist_id}
      downloads.py    #   POST /downloads/start, GET /downloads/{id}/status, WS /downloads/{id}/ws
      settings.py     #   GET /settings/, PUT /settings/
    models/           # SQLAlchemy ORM models
      game.py         #   Game
      playstyle.py    #   Playstyle
      mod.py          #   Mod
      modlist.py      #   ModList
      compatibility.py#   CompatibilityRule
      playstyle_mod.py#   PlaystyleMod (junction table)
    schemas/          # Pydantic request/response schemas (game, modlist, specs)
    services/         # Business logic
      spec_parser.py  #   Hardware text parsing (regex-based)
      tier_classifier.py # GPU/CPU tier classification (low/mid/high/ultra)
      modlist_generator.py # LLM-powered mod list generation (with DB fallback)
      nexus_client.py #   Nexus Mods v2 GraphQL client
      custom_source_client.py # Generic custom mod source API client
      download_manager.py # Async mod download orchestration
    llm/              # LLM provider abstraction (OpenAI-compatible)
    seeds/            # Database seed data (run_seed.py, seed_data.py)
    config.py         # Settings via pydantic-settings
    database.py       # SQLAlchemy async engine setup
    main.py           # FastAPI app entry point
  alembic/            # Migration config (versions/ is empty)
  tests/              # pytest + pytest-asyncio (SQLite in-memory test DB)
  .env.example        # Environment variable reference

frontend/
  src/app/
    core/
      services/       # ApiService, NotificationService
      interceptors/   # ErrorInterceptor
    shared/
      components/     # header, hardware-badge, notification-toast
      models/         # TypeScript interfaces (game, mod, specs)
    features/
      dashboard/      # Main dashboard view
      setup/          # Hardware setup wizard
        steps/        #   game-select, playstyle-select, spec-input sub-components
      modlist/        # Generated mod list view
      downloads/      # Download progress view
      settings/       # User settings view
    app.routes.ts     # Top-level routing
    app.config.ts     # App config (providers, errorInterceptor)
  nginx.conf          # Nginx template (uses ${PORT} substitution)
  docker-entrypoint.sh # Runtime env injection (PORT, API_URL)
```

## Common Commands

### Backend (run from `backend/`)

```bash
pip install -r requirements.txt        # Install dependencies
uvicorn app.main:app --reload           # Dev server (localhost:8000)
pytest tests/ -v                        # Run tests
ruff check app/                         # Lint
black app/                              # Format
mypy app/ --ignore-missing-imports --no-strict-optional  # Type check
alembic upgrade head                    # Run migrations
python -m app.seeds.run_seed            # Seed database (also creates tables via create_all)
```

### Frontend (run from `frontend/`)

```bash
npm install                             # Install dependencies
npm start                               # Dev server (localhost:4200)
npm run build                           # Production build
npm test                                # Run Karma/Jasmine tests
```

### Docker (run from repo root)

```bash
docker-compose up -d                    # Start full stack
# Frontend: http://localhost:4200
# Backend:  http://localhost:8000
# Swagger:  http://localhost:8000/docs
```

**Note**: Backend Dockerfile hardcodes port 8080 (for Railway). docker-compose maps `8000:8000` for local dev, so the dev server uses uvicorn directly (not Docker) on port 8000.

## Code Conventions

### Backend
- Follow PEP 8; use `black` for formatting and `ruff` for linting
- Async endpoints throughout (async def, await)
- Models in `models/`, Pydantic schemas in `schemas/`, business logic in `services/`
- API routes prefixed with `/api/`
- Environment config via `.env` file (see `backend/.env.example`)
- Settings API persists to a local `user_settings.json` file
- LLM modlist generation falls back to curated DB mods if LLM call fails

### Frontend
- Angular 19 standalone component API (no NgModules)
- Feature components use inline templates/styles (single `.ts` files)
- Feature-based folder organization under `features/`
- Shared reusable components under `shared/components/`
- Core singleton services under `core/services/`
- Tailwind CSS for styling; SCSS for component-level styles
- Models defined as TypeScript interfaces in `shared/models/`
- API base URL: reads `window.__env.API_URL` (Docker) with fallback to `http://localhost:8000/api`

## API Endpoints

- `GET  /api/health` — Health check
- `GET  /api/games/` — List supported games
- `GET  /api/games/{game_id}/playstyles` — Playstyles for a game
- `POST /api/specs/parse` — Parse hardware specs text
- `POST /api/modlist/generate` — Generate AI-powered mod list
- `GET  /api/modlist/{modlist_id}` — Retrieve mod list
- `POST /api/downloads/start` — Start downloading mods
- `GET  /api/downloads/{modlist_id}/status` — Download progress
- `WS   /api/downloads/{modlist_id}/ws` — Real-time download progress (WebSocket)
- `GET  /api/settings/` — Get user settings
- `PUT  /api/settings/` — Update user settings

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to main:
- Backend: ruff lint, mypy type check (continue-on-error), pytest (continue-on-error)
- Frontend: ng lint (continue-on-error), production build
- Docker: Compose config validation (push to main only)

Community files: `.github/CONTRIBUTING.md`, `.github/ISSUE_TEMPLATE/` (bug_report, feature_request)

## Content Filtering Note

When generating code or text related to custom mod sources, use generic terms like "custom mod source" or "Custom API Source" rather than naming specific adult content sites. The Anthropic API will block responses containing explicit site references.

---

# Memory

## Me
Salvatore (Sal) Sbrega, based in Vancouver, BC. Finance & FP&A professional (7+ years at TD Bank), building the Modify app as a side project.

## People
| Who | Role |
|-----|------|
| **Cindy** | Cindy Nicole Ngo, partner |
| **Denise** | Denise @ Mai Real Estate Group |
| **Thu** | Thu Peng, counselor at RCAV |

> Full list: memory/glossary.md, profiles: memory/people/

## Terms
| Term | Meaning |
|------|---------|
| APMCI | Atlantic Plastics & Metal Crafts, Inc. (Philippines) |
| ERP | Enterprise Resource Planning (APMCI project) |
| FP&A | Financial Planning & Analysis |
| CSBFL | Canada Small Business Financing Loan |
| SE/AE | Skyrim Special/Anniversary Edition |
| Nexus | Nexus Mods API |

> Full glossary: memory/glossary.md

## Projects
| Name | What |
|------|------|
| **Modify** | AI game modding assistant (Angular + FastAPI) — active |
| **APMCI ERP** | ERP system for injection moulding co. in Philippines — research phase |

> Details: memory/projects/

## Preferences
- Based in Vancouver, BC
- Frequent Vancouver dining spots (Cactus Club, Nook, Bufala, Din Tai Fung)
- Flies Air Canada and Delta
