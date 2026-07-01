import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";

// Protects the onboarding page itself
// Requires: authenticated but NOT yet fully onboarded
// If not authenticated → /login
// If already fully onboarded → / (no reason to be on onboarding)

export default function OnboardingRoute() {
  const { isAuthenticated, isFullyOnboarded } = useAuthStore();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (isFullyOnboarded()) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}