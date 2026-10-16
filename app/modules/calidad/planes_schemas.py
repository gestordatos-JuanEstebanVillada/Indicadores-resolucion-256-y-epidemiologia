from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

ESTADOS_PLAN_PERMITIDOS = ("PENDIENTE", "CUMPLIDO", "NO_CUMPLIDO")


class IncumplimientoOut(BaseModel):
    calidad_id: int
    modulo: str
    year: int
    mes: int
    mes_nombre: str
    indicador: str
    meta_institucional: Optional[str] = None
    valor_obtenido: float
    mensaje: str


class PlanMejoraCreate(BaseModel):
    calidad_id: int
    modulo: str
    year: int = Field(ge=2000, le=2100)
    mes: int = Field(ge=1, le=12)
    valor_obtenido: Optional[float] = None
    meta_institucional: Optional[str] = None
    observaciones: str = Field(min_length=1)
    responsable_nombre: str = Field(min_length=1, max_length=250)
    responsable_correo: str = Field(min_length=5, max_length=250)
    fecha_cumplimiento: date

    @field_validator("responsable_correo")
    @classmethod
    def validate_correo(cls, value: str) -> str:
        correo = value.strip()
        if "@" not in correo or "." not in correo.split("@")[-1]:
            raise ValueError("Correo electrónico inválido")
        return correo


class PlanMejoraListadoOut(BaseModel):
    id: int
    calidad_id: int
    modulo: str
    year: int
    mes: int
    mes_nombre: str
    indicador: str
    valor_obtenido: Optional[float] = None
    meta_institucional: Optional[str] = None
    observaciones: str
    responsable_nombre: str
    responsable_correo: str
    fecha_cumplimiento: date
    estado: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PlanEstadoMasivoUpdate(BaseModel):
    plan_ids: list[int] = Field(min_length=1)
    nuevo_estado: Literal["CUMPLIDO", "NO_CUMPLIDO"]


class PlanEstadoMasivoResponse(BaseModel):
    message: str
    actualizados: int


class PlanMejoraOut(BaseModel):
    id: int
    calidad_id: int
    modulo: str
    year: int
    mes: int
    valor_obtenido: Optional[float] = None
    meta_institucional: Optional[str] = None
    observaciones: str
    responsable_nombre: str
    responsable_correo: str
    fecha_cumplimiento: date
    estado: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
