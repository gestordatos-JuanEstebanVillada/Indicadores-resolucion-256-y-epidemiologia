from datetime import timedelta



from fastapi import HTTPException, status

from sqlalchemy.orm import Session



from app.core.config import settings

from app.core.security import create_access_token

from app.models import Usuario

from app.modules.auth.repository import AuthRepository

from app.modules.auth.schemas import AuthResponse, LoginRequest, UserInfo

from app.modules.auth.exceptions import UsuarioInactivoError

from app.modules.auth.rbac import resolver_acceso_usuario, token_claims_desde_acceso



ESTADOS_ACTIVOS = {"1", "A", "S", "ACTIVO", "TRUE"}

ESTADOS_INACTIVOS = {"0", "I", "N", "INACTIVO", "FALSE"}





def _esta_activo(estado: str | None) -> bool:

    if estado is None:

        return True

    normalized = str(estado).strip().upper()

    if not normalized:

        return True

    if normalized in ESTADOS_INACTIVOS:

        return False

    return normalized in ESTADOS_ACTIVOS





def _contrasena_coincide(guardada: str | None, ingresada: str) -> bool:

    if guardada is None or ingresada is None:

        return False

    return guardada.strip() == ingresada.strip()





class AuthService:

    def __init__(self, repository: AuthRepository):

        self.repository = repository

        self._db: Session = repository.db



    def _acceso_usuario(self, usuario: Usuario):

        acceso = resolver_acceso_usuario(self._db, usuario.id)

        if acceso is None:

            raise HTTPException(

                status_code=status.HTTP_403_FORBIDDEN,

                detail="No tiene rol asignado en el sistema de Indicadores",

            )

        return acceso



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



        acceso = self._acceso_usuario(usuario)

        claims = token_claims_desde_acceso(

            acceso, usuario.id, usuario.usuario or ""

        )

        token = create_access_token(

            data=claims,

            expires_delta=timedelta(minutes=settings.access_token_expire_minutes),

        )

        return AuthResponse(

            token=token,

            role=acceso.jerarquia,

            rol=acceso.jerarquia,

            nombre_rol=acceso.jerarquia,

            es_admin_global=acceso.es_admin_global,

            permite_edicion=acceso.permite_edicion,

            modulos=acceso.modulos,
            modulos_solo_lectura=acceso.modulos_solo_lectura,
            modulos_edicion=acceso.modulos_edicion,
            jerarquia=acceso.jerarquia,

            id=usuario.id,

            username=usuario.usuario or "",

            nombres=usuario.nombres or "",

            portal_role=acceso.jerarquia,

            id_area=usuario.id_area,

        )



    def obtener_usuario_actual(self, username: str) -> UserInfo:

        usuario = self.repository.obtener_por_usuario(username)

        if usuario is None or not _esta_activo(usuario.estado):

            raise UsuarioInactivoError()

        acceso = self._acceso_usuario(usuario)

        return UserInfo(

            id=usuario.id,

            username=usuario.usuario or "",

            nombres=usuario.nombres or "",

            role=acceso.jerarquia,

            rol=acceso.jerarquia,

            nombre_rol=acceso.jerarquia,

            es_admin_global=acceso.es_admin_global,

            permite_edicion=acceso.permite_edicion,

            modulos=acceso.modulos,
            modulos_solo_lectura=acceso.modulos_solo_lectura,
            modulos_edicion=acceso.modulos_edicion,
            jerarquia=acceso.jerarquia,

            portal_role=acceso.jerarquia,

            id_area=usuario.id_area,

        )

