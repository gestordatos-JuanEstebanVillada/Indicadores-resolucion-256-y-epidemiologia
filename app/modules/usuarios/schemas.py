from pydantic import BaseModel, Field, field_validator

from app.modules.auth.roles import ROLES_VALIDOS, normalizar_rol


def _validate_rol_value(value: str) -> str:
    normalized = normalizar_rol(value)
    if normalized is None or normalized not in ROLES_VALIDOS:
        raise ValueError("Rol no permitido")
    return normalized


class UsuarioListOut(BaseModel):
    id: int
    usuario: str
    nombres: str
    estado: str | None
    rol: str | None = None
    acceso_indicadores: bool = False

    class Config:
        from_attributes = True


class UsuarioCreate(BaseModel):
    nombres: str = Field(min_length=2, max_length=50)
    usuario: str = Field(min_length=2, max_length=50)
    contrasena: str = Field(min_length=4, max_length=100)
    rol: str

    @field_validator("usuario")
    @classmethod
    def normalize_usuario(cls, value: str) -> str:
        return value.strip()

    @field_validator("rol")
    @classmethod
    def validate_rol(cls, value: str) -> str:
        return _validate_rol_value(value)


class RolAssignCreate(BaseModel):
    usuario: str = Field(min_length=2, max_length=50)
    rol: str

    @field_validator("usuario")
    @classmethod
    def normalize_usuario(cls, value: str) -> str:
        return value.strip()

    @field_validator("rol")
    @classmethod
    def validate_rol(cls, value: str) -> str:
        return _validate_rol_value(value)


class RolUpdate(BaseModel):
    rol: str

    @field_validator("rol")
    @classmethod
    def validate_rol(cls, value: str) -> str:
        return _validate_rol_value(value)
