from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import IntranetCalidadRol, Usuario


class AuthRepository:
    def __init__(self, db: Session):
        self.db = db

    def obtener_por_usuario(self, username: str) -> Usuario | None:
        return (
            self.db.query(Usuario)
            .filter(func.upper(func.trim(Usuario.usuario)) == username.strip().upper())
            .first()
        )

    def obtener_rol_indicadores(self, usuario_id: int) -> IntranetCalidadRol | None:
        return self.db.scalar(
            select(IntranetCalidadRol).where(
                IntranetCalidadRol.usuario_id == usuario_id
            )
        )
