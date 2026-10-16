"""Evaluación de cumplimiento de meta institucional (texto libre)."""

import re


def _parse_threshold(meta_str: str) -> tuple[str, float] | None:
    cleaned = str(meta_str).strip()
    if not cleaned:
        return None

    text = cleaned.replace(",", ".").replace("%", "")
    text = re.sub(r"\s+", "", text)

    match = re.match(r"^(<=|>=|<|>|=)([\d.]+)$", text, flags=re.IGNORECASE)
    if match:
        try:
            return match.group(1), float(match.group(2))
        except ValueError:
            return None

    bare = re.match(r"^([\d.]+)$", text)
    if bare:
        try:
            return ">=", float(bare.group(1))
        except ValueError:
            return None

    return None


def evaluar_cumplimiento_meta(valor_obtenido: float | None, meta_str: str | None) -> bool:
    """
    Retorna True si el valor CUMPLE la meta, False si incumple.
    Sin meta parseable → se considera cumplido (no genera alerta).
    """
    if valor_obtenido is None:
        return True

    if meta_str is None or not str(meta_str).strip():
        return True

    parsed = _parse_threshold(meta_str)
    if parsed is None:
        return True

    operator, threshold = parsed
    value = float(valor_obtenido)

    if operator == "<=":
        return value <= threshold
    if operator == "<":
        return value < threshold
    if operator == ">=":
        return value >= threshold
    if operator == ">":
        return value > threshold
    if operator == "=":
        return value == threshold

    return True
