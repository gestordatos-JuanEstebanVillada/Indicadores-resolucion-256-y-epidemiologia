import React from "react";
import { Navigate } from "react-router-dom";

import { canAccessGestionModulos } from "../../utils/authRoles";

export default function GlobalAdminRoute({ children }) {
  if (!canAccessGestionModulos()) {
    return <Navigate to="/app" replace />;
  }
  return children;
}
