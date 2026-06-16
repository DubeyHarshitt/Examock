import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "STUDENT" | "ADMIN";
  examTypeId: string | null;
}

interface Onboarding {
  needsExamSelection: boolean;
  needsMobileVerification: boolean;
}

interface AuthStore {
  accessToken: string | null;
  user: User | null;
  onboarding: Onboarding | null;

  // Actions
  setAuth: (token: string, user: User, onboarding: Onboarding) => void;
  setAccessToken: (token: string) => void;
  setOnboarding: (onboarding: Onboarding) => void;
  logout: () => void;
  // Computed
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  isFullyOnboarded: () => boolean;
}

// Store Content

export const useAuthStore = create<AuthStore>((set, get) => ({
  accessToken: null,
  user: null,
  onboarding: null,

  setAuth: (token, user, onboarding) =>
    set({ accessToken: token, user, onboarding }),

  setAccessToken: (token) => set({ accessToken: token }),

  setOnboarding: (onboarding) => set({ onboarding }),

  logout: () => set({ accessToken: null, user: null, onboarding: null }),

  // Helpers used in ProtectedRoute and throughout the app
  isAuthenticated: () => !!get().accessToken,

  isAdmin: () => get().user?.role === "ADMIN",


  isFullyOnboarded: () => {
    const onboarded = get().onboarding;
    if (!onboarded) return false;
    return !onboarded.needsExamSelection && !onboarded.needsMobileVerification;
  },
}));
