from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token

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
    return payload


def get_current_admin_user(
    payload: dict = Depends(get_current_token_payload),
) -> dict:
    rol = (payload.get("rol") or payload.get("role") or "").upper()
    if rol != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol Administrador",
        )
    return payload
