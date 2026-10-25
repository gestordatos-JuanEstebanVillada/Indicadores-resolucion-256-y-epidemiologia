import { API_URL, apiFetch } from "../config/api";
import { getUserRol, ROLES } from "./authRoles";
import {
  MODULO_EPIDEMIOLOGIA,
  MODULO_RESOLUCION_256,
} from "./moduleConstants";

function modulosPermitidosPorRol() {
  const rol = getUserRol();
  if (rol === ROLES.ADMIN) {
    return [MODULO_RESOLUCION_256, MODULO_EPIDEMIOLOGIA];
  }
  if (rol === ROLES.RESOLUCION_256) {
    return [MODULO_RESOLUCION_256];
  }
  if (rol === ROLES.EPIDEMIOLOGIA) {
    return [MODULO_EPIDEMIOLOGIA];
  }
  return [];
}

export function incumplimientoKey(alert) {
  return `${alert.calidad_id}-${alert.year}-${alert.mes}`;
}

/** Incidencias sin plan, según módulos permitidos por rol (ADMIN: ambos). */
export async function fetchAllIncumplimientos() {
  const modules = modulosPermitidosPorRol();
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
