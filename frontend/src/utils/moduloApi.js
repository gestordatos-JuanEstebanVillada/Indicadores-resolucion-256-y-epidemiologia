import { API_URL } from "../config/api";
import {
  MODULO_EPIDEMIOLOGIA,
  MODULO_RESOLUCION_256,
} from "./moduleConstants";

export function normalizeModuloCodigo(value) {
  return (value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

export function moduloApiBase(moduloCodigo) {
  const codigo = normalizeModuloCodigo(moduloCodigo);
  return `${API_URL}/modulos/${encodeURIComponent(codigo)}`;
}

export function urlModuloIndicadores(moduloCodigo) {
  return `${moduloApiBase(moduloCodigo)}/indicadores`;
}

export function urlModuloCalidad(moduloCodigo) {
  return `${moduloApiBase(moduloCodigo)}/calidad`;
}

export function legacyModuloCodigoFromPath(moduloCodigo) {
  const codigo = normalizeModuloCodigo(moduloCodigo);
  if (!codigo) {
    return MODULO_RESOLUCION_256;
  }
  return codigo;
}

export const LEGACY_ROUTE_ALIASES = {
  resolucion256: MODULO_RESOLUCION_256,
  infecciones: MODULO_EPIDEMIOLOGIA,
};
