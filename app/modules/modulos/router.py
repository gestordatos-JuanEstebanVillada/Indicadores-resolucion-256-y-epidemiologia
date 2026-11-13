import logging

import oracledb
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError as SAIntegrityError
from sqlalchemy.orm import Session

from app.models import IntranetModulo, Usuario
from app.modules.auth.admin_dependencies import get_current_admin_user
from app.modules.auth.admin_dependencies import get_current_token_payload
from app.modules.modulos.catalog import (
    ModuloCatalogo,
    listar_modulos_catalogo,
    modulo_tiene_usuarios_con_acceso,
    obtener_modulo_catalogo,
    propagar_codigo_modulo_en_oracle,
    resolver_modulo_desde_identificador,
)
from app.modules.modulos.schemas import (
    ModuloCreate,
    ModuloOut,
    ModuloUpdate,
    ModuloUsuarioAccesoOut,
)
from app.modules.modulos.schemas import _normalize_codigo
from app.shared.database.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/modulos", tags=["Módulos"])

_MSG_DELETE_CON_ACCESOS = (
    "No se puede eliminar este módulo porque hay usuarios que todavía tienen "
    "roles asignados a él. Retira los accesos primero."
)


def _es_error_integridad_referencial(exc: BaseException) -> bool:
    texto = str(exc).upper()
    return any(
        token in texto
        for token in (
            "ORA-02292",
            "ORA-02291",
            "ORA-00001",
            "INTEGRITY",
            "FOREIGN KEY",
            "VIOLATED",
        )
    )


def _to_out(item: ModuloCatalogo) -> ModuloOut:
    return ModuloOut(
        id=int(item.id),
        codigo=item.codigo,
        nombre=item.nombre,
        icono=item.icono,
        estado=item.estado,
    )


def _to_out_row(row: IntranetModulo) -> ModuloOut:
    return ModuloOut(
        id=int(row.id),
        codigo=row.codigo,
        nombre=row.nombre,
        icono=row.icono,
        estado=row.estado,
    )


def _resolver_o_404(db: Session, identificador: str) -> IntranetModulo:
    modulo = resolver_modulo_desde_identificador(db, identificador)
    if modulo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Módulo '{identificador}' no encontrado en INTRANET_MODULOS",
        )
    return modulo


@router.get("", response_model=list[ModuloOut])
def listar_modulos(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_token_payload),
    solo_activos: bool = Query(True, alias="solo_activos"),
):
    return [_to_out(m) for m in listar_modulos_catalogo(db, solo_activos=solo_activos)]


@router.get(
    "/codigo/{codigo}/usuarios",
    response_model=list[ModuloUsuarioAccesoOut],
)
def usuarios_con_acceso_modulo(
    codigo: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    modulo = _normalize_codigo(codigo)
    if not modulo:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Código de módulo inválido",
        )

    from app.modules.auth.calidad_roles_data import (
        listar_todos_usuarios_con_filas,
        nombre_rol_y_modulos_desde_filas,
    )
    from app.modules.auth.rbac import flags_desde_sistema

    by_user: dict[int, dict] = {}
    for uid, filas in listar_todos_usuarios_con_filas(db).items():
        nombre_rol, modulos = nombre_rol_y_modulos_desde_filas(filas)
        if not nombre_rol:
            continue
        es_global, _ = flags_desde_sistema(db, nombre_rol)
        if es_global or modulo in modulos:
            by_user[uid] = {
                "nombre_rol": nombre_rol,
                "modulos": modulos,
                "es_admin": bool(es_global),
            }

    if not by_user:
        return []

    usuarios = db.scalars(
        select(Usuario).where(Usuario.id.in_(by_user.keys()))
    ).all()
    index = {u.id: u for u in usuarios}

    out: list[ModuloUsuarioAccesoOut] = []
    for uid, data in sorted(by_user.items()):
        user = index.get(uid)
        if user is None:
            continue
        roles = [data["nombre_rol"], *data["modulos"]]
        out.append(
            ModuloUsuarioAccesoOut(
                id=user.id,
                usuario=user.usuario or "",
                nombres=user.nombres or "",
                roles=list(dict.fromkeys(roles)),
            )
        )
    return sorted(out, key=lambda row: (row.nombres or row.usuario).lower())


