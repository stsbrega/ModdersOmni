# CLAUDE.md

## Project Overview

Modify is an AI-powered game modding assistant that generates personalized mod lists based on hardware specs and gameplay preferences. It targets Skyrim SE/AE and Fallout 4.

## Tech Stack

- **Frontend**: Angular 19 (standalone components) + Tailwind CSS 4 + TypeScript 5.7
- **Backend**: Python 3.12 + FastAPI + SQLAlchemy 2.0 + Pydantic 2
- **Database**: PostgreSQL 16 (via asyncpg)
- **Migrations**: Alembic
- **LLM**: Supports Ollama (local), Groq, Together AI, HuggingFace (cloud)
- **License**: GPL-3.0

## Project Structure

```
backend/
  app/
    api/          # FastAPI route handlers (games, specs, modlist, downloads, settings)
    models/       # SQLAlchemy ORM models
    schemas/      # Pydantic request/response schemas
    services/     # Business logic (nexus client, download manager, spec parser, etc.)
    llm/          # LLM provider abstraction
    seeds/        # Database seed data
    config.py     # Settings via pydantic-settings
    database.py   # SQLAlchemy async engine setup
    main.py       # FastAPI app entry point
  alembic/        # Migration scripts
  tests/          # pytest tests

frontend/
  src/app/
    core/         # Singleton services (ApiService, NotificationService), interceptors
    shared/       # Reusable components (header, hardware-badge, notification-toast) and models
    features/     # Feature modules (dashboard, setup, modlist, downloads, settings)
    app.routes.ts # Top-level routing
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
python -m app.seeds.run_seed            # Seed database
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

## Code Conventions

### Backend
- Follow PEP 8; use `black` for formatting and `ruff` for linting
- Async endpoints throughout (async def, await)
- Models in `models/`, Pydantic schemas in `schemas/`, business logic in `services/`
- API routes prefixed with `/api/`
- Environment config via `.env` file (see `.env.example`)

### Frontend
- Angular 19 standalone component API (no NgModules)
- Feature-based folder organization under `features/`
- Shared reusable components under `shared/components/`
- Core singleton services under `core/services/`
- Tailwind CSS for styling; SCSS for component-level styles
- Models defined as TypeScript interfaces in `shared/models/`

## API Endpoints

- `GET  /api/health` — Health check
- `GET  /api/games/` — List supported games
- `GET  /api/games/{gameId}/playstyles` — Playstyles for a game
- `POST /api/specs` — Parse hardware specs text
- `POST /api/modlist/generate` — Generate AI-powered mod list
- `GET  /api/modlist/{modlistId}` — Retrieve mod list
- `POST /api/downloads/start` — Start downloading mods
- `GET  /api/downloads/{modlistId}/status` — Download progress
- `GET  /api/settings/` — Get user settings
- `PUT  /api/settings/` — Update user settings

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to main:
- Backend: ruff lint, mypy type check, pytest
- Frontend: lint, production build
- Docker Compose config validation

## Content Filtering Note

When generating code or text related to custom mod sources, use generic terms like "custom mod source" or "Custom API Source" rather than naming specific adult content sites. The Anthropic API will block responses containing explicit site references.
