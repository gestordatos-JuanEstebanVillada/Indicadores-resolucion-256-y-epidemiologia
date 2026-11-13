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
    icono: str = "Folder"
    estado: str = "ACTIVO"

    @field_validator("codigo")
    @classmethod
    def normalizar_codigo(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        codigo = _normalize_codigo(value)
        if not codigo:
            raise ValueError("El código no puede quedar vacío")
        if " " in codigo:
            raise ValueError("El código no debe contener espacios")
        return codigo

    @field_validator("icono")
    @classmethod
    def icono_valido(cls, value: str) -> str:
        cleaned = (value or "Folder").strip()
        return cleaned or "Folder"

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, value: str) -> str:
        return (value or "ACTIVO").strip().upper() or "ACTIVO"


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
