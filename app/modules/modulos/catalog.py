"""Catálogo de módulos sin tabla INTRANET_MODULOS (config + DISTINCT en calidad)."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import distinct, select, update
from sqlalchemy.orm import Session

from app.models import IntranetCalidad, IntranetCalidadRol, IntranetCalidadVersion, IntranetPlanMejora

_CATALOG_DIR = Path(__file__).resolve().parent
_EXTRA_JSON = _CATALOG_DIR / "modulos_extra.json"
_OVERRIDES_JSON = _CATALOG_DIR / "modulos_overrides.json"

MODULOS_BASE: list[dict[str, str]] = [
    {
        "codigo": "RESOLUCION_256",
        "nombre": "Resolución 256",
        "icono": "FileSpreadsheet",
        "estado": "ACTIVO",
    },
    {
        "codigo": "EPIDEMIOLOGIA",
        "nombre": "Epidemiología / IAAS",
        "icono": "Activity",
        "estado": "ACTIVO",
    },
]


@dataclass(frozen=True)
class ModuloCatalogo:
    id: int
    codigo: str
    nombre: str
    icono: str | None
    estado: str | None


def _load_extra() -> list[dict[str, str]]:
    if not _EXTRA_JSON.is_file():
        return []
    try:
        raw = json.loads(_EXTRA_JSON.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []
    if not isinstance(raw, list):
        return []
    return [item for item in raw if isinstance(item, dict) and item.get("codigo")]


def _save_extra(entries: list[dict[str, str]]) -> None:
    _EXTRA_JSON.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _load_overrides() -> dict[str, dict[str, str]]:
    if not _OVERRIDES_JSON.is_file():
        return {}
    try:
        raw = json.loads(_OVERRIDES_JSON.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    return raw if isinstance(raw, dict) else {}


def _save_overrides(data: dict[str, dict[str, str]]) -> None:
    _OVERRIDES_JSON.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _distinct_modulos_calidad(db: Session) -> list[dict[str, str]]:
    rows = db.scalars(
        select(distinct(IntranetCalidad.modulo)).where(
            IntranetCalidad.modulo.isnot(None)
        )
    ).all()
    result: list[dict[str, str]] = []
    for value in rows:
        codigo = (value or "").strip().upper().replace(" ", "_")
        if not codigo:
            continue
        result.append(
            {
                "codigo": codigo,
                "nombre": codigo.replace("_", " ").title(),
                "icono": "Folder",
                "estado": "ACTIVO",
            }
        )
    return result


def _synthetic_id(codigo: str) -> int:
    return abs(hash(codigo.upper())) % 1_000_000_000


def listar_modulos_catalogo(
    db: Session,
    *,
    solo_activos: bool = True,
) -> list[ModuloCatalogo]:
    overrides = _load_overrides()
    merged: dict[str, dict[str, str]] = {}
    for item in MODULOS_BASE + _load_extra() + _distinct_modulos_calidad(db):
        codigo = (item.get("codigo") or "").strip().upper().replace(" ", "_")
        if not codigo:
            continue
        ov = overrides.get(codigo, {})
        merged[codigo] = {
            "codigo": codigo,
            "nombre": (ov.get("nombre") or item.get("nombre") or codigo).strip(),
            "icono": (ov.get("icono") or item.get("icono") or "Folder").strip(),
            "estado": (ov.get("estado") or item.get("estado") or "ACTIVO")
            .strip()
            .upper(),
        }

    out: list[ModuloCatalogo] = []
    for codigo in sorted(merged.keys(), key=lambda c: merged[c]["nombre"].lower()):
        row = merged[codigo]
        estado = row["estado"]
        if solo_activos and estado in {"INACTIVO", "0", "I", "N"}:
            continue
        out.append(
            ModuloCatalogo(
                id=_synthetic_id(codigo),
                codigo=codigo,
                nombre=row["nombre"],
                icono=row["icono"],
                estado=estado,
            )
        )
    return out


def obtener_modulo_catalogo(
    db: Session,
    modulo_codigo: str,
) -> ModuloCatalogo | None:
    codigo = (modulo_codigo or "").strip().upper().replace(" ", "_")
    for item in listar_modulos_catalogo(db, solo_activos=False):
        if item.codigo == codigo:
            return item
    return None


def agregar_modulo_extra(
    *,
    codigo: str,
    nombre: str,
    icono: str | None = "Folder",
    estado: str = "ACTIVO",
) -> dict[str, str]:
    entry = {
        "codigo": codigo.strip().upper().replace(" ", "_"),
        "nombre": nombre.strip(),
        "icono": (icono or "Folder").strip(),
        "estado": (estado or "ACTIVO").strip().upper(),
    }
    extra = _load_extra()
    if any(e.get("codigo") == entry["codigo"] for e in extra):
        raise ValueError("duplicate")
    extra.append(entry)
    _save_extra(extra)
    return entry


def actualizar_modulo_catalogo(
    codigo: str,
    *,
    nombre: str | None = None,
    icono: str | None = None,
    estado: str | None = None,
) -> None:
    codigo = codigo.strip().upper().replace(" ", "_")
    extra = _load_extra()
    found_in_extra = False
    for entry in extra:
        if (entry.get("codigo") or "").upper() == codigo:
            if nombre is not None:
                entry["nombre"] = nombre.strip()
            if icono is not None:
                entry["icono"] = icono.strip()
            if estado is not None:
                entry["estado"] = estado.strip().upper()
            found_in_extra = True
            break
    if found_in_extra:
        _save_extra(extra)
        return

    overrides = _load_overrides()
    row = overrides.setdefault(codigo, {})
    if nombre is not None:
        row["nombre"] = nombre.strip()
    if icono is not None:
        row["icono"] = icono.strip()
    if estado is not None:
        row["estado"] = estado.strip().upper()
    _save_overrides(overrides)


def eliminar_modulo_del_catalogo(codigo: str) -> None:
    codigo = codigo.strip().upper().replace(" ", "_")
    extra = [e for e in _load_extra() if (e.get("codigo") or "").upper() != codigo]
    _save_extra(extra)
    overrides = _load_overrides()
    if codigo in overrides:
        overrides[codigo]["estado"] = "INACTIVO"
    else:
        overrides[codigo] = {"estado": "INACTIVO"}
    _save_overrides(overrides)


def propagar_codigo_modulo_en_oracle(
    db: Session,
    codigo_anterior: str,
    codigo_nuevo: str,
) -> None:
    anterior = codigo_anterior.strip().upper().replace(" ", "_")
    nuevo = codigo_nuevo.strip().upper().replace(" ", "_")
    if anterior == nuevo:
        return
    db.execute(
        update(IntranetCalidad)
        .where(IntranetCalidad.modulo == anterior)
        .values(modulo=nuevo)
    )
    db.execute(
        update(IntranetCalidadVersion)
        .where(IntranetCalidadVersion.modulo == anterior)
        .values(modulo=nuevo)
    )
    db.execute(
        update(IntranetPlanMejora)
        .where(IntranetPlanMejora.modulo == anterior)
        .values(modulo=nuevo)
    )
    db.execute(
        update(IntranetCalidadRol)
        .where(IntranetCalidadRol.modulo == anterior)
        .values(modulo=nuevo)
    )


def renombrar_modulo_en_catalogo(
    db: Session,
    codigo_anterior: str,
    codigo_nuevo: str,
) -> None:
    anterior = codigo_anterior.strip().upper().replace(" ", "_")
    nuevo = codigo_nuevo.strip().upper().replace(" ", "_")
    extra = _load_extra()
    for entry in extra:
        if (entry.get("codigo") or "").upper() == anterior:
            entry["codigo"] = nuevo
            _save_extra(extra)
            break
    overrides = _load_overrides()
    if anterior in overrides:
        overrides[nuevo] = overrides.pop(anterior)
        _save_overrides(overrides)
    propagar_codigo_modulo_en_oracle(db, anterior, nuevo)
