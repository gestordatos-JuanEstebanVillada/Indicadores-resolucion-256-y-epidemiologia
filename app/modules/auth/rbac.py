"""Resolución de accesos tenant (jerarquía + permisos por módulo)."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.modules.auth.calidad_roles_data import (
    FilaCalidadRol,
    JERARQUIA_AREA,
    JERARQUIA_GLOBAL,
    JERARQUIA_USUARIO,
    listar_filas_usuario,
    resolver_resumen_accesos,
)
from app.modules.modulos.maestro import filtrar_acceso_modulos_huerfanos


@dataclass(frozen=True)
class AccesoUsuario:
    jerarquia: str
    nombre_rol: str
    es_admin_global: int
    permite_edicion: int
    modulos: list[str]
    modulos_solo_lectura: list[str]
    modulos_edicion: list[str]


def resolver_acceso_desde_filas(
    db: Session,
    filas: list[FilaCalidadRol],
) -> AccesoUsuario | None:
    del db
    if not filas:
        return None
    resumen = resolver_resumen_accesos(filas)
    if resumen.es_admin_global:
        return AccesoUsuario(
            jerarquia=JERARQUIA_GLOBAL,
            nombre_rol=JERARQUIA_GLOBAL,
            es_admin_global=1,
            permite_edicion=1,
            modulos=[],
            modulos_solo_lectura=[],
            modulos_edicion=[],
        )
    if not resumen.modulos:
        if resumen.jerarquia in {JERARQUIA_AREA, JERARQUIA_USUARIO}:
            return AccesoUsuario(
                jerarquia=resumen.jerarquia,
                nombre_rol=resumen.jerarquia,
                es_admin_global=0,
                permite_edicion=0,
                modulos=[],
                modulos_solo_lectura=[],
                modulos_edicion=[],
            )
        return None
    permite = 1 if resumen.modulos_edicion else 0
    return AccesoUsuario(
        jerarquia=resumen.jerarquia,
        nombre_rol=resumen.jerarquia,
        es_admin_global=0,
        permite_edicion=permite,
        modulos=resumen.modulos,
        modulos_solo_lectura=resumen.modulos_solo_lectura,
        modulos_edicion=resumen.modulos_edicion,
    )


def resolver_acceso_usuario(
    db: Session,
    usuario_id: int,
    filas: list[FilaCalidadRol] | None = None,
    username: str | None = None,
) -> AccesoUsuario | None:
    if filas is None:
        filas = listar_filas_usuario(db, usuario_id)
    acceso = resolver_acceso_desde_filas(db, filas)
    if acceso is None:
        return None
    return filtrar_acceso_modulos_huerfanos(
        db,
        acceso,
        usuario_id=usuario_id,
        username=username,
    )


def token_claims_desde_acceso(acceso: AccesoUsuario, usuario_id: int, username: str) -> dict:
    return {
        "sub": username,
        "rol": acceso.jerarquia,
        "role": acceso.jerarquia,
        "nombre_rol": acceso.jerarquia,
        "jerarquia": acceso.jerarquia,
        "es_admin_global": acceso.es_admin_global,
        "permite_edicion": acceso.permite_edicion,
        "modulos": acceso.modulos,
        "modulos_solo_lectura": acceso.modulos_solo_lectura,
        "modulos_edicion": acceso.modulos_edicion,
        "id": usuario_id,
    }


def flags_desde_sistema(db: Session, jerarquia: str) -> tuple[int, int]:
    del db
    clave = (jerarquia or "").strip().upper()
    if clave == JERARQUIA_GLOBAL:
        return 1, 1
    return 0, 1
