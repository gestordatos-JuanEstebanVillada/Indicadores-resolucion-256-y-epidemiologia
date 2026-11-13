from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.ids import is_defined_user_id
from app.shared.database.session import get_db
from app.models import Usuario
from app.modules.auth.calidad_roles_data import (
    JERARQUIA_GLOBAL,
    JERARQUIA_USUARIO,
    detectar_esquema_v2,
    listar_todos_usuarios_con_filas,
)
from app.modules.auth.admin_dependencies import get_current_gestion_admin
from app.modules.auth.permissions import (
    es_admin_global_token,
    es_administrador_area_token,
)
from app.modules.auth.tenant_scope import (
    assert_accesos_asignables,
    assert_puede_listar_usuarios,
    assert_usuario_visible_en_gestion,
    filtrar_usuarios_visibles_gestion,
    modulos_gestionables_token,
)
from app.modules.usuarios.roles_repository import CalidadRolesRepository
from app.modules.usuarios.schemas import (
    ModuloAccesoOut,
    RolAssignCreate,
    RolUpdate,
    UsuarioCreate,
    UsuarioInstitucionalOut,
    UsuarioListOut,
)
from app.modules.auditoria.dependencies import get_audit_actor
from app.modules.usuarios.service import (
    asegurar_login_disponible_para_creacion,
    crear_usuario_con_accesos,
    find_user_by_login,
    normalize_login,
    revocar_solo_acceso_indicadores,
)

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


def _usuario_to_out(
    user: Usuario,
    roles_repo: CalidadRolesRepository,
) -> UsuarioListOut:
    resumen = roles_repo.resumen(user.id)
    accesos_raw = roles_repo.accesos_de_usuario(user.id)
    accesos = [
        ModuloAccesoOut(modulo=a["modulo"], solo_lectura=a["solo_lectura"])
        for a in accesos_raw
    ]
    jerarquia = roles_repo.jerarquia_de_usuario(user.id) or ""
    es_global = resumen.es_admin_global
    return UsuarioListOut(
        id=user.id,
        usuario=user.usuario or "",
        nombres=user.nombres or "",
        estado=user.estado,
        jerarquia=jerarquia,
        nombre_rol=jerarquia,
        es_admin_global=es_global,
        permite_edicion=bool(resumen.modulos_edicion or es_global),
        modulos=resumen.modulos,
        accesos=accesos,
        acceso_indicadores=bool(es_global or resumen.modulos),
    )


def _get_roles_repo(db: Session = Depends(get_db)) -> CalidadRolesRepository:
    return CalidadRolesRepository(db)


def _accesos_payload(accesos) -> list[dict]:
    return [
        {"modulo": item.modulo, "solo_lectura": item.solo_lectura}
        for item in accesos
    ]


def _jerarquia_para_gestion_area(requester: dict, jerarquia: str) -> str:
    """Administrador de área solo puede persistir jerarquía USUARIO."""
    if es_admin_global_token(requester):
        return jerarquia
    if es_administrador_area_token(requester):
        return JERARQUIA_USUARIO
    return jerarquia


def _accesos_merge_area_admin(
    roles_repo: CalidadRolesRepository,
    requester: dict,
    usuario_id: int,
    jerarquia: str,
    accesos_nuevos: list,
) -> tuple[str, list[dict]]:
    """Conserva módulos fuera del alcance del administrador de área."""
    payload = _accesos_payload(accesos_nuevos)
    if es_admin_global_token(requester):
        return jerarquia, payload
    if not es_administrador_area_token(requester):
        return jerarquia, payload

    alcance = modulos_gestionables_token(requester)
    existentes = roles_repo.accesos_de_usuario(usuario_id)
    preserved = [
        a
        for a in existentes
        if (a.get("modulo") or "").strip().upper().replace(" ", "_") not in alcance
    ]
    por_modulo: dict[str, dict] = {}
    for item in preserved + payload:
        codigo = (item.get("modulo") or "").strip().upper().replace(" ", "_")
        if codigo:
            por_modulo[codigo] = {
                "modulo": codigo,
                "solo_lectura": bool(item.get("solo_lectura")),
            }
    clave = (jerarquia or "").strip().upper()
    if clave != "USUARIO":
        prev = (roles_repo.jerarquia_de_usuario(usuario_id) or "USUARIO").strip().upper()
        clave = prev if prev in {"USUARIO", "ADMINISTRADOR_AREA"} else "USUARIO"
    return clave, list(por_modulo.values())


@router.get("", response_model=list[UsuarioListOut])
def listar_usuarios(
    db: Session = Depends(get_db),
    roles_repo: CalidadRolesRepository = Depends(_get_roles_repo),
    requester: dict = Depends(get_current_gestion_admin),
    con_acceso: bool = True,
):
    assert_puede_listar_usuarios(requester)
    if con_acceso:
        if not detectar_esquema_v2(db):
            ids = sorted(listar_todos_usuarios_con_filas(db).keys())
            rows = (
                db.scalars(
                    select(Usuario)
                    .where(Usuario.id.in_(ids))
                    .order_by(Usuario.nombres.asc(), Usuario.usuario.asc())
                ).all()
                if ids
                else []
            )
        else:
            from app.models import IntranetCalidadRol

            rows = db.scalars(
                select(Usuario)
                .join(
                    IntranetCalidadRol,
                    Usuario.id == IntranetCalidadRol.usuario_id,
                )
                .order_by(Usuario.nombres.asc(), Usuario.usuario.asc())
            ).unique().all()
    else:
        rows = db.scalars(
            select(Usuario).order_by(Usuario.nombres.asc(), Usuario.usuario.asc())
        ).all()
    rows = filtrar_usuarios_visibles_gestion(rows, roles_repo, requester)
    return [_usuario_to_out(user, roles_repo) for user in rows]


