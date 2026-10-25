from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import IntranetCalidadAuditoria, Usuario


def _format_actor(db: Session, login: str) -> str:
    if not login:
        return "Desconocido"
    cleaned = login.strip().upper()
    user = db.scalar(
        select(Usuario).where(func.upper(func.trim(Usuario.usuario)) == cleaned)
    )
    if user and user.nombres:
        return f"{user.nombres.strip()} ({login.strip()})"
    return login.strip()


def registrar_auditoria(
    db: Session,
    *,
    actor: str,
    accion: str,
    modulo: str,
    detalle: str,
) -> None:
    label = _format_actor(db, actor)
    db.add(
        IntranetCalidadAuditoria(
            usuario=label[:250],
            accion=accion.strip().upper()[:50],
            modulo=modulo.strip().upper()[:100],
            detalle=detalle.strip(),
        )
    )
