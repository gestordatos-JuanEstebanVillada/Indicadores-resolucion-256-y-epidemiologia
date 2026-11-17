export const META_OPERADORES = [
  { value: ">=", label: "≥ Mayor o igual que" },
  { value: "<=", label: "≤ Menor o igual que" },
  { value: ">", label: "> Mayor que" },
  { value: "<", label: "< Menor que" },
  { value: "=", label: "= Igual a" },
];

const META_PARSE_RE =
  /^\s*(<=|>=|<|>|=)\s*([\d]+(?:[.,]\d+)?)\s*(%)?\s*$/i;

export function metaEsPorcentaje(metaStr) {
  return String(metaStr ?? "").trim().endsWith("%");
}

/** @returns {{ operador: string, valor: string, esPorcentaje: boolean }} */
export function deserializeMetaInstitucional(metaStr) {
  const raw = String(metaStr ?? "").trim();
  if (!raw) {
    return { operador: ">=", valor: "", esPorcentaje: false };
  }

  const match = raw.match(META_PARSE_RE);
  if (!match) {
    const legacyPct = raw.endsWith("%");
    const numMatch = raw.replace(/%/g, "").match(/([\d]+(?:[.,]\d+)?)/);
    return {
      operador: ">=",
      valor: numMatch ? numMatch[1].replace(",", ".") : "",
      esPorcentaje: legacyPct,
    };
  }

  const [, operador, numero, pctFlag] = match;
  return {
    operador: operador.toUpperCase() === "=" ? "=" : operador,
    valor: numero.replace(",", "."),
    esPorcentaje: Boolean(pctFlag) || raw.trim().endsWith("%"),
  };
}

export function serializeMetaInstitucional({ operador, valor, esPorcentaje }) {
  const op = (operador || ">=").trim();
  const num = String(valor ?? "").trim().replace(",", ".");
  if (!num) {
    return "";
  }
  const suffix = esPorcentaje ? "%" : "";
  return `${op}${num}${suffix}`;
}