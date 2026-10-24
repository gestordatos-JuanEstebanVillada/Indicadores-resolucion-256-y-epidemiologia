from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    role: str
    rol: str = ""
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
    portal_role: str = "usuario"
    id_area: int | None = None
    area_name: str = ""
    email: str = ""
