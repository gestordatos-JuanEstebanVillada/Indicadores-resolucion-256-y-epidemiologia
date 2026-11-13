import React from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { ready, authenticated } = useAuth();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f7f9] text-sm text-gray-600">
        Cargando sesión…
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}
