from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token
from app.shared.database.session import get_db

_bearer_scheme = HTTPBearer()


def get_current_username(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> str:
    payload = decode_access_token(credentials.credentials)
    if payload is None or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido o expirado"
        )
    return payload["sub"]


__all__ = ["get_db", "get_current_username"]
