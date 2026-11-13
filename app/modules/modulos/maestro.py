"""Validación del catálogo maestro INTRANET_MODULOS."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from app.modules.modulos.catalog import listar_modulos_catalogo

if TYPE_CHECKING:
    from app.modules.auth.rbac import AccesoUsuario

logger = logging.getLogger(__name__)


def _normalize_codigo(value: str | None) -> str | None:
    if value is None:
        return None
    raw = value.strip().upper().replace(" ", "_")
    return raw or None


def codigos_catalogo_maestro(db: Session, *, solo_activos: bool = True) -> set[str]:
    return {m.codigo for m in listar_modulos_catalogo(db, solo_activos=solo_activos)}


def listar_modulos_desde_maestro(
    db: Session,
    *,
    solo_activos: bool = True,
):
    """Alias de compatibilidad: catálogo 100 % Oracle."""
    return listar_modulos_catalogo(db, solo_activos=solo_activos)


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
        permite = 1 if acceso.jerarquia == JERARQUIA_AREA else 0
        return AccesoUsuarioCls(
            jerarquia=acceso.jerarquia,
            nombre_rol=acceso.nombre_rol,
            es_admin_global=0,
            permite_edicion=permite,
            modulos=[],
            modulos_solo_lectura=[],
            modulos_edicion=[],
        )

    return acceso
