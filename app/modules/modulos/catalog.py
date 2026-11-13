"""Catálogo de módulos en INTRANET_MODULOS (Oracle)."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models import (
    IntranetCalidad,
    IntranetCalidadRol,
    IntranetCalidadVersion,
    IntranetModulo,
    IntranetPlanMejora,
)

_ESTADOS_INACTIVOS = frozenset({"INACTIVO", "0", "I", "N"})


@dataclass(frozen=True)
class ModuloCatalogo:
    id: int
    codigo: str
    nombre: str
    icono: str | None
    estado: str | None


def _normalize_codigo(value: str | None) -> str | None:
    if value is None:
        return None
    raw = value.strip().upper().replace(" ", "_")
    return raw or None


def _row_to_catalogo(row: IntranetModulo) -> ModuloCatalogo:
    codigo = _normalize_codigo(row.codigo) or (row.codigo or "").strip()
    return ModuloCatalogo(
        id=int(row.id),
        codigo=codigo,
        nombre=(row.nombre or codigo).strip(),
        icono=(row.icono or "Folder").strip() if row.icono else "Folder",
        estado=(row.estado or "ACTIVO").strip().upper(),
    )


def listar_modulos_catalogo(
    db: Session,
    *,
    solo_activos: bool = True,
) -> list[ModuloCatalogo]:
    rows = db.scalars(
        select(IntranetModulo).order_by(IntranetModulo.nombre)
    ).all()
    out: list[ModuloCatalogo] = []
    for row in rows:
        item = _row_to_catalogo(row)
        if solo_activos and item.estado in _ESTADOS_INACTIVOS:
            continue
        out.append(item)
    out.sort(key=lambda m: m.nombre.lower())
    return out


def obtener_modulo_catalogo(
    db: Session,
    modulo_codigo: str,
) -> ModuloCatalogo | None:
    codigo = _normalize_codigo(modulo_codigo)
    if not codigo:
        return None
    row = db.scalar(
        select(IntranetModulo).where(func.upper(IntranetModulo.codigo) == codigo)
    )
    if row is None:
        return None
    return _row_to_catalogo(row)


def obtener_modulo_por_id(db: Session, modulo_id: int) -> IntranetModulo | None:
    if modulo_id is None:
        return None
    return db.scalar(select(IntranetModulo).where(IntranetModulo.id == int(modulo_id)))


def resolver_modulo_desde_identificador(
    db: Session,
    identificador: str,
) -> IntranetModulo | None:
    """Resuelve fila por ID numérico o por CODIGO."""
    clave = (identificador or "").strip()
    if not clave:
        return None
    if clave.isdigit():
        row = obtener_modulo_por_id(db, int(clave))
        if row is not None:
            return row
    codigo = _normalize_codigo(clave)
    if not codigo:
        return None
    return db.scalar(
        select(IntranetModulo).where(func.upper(IntranetModulo.codigo) == codigo)
    )


def modulo_tiene_usuarios_con_acceso(db: Session, codigo: str) -> bool:
    norm = _normalize_codigo(codigo)
    if not norm:
        return False
    modulos_en_roles = db.scalars(
        select(IntranetCalidadRol.modulo).where(IntranetCalidadRol.modulo.isnot(None))
    ).all()
    for raw in modulos_en_roles:
        if _normalize_codigo(raw) == norm:
            return True
    return False


def propagar_codigo_modulo_en_oracle(
    db: Session,
    codigo_anterior: str,
    codigo_nuevo: str,
) -> None:
    anterior = _normalize_codigo(codigo_anterior) or ""
    nuevo = _normalize_codigo(codigo_nuevo) or ""
    if not anterior or not nuevo or anterior == nuevo:
        return
    db.execute(
        update(IntranetCalidad)
        .where(func.upper(IntranetCalidad.modulo) == anterior)
        .values(modulo=nuevo)
    )
    db.execute(
        update(IntranetCalidadVersion)
        .where(func.upper(IntranetCalidadVersion.modulo) == anterior)
        .values(modulo=nuevo)
    )
    db.execute(
        update(IntranetPlanMejora)
        .where(func.upper(IntranetPlanMejora.modulo) == anterior)
        .values(modulo=nuevo)
    )
    db.execute(
        update(IntranetCalidadRol)
        .where(func.upper(IntranetCalidadRol.modulo) == anterior)
        .values(modulo=nuevo)
    )
