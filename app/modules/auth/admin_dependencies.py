from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token
from app.modules.auth.calidad_roles_data import JERARQUIA_AREA, JERARQUIA_GLOBAL

_bearer_scheme = HTTPBearer()


def get_current_token_payload(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> dict:
    payload = decode_access_token(credentials.credentials)
    if payload is None or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado",
        )
    raw_id = payload.get("id")
    if raw_id is not None and not isinstance(raw_id, int):
        try:
            payload = {**payload, "id": int(raw_id)}
        except (TypeError, ValueError):
            pass
    return payload


def _flag_truthy(value) -> bool:
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value == 1
    return str(value).strip().upper() in {"1", "S", "Y", "TRUE", "SI", "YES"}


def _jerarquia_payload(payload: dict) -> str:
    return (
        payload.get("jerarquia")
        or payload.get("nombre_rol")
        or payload.get("rol")
        or payload.get("role")
        or ""
    ).strip().upper()


def _modulos_payload(payload: dict) -> set[str]:
    raw = payload.get("modulos")
    modulos: set[str] = set()
    if isinstance(raw, list):
        for item in raw:
            codigo = (item or "").strip().upper().replace(" ", "_")
            if codigo:
                modulos.add(codigo)
    return modulos


def _es_admin_global_payload(payload: dict) -> bool:
    if _flag_truthy(payload.get("es_admin_global")):
        return True
    j = _jerarquia_payload(payload)
    return j in {JERARQUIA_GLOBAL, "ADMINISTRADOR", "ADMIN"}


def get_current_admin_user(
    payload: dict = Depends(get_current_token_payload),
) -> dict:
    if _es_admin_global_payload(payload):
        return payload
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Se requiere administrador global",
    )


def get_current_gestion_admin(
    payload: dict = Depends(get_current_token_payload),
) -> dict:
    """ADMINISTRADOR_GLOBAL o ADMINISTRADOR_AREA."""
    if _es_admin_global_payload(payload):
        return payload
    j = _jerarquia_payload(payload)
    if j == JERARQUIA_AREA:
        mods = _modulos_payload(payload)
        solo_lectura = payload.get("modulos_solo_lectura")
        if mods or (isinstance(solo_lectura, list) and len(solo_lectura) > 0):
            return payload
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Se requiere permiso de gestión de accesos",
    )
