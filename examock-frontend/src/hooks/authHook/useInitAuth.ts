// useInitAuth.ts

import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/auth.store";
import api from "../../api/axios";

// Called once in App.tsx on mount
// Tries to refresh the access token using the httpOnly cookie
// If successful, user stays logged in across page refreshes

let refreshPromise: Promise<any> | null = null;  // module-level, not inside hook

export function useInitAuth() {
  const [loading, setLoading] = useState(true);
  const { setAuth, logout } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      try {
        // If a refresh is already in-flight, reuse that same promise
        if (!refreshPromise) {
          refreshPromise = api.post("/auth/refresh").finally(() => {
            refreshPromise = null;
          });
        }

        const { data } = await refreshPromise;
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