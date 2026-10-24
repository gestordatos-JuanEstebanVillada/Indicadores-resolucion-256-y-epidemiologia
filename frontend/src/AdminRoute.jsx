import React from "react";
import { Navigate } from "react-router-dom";

import { canAccessAdmin } from "./utils/authRoles";

export default function AdminRoute({ children }) {
  if (!canAccessAdmin()) {
    return <Navigate to="/app" replace />;
  }
  return children;
}
