from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.modules.auth.admin_dependencies import get_current_token_payload
from app.modules.dashboard.schemas import DashboardGraficosOut, DashboardStatsOut
from app.modules.dashboard.service import obtener_graficos, obtener_stats
from app.shared.database.session import get_db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStatsOut)
def dashboard_stats(
    modulo: str | None = Query(None),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_token_payload),
):
    return obtener_stats(db, user, modulo)


@router.get("/graficos", response_model=DashboardGraficosOut)
def dashboard_graficos(
    modulo: str | None = Query(None),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_token_payload),
):
    return obtener_graficos(db, user, modulo)
