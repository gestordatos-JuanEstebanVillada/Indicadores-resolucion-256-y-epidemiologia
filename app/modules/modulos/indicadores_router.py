from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.modules.auditoria.dependencies import get_audit_actor
from app.modules.auth.permissions import (
    require_escritura_for_modulo,
    require_lectura_for_modulo,
)
from app.modules.calidad.router import (
    crear_calidad,
    crear_version,
    editar_indicador,
    eliminar_indicador,
    listar_indicadores,
)
from app.modules.calidad.schemas import (
    CalidadCreate,
    IndicadorVersionCreate,
    IndicadorVersionOut,
    IndicadorVersionUpdate,
)
from app.modules.modulos.router import obtener_modulo_por_codigo
from app.shared.database.session import get_db

router = APIRouter(prefix="/modulos", tags=["Indicadores por módulo"])


@router.get("/{modulo_codigo}/indicadores", response_model=list[IndicadorVersionOut])
def listar_indicadores_modulo(
    modulo_codigo: str,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_lectura_for_modulo),
):
    obtener_modulo_por_codigo(db, modulo_codigo)
    return listar_indicadores(modulo=modulo_codigo, db=db, _user=_user)


@router.post("/{modulo_codigo}/calidad", status_code=201)
def crear_calidad_modulo(
    modulo_codigo: str,
    payload: CalidadCreate,
    db: Session = Depends(get_db),
    actor: str = Depends(get_audit_actor),
    _user: dict = Depends(require_escritura_for_modulo),
):
    modulo = obtener_modulo_por_codigo(db, modulo_codigo)
    payload_modulo = payload.model_copy(update={"modulo": modulo.codigo})
    return crear_calidad(payload=payload_modulo, db=db, actor=actor, _user=_user)


@router.put("/{modulo_codigo}/indicadores/{version_id}", response_model=IndicadorVersionOut)
def editar_indicador_modulo(
    modulo_codigo: str,
    version_id: int,
    payload: IndicadorVersionUpdate,
    db: Session = Depends(get_db),
    actor: str = Depends(get_audit_actor),
    _user: dict = Depends(require_escritura_for_modulo),
):
    obtener_modulo_por_codigo(db, modulo_codigo)
    return editar_indicador(
        version_id=version_id,
        payload=payload,
        db=db,
        actor=actor,
        _user=_user,
    )


@router.delete("/{modulo_codigo}/indicadores/{version_id}", status_code=204)
def eliminar_indicador_modulo(
    modulo_codigo: str,
    version_id: int,
    db: Session = Depends(get_db),
    actor: str = Depends(get_audit_actor),
    _user: dict = Depends(require_escritura_for_modulo),
):
    obtener_modulo_por_codigo(db, modulo_codigo)
    return eliminar_indicador(
        version_id=version_id,
        db=db,
        actor=actor,
        _user=_user,
    )


@router.post(
    "/{modulo_codigo}/indicadores/{calidad_id}/versiones",
    response_model=IndicadorVersionOut,
    status_code=201,
)
def crear_version_modulo(
    modulo_codigo: str,
    calidad_id: int,
    payload: IndicadorVersionCreate,
    db: Session = Depends(get_db),
    actor: str = Depends(get_audit_actor),
    _user: dict = Depends(require_escritura_for_modulo),
):
    obtener_modulo_por_codigo(db, modulo_codigo)
    return crear_version(
        calidad_id=calidad_id,
        payload=payload,
        db=db,
        actor=actor,
        _user=_user,
    )
