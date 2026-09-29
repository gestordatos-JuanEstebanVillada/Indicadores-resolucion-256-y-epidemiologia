"""Multiplicador del indicador (paridad con frontend formatIndicator.js)."""


def get_multiplier(formula: str | None, indicador_name: str = "") -> float:
    name_lower = (indicador_name or "").lower()
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


def calculate_indicator_value(
    numerador: float | int | None,
    denominador: float | int | None,
    formula: str | None,
    indicador_name: str = "",
) -> float | None:
    n = float(numerador or 0)
    d = float(denominador or 0)
    if d == 0:
        return None
    return (n / d) * get_multiplier(formula, indicador_name)
