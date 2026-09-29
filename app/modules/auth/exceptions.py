from app.core.exceptions import ForbiddenError, UnauthorizedError


class CredencialesInvalidasError(UnauthorizedError):
    def __init__(self) -> None:
        super().__init__(detail="Usuario o contraseña incorrectos")


class UsuarioInactivoError(ForbiddenError):
    def __init__(self) -> None:
        super().__init__(detail="El usuario esta inactivo")
