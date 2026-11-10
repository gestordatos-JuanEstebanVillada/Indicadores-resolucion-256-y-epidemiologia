/** Origen del backend (sin /api). Vacío en Docker → rutas relativas vía nginx. */
const rawOrigin = import.meta.env.VITE_API_ORIGIN;
export const API_ORIGIN =
  rawOrigin === undefined || rawOrigin === ""
    ? ""
    : String(rawOrigin).replace(/\/$/, "");

/** Base URL de la API REST (incluye /api). */
export const API_URL = API_ORIGIN ? `${API_ORIGIN}/api` : "/api";

/** Fetch con JSON y token JWT si existe en localStorage. */
export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/** Mensaje legible desde un Response !ok (FastAPI detail, etc.). */
export async function readApiErrorMessage(
  response,
  fallback = "Error en la solicitud"
) {
  try {
    const data = await response.json();
    const detail = data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail
        .map((item) => item?.msg || JSON.stringify(item))
        .join("; ");
    }
    return fallback;
  } catch {
    return `${fallback} (HTTP ${response.status})`;
  }
}

/** La API de indicadores devuelve un array en la raíz del JSON. */
export function ensureApiArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }
  return [];
}
