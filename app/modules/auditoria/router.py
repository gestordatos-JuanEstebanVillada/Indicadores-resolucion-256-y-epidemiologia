from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.core.ids import is_defined_user_id
from app.models import IntranetCalidadAuditoria
from app.modules.auth.admin_dependencies import get_current_gestion_admin
from app.modules.auth.permissions import (
    es_admin_global_token,
    es_administrador_area_token,
    modulos_en_token_set,
)
from app.modules.auditoria.schemas import AuditoriaOut, AuditoriaPageOut
from app.modules.usuarios.roles_repository import CalidadRolesRepository

router = APIRouter(prefix="/auditoria", tags=["Auditoría"])


def _normalizar_modulo_filtro(value: str) -> str:
    return (value or "").strip().upper().replace(" ", "_")


def _assert_puede_ver_auditoria(requester: dict) -> None:
    if es_admin_global_token(requester):
        return
    if es_administrador_area_token(requester):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Su jerarquía no permite consultar auditoría",
    )


def _modulos_auditoria_area(
    db: Session,
    requester: dict,
) -> set[str]:
    """MODULO en INTRANET_CALIDAD_ROLES (misma lista que en el token)."""
    uid = requester.get("id")
    if is_defined_user_id(uid):
        modulos = set(CalidadRolesRepository(db).modulos_de_usuario(int(uid)))
        if modulos:
            return {_normalizar_modulo_filtro(m) for m in modulos if m}
    token_mods = modulos_en_token_set(requester)
    return {_normalizar_modulo_filtro(m) for m in token_mods if m}


def _modulos_filtro_auditoria(db: Session, requester: dict) -> set[str] | None:
    """
    None = administrador global (sin filtro por módulo).
    Set = administrador de área: solo filas con modulo IN (sus MODULO).
    """
    _assert_puede_ver_auditoria(requester)
    if es_admin_global_token(requester):
        return None
    modulos = _modulos_auditoria_area(db, requester)
    if not modulos:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sin módulos asignados para consultar auditoría",
        )
    return modulos


def _aplicar_filtro_modulo(stmt, alcance: set[str] | None, modulo: str | None):
    if alcance is None:
        if modulo:
            return stmt.where(
                IntranetCalidadAuditoria.modulo
                == _normalizar_modulo_filtro(modulo)
            )
        return stmt
    if not alcance:
        return stmt.where(IntranetCalidadAuditoria.id == -1)
    if modulo:
        codigo = _normalizar_modulo_filtro(modulo)
        if codigo not in alcance:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sin permiso para consultar auditoría de este módulo",
            )
        return stmt.where(IntranetCalidadAuditoria.modulo == codigo)
    return stmt.where(IntranetCalidadAuditoria.modulo.in_(sorted(alcance)))


@router.get("", response_model=AuditoriaPageOut)
def listar_auditoria(
    db: Session = Depends(get_db),
    requester: dict = Depends(get_current_gestion_admin),
    modulo: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    page: int | None = Query(None, ge=1),
    size: int | None = Query(None, ge=1, le=200),
):
    if page is not None:
        page_size = size or limit
        skip = (page - 1) * page_size
        limit = page_size

    alcance = _modulos_filtro_auditoria(db, requester)
    base = select(IntranetCalidadAuditoria)
    base = _aplicar_filtro_modulo(base, alcance, modulo)

    count_stmt = select(func.count(IntranetCalidadAuditoria.id))
    count_stmt = _aplicar_filtro_modulo(count_stmt, alcance, modulo)
    total_count = int(db.scalar(count_stmt) or 0)

    data_stmt = (
        base.order_by(
            IntranetCalidadAuditoria.created_at.desc(),
            IntranetCalidadAuditoria.id.desc(),
        )
        .offset(skip)
        .limit(limit)
    )
    rows = db.scalars(data_stmt).all()
    return AuditoriaPageOut(
        items=[AuditoriaOut.model_validate(row) for row in rows],
        total_count=total_count,
    )
