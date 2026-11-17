"""Filtros de consulta para INTRANET_CALIDAD_AUDITORIA (sin cambios de esquema)."""
from __future__ import annotations

from sqlalchemy import and_, false, func, not_, or_, select, true
from sqlalchemy.orm import Session
from sqlalchemy.sql import ColumnElement

from app.core.ids import is_defined_user_id
from app.models import (
    IntranetCalidad,
    IntranetCalidadAuditoria,
    IntranetCalidadRol,
    IntranetCalidadVersion,
    Usuario,
)
from app.modules.auth.calidad_roles_data import (
    JERARQUIA_GLOBAL,
    jerarquia_maxima_desde_filas,
    listar_filas_usuario,
    listar_todos_usuarios_con_filas,
)
from app.modules.auth.permissions import modulos_en_token_set


def normalizar_codigo_modulo(value: str | None) -> str:
    return (value or "").strip().upper().replace(" ", "_")


def expr_modulo_auditoria():
    col = IntranetCalidadAuditoria.modulo
    return func.upper(func.trim(func.replace(col, " ", "_")))


def modulos_anclados_usuario(db: Session, requester: dict) -> set[str]:
    """MODULO en INTRANET_CALIDAD_ROLES para el administrador de área."""
    modulos: set[str] = set()
    uid = requester.get("id")
    if is_defined_user_id(uid):
        rows = db.scalars(
            select(IntranetCalidadRol.modulo).where(
                IntranetCalidadRol.usuario_id == int(uid),
                IntranetCalidadRol.modulo.isnot(None),
                func.trim(IntranetCalidadRol.modulo) != "",
            )
        ).all()
        for m in rows:
            cod = normalizar_codigo_modulo(m)
            if cod:
                modulos.add(cod)
        if not modulos:
            for fila in listar_filas_usuario(db, int(uid)):
                if fila.modulo:
                    cod = normalizar_codigo_modulo(fila.modulo)
                    if cod:
                        modulos.add(cod)
    if not modulos:
        modulos = {
            normalizar_codigo_modulo(m)
            for m in modulos_en_token_set(requester)
            if normalizar_codigo_modulo(m)
        }
    return modulos


def _logins_administrador_global(db: Session) -> list[str]:
    uids: list[int] = []
    for uid, filas in listar_todos_usuarios_con_filas(db).items():
        if jerarquia_maxima_desde_filas(filas) == JERARQUIA_GLOBAL:
            uids.append(int(uid))
    if not uids:
        return []
    usuarios = db.scalars(select(Usuario).where(Usuario.id.in_(uids))).all()
    logins: list[str] = []
    for user in usuarios:
        login = (user.usuario or "").strip().upper()
        if login:
            logins.append(login)
    return logins


def _tiene_modulo_asociado() -> ColumnElement[bool]:
    col = IntranetCalidadAuditoria.modulo
    return func.length(func.trim(col)) > 0


def _excluir_actores_globales(db: Session) -> ColumnElement[bool]:
    logins = _logins_administrador_global(db)
    if not logins:
        return true()
    partes = [
        not_(func.upper(IntranetCalidadAuditoria.usuario).like(f"%{login}%"))
        for login in logins
    ]
    return and_(*partes)


def _palabras_clave_modulo_en_detalle(codigo: str) -> list[str]:
    claves = [codigo]
    if codigo == "EPIDEMIOLOGIA":
        claves.extend(["IAAS", "EPIDEMIOLOGIA", "INFECCION", "INFECCI"])
    elif codigo == "RESOLUCION_256":
        claves.extend(["RESOLUCION_256", "RESOLUCION 256", "RESOLUCI"])
    elif codigo == "SG_SST":
        claves.extend(["SG_SST", "SG-SST", "SST"])
    return claves


def _legacy_indicadores_planes_en_alcance(
    db: Session,
    alcance: set[str],
) -> ColumnElement[bool]:
    """Filas históricas MODULO=INDICADORES|PLANES_MEJORA asociadas a indicadores del área."""
    if not alcance:
        return false()
    codigos = sorted(alcance)
    norm_calidad = func.upper(
        func.trim(func.replace(IntranetCalidad.modulo, " ", "_"))
    )
    calidad_ids = list(
        db.scalars(
            select(IntranetCalidad.id).where(norm_calidad.in_(codigos))
        ).all()
    )
    version_ids = list(
        db.scalars(
            select(IntranetCalidadVersion.id)
            .join(IntranetCalidad, IntranetCalidad.id == IntranetCalidadVersion.calidad_id)
            .where(norm_calidad.in_(codigos))
        ).all()
    )
    menciones: list[ColumnElement[bool]] = []
    for cod in codigos:
        for clave in _palabras_clave_modulo_en_detalle(cod):
            menciones.append(
                func.upper(IntranetCalidadAuditoria.detalle).like(f"%{clave.upper()}%")
            )
    for cid in calidad_ids:
        menciones.append(
            IntranetCalidadAuditoria.detalle.like(f"%calidad_id={cid}%")
        )
        menciones.append(IntranetCalidadAuditoria.detalle.like(f"%calidad_id={cid},%"))
    for vid in version_ids:
        menciones.append(IntranetCalidadAuditoria.detalle.like(f"%versión {vid}%"))
        menciones.append(IntranetCalidadAuditoria.detalle.like(f"%versi%n {vid}%"))
        menciones.append(IntranetCalidadAuditoria.detalle.like(f"%versión id={vid}%"))
        menciones.append(IntranetCalidadAuditoria.detalle.like(f"% {vid})%"))
    if not menciones:
        return false()
    expr = expr_modulo_auditoria()
    return and_(expr.in_(("INDICADORES", "PLANES_MEJORA")), or_(*menciones))


def _usuarios_accesos_en_alcance(alcance: set[str]) -> ColumnElement[bool]:
    if not alcance:
        return false()
    menciones = [
        func.upper(IntranetCalidadAuditoria.detalle).like(f"%{cod}%")
        for cod in sorted(alcance)
    ]
    return and_(expr_modulo_auditoria() == "USUARIOS", or_(*menciones))


def condicion_alcance_administrador_area(
    db: Session,
    alcance: set[str],
) -> ColumnElement[bool]:
    if not alcance:
        return false()
    expr = expr_modulo_auditoria()
    codigos = sorted(alcance)
    return and_(
        _tiene_modulo_asociado(),
        _excluir_actores_globales(db),
        or_(
            expr.in_(codigos),
            _legacy_indicadores_planes_en_alcance(db, alcance),
            _usuarios_accesos_en_alcance(alcance),
        ),
    )


def condicion_filtro_modulo_opcional(
    alcance: set[str] | None,
    modulo_query: str | None,
) -> ColumnElement[bool] | bool | None:
    if not modulo_query:
        return None
    codigo = normalizar_codigo_modulo(modulo_query)
    if alcance is not None:
        if codigo in alcance:
            return expr_modulo_auditoria() == codigo
        if codigo == "USUARIOS":
            return expr_modulo_auditoria() == "USUARIOS"
        return False
    return expr_modulo_auditoria() == codigo