@router.post("", response_model=ModuloOut, status_code=status.HTTP_201_CREATED)
def crear_modulo(
    payload: ModuloCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    codigo = payload.codigo or _normalize_codigo(payload.nombre)
    if not codigo or " " in codigo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo derivar un código válido (use letras, números y guiones bajos)",
        )

    nombre = payload.nombre.strip()
    icono = payload.icono.strip()
    estado = payload.estado.strip().upper()

    existente = db.scalar(
        select(IntranetModulo.id).where(
            or_(
                func.upper(IntranetModulo.codigo) == codigo,
                func.upper(IntranetModulo.nombre) == nombre.upper(),
            )
        )
    )
    if existente is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un módulo con ese código o nombre en el catálogo maestro",
        )

    nuevo = IntranetModulo(
        codigo=codigo,
        nombre=nombre,
        icono=icono,
        estado=estado,
    )
    try:
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
    except SAIntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Conflicto al guardar el módulo: {exc.orig}",
        ) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return _to_out_row(nuevo)


@router.put("/{identificador}", response_model=ModuloOut)
def actualizar_modulo(
    identificador: str,
    payload: ModuloUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    modulo = _resolver_o_404(db, identificador)
    modulo_id = int(modulo.id)

    if payload.codigo_nuevo:
        codigo_nuevo = _normalize_codigo(payload.codigo_nuevo)
        codigo_actual = (modulo.codigo or "").strip().upper()
        if codigo_nuevo and codigo_nuevo != codigo_actual:
            dup = db.scalar(
                select(IntranetModulo.id).where(
                    func.upper(IntranetModulo.codigo) == codigo_nuevo,
                    IntranetModulo.id != modulo_id,
                )
            )
            if dup is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ya existe otro módulo con ese código",
                )
            propagar_codigo_modulo_en_oracle(db, codigo_actual, codigo_nuevo)
            modulo.codigo = codigo_nuevo

    if payload.nombre is not None:
        modulo.nombre = payload.nombre.strip()
    if payload.icono is not None:
        modulo.icono = payload.icono.strip() or "Folder"
    if payload.estado is not None:
        modulo.estado = payload.estado.strip().upper()

    try:
        db.commit()
        db.refresh(modulo)
    except SAIntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Conflicto al actualizar el módulo: {exc.orig}",
        ) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return _to_out_row(modulo)


@router.delete("/{identificador}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_modulo(
    identificador: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    modulo = _resolver_o_404(db, identificador)
    logger.info(
        "Eliminar módulo id=%s codigo=%s clave=%s",
        modulo.id,
        modulo.codigo,
        identificador,
    )

    if modulo_tiene_usuarios_con_acceso(db, modulo.codigo):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_MSG_DELETE_CON_ACCESOS,
        )

    try:
        db.delete(modulo)
        db.commit()
    except (SAIntegrityError, oracledb.IntegrityError):
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_MSG_DELETE_CON_ACCESOS,
        ) from None
    except Exception as exc:
        db.rollback()
        if _es_error_integridad_referencial(exc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=_MSG_DELETE_CON_ACCESOS,
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return None


def obtener_modulo_por_codigo(db: Session, modulo_codigo: str) -> ModuloCatalogo:
    item = obtener_modulo_catalogo(db, modulo_codigo)
    if item is None:
        codigo = _normalize_codigo(modulo_codigo) or (modulo_codigo or "").strip()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Módulo '{codigo}' no registrado en catálogo",
        )
    estado = (item.estado or "ACTIVO").strip().upper()
    if estado in {"INACTIVO", "0", "I", "N"}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Módulo '{item.codigo}' inactivo",
        )
    return item
