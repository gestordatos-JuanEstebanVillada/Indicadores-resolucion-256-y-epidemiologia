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
  normalizeStoredRol,
  persistAuthSession,
} from "../utils/authRoles";

const AuthContext = createContext(null);

function readSessionFromStorage() {
  const token = localStorage.getItem("token");
  const rol = normalizeStoredRol(
    localStorage.getItem("user_rol") ||
      localStorage.getItem("role") ||
      localStorage.getItem("portal_role") ||
      ""
  );
  return {
    token,
    rol,
    username: localStorage.getItem("username") || "",
    nombres: localStorage.getItem("nombres") || "",
    id: localStorage.getItem("user_id")
      ? Number(localStorage.getItem("user_id"))
      : null,
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
      username: "",
      nombres: "",
      id: null,
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
