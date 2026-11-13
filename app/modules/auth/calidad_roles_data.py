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

_JERARQUIA_ORDEN = (
    JERARQUIA_GLOBAL,
    JERARQUIA_AREA,
    JERARQUIA_USUARIO,
)

_esquema_v2: bool | None = None


def _normalize_modulo(value: str | None) -> str | None:
    if value is None:
        return None
    raw = value.strip().upper().replace(" ", "_")
    return raw or None


def _normalizar_jerarquia_valor(value: str | None) -> str | None:
    if value is None:
        return None
    clave = value.strip().upper().replace(" ", "_")
    if not clave:
        return None
    if clave in ROLES_GLOBAL_LEGACY:
        return JERARQUIA_GLOBAL
    if clave in JERARQUIAS:
        return clave
    if clave in {"ADMINISTRADOR_DE_AREA", "ADMIN_AREA", "ADMINISTRADORAREA"}:
        return JERARQUIA_AREA
    return None


def _jerarquia_en_fila(fila: FilaCalidadRol) -> str | None:
    for bruto in (fila.jerarquia, fila.rol_legacy):
        normalizada = _normalizar_jerarquia_valor(bruto)
        if normalizada:
            return normalizada
    return None


def jerarquia_maxima_desde_filas(filas: list[FilaCalidadRol]) -> str | None:
    """Jerarquía de mayor privilegio presente en INTRANET_CALIDAD_ROLES."""
    encontradas: set[str] = set()
    for fila in filas:
        j = _jerarquia_en_fila(fila)
        if j:
            encontradas.add(j)
    for j in _JERARQUIA_ORDEN:
        if j in encontradas:
            return j
    return None


def usuario_tiene_acceso_indicadores(filas: list[FilaCalidadRol]) -> bool:
    if not filas:
        return False
    if jerarquia_maxima_desde_filas(filas):
        return True
    return any(_normalize_modulo(fila.modulo) for fila in filas)


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
    if _esquema_v2 is True:
        return True
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
    return bool(_esquema_v2)


def _fila_desde_orm(row: IntranetCalidadRol) -> FilaCalidadRol:
    return FilaCalidadRol(
        usuario_id=int(row.usuario_id),
        jerarquia=(row.jerarquia or "").strip().upper() or None,
        permiso=(row.permiso or "").strip().upper() or None,
        modulo=_normalize_modulo(row.modulo),
    )


def _fila_desde_columnas_bd(
    uid: int,
    rol: str | None,
    nombre_rol: str | None,
    modulo: str | None,
) -> FilaCalidadRol:
    """Interpreta una fila Oracle: ROL=jerarquía, NOMBRE_ROL=EDITOR|LECTOR, MODULO=código."""
    mod = _normalize_modulo(modulo) if modulo else None
    r = (rol or "").strip().upper() or None
    perm = (nombre_rol or "").strip().upper() if nombre_rol else None
    jer = _normalizar_jerarquia_valor(r)
    if jer in JERARQUIAS:
        permiso = perm if perm in {PERMISO_LECTOR, PERMISO_EDITOR} else PERMISO_EDITOR
        return FilaCalidadRol(
            usuario_id=int(uid),
            jerarquia=jer,
            permiso=permiso,
            modulo=mod,
        )
    if mod:
        permiso = (
            r
            if r in {PERMISO_LECTOR, PERMISO_EDITOR}
            else perm if perm in {PERMISO_LECTOR, PERMISO_EDITOR} else PERMISO_EDITOR
        )
        return FilaCalidadRol(
            usuario_id=int(uid),
            jerarquia=JERARQUIA_USUARIO,
            permiso=permiso,
            modulo=mod,
        )
    legacy = r or perm
    if legacy in ROLES_GLOBAL_LEGACY:
        legacy = JERARQUIA_GLOBAL
    return FilaCalidadRol(usuario_id=int(uid), rol_legacy=legacy)


