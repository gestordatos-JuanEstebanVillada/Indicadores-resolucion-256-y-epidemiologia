import React from "react";
import { Navigate } from "react-router-dom";

import { canAccessGestionAccesos } from "../../utils/authRoles";

export default function GestionAdminRoute({ children }) {
  if (!canAccessGestionAccesos()) {
    return <Navigate to="/app" replace />;
  }
  return children;
}
