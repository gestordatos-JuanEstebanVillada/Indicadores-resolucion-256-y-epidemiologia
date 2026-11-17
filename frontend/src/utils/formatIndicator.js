import { metaEsPorcentaje } from "./metaInstitucional";

/**
 * Multiplicador legado (sin meta institucional en el string).
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

export function formulaExigeMultiplicadorCien(formula) {
  if (!formula) {
    return false;
  }
  const text = String(formula)
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/\s+/g, "");
  return /(x|\*)100/.test(text) || text.includes("%");
}

function formatIndicatorNumber(num) {
  return Number(num).toFixed(3);
}

function shouldAppendPercentSuffixLegacy(indicadorName) {
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
 * Calcula el indicador según meta institucional y fórmula.
 */
export function calculateIndicatorValue(
  numerador,
  denominador,
  formula,
  indicadorName = "",
  metaInstitucional = ""
) {
  const n = Number(numerador) || 0;
  const d = Number(denominador) || 0;

  if (d === 0) {
    return null;
  }

  const ratio = n / d;
  const meta = String(metaInstitucional ?? "").trim();

  if (meta) {
    if (metaEsPorcentaje(meta)) {
      return ratio * 100;
    }
    if (formulaExigeMultiplicadorCien(formula)) {
      return ratio * 100;
    }
    return ratio;
  }

  return ratio * getMultiplier(formula, indicadorName);
}

export function formatIndicatorDisplay(
  value,
  metaInstitucional = "",
  formula = "",
  indicadorName = ""
) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const num = Number(value);

  if (!Number.isFinite(num)) {
    return "—";
  }

  let formatted = formatIndicatorNumber(num);
  const meta = String(metaInstitucional ?? "").trim();

  if (meta) {
    if (metaEsPorcentaje(meta)) {
      formatted += "%";
    }
    return formatted;
  }

  if (shouldAppendPercentSuffixLegacy(indicadorName)) {
    formatted += "%";
  }

  return formatted;
}

export function resolveIndicatorValue(
  row,
  formula,
  indicadorName = "",
  metaInstitucional = ""
) {
  const denominador = Number(row?.denominador) || 0;

  if (denominador > 0) {
    return calculateIndicatorValue(
      row?.numerador,
      denominador,
      formula,
      indicadorName,
      metaInstitucional
    );
  }

  const stored = row?.indicador_valor;

  if (stored === null || stored === undefined || stored === "") {
    return null;
  }

  const num = Number(stored);

  return Number.isFinite(num) ? num : null;
}

export function formatIndicatorRowDisplay(
  row,
  formula,
  indicadorName = "",
  metaInstitucional = ""
) {
  return formatIndicatorDisplay(
    resolveIndicatorValue(row, formula, indicadorName, metaInstitucional),
    metaInstitucional,
    formula,
    indicadorName
  );
}

export function recalculateRowsWithIndicator(
  rows,
  formula,
  indicadorName = "",
  metaInstitucional = ""
) {
  return (rows || []).map((row) => {
    const num = Number(row.numerador) || 0;
    const den = Number(row.denominador) || 0;

    return {
      ...row,
      indicador_valor: calculateIndicatorValue(
        num,
        den,
        formula,
        indicadorName,
        metaInstitucional
      ),
    };
  });
}

function normalizeRequierePlanFlag(value) {
  return (value || "NO").toUpperCase() === "SI" ? "SI" : "NO";
}

export function recalculateVersionIndicatorRows(version, emptyRows = []) {
  const formula = version?.formula ?? "";
  const indicadorName = version?.indicador ?? "";
  const metaInstitucional = version?.meta_institucional ?? "";
  const sourceRows = version?.rows?.length ? version.rows : emptyRows;
  const normalizedRows = sourceRows.map((row, index) => ({
    ...(emptyRows[index] || { requiere_plan: "NO" }),
    ...row,
    requiere_plan: normalizeRequierePlanFlag(row.requiere_plan),
  }));

  return recalculateRowsWithIndicator(
    normalizedRows,
    formula,
    indicadorName,
    metaInstitucional
  );
}

export function recalculateVersionsFromApi(versions = []) {
  return versions.map((version) => ({
    ...version,
    rows: recalculateRowsWithIndicator(
      version.rows,
      version.formula,
      version.indicador,
      version.meta_institucional
    ),
  }));
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