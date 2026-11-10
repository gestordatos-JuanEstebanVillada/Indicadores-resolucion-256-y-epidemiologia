from fastapi import Depends, HTTPException, status

from app.modules.auth.admin_dependencies import get_current_token_payload
from app.modules.auth.roles import normalizar_rol
from app.modules.calidad.constants import MODULO_EPIDEMIOLOGIA, MODULO_RESOLUCION_256

ROLES_LECTURA = frozenset({"ADMIN", "RESOLUCION_256", "EPIDEMIOLOGIA"})


def _rol_usuario(payload: dict) -> str:
    rol = normalizar_rol(payload.get("rol") or payload.get("role"))
    if rol is None or rol not in ROLES_LECTURA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sin permiso para acceder a indicadores de calidad",
        )
    return rol


def assert_lectura_modulos(payload: dict) -> dict:
    _rol_usuario(payload)
    return payload


def assert_escritura_modulo(payload: dict, modulo: str) -> dict:
    rol = _rol_usuario(payload)
    modulo = (modulo or "").strip().upper()
    if rol == "ADMIN":
        return payload
    if modulo == MODULO_RESOLUCION_256 and rol == "RESOLUCION_256":
        return payload
    if modulo == MODULO_EPIDEMIOLOGIA and rol == "EPIDEMIOLOGIA":
        return payload
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Solo lectura en este módulo",
    )


def require_lectura_indicadores(
    payload: dict = Depends(get_current_token_payload),
) -> dict:
    return assert_lectura_modulos(payload)


def require_escritura_resolucion_256(
    payload: dict = Depends(get_current_token_payload),
) -> dict:
    return assert_escritura_modulo(payload, MODULO_RESOLUCION_256)


def require_escritura_epidemiologia(
    payload: dict = Depends(get_current_token_payload),
) -> dict:
    return assert_escritura_modulo(payload, MODULO_EPIDEMIOLOGIA)
