"""JWT compartido con el backend Login/SSO: mismo SECRET_KEY/ALGORITHM, para
que un token emitido por cualquiera de los dos backends sirva en el otro.
decode_access_token valida tokens (emitidos aqui o por el portal) para
identificar al usuario detras de un endpoint protegido; create_access_token
los emite (login propio de este backend, ver modules/auth)."""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.core.config import settings


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expira = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode["exp"] = expira
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None
