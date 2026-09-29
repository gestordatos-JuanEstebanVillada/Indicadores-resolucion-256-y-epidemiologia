from datetime import timedelta

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import create_access_token
from app.models import Usuario
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import AuthResponse, LoginRequest, UserInfo
from app.modules.auth.exceptions import UsuarioInactivoError

ESTADOS_ACTIVOS = {"1", "A", "S", "ACTIVO", "TRUE"}


def _esta_activo(estado: str | None) -> bool:
    return not estado or estado.strip().upper() in ESTADOS_ACTIVOS


def _contrasena_coincide(guardada: str | None, ingresada: str) -> bool:
    if not guardada:
        return False
    return guardada.strip().upper() == ingresada.strip().upper()


def _rol(usuario: Usuario) -> str:
    # No hay nombre de rol en esta tabla, solo ID_CLASE (numerico); se expone
    # tal cual hasta que se sepa el mapeo numero -> nombre de rol.
    return str(usuario.id_clase) if usuario.id_clase is not None else "usuario"


class AuthService:
    def __init__(self, repository: AuthRepository):
        self.repository = repository

    def login(self, data: LoginRequest) -> AuthResponse:
        usuario = self.repository.obtener_por_usuario(data.username)
        if usuario is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado",
            )

        if not _contrasena_coincide(usuario.contrasena, data.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Contraseña incorrecta",
            )

        if not _esta_activo(usuario.estado):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El usuario está inactivo",
            )

        token = create_access_token(
            data={"sub": usuario.usuario, "role": _rol(usuario)},
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        )
        return AuthResponse(
            token=token,
            role=_rol(usuario),
            username=usuario.usuario or "",
            nombres=usuario.nombres or "",
            portal_role=_rol(usuario),
            id_area=usuario.id_area,
        )

    def obtener_usuario_actual(self, username: str) -> UserInfo:
        usuario = self.repository.obtener_por_usuario(username)
        if usuario is None or not _esta_activo(usuario.estado):
            raise UsuarioInactivoError()
        return UserInfo(
            username=usuario.usuario or "",
            nombres=usuario.nombres or "",
            role=_rol(usuario),
            portal_role=_rol(usuario),
            id_area=usuario.id_area,
        )
