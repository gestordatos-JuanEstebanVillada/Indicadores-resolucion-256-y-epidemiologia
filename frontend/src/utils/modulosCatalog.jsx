import React from "react";
import * as LucideIcons from "lucide-react";

import { API_URL, apiFetch } from "../config/api";

export const MODULOS_CATALOG_FALLBACK = [
  { id: 1, codigo: "RESOLUCION_256", nombre: "Resolución 256", icono: "FileSpreadsheet" },
  { id: 2, codigo: "EPIDEMIOLOGIA", nombre: "Epidemiología / IAAS", icono: "Activity" },
];

export function normalizeModuloRecord(modulo) {
  const codigo = (modulo?.codigo || "").trim().toUpperCase().replace(/\s+/g, "_");
  return {
    ...modulo,
    id: modulo?.id,
    codigo,
    nombre: (modulo?.nombre || codigo || "Módulo").trim(),
    icono: (modulo?.icono || "Folder").trim(),
    estado: modulo?.estado,
  };
}

export async function fetchModulosActivos() {
  try {
    const response = await apiFetch(`${API_URL}/modulos?solo_activos=true`);
    if (!response.ok) {
      return MODULOS_CATALOG_FALLBACK.map(normalizeModuloRecord);
    }
    const data = await response.json();
    const list = Array.isArray(data) && data.length ? data : MODULOS_CATALOG_FALLBACK;
    return list.map(normalizeModuloRecord).filter((m) => m.codigo);
  } catch {
    return MODULOS_CATALOG_FALLBACK.map(normalizeModuloRecord);
  }
}

function EmojiIcon({ symbol }) {
  return <span className="text-lg leading-none">{symbol}</span>;
}

export function resolveModuloIcon(iconName) {
  const fallback = LucideIcons.Folder || LucideIcons.LayoutGrid;
  if (!iconName) {
    return fallback;
  }
  const trimmed = String(iconName).trim();
  if (!trimmed) {
    return fallback;
  }
  if (trimmed.length <= 4 && !/^[A-Za-z]+$/u.test(trimmed)) {
    return () => <EmojiIcon symbol={trimmed} />;
  }
  const Icon = LucideIcons[trimmed] || LucideIcons[iconName];
  return Icon || fallback;
}
