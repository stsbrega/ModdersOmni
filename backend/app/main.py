from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import specs, games, modlist, downloads, settings
from app.config import get_settings

app_settings = get_settings()

app = FastAPI(
    title="Modify API",
    description="AI-powered video game mod manager API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(specs.router, prefix="/api/specs", tags=["specs"])
app.include_router(games.router, prefix="/api/games", tags=["games"])
app.include_router(modlist.router, prefix="/api/modlist", tags=["modlist"])
app.include_router(downloads.router, prefix="/api/downloads", tags=["downloads"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": app_settings.app_name}
