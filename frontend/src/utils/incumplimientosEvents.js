/** Evento global para recargar alertas (campana y pestaña de incidencias). */
export const INCUMPLIMIENTOS_REFRESH_EVENT = "incumplimientos:refresh";

export function dispatchIncumplimientosRefresh() {
  window.dispatchEvent(new CustomEvent(INCUMPLIMIENTOS_REFRESH_EVENT));
}
