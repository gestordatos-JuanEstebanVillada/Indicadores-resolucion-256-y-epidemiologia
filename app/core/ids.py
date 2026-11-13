"""Identificadores de usuario: 0 es válido en Oracle."""


def is_defined_user_id(user_id: int | None) -> bool:
    return user_id is not None


def tiene_filas_acceso(filas: list) -> bool:
    return len(filas) > 0
