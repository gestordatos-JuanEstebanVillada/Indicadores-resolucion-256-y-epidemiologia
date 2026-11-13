from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import IntranetCalidad, IntranetCalidadVersion, IntranetPlanMejora
from app.modules.auth.module_access import filtro_modulos_planes
from app.modules.auth.permissions import (
    assert_lectura_modulo_codigo,
    es_admin_global_token,
)
from app.modules.calidad.meta_evaluation import evaluar_cumplimiento_meta
from app.modules.calidad.planes_router import (
    MONTH_NAMES,
    _month_has_data,
    _month_indicator_value,
    _normalize_modulo,
    _normalize_requiere_plan,
    _plan_exists,
)
from app.modules.dashboard.schemas import (
    DashboardGraficosOut,
    DashboardStatsOut,
    DirectorioIndicadorItem,
    ModuloIndicadoresCount,
)


def _normalizar_codigo(value: str | None) -> str | None:
    return _normalize_modulo(value)


def resolver_alcance_dashboard(
    payload: dict,
    modulo: str | None,
) -> set[str] | None:
    """
    None = sin filtro SQL por módulo (solo admin global sin ?modulo=).
    Set = módulos permitidos para la consulta.
    """
    codigo = _normalizar_codigo(modulo) if modulo else None
    if codigo:
        assert_lectura_modulo_codigo(payload, codigo)
        return {codigo}

    if es_admin_global_token(payload):
        return None

    return filtro_modulos_planes(payload, None, normalize=_normalize_modulo)


def _version_rows(
    db: Session,
    alcance: set[str] | None,
) -> list[tuple]:
    try:
        stmt = (
            select(IntranetCalidadVersion, IntranetCalidad)
            .join(IntranetCalidad, IntranetCalidad.id == IntranetCalidadVersion.calidad_id)
        )
        if alcance:
            codigos = sorted(alcance)
            stmt = stmt.where(
                or_(
                    func.upper(func.coalesce(IntranetCalidadVersion.modulo, "")).in_(
                        codigos
                    ),
                    func.upper(func.coalesce(IntranetCalidad.modulo, "")).in_(codigos),
                )
            )
        return list(db.execute(stmt).all())
    except SQLAlchemyError:
        db.rollback()
        return []


def _legacy_rows(db: Session, alcance: set[str] | None, versioned_ids: set[int]) -> list:
    try:
        stmt = select(IntranetCalidad).order_by(
            IntranetCalidad.year.desc(),
            IntranetCalidad.id.desc(),
        )
        if alcance:
            stmt = stmt.where(
                func.upper(func.coalesce(IntranetCalidad.modulo, "")).in_(sorted(alcance))
            )
        rows = db.scalars(stmt).all()
        return [q for q in rows if q.id not in versioned_ids]
    except SQLAlchemyError:
        db.rollback()
        return []


def _modulo_fila(quality, version) -> str:
    mod = (getattr(version, "modulo", None) or quality.modulo or "").strip().upper()
    return mod.replace(" ", "_") if mod else ""


def _contar_y_directorio(
    db: Session,
    alcance: set[str] | None,
) -> tuple[dict[str, int], list[DirectorioIndicadorItem]]:
    versioned = _version_rows(db, alcance)
    versioned_ids = {q.id for _, q in versioned}
    legacy = _legacy_rows(db, alcance, versioned_ids)

    por_modulo: dict[str, set[str]] = {}
    directorio: dict[tuple[str, str], DirectorioIndicadorItem] = {}

    def registrar(mod: str, nombre: str | None, formula: str | None) -> None:
        codigo = _normalizar_codigo(mod) or ""
        if not codigo:
            return
        if alcance and codigo not in alcance:
            return
        clave_nombre = (nombre or "").strip().lower()
        if not clave_nombre:
            return
        por_modulo.setdefault(codigo, set()).add(clave_nombre)
        key = (codigo, clave_nombre)
        if key not in directorio:
            directorio[key] = DirectorioIndicadorItem(
                modulo=codigo,
                nombre=(nombre or "").strip() or "Sin nombre",
                formula=(formula or "").strip() or "—",
            )

    for version, quality in versioned:
        registrar(_modulo_fila(quality, version), quality.indicador, quality.formula)

    for quality in legacy:
        registrar(quality.modulo, quality.indicador, quality.formula)

    counts = {m: len(nombres) for m, nombres in por_modulo.items()}
    items = sorted(directorio.values(), key=lambda x: (x.modulo, x.nombre))
    return counts, items


