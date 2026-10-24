from typing import Literal

RolUsuario = Literal["ADMIN", "RESOLUCION_256", "EPIDEMIOLOGIA"]
ROLES_VALIDOS: frozenset[str] = frozenset({"ADMIN", "RESOLUCION_256", "EPIDEMIOLOGIA"})

_ALIASES = {
    "CALIDAD": "RESOLUCION_256",
    "RESOLUCION256": "RESOLUCION_256",
    "RES_256": "RESOLUCION_256",
}


def normalizar_rol(value: str | None) -> str | None:
    if value is None:
        return None
    raw = value.strip().upper()
    if not raw:
        return None
    raw = _ALIASES.get(raw, raw)
    if raw in ROLES_VALIDOS:
        return raw
    return None
