from datetime import timedelta

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import create_access_token
from app.models import Usuario
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import AuthResponse, LoginRequest, UserInfo
from app.modules.auth.exceptions import UsuarioInactivoError
from app.modules.auth.roles import normalizar_rol

ESTADOS_ACTIVOS = {"1", "A", "S", "ACTIVO", "TRUE"}
ESTADOS_INACTIVOS = {"0", "I", "N", "INACTIVO", "FALSE"}


def _esta_activo(estado: str | None) -> bool:
    if not estado:
        return True
    normalized = estado.strip().upper()
    if normalized in ESTADOS_INACTIVOS:
        return False
    return normalized in ESTADOS_ACTIVOS


def _contrasena_coincide(guardada: str | None, ingresada: str) -> bool:
    if not guardada:
        return False
    return guardada.strip().upper() == ingresada.strip().upper()


class AuthService:
    def __init__(self, repository: AuthRepository):
        self.repository = repository

    def _rol_desde_asignacion(self, usuario: Usuario) -> str:
        asignacion = self.repository.obtener_rol_indicadores(usuario.id)
        if asignacion is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene rol asignado en el sistema de Indicadores",
            )
        rol = normalizar_rol(asignacion.rol)
        if rol is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Rol asignado no válido",
            )
        return rol

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

        rol = self._rol_desde_asignacion(usuario)
        token = create_access_token(
            data={
                "sub": usuario.usuario,
                "rol": rol,
                "role": rol,
                "id": usuario.id,
            },
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        )
        return AuthResponse(
            token=token,
            role=rol,
            rol=rol,
            id=usuario.id,
            username=usuario.usuario or "",
            nombres=usuario.nombres or "",
            portal_role=rol,
            id_area=usuario.id_area,
        )

    def obtener_usuario_actual(self, username: str) -> UserInfo:
        usuario = self.repository.obtener_por_usuario(username)
        if usuario is None or not _esta_activo(usuario.estado):
            raise UsuarioInactivoError()
        rol = self._rol_desde_asignacion(usuario)
        return UserInfo(
            id=usuario.id,
            username=usuario.usuario or "",
            nombres=usuario.nombres or "",
            role=rol,
            rol=rol,
            portal_role=rol,
            id_area=usuario.id_area,
        )
