import uuid
from datetime import datetime, timedelta, timezone

from jose import jwt

from app.core.config import settings


def create_tableau_embed_token() -> str:
    if not all(
        [
            settings.tableau_client_id,
            settings.tableau_secret_id,
            settings.tableau_secret_value,
            settings.tableau_username,
        ]
    ):
        raise ValueError("Faltan variables TABLEAU_* en el entorno del backend")

    now = datetime.now(timezone.utc)
    issued_at = int((now - timedelta(seconds=60)).timestamp())
    expires_at = issued_at + 300

    claims = {
        "iss": settings.tableau_client_id,
        "sub": settings.tableau_username,
        "aud": "tableau",
        "scp": ["tableau:views:embed", "tableau:metrics:embed"],
        "jti": str(uuid.uuid4()),
        "iat": issued_at,
        "exp": expires_at,
    }
    headers = {
        "kid": settings.tableau_secret_id,
        "iss": settings.tableau_client_id,
    }

    return jwt.encode(
        claims,
        settings.tableau_secret_value,
        algorithm="HS256",
        headers=headers,
    )
