from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import IntranetCalidad, IntranetPlanMejora
from app.modules.calidad.meta_evaluation import evaluar_cumplimiento_meta
from app.modules.calidad.planes_schemas import (
    IncumplimientoOut,
    PlanEstadoMasivoResponse,
    PlanEstadoMasivoUpdate,
    PlanMejoraCreate,
    PlanMejoraListadoOut,
    PlanMejoraOut,
)
from app.modules.calidad.router import MONTH_NAMES, _normalize_modulo, _normalize_requiere_plan
from app.modules.auditoria.dependencies import get_audit_actor
from app.modules.auditoria.service import registrar_auditoria
from app.modules.auth.admin_dependencies import get_current_token_payload
from app.modules.auth.module_access import resolver_filtro_modulo
from app.shared.database.session import get_db

router = APIRouter(tags=["Planes de mejora"])

MONTH_LABELS = {
    1: "enero",
    2: "febrero",
    3: "marzo",
    4: "abril",
    5: "mayo",
    6: "junio",
    7: "julio",
    8: "agosto",
    9: "septiembre",
    10: "octubre",
    11: "noviembre",
    12: "diciembre",
}


def _month_has_data(quality: IntranetCalidad, month: int) -> bool:
    name = MONTH_NAMES.get(month)
    if not name:
        return False
    numerador = getattr(quality, f"numerador_{name}", None)
    denominador = getattr(quality, f"denominador_{name}", None)
    indicador = getattr(quality, f"indicador_{name}", None)
    if indicador is None:
        return False
    return (float(numerador or 0) != 0) or (float(denominador or 0) != 0)


def _month_indicator_value(quality: IntranetCalidad, month: int) -> float | None:
    name = MONTH_NAMES.get(month)
    if not name:
        return None
    value = getattr(quality, f"indicador_{name}", None)
    if value is None:
        return None
    return float(value)


def _plan_exists(db: Session, calidad_id: int, year: int, mes: int) -> bool:
    existing = db.scalar(
        select(IntranetPlanMejora.id).where(
            IntranetPlanMejora.calidad_id == calidad_id,
            IntranetPlanMejora.year == year,
            IntranetPlanMejora.mes == mes,
        )
    )
    return existing is not None


def _format_incumplimiento_message(
    modulo: str,
    indicador: str,
    mes_nombre: str,
    year: int,
    meta: str | None,
    valor: float,
) -> str:
    meta_text = meta or "—"
    return (
        f"La meta en el indicador de la {modulo} en el indicador {indicador} "
        f"no se cumplió en el mes de {mes_nombre} ({year}). "
        f"Meta: {meta_text}, Obtenido: {valor}"
    )


@router.get("/notificaciones/incumplimientos", response_model=list[IncumplimientoOut])
def listar_incumplimientos(
    modulo: str = Query(..., description="RESOLUCION_256 o EPIDEMIOLOGIA"),
    year: int | None = Query(None),
    db: Session = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
):
    filter_modulo = resolver_filtro_modulo(
        token_payload, modulo, normalize=_normalize_modulo
    )
    if not filter_modulo:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Parámetro modulo requerido",
        )
    stmt = select(IntranetCalidad).where(IntranetCalidad.modulo == filter_modulo)
    if year is not None:
        stmt = stmt.where(IntranetCalidad.year == year)

    records = db.scalars(stmt).all()
    alerts: list[IncumplimientoOut] = []

    for quality in records:
        record_year = quality.year or year or 0
        meta = quality.meta_institucional
        indicador_name = quality.indicador or "Indicador sin nombre"
        modulo_value = quality.modulo or filter_modulo

        for month in range(1, 13):
            if not _month_has_data(quality, month):
                continue

            valor = _month_indicator_value(quality, month)
            if valor is None:
                continue

            if evaluar_cumplimiento_meta(valor, meta):
                continue

            month_name = MONTH_NAMES.get(month)
            if not month_name:
                continue

            requiere_plan = _normalize_requiere_plan(
                getattr(quality, f"requiere_plan_{month_name}", None)
            )
            if requiere_plan != "SI":
                continue

            if _plan_exists(db, quality.id, record_year, month):
                continue

            mes_nombre = MONTH_LABELS[month]
            alerts.append(
                IncumplimientoOut(
                    calidad_id=quality.id,
                    modulo=modulo_value,
                    year=record_year,
                    mes=month,
                    mes_nombre=mes_nombre,
                    indicador=indicador_name,
                    meta_institucional=meta,
                    valor_obtenido=valor,
                    mensaje=_format_incumplimiento_message(
                        modulo_value,
                        indicador_name,
                        mes_nombre,
                        record_year,
                        meta,
                        valor,
                    ),
                )
            )

    return alerts


