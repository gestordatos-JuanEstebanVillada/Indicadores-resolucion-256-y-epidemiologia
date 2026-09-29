from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import IntranetCalidad, IntranetCalidadVersion
from app.modules.calidad.constants import MODULO_EPIDEMIOLOGIA
from app.modules.calidad.router import (
    MONTH_NAMES,
    _apply_rows,
    _clear_rows,
    _legacy_quality_to_dict,
    _modulo_from_record,
    _normalize_modulo,
    _observatorio_from_payload,
    _quality_rows,
    _version_to_dict,
    upsert_calidad_from_excel_payload,
)
from app.modules.calidad.schemas import (
    CalidadCreate,
    IndicadorVersionCreate,
    IndicadorVersionOut,
    IndicadorVersionUpdate,
)

router = APIRouter()


def _is_epidemiologia_record(
    quality: IntranetCalidad,
    version: IntranetCalidadVersion | None = None,
) -> bool:
    modulo = _normalize_modulo(_modulo_from_record(quality, version))
    if modulo == MODULO_EPIDEMIOLOGIA:
        return True

    observatorio = (version.observatorio if version else None) or quality.observatorio or ""
    normalized = observatorio.strip().upper()
    return (
        normalized == "IAAS"
        or "INFECC" in normalized
        or "EPIDEM" in normalized
    )


def _ensure_epidemiologia_access(
    quality: IntranetCalidad,
    version: IntranetCalidadVersion | None = None,
):
    if not _is_epidemiologia_record(quality, version):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Indicador de epidemiología no encontrado",
        )


@router.get("/iaas/indicadores", response_model=list[IndicadorVersionOut])
def listar_indicadores_iaas(db: Session = Depends(get_db)):
    from app.modules.calidad.router import listar_indicadores

    return listar_indicadores(modulo=MODULO_EPIDEMIOLOGIA, db=db)


@router.delete("/iaas/indicadores/{version_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_indicador_iaas(version_id: int, db: Session = Depends(get_db)):
    version = db.get(IntranetCalidadVersion, version_id)
    if version is None:
        quality = db.get(IntranetCalidad, abs(version_id))
        if quality is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Indicador no encontrado")
        _ensure_epidemiologia_access(quality)
        related_versions = db.scalars(
            select(IntranetCalidadVersion).where(IntranetCalidadVersion.calidad_id == quality.id)
        ).all()
        for related_version in related_versions:
            db.delete(related_version)
        db.flush()
        db.delete(quality)
        db.commit()
        return None

    quality = db.get(IntranetCalidad, version.calidad_id)
    _ensure_epidemiologia_access(quality, version)

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


@router.put("/iaas/indicadores/{version_id}", response_model=IndicadorVersionOut)
def editar_indicador_iaas(version_id: int, payload: IndicadorVersionUpdate, db: Session = Depends(get_db)):
    version = db.get(IntranetCalidadVersion, version_id)
    if version is None:
        quality = db.get(IntranetCalidad, abs(version_id))
        if quality is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Indicador no encontrado")
        _ensure_epidemiologia_access(quality)

        update_data = payload.model_dump(exclude_unset=True, exclude={"rows"})
        if "observatorio" in update_data:
            update_data["observatorio"] = _observatorio_from_payload(update_data["observatorio"])
        update_data["modulo"] = MODULO_EPIDEMIOLOGIA
        for field, value in update_data.items():
            setattr(quality, field, value)
        _apply_rows(
            quality,
            payload.rows,
            formula=payload.formula,
            indicador_name=payload.indicador,
        )
        db.add(
            IntranetCalidadVersion(
                calidad_id=quality.id,
                indicador=quality.indicador,
                formula=quality.formula,
                meta_institucional=quality.meta_institucional,
                observatorio=quality.observatorio,
                modulo=MODULO_EPIDEMIOLOGIA,
                mes_inicio=1,
                mes_fin=12,
            )
        )
        db.commit()
        return _legacy_quality_to_dict(quality)

    quality = db.get(IntranetCalidad, version.calidad_id)
    _ensure_epidemiologia_access(quality, version)

    update_data = payload.model_dump(exclude_unset=True, exclude={"rows"})
    if "observatorio" in update_data:
        update_data["observatorio"] = _observatorio_from_payload(update_data["observatorio"])
    update_data["modulo"] = MODULO_EPIDEMIOLOGIA
    for field, value in update_data.items():
        setattr(version, field, value)
    if quality:
        if "observatorio" in update_data:
            quality.observatorio = update_data["observatorio"]
        quality.modulo = MODULO_EPIDEMIOLOGIA
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


@router.post("/iaas/indicadores/{calidad_id}/versiones", response_model=IndicadorVersionOut, status_code=201)
def crear_version_iaas(calidad_id: int, payload: IndicadorVersionCreate, db: Session = Depends(get_db)):
    calidad = db.get(IntranetCalidad, calidad_id)
    if calidad is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Indicador no encontrado")
    _ensure_epidemiologia_access(calidad)

    if not 1 <= payload.mes_inicio <= 12:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="mes_inicio debe estar entre 1 y 12",
        )

    duplicate = db.scalar(
        select(IntranetCalidadVersion).where(
            IntranetCalidadVersion.calidad_id == calidad_id,
            IntranetCalidadVersion.mes_inicio == payload.mes_inicio,
        )
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe una versión desde ese mes")

    current = db.scalar(
        select(IntranetCalidadVersion).where(
            IntranetCalidadVersion.calidad_id == calidad_id,
            IntranetCalidadVersion.mes_inicio < payload.mes_inicio,
            IntranetCalidadVersion.mes_fin >= payload.mes_inicio,
        )
    )
    if current:
        current.mes_fin = payload.mes_inicio - 1

    version_data = payload.model_dump(exclude={"mes_inicio", "rows"})
    version_data["observatorio"] = _observatorio_from_payload(version_data.get("observatorio"))
    version_data["modulo"] = MODULO_EPIDEMIOLOGIA

    version = IntranetCalidadVersion(
        calidad_id=calidad_id,
        mes_inicio=payload.mes_inicio,
        mes_fin=12,
        **version_data,
    )
    calidad.modulo = MODULO_EPIDEMIOLOGIA
    if version_data["observatorio"] is not None:
        calidad.observatorio = version_data["observatorio"]
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


@router.post("/iaas", status_code=201)
def crear_iaas(payload: CalidadCreate, db: Session = Depends(get_db)):
    return upsert_calidad_from_excel_payload(
        db,
        payload,
        default_modulo=MODULO_EPIDEMIOLOGIA,
    )

