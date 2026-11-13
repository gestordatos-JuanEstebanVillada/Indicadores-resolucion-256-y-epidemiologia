from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import IntranetCalidadRol, IntranetModulo, IntranetSistemaRol, Usuario
from app.modules.auth.admin_dependencies import get_current_admin_user
from app.modules.auth.admin_dependencies import get_current_token_payload
from app.modules.modulos.catalog import (
    ModuloCatalogo,
    actualizar_modulo_catalogo,
    eliminar_modulo_del_catalogo,
    listar_modulos_catalogo,
    obtener_modulo_catalogo,
    renombrar_modulo_en_catalogo,
)
from app.modules.modulos.schemas import (
    ModuloCreate,
    ModuloOut,
    ModuloUpdate,
    ModuloUsuarioAccesoOut,
)
from app.modules.modulos.schemas import _normalize_codigo
from app.modules.usuarios.roles_repository import CalidadRolesRepository
from app.shared.database.session import get_db

router = APIRouter(prefix="/modulos", tags=["Módulos"])


def _to_out(item: ModuloCatalogo) -> ModuloOut:
    return ModuloOut(
        id=item.id,
        codigo=item.codigo,
        nombre=item.nombre,
        icono=item.icono,
        estado=item.estado,
    )


@router.get("", response_model=list[ModuloOut])
def listar_modulos(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_token_payload),
    solo_activos: bool = True,
):
    return [_to_out(m) for m in listar_modulos_catalogo(db, solo_activos=solo_activos)]


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
    except IntegrityError as exc:
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

    return ModuloOut(
        id=int(nuevo.id),
        codigo=nuevo.codigo,
        nombre=nuevo.nombre,
        icono=nuevo.icono,
        estado=nuevo.estado,
    )


@router.put("/codigo/{codigo}", response_model=ModuloOut)
def actualizar_modulo_por_codigo(
    codigo: str,
    payload: ModuloUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    item = obtener_modulo_catalogo(db, codigo)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Módulo no encontrado"
        )

    codigo_actual = item.codigo
    codigo_nuevo = payload.codigo_nuevo
    if codigo_nuevo and codigo_nuevo != codigo_actual:
        if obtener_modulo_catalogo(db, codigo_nuevo) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El código destino ya existe",
            )
        renombrar_modulo_en_catalogo(db, codigo_actual, codigo_nuevo)
        codigo_actual = codigo_nuevo

    actualizar_modulo_catalogo(
        codigo_actual,
        nombre=payload.nombre,
        icono=payload.icono,
        estado=payload.estado,
    )
    db.commit()

    actualizado = obtener_modulo_catalogo(db, codigo_actual)
    if actualizado is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo actualizar el módulo",
        )
    return _to_out(actualizado)


@router.delete("/codigo/{codigo}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_modulo_por_codigo(
    codigo: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    item = obtener_modulo_catalogo(db, codigo)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Módulo no encontrado"
        )
    eliminar_modulo_del_catalogo(item.codigo)
    return None


@router.get(
    "/codigo/{codigo}/usuarios",
    response_model=list[ModuloUsuarioAccesoOut],
)
def usuarios_con_acceso_modulo(
    codigo: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    modulo = (codigo or "").strip().upper().replace(" ", "_")
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


def obtener_modulo_por_codigo(db: Session, modulo_codigo: str) -> ModuloCatalogo:
    item = obtener_modulo_catalogo(db, modulo_codigo)
    if item is None:
        codigo = (modulo_codigo or "").strip().upper().replace(" ", "_")
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
