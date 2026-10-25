from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.models import IntranetCalidadAuditoria
from app.modules.auth.admin_dependencies import get_current_admin_user
from app.modules.auditoria.schemas import AuditoriaOut

router = APIRouter(prefix="/auditoria", tags=["Auditoría"])


@router.get("", response_model=list[AuditoriaOut])
def listar_auditoria(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
    modulo: str | None = Query(None),
    limit: int = Query(200, ge=1, le=500),
):
    stmt = (
        select(IntranetCalidadAuditoria)
        .order_by(IntranetCalidadAuditoria.created_at.desc(), IntranetCalidadAuditoria.id.desc())
        .limit(limit)
    )
    if modulo:
        stmt = stmt.where(
            IntranetCalidadAuditoria.modulo == modulo.strip().upper()
        )
    rows = db.scalars(stmt).all()
    return rows
