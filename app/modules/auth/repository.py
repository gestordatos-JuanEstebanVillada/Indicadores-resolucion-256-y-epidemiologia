from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Usuario


class AuthRepository:
    def __init__(self, db: Session):
        self.db = db

    def obtener_por_usuario(self, username: str) -> Usuario | None:
        return (
            self.db.query(Usuario)
            .filter(func.upper(func.trim(Usuario.usuario)) == username.strip().upper())
            .first()
        )
