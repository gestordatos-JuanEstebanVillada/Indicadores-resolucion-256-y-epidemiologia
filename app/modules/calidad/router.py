from fastapi import APIRouter, Depends, Query

from fastapi import HTTPException, status

from sqlalchemy import func, or_, select

from sqlalchemy.exc import SQLAlchemyError

from sqlalchemy.orm import Session



from app.database import get_db

from app.models import IntranetCalidad, IntranetCalidadVersion

from app.modules.calidad.constants import MODULO_RESOLUCION_256
from app.modules.calidad.indicator_math import calculate_indicator_value, get_multiplier

from app.modules.calidad.schemas import (

    CalidadCreate,

    IndicadorVersionCreate,

    IndicadorVersionOut,

    IndicadorVersionUpdate,

)



router = APIRouter()



MONTH_NAMES = {

    1: "enero", 2: "febrero", 3: "marzo", 4: "abril", 5: "mayo", 6: "junio",

    7: "julio", 8: "agosto", 9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre",

}





def _quality_rows(quality: IntranetCalidad):

    return [

        {

            "month": month,

            "numerador": getattr(quality, f"numerador_{name}"),

            "denominador": getattr(quality, f"denominador_{name}"),

            "indicador_valor": getattr(quality, f"indicador_{name}"),

        }

        for month, name in MONTH_NAMES.items()

    ]





def _apply_rows(
    quality: IntranetCalidad,
    rows,
    start_month=1,
    *,
    formula: str | None = None,
    indicador_name: str | None = None,
):

    resolved_formula = formula if formula is not None else quality.formula
    resolved_indicador = (
        indicador_name if indicador_name is not None else quality.indicador
    )

    for row in rows:

        if start_month <= row.month <= 12 and row.month in MONTH_NAMES:

            name = MONTH_NAMES[row.month]

            setattr(quality, f"numerador_{name}", row.numerador)

            setattr(quality, f"denominador_{name}", row.denominador)

            indicador_valor = calculate_indicator_value(
                row.numerador,
                row.denominador,
                resolved_formula,
                resolved_indicador or "",
            )

            setattr(quality, f"indicador_{name}", indicador_valor)





def _clear_rows(quality: IntranetCalidad, start_month: int, end_month: int):

    for month, name in MONTH_NAMES.items():

        if start_month <= month <= end_month:

            setattr(quality, f"numerador_{name}", 0)

            setattr(quality, f"denominador_{name}", 0)

            setattr(quality, f"indicador_{name}", 0)





def _normalize_modulo(value: str | None) -> str:

    return (value or "").strip().upper()





def _observatorio_from_payload(value: str | None) -> str | None:

    if value is None:

        return None

    stripped = value.strip()

    return stripped or None





def _modulo_from_record(

    quality: IntranetCalidad,

    version: IntranetCalidadVersion | None = None,

) -> str | None:

    return (version.modulo if version else None) or quality.modulo





def _version_to_dict(version: IntranetCalidadVersion, quality: IntranetCalidad) -> dict:

    return {

        "id": version.id,

        "calidad_id": version.calidad_id,

        "year": quality.year,

        "indicador": version.indicador,

        "formula": version.formula,

        "meta_institucional": version.meta_institucional,

        "observatorio": version.observatorio,

        "modulo": _modulo_from_record(quality, version),

        "mes_inicio": version.mes_inicio,

        "mes_fin": version.mes_fin,

        "rows": _quality_rows(quality),

    }





def _legacy_quality_to_dict(quality: IntranetCalidad) -> dict:

    return {

        "id": -quality.id,

        "calidad_id": quality.id,

        "year": quality.year,

        "indicador": quality.indicador,

        "formula": quality.formula,

        "meta_institucional": quality.meta_institucional,

        "observatorio": quality.observatorio,

        "modulo": quality.modulo,

        "mes_inicio": 1,

        "mes_fin": 12,

        "rows": _quality_rows(quality),

    }





def _row_has_excel_data(row) -> bool:
    if row.numerador is None and row.denominador is None:
        return False

    return (row.numerador or 0) != 0 or (row.denominador or 0) != 0





def _merge_excel_rows_into_quality(
    quality: IntranetCalidad,
    rows,
    *,
    formula: str | None = None,
    indicador_name: str | None = None,
):

    resolved_formula = formula if formula is not None else quality.formula
    resolved_indicador = (
        indicador_name if indicador_name is not None else quality.indicador
    )

    for row in rows:

        month_name = MONTH_NAMES.get(row.month)

        if not month_name:

            continue

        if not _row_has_excel_data(row):

            continue

        setattr(quality, f"numerador_{month_name}", row.numerador)

        setattr(quality, f"denominador_{month_name}", row.denominador)

        indicador_valor = calculate_indicator_value(
            row.numerador,
            row.denominador,
            resolved_formula,
            resolved_indicador or "",
        )

        setattr(quality, f"indicador_{month_name}", indicador_valor)





