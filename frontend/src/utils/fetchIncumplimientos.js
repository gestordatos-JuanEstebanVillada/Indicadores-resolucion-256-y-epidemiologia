import { API_URL, apiFetch } from "../config/api";
import {
  esAdminGlobal,
  getUserModulos,
} from "./authRoles";
import {
  MODULO_EPIDEMIOLOGIA,
  MODULO_RESOLUCION_256,
} from "./moduleConstants";

export function modulosParaNotificaciones() {
  if (esAdminGlobal()) {
    return [MODULO_RESOLUCION_256, MODULO_EPIDEMIOLOGIA];
  }
  const asignados = getUserModulos();
  return asignados.length > 0
    ? asignados
    : [MODULO_RESOLUCION_256, MODULO_EPIDEMIOLOGIA];
}

export function incumplimientoKey(alert) {
  return `${alert.calidad_id}-${alert.year}-${alert.mes}`;
}

/** Incidencias sin plan, por módulos asignados en INTRANET_CALIDAD_ROLES (JWT). */
export async function fetchAllIncumplimientos() {
  const modules = modulosParaNotificaciones();
  if (modules.length === 0) {
    return [];
  }
  const responses = await Promise.all(
    modules.map((modulo) =>
      apiFetch(
        `${API_URL}/notificaciones/incumplimientos?modulo=${encodeURIComponent(modulo)}`
      )
    )
  );

  const merged = [];
  for (const response of responses) {
    if (!response.ok) {
      continue;
    }
    merged.push(...(await response.json()));
  }

  merged.sort((a, b) => {
    if (b.year !== a.year) {
      return b.year - a.year;
    }
    if (b.mes !== a.mes) {
      return b.mes - a.mes;
    }
    return (a.indicador || "").localeCompare(b.indicador || "", "es");
  });

  return merged;
}
