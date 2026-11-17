"""Cálculo del indicador (paridad con frontend formatIndicator.js + meta institucional)."""
from __future__ import annotations

import re


def meta_es_porcentaje(meta_institucional: str | None) -> bool:
    return bool(meta_institucional) and str(meta_institucional).strip().endswith("%")


def formula_exige_multiplicador_cien(formula: str | None) -> bool:
    if not formula:
        return False
    text = (
        str(formula)
        .lower()
        .replace("×", "x")
        .replace(" ", "")
    )
    return bool(re.search(r"(x|\*)100", text)) or "%" in text


def get_multiplier(formula: str | None, indicador_name: str = "") -> float:
    """Multiplicador legado cuando no hay meta institucional definida."""
    formula = formula or ""
    indicador_name = indicador_name or ""
    name_lower = indicador_name.lower()
    if (
        "p.3.14" in name_lower
        or "p.3.15" in name_lower
        or "adherencia higiene de manos" in name_lower
    ):
        return 100.0

    if not formula:
        return 1.0

    text = (
        str(formula)
        .lower()
        .replace("×", "x")
        .replace(" ", "")
    )

    if "x100000" in text or "*100000" in text:
        return 100_000.0
    if "x10000" in text or "*10000" in text:
        return 10_000.0
    if "x1000" in text or "*1000" in text or "1000paciente" in text:
        return 1_000.0
    if "x100" in text or "*100" in text or "%" in text:
        return 100.0
    if "x10" in text or "*10" in text:
        return 10.0

    return 1.0


def resolve_multiplier(
    formula: str | None,
    indicador_name: str = "",
    meta_institucional: str | None = None,
) -> float:
    """
    Factor N/D para agregados (trimestre/semestre).
    Meta con % o fórmula con x100 → 100.0; caso contrario 1.0 (o legado vía get_multiplier).
    """
    meta = (meta_institucional or "").strip()
    if meta:
        if meta_es_porcentaje(meta):
            return 100.0
        if formula_exige_multiplicador_cien(formula):
            return 100.0
        return 1.0
    legacy = get_multiplier(formula, indicador_name)
    return legacy if legacy and legacy > 0 else 1.0


def calculate_indicator_value(
    numerador: float | int | None,
    denominador: float | int | None,
    formula: str | None,
    indicador_name: str = "",
    meta_institucional: str | None = None,
) -> float | None:
    n = float(numerador or 0)
    d = float(denominador or 0)
    if d == 0:
        return None

    ratio = n / d
    meta = (meta_institucional or "").strip()

    if meta:
        if meta_es_porcentaje(meta):
            return ratio * 100.0
        if formula_exige_multiplicador_cien(formula):
            return ratio * 100.0
        return ratio

    return ratio * get_multiplier(formula, indicador_name)