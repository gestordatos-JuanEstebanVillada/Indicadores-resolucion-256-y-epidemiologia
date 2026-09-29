/**
 * Extrae el multiplicador matemático desde la fórmula y el nombre del indicador.
 */
export function getMultiplier(formula, indicadorName = "") {
  const nameLower = String(indicadorName).toLowerCase();
  if (
    nameLower.includes("p.3.14")
    || nameLower.includes("p.3.15")
    || nameLower.includes("adherencia higiene de manos")
  ) {
    return 100;
  }

  if (!formula) {
    return 1;
  }

  const text = String(formula)
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/\s+/g, "");

  if (text.includes("x100000") || text.includes("*100000")) {
    return 100000;
  }

  if (text.includes("x10000") || text.includes("*10000")) {
    return 10000;
  }

  if (
    text.includes("x1000")
    || text.includes("*1000")
    || text.includes("1000paciente")
  ) {
    return 1000;
  }

  if (text.includes("x100") || text.includes("*100") || text.includes("%")) {
    return 100;
  }

  if (text.includes("x10") || text.includes("*10")) {
    return 10;
  }

  return 1;
}

/** Formatea el valor ya calculado (n/d × multiplicador), sin volver a dividir. */
function formatIndicatorNumber(num) {
  return num.toFixed(3);
}

function shouldAppendPercentSuffix(indicadorName) {
  const nameLower = String(indicadorName).toLowerCase();

  return (
    nameLower.includes("p.3.14")
    || nameLower.includes("p.3.15")
    || nameLower.includes("adherencia higiene de manos")
    || nameLower.includes("satisfacción")
    || nameLower.includes("satisfaccion")
    || nameLower.includes("recomendaría")
    || nameLower.includes("recomendaria")
  );
}

/**
 * Formatea el valor del indicador para mostrar en UI.
 */
export function formatIndicatorDisplay(value, formula, indicadorName = "") {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const num = Number(value);

  if (!Number.isFinite(num)) {
    return "—";
  }

  let formatted = formatIndicatorNumber(num);

  if (shouldAppendPercentSuffix(indicadorName)) {
    formatted += "%";
  }

  return formatted;
}

/**
 * Valor numérico del indicador para una fila (recalcula desde n/d cuando hay denominador).
 */
export function resolveIndicatorValue(row, formula, indicadorName = "") {
  const denominador = Number(row?.denominador) || 0;

  if (denominador > 0) {
    return calculateIndicatorValue(
      row?.numerador,
      denominador,
      formula,
      indicadorName
    );
  }

  const stored = row?.indicador_valor;

  if (stored === null || stored === undefined || stored === "") {
    return null;
  }

  const num = Number(stored);

  return Number.isFinite(num) ? num : null;
}

/**
 * Formatea el indicador de una fila mensual para tablas y modales.
 */
export function formatIndicatorRowDisplay(row, formula, indicadorName = "") {
  return formatIndicatorDisplay(
    resolveIndicatorValue(row, formula, indicadorName),
    formula,
    indicadorName
  );
}

/**
 * Recalcula indicador_valor en cada fila sin redondear (estado / guardado).
 */
export function recalculateRowsWithIndicator(rows, formula, indicadorName = "") {
  const multiplier = getMultiplier(formula, indicadorName);

  return (rows || []).map((row) => {
    const num = Number(row.numerador) || 0;
    const den = Number(row.denominador) || 0;

    return {
      ...row,
      indicador_valor: den ? (num / den) * multiplier : null,
    };
  });
}

/** Recalcula filas mensuales de una versión/indicador completo. */
export function recalculateVersionIndicatorRows(version, emptyRows = []) {
  const formula = version?.formula ?? "";
  const indicadorName = version?.indicador ?? "";
  const sourceRows = version?.rows?.length ? version.rows : emptyRows;

  return recalculateRowsWithIndicator(sourceRows, formula, indicadorName);
}

/** Normaliza todas las versiones recibidas de la API. */
export function recalculateVersionsFromApi(versions = []) {
  return versions.map((version) => ({
    ...version,
    rows: recalculateRowsWithIndicator(
      version.rows,
      version.formula,
      version.indicador
    ),
  }));
}

/**
 * Calcula el indicador aplicando el multiplicador detectado en la fórmula / nombre.
 */
export function calculateIndicatorValue(
  numerador,
  denominador,
  formula,
  indicadorName = ""
) {
  const n = Number(numerador) || 0;
  const d = Number(denominador) || 0;

  if (d === 0) {
    return null;
  }

  return (n / d) * getMultiplier(formula, indicadorName);
}

/** Valor del indicador listo para Chart.js (misma escala que el valor almacenado). */
export function toChartIndicatorDisplayValue(value, _formula) {
  if (value == null || value === "") {
    return null;
  }

  const num = Number(value);

  if (!Number.isFinite(num)) {
    return null;
  }

  return Number(num.toFixed(3));
}
