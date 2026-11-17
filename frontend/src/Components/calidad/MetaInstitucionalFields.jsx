import { useEffect, useState } from "react";

import {
  META_OPERADORES,
  deserializeMetaInstitucional,
  serializeMetaInstitucional,
} from "../../utils/metaInstitucional";

export default function MetaInstitucionalFields({
  value,
  onChange,
  className = "",
  label = "Meta institucional",
}) {
  const [draft, setDraft] = useState(() => deserializeMetaInstitucional(value));

  useEffect(() => {
    setDraft(deserializeMetaInstitucional(value));
  }, [value]);

  function emit(nextDraft) {
    setDraft(nextDraft);
    onChange(serializeMetaInstitucional(nextDraft));
  }

  return (
    <fieldset className={`border-0 p-0 ${className}`}>
      <span className="mb-2 block text-sm font-medium text-gray-700">{label}</span>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-end">
        <label className="block text-xs text-gray-600">
          Operador
          <select
            value={draft.operador}
            onChange={(e) =>
              emit({ ...draft, operador: e.target.value })
            }
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
          >
            {META_OPERADORES.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs text-gray-600">
          Valor meta
          <input
            type="number"
            step="any"
            inputMode="decimal"
            value={draft.valor}
            onChange={(e) => emit({ ...draft, valor: e.target.value })}
            placeholder="80, 10, 0.3"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
          />
        </label>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={draft.esPorcentaje}
            onChange={(e) =>
              emit({ ...draft, esPorcentaje: e.target.checked })
            }
            className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
          />
          ¿Es porcentaje?
        </label>
      </div>
    </fieldset>
  );
}