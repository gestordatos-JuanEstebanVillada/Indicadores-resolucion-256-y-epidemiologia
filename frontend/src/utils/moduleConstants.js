export const MODULO_RESOLUCION_256 = "RESOLUCION_256";
export const MODULO_EPIDEMIOLOGIA = "EPIDEMIOLOGIA";

/** @deprecated Usar MODULO_RESOLUCION_256 */
export const RESOLUCION_256_OBSERVATORIO = MODULO_RESOLUCION_256;

/** @deprecated Usar MODULO_EPIDEMIOLOGIA */
export const IAAS_OBSERVATORIO = MODULO_EPIDEMIOLOGIA;

export function normalizeModulo(value) {
  return (value || "").trim().toUpperCase();
}

export function normalizeObservatorioForPayload(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed || null;
}
