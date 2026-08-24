import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// requireRole: optional role name — if set, only that role may pass.
// allowPendingPasswordChange: skip the mustChangePassword redirect — used
// by the change-password page itself, so it doesn't redirect to itself.
export const ProtectedRoute = ({ children, requireRole, allowPendingPasswordChange = false }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.mustChangePassword && !allowPendingPasswordChange) {
    return <Navigate to="/change-password" replace />;
  }
  if (requireRole && user.role !== requireRole) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};
