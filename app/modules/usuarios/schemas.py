from pydantic import BaseModel, Field, field_validator, model_validator

from app.modules.auth.calidad_roles_data import JERARQUIAS, JERARQUIA_GLOBAL
from app.modules.auth.roles import normalizar_codigo_modulo


def _validate_modulo(value: str) -> str:
    codigo = normalizar_codigo_modulo(value)
    if not codigo:
        raise ValueError("Módulo no válido")
    return codigo


class ModuloAccesoIn(BaseModel):
    modulo: str
    solo_lectura: bool = False

    @field_validator("modulo")
    @classmethod
    def validate_modulo(cls, value: str) -> str:
        return _validate_modulo(value)


class ModuloAccesoOut(BaseModel):
    modulo: str
    solo_lectura: bool


class UsuarioInstitucionalOut(BaseModel):
    id: int
    usuario: str
    nombres: str
    estado: str | None = None
    tiene_acceso_indicadores: bool = False


class UsuarioListOut(BaseModel):
    id: int
    usuario: str
    nombres: str
    estado: str | None
    jerarquia: str | None = None
    nombre_rol: str | None = None
    es_admin_global: bool = False
    permite_edicion: bool = False
    modulos: list[str] = []
    accesos: list[ModuloAccesoOut] = []
    acceso_indicadores: bool = False

    class Config:
        from_attributes = True


def _validate_jerarquia(value: str) -> str:
    clave = (value or "").strip().upper()
    if clave not in JERARQUIAS:
        raise ValueError("Jerarquía no permitida")
    return clave


class UsuarioCreate(BaseModel):
    nombres: str = Field(min_length=2, max_length=50)
    usuario: str = Field(min_length=2, max_length=50)
    contrasena: str = Field(min_length=4, max_length=100)
    jerarquia: str
    accesos: list[ModuloAccesoIn] = Field(default_factory=list)

    @field_validator("usuario")
    @classmethod
    def normalize_usuario(cls, value: str) -> str:
        return value.strip()

    @field_validator("jerarquia")
    @classmethod
    def validate_jerarquia(cls, value: str) -> str:
        return _validate_jerarquia(value)

    @model_validator(mode="after")
    def validar_accesos(self):
        if self.jerarquia != JERARQUIA_GLOBAL and not self.accesos:
            raise ValueError("Debe seleccionar al menos un módulo")
        return self


class RolAssignCreate(BaseModel):
    usuario: str = Field(min_length=2, max_length=50)
    jerarquia: str
    accesos: list[ModuloAccesoIn] = Field(default_factory=list)

    @field_validator("usuario")
    @classmethod
    def normalize_usuario(cls, value: str) -> str:
        return value.strip()

    @field_validator("jerarquia")
    @classmethod
    def validate_jerarquia(cls, value: str) -> str:
        return _validate_jerarquia(value)

    @model_validator(mode="after")
    def validar_accesos(self):
        if self.jerarquia != JERARQUIA_GLOBAL and not self.accesos:
            raise ValueError("Debe seleccionar al menos un módulo")
        return self


class RolUpdate(BaseModel):
    jerarquia: str
    accesos: list[ModuloAccesoIn] = Field(default_factory=list)

    @field_validator("jerarquia")
    @classmethod
    def validate_jerarquia(cls, value: str) -> str:
        return _validate_jerarquia(value)

    @model_validator(mode="after")
    def validar_accesos(self):
        if self.jerarquia != JERARQUIA_GLOBAL and not self.accesos:
            raise ValueError("Debe seleccionar al menos un módulo")
        return self
