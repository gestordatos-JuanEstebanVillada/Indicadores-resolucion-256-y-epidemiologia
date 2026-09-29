"""Shim de compatibilidad: la implementacion real vive en app.core.database
(engine) y app.shared.database (Base declarativa, sessionmaker y get_db).
Se mantiene este modulo para no romper imports existentes
(alembic/env.py, scripts/seed_data.py, scripts/cleanup_data.py)."""

from app.core.config import settings
from app.core.database import engine
from app.shared.database.base import Base
from app.shared.database.session import SessionLocal, get_db

DATABASE_URL = settings.database_url

__all__ = ["Base", "DATABASE_URL", "engine", "SessionLocal", "get_db"]
