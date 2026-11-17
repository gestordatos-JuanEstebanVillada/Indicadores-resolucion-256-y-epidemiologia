/** Claves de sesión (sessionStorage; se borran al cerrar la pestaña). */
export const AUTH_SESSION_KEYS = [
  "token",
  "user_rol",
  "role",
  "user_roles",
  "user_id",
  "username",
  "nombres",
  "user_modulos",
  "nombre_rol",
  "jerarquia",
  "es_admin_global",
  "permite_edicion",
  "modulos_solo_lectura",
  "modulos_edicion",
  "portal_role",
];

/** Elimina tokens y datos de auth persistentes en localStorage (migración Docker). */
export function purgeLegacyLocalAuthStorage() {
  for (const key of AUTH_SESSION_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

function sessionGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function sessionSet(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

function sessionRemove(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Códigos de módulo (catálogo), no confundir con ROL en BD */
export const ROLES = {
  ADMIN: "ADMIN",
  RESOLUCION_256: "RESOLUCION_256",
  EPIDEMIOLOGIA: "EPIDEMIOLOGIA",
};

export const SISTEMA_ROL_LABELS = {
  ADMINISTRADOR_GLOBAL: "Administrador global",
  ADMINISTRADOR_AREA: "Administrador de área",
  USUARIO: "Usuario",
  ADMINISTRADOR: "Administrador global",
};

/** Compatibilidad con tokens antiguos */
export function normalizeStoredRol(rol) {
  const value = (rol || "").toUpperCase();
  if (value === "CALIDAD") {
    return ROLES.RESOLUCION_256;
  }
  if (value === "ADMIN") {
    return "ADMINISTRADOR";
  }
  return value;
}

function flagFromStorage(key) {
  const raw = sessionGet(key);
  if (raw === null || raw === "") {
    return false;
  }
  return raw === "1" || raw === "true" || raw === "TRUE";
}

function readJsonList(key) {
  try {
    const raw = sessionGet(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((m) => (m || "").toUpperCase())
      : [];
  } catch {
    return [];
  }
}

export function getJerarquia() {
  return (
    sessionGet("jerarquia") ||
    sessionGet("nombre_rol") ||
    normalizeStoredRol(
      sessionGet("user_rol") ||
        sessionGet("portal_role") ||
        sessionGet("role") ||
        ""
    )
  );
}

export function getNombreRol() {
  return getJerarquia();
}

export function getUserRol() {
  return getJerarquia();
}

export function esAdminGlobal() {
  if (flagFromStorage("es_admin_global")) {
    return true;
  }
  return getJerarquia() === "ADMINISTRADOR_GLOBAL";
}

export function esAdministradorArea() {
  if (esAdminGlobal()) {
    return false;
  }
  return getJerarquia() === "ADMINISTRADOR_AREA";
}

export function getModulosSoloLectura() {
  return readJsonList("modulos_solo_lectura");
}

export function getModulosEdicion() {
  return readJsonList("modulos_edicion");
}

export function moduloEsSoloLectura(codigo) {
  if (esAdminGlobal()) {
    return false;
  }
  const modulo = (codigo || "").toUpperCase();
  return getModulosSoloLectura().includes(modulo);
}

export function permiteEdicion() {
  if (esAdminGlobal()) {
    return true;
  }
  return getModulosEdicion().length > 0;
}

export function getUserModulos() {
  const modulos = readJsonList("user_modulos");
  if (modulos.length) {
    return modulos;
  }
  const lectura = getModulosSoloLectura();
  const edicion = getModulosEdicion();
  return [...new Set([...lectura, ...edicion])];
}

export function getUserRoles() {
  const modulos = getUserModulos();
  const nombre = getNombreRol();
  if (esAdminGlobal()) {
    return nombre ? [nombre, ...modulos] : modulos;
  }
  return modulos.length ? modulos : nombre ? [nombre] : [];
}

export function canAccessAdmin() {
  return esAdminGlobal();
}

export function canAccessGestionAccesos() {
  return esAdminGlobal() || esAdministradorArea();
}

export function canAccessAuditoria() {
  return canAccessGestionAccesos();
}

export function canAccessGestionModulos() {
  return esAdminGlobal();
}

export function canViewModulo(codigo) {
  const modulo = (codigo || "").toUpperCase();
  if (esAdminGlobal()) {
    return true;
  }
  return getUserModulos().includes(modulo);
}

export function canMutateModulo(codigo) {
  if (!canViewModulo(codigo)) {
    return false;
  }
  return !moduloEsSoloLectura(codigo);
}

export function canViewResolucion256() {
  return canViewModulo(ROLES.RESOLUCION_256);
}

export function canViewEpidemiologia() {
  return canViewModulo(ROLES.EPIDEMIOLOGIA);
}

export function canMutateResolucion256() {
  return canMutateModulo(ROLES.RESOLUCION_256);
}

export function canMutateEpidemiologia() {
  return canMutateModulo(ROLES.EPIDEMIOLOGIA);
}

/** ID 0 es válido; evita comprobaciones truthy sobre el identificador. */
export function isDefinedUserId(id) {
  return id !== undefined && id !== null;
}

export function persistAuthSession(data) {
  purgeLegacyLocalAuthStorage();

  if (data?.token) {
    sessionSet("token", data.token);
  }

  let jerarquia = normalizeStoredRol(
    data.jerarquia || data.nombre_rol || data.rol || data.role || ""
  );
  if (jerarquia === "ADMINISTRADOR" || jerarquia === "ADMIN") {
    jerarquia = "ADMINISTRADOR_GLOBAL";
  }
  sessionSet("jerarquia", jerarquia);
  sessionSet("nombre_rol", jerarquia);
  sessionSet("user_rol", jerarquia);
  sessionSet("role", jerarquia);
  if (data.portal_role) {
    sessionSet("portal_role", String(data.portal_role));
  }

  const esAdmin =
    Number(data.es_admin_global) === 1 ||
    jerarquia === "ADMINISTRADOR_GLOBAL";
  sessionSet("es_admin_global", esAdmin ? "1" : "0");

  const modulos = Array.isArray(data.modulos)
    ? data.modulos.map((m) => (m || "").toUpperCase())
    : [];
  const soloLectura = Array.isArray(data.modulos_solo_lectura)
    ? data.modulos_solo_lectura.map((m) => (m || "").toUpperCase())
    : [];
  const edicion = Array.isArray(data.modulos_edicion)
    ? data.modulos_edicion.map((m) => (m || "").toUpperCase())
    : modulos.filter((m) => !soloLectura.includes(m));

  sessionSet("user_modulos", JSON.stringify(modulos));
  sessionSet("modulos_solo_lectura", JSON.stringify(soloLectura));
  sessionSet("modulos_edicion", JSON.stringify(edicion));

  const permite = esAdmin || edicion.length > 0;
  sessionSet("permite_edicion", permite ? "1" : "0");

  const rolesSesion =
    modulos.length > 0 ? modulos : jerarquia ? [jerarquia] : [];
  sessionSet("user_roles", JSON.stringify(rolesSesion));

  if (isDefinedUserId(data.id)) {
    sessionSet("user_id", String(data.id));
  }
  if (data.username) {
    sessionSet("username", data.username);
  }
  if (data.nombres) {
    sessionSet("nombres", data.nombres);
  }
}

export function clearAuthSession() {
  for (const key of AUTH_SESSION_KEYS) {
    sessionRemove(key);
  }
  purgeLegacyLocalAuthStorage();
}

/** Token JWT de la pestaña actual (sessionStorage). */
export function getAuthToken() {
  return sessionGet("token");
}

export const ROL_LABELS = {
  ...SISTEMA_ROL_LABELS,
  ADMIN: "Administrador",
  RESOLUCION_256: "Resolución 256",
  EPIDEMIOLOGIA: "Epidemiología",
};