def _refresh_period_indicators(
    quality: IntranetCalidad,
    formula: str = "",
    indicador_name: str = "",
):

    resolved_formula = formula or quality.formula or ""
    resolved_indicador = indicador_name or quality.indicador or ""
    multiplier = get_multiplier(resolved_formula, resolved_indicador)

    for period_number, months in {

        1: range(1, 4), 2: range(4, 7), 3: range(7, 10), 4: range(10, 13),

    }.items():

        numerator = sum(
            float(getattr(quality, f"numerador_{MONTH_NAMES[month]}") or 0)
            for month in months
        )

        denominator = sum(
            float(getattr(quality, f"denominador_{MONTH_NAMES[month]}") or 0)
            for month in months
        )

        setattr(
            quality,
            f"indicador_trimestre_{period_number}",
            numerator / denominator * multiplier if denominator else None,
        )

    for period_number, months in {1: range(1, 7), 2: range(7, 13)}.items():

        numerator = sum(
            float(getattr(quality, f"numerador_{MONTH_NAMES[month]}") or 0)
            for month in months
        )

        denominator = sum(
            float(getattr(quality, f"denominador_{MONTH_NAMES[month]}") or 0)
            for month in months
        )

        setattr(
            quality,
            f"indicador_semestre_{period_number}",
            numerator / denominator * multiplier if denominator else None,
        )





def _ensure_default_version(
    db: Session,
    quality: IntranetCalidad,
    payload: CalidadCreate,
    observatorio: str | None,
    modulo: str,
):

    version = db.scalar(
        select(IntranetCalidadVersion).where(
            IntranetCalidadVersion.calidad_id == quality.id,
            IntranetCalidadVersion.mes_inicio == 1,
            IntranetCalidadVersion.mes_fin == 12,
        )
    )

    if version is None:

        version = db.scalar(
            select(IntranetCalidadVersion)
            .where(IntranetCalidadVersion.calidad_id == quality.id)
            .order_by(IntranetCalidadVersion.mes_inicio)
        )

    if version is None:

        db.add(
            IntranetCalidadVersion(
                calidad_id=quality.id,
                indicador=payload.indicador,
                formula=payload.formula,
                meta_institucional=payload.meta_institucional,
                observatorio=observatorio,
                modulo=modulo,
                mes_inicio=1,
                mes_fin=12,
            )
        )

        return

    if payload.indicador is not None:

        version.indicador = payload.indicador

    if payload.formula is not None:

        version.formula = payload.formula

    if payload.meta_institucional is not None:

        version.meta_institucional = payload.meta_institucional

    if observatorio is not None:

        version.observatorio = observatorio

    version.modulo = modulo





def upsert_calidad_from_excel_payload(
    db: Session,
    payload: CalidadCreate,
    *,
    default_modulo: str,
) -> dict:

    observatorio = _observatorio_from_payload(payload.observatorio)

    modulo = _normalize_modulo(payload.modulo) or default_modulo

    formula = payload.formula or ""

    indicador_name = payload.indicador or ""



    existing = db.scalar(
        select(IntranetCalidad).where(
            IntranetCalidad.indicador == payload.indicador,
            IntranetCalidad.year == payload.year,
            IntranetCalidad.modulo == modulo,
        )
    )



    if existing:

        if payload.formula is not None:

            existing.formula = payload.formula

        if payload.meta_institucional is not None:

            existing.meta_institucional = payload.meta_institucional

        if observatorio is not None:

            existing.observatorio = observatorio

        existing.modulo = modulo

        _merge_excel_rows_into_quality(
            existing,
            payload.rows,
            formula=payload.formula,
            indicador_name=payload.indicador,
        )

        _refresh_period_indicators(existing, formula, indicador_name)

        _ensure_default_version(db, existing, payload, observatorio, modulo)

        db.commit()

        return {"created": 0, "updated": 1, "id": existing.id}



    monthly_values = _build_monthly_values(
        payload.rows,
        formula,
        indicador_name,
    )

    ic = IntranetCalidad(

        indicador=payload.indicador,

        formula=payload.formula,

        meta_institucional=payload.meta_institucional,

        observatorio=observatorio,

        modulo=modulo,

        year=payload.year,

        **monthly_values,

    )

    db.add(ic)

    db.commit()

    db.refresh(ic)

    db.add(
        IntranetCalidadVersion(
            calidad_id=ic.id,
            indicador=payload.indicador,
            formula=payload.formula,
            meta_institucional=payload.meta_institucional,
            observatorio=observatorio,
            modulo=modulo,
            mes_inicio=1,
            mes_fin=12,
        )
    )

    db.commit()

    return {"created": 1, "updated": 0, "id": ic.id}





