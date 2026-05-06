import { useEffect, useState } from "react";
import { useAuthStore } from "../store/auth.store";
import api from "../api/axios";

// Called once in App.tsx on mount
// Tries to refresh the access token using the httpOnly cookie
// If successful, user stays logged in across page refreshes

export function useInitAuth() {
  const [loading, setLoading] = useState(true);
  const { setAuth, logout } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await api.post("/api/auth/refresh");
        // Refresh succeeded — but we need user data too
        // Add a /api/auth/me endpoint on backend, or decode the token
        // For now store just the token and fetch user separately
        setAuth(data.accessToken, data.user, data.onboarding);
      } catch {
        // Refresh failed — cookie expired or doesn't exist
        logout();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  return { loading };
}