@router.get("/institucionales", response_model=list[UsuarioInstitucionalOut])
def listar_usuarios_institucionales(
    db: Session = Depends(get_db),
    roles_repo: CalidadRolesRepository = Depends(_get_roles_repo),
    requester: dict = Depends(get_current_gestion_admin),
    q: str | None = None,
    sin_acceso: bool = False,
):
    assert_puede_listar_usuarios(requester)
    stmt = select(Usuario).order_by(Usuario.usuario.asc())
    if q and q.strip():
        needle = f"%{q.strip().upper()}%"
        stmt = stmt.where(
            or_(
                func.upper(func.trim(Usuario.usuario)).like(needle),
                func.upper(func.trim(Usuario.nombres)).like(needle),
            )
        )
    rows = db.scalars(stmt).all()
    ids_con_acceso = set(roles_repo.obtener_todos_por_usuario_id().keys())

    out: list[UsuarioInstitucionalOut] = []
    for user in rows:
        tiene = user.id in ids_con_acceso
        if sin_acceso and tiene:
            continue
        out.append(
            UsuarioInstitucionalOut(
                id=user.id,
                usuario=user.usuario or "",
                nombres=user.nombres or "",
                estado=user.estado,
                tiene_acceso_indicadores=tiene,
            )
        )
    return out


@router.post("", response_model=UsuarioListOut, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    payload: UsuarioCreate,
    db: Session = Depends(get_db),
    roles_repo: CalidadRolesRepository = Depends(_get_roles_repo),
    requester: dict = Depends(get_current_gestion_admin),
    actor: str = Depends(get_audit_actor),
):
    jerarquia_asignacion = _jerarquia_para_gestion_area(
        requester, payload.jerarquia
    )
    assert_accesos_asignables(
        requester, jerarquia_asignacion, payload.accesos
    )
    login = normalize_login(payload.usuario)
    asegurar_login_disponible_para_creacion(
        db, login, display_login=payload.usuario
    )
    try:
        user = crear_usuario_con_accesos(
            db,
            nombres=payload.nombres,
            usuario=login,
            contrasena=payload.contrasena,
            jerarquia=jerarquia_asignacion,
            accesos=_accesos_payload(payload.accesos),
            actor=actor,
            roles_repo=roles_repo,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    return _usuario_to_out(user, roles_repo)


@router.post("/asignar-rol", response_model=UsuarioListOut, status_code=status.HTTP_201_CREATED)
def asignar_rol(
    payload: RolAssignCreate,
    db: Session = Depends(get_db),
    roles_repo: CalidadRolesRepository = Depends(_get_roles_repo),
    requester: dict = Depends(get_current_gestion_admin),
):
    jerarquia_asignacion = _jerarquia_para_gestion_area(
        requester, payload.jerarquia
    )
    assert_accesos_asignables(
        requester, jerarquia_asignacion, payload.accesos
    )
    user = find_user_by_login(db, payload.usuario)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe un usuario institucional con ese login",
        )
    try:
        roles_repo.reemplazar_accesos(
            user.id,
            jerarquia_asignacion,
            _accesos_payload(payload.accesos),
        )
        db.commit()
    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    return _usuario_to_out(user, roles_repo)


@router.put("/{user_id}", response_model=UsuarioListOut)
def actualizar_accesos(
    user_id: int,
    payload: RolUpdate,
    db: Session = Depends(get_db),
    roles_repo: CalidadRolesRepository = Depends(_get_roles_repo),
    requester: dict = Depends(get_current_gestion_admin),
):
    assert_usuario_visible_en_gestion(roles_repo, requester, user_id)
    jerarquia_asignacion = _jerarquia_para_gestion_area(
        requester, payload.jerarquia
    )
    assert_accesos_asignables(
        requester, jerarquia_asignacion, payload.accesos
    )
    user = db.get(Usuario, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    jerarquia_final, accesos_final = _accesos_merge_area_admin(
        roles_repo, requester, user_id, jerarquia_asignacion, payload.accesos
    )
    try:
        roles_repo.reemplazar_accesos(
            user_id,
            jerarquia_final,
            accesos_final,
        )
        db.commit()
    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    return _usuario_to_out(user, roles_repo)


@router.delete("/{user_id}/rol", status_code=status.HTTP_204_NO_CONTENT)
def revocar_acceso(
    user_id: int,
    db: Session = Depends(get_db),
    roles_repo: CalidadRolesRepository = Depends(_get_roles_repo),
    admin: dict = Depends(get_current_gestion_admin),
    actor: str = Depends(get_audit_actor),
):
    assert_usuario_visible_en_gestion(roles_repo, admin, user_id)
    admin_id = admin.get("id")
    if is_defined_user_id(admin_id) and user_id == admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puede revocar su propio acceso",
        )
    revocar_solo_acceso_indicadores(db, usuario_id=user_id, actor=actor)
    return None
