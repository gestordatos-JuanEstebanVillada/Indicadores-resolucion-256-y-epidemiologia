from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_username
from app.modules.tableau.service import create_tableau_embed_token

router = APIRouter(prefix="/tableau", tags=["Tableau"])


@router.get("/embed-token")
def obtener_token_tableau(_username: str = Depends(get_current_username)) -> dict[str, str]:
    try:
        token = create_tableau_embed_token()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    return {"token": token}
