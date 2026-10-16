import React, { useMemo } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

function normalizeKey(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatValor(valor) {
  if (valor == null || Number.isNaN(Number(valor))) {
    return "—";
  }
  return Number(valor).toFixed(2);
}

export default function IncidenciasIndicadorBadge({ incidencias, selectedGroup }) {
  const incidenciasDelIndicador = useMemo(() => {
    if (!selectedGroup) {
      return [];
    }

    const calidadIds = new Set(
      selectedGroup.versions.map((version) => version.calidad_id).filter(Boolean)
    );
    const nameKey = normalizeKey(selectedGroup.name);

    return incidencias
      .filter(
        (inc) =>
          calidadIds.has(inc.calidad_id) ||
          normalizeKey(inc.indicador) === nameKey
      )
      .sort((a, b) => {
        if (b.year !== a.year) {
          return b.year - a.year;
        }
        return b.mes - a.mes;
      });
  }, [incidencias, selectedGroup]);

  const count = incidenciasDelIndicador.length;

  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-800">
        <CheckCircle2 size={14} aria-hidden />
        0 incidencias
      </span>
    );
  }

  return (
    <div className="relative group">
      <span
        className="inline-flex cursor-help items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 tabular-nums"
        tabIndex={0}
        role="button"
        aria-label={`${count} incidencias sin plan de mejora`}
      >
        <AlertTriangle size={14} className="text-amber-700" aria-hidden />
        {count} incidencia{count === 1 ? "" : "s"} sin plan
      </span>

      <div
        className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-[min(320px,calc(100vw-2rem))] scale-95 opacity-0 transition group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:scale-100 group-focus-within:opacity-100"
        role="tooltip"
      >
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg ring-1 ring-black/5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Incumplimientos sin plan
          </p>
          <ul className="max-h-48 space-y-2 overflow-y-auto text-xs text-gray-700">
            {incidenciasDelIndicador.map((inc) => (
              <li
                key={`${inc.calidad_id}-${inc.year}-${inc.mes}`}
                className="rounded-lg bg-amber-50/80 px-2 py-1.5 capitalize leading-snug"
              >
                <span className="font-semibold text-gray-900">
                  {inc.mes_nombre} {inc.year}
                </span>
                <span className="mt-0.5 block text-gray-600">
                  Meta: {inc.meta_institucional?.trim() || "—"} · Obtenido:{" "}
                  {formatValor(inc.valor_obtenido)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
