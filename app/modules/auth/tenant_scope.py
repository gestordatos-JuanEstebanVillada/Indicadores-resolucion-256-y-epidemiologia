"""Tenant isolation: jerarquía GLOBAL / AREA / USUARIO."""
from __future__ import annotations

from fastapi import HTTPException, status

from app.modules.auth.calidad_roles_data import JERARQUIA_AREA, JERARQUIA_GLOBAL, JERARQUIA_USUARIO
from app.modules.auth.permissions import (
    es_admin_global_token,
    es_administrador_area_token,
    modulos_edicion_en_token,
    modulos_en_token_set,
)
from app.modules.usuarios.roles_repository import CalidadRolesRepository
from app.models import Usuario


def modulos_gestionables_token(payload: dict) -> set[str]:
    """Módulos que un ADMINISTRADOR_AREA puede gestionar (edición + solo lectura)."""
    if es_admin_global_token(payload):
        return set()
    todos = modulos_en_token_set(payload)
    if todos:
        return todos
    return modulos_edicion_en_token(payload)


def usuario_es_admin_global(
    roles_repo: CalidadRolesRepository,
    usuario_id: int,
) -> bool:
    return roles_repo.usuario_es_admin_global(usuario_id)


def modulos_usuario(
    roles_repo: CalidadRolesRepository,
    usuario_id: int,
) -> set[str]:
    return set(roles_repo.modulos_de_usuario(usuario_id))


def assert_puede_listar_usuarios(requester: dict) -> None:
    if es_admin_global_token(requester):
        return
    if es_administrador_area_token(requester):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Su jerarquía no permite gestionar accesos",
    )


def filtrar_usuarios_visibles_gestion(
    usuarios: list[Usuario],
    roles_repo: CalidadRolesRepository,
    requester: dict,
) -> list[Usuario]:
    assert_puede_listar_usuarios(requester)
    if es_admin_global_token(requester):
        return usuarios

    alcance = modulos_gestionables_token(requester)
    visibles: list[Usuario] = []
    for user in usuarios:
        if usuario_es_admin_global(roles_repo, user.id):
            continue
        mods = modulos_usuario(roles_repo, user.id)
        if mods & alcance:
            visibles.append(user)
    return visibles


def assert_usuario_visible_en_gestion(
    roles_repo: CalidadRolesRepository,
    requester: dict,
    usuario_id: int,
) -> None:
    assert_puede_listar_usuarios(requester)
    if es_admin_global_token(requester):
        return
    if usuario_es_admin_global(roles_repo, usuario_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puede gestionar al administrador global",
        )
    alcance = modulos_gestionables_token(requester)
    mods = modulos_usuario(roles_repo, usuario_id)
    if not (mods & alcance):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario está fuera de su ámbito de módulos",
        )


def assert_accesos_asignables(
    requester: dict,
    jerarquia: str,
    accesos: list,
) -> None:
    clave = (jerarquia or "").strip().upper()
    if es_admin_global_token(requester):
        return

    if not es_administrador_area_token(requester):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puede asignar accesos",
        )

    if clave != JERARQUIA_USUARIO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puede asignar jerarquía USUARIO",
        )

    alcance = modulos_gestionables_token(requester)
    for item in accesos:
        codigo = (
            getattr(item, "modulo", None)
            if not isinstance(item, dict)
            else item.get("modulo")
        )
        codigo = (codigo or "").strip().upper().replace(" ", "_")
        if codigo and codigo not in alcance:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Sin permiso para asignar el módulo {codigo}",
            )
