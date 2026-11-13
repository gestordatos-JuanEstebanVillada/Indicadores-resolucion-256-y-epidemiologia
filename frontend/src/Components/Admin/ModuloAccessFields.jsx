import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { esAdminGlobal, esAdministradorArea } from "../../utils/authRoles";

const JERARQUIAS = [
  { value: "ADMINISTRADOR_GLOBAL", label: "Administrador global" },
  { value: "ADMINISTRADOR_AREA", label: "Administrador de área" },
  { value: "USUARIO", label: "Usuario" },
];

function SoloLecturaSwitch({ checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-gray-600">
      <span>Solo lectura</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-amber-400" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

export default function ModuloAccessFields({
  jerarquia,
  onChangeJerarquia,
  catalogoModulos,
  accesos,
  onChangeAccesos,
}) {
  const [busqueda, setBusqueda] = useState("");

  const opcionesJerarquia = useMemo(() => {
    if (esAdminGlobal()) {
      return JERARQUIAS;
    }
    if (esAdministradorArea()) {
      return JERARQUIAS.filter((j) => j.value === "USUARIO");
    }
    return JERARQUIAS.filter((j) => j.value !== "ADMINISTRADOR_GLOBAL");
  }, []);

  const esGlobal = (jerarquia || "").toUpperCase() === "ADMINISTRADOR_GLOBAL";

  const mapaAccesos = useMemo(() => {
    const map = new Map();
    for (const item of accesos || []) {
      const codigo = (item.modulo || "").toUpperCase();
      if (codigo) {
        map.set(codigo, Boolean(item.solo_lectura));
      }
    }
    return map;
  }, [accesos]);

  const modulosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) {
      return catalogoModulos;
    }
    return catalogoModulos.filter(
      (modulo) =>
        (modulo.nombre || "").toLowerCase().includes(q) ||
        (modulo.codigo || "").toLowerCase().includes(q)
    );
  }, [catalogoModulos, busqueda]);

  function emitirDesdeMapa(map) {
    onChangeAccesos(
      [...map.entries()].map(([modulo, solo_lectura]) => ({
        modulo,
        solo_lectura,
      }))
    );
  }

  function toggleModulo(codigo) {
    const upper = codigo.toUpperCase();
    const next = new Map(mapaAccesos);
    if (next.has(upper)) {
      next.delete(upper);
    } else {
      next.set(upper, false);
    }
    emitirDesdeMapa(next);
  }

  function setSoloLectura(codigo, value) {
    const upper = codigo.toUpperCase();
    if (!mapaAccesos.has(upper)) {
      return;
    }
    const next = new Map(mapaAccesos);
    next.set(upper, value);
    emitirDesdeMapa(next);
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm text-gray-700">
        Jerarquía (ROL)
        <select
          required
          value={(jerarquia || "").toUpperCase()}
          onChange={(e) => onChangeJerarquia(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Seleccione jerarquía…
          </option>
          {opcionesJerarquia.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {esGlobal ? (
        <p className="rounded-md border border-pink-100 bg-pink-50 px-3 py-2 text-xs text-pink-800">
          El administrador global tiene acceso a todos los módulos.
        </p>
      ) : (
        <fieldset className="rounded-lg border border-gray-200 p-3">
          <legend className="px-1 text-xs font-semibold uppercase text-gray-500">
            Módulos (NOMBRE_ROL: Editor / Lector)
          </legend>
          <div className="relative mt-3">
            <Search
              size={16}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar módulo…"
              className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm"
            />
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-gray-50/50 p-2 space-y-1">
            {modulosFiltrados.map((modulo) => {
              const codigo = modulo.codigo.toUpperCase();
              const seleccionado = mapaAccesos.has(codigo);
              return (
                <div
                  key={modulo.codigo}
                  className="flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white"
                >
                  <label className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={seleccionado}
                      onChange={() => toggleModulo(modulo.codigo)}
                    />
                    <span>
                      {modulo.nombre}{" "}
                      <span className="text-gray-400">({modulo.codigo})</span>
                    </span>
                  </label>
                  {seleccionado ? (
                    <SoloLecturaSwitch
                      checked={mapaAccesos.get(codigo)}
                      onChange={(v) => setSoloLectura(modulo.codigo, v)}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
