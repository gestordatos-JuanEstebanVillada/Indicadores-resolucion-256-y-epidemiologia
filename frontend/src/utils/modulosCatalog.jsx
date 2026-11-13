import React from "react";
import * as LucideIcons from "lucide-react";

import { API_URL, apiFetch } from "../config/api";

export function resolveModuloId(modulo) {
  if (modulo == null) {
    return null;
  }
  const raw = modulo.id ?? modulo.ID;
  if (raw == null || raw === "") {
    return null;
  }
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

/** Clave para DELETE: prefiere ID numérico; si no, código del catálogo. */
export function resolveModuloDeleteKey(modulo) {
  const id = resolveModuloId(modulo);
  if (id != null) {
    return String(id);
  }
  const codigo = (modulo?.codigo || "").trim().toUpperCase().replace(/\s+/g, "_");
  return codigo || null;
}

export function normalizeModuloRecord(modulo) {
  const codigo = (modulo?.codigo || "").trim().toUpperCase().replace(/\s+/g, "_");
  const id = resolveModuloId(modulo);
  return {
    ...modulo,
    id,
    codigo,
    nombre: (modulo?.nombre || codigo || "Módulo").trim(),
    icono: (modulo?.icono || "Folder").trim(),
    estado: modulo?.estado,
  };
}

/** Lista de módulos desde GET /api/modulos (Oracle). */
export async function fetchModulosCatalog({ soloActivos = true } = {}) {
  try {
    const params = new URLSearchParams({
      solo_activos: soloActivos ? "true" : "false",
    });
    const response = await apiFetch(`${API_URL}/modulos?${params}`);
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map(normalizeModuloRecord).filter((m) => m.codigo);
  } catch {
    return [];
  }
}

export async function fetchModulosActivos() {
  return fetchModulosCatalog({ soloActivos: true });
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
