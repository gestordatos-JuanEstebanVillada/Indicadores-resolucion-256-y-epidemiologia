import logging

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import DataError, IntegrityError
from sqlalchemy.orm import Session

from app.models import Usuario
from app.core.ids import tiene_filas_acceso
from app.modules.auth.calidad_roles_data import (
    eliminar_accesos_usuario,
    listar_filas_usuario,
)
from app.modules.auditoria.service import registrar_auditoria

logger = logging.getLogger(__name__)

# Valores alineados con registros existentes en INTRANET_USUARIOS (id_clase=2, estado='1')
DEFAULT_ID_CLASE = 2
DEFAULT_ESTADO = "1"
DEFAULT_PORTAL_ROL = "usuario"


def normalize_login(value: str) -> str:
    return value.strip().upper()


def normalize_password(value: str) -> str:
    return value.strip()


def find_user_by_login(db: Session, login: str) -> Usuario | None:
    cleaned = normalize_login(login)
    return db.scalar(
        select(Usuario).where(
            func.upper(func.trim(Usuario.usuario)) == cleaned
        )
    )


def _duplicate_login_detail(display_login: str) -> str:
    return f"El nombre de usuario '{display_login.strip()}' ya está en uso en el sistema."


def _is_usuario_unique_violation(exc: IntegrityError) -> bool:
    message = str(getattr(exc, "orig", exc)).upper()
    return "ORA-00001" in message or "UNIQUE" in message


def asegurar_login_disponible_para_creacion(
    db: Session,
    login: str,
    *,
    display_login: str | None = None,
) -> None:
    """
    Bloquea si el login ya tiene rol en Indicadores.
    Si existe en INTRANET_USUARIOS sin rol (huérfano), lo elimina en la misma transacción.
    """
    label = display_login or login
    existing = find_user_by_login(db, login)
    if existing is None:
        return

    if tiene_filas_acceso(listar_filas_usuario(db, existing.id)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_duplicate_login_detail(label),
        )

    db.delete(existing)
    db.flush()


def _next_usuario_id(db: Session) -> int:
    """La tabla no tiene secuencia/trigger de ID; se asigna MAX(id)+1 en la transacción."""
    next_id = db.scalar(select(func.coalesce(func.max(Usuario.id), 0) + 1))
    if next_id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo calcular el ID del nuevo usuario",
        )
    return int(next_id)


def crear_usuario_con_accesos(
    db: Session,
    *,
    nombres: str,
    usuario: str,
    contrasena: str,
    jerarquia: str,
    accesos: list[dict],
    actor: str,
    roles_repo,
) -> Usuario:
    login = normalize_login(usuario)
    try:
        nuevo_id = _next_usuario_id(db)
        nuevo_usuario = Usuario(
            id=nuevo_id,
            nombres=nombres.strip(),
            usuario=login,
            contrasena=normalize_password(contrasena),
            estado=DEFAULT_ESTADO,
            id_clase=DEFAULT_ID_CLASE,
        )
        db.add(nuevo_usuario)
        db.flush()

        roles_repo.reemplazar_accesos(nuevo_usuario.id, jerarquia, accesos)
        registrar_auditoria(
            db,
            actor=actor,
            accion="POST",
            modulo="USUARIOS",
            detalle=f"Creó usuario {login} con accesos por módulo",
        )
        db.commit()
        db.refresh(nuevo_usuario)
        return nuevo_usuario
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError as exc:
        db.rollback()
        logger.exception("IntegrityError al crear usuario: %s", exc)
        if _is_usuario_unique_violation(exc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=_duplicate_login_detail(usuario),
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo crear el usuario: restricción de integridad en la base de datos",
        ) from exc
    except DataError as exc:
        db.rollback()
        logger.exception("DataError al crear usuario: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Datos inválidos para la base de datos",
        ) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Error inesperado al crear usuario: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al crear usuario y asignar rol",
        ) from exc


def revocar_solo_acceso_indicadores(
    db: Session,
    *,
    usuario_id: int,
    actor: str,
) -> None:
    try:
        if not tiene_filas_acceso(listar_filas_usuario(db, usuario_id)):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El usuario no tiene accesos en Indicadores",
            )
        user = db.get(Usuario, usuario_id)
        login = user.usuario if user is not None else str(usuario_id)
        eliminar_accesos_usuario(db, usuario_id)
        registrar_auditoria(
            db,
            actor=actor,
            accion="DELETE",
            modulo="USUARIOS",
            detalle=f"Revocó accesos de Indicadores para {login}",
        )
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Error al revocar acceso %s: %s", usuario_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo revocar el acceso",
        ) from exc


def eliminar_acceso_y_usuario(
    db: Session,
    *,
    usuario_id: int,
    actor: str,
) -> None:
    try:
        tiene_roles = bool(listar_filas_usuario(db, usuario_id))
        user = db.get(Usuario, usuario_id)

        if user is None and not tiene_roles:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )

        if tiene_roles:
            eliminar_accesos_usuario(db, usuario_id)
        if user is not None:
            login = user.usuario or str(usuario_id)
            db.delete(user)
        else:
            login = str(usuario_id)

        registrar_auditoria(
            db,
            actor=actor,
            accion="DELETE",
            modulo="USUARIOS",
            detalle=f"Eliminó usuario {login} y su rol en Indicadores",
        )
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError as exc:
        db.rollback()
        logger.exception(
            "IntegrityError al eliminar usuario %s: %s", usuario_id, exc
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No se pudo eliminar el usuario: existen referencias en otras "
                "aplicaciones de la institución"
            ),
        ) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Error al eliminar usuario %s: %s", usuario_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al revocar acceso y eliminar usuario",
        ) from exc
