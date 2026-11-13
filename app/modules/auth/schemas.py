from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    role: str
    rol: str = ""
    nombre_rol: str = ""
    es_admin_global: int = 0
    permite_edicion: int = 0
    modulos: list[str] = []
    modulos_solo_lectura: list[str] = []
    modulos_edicion: list[str] = []
    jerarquia: str = ""
    id: int | None = None
    username: str
    nombres: str = ""
    portal_role: str = "usuario"
    id_area: int | None = None
    area_name: str = ""
    email: str = ""


class UserInfo(BaseModel):
    id: int | None = None
    username: str
    nombres: str = ""
    role: str
    rol: str = ""
    nombre_rol: str = ""
    es_admin_global: int = 0
    permite_edicion: int = 0
    modulos: list[str] = []
    modulos_solo_lectura: list[str] = []
    modulos_edicion: list[str] = []
    jerarquia: str = ""
    portal_role: str = "usuario"
    id_area: int | None = None
    area_name: str = ""
    email: str = ""
