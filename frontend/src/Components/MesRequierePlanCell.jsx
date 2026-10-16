import React, { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

import RequierePlanToggle from "./RequierePlanToggle";
import { resolveIndicatorValue } from "../utils/formatIndicator";
import {
  evaluarCumplimientoMeta,
  filaMensualTieneDatos,
} from "../utils/evaluateMetaCompliance";

export default function MesRequierePlanCell({
  row,
  metaInstitucional,
  formula,
  indicador,
  value,
  onToggle,
}) {
  const incumpleMeta = useMemo(() => {
    if (!filaMensualTieneDatos(row)) {
      return false;
    }
    const valor = resolveIndicatorValue(row, formula, indicador);
    if (valor == null) {
      return false;
    }
    return !evaluarCumplimientoMeta(valor, metaInstitucional);
  }, [row, metaInstitucional, formula, indicador]);

  const planValue = value ?? row?.requiere_plan ?? "NO";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <RequierePlanToggle value={planValue} onToggle={onToggle} />
      {incumpleMeta ? (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
          <AlertTriangle size={14} className="shrink-0" aria-hidden />
          Incumple meta
        </span>
      ) : null}
    </div>
  );
}
