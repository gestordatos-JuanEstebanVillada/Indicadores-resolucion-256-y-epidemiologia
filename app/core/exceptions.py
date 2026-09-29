import oracledb
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class NotFoundError(Exception):
    def __init__(self, detail: str = "Recurso no encontrado") -> None:
        self.detail = detail


class ConflictError(Exception):
    def __init__(self, detail: str = "El recurso ya existe o entra en conflicto") -> None:
        self.detail = detail


class UnauthorizedError(Exception):
    def __init__(self, detail: str = "No autorizado") -> None:
        self.detail = detail


class ForbiddenError(Exception):
    def __init__(self, detail: str = "Acceso denegado") -> None:
        self.detail = detail


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFoundError)
    async def not_found_handler(_: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": exc.detail})

    @app.exception_handler(ConflictError)
    async def conflict_handler(_: Request, exc: ConflictError) -> JSONResponse:
        return JSONResponse(status_code=409, content={"detail": exc.detail})

    @app.exception_handler(UnauthorizedError)
    async def unauthorized_handler(_: Request, exc: UnauthorizedError) -> JSONResponse:
        return JSONResponse(status_code=401, content={"detail": exc.detail})

    @app.exception_handler(ForbiddenError)
    async def forbidden_handler(_: Request, exc: ForbiddenError) -> JSONResponse:
        return JSONResponse(status_code=403, content={"detail": exc.detail})

    @app.exception_handler(oracledb.IntegrityError)
    async def oracle_integrity_handler(_: Request, exc: oracledb.IntegrityError) -> JSONResponse:
        message = str(exc)
        if "ORA-00001" in message:
            detail = "Ya existe un registro duplicado con esos datos."
        elif "ORA-01400" in message:
            detail = "Faltan datos obligatorios."
        else:
            detail = "No se pudo completar la operacion en la base de datos."
        return JSONResponse(status_code=400, content={"detail": detail})

    @app.exception_handler(oracledb.Error)
    async def oracle_error_handler(_: Request, exc: oracledb.Error) -> JSONResponse:
        message = str(exc)
        if "ORA-12170" in message or "TNS" in message.upper():
            detail = "No se pudo conectar con Oracle (tiempo de espera agotado). Verifique red/VPN e intente de nuevo."
        else:
            detail = "Error de base de datos. Intente de nuevo en unos segundos."
        return JSONResponse(status_code=503, content={"detail": detail})
