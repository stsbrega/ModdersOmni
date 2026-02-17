from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.game import Game
from app.models.playstyle import Playstyle
from app.schemas.game import GameResponse, PlaystyleResponse

router = APIRouter()


@router.get("/", response_model=list[GameResponse])
async def list_games(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Game))
    games = result.scalars().all()
    return games


@router.get("/{game_id}/playstyles", response_model=list[PlaystyleResponse])
async def list_playstyles(game_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Playstyle).where(Playstyle.game_id == game_id)
    )
    playstyles = result.scalars().all()
    return playstyles
