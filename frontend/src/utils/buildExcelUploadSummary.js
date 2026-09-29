import { normalizeText } from "./parseIndicadores256Excel";

const ALL_MONTHS = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

function analyzeIndicador(indicador, index) {
  const mesesOk = indicador.datosMensuales.map((d) => d.mes);
  const mesesSet = new Set(mesesOk.map((m) => normalizeText(m)));
  const mesesFaltantes = ALL_MONTHS.filter(
    (m) => !mesesSet.has(normalizeText(m))
  );

  const issues = [];

  if (!indicador.nombre?.trim()) {
    issues.push("Sin nombre de indicador");
  }

  if (!indicador.datosMensuales.length) {
    issues.push("Sin datos mensuales");
  }

  if (mesesFaltantes.length > 0) {
    issues.push(
      `Faltan ${mesesFaltantes.length} mes(es): ${mesesFaltantes.join(", ")}`
    );
  }

  const duplicados = mesesOk.filter(
    (mes, i, arr) =>
      arr.findIndex((m) => normalizeText(m) === normalizeText(mes)) !== i
  );

  if (duplicados.length > 0) {
    issues.push("Hay meses duplicados en el archivo");
  }

  let status = "ok";

  if (
    !indicador.nombre?.trim() ||
    !indicador.datosMensuales.length
  ) {
    status = "error";
  } else if (mesesFaltantes.length > 0 || duplicados.length > 0) {
    status = "warning";
  }

  return {
    index: index + 1,
    nombre: indicador.nombre || "(Sin nombre)",
    formula: indicador.formula || "—",
    meta: indicador.meta || "—",
    mesesCargados: indicador.datosMensuales.length,
    mesesOk,
    mesesFaltantes,
    issues,
    status,
    canUpload: status !== "error",
    raw: indicador,
  };
}

export function buildTableroUploadSummary({
  fileName,
  extractedYear,
  indicadores,
  sheetName,
}) {
  const items = indicadores.map(analyzeIndicador);

  const totalMeses = items.reduce(
    (sum, item) => sum + item.mesesCargados,
    0
  );

  const mesesFaltantesTotal = items.reduce(
    (sum, item) => sum + item.mesesFaltantes.length,
    0
  );

  return {
    fileName,
    format: "tablero",
    sheetName,
    year: extractedYear,
    items,
    totals: {
      indicadores: items.length,
      listos: items.filter((i) => i.status === "ok").length,
      conAdvertencias: items.filter((i) => i.status === "warning").length,
      conErrores: items.filter((i) => i.status === "error").length,
      mesesCargados: totalMeses,
      mesesFaltantes: mesesFaltantesTotal,
    },
    canConfirm: items.some((i) => i.canUpload),
  };
}

export function buildPlantillaUploadSummary({
  fileName,
  extractedYear,
  plantilla,
  totalRows,
  rowsIgnored,
}) {
  const mesesConDatos = plantilla.rows.filter(
    (row) =>
      Number(row.numerador) > 0 || Number(row.denominador) > 0
  ).length;

  const mesesSet = new Set(
    plantilla.rows
      .filter(
        (row) =>
          Number(row.numerador) > 0 || Number(row.denominador) > 0
      )
      .map((row) => ALL_MONTHS[row.month - 1])
  );

  const mesesFaltantes = ALL_MONTHS.filter((m) => !mesesSet.has(m));

  const issues = [];

  if (!plantilla.indicador?.trim()) {
    issues.push("Sin nombre de indicador en el archivo");
  }

  if (rowsIgnored > 0) {
    issues.push(
      `${rowsIgnored} fila(s) ignorada(s) por mes inválido o vacío`
    );
  }

  if (mesesFaltantes.length > 0) {
    issues.push(
      `${mesesFaltantes.length} mes(es) sin datos numéricos`
    );
  }

  let status = "ok";

  if (!plantilla.indicador?.trim()) {
    status = "error";
  } else if (rowsIgnored > 0 || mesesFaltantes.length > 0) {
    status = "warning";
  }

  return {
    fileName,
    format: "plantilla",
    year: plantilla.year ?? extractedYear,
    items: [
      {
        index: 1,
        nombre: plantilla.indicador || "(Sin nombre)",
        formula: plantilla.formula || "—",
        meta: plantilla.meta || "—",
        mesesCargados: mesesConDatos,
        mesesOk: [...mesesSet],
        mesesFaltantes,
        issues,
        status,
        canUpload: status !== "error",
      },
    ],
    totals: {
      indicadores: 1,
      listos: status === "ok" ? 1 : 0,
      conAdvertencias: status === "warning" ? 1 : 0,
      conErrores: status === "error" ? 1 : 0,
      mesesCargados: mesesConDatos,
      mesesFaltantes: mesesFaltantes.length,
      filasProcesadas: totalRows,
      filasIgnoradas: rowsIgnored,
    },
    canConfirm: status !== "error",
    plantilla,
  };
}
