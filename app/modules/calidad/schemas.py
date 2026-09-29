from typing import List, Optional

from pydantic import BaseModel


class CalidadRow(BaseModel):
    month: int
    numerador: Optional[float] = 0
    denominador: Optional[float] = 0
    indicador_valor: Optional[float] = 0


class CalidadCreate(BaseModel):
    indicador: Optional[str] = None
    formula: Optional[str] = None
    meta_institucional: Optional[str] = None
    observatorio: Optional[str] = None
    modulo: Optional[str] = None
    year: int
    rows: List[CalidadRow]


class CalidadRowOut(CalidadRow):
    id: int


class CalidadOut(BaseModel):
    id: int
    indicador: Optional[str]
    year: int
    rows: List[CalidadRowOut]


class IndicadorVersionCreate(BaseModel):
    indicador: str
    formula: Optional[str] = None
    meta_institucional: Optional[str] = None
    observatorio: Optional[str] = None
    modulo: Optional[str] = None
    mes_inicio: int
    rows: List[CalidadRow] = []


class IndicadorVersionUpdate(BaseModel):
    indicador: Optional[str] = None
    formula: Optional[str] = None
    meta_institucional: Optional[str] = None
    observatorio: Optional[str] = None
    modulo: Optional[str] = None
    rows: List[CalidadRow] = []


class IndicadorVersionOut(BaseModel):
    id: int
    calidad_id: int
    year: int
    indicador: Optional[str]
    formula: Optional[str]
    meta_institucional: Optional[str]
    observatorio: Optional[str]
    modulo: Optional[str] = None
    mes_inicio: int
    mes_fin: int
    rows: List[CalidadRow] = []
