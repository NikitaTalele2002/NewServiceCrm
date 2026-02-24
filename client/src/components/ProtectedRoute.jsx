
import React from "react";
import { Navigate } from "react-router-dom";
import { useRole } from "../context/RoleContext";
import Loader from "./Loader";

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { role, isAuthenticated, isLoading } = useRole();

  // Wait for session to load
  if (isLoading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0) {
    const allowedLower = allowedRoles.map(r => String(r || '').toLowerCase());
    const currentRole = String(role || '').toLowerCase();
    if (!allowedLower.includes(currentRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}

