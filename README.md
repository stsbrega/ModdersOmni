# ModdersOmni

AI-powered video game modding assistant that analyzes your PC hardware and builds custom, stable modlists tailored to your playstyle.

## Features

- **Hardware-Aware Modlists** — Paste your PC specs and ModdersOmni classifies your hardware tier (GPU generation, VRAM, CPU, RAM) to recommend mods your system can handle
- **Game Version Intelligence** — Distinguishes between Skyrim SE/AE and Fallout 4 Standard/Next-Gen to filter mods by compatibility
- **Playstyle Presets** — Choose from popular playstyles (Survival, Combat Overhaul, Visual Enhancement, etc.) and get a curated modlist
- **AI-Powered Curation** — Uses open-source LLMs (local via Ollama or free cloud APIs) to generate compatible, conflict-free modlists
- **Nexus Mods Integration** — Search, browse, and download mods directly via the Nexus Mods v2 GraphQL API
- **User Accounts & OAuth** — Register with email or sign in with Google/Discord, save hardware profiles, and access your modlist history
- **Load Order Management** — Automatic load order sorting based on compatibility rules
- **One-Click Downloads** — Download your entire modlist with real-time progress tracking via WebSockets

## Supported Games

- The Elder Scrolls V: Skyrim Special Edition / Anniversary Edition
- Fallout 4 (Standard / Next-Gen)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 19, Tailwind CSS 4, TypeScript 5.7 |
| Backend | Python 3.12, FastAPI 0.115, SQLAlchemy 2.0, Pydantic 2 |
| Database | PostgreSQL 16 (asyncpg) |
| Auth | JWT + refresh tokens, OAuth (Google, Discord), email verification |
| AI/LLM | Ollama (local), Groq, Together AI, HuggingFace (cloud) — OpenAI-compatible client |
| Mod APIs | Nexus Mods v2 (GraphQL), Custom Sources |
| Deployment | Render (Python runtime, static site, managed PostgreSQL) |

## Live App

ModdersOmni is live at **[moddersomni-web.onrender.com](https://moddersomni-web.onrender.com)**

## Legal Foundation & Methodology

ModdersOmni is built on a legally defensible approach to game modding assistance. This section outlines the principles guiding how the project sources its knowledge and interfaces with game engines.

### Knowledge Base Strategy

The project's knowledge base is built primarily on publicly available, community-validated resources rather than proprietary game code:

- **Official tools**: Bethesda's Creation Kit and its built-in documentation
- **Community documentation**: UESP Wiki, modding.wiki, and extensive community guides
- **Open-source community tools**: CommonLibSSE (class definitions), Address Library (function mappings), Champollion (Papyrus decompilation), xEdit (format documentation), and SKSE
- **Open-source LLMs**: All AI capabilities use openly available models — no proprietary training on copyrighted game code

This existing community knowledge base is substantial enough to build a powerful modding assistant without deep binary reverse engineering.

### Reverse Engineering Policy

When analysis beyond public documentation is necessary, ModdersOmni limits its scope to understanding functional interfaces — data formats, file structures, and API specifications. These elements are generally unprotectable under the idea/expression dichotomy (17 U.S.C. § 102(b); EU Directive Art. 1(2)). The project follows a clean-room methodology separating analysis from implementation, and never distributes reverse-engineered game code — only original code that interfaces with the game.

### Jurisdictional Considerations

The EU provides the strongest legal protections for this type of work through non-waivable decompilation rights for interoperability. The US offers robust fair use precedents. Canada falls in between with narrower exceptions. Across all jurisdictions, a clean-room approach and focus on functional interfaces over copyrighted expression remain the essential risk-mitigation strategies.

### Copyright & Source Code

Bethesda's game source code is protected by copyright until at least 2081 (and potentially 2110 under US law). Voluntary release is unlikely given the commercial value of these titles, middleware licensing constraints, and strategic importance of the Creation Engine. ModdersOmni does not depend on source code access — the combination of existing community knowledge with AI-powered analysis of targeted subsystems delivers substantial value to modders on a solid legal foundation.

## Project Structure

```
moddersomni/
├── backend/             # FastAPI backend
│   ├── app/
│   │   ├── api/         # Route handlers (auth, games, specs, modlist, downloads, settings, stats)
│   │   ├── llm/         # LLM provider abstraction (OpenAI-compatible)
│   │   ├── models/      # SQLAlchemy ORM models
│   │   ├── schemas/     # Pydantic request/response schemas
│   │   ├── services/    # Business logic (auth, email, OAuth, spec parser, tier classifier, modlist generator, Nexus client)
│   │   └── seeds/       # Database seed data
│   ├── alembic/         # Database migrations
│   ├── tests/           # pytest + pytest-asyncio
│   └── .env.example     # Environment variable reference
├── frontend/            # Angular 19 SPA
│   └── src/app/
│       ├── core/        # Services, interceptors, guards
│       ├── shared/      # Reusable components, models
│       └── features/    # Feature modules (landing, dashboard, setup, modlist, downloads, browse, settings, auth)
├── render.yaml          # Render infrastructure blueprint
└── docs/                # Documentation
```

## Deployment

ModdersOmni is deployed on [Render](https://render.com) using a `render.yaml` infrastructure blueprint. The stack consists of a Python 3.12 backend, Angular static site frontend, and managed PostgreSQL 16 database.

To deploy your own instance: push to GitHub, then in Render Dashboard go to Blueprints → New Blueprint Instance. Environment variables marked `sync: false` in `render.yaml` (API keys, OAuth secrets) must be set manually after first deploy.

> **Note**: Ollama (local LLM) does not work on Render — use a cloud provider like Groq or Together AI.

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the GPL-3.0 License — see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Nexus Mods](https://www.nexusmods.com/) for their modding platform and API
- [CommonLibSSE](https://github.com/Ryan-rsm-McKenzie/CommonLibSSE) and [SKSE](https://skse.silverlock.org/) for foundational modding infrastructure
- [LOOT](https://loot.github.io/) for load order optimization research
- [Ollama](https://ollama.ai/) for local LLM inference
- The Bethesda modding community for decades of accumulated knowledge and open-source tooling
