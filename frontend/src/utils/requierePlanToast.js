import toast from "react-hot-toast";

import { resolveIndicatorValue } from "./formatIndicator";
import {
  evaluarCumplimientoMeta,
  filaMensualTieneDatos,
} from "./evaluateMetaCompliance";

/** Mensaje si no se puede activar «Requiere plan» a SÍ; null si está permitido. */
export function mensajeSiNoPuedeActivarRequierePlan(
  row,
  metaInstitucional,
  formula,
  indicador
) {
  if (!filaMensualTieneDatos(row)) {
    return "Este mes no tiene datos. No aplica marcar «Requiere plan».";
  }

  const valor = resolveIndicatorValue(row, formula, indicador);
  if (valor == null) {
    return "No hay valor de indicador para evaluar la meta en este mes.";
  }

  if (evaluarCumplimientoMeta(valor, metaInstitucional)) {
    return "La meta se cumplió en este mes. No puede activarse «Requiere plan».";
  }

  return null;
}

export function toastRequierePlanActivado() {
  toast.success(
    "Mes marcado como «Requiere plan». Se incluirá en alertas si no hay plan registrado.",
    { duration: 4000 }
  );
}

export function toastRequierePlanDesactivado() {
  toast.success("Mes marcado como «No requiere plan».", { duration: 4000 });
}

export function toastRequierePlanBloqueado(mensaje) {
  toast.error(mensaje, { duration: 4000 });
}

export function toastRequierePlanGuardadoError() {
  toast.error("No se pudo guardar el cambio. Intente de nuevo.", { duration: 4000 });
}