def _build_monthly_values(rows, formula="", indicador_name=""):

    multiplier = get_multiplier(formula, indicador_name)

    monthly_values = {}

    rows_by_month = {row.month: row for row in rows}



    for row in rows:

        month_name = MONTH_NAMES.get(row.month)

        if month_name is None:

            continue

        monthly_values[f"numerador_{month_name}"] = row.numerador

        monthly_values[f"denominador_{month_name}"] = row.denominador

        monthly_values[f"indicador_{month_name}"] = calculate_indicator_value(
            row.numerador,
            row.denominador,
            formula,
            indicador_name,
        )



    for period_number, months in {

        1: range(1, 4), 2: range(4, 7), 3: range(7, 10), 4: range(10, 13),

    }.items():

        period_rows = [rows_by_month[month] for month in months if month in rows_by_month]

        numerator = sum(row.numerador or 0 for row in period_rows)

        denominator = sum(row.denominador or 0 for row in period_rows)

        monthly_values[f"indicador_trimestre_{period_number}"] = (

            numerator / denominator * multiplier if denominator else None

        )



    for period_number, months in {1: range(1, 7), 2: range(7, 13)}.items():

        period_rows = [rows_by_month[month] for month in months if month in rows_by_month]

        numerator = sum(row.numerador or 0 for row in period_rows)

        denominator = sum(row.denominador or 0 for row in period_rows)

        monthly_values[f"indicador_semestre_{period_number}"] = (

            numerator / denominator * multiplier if denominator else None

        )



    return monthly_values





@router.get("/indicadores", response_model=list[IndicadorVersionOut])

def listar_indicadores(

    modulo: str | None = Query(None),

    db: Session = Depends(get_db),

):

    filter_modulo = _normalize_modulo(modulo) if modulo else None



    try:

        stmt = (

            select(IntranetCalidadVersion, IntranetCalidad)

            .join(IntranetCalidad, IntranetCalidad.id == IntranetCalidadVersion.calidad_id)

            .order_by(

                IntranetCalidad.year.desc(),

                IntranetCalidadVersion.calidad_id.desc(),

                IntranetCalidadVersion.mes_inicio,

            )

        )

        if filter_modulo:

            stmt = stmt.where(

                or_(

                    func.upper(func.coalesce(IntranetCalidadVersion.modulo, "")) == filter_modulo,

                    func.upper(func.coalesce(IntranetCalidad.modulo, "")) == filter_modulo,

                )

            )

        versions = db.execute(stmt).all()

    except SQLAlchemyError:

        db.rollback()

        versions = []



    result = [

        _version_to_dict(version, quality)

        for version, quality in versions

    ]



    versioned_quality_ids = {item["calidad_id"] for item in result}



    try:

        legacy_stmt = select(IntranetCalidad).order_by(

            IntranetCalidad.year.desc(),

            IntranetCalidad.id.desc(),

        )

        if filter_modulo:

            legacy_stmt = legacy_stmt.where(

                func.upper(func.coalesce(IntranetCalidad.modulo, "")) == filter_modulo

            )

        legacy_rows = db.scalars(legacy_stmt).all()

    except SQLAlchemyError:

        db.rollback()

        legacy_rows = []



    result.extend(

        _legacy_quality_to_dict(quality)

        for quality in legacy_rows

        if quality.id not in versioned_quality_ids

    )



    return result





@router.delete("/indicadores/{version_id}", status_code=status.HTTP_204_NO_CONTENT)

def eliminar_indicador(version_id: int, db: Session = Depends(get_db)):

    version = db.get(IntranetCalidadVersion, version_id)

    if version is None:

        quality = db.get(IntranetCalidad, abs(version_id))

        if quality is None:

            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Indicador no encontrado")

        related_versions = db.scalars(

            select(IntranetCalidadVersion).where(IntranetCalidadVersion.calidad_id == quality.id)

        ).all()

        for related_version in related_versions:

            db.delete(related_version)

        db.flush()

        db.delete(quality)

        db.commit()

        return None



    related_versions = db.scalars(

        select(IntranetCalidadVersion)

        .where(IntranetCalidadVersion.calidad_id == version.calidad_id)

        .order_by(IntranetCalidadVersion.mes_inicio)

    ).all()

    previous = next(

        (item for item in related_versions if item.mes_inicio < version.mes_inicio),

        None,

    )

    following = next(

        (item for item in related_versions if item.mes_inicio > version.mes_inicio),

        None,

    )

    quality = db.get(IntranetCalidad, version.calidad_id)

    if previous is None:

        for related_version in related_versions:

            db.delete(related_version)

        db.flush()

        if quality:

            db.delete(quality)

        db.commit()

        return None



    if quality:

        _clear_rows(quality, version.mes_inicio, version.mes_fin)

    db.delete(version)

    if previous:

        previous.mes_fin = following.mes_inicio - 1 if following else 12

    db.commit()

    return None





