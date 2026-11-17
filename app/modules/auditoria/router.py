from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.models import IntranetCalidadAuditoria
from app.modules.auth.admin_dependencies import get_current_gestion_admin
from app.modules.auth.permissions import (
    es_admin_global_token,
    es_administrador_area_token,
)
from app.modules.auditoria.schemas import AuditoriaOut, AuditoriaPageOut
from app.modules.auditoria.scope import (
    condicion_alcance_administrador_area,
    condicion_filtro_modulo_opcional,
    expr_modulo_auditoria,
    modulos_anclados_usuario,
    normalizar_codigo_modulo,
)

router = APIRouter(prefix="/auditoria", tags=["Auditoría"])


def _assert_puede_ver_auditoria(requester: dict) -> None:
    if es_admin_global_token(requester):
        return
    if es_administrador_area_token(requester):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Su jerarquía no permite consultar auditoría",
    )


def _alcance_auditoria(db: Session, requester: dict) -> set[str] | None:
    _assert_puede_ver_auditoria(requester)
    if es_admin_global_token(requester):
        return None
    modulos = modulos_anclados_usuario(db, requester)
    if not modulos:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sin módulos asignados para consultar auditoría",
        )
    return modulos


def _aplicar_filtros(stmt, db: Session, alcance: set[str] | None, modulo: str | None):
    if alcance is not None:
        stmt = stmt.where(condicion_alcance_administrador_area(db, alcance))
    extra = condicion_filtro_modulo_opcional(alcance, modulo)
    if extra is not None:
        if extra is False:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sin permiso para consultar auditoría de este módulo",
            )
        stmt = stmt.where(extra)
    elif alcance is None and modulo:
        stmt = stmt.where(
            expr_modulo_auditoria() == normalizar_codigo_modulo(modulo)
        )
    return stmt


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

    alcance = _alcance_auditoria(db, requester)

    count_stmt = select(func.count()).select_from(IntranetCalidadAuditoria)
    count_stmt = _aplicar_filtros(count_stmt, db, alcance, modulo)
    total_count = int(db.scalar(count_stmt) or 0)

    data_stmt = select(IntranetCalidadAuditoria)
    data_stmt = _aplicar_filtros(data_stmt, db, alcance, modulo)
    data_stmt = (
        data_stmt.order_by(
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