from fastapi import HTTPException, status

from app.modules.auth.permissions import es_admin_global_token, modulos_en_token_set


def _normalize(value: str | None) -> str | None:
    if value is None:
        return None
    raw = value.strip().upper().replace(" ", "_")
    return raw or None


def modulos_asignados_o_global(payload: dict) -> set[str] | None:
    """None = administrador global (sin filtro por módulo)."""
    if es_admin_global_token(payload):
        return None
    modulos = modulos_en_token_set(payload)
    if not modulos:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rol sin acceso al módulo de calidad",
        )
    return modulos


def filtro_modulos_planes(
    payload: dict,
    requested: str | None,
    *,
    normalize,
) -> set[str] | None:
    """
    Conjunto de códigos de módulo para filtrar planes.
    None = sin filtro (solo admin global).
    """
    asignados = modulos_asignados_o_global(payload)
    req = normalize(requested) if requested else None
    if asignados is None:
        if req:
            return {req}
        return None
    if req:
        if req not in asignados:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sin permiso para consultar este módulo",
            )
        return {req}
    return set(asignados)


def resolver_filtro_modulo(
    payload: dict,
    requested: str | None,
    *,
    normalize,
) -> str | None:
    """Un solo módulo (p. ej. notificaciones con ?modulo= obligatorio si hay varios)."""
    req = normalize(requested) if requested else None
    if es_admin_global_token(payload):
        return req

    asignados = modulos_en_token_set(payload)
    if not asignados:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rol sin acceso al módulo de calidad",
        )

    if not req:
        if len(asignados) == 1:
            return next(iter(asignados))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Parámetro modulo requerido",
        )

    codigo = _normalize(req)
    if codigo not in asignados:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sin permiso para consultar este módulo",
        )
    return codigo
