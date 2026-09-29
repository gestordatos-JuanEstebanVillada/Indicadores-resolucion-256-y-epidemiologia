/** Origen del backend (sin /api). Configurable con VITE_API_ORIGIN en build o .env local. */
export const API_ORIGIN = (
  import.meta.env.VITE_API_ORIGIN || "http://127.0.0.1:8007"
).replace(/\/$/, "");

/** Base URL de la API REST (incluye /api). */
export const API_URL = `${API_ORIGIN}/api`;