def _contar_planes_pendientes(db: Session, alcance: set[str] | None) -> int:
    stmt = select(func.count(IntranetPlanMejora.id)).where(
        func.upper(func.coalesce(IntranetPlanMejora.estado, "")) == "PENDIENTE"
    )
    if alcance:
        stmt = stmt.where(
            func.upper(func.coalesce(IntranetPlanMejora.modulo, "")).in_(sorted(alcance))
        )
    return int(db.scalar(stmt) or 0)


def _incidencias_pendientes(
    db: Session,
    alcance: set[str] | None,
    year: int | None = None,
) -> tuple[int, list[int]]:
    modulos = sorted(alcance) if alcance else None
    stmt = select(IntranetCalidad)
    if modulos:
        stmt = stmt.where(
            func.upper(func.coalesce(IntranetCalidad.modulo, "")).in_(modulos)
        )
    if year is not None:
        stmt = stmt.where(IntranetCalidad.year == year)

    records = db.scalars(stmt).all()
    total = 0
    por_mes = [0] * 12
    current_year = year or datetime.now().year

    for quality in records:
        record_year = quality.year or current_year
        meta = quality.meta_institucional
        modulo_value = _normalizar_codigo(quality.modulo) or ""
        if alcance and modulo_value and modulo_value not in alcance:
            continue

        for month in range(1, 13):
            if not _month_has_data(quality, month):
                continue
            valor = _month_indicator_value(quality, month)
            if valor is None or evaluar_cumplimiento_meta(valor, meta):
                continue
            month_name = MONTH_NAMES.get(month)
            if not month_name:
                continue
            if _normalize_requiere_plan(
                getattr(quality, f"requiere_plan_{month_name}", None)
            ) != "SI":
                continue
            if _plan_exists(db, quality.id, record_year, month):
                continue
            total += 1
            if record_year == current_year:
                por_mes[month - 1] += 1

    return total, por_mes


def modulos_acceso_lista(payload: dict, db: Session) -> list[str]:
    if es_admin_global_token(payload):
        try:
            stmt = (
                select(func.distinct(func.upper(func.trim(IntranetCalidad.modulo))))
                .where(IntranetCalidad.modulo.isnot(None))
            )
            rows = db.scalars(stmt).all()
            codigos = sorted({_normalizar_codigo(r) for r in rows if _normalizar_codigo(r)})
            if codigos:
                return codigos
        except SQLAlchemyError:
            db.rollback()
        return ["RESOLUCION_256", "EPIDEMIOLOGIA"]
    mods = filtro_modulos_planes(payload, None, normalize=_normalize_modulo)
    return sorted(mods) if mods else []


def obtener_stats(
    db: Session,
    payload: dict,
    modulo: str | None,
) -> DashboardStatsOut:
    alcance = resolver_alcance_dashboard(payload, modulo)
    counts, directorio = _contar_y_directorio(db, alcance)
    por_modulo = [
        ModuloIndicadoresCount(codigo=k, cantidad=v)
        for k, v in sorted(counts.items())
    ]
    total = sum(counts.values())
    incidencias, _ = _incidencias_pendientes(db, alcance)
    return DashboardStatsOut(
        modulo_consulta=_normalizar_codigo(modulo) if modulo else None,
        modulos_acceso=modulos_acceso_lista(payload, db),
        total_indicadores=total,
        indicadores_por_modulo=por_modulo,
        planes_pendientes=_contar_planes_pendientes(db, alcance),
        incidencias_pendientes=incidencias,
        directorio=directorio,
    )


def obtener_graficos(
    db: Session,
    payload: dict,
    modulo: str | None,
) -> DashboardGraficosOut:
    alcance = resolver_alcance_dashboard(payload, modulo)
    año = datetime.now().year
    counts, _ = _contar_y_directorio(db, alcance)
    _, por_mes = _incidencias_pendientes(db, alcance, year=año)
    distribucion = [
        ModuloIndicadoresCount(codigo=k, cantidad=v)
        for k, v in sorted(counts.items())
    ]
    return DashboardGraficosOut(
        año=año,
        incidencias_por_mes=por_mes,
        distribucion_modulos=distribucion,
    )
