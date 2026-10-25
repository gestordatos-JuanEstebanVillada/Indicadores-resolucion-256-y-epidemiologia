from datetime import datetime

from pydantic import BaseModel


class AuditoriaOut(BaseModel):
    id: int
    usuario: str
    accion: str
    modulo: str
    detalle: str
    created_at: datetime | None = None

    class Config:
        from_attributes = True
