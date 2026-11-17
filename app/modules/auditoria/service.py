from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import IntranetCalidadAuditoria, Usuario

MODULO_SISTEMA_USUARIOS = "USUARIOS"


def codigo_modulo_auditoria(value: str | None, *, fallback: str = "") -> str:
    """Código de módulo en mayúsculas sin espacios (columna MODULO de auditoría)."""
    raw = (value or "").strip().upper().replace(" ", "_")
    if raw:
        return raw[:100]
    fb = (fallback or "").strip().upper().replace(" ", "_")
    return fb[:100]


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
            modulo=codigo_modulo_auditoria(modulo, fallback=MODULO_SISTEMA_USUARIOS),
            detalle=detalle.strip(),
        )
    )
