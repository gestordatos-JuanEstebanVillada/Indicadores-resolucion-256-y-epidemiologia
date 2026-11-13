import React from "react";
import * as LucideIcons from "lucide-react";

import { API_URL, apiFetch } from "../config/api";

export const MODULOS_CATALOG_FALLBACK = [
  { id: 1, codigo: "RESOLUCION_256", nombre: "Resolución 256", icono: "FileSpreadsheet" },
  { id: 2, codigo: "EPIDEMIOLOGIA", nombre: "Epidemiología / IAAS", icono: "Activity" },
];

export async function fetchModulosActivos() {
  try {
    const response = await apiFetch(`${API_URL}/modulos?solo_activos=true`);
    if (!response.ok) {
      return MODULOS_CATALOG_FALLBACK;
    }
    const data = await response.json();
    return Array.isArray(data) && data.length ? data : MODULOS_CATALOG_FALLBACK;
  } catch {
    return MODULOS_CATALOG_FALLBACK;
  }
}

function EmojiIcon({ symbol }) {
  return <span className="text-lg leading-none">{symbol}</span>;
}

export function resolveModuloIcon(iconName) {
  if (!iconName) {
    return LucideIcons.Folder;
  }
  const trimmed = iconName.trim();
  if (trimmed.length <= 4 && !/^[A-Za-z]+$/u.test(trimmed)) {
    return () => <EmojiIcon symbol={trimmed} />;
  }
  const Icon = LucideIcons[iconName];
  return Icon || LucideIcons.Folder;
}
