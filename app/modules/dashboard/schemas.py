from pydantic import BaseModel, Field


class ModuloIndicadoresCount(BaseModel):
    codigo: str
    cantidad: int


class DirectorioIndicadorItem(BaseModel):
    modulo: str
    nombre: str
    formula: str = ""


class DashboardStatsOut(BaseModel):
    modulo_consulta: str | None = None
    modulos_acceso: list[str] = Field(default_factory=list)
    total_indicadores: int = 0
    indicadores_por_modulo: list[ModuloIndicadoresCount] = Field(default_factory=list)
    planes_pendientes: int = 0
    incidencias_pendientes: int = 0
    directorio: list[DirectorioIndicadorItem] = Field(default_factory=list)


class DashboardGraficosOut(BaseModel):
    año: int
    incidencias_por_mes: list[int] = Field(default_factory=list)
    distribucion_modulos: list[ModuloIndicadoresCount] = Field(default_factory=list)
