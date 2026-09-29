import * as XLSX from "xlsx";
import { calculateIndicatorValue } from "./formatIndicator";
import { MODULO_RESOLUCION_256, normalizeObservatorioForPayload } from "./moduleConstants";

/**
 * Parser para el formato tablero "INDICADORES 256".
 * Estructura: bloques de 12 filas (enero–diciembre) por indicador.
 * Metadatos (A/B/C) solo en la primera fila de cada bloque.
 */

export const INDICADORES_256_SHEET = "INDICADORES 256";

/** Fila 7 en Excel → índice 6 (se ignoran filas 1–6). */
const DATA_START_ROW = 6;

const COL = {
  indicador: 0,     // A
  formula: 1,       // B
  meta: 2,          // C
  observatorio: 3,  // D
  mes: 4,           // E
  numerador: 5,     // F
  denominador: 6,   // G
};

const MONTH_NAMES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

export function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function cleanCell(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number" && Number.isNaN(value)) {
    return "";
  }
  return String(value).trim();
}

/** Preserva valores numéricos del Excel (ej. 9.24 → "9,24"). */
export function formatObservatorioCell(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? String(value).replace(".", ",")
      : "";
  }
  return String(value).trim();
}

export function parseNumeric(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = Number(String(value).replace(/,/g, ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeMonthName(value) {
  const normalized = normalizeText(value);
  const match = MONTH_NAMES.find((name) => normalizeText(name) === normalized);
  return match ?? normalized;
}

export function monthNameToNumber(monthName) {
  const normalized = normalizeText(monthName);
  const index = MONTH_NAMES.findIndex((name) => normalizeText(name) === normalized);
  return index >= 0 ? index + 1 : null;
}

export function extractYearFromFilename(filename) {
  const match = String(filename ?? "").match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

/**
 * @param {import("xlsx").WorkSheet} worksheet
 * @returns {Array<{ nombre: string, formula: string, meta: string, observatorio: string, datosMensuales: Array<{ mes: string, numerador: number, denominador: number }> }>}
 */
export function parseIndicadores256Worksheet(worksheet) {
  if (!worksheet) {
    throw new Error("La hoja de cálculo está vacía o no existe.");
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  if (!rows.length || rows.length <= DATA_START_ROW) {
    throw new Error(
      "El archivo no contiene datos. Verifique que la hoja tenga filas a partir de la fila 7."
    );
  }

  const indicadores = [];
  let current = null;

  const pushCurrent = () => {
    if (!current) {
      return;
    }
    if (current.nombre || current.datosMensuales.length > 0) {
      indicadores.push(current);
    }
  };

  for (let rowIndex = DATA_START_ROW; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const nombreIndicador = cleanCell(row[COL.indicador]);

    if (nombreIndicador) {
      pushCurrent();
      current = {
        nombre: nombreIndicador,
        formula: cleanCell(row[COL.formula]),
        meta: cleanCell(row[COL.meta]),
        observatorio: formatObservatorioCell(row[COL.observatorio]),
        datosMensuales: [],
      };
    }

    if (!current) {
      continue;
    }

    if (!current.observatorio) {
      const observatorioValue = formatObservatorioCell(row[COL.observatorio]);
      if (observatorioValue) {
        current.observatorio = observatorioValue;
      }
    }

    const mesRaw = cleanCell(row[COL.mes]);
    if (!mesRaw) {
      continue;
    }

    current.datosMensuales.push({
      mes: normalizeMonthName(mesRaw),
      numerador: parseNumeric(row[COL.numerador]),
      denominador: parseNumeric(row[COL.denominador]),
    });
  }

  pushCurrent();

  if (!indicadores.length) {
    throw new Error(
      "No se encontraron indicadores en la hoja. Revise que la columna A tenga nombres en la fila inicial de cada bloque."
    );
  }

  return indicadores;
}

/**
 * @param {import("xlsx").WorkBook} workbook
 * @param {{ sheetName?: string }} [options]
 */
export function parseIndicadores256Workbook(workbook, options = {}) {
  if (!workbook?.SheetNames?.length) {
    throw new Error("El archivo Excel no contiene hojas.");
  }

  const sheetName =
    options.sheetName ??
    (workbook.SheetNames.includes(INDICADORES_256_SHEET)
      ? INDICADORES_256_SHEET
      : null);

  if (!sheetName) {
    throw new Error(
      `No se encontró la hoja "${INDICADORES_256_SHEET}". Hojas disponibles: ${workbook.SheetNames.join(", ")}`
    );
  }

  const worksheet = workbook.Sheets[sheetName];
  const indicadores = parseIndicadores256Worksheet(worksheet);

  return {
    sheetName,
    indicadores,
  };
}

export function isIndicadores256Workbook(workbook) {
  return Boolean(workbook?.SheetNames?.includes(INDICADORES_256_SHEET));
}

/**
 * Convierte un indicador parseado al payload de POST /api/calidad.
 */
export function indicadorToApiPayload(indicador, { year, observatorio }) {
  const rows = indicador.datosMensuales
    .map((dato) => {
      const month = monthNameToNumber(dato.mes);
      if (!month) {
        return null;
      }
      return {
        month,
        numerador: dato.numerador,
        denominador: dato.denominador,
        indicador_valor: calculateIndicatorValue(
          dato.numerador,
          dato.denominador,
          indicador.formula,
          indicador.nombre
        ),
      };
    })
    .filter(Boolean);

  return {
    indicador: indicador.nombre,
    formula: indicador.formula,
    meta_institucional: indicador.meta,
    observatorio: normalizeObservatorioForPayload(
      indicador.observatorio ?? observatorio
    ),
    modulo: MODULO_RESOLUCION_256,
    year,
    rows,
  };
}
