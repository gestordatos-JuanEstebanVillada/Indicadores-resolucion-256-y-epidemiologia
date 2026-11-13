from pydantic import BaseModel, field_validator


def _normalize_codigo(value: str) -> str:
    return "".join(
        char if char.isalnum() else "_"
        for char in value.strip().upper().replace(" ", "_")
    ).strip("_")


class ModuloBase(BaseModel):
    nombre: str
    icono: str | None = None
    estado: str | None = "ACTIVO"

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("El nombre es obligatorio")
        return cleaned


class ModuloCreate(ModuloBase):
    codigo: str | None = None

    @field_validator("codigo")
    @classmethod
    def normalizar_codigo(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        return _normalize_codigo(value)


class ModuloUpdate(BaseModel):
    nombre: str | None = None
    icono: str | None = None
    estado: str | None = None
    codigo_nuevo: str | None = None

    @field_validator("codigo_nuevo")
    @classmethod
    def normalizar_codigo_nuevo(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        return _normalize_codigo(value)


class ModuloUsuarioAccesoOut(BaseModel):
    id: int
    usuario: str
    nombres: str
    roles: list[str] = []


class ModuloOut(BaseModel):
    id: int
    codigo: str
    nombre: str
    icono: str | None
    estado: str | None

    model_config = {"from_attributes": True}
