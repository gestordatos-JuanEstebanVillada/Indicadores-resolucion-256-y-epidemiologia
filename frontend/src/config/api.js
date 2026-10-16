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
