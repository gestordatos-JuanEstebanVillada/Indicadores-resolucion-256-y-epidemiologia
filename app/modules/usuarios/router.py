from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.models import IntranetCalidadRol, Usuario
from app.modules.auth.admin_dependencies import get_current_admin_user
from app.modules.auth.roles import normalizar_rol
from app.modules.usuarios.roles_repository import CalidadRolesRepository
from app.modules.usuarios.schemas import (
    RolAssignCreate,
    RolUpdate,
    UsuarioCreate,
    UsuarioListOut,
)
from app.modules.usuarios.service import (
    asegurar_login_disponible_para_creacion,
    crear_usuario_con_rol,
    eliminar_acceso_y_usuario,
    find_user_by_login,
    normalize_login,
)

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


def _usuario_to_out(user: Usuario, rol: str | None) -> UsuarioListOut:
    normalized = normalizar_rol(rol) if rol else None
    return UsuarioListOut(
        id=user.id,
        usuario=user.usuario or "",
        nombres=user.nombres or "",
        estado=user.estado,
        rol=normalized,
        acceso_indicadores=normalized is not None,
    )


def _get_roles_repo(db: Session = Depends(get_db)) -> CalidadRolesRepository:
    return CalidadRolesRepository(db)


@router.get("", response_model=list[UsuarioListOut])
def listar_usuarios(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    rows = db.execute(
        select(Usuario, IntranetCalidadRol.rol)
        .join(IntranetCalidadRol, Usuario.id == IntranetCalidadRol.usuario_id)
        .order_by(Usuario.nombres.asc(), Usuario.usuario.asc())
    ).all()
    return [_usuario_to_out(user, rol) for user, rol in rows]


@router.post("", response_model=UsuarioListOut, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    payload: UsuarioCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    login = normalize_login(payload.usuario)
    asegurar_login_disponible_para_creacion(
        db, login, display_login=payload.usuario
    )

    user, rol_row = crear_usuario_con_rol(
        db,
        nombres=payload.nombres,
        usuario=login,
        contrasena=payload.contrasena,
        rol=payload.rol,
    )
    return _usuario_to_out(user, rol_row.rol)


@router.post("/asignar-rol", response_model=UsuarioListOut, status_code=status.HTTP_201_CREATED)
def asignar_rol(
    payload: RolAssignCreate,
    db: Session = Depends(get_db),
    roles_repo: CalidadRolesRepository = Depends(_get_roles_repo),
    _: dict = Depends(get_current_admin_user),
):
    user = find_user_by_login(db, payload.usuario)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe un usuario institucional con ese login",
        )

    existing = roles_repo.obtener_por_usuario_id(user.id)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El usuario ya tiene un rol asignado en Indicadores",
        )

    row = roles_repo.crear(user.id, payload.rol)
    return _usuario_to_out(user, row.rol)


@router.put("/{user_id}", response_model=UsuarioListOut)
def actualizar_rol(
    user_id: int,
    payload: RolUpdate,
    db: Session = Depends(get_db),
    roles_repo: CalidadRolesRepository = Depends(_get_roles_repo),
    _: dict = Depends(get_current_admin_user),
):
    user = db.get(Usuario, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    row = roles_repo.obtener_por_usuario_id(user_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El usuario no tiene rol asignado en Indicadores",
        )

    row = roles_repo.actualizar_rol(row, payload.rol)
    return _usuario_to_out(user, row.rol)


@router.delete("/{user_id}/rol", status_code=status.HTTP_204_NO_CONTENT)
def revocar_acceso(
    user_id: int,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin_user),
):
    admin_id = admin.get("id")
    if admin_id is not None and user_id == admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puede eliminar su propio usuario",
        )

    eliminar_acceso_y_usuario(db, usuario_id=user_id)
    return None
