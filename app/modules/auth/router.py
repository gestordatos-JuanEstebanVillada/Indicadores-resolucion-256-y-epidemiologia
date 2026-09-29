from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_username
from app.modules.auth.dependencies import get_auth_service
from app.modules.auth.schemas import AuthResponse, LoginRequest, UserInfo
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=AuthResponse)
def login(
    data: LoginRequest, service: AuthService = Depends(get_auth_service)
) -> AuthResponse:
    return service.login(data)


@router.get("/me", response_model=UserInfo)
def obtener_usuario_actual(
    username: str = Depends(get_current_username),
    service: AuthService = Depends(get_auth_service),
) -> UserInfo:
    return service.obtener_usuario_actual(username)