@router.post("/planes-mejora", response_model=PlanMejoraOut, status_code=status.HTTP_201_CREATED)
def crear_plan_mejora(
    payload: PlanMejoraCreate,
    db: Session = Depends(get_db),
    actor: str = Depends(get_audit_actor),
):
    quality = db.get(IntranetCalidad, payload.calidad_id)
    if quality is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Indicador (calidad_id) no encontrado",
        )

    if _plan_exists(db, payload.calidad_id, payload.year, payload.mes):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un plan de mejora para este indicador, año y mes",
        )

    plan = IntranetPlanMejora(
        calidad_id=payload.calidad_id,
        modulo=_normalize_modulo(payload.modulo) or (quality.modulo or ""),
        year=payload.year,
        mes=payload.mes,
        valor_obtenido=payload.valor_obtenido,
        meta_institucional=payload.meta_institucional or quality.meta_institucional,
        observaciones=payload.observaciones,
        responsable_nombre=payload.responsable_nombre,
        responsable_correo=str(payload.responsable_correo),
        fecha_cumplimiento=payload.fecha_cumplimiento,
        estado="PENDIENTE",
    )
    db.add(plan)
    registrar_auditoria(
        db,
        actor=actor,
        accion="POST",
        modulo="PLANES_MEJORA",
        detalle=(
            f"Creó plan de mejora para indicador id={payload.calidad_id}, "
            f"año {payload.year}, mes {payload.mes} ({MONTH_LABELS.get(payload.mes, payload.mes)})"
        ),
    )
    db.commit()
    db.refresh(plan)
    return plan


def _build_planes_query(
    *,
    modulo: str | None = None,
    estado: str | None = None,
    year: int | None = None,
):
    stmt = (
        select(IntranetPlanMejora, IntranetCalidad.indicador)
        .join(IntranetCalidad, IntranetCalidad.id == IntranetPlanMejora.calidad_id)
        .order_by(
            IntranetPlanMejora.year.desc(),
            IntranetPlanMejora.mes.desc(),
            IntranetPlanMejora.id.desc(),
        )
    )
    if modulo:
        stmt = stmt.where(IntranetPlanMejora.modulo == _normalize_modulo(modulo))
    if estado:
        stmt = stmt.where(IntranetPlanMejora.estado == estado.strip().upper())
    if year is not None:
        stmt = stmt.where(IntranetPlanMejora.year == year)
    return stmt


def _plan_to_listado(plan: IntranetPlanMejora, indicador: str | None) -> PlanMejoraListadoOut:
    return PlanMejoraListadoOut(
        id=plan.id,
        calidad_id=plan.calidad_id,
        modulo=plan.modulo,
        year=plan.year,
        mes=plan.mes,
        mes_nombre=MONTH_LABELS.get(plan.mes, str(plan.mes)),
        indicador=indicador or "Indicador sin nombre",
        valor_obtenido=float(plan.valor_obtenido) if plan.valor_obtenido is not None else None,
        meta_institucional=plan.meta_institucional,
        observaciones=str(plan.observaciones or ""),
        responsable_nombre=plan.responsable_nombre,
        responsable_correo=plan.responsable_correo,
        fecha_cumplimiento=plan.fecha_cumplimiento,
        estado=(plan.estado or "PENDIENTE").upper(),
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


@router.get("/planes-mejora/todos", response_model=list[PlanMejoraListadoOut])
def listar_todos_planes_mejora(
    modulo: str | None = Query(None),
    estado: str | None = Query(None),
    year: int | None = Query(None),
    db: Session = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
):
    effective_modulo = resolver_filtro_modulo(
        token_payload, modulo, normalize=_normalize_modulo
    )
    rows = db.execute(
        _build_planes_query(modulo=effective_modulo, estado=estado, year=year)
    ).all()
    return [_plan_to_listado(plan, indicador) for plan, indicador in rows]


@router.patch("/planes-mejora/estado-masivo", response_model=PlanEstadoMasivoResponse)
def actualizar_estado_masivo_planes(
    payload: PlanEstadoMasivoUpdate,
    db: Session = Depends(get_db),
    actor: str = Depends(get_audit_actor),
):
    nuevo_estado = payload.nuevo_estado.upper()
    if nuevo_estado not in {"CUMPLIDO", "NO_CUMPLIDO"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Estado no permitido",
        )

    unique_ids = list(dict.fromkeys(payload.plan_ids))
    existing_ids = list(
        db.scalars(
            select(IntranetPlanMejora.id).where(IntranetPlanMejora.id.in_(unique_ids))
        ).all()
    )

    if not existing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontraron planes con los IDs indicados",
        )

    db.execute(
        update(IntranetPlanMejora)
        .where(IntranetPlanMejora.id.in_(existing_ids))
        .values(estado=nuevo_estado)
    )
    registrar_auditoria(
        db,
        actor=actor,
        accion="PATCH",
        modulo="PLANES_MEJORA",
        detalle=(
            f"Actualizó estado masivo de {len(existing_ids)} plan(es) a {nuevo_estado}. "
            f"IDs: {', '.join(str(i) for i in existing_ids[:20])}"
            f"{'…' if len(existing_ids) > 20 else ''}"
        ),
    )
    db.commit()

    return PlanEstadoMasivoResponse(
        message="Estados actualizados correctamente",
        actualizados=len(existing_ids),
    )


@router.get("/planes-mejora", response_model=list[PlanMejoraOut])
def listar_planes_mejora(
    modulo: str | None = Query(None),
    year: int | None = Query(None),
    db: Session = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
):
    effective_modulo = resolver_filtro_modulo(
        token_payload, modulo, normalize=_normalize_modulo
    )
    stmt = select(IntranetPlanMejora).order_by(
        IntranetPlanMejora.year.desc(),
        IntranetPlanMejora.mes.desc(),
        IntranetPlanMejora.id.desc(),
    )
    if effective_modulo:
        stmt = stmt.where(IntranetPlanMejora.modulo == effective_modulo)
    if year is not None:
        stmt = stmt.where(IntranetPlanMejora.year == year)

    return list(db.scalars(stmt).all())
