from typing import Literal

RolUsuario = Literal["ADMIN", "RESOLUCION_256", "EPIDEMIOLOGIA"]
ROLES_VALIDOS: frozenset[str] = frozenset({"ADMIN", "RESOLUCION_256", "EPIDEMIOLOGIA"})

ROL_ADMIN = "ADMIN"

_ALIASES = {
    "CALIDAD": "RESOLUCION_256",
    "RESOLUCION256": "RESOLUCION_256",
    "RES_256": "RESOLUCION_256",
}


def normalizar_codigo_modulo(value: str | None) -> str | None:
    if value is None:
        return None
    raw = value.strip().upper().replace(" ", "_")
    return raw or None


def normalizar_rol(value: str | None) -> str | None:
    if value is None:
        return None
    raw = value.strip().upper()
    if not raw:
        return None
    if raw == ROL_ADMIN:
        return ROL_ADMIN
    raw = _ALIASES.get(raw, raw)
    if raw in ROLES_VALIDOS:
        return raw
    codigo = normalizar_codigo_modulo(raw)
    return codigo

