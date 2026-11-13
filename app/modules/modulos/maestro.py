"""Validación y lectura del catálogo maestro INTRANET_MODULOS (solo lectura)."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.exc import DatabaseError
from sqlalchemy.orm import Session

from app.models import IntranetModulo
from app.modules.modulos.catalog import ModuloCatalogo

if TYPE_CHECKING:
    from app.modules.auth.rbac import AccesoUsuario

logger = logging.getLogger(__name__)

_ESTADOS_INACTIVOS = frozenset({"INACTIVO", "0", "I", "N"})


def _normalize_codigo(value: str | None) -> str | None:
    if value is None:
        return None
    raw = value.strip().upper().replace(" ", "_")
    return raw or None


def _es_error_tabla_inexistente(exc: BaseException) -> bool:
    msg = str(exc).upper()
    return (
        "ORA-00942" in msg
        or "ORA-00904" in msg
        or "TABLE OR VIEW DOES NOT EXIST" in msg
        or "INVALID IDENTIFIER" in msg
    )


def codigos_catalogo_maestro(db: Session, *, solo_activos: bool = True) -> set[str]:
    """Códigos válidos en INTRANET_MODULOS; fallback al catálogo local si la tabla no existe."""
    desde_tabla = _codigos_desde_tabla(db, solo_activos=solo_activos)
    if desde_tabla is not None:
        return desde_tabla
    from app.modules.modulos.catalog import listar_modulos_catalogo

    return {m.codigo for m in listar_modulos_catalogo(db, solo_activos=solo_activos)}


def _codigos_desde_tabla(db: Session, *, solo_activos: bool) -> set[str] | None:
    try:
        stmt = select(IntranetModulo.codigo, IntranetModulo.estado)
        rows = db.execute(stmt).all()
    except DatabaseError as exc:
        db.rollback()
        if _es_error_tabla_inexistente(exc):
            return None
        raise
    codigos: set[str] = set()
    for codigo_raw, estado_raw in rows:
        codigo = _normalize_codigo(codigo_raw)
        if not codigo:
            continue
        if solo_activos:
            estado = (estado_raw or "ACTIVO").strip().upper()
            if estado in _ESTADOS_INACTIVOS:
                continue
        codigos.add(codigo)
    return codigos


def listar_modulos_desde_maestro(
    db: Session,
    *,
    solo_activos: bool = True,
) -> list[ModuloCatalogo] | None:
    """Lista módulos desde INTRANET_MODULOS; None si la tabla no está disponible."""
    try:
        stmt = select(IntranetModulo).order_by(IntranetModulo.nombre)
        rows = db.scalars(stmt).all()
    except DatabaseError as exc:
        db.rollback()
        if _es_error_tabla_inexistente(exc):
            return None
        raise

    out: list[ModuloCatalogo] = []
    for row in rows:
        codigo = _normalize_codigo(row.codigo)
        if not codigo:
            continue
        estado = (row.estado or "ACTIVO").strip().upper()
        if solo_activos and estado in _ESTADOS_INACTIVOS:
            continue
        out.append(
            ModuloCatalogo(
                id=int(row.id),
                codigo=codigo,
                nombre=(row.nombre or codigo).strip(),
                icono=(row.icono or "Folder").strip() if row.icono else "Folder",
                estado=estado,
            )
        )
    out.sort(key=lambda m: m.nombre.lower())
    return out


def assert_modulos_existen_en_maestro(
    db: Session,
    jerarquia: str,
    accesos: list,
) -> None:
    from fastapi import HTTPException, status

    from app.modules.auth.calidad_roles_data import JERARQUIA_GLOBAL

    clave = (jerarquia or "").strip().upper()
    if clave == JERARQUIA_GLOBAL:
        return

    validos = codigos_catalogo_maestro(db, solo_activos=True)
    invalidos: list[str] = []
    for item in accesos:
        codigo = (
            getattr(item, "modulo", None)
            if not isinstance(item, dict)
            else item.get("modulo")
        )
        codigo = _normalize_codigo(codigo)
        if codigo and codigo not in validos:
            invalidos.append(codigo)
    if invalidos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uno o más módulos seleccionados no existen en el catálogo maestro.",
        )


def filtrar_acceso_modulos_huerfanos(
    db: Session,
    acceso: AccesoUsuario,
    *,
    usuario_id: int,
    username: str | None = None,
) -> AccesoUsuario:
    from app.modules.auth.calidad_roles_data import JERARQUIA_AREA, JERARQUIA_USUARIO
    from app.modules.auth.rbac import AccesoUsuario as AccesoUsuarioCls

    if acceso.es_admin_global:
        return acceso

    validos = codigos_catalogo_maestro(db, solo_activos=True)
    etiqueta = (username or "").strip() or str(usuario_id)

    def _filtrar_lista(origen: list[str]) -> list[str]:
        limpios: list[str] = []
        for codigo in origen:
            norm = _normalize_codigo(codigo)
            if not norm:
                continue
            if norm in validos:
                limpios.append(norm)
            else:
                logger.warning(
                    "Dato huérfano detectado y omitido: El módulo %s asignado al usuario %s "
                    "no existe en el catálogo",
                    norm,
                    etiqueta,
                )
        return limpios

    modulos = _filtrar_lista(acceso.modulos)
    solo_lectura = _filtrar_lista(acceso.modulos_solo_lectura)
    edicion = _filtrar_lista(acceso.modulos_edicion)

    if modulos:
        return AccesoUsuarioCls(
            jerarquia=acceso.jerarquia,
            nombre_rol=acceso.nombre_rol,
            es_admin_global=acceso.es_admin_global,
            permite_edicion=1 if edicion else 0,
            modulos=modulos,
            modulos_solo_lectura=solo_lectura,
            modulos_edicion=edicion,
        )

    if acceso.jerarquia in {JERARQUIA_AREA, JERARQUIA_USUARIO}:
        return AccesoUsuarioCls(
            jerarquia=acceso.jerarquia,
            nombre_rol=acceso.nombre_rol,
            es_admin_global=0,
            permite_edicion=0,
            modulos=[],
            modulos_solo_lectura=[],
            modulos_edicion=[],
        )

    return acceso
