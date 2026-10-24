from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import IntranetCalidadRol


class CalidadRolesRepository:
    def __init__(self, db: Session):
        self.db = db

    def obtener_por_usuario_id(self, usuario_id: int) -> IntranetCalidadRol | None:
        return self.db.scalar(
            select(IntranetCalidadRol).where(
                IntranetCalidadRol.usuario_id == usuario_id
            )
        )

    def obtener_todos_por_usuario_id(self) -> dict[int, IntranetCalidadRol]:
        rows = self.db.scalars(select(IntranetCalidadRol)).all()
        return {row.usuario_id: row for row in rows}

    def crear(self, usuario_id: int, rol: str) -> IntranetCalidadRol:
        row = IntranetCalidadRol(usuario_id=usuario_id, rol=rol)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def actualizar_rol(self, row: IntranetCalidadRol, rol: str) -> IntranetCalidadRol:
        row.rol = rol
        self.db.commit()
        self.db.refresh(row)
        return row

    def eliminar(self, row: IntranetCalidadRol) -> None:
        self.db.delete(row)
        self.db.commit()
