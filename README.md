# ModdersOmni

AI-powered video game mod manager that analyzes your PC hardware and builds custom, stable modlists tailored to your playstyle.

## Features

- **Hardware-Aware Modlists** — Paste your PC specs and a multi-factor scoring engine classifies your hardware across four dimensions (GPU generation, VRAM, CPU, RAM) into performance tiers (Low / Mid / High / Ultra)
- **Game Version Awareness** — Mod filtering respects game editions: Skyrim SE vs AE, Fallout 4 Standard vs Next-Gen. Incompatible mods are excluded automatically
- **Playstyle Presets** — Choose from popular playstyles (Survival, Combat Overhaul, Visual Enhancement, etc.) and get a curated modlist
- **AI-Powered Curation** — Uses open-source LLMs (local via Ollama or free cloud APIs) to generate compatible, conflict-free modlists tuned to your hardware and version
- **User Accounts** — Register/login with email or OAuth (Google, Discord). Save modlists, store hardware profiles, and manage per-user settings
- **Nexus Mods Integration** — Search, browse, and download mods directly via the Nexus Mods GraphQL API
- **One-Click Downloads** — Download your entire modlist with progress tracking

## Supported Games

- The Elder Scrolls V: Skyrim Special Edition / Anniversary Edition
- Fallout 4 Standard / Next-Gen Update

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 19, Tailwind CSS |
| Backend | Python 3.12, FastAPI |
| Database | PostgreSQL 16 |
| AI/LLM | Ollama (local), Groq, Together AI, HuggingFace (cloud) |
| Auth | JWT + refresh tokens, OAuth 2.0 (Google, Discord) |
| Mod APIs | Nexus Mods v2 (GraphQL) |
| Hosting | Render (static site + Python runtime + managed DB) |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+ (frontend)
- [Python](https://www.python.org/) 3.11+ (backend)
- [PostgreSQL](https://www.postgresql.org/) 16 (or use a cloud instance)
- A [Nexus Mods](https://www.nexusmods.com/) account (free API key)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Linux/Mac
# .venv\Scripts\activate    # Windows
pip install -r requirements.txt
```

Create a `.env` file in `backend/` (see [Environment Variables](#environment-variables) below), then:

```bash
python -m app.seeds.run_seed   # Seed database with games, mods, playstyles
uvicorn app.main:app --reload  # Start dev server on :8000
```

### Frontend

```bash
cd frontend
npm install
ng serve   # Start dev server on :4200 (proxies /api to :8000)
```

- Frontend: http://localhost:4200
- Backend API: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (`postgresql+asyncpg://user:pass@host/db`) |
| `SECRET_KEY` | Yes | JWT signing key (random string) |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `FRONTEND_URL` | Yes | Frontend base URL (for email links) |
| `LLM_PROVIDER` | No | `ollama`, `groq`, `together`, or `huggingface` (default: `groq`) |
| `GROQ_API_KEY` | If using Groq | Groq API key |
| `TOGETHER_API_KEY` | If using Together | Together AI API key |
| `HUGGINGFACE_API_KEY` | If using HF | HuggingFace API key |
| `NEXUS_API_KEY` | Yes | Nexus Mods API key |
| `GOOGLE_CLIENT_ID` | For OAuth | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For OAuth | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | For OAuth | Google OAuth callback URL |
| `DISCORD_CLIENT_ID` | For OAuth | Discord OAuth client ID |
| `DISCORD_CLIENT_SECRET` | For OAuth | Discord OAuth client secret |
| `DISCORD_REDIRECT_URI` | For OAuth | Discord OAuth callback URL |
| `SMTP_HOST` | For email | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | For email | SMTP port (e.g. `587`) |
| `SMTP_USER` | For email | SMTP username |
| `SMTP_PASSWORD` | For email | SMTP password / app password |

## LLM Configuration

ModdersOmni supports multiple LLM providers. Choose one based on your setup:

| Provider | Cost | Requirements | Model |
|----------|------|-------------|-------|
| Ollama (Local) | Free | 8GB+ RAM, local install | llama3.1:8b, mistral:7b |
| Groq | Free tier | API key | llama-3.3-70b-versatile |
| Together AI | Free tier | API key | Llama-3.3-70B-Instruct-Turbo-Free |
| HuggingFace | Free tier | API key | Various |

Configure your preferred provider in the Settings page or via `backend/.env`.

## Project Structure

```
ModdersOmni/
├── backend/                # FastAPI backend
│   ├── app/
│   │   ├── api/            # Route handlers (auth, specs, modlist, games, etc.)
│   │   ├── llm/            # LLM provider abstraction (OpenAI-compatible)
│   │   ├── models/         # SQLAlchemy ORM models (12 models)
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── services/       # Business logic (tier classifier, spec parser, modlist generator, etc.)
│   │   └── seeds/          # Database seed data (games, mods, playstyles)
│   ├── tests/              # pytest test suite
│   └── alembic/            # Database migrations
├── frontend/               # Angular 19 SPA
│   └── src/app/
│       ├── core/           # Singleton services, guards, interceptors
│       ├── shared/         # Reusable components (header, footer) and models
│       └── features/       # Feature modules
│           ├── auth/       # Login, register, OAuth, email verification, password reset
│           ├── landing/    # Home page
│           ├── setup/      # Multi-step wizard (game → version → specs → playstyle)
│           ├── dashboard/  # User dashboard with saved modlists
│           ├── modlist/    # Generated modlist view
│           ├── downloads/  # Download tracking
│           ├── browse/     # Browse mods
│           └── settings/   # User & LLM provider settings
├── .github/
│   ├── workflows/ci.yml    # CI pipeline (lint, type-check, test, build)
│   ├── CONTRIBUTING.md
│   └── ISSUE_TEMPLATE/     # Bug report & feature request templates
├── render.yaml             # Render deployment blueprint
├── COMETOPASS.md           # Project roadmap (Now / Next / Later)
└── WAS.md                  # Implementation log
```

## Deployment

ModdersOmni is deployed on [Render](https://render.com/) using the `render.yaml` blueprint:

- **Frontend** — Static site with SPA rewrite rules. Build-time `env-config.js` injection for API URL
- **Backend** — Python 3.12 native runtime. Pre-deploy seed script runs on each deploy
- **Database** — Render-managed PostgreSQL 16

To deploy your own instance, click the button below or import `render.yaml` from your fork:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

After deploy, set the `sync: false` environment variables (API keys, OAuth secrets, SMTP credentials) in the Render dashboard.

## Roadmap

See [COMETOPASS.md](COMETOPASS.md) for the full roadmap. Summary:

### Completed
- Game version-aware mod selection (SE/AE, Standard/Next-Gen)
- Multi-factor hardware tier classifier (GPU gen + VRAM + CPU + RAM scoring)
- User accounts with JWT auth, OAuth (Google/Discord), email verification
- Railway to Render deployment migration

### In Progress
- Gaming-themed UI redesign (dynamic Skyrim/Fallout themes)

### Up Next
- Alembic migration setup (replace `create_all`)
- Test coverage expansion (tier classifier, version filtering, integration tests)
- Download manager hardening (retry, partial recovery, WebSocket reconnect)
- Onboarding and empty states
- LLM provider settings UI
- Nexus Mods integration polish (thumbnails, caching, rate limiting)
- CI/CD hardening

### Future
- Additional game support (Starfield, Baldur's Gate 3, Cyberpunk 2077)
- Mod list sharing and community features
- Automated mod conflict detection

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the GPL-3.0 License — see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Nexus Mods](https://www.nexusmods.com/) for their modding platform and API
- [LOOT](https://loot.github.io/) for load order optimization research
- [Ollama](https://ollama.ai/) for local LLM inference
- [Render](https://render.com/) for hosting
