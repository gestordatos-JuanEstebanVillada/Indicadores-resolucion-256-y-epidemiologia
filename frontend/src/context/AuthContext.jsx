import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  clearAuthSession,
  getUserRoles,
  isDefinedUserId,
  normalizeStoredRol,
  persistAuthSession,
  purgeLegacyLocalAuthStorage,
} from "../utils/authRoles";

const AuthContext = createContext(null);

function readSessionFromStorage() {
  const token = sessionStorage.getItem("token");
  const rol = normalizeStoredRol(
    sessionStorage.getItem("user_rol") ||
      sessionStorage.getItem("role") ||
      sessionStorage.getItem("portal_role") ||
      ""
  );
  const rawUserId = sessionStorage.getItem("user_id");
  let id = null;
  if (rawUserId !== null && rawUserId !== "") {
    const parsed = Number(rawUserId);
    id = Number.isNaN(parsed) ? null : parsed;
  }

  return {
    token,
    rol,
    roles: getUserRoles(),
    username: sessionStorage.getItem("username") || "",
    nombres: sessionStorage.getItem("nombres") || "",
    id,
    hasUserId: isDefinedUserId(id),
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readSessionFromStorage());
  const [ready, setReady] = useState(false);

  const hydrate = useCallback(() => {
    setSession(readSessionFromStorage());
    setReady(true);
  }, []);

  useEffect(() => {
    purgeLegacyLocalAuthStorage();
    hydrate();
  }, [hydrate]);

  const applySession = useCallback((data) => {
    persistAuthSession(data);
    setSession(readSessionFromStorage());
    setReady(true);
  }, []);

  const clearSession = useCallback(() => {
    clearAuthSession();
    setSession({
      token: null,
      rol: "",
      roles: [],
      username: "",
      nombres: "",
      id: null,
      hasUserId: false,
    });
    setReady(true);
  }, []);

  const value = useMemo(
    () => ({
      ...session,
      ready,
      authenticated: Boolean(session.token),
      applySession,
      clearSession,
    }),
    [session, ready, applySession, clearSession]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
