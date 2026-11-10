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

function hasCalidadRol(rol) {
  return (
    rol === ROLES.ADMIN ||
    rol === ROLES.RESOLUCION_256 ||
    rol === ROLES.EPIDEMIOLOGIA
  );
}

/** Ver menú y datos (lectura) de Resolución 256. */
export function canViewResolucion256(rolOverride) {
  const rol = rolOverride ?? getUserRol();
  return hasCalidadRol(rol);
}

/** Ver menú y datos (lectura) de Epidemiología / IAAS. */
export function canViewEpidemiologia(rolOverride) {
  const rol = rolOverride ?? getUserRol();
  return hasCalidadRol(rol);
}

/** Crear, editar o eliminar en Resolución 256. */
export function canMutateResolucion256(rolOverride) {
  const rol = rolOverride ?? getUserRol();
  return rol === ROLES.ADMIN || rol === ROLES.RESOLUCION_256;
}

/** Crear, editar o eliminar en Epidemiología / IAAS. */
export function canMutateEpidemiologia(rolOverride) {
  const rol = rolOverride ?? getUserRol();
  return rol === ROLES.ADMIN || rol === ROLES.EPIDEMIOLOGIA;
}

/** @deprecated Usar canViewResolucion256 */
export function canAccessResolucion256() {
  return canViewResolucion256();
}

/** @deprecated Usar canViewEpidemiologia */
export function canAccessEpidemiologia() {
  return canViewEpidemiologia();
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
