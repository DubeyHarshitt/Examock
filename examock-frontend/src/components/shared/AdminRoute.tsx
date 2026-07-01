import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";

// Protects admin routes
// Requires: authenticated + role === ADMIN
// If not authenticated → /login
// If authenticated but not admin → / (dashboard)

export default function AdminRoute() {
  const { isAuthenticated, isAdmin } = useAuthStore();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}