from fastapi import HTTPException, status

from app.modules.auth.roles import normalizar_rol


def modulo_forzado_por_payload(payload: dict) -> str | None:
    """None = ADMIN (sin restricción de módulo)."""
    rol = normalizar_rol(payload.get("rol") or payload.get("role"))
    if rol is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rol sin acceso al módulo de calidad",
        )
    if rol == "ADMIN":
        return None
    if rol == "RESOLUCION_256":
        return "RESOLUCION_256"
    if rol == "EPIDEMIOLOGIA":
        return "EPIDEMIOLOGIA"
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Rol sin acceso al módulo de calidad",
    )


def resolver_filtro_modulo(
    payload: dict,
    requested: str | None,
    *,
    normalize,
) -> str | None:
    """
    Devuelve el módulo efectivo para filtrar consultas.
    Usuarios no ADMIN solo pueden ver su módulo (ignora filtros ajenos).
    """
    forced = modulo_forzado_por_payload(payload)
    req = normalize(requested) if requested else None
    if forced:
        if req and req != forced:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No autorizado para consultar este módulo",
            )
        return forced
    return req
