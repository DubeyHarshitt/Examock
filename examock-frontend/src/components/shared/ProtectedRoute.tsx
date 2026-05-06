import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";

// Protects student routes
// Requires: authenticated + fully onboarded
// If not authenticated → /login
// If authenticated but not onboarded → /onboarding

export default function ProtectedRoute() {
  const { isAuthenticated, isFullyOnboarded } = useAuthStore();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (!isFullyOnboarded()) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}