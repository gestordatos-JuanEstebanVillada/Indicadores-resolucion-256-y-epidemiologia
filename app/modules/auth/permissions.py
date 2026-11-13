from fastapi import Depends, HTTPException, Request, status

from app.modules.auth.admin_dependencies import get_current_token_payload
from app.modules.calidad.constants import MODULO_EPIDEMIOLOGIA, MODULO_RESOLUCION_256


def _normalize_codigo(value: str | None) -> str:
    return (value or "").strip().upper().replace(" ", "_")


def _flag_truthy(value) -> bool:
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value == 1
    text = str(value).strip().upper()
    return text in {"1", "S", "Y", "TRUE", "SI", "YES"}


def _jerarquia_token(payload: dict) -> str:
    return (
        payload.get("jerarquia")
        or payload.get("nombre_rol")
        or payload.get("rol")
        or ""
    ).strip().upper()


def es_admin_global_token(payload: dict) -> bool:
    if _flag_truthy(payload.get("es_admin_global")):
        return True
    return _jerarquia_token(payload) in {
        "ADMINISTRADOR_GLOBAL",
        "ADMINISTRADOR",
        "ADMIN",
    }


def es_administrador_area_token(payload: dict) -> bool:
    if es_admin_global_token(payload):
        return False
    return _jerarquia_token(payload) == "ADMINISTRADOR_AREA"


def permite_edicion_token(payload: dict) -> bool:
    if es_admin_global_token(payload):
        return True
    return _flag_truthy(payload.get("permite_edicion"))


def _modulos_en_token(payload: dict) -> set[str]:
    raw = payload.get("modulos")
    modulos: set[str] = set()
    if isinstance(raw, list):
        modulos |= {_normalize_codigo(item) for item in raw if item}
    elif isinstance(raw, str) and raw.strip():
        modulos.add(_normalize_codigo(raw))
    return {m for m in modulos if m}


def modulos_en_token_set(payload: dict) -> set[str]:
    return _modulos_en_token(payload)


def modulos_solo_lectura_en_token(payload: dict) -> set[str]:
    raw = payload.get("modulos_solo_lectura")
    if not isinstance(raw, list):
        return set()
    return {_normalize_codigo(item) for item in raw if item}


def modulos_edicion_en_token(payload: dict) -> set[str]:
    raw = payload.get("modulos_edicion")
    if isinstance(raw, list) and raw:
        return {_normalize_codigo(item) for item in raw if item}
    todos = _modulos_en_token(payload)
    lectura = modulos_solo_lectura_en_token(payload)
    return {m for m in todos if m not in lectura}


def modulo_es_solo_lectura_token(payload: dict, modulo_codigo: str) -> bool:
    if es_admin_global_token(payload):
        return False
    codigo = _normalize_codigo(modulo_codigo)
    return codigo in modulos_solo_lectura_en_token(payload)


def assert_usuario_con_acceso(payload: dict) -> dict:
    if es_admin_global_token(payload):
        return payload
    if _modulos_en_token(payload):
        return payload
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Sin permiso para acceder a indicadores de calidad",
    )


def assert_lectura_modulo_codigo(payload: dict, modulo_codigo: str) -> dict:
    if es_admin_global_token(payload):
        return payload
    codigo = _normalize_codigo(modulo_codigo)
    if codigo in _modulos_en_token(payload):
        return payload
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Sin permiso para este módulo",
    )


def assert_escritura_modulo_codigo(payload: dict, modulo_codigo: str) -> dict:
    assert_lectura_modulo_codigo(payload, modulo_codigo)
    if modulo_es_solo_lectura_token(payload, modulo_codigo):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Módulo en solo lectura",
        )
    if not es_admin_global_token(payload) and not permite_edicion_token(payload):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Su rol no permite modificar datos",
        )
    return payload


def require_lectura_indicadores(
    payload: dict = Depends(get_current_token_payload),
) -> dict:
    return assert_usuario_con_acceso(payload)


def require_lectura_for_modulo(
    modulo_codigo: str,
    payload: dict = Depends(get_current_token_payload),
) -> dict:
    return assert_lectura_modulo_codigo(payload, modulo_codigo)


def require_escritura_for_modulo(
    modulo_codigo: str,
    payload: dict = Depends(get_current_token_payload),
) -> dict:
    return assert_escritura_modulo_codigo(payload, modulo_codigo)


def require_escritura_http(request: Request, payload: dict) -> dict:
    if request.method.upper() in {"GET", "HEAD", "OPTIONS"}:
        return payload
    if not permite_edicion_token(payload):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Su rol no permite modificar datos",
        )
    return payload


def assert_escritura_modulo(payload: dict, modulo: str) -> dict:
    return assert_escritura_modulo_codigo(payload, modulo)


def require_escritura_resolucion_256(
    payload: dict = Depends(get_current_token_payload),
) -> dict:
    return assert_escritura_modulo_codigo(payload, MODULO_RESOLUCION_256)


def require_escritura_epidemiologia(
    payload: dict = Depends(get_current_token_payload),
) -> dict:
    return assert_escritura_modulo_codigo(payload, MODULO_EPIDEMIOLOGIA)


# Compatibilidad
def es_admin_token(payload: dict) -> bool:
    return es_admin_global_token(payload)
