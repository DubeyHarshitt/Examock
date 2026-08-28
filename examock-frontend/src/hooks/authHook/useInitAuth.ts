// useInitAuth.ts

import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/auth.store";
import { refreshAccessToken } from "../../api/axios";

// Called once in App.tsx on mount
// Tries to refresh the access token using the httpOnly cookie
// If successful, user stays logged in across page refreshes

export function useInitAuth() {
  const [loading, setLoading] = useState(true);
  const { setAuth, logout } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      try {
        // Shared with the axios response interceptor (refreshAccessToken
        // dedupes concurrent calls), so boot + any 401 retries share ONE
        // /auth/refresh instead of firing several.
        const data = await refreshAccessToken();
        setAuth(data.accessToken, data.user, data.onboarding);
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  return { loading };
}