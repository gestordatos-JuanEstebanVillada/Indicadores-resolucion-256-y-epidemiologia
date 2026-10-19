import { toggleRequierePlanInRows } from "./requierePlanRows";
import {
  mensajeSiNoPuedeActivarRequierePlan,
  toastRequierePlanActivado,
  toastRequierePlanBloqueado,
  toastRequierePlanDesactivado,
} from "./requierePlanToast";

/**
 * Valida, muestra toast y devuelve filas actualizadas o null si se bloqueó el cambio.
 */
export function attemptToggleRequierePlanInRows(
  rows,
  month,
  { metaInstitucional, formula, indicador }
) {
  const row = (rows || []).find((item) => item.month === month);
  if (!row) {
    return null;
  }

  const actual = (row.requiere_plan || "NO").toUpperCase();
  const activando = actual !== "SI";

  if (activando) {
    const bloqueo = mensajeSiNoPuedeActivarRequierePlan(
      row,
      metaInstitucional,
      formula,
      indicador
    );
    if (bloqueo) {
      toastRequierePlanBloqueado(bloqueo);
      return null;
    }
    toastRequierePlanActivado();
  } else {
    toastRequierePlanDesactivado();
  }

  return toggleRequierePlanInRows(rows, month);
}
