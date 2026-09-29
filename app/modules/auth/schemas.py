from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    role: str
    username: str
    nombres: str = ""
    portal_role: str = "usuario"
    id_area: int | None = None
    area_name: str = ""
    email: str = ""


class UserInfo(BaseModel):
    username: str
    nombres: str = ""
    role: str
    portal_role: str = "usuario"
    id_area: int | None = None
    area_name: str = ""
    email: str = ""
