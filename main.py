from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.modules.auth.router import router as auth_router
from app.modules.calidad.router import router as calidad_router
from app.modules.iaas.router import router as iaas_router


app = FastAPI(title=settings.app_name)
register_exception_handlers(app)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    auth_router,
    prefix=settings.api_prefix
)

app.include_router(
    calidad_router,
    prefix=settings.api_prefix
)

app.include_router(
    iaas_router,
    prefix=settings.api_prefix
)


@app.get("/health")
async def health():
    return {"status": "ok"}
