import uuid
from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime

from app.database import Base


class Modlist(Base):
    __tablename__ = "modlists"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"))
    playstyle_id: Mapped[int] = mapped_column(ForeignKey("playstyles.id"))
    hardware_tier: Mapped[str | None] = mapped_column(String(10), nullable=True)
    gpu_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cpu_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ram_gb: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vram_mb: Mapped[int | None] = mapped_column(Integer, nullable=True)
    llm_provider: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    entries: Mapped[list["ModlistEntry"]] = relationship(back_populates="modlist")


class ModlistEntry(Base):
    __tablename__ = "modlist_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    modlist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("modlists.id")
    )
    mod_id: Mapped[int] = mapped_column(ForeignKey("mods.id"))
    load_order: Mapped[int | None] = mapped_column(Integer, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    download_status: Mapped[str] = mapped_column(String(20), default="pending")

    modlist: Mapped["Modlist"] = relationship(back_populates="entries")