def _listar_filas_sql_v2(db: Session, usuario_id: int | None) -> list[FilaCalidadRol] | None:
    try:
        if usuario_id is None:
            result = db.execute(
                text(
                    'SELECT "USUARIO_ID", "ROL", "NOMBRE_ROL", "MODULO" '
                    'FROM "INTRANET_CALIDAD_ROLES"'
                )
            )
        else:
            result = db.execute(
                text(
                    'SELECT "USUARIO_ID", "ROL", "NOMBRE_ROL", "MODULO" '
                    'FROM "INTRANET_CALIDAD_ROLES" WHERE "USUARIO_ID" = :uid'
                ),
                {"uid": int(usuario_id)},
            )
        return [
            _fila_desde_columnas_bd(int(uid), rol, nombre_rol, modulo)
            for uid, rol, nombre_rol, modulo in result
        ]
    except DatabaseError as exc:
        db.rollback()
        if _es_columna_invalida(exc):
            return None
        raise


def _listar_filas_sql_legacy(db: Session, usuario_id: int | None) -> list[FilaCalidadRol]:
    if usuario_id is None:
        result = db.execute(
            text('SELECT "USUARIO_ID", "ROL", "MODULO" FROM "INTRANET_CALIDAD_ROLES"')
        )
    else:
        result = db.execute(
            text(
                'SELECT "USUARIO_ID", "ROL", "MODULO" FROM "INTRANET_CALIDAD_ROLES" '
                'WHERE "USUARIO_ID" = :uid'
            ),
            {"uid": int(usuario_id)},
        )
    filas: list[FilaCalidadRol] = []
    for uid_row, rol, modulo in result:
        filas.append(_fila_desde_columnas_bd(int(uid_row), rol, None, modulo))
    return filas


def listar_filas_usuario(db: Session, usuario_id: int) -> list[FilaCalidadRol]:
    global _esquema_v2
    uid = int(usuario_id)
    try:
        rows = db.scalars(
            select(IntranetCalidadRol).where(IntranetCalidadRol.usuario_id == uid)
        ).all()
        _esquema_v2 = True
        return [_fila_desde_orm(row) for row in rows]
    except DatabaseError as exc:
        db.rollback()
        if not _es_columna_invalida(exc):
            raise

    filas = _listar_filas_sql_v2(db, uid)
    if filas is not None:
        _esquema_v2 = True
        return filas

    _esquema_v2 = False
    return _listar_filas_sql_legacy(db, uid)


def listar_todos_usuarios_con_filas(db: Session) -> dict[int, list[FilaCalidadRol]]:
    global _esquema_v2
    grouped: dict[int, list[FilaCalidadRol]] = {}
    try:
        rows = db.scalars(select(IntranetCalidadRol)).all()
        _esquema_v2 = True
        for row in rows:
            fila = _fila_desde_orm(row)
            grouped.setdefault(fila.usuario_id, []).append(fila)
        return grouped
    except DatabaseError as exc:
        db.rollback()
        if not _es_columna_invalida(exc):
            raise

    filas = _listar_filas_sql_v2(db, None)
    if filas is not None:
        _esquema_v2 = True
        for fila in filas:
            grouped.setdefault(fila.usuario_id, []).append(fila)
        return grouped

    _esquema_v2 = False
    for fila in _listar_filas_sql_legacy(db, None):
        grouped.setdefault(fila.usuario_id, []).append(fila)
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

    jerarquia = jerarquia_maxima_desde_filas(filas) or JERARQUIA_USUARIO

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
    jerarquia = jerarquia_maxima_desde_filas(filas) or resumen.jerarquia
    if jerarquia in JERARQUIAS:
        return jerarquia
    if resumen.modulos:
        return JERARQUIA_USUARIO
    return None


def nombre_rol_y_modulos_desde_filas(
    filas: list[FilaCalidadRol],
) -> tuple[str | None, list[str]]:
    resumen = resolver_resumen_accesos(filas)
    if resumen.es_admin_global:
        return JERARQUIA_GLOBAL, []
    jerarquia = jerarquia_maxima_desde_filas(filas) or resumen.jerarquia
    if jerarquia in {JERARQUIA_GLOBAL, JERARQUIA_AREA}:
        return jerarquia, resumen.modulos
    if resumen.modulos:
        return jerarquia or JERARQUIA_USUARIO, resumen.modulos
    return None, []


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
