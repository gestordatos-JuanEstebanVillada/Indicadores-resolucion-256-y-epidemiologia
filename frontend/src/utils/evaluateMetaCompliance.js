/**
 * Evalúa cumplimiento de meta (misma lógica que app/modules/calidad/meta_evaluation.py).
 * @returns {boolean} true si CUMPLE la meta
 */
export function evaluarCumplimientoMeta(valorObtenido, metaStr) {
  if (valorObtenido == null || Number.isNaN(Number(valorObtenido))) {
    return true;
  }
  if (metaStr == null || !String(metaStr).trim()) {
    return true;
  }

  const parsed = parseThreshold(metaStr);
  if (!parsed) {
    return true;
  }

  const [operator, threshold] = parsed;
  const value = Number(valorObtenido);

  if (operator === "<=") {
    return value <= threshold;
  }
  if (operator === "<") {
    return value < threshold;
  }
  if (operator === ">=") {
    return value >= threshold;
  }
  if (operator === ">") {
    return value > threshold;
  }
  if (operator === "=") {
    return value === threshold;
  }

  return true;
}

function parseThreshold(metaStr) {
  let text = String(metaStr).trim().replace(/,/g, ".").replace(/%/g, "");
  text = text.replace(/\s+/g, "");

  const match = text.match(/^(<=|>=|<|>|=)([\d.]+)$/i);
  if (match) {
    const threshold = Number(match[2]);
    return Number.isNaN(threshold) ? null : [match[1], threshold];
  }

  const bare = text.match(/^([\d.]+)$/);
  if (bare) {
    const threshold = Number(bare[1]);
    return Number.isNaN(threshold) ? null : [">=", threshold];
  }

  return null;
}

export function filaMensualTieneDatos(row) {
  const numerador = Number(row?.numerador) || 0;
  const denominador = Number(row?.denominador) || 0;
  const indicador = row?.indicador_valor;

  if (numerador !== 0 || denominador !== 0) {
    return true;
  }
  return indicador != null && Number(indicador) !== 0;
}
