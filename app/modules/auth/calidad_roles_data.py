"""INTRANET_CALIDAD_ROLES: ROL=jerarquía, NOMBRE_ROL=EDITOR|LECTOR, MODULO=área."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import delete, select, text
from sqlalchemy.exc import DatabaseError
from sqlalchemy.orm import Session

from app.models import IntranetCalidadRol

JERARQUIA_GLOBAL = "ADMINISTRADOR_GLOBAL"
JERARQUIA_AREA = "ADMINISTRADOR_AREA"
JERARQUIA_USUARIO = "USUARIO"
JERARQUIAS = frozenset({JERARQUIA_GLOBAL, JERARQUIA_AREA, JERARQUIA_USUARIO})

PERMISO_LECTOR = "LECTOR"
PERMISO_EDITOR = "EDITOR"

# Alias legado
ROLES_GLOBAL_LEGACY = frozenset({"ADMIN", "ADMINISTRADOR"})

_esquema_v2: bool | None = None


def _normalize_modulo(value: str | None) -> str | None:
    if value is None:
        return None
    raw = value.strip().upper().replace(" ", "_")
    return raw or None


def _es_columna_invalida(exc: BaseException) -> bool:
    msg = str(exc).upper()
    return "ORA-00904" in msg or "INVALID IDENTIFIER" in msg


@dataclass(frozen=True)
class FilaCalidadRol:
    usuario_id: int
    jerarquia: str | None = None
    permiso: str | None = None
    modulo: str | None = None
    rol_legacy: str | None = None


@dataclass(frozen=True)
class AccesoModuloResumen:
    jerarquia: str
    modulos: list[str]
    modulos_solo_lectura: list[str]
    modulos_edicion: list[str]
    es_admin_global: bool


def detectar_esquema_v2(db: Session) -> bool:
    """True si existen columnas ROL + NOMBRE_ROL + MODULO (modelo tenant)."""
    global _esquema_v2
    if _esquema_v2 is not None:
        return _esquema_v2
    try:
        db.execute(
            text(
                'SELECT "ROL", "NOMBRE_ROL", "MODULO" '
                'FROM "INTRANET_CALIDAD_ROLES" WHERE ROWNUM = 1'
            )
        )
        _esquema_v2 = True
    except DatabaseError as exc:
        db.rollback()
        if _es_columna_invalida(exc):
            _esquema_v2 = False
        else:
            raise
    return _esquema_v2


def listar_filas_usuario(db: Session, usuario_id: int) -> list[FilaCalidadRol]:
    if detectar_esquema_v2(db):
        rows = db.scalars(
            select(IntranetCalidadRol).where(
                IntranetCalidadRol.usuario_id == usuario_id
            )
        ).all()
        return [
            FilaCalidadRol(
                usuario_id=row.usuario_id,
                jerarquia=(row.jerarquia or "").strip().upper() or None,
                permiso=(row.permiso or "").strip().upper() or None,
                modulo=_normalize_modulo(row.modulo),
            )
            for row in rows
        ]

    result = db.execute(
        text(
            'SELECT "USUARIO_ID", "ROL", "MODULO" FROM "INTRANET_CALIDAD_ROLES" '
            'WHERE "USUARIO_ID" = :uid'
        ),
        {"uid": usuario_id},
    )
    filas: list[FilaCalidadRol] = []
    for uid_row, rol, modulo in result:
        mod = _normalize_modulo(modulo) if modulo else None
        r = (rol or "").strip().upper() or None
        if mod:
            filas.append(
                FilaCalidadRol(
                    usuario_id=int(uid_row),
                    jerarquia=JERARQUIA_USUARIO,
                    permiso=r if r in {PERMISO_LECTOR, PERMISO_EDITOR} else PERMISO_EDITOR,
                    modulo=mod,
                )
            )
        else:
            filas.append(FilaCalidadRol(usuario_id=int(uid_row), rol_legacy=r))
    return filas


def listar_todos_usuarios_con_filas(db: Session) -> dict[int, list[FilaCalidadRol]]:
    if detectar_esquema_v2(db):
        rows = db.scalars(select(IntranetCalidadRol)).all()
        grouped: dict[int, list[FilaCalidadRol]] = {}
        for row in rows:
            grouped.setdefault(row.usuario_id, []).append(
                FilaCalidadRol(
                    usuario_id=row.usuario_id,
                    jerarquia=(row.jerarquia or "").strip().upper() or None,
                    permiso=(row.permiso or "").strip().upper() or None,
                    modulo=_normalize_modulo(row.modulo),
                )
            )
        return grouped

    result = db.execute(
        text('SELECT "USUARIO_ID", "ROL", "MODULO" FROM "INTRANET_CALIDAD_ROLES"')
    )
    grouped: dict[int, list[FilaCalidadRol]] = {}
    for uid_row, rol, modulo in result:
        uid = int(uid_row)
        mod = _normalize_modulo(modulo) if modulo else None
        r = (rol or "").strip().upper() or None
        if mod:
            grouped.setdefault(uid, []).append(
                FilaCalidadRol(
                    usuario_id=uid,
                    jerarquia=JERARQUIA_USUARIO,
                    permiso=r if r in {PERMISO_LECTOR, PERMISO_EDITOR} else PERMISO_EDITOR,
                    modulo=mod,
                )
            )
        else:
            grouped.setdefault(uid, []).append(
                FilaCalidadRol(usuario_id=uid, rol_legacy=r)
            )
    return grouped


def resolver_resumen_accesos(filas: list[FilaCalidadRol]) -> AccesoModuloResumen:
    vacio = AccesoModuloResumen(
        jerarquia="",
        modulos=[],
        modulos_solo_lectura=[],
        modulos_edicion=[],
        es_admin_global=False,
    )
    if not filas:
        return vacio

    for fila in filas:
        j = (fila.jerarquia or fila.rol_legacy or "").strip().upper()
        if j in ROLES_GLOBAL_LEGACY:
            j = JERARQUIA_GLOBAL
        if j == JERARQUIA_GLOBAL and not fila.modulo:
            return AccesoModuloResumen(
                jerarquia=JERARQUIA_GLOBAL,
                modulos=[],
                modulos_solo_lectura=[],
                modulos_edicion=[],
                es_admin_global=True,
            )

    jerarquia = (
        (filas[0].jerarquia or JERARQUIA_USUARIO).strip().upper()
        if filas[0].jerarquia
        else JERARQUIA_USUARIO
    )
    if jerarquia not in JERARQUIAS:
        jerarquia = JERARQUIA_USUARIO

    modulos: list[str] = []
    solo_lectura: list[str] = []
    edicion: list[str] = []

    for fila in filas:
        codigo = _normalize_modulo(fila.modulo)
        if not codigo:
            continue
        if codigo not in modulos:
            modulos.append(codigo)
        perm = (fila.permiso or PERMISO_EDITOR).strip().upper()
        if perm == PERMISO_LECTOR:
            if codigo not in solo_lectura:
                solo_lectura.append(codigo)
        else:
            if codigo not in edicion:
                edicion.append(codigo)

    return AccesoModuloResumen(
        jerarquia=jerarquia,
        modulos=modulos,
        modulos_solo_lectura=solo_lectura,
        modulos_edicion=edicion,
        es_admin_global=False,
    )


def accesos_desde_filas(filas: list[FilaCalidadRol]) -> list[dict]:
    resumen = resolver_resumen_accesos(filas)
    out: list[dict] = []
    for codigo in resumen.modulos:
        out.append(
            {
                "modulo": codigo,
                "solo_lectura": codigo in resumen.modulos_solo_lectura,
            }
        )
    return out


def jerarquia_de_filas(filas: list[FilaCalidadRol]) -> str | None:
    resumen = resolver_resumen_accesos(filas)
    if resumen.es_admin_global:
        return JERARQUIA_GLOBAL
    if not resumen.modulos and not resumen.es_admin_global:
        return None
    return resumen.jerarquia or None


def nombre_rol_y_modulos_desde_filas(
    filas: list[FilaCalidadRol],
) -> tuple[str | None, list[str]]:
    resumen = resolver_resumen_accesos(filas)
    if resumen.es_admin_global:
        return JERARQUIA_GLOBAL, []
    if not resumen.modulos:
        return None, []
    return resumen.jerarquia, resumen.modulos


def usuario_es_admin_global_filas(filas: list[FilaCalidadRol]) -> bool:
    return resolver_resumen_accesos(filas).es_admin_global


def reemplazar_accesos_modulos(
    db: Session,
    usuario_id: int,
    jerarquia: str,
    accesos: list[dict],
) -> None:
    clave = (jerarquia or "").strip().upper()
    if clave not in JERARQUIAS:
        raise ValueError("Jerarquía no válida")

    if clave == JERARQUIA_GLOBAL:
        db.execute(
            delete(IntranetCalidadRol).where(
                IntranetCalidadRol.usuario_id == usuario_id
            )
        )
        if not detectar_esquema_v2(db):
            db.execute(
                text('DELETE FROM "INTRANET_CALIDAD_ROLES" WHERE "USUARIO_ID" = :uid'),
                {"uid": usuario_id},
            )
            db.execute(
                text(
                    'INSERT INTO "INTRANET_CALIDAD_ROLES" ("USUARIO_ID", "ROL") '
                    "VALUES (:uid, 'ADMIN')"
                ),
                {"uid": usuario_id},
            )
            db.flush()
            return
        db.add(
            IntranetCalidadRol(
                usuario_id=usuario_id,
                jerarquia=JERARQUIA_GLOBAL,
                permiso=PERMISO_EDITOR,
                modulo=None,
            )
        )
        db.flush()
        return

    if not accesos:
        raise ValueError("Debe seleccionar al menos un módulo")

    filas_insert: list[tuple[str, str, str]] = []
    vistos: set[str] = set()
    for item in accesos:
        codigo = _normalize_modulo(item.get("modulo"))
        if not codigo or codigo in vistos:
            continue
        vistos.add(codigo)
        permiso = PERMISO_LECTOR if item.get("solo_lectura") else PERMISO_EDITOR
        filas_insert.append((clave, permiso, codigo))

    if not filas_insert:
        raise ValueError("Debe seleccionar al menos un módulo")

    db.execute(
        delete(IntranetCalidadRol).where(IntranetCalidadRol.usuario_id == usuario_id)
    )
    if not detectar_esquema_v2(db):
        db.execute(
            text('DELETE FROM "INTRANET_CALIDAD_ROLES" WHERE "USUARIO_ID" = :uid'),
            {"uid": usuario_id},
        )

    for jer, perm, codigo in filas_insert:
        if detectar_esquema_v2(db):
            db.add(
                IntranetCalidadRol(
                    usuario_id=usuario_id,
                    jerarquia=jer,
                    permiso=perm,
                    modulo=codigo,
                )
            )
        else:
            db.execute(
                text(
                    'INSERT INTO "INTRANET_CALIDAD_ROLES" '
                    '("USUARIO_ID", "ROL", "MODULO") VALUES (:uid, :rol, :modulo)'
                ),
                {"uid": usuario_id, "rol": perm, "modulo": codigo},
            )
    db.flush()


def eliminar_accesos_usuario(db: Session, usuario_id: int) -> None:
    db.execute(
        delete(IntranetCalidadRol).where(
            IntranetCalidadRol.usuario_id == usuario_id
        )
    )
    if not detectar_esquema_v2(db):
        db.execute(
            text('DELETE FROM "INTRANET_CALIDAD_ROLES" WHERE "USUARIO_ID" = :uid'),
            {"uid": usuario_id},
        )


# Compatibilidad
def detectar_esquema_legacy(db: Session) -> bool:
    return not detectar_esquema_v2(db)