@router.put("/indicadores/{version_id}", response_model=IndicadorVersionOut)

def editar_indicador(version_id: int, payload: IndicadorVersionUpdate, db: Session = Depends(get_db)):

    update_data = payload.model_dump(exclude_unset=True, exclude={"rows"})

    if "observatorio" in update_data:

        update_data["observatorio"] = _observatorio_from_payload(update_data["observatorio"])



    version = db.get(IntranetCalidadVersion, version_id)

    if version is None:

        quality = db.get(IntranetCalidad, abs(version_id))

        if quality is None:

            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Indicador no encontrado")



        for field, value in update_data.items():

            setattr(quality, field, value)

        _apply_rows(
            quality,
            payload.rows,
            formula=payload.formula,
            indicador_name=payload.indicador,
        )

        db.add(IntranetCalidadVersion(

            calidad_id=quality.id,

            indicador=quality.indicador,

            formula=quality.formula,

            meta_institucional=quality.meta_institucional,

            observatorio=quality.observatorio,

            modulo=quality.modulo,

            mes_inicio=1,

            mes_fin=12,

        ))

        db.commit()

        return _legacy_quality_to_dict(quality)



    for field, value in update_data.items():

        setattr(version, field, value)

    quality = db.get(IntranetCalidad, version.calidad_id)

    if quality and "observatorio" in update_data:

        quality.observatorio = update_data["observatorio"]

    if quality and "modulo" in update_data:

        quality.modulo = update_data["modulo"]

    _apply_rows(
        quality,
        payload.rows,
        version.mes_inicio,
        formula=payload.formula if payload.formula is not None else version.formula,
        indicador_name=(
            payload.indicador if payload.indicador is not None else version.indicador
        ),
    )

    db.commit()

    return _version_to_dict(version, quality)





@router.post("/indicadores/{calidad_id}/versiones", response_model=IndicadorVersionOut, status_code=201)

def crear_version(calidad_id: int, payload: IndicadorVersionCreate, db: Session = Depends(get_db)):

    calidad = db.get(IntranetCalidad, calidad_id)

    if calidad is None:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Indicador no encontrado")

    if not 1 <= payload.mes_inicio <= 12:

        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="mes_inicio debe estar entre 1 y 12")

    duplicate = db.scalar(

        select(IntranetCalidadVersion).where(

            IntranetCalidadVersion.calidad_id == calidad_id,

            IntranetCalidadVersion.mes_inicio == payload.mes_inicio,

        )

    )

    if duplicate:

        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe una versión desde ese mes")



    current = db.scalar(

        select(IntranetCalidadVersion)

        .where(

            IntranetCalidadVersion.calidad_id == calidad_id,

            IntranetCalidadVersion.mes_inicio < payload.mes_inicio,

            IntranetCalidadVersion.mes_fin >= payload.mes_inicio,

        )

    )

    if current:

        current.mes_fin = payload.mes_inicio - 1



    version_data = payload.model_dump(exclude={"mes_inicio", "rows"})

    version_data["observatorio"] = _observatorio_from_payload(version_data.get("observatorio"))

    if not version_data.get("modulo"):

        version_data["modulo"] = calidad.modulo



    version = IntranetCalidadVersion(

        calidad_id=calidad_id,

        mes_inicio=payload.mes_inicio,

        mes_fin=12,

        **version_data,

    )

    if version_data["observatorio"] is not None:

        calidad.observatorio = version_data["observatorio"]

    if version_data.get("modulo"):

        calidad.modulo = version_data["modulo"]

    _apply_rows(
        calidad,
        payload.rows,
        payload.mes_inicio,
        formula=payload.formula,
        indicador_name=payload.indicador,
    )

    db.add(version)

    db.commit()

    db.refresh(version)

    return _version_to_dict(version, calidad)





@router.post("/calidad", status_code=201)

def crear_calidad(payload: CalidadCreate, db: Session = Depends(get_db)):

    return upsert_calidad_from_excel_payload(
        db,
        payload,
        default_modulo=MODULO_RESOLUCION_256,
    )


