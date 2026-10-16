export function toggleRequierePlanInRows(rows, month) {
  return (rows || []).map((row) => {
    if (row.month !== month) {
      return row;
    }
    const current = (row.requiere_plan || "NO").toUpperCase();
    return {
      ...row,
      requiere_plan: current === "SI" ? "NO" : "SI",
    };
  });
}

export function buildVersionUpdatePayload(version, rows, modulo, normalizeObservatorio) {
  return {
    indicador: version.indicador,
    formula: version.formula,
    meta_institucional: version.meta_institucional,
    observatorio: normalizeObservatorio
      ? normalizeObservatorio(version.observatorio)
      : version.observatorio,
    modulo,
    rows,
  };
}
