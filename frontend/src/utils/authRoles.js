export const ROLES = {
  ADMIN: "ADMIN",
  RESOLUCION_256: "RESOLUCION_256",
  EPIDEMIOLOGIA: "EPIDEMIOLOGIA",
};

/** Compatibilidad con tokens antiguos */
export function normalizeStoredRol(rol) {
  const value = (rol || "").toUpperCase();
  if (value === "CALIDAD") {
    return ROLES.RESOLUCION_256;
  }
  return value;
}

export function getUserRol() {
  return normalizeStoredRol(
    localStorage.getItem("user_rol") ||
      localStorage.getItem("portal_role") ||
      localStorage.getItem("role") ||
      ""
  );
}

export function canAccessResolucion256() {
  const rol = getUserRol();
  return rol === ROLES.ADMIN || rol === ROLES.RESOLUCION_256;
}

export function canAccessEpidemiologia() {
  const rol = getUserRol();
  return rol === ROLES.ADMIN || rol === ROLES.EPIDEMIOLOGIA;
}

export function canAccessAdmin() {
  return getUserRol() === ROLES.ADMIN;
}

export function persistAuthSession(data) {
  if (data.token) {
    localStorage.setItem("token", data.token);
  }
  const rol = normalizeStoredRol(data.rol || data.role || data.portal_role || "");
  localStorage.setItem("user_rol", rol);
  localStorage.setItem("role", rol);
  if (data.id != null) {
    localStorage.setItem("user_id", String(data.id));
  }
  if (data.username) {
    localStorage.setItem("username", data.username);
  }
  if (data.nombres) {
    localStorage.setItem("nombres", data.nombres);
  }
}

export function clearAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user_rol");
  localStorage.removeItem("role");
  localStorage.removeItem("user_id");
  localStorage.removeItem("username");
  localStorage.removeItem("nombres");
}

export const ROL_LABELS = {
  ADMIN: "Administrador",
  RESOLUCION_256: "Resolución 256",
  EPIDEMIOLOGIA: "Epidemiología",
};
