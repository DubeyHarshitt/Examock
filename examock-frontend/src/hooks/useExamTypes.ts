// src/hooks/useExamTypes.ts
// React Query hooks for fetching exam types (used in onboarding + admin).

import { useQuery } from "@tanstack/react-query";
import { getExamTypes } from "../api/auth.api";

export const examTypeKeys = {
  all: ["exam-types"] as const,
  list: () => [...examTypeKeys.all, "list"] as const,
};

export function useExamTypes() {
  return useQuery({
    queryKey: examTypeKeys.list(),
    queryFn: () => getExamTypes(),
    staleTime: 1000 * 60 * 10,
  });
}
