"""Resolución de accesos tenant (jerarquía + permisos por módulo)."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.modules.auth.calidad_roles_data import (
    FilaCalidadRol,
    JERARQUIA_AREA,
    JERARQUIA_GLOBAL,
    JERARQUIA_USUARIO,
    JERARQUIAS,
    jerarquia_maxima_desde_filas,
    listar_filas_usuario,
    resolver_resumen_accesos,
    usuario_tiene_acceso_indicadores,
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
        jerarquia = jerarquia_maxima_desde_filas(filas) or resumen.jerarquia
        if jerarquia in {JERARQUIA_GLOBAL, JERARQUIA_AREA, JERARQUIA_USUARIO}:
            permite = (
                1
                if jerarquia in {JERARQUIA_GLOBAL, JERARQUIA_AREA}
                else 0
            )
            return AccesoUsuario(
                jerarquia=jerarquia,
                nombre_rol=jerarquia,
                es_admin_global=1 if jerarquia == JERARQUIA_GLOBAL else 0,
                permite_edicion=permite,
                modulos=[],
                modulos_solo_lectura=[],
                modulos_edicion=[],
            )
        if jerarquia and jerarquia in JERARQUIAS:
            return AccesoUsuario(
                jerarquia=jerarquia,
                nombre_rol=jerarquia,
                es_admin_global=0,
                permite_edicion=0,
                modulos=[],
                modulos_solo_lectura=[],
                modulos_edicion=[],
            )
        jerarquia = jerarquia_maxima_desde_filas(filas) or JERARQUIA_USUARIO
        return AccesoUsuario(
            jerarquia=jerarquia,
            nombre_rol=jerarquia,
            es_admin_global=0,
            permite_edicion=1 if jerarquia == JERARQUIA_AREA else 0,
            modulos=[],
            modulos_solo_lectura=[],
            modulos_edicion=[],
        )
    jerarquia = jerarquia_maxima_desde_filas(filas) or resumen.jerarquia
    permite = 1 if resumen.modulos_edicion else 0
    if jerarquia == JERARQUIA_AREA and resumen.modulos_edicion:
        permite = 1
    return AccesoUsuario(
        jerarquia=jerarquia,
        nombre_rol=jerarquia,
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
    *,
    filtrar_modulos_huerfanos: bool = False,
) -> AccesoUsuario | None:
    if filas is None:
        filas = listar_filas_usuario(db, int(usuario_id))
    if not usuario_tiene_acceso_indicadores(filas):
        return None
    acceso = resolver_acceso_desde_filas(db, filas)
    if acceso is None:
        return None
    if not filtrar_modulos_huerfanos:
        return acceso
    return filtrar_acceso_modulos_huerfanos(
        db,
        acceso,
        usuario_id=int(usuario_id),
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
