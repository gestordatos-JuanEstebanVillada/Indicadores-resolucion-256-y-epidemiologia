import * as XLSX from "xlsx";
import {
  calculateIndicatorValue,
  getMultiplier,
} from "./formatIndicator";
import { MODULO_EPIDEMIOLOGIA, normalizeObservatorioForPayload } from "./moduleConstants";

export { getMultiplier };

/**
 * Parser para el formato tablero "INDICADORES IAAS" (Epidemiología).
 * Estructura: bloques de 12 filas (enero–diciembre) por indicador.
 * Metadatos (A/B/C) solo en la primera fila de cada bloque.
 */

export const INDICADORES_IAAS_SHEET = "INDICADORES IAAS";

/** Fila 6 en Excel → índice 5 (encabezados en filas 4 y 5). */
const DATA_START_ROW = 5;

const COL = {
  indicador: 0,      // A
  formula: 1,        // B
  meta: 2,           // C
  observatorio: 3,   // D — INDICADORES BOLETINES ANUALES DEL INS
  mes: 4,            // E
  numerador: 5,      // F
  denominador: 6,    // G
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

function isMonthLabel(value) {
  return monthNameToNumber(normalizeMonthName(value)) !== null;
}

function isLikelyIndicadorName(value) {
  const text = cleanCell(value);
  if (!text) {
    return false;
  }
  if (isMonthLabel(text)) {
    return false;
  }

  const normalized = normalizeText(text);
  const headerTokens = ["INDICADOR", "FORMULA", "META", "MES", "NUMERADOR", "DENOMINADOR"];
  if (headerTokens.some((token) => normalized === token || normalized.startsWith(`${token} `))) {
    return false;
  }

  return true;
}

function getLastMonthNumber(indicador) {
  if (!indicador?.datosMensuales?.length) {
    return null;
  }

  const lastEntry = indicador.datosMensuales[indicador.datosMensuales.length - 1];
  return monthNameToNumber(lastEntry.mes);
}

function hasMonthData(row) {
  const mesRaw = cleanCell(row[COL.mes]);
  if (!mesRaw) {
    return false;
  }

  return monthNameToNumber(normalizeMonthName(mesRaw)) !== null;
}

/**
 * Lee todas las filas de la hoja, incluso si !ref no cubre el rango completo.
 * @param {import("xlsx").WorkSheet} worksheet
 */
function getWorksheetRows(worksheet) {
  let maxRow = 0;
  let maxCol = 0;

  Object.keys(worksheet).forEach((key) => {
    if (key.startsWith("!")) {
      return;
    }

    const cell = XLSX.utils.decode_cell(key);
    maxRow = Math.max(maxRow, cell.r);
    maxCol = Math.max(maxCol, cell.c);
  });

  if (worksheet["!ref"]) {
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    maxRow = Math.max(maxRow, range.e.r);
    maxCol = Math.max(maxCol, range.e.c);
  }

  const rows = Array.from({ length: maxRow + 1 }, () => []);

  Object.keys(worksheet).forEach((key) => {
    if (key.startsWith("!")) {
      return;
    }

    const cell = XLSX.utils.decode_cell(key);
    const value = worksheet[key]?.v ?? null;
    if (!rows[cell.r]) {
      rows[cell.r] = [];
    }
    rows[cell.r][cell.c] = value;
  });

  return rows;
}

function createIndicadorFromRow(row, fallbackName = "") {
  return {
    nombre: cleanCell(row[COL.indicador]) || fallbackName,
    formula: cleanCell(row[COL.formula]),
    meta: cleanCell(row[COL.meta]),
    observatorio: formatObservatorioCell(row[COL.observatorio]),
    datosMensuales: [],
  };
}

function mergeIndicadorMetadata(current, row) {
  if (!current) {
    return current;
  }

  const formula = cleanCell(row[COL.formula]);
  const meta = cleanCell(row[COL.meta]);
  const observatorio = formatObservatorioCell(row[COL.observatorio]);

  if (!current.formula && formula) {
    current.formula = formula;
  }

  if (!current.meta && meta) {
    current.meta = meta;
  }

  if (!current.observatorio && observatorio) {
    current.observatorio = observatorio;
  }

  return current;
}

function appendMonthData(current, row) {
  const mesRaw = cleanCell(row[COL.mes]);
  if (!mesRaw) {
    return current;
  }

  const monthName = normalizeMonthName(mesRaw);
  const monthNumber = monthNameToNumber(monthName);
  if (!monthNumber) {
    return current;
  }

  const entry = {
    mes: monthName,
    numerador: parseNumeric(row[COL.numerador]),
    denominador: parseNumeric(row[COL.denominador]),
  };

  const existingIndex = current.datosMensuales.findIndex(
    (dato) => monthNameToNumber(normalizeMonthName(dato.mes)) === monthNumber
  );

  if (existingIndex >= 0) {
    current.datosMensuales[existingIndex] = entry;
  } else {
    current.datosMensuales.push(entry);
  }

  return current;
}

function shouldStartNewIndicador(row, current) {
  const nombreIndicador = cleanCell(row[COL.indicador]);
  const monthNumber = monthNameToNumber(normalizeMonthName(cleanCell(row[COL.mes])));

  if (
    nombreIndicador &&
    isLikelyIndicadorName(nombreIndicador) &&
    (!current || normalizeText(nombreIndicador) !== normalizeText(current.nombre))
  ) {
    return true;
  }

  if (!current || !monthNumber) {
    return false;
  }

  if (monthNumber !== 1 || !current.datosMensuales.length) {
    return false;
  }

  const lastMonth = getLastMonthNumber(current);
  return lastMonth === 12 || current.datosMensuales.length >= 12;
}

/**
 * @param {import("xlsx").WorkSheet} worksheet
 */
export function parseIaasWorksheet(worksheet) {
  if (!worksheet) {
    throw new Error("La hoja de cálculo está vacía o no existe.");
  }

  const rows = getWorksheetRows(worksheet);

  if (!rows.length || rows.length <= DATA_START_ROW) {
    throw new Error(
      "El archivo no contiene datos. Verifique que la hoja tenga filas a partir de la fila 6."
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
    const rowHasMonth = hasMonthData(row);

    if (!rowHasMonth && !nombreIndicador) {
      continue;
    }

    if (shouldStartNewIndicador(row, current)) {
      pushCurrent();
      current = createIndicadorFromRow(row);
    } else if (!current && (nombreIndicador || rowHasMonth)) {
      current = createIndicadorFromRow(row);
    } else if (
      nombreIndicador &&
      current &&
      normalizeText(nombreIndicador) === normalizeText(current.nombre)
    ) {
      current = mergeIndicadorMetadata(current, row);
    } else if (nombreIndicador && isLikelyIndicadorName(nombreIndicador)) {
      current = mergeIndicadorMetadata(current, row);
    }

    if (!current) {
      continue;
    }

    if (rowHasMonth) {
      current = appendMonthData(current, row);
    }
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
export function parseIaasWorkbook(workbook, options = {}) {
  if (!workbook?.SheetNames?.length) {
    throw new Error("El archivo Excel no contiene hojas.");
  }

  const sheetName =
    options.sheetName ??
    (workbook.SheetNames.includes(INDICADORES_IAAS_SHEET)
      ? INDICADORES_IAAS_SHEET
      : null);

  if (!sheetName) {
    throw new Error(
      `No se encontró la hoja "${INDICADORES_IAAS_SHEET}". Hojas disponibles: ${workbook.SheetNames.join(", ")}`
    );
  }

  const worksheet = workbook.Sheets[sheetName];
  const indicadores = parseIaasWorksheet(worksheet);

  return {
    sheetName,
    indicadores,
  };
}

export function isIaasWorkbook(workbook) {
  return Boolean(workbook?.SheetNames?.includes(INDICADORES_IAAS_SHEET));
}

/**
 * Convierte un indicador parseado al payload de POST /api/iaas.
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
    modulo: MODULO_EPIDEMIOLOGIA,
    year,
    rows,
  };
